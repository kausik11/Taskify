from datetime import datetime, timedelta

import frappe
from frappe import _

from clapgrow_app.api.tasks.task_utils import parse_date, parse_datetime


@frappe.whitelist()
def pause_recurring_task(task_definition_id, pause_start_date, pause_end_date=None, reason=None):
	"""
	API endpoint to pause a recurring task.

	This function:
	1. Validates the task can be paused
	2. Deletes existing instances within pause period
	3. Sets pause flags to prevent future generation
	4. Creates audit history record

	Args:
	    task_definition_id (str): ID of the task definition to pause
	    pause_start_date (str): Start date/time for pause (ISO format)
	    pause_end_date (str, optional): End date/time for pause (ISO format). If None, pause indefinitely
	    reason (str): Optional reason for pausing

	Returns:
	    dict: Result with success status and details
	"""
	try:
		# Get the task definition
		task_doc = frappe.get_doc("CG Task Definition", task_definition_id)

		# Validate task type
		if task_doc.task_type != "Recurring":
			frappe.throw(_("Only recurring tasks can be paused"))

		# Validate user permissions
		if not _can_user_pause_task(task_doc):
			frappe.throw(_("You don't have permission to pause this task"))

		# Parse and validate dates
		start_date = parse_datetime(pause_start_date)
		end_date = parse_datetime(pause_end_date) if pause_end_date else None

		current_time = datetime.now()

		# Validate date ranges
		if start_date < current_time - timedelta(days=7):
			frappe.throw(_("Cannot pause task more than 7 days in the past"))
		if start_date > current_time + timedelta(days=7):
			frappe.throw(_("Cannot pause task more than 7 days in the future"))
		if end_date and end_date <= start_date:
			frappe.throw(_("Pause end date must be after start date"))

		# Delete existing instances in pause range
		deleted_count = task_doc.delete_instances_in_pause_range(start_date, end_date)

		# Set pause fields
		task_doc.is_paused = 1
		task_doc.pause_start_date = start_date
		task_doc.pause_end_date = end_date
		task_doc.pause_reason = reason
		task_doc.paused_by = frappe.session.user
		task_doc.can_resume_manually = 1

		# Create audit history record
		task_doc.create_pause_history_record("Pause", deleted_count, 0, reason or "Task paused")

		# Save the task definition
		task_doc.save()

		result = {
			"success": True,
			"message": f"Task paused successfully. {deleted_count} future instances deleted.",
			"deleted_instances": deleted_count,
			"pause_start_date": start_date.isoformat(),
			"is_indefinite": end_date is None,
		}

		if end_date:
			result["pause_end_date"] = end_date.isoformat()
		else:
			result["message"] = f"Task paused indefinitely. {deleted_count} future instances deleted."

		# Commit changes
		frappe.db.commit()

		# Send notification to assigned user
		try:
			send_pause_notification(task_doc, start_date, end_date, reason)
		except Exception as e:
			frappe.log_error(
				f"Failed to send pause notification: {str(e)}",
				"Pause Notification Error",
			)

		return result

	except Exception as e:
		frappe.db.rollback()
		return {"success": False, "message": str(e), "error": True}


@frappe.whitelist()
def resume_recurring_task(task_definition_id, generate_missed_instances=True):
	"""
	API endpoint to resume a paused recurring task.

	This function:
	1. Validates the task is paused and can be resumed
	2. Optionally generates missed instances during pause period
	3. Clears pause flags to resume normal generation
	4. Creates audit history record

	Args:
	    task_definition_id (str): ID of the task definition to resume
	    generate_missed_instances (bool): Whether to generate missed instances

	Returns:
	    dict: Result with success status and details
	"""
	try:
		# Get the task definition
		task_doc = frappe.get_doc("CG Task Definition", task_definition_id)

		# Validate task is paused
		if not task_doc.is_paused:
			frappe.throw(_("Task is not currently paused"))

		# Validate user permissions
		if not _can_user_resume_task(task_doc):
			frappe.throw(_("You don't have permission to resume this task"))

		# Store pause info for notification and history
		pause_start = task_doc.pause_start_date
		pause_end = task_doc.pause_end_date
		# pause_reason = task_doc.pause_reason

		# Generate missed instances if requested
		created_count = 0
		if generate_missed_instances and pause_end:
			created_count = task_doc.generate_missed_instances()

		# Clear pause fields
		task_doc.is_paused = 0
		task_doc.pause_start_date = None
		task_doc.pause_end_date = None
		task_doc.pause_reason = None
		task_doc.paused_by = None

		# Create audit history record
		task_doc.create_pause_history_record("Resume", 0, created_count, "Task resumed")

		# Save the task definition
		task_doc.save()

		# Commit changes
		frappe.db.commit()

		# Send notification
		try:
			send_resume_notification(task_doc, pause_start, pause_end, created_count)
		except Exception as e:
			frappe.log_error(
				f"Failed to send resume notification: {str(e)}",
				"Resume Notification Error",
			)

		return {
			"success": True,
			"message": f"Task resumed successfully. {created_count} instances generated.",
			"created_instances": created_count,
		}

	except Exception as e:
		frappe.log_error(f"Error resuming task {task_definition_id}: {str(e)}", "Task Resume Error")
		frappe.db.rollback()
		return {"success": False, "message": str(e), "error": True}


@frappe.whitelist()
def manually_generate_task_instances(task_definition_id, start_date, end_date=None):
	"""
	API endpoint to manually generate task instances during pause period.
	Only admin or superior can do this.

	Args:
	    task_definition_id (str): ID of the task definition
	    start_date (str): Start date for generation (ISO format)
	    end_date (str, optional): End date for generation (ISO format)

	Returns:
	    dict: Result with success status and details
	"""
	try:
		# Get the task definition
		task_doc = frappe.get_doc("CG Task Definition", task_definition_id)

		# Validate permissions
		if not _can_user_manually_generate(task_doc):
			frappe.throw(_("You don't have permission to manually generate instances"))

		# Parse dates
		start_dt = parse_datetime(start_date)
		end_dt = parse_datetime(end_date) if end_date else start_dt + timedelta(days=6)

		# Manually generate instances
		created_count = task_doc.manually_generate_instances(start_dt, end_dt)

		# Commit changes
		frappe.db.commit()

		return {
			"success": True,
			"message": f"Successfully generated {created_count} task instances.",
			"created_instances": created_count,
			"generated_from": start_dt.isoformat(),
			"generated_to": end_dt.isoformat(),
		}

	except Exception as e:
		frappe.db.rollback()
		return {"success": False, "message": str(e), "error": True}


@frappe.whitelist()
def get_task_pause_status(task_definition_id):
	"""
	Get the pause status and details for a task definition.

	Args:
	    task_definition_id (str): ID of the task definition

	Returns:
	    dict: Pause status and details
	"""
	try:
		task_doc = frappe.get_doc("CG Task Definition", task_definition_id)

		result = {
			"task_definition_id": task_definition_id,
			"task_name": task_doc.task_name,
			"task_type": task_doc.task_type,
			"is_paused": task_doc.is_paused,
			"can_pause": task_doc.task_type == "Recurring",
			"can_resume_manually": getattr(task_doc, "can_resume_manually", True),
		}

		if task_doc.is_paused:
			result.update(
				{
					"pause_start_date": task_doc.pause_start_date,
					"pause_end_date": task_doc.pause_end_date,
					"pause_reason": task_doc.pause_reason,
					"paused_by": task_doc.paused_by,
					"is_currently_paused": task_doc.is_currently_paused(),
					"is_indefinite": task_doc.pause_end_date is None,
				}
			)

			# Check permissions for actions
			result.update(
				{
					"can_resume": _can_user_resume_task(task_doc),
					"can_manually_generate": _can_user_manually_generate(task_doc),
				}
			)
		else:
			result.update({"can_pause_task": _can_user_pause_task(task_doc)})

		return result

	except Exception as e:
		frappe.log_error(
			f"Error getting pause status for task {task_definition_id}: {str(e)}",
			"Get Pause Status Error",
		)
		return {"success": False, "message": str(e), "error": True}


@frappe.whitelist()
def get_task_pause_history(task_definition_id):
	"""
	Get the pause/resume history for a task definition.

	Args:
	    task_definition_id (str): ID of the task definition

	Returns:
	    list: History records
	"""
	try:
		history = frappe.get_all(
			"CG Task Pause History",
			filters={"task_definition_id": task_definition_id},
			fields=[
				"name",
				"action_type",
				"pause_start_date",
				"pause_end_date",
				"reason",
				"performed_by",
				"performed_on",
				"instances_deleted",
				"instances_created",
			],
			order_by="performed_on desc",
		)

		# Enrich with user details
		for record in history:
			if record.performed_by:
				user_details = frappe.get_value(
					"CG User",
					record.performed_by,
					["full_name", "user_image"],
					as_dict=True,
				)
				if user_details:
					record.performed_by_name = user_details.full_name
					record.performed_by_image = user_details.user_image

		return history

	except Exception:
		return []


@frappe.whitelist()
def get_paused_tasks_summary():
	"""
	Get a summary of all currently paused tasks for the dashboard.

	Returns:
	    dict: Summary of paused tasks
	"""
	try:
		# Get user's role and permissions
		current_user = frappe.session.user
		user_role = frappe.get_value("CG User", current_user, "role")

		filters = {"task_type": "Recurring", "is_paused": 1, "enabled": 1}

		# Apply role-based filters
		if user_role == "CG-ROLE-TEAM-LEAD":
			user_department = frappe.get_value("CG User", current_user, "department_id")
			user_branch = frappe.get_value("CG User", current_user, "branch_id")
			filters.update({"department": user_department, "branch": user_branch})
		elif user_role == "CG-ROLE-MEMBER":
			filters.update({"assigned_to": current_user})

		paused_tasks = frappe.get_all(
			"CG Task Definition",
			filters=filters,
			fields=[
				"name",
				"task_name",
				"assigned_to",
				"pause_start_date",
				"pause_end_date",
				"pause_reason",
				"paused_by",
			],
		)

		# Categorize tasks
		currently_paused = []
		ending_soon = []
		indefinitely_paused = []
		current_time = datetime.now()

		for task in paused_tasks:
			task_doc = frappe.get_doc("CG Task Definition", task.name)

			# Check if indefinitely paused
			if not task.pause_end_date:
				indefinitely_paused.append(task)
				if task_doc.is_currently_paused():
					currently_paused.append(task)
			else:
				if task_doc.is_currently_paused():
					currently_paused.append(task)

					# Check if ending within next 3 days
					pause_end = parse_datetime(task.pause_end_date)
					if pause_end <= current_time + timedelta(days=3):
						ending_soon.append(task)

		return {
			"total_paused": len(paused_tasks),
			"currently_paused": len(currently_paused),
			"ending_soon": len(ending_soon),
			"indefinitely_paused": len(indefinitely_paused),
			"tasks": paused_tasks,
		}

	except Exception as e:
		frappe.log_error(
			f"Error getting paused tasks summary: {str(e)}",
			"Paused Tasks Summary Error",
		)
		return {
			"total_paused": 0,
			"currently_paused": 0,
			"ending_soon": 0,
			"indefinitely_paused": 0,
			"tasks": [],
		}


@frappe.whitelist()
def validate_pause_dates(task_definition_id, pause_start_date, pause_end_date=None):
	"""
	Validate pause dates before pausing a task.

	Args:
	    task_definition_id (str): ID of the task definition
	    pause_start_date (str): Start date for pause
	    pause_end_date (str, optional): End date for pause

	Returns:
	    dict: Validation result
	"""
	try:
		start_dt = parse_datetime(pause_start_date)
		end_dt = parse_datetime(pause_end_date) if pause_end_date else None

		# Check for instances that would be deleted
		filters = {
			"task_definition_id": task_definition_id,
			"due_date": [">=", start_dt],
			"is_completed": 0,
			"status": ["not in", ["Completed"]],
		}

		if end_dt:
			filters["due_date"] = ["between", [start_dt, end_dt]]

		instances_to_delete = frappe.get_all(
			"CG Task Instance",
			filters=filters,
			fields=["name", "task_name", "due_date", "status"],
		)

		return {
			"valid": True,
			"instances_to_delete": len(instances_to_delete),
			"instances": instances_to_delete[:10],  # Return first 10 for preview
		}

	except Exception as e:
		return {"valid": False, "error": str(e)}


# Helper functions for permission checking


def _can_user_pause_task(task_doc):
	"""Check if current user can pause the task."""
	user_role = frappe.get_value("CG User", frappe.session.user, "role")

	# Admin can always pause
	if user_role == "ROLE-Admin":
		return True

	# Check if user is superior of the assigned user
	try:
		if hasattr(task_doc, "is_user_superior"):
			return task_doc.is_user_superior(frappe.session.user)
	except Exception:
		pass

	return False


def _can_user_resume_task(task_doc):
	"""Check if current user can resume the task."""
	user_role = frappe.get_value("CG User", frappe.session.user, "role")

	# Admin can always resume
	if user_role == "ROLE-Admin":
		return True

	# Check if user is superior of the assigned user
	try:
		if hasattr(task_doc, "is_user_superior") and task_doc.is_user_superior(frappe.session.user):
			return True
	except Exception:
		pass

	# Assigned user can resume their own task if allowed
	if frappe.session.user == task_doc.assigned_to and getattr(task_doc, "can_resume_manually", True):
		return True

	return False


def _can_user_manually_generate(task_doc):
	"""Check if current user can manually generate instances."""
	user_role = frappe.get_value("CG User", frappe.session.user, "role")

	# Admin can always generate
	if user_role == "ROLE-Admin":
		return True

	# Check if user is superior of the assigned user
	try:
		if hasattr(task_doc, "is_user_superior"):
			return task_doc.is_user_superior(frappe.session.user)
	except Exception:
		pass

	return False


# Notification functions


def send_pause_notification(task_doc, start_date, end_date, reason):
	"""Send notification when task is paused."""
	if not task_doc.assigned_to:
		return

	try:
		from clapgrow_app.api.whatsapp.notify import enqueue_send_whatsapp_notification

		assigned_user = frappe.get_doc("CG User", task_doc.assigned_to)
		if not assigned_user.phone or not assigned_user.enable_whatsapp_notifications:
			return

		pause_period = "indefinitely" if not end_date else f"until {end_date.strftime('%d-%m-%Y')}"

		message = (
			f"Hello {assigned_user.full_name}, \n\n"
			f"Your recurring task '{task_doc.task_name}' has been paused {pause_period}. \n\n"
			f"Start Date: {start_date.strftime('%d-%m-%Y')} \n"
		)

		if reason:
			message += f"Reason: {reason} \n"

		message += "\nYou will be notified when the task resumes."

		enqueue_send_whatsapp_notification(
			phone_number=assigned_user.phone,
			notification=message,
			company_id=task_doc.company_id,
		)

	except Exception as e:
		frappe.log_error(f"Failed to send pause notification: {str(e)}", "Notification Error")


def send_resume_notification(task_doc, pause_start, pause_end, instances_created):
	"""Send notification when task is resumed."""
	if not task_doc.assigned_to:
		return

	try:
		from clapgrow_app.api.whatsapp.notify import enqueue_send_whatsapp_notification

		assigned_user = frappe.get_doc("CG User", task_doc.assigned_to)
		if not assigned_user.phone or not assigned_user.enable_whatsapp_notifications:
			return

		message = (
			f"Hello {assigned_user.full_name}, \n\n"
			f"Your recurring task '{task_doc.task_name}' has been resumed. \n\n"
			f"{instances_created} task instances have been generated. \n\n"
			f"Please check your task list for the updated schedule."
		)

		enqueue_send_whatsapp_notification(
			phone_number=assigned_user.phone,
			notification=message,
			company_id=task_doc.company_id,
		)

	except Exception as e:
		frappe.log_error(f"Failed to send resume notification: {str(e)}", "Notification Error")

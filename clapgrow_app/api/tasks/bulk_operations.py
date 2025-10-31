# Copyright (c) 2025, Clapgrow and contributors
# For license information, please see license.txt

"""
Bulk Operations Handler for CG Task Instance
Handles bulk deletion and updates using doc events (no custom whitelisted APIs needed).

NOTE: This module provides helper functions for bulk operations.
The actual deletion uses Frappe's native delete_doc which triggers on_trash event.

NOTIFICATION FLOW FOR BULK DELETIONS (>10,000 tasks):
1. bulk_delete_tasks() sets global flag: frappe.flags.skip_task_delete_email = True
2. Each task's on_trash() creates a deletion log with notification_pending = 1
3. Notifications are NOT immediately enqueued (prevents queue overload)
4. Scheduled cron job runs every 15 minutes at :15 (process_pending_notifications)
5. Cron processes up to 5000 pending deletions per run in batches of 50
6. Each batch has 1 second delay to prevent overwhelming the queue
7. For 10,000+ deletions: Notifications are spread across multiple cron runs

PERFORMANCE:
- Deletion: 100 tasks per batch, commits after each batch
- Notifications: 50 per batch, 1 sec delay between batches
- Cron frequency: Every 15 minutes
- Max deletions per cron run: 5,000
- Time to process 10,000 deletions: ~30 minutes (2 cron runs)
"""

import logging

import frappe
from frappe import _

logger = logging.getLogger(__name__)


@frappe.whitelist()
def delete_tasks_bulk(task_names):
	"""
	Whitelisted API endpoint for bulk task deletion from frontend.
	Efficiently deletes multiple tasks with batched notifications.

	Args:
	    task_names: JSON string or list of task instance names

	Returns:
	    dict: Result with success/failure counts and message

	Usage from frontend:
	    frappe.call({
	        method: 'clapgrow_app.api.tasks.bulk_operations.delete_tasks_bulk',
	        args: { task_names: JSON.stringify(['TASK-001', 'TASK-002', ...]) }
	    })
	"""
	try:
		# Parse task_names if it's a JSON string
		if isinstance(task_names, str):
			import json

			task_names = json.loads(task_names)

		if not task_names or len(task_names) == 0:
			return {"status": "error", "message": "No tasks provided for deletion"}

		# Determine if we should use bulk mode (skip immediate notifications)
		# Use bulk mode for 2+ tasks to prevent queue overload
		use_bulk_mode = len(task_names) >= 2

		logger.info(f"API: Bulk delete requested for {len(task_names)} tasks (bulk_mode={use_bulk_mode})")

		# Call the bulk delete function
		result = bulk_delete_tasks(task_names, skip_notifications=use_bulk_mode)

		# Add user-friendly message
		if result.get("status") == "success":
			result["message"] = f"Successfully deleted {result['deleted']} task(s). " + (
				"Notifications will be sent via scheduled job within 15 minutes."
				if use_bulk_mode
				else "Notifications sent."
			)
		elif result.get("status") == "partial_success":
			result["message"] = f"Deleted {result['deleted']} task(s), {result['failed']} failed. " + (
				"Notifications will be sent via scheduled job." if use_bulk_mode else ""
			)

		return result

	except Exception as e:
		logger.error(f"API error in delete_tasks_bulk: {str(e)}")
		frappe.log_error(
			message=f"API bulk delete error: {str(e)}\n{frappe.get_traceback()}",
			title="API Bulk Delete Error",
		)
		return {"status": "error", "error": str(e), "message": f"Failed to delete tasks: {str(e)}"}


def bulk_delete_tasks(task_names, skip_notifications=True):
	"""
	Delete multiple task instances efficiently.
	Uses Frappe's native delete_doc which triggers on_trash event automatically.

	Args:
	    task_names: List of task instance names
	    skip_notifications: If True, notifications will be skipped via flag

	Returns:
	    dict: Result with success/failure counts
	"""
	try:
		if not isinstance(task_names, list):
			frappe.throw(_("task_names must be a list"))

		logger.info(f"Starting bulk deletion of {len(task_names)} task instances")
		logger.info(f"Skip notifications: {skip_notifications}")

		deleted_count = 0
		failed_count = 0
		errors = []

		# Process in batches to avoid timeout
		batch_size = 100

		# CRITICAL FIX: Set global flag to prevent immediate notification enqueueing
		# This ensures notifications are batched via cron job instead of overwhelming the queue
		previous_skip_flag = frappe.flags.get("skip_task_delete_email", False)
		if skip_notifications:
			frappe.flags.skip_task_delete_email = True
			logger.info("✓ Set global skip_task_delete_email flag - notifications will be batched via cron")
			logger.info(f"[BULK DELETE] Flag value after setting: {frappe.flags.skip_task_delete_email}")
			logger.info(f"[BULK DELETE] Previous flag value: {previous_skip_flag}")

		for i in range(0, len(task_names), batch_size):
			batch = task_names[i : i + batch_size]

			for task_name in batch:
				try:
					# Check if task exists
					if not frappe.db.exists("CG Task Instance", task_name):
						logger.warning(f"Task {task_name} does not exist, skipping")
						failed_count += 1
						continue

					# Get task doc
					task_doc = frappe.get_doc("CG Task Instance", task_name)

					# Delete the task - this will trigger on_trash event in doc_events.py
					# The global flag will prevent immediate notification enqueueing
					task_doc.delete()

					deleted_count += 1
					logger.debug(f"Deleted task {task_name}")

				except Exception as e:
					failed_count += 1
					error_msg = f"Error deleting task {task_name}: {str(e)}"
					logger.error(error_msg)
					errors.append(error_msg)

			# Commit after each batch
			frappe.db.commit()

			logger.info(
				f"Completed batch {i // batch_size + 1}: {deleted_count} deleted, {failed_count} failed"
			)

		# CRITICAL: Restore previous flag state to avoid affecting other operations
		frappe.flags.skip_task_delete_email = previous_skip_flag

		result = {
			"status": "success" if failed_count == 0 else "partial_success",
			"deleted": deleted_count,
			"failed": failed_count,
			"total": len(task_names),
			"errors": errors[:10] if errors else [],  # Return first 10 errors
		}

		logger.info(f"Bulk deletion completed: {deleted_count} deleted, {failed_count} failed")
		if skip_notifications:
			logger.info("Notifications will be processed in batches via scheduled cron job (every 15 min)")

		return result

	except Exception as e:
		# CRITICAL: Restore flag even on error to avoid affecting other operations
		if "previous_skip_flag" in locals():
			frappe.flags.skip_task_delete_email = previous_skip_flag

		logger.error(f"Error in bulk delete: {str(e)}")
		frappe.log_error(
			message=f"Bulk delete error: {str(e)}\n{frappe.get_traceback()}",
			title="Bulk Delete Task Instances Error",
		)

		return {
			"status": "error",
			"error": str(e),
			"deleted": deleted_count if "deleted_count" in locals() else 0,
			"failed": failed_count if "failed_count" in locals() else 0,
		}


def bulk_update_tasks(task_updates):
	"""
	Update multiple task instances efficiently.
	Uses Frappe's save() which triggers on_update event automatically.

	Args:
	    task_updates: List of dicts with 'name' and fields to update
	                 Example: [{"name": "TASK-001", "priority": "High", "status": "Completed"}, ...]

	Returns:
	    dict: Result with success/failure counts
	"""
	try:
		if not isinstance(task_updates, list):
			frappe.throw(_("task_updates must be a list"))

		logger.info(f"Starting bulk update of {len(task_updates)} task instances")

		updated_count = 0
		failed_count = 0
		errors = []

		# Process in batches
		batch_size = 100

		for i in range(0, len(task_updates), batch_size):
			batch = task_updates[i : i + batch_size]

			for update_data in batch:
				try:
					task_name = update_data.get("name")
					if not task_name:
						raise ValueError("Each update must have 'name' field")

					# Check if task exists
					if not frappe.db.exists("CG Task Instance", task_name):
						logger.warning(f"Task {task_name} does not exist, skipping")
						failed_count += 1
						continue

					# Get task doc
					task_doc = frappe.get_doc("CG Task Instance", task_name)

					# Update fields
					for field, value in update_data.items():
						if field != "name" and hasattr(task_doc, field):
							setattr(task_doc, field, value)

					# Save - this will trigger on_update event in doc_events.py
					task_doc.save()

					updated_count += 1
					logger.debug(f"Updated task {task_name}")

				except Exception as e:
					failed_count += 1
					error_msg = f"Error updating task {update_data.get('name', 'unknown')}: {str(e)}"
					logger.error(error_msg)
					errors.append(error_msg)

			# Commit after each batch
			frappe.db.commit()

			logger.info(
				f"Completed batch {i // batch_size + 1}: {updated_count} updated, {failed_count} failed"
			)

		result = {
			"status": "success" if failed_count == 0 else "partial_success",
			"updated": updated_count,
			"failed": failed_count,
			"total": len(task_updates),
			"errors": errors[:10] if errors else [],
		}

		logger.info(f"Bulk update completed: {updated_count} updated, {failed_count} failed")

		return result

	except Exception as e:
		logger.error(f"Error in bulk update: {str(e)}")
		frappe.log_error(
			message=f"Bulk update error: {str(e)}\n{frappe.get_traceback()}",
			title="Bulk Update Task Instances Error",
		)

		return {
			"status": "error",
			"error": str(e),
			"updated": updated_count if "updated_count" in locals() else 0,
			"failed": failed_count if "failed_count" in locals() else 0,
		}


# Example usage functions (can be called from anywhere)


def delete_tasks_by_definition(task_definition_id, skip_notifications=True):
	"""
	Delete all tasks for a specific task definition.

	Args:
	    task_definition_id: Name of the task definition
	    skip_notifications: If True, skip notifications

	Returns:
	    dict: Result with counts
	"""
	try:
		# Get all tasks for this definition
		tasks = frappe.get_all(
			"CG Task Instance", filters={"task_definition_id": task_definition_id}, fields=["name"]
		)

		task_names = [task.name for task in tasks]

		logger.info(f"Found {len(task_names)} tasks for definition {task_definition_id}")

		if not task_names:
			return {"status": "success", "message": "No tasks found for this definition", "deleted": 0}

		# Use bulk delete
		return bulk_delete_tasks(task_names, skip_notifications)

	except Exception as e:
		logger.error(f"Error deleting tasks by definition: {str(e)}")
		return {"status": "error", "error": str(e)}


def delete_completed_tasks(company_id=None, before_date=None, skip_notifications=True):
	"""
	Delete completed tasks (useful for cleanup).

	Args:
	    company_id: Optional company filter
	    before_date: Only delete tasks completed before this date
	    skip_notifications: If True, skip notifications

	Returns:
	    dict: Result with counts
	"""
	try:
		filters = {"is_completed": 1, "status": "Completed"}

		if company_id:
			filters["company_id"] = company_id

		if before_date:
			filters["completed_on"] = ["<", before_date]

		# Get completed tasks
		tasks = frappe.get_all("CG Task Instance", filters=filters, fields=["name"])

		task_names = [task.name for task in tasks]

		logger.info(f"Found {len(task_names)} completed tasks to delete")

		if not task_names:
			return {"status": "success", "message": "No completed tasks found", "deleted": 0}

		# Use bulk delete
		return bulk_delete_tasks(task_names, skip_notifications)

	except Exception as e:
		logger.error(f"Error deleting completed tasks: {str(e)}")
		return {"status": "error", "error": str(e)}


def bulk_complete_tasks(task_names, completed_by=None):
	"""
	Mark multiple tasks as completed.

	Args:
	    task_names: List of task names
	    completed_by: User email (default: current user)

	Returns:
	    dict: Result with counts
	"""
	from datetime import datetime

	try:
		if not completed_by:
			completed_by = frappe.session.user

		updates = []
		for task_name in task_names:
			updates.append(
				{
					"name": task_name,
					"is_completed": 1,
					"status": "Completed",
					"completed_by": completed_by,
					"completed_on": datetime.now(),
				}
			)

		# Use bulk update - will trigger on_update events for each task
		return bulk_update_tasks(updates)

	except Exception as e:
		logger.error(f"Error bulk completing tasks: {str(e)}")
		return {"status": "error", "error": str(e)}


@frappe.whitelist()
def delete_task_definitions_bulk(definition_names):
	"""
	Whitelisted API endpoint for bulk task definition deletion from frontend.
	Handles the logic of disabling definitions with completed instances vs full deletion.

	Logic:
	- If definition has completed instances (is_completed = 1):
	  * Disable the definition (enabled = 0)
	  * Delete all incomplete task instances (is_completed = 0)
	  * Keep the definition document and completed instances
	- If definition has NO completed instances:
	  * Delete the definition document
	  * Delete all task instances

	Args:
	    definition_names: JSON string or list of task definition names

	Returns:
	    dict: Result with success message (always returns success to frontend)

	Usage from frontend:
	    frappe.call({
	        method: 'clapgrow_app.api.tasks.bulk_operations.delete_task_definitions_bulk',
	        args: { definition_names: JSON.stringify(['TD-001', 'TD-002', ...]) }
	    })
	"""
	try:
		# Parse definition_names if it's a JSON string
		if isinstance(definition_names, str):
			import json

			definition_names = json.loads(definition_names)

		if not definition_names or len(definition_names) == 0:
			return {"status": "error", "message": "No task definitions provided for deletion"}

		logger.info(f"API: Bulk delete requested for {len(definition_names)} task definitions")

		deleted_count = 0
		disabled_count = 0
		failed_count = 0
		errors = []

		for definition_name in definition_names:
			try:
				# Check if definition exists
				if not frappe.db.exists("CG Task Definition", definition_name):
					logger.warning(f"Task definition {definition_name} does not exist, skipping")
					failed_count += 1
					continue

				# Check for completed task instances
				completed_instances = frappe.get_all(
					"CG Task Instance",
					filters={"task_definition_id": definition_name, "is_completed": 1},
					fields=["name"],
				)

				if completed_instances:
					# Has completed instances - DISABLE instead of delete
					logger.info(
						f"Task definition {definition_name} has {len(completed_instances)} completed instances, disabling instead of deleting"
					)

					# Delete incomplete task instances
					incomplete_instances = frappe.get_all(
						"CG Task Instance",
						filters={"task_definition_id": definition_name, "is_completed": 0},
						fields=["name"],
					)

					# Set bulk flag to skip individual notifications
					frappe.flags.skip_task_delete_email = True

					for instance in incomplete_instances:
						try:
							frappe.delete_doc("CG Task Instance", instance.name, force=False)
							logger.debug(f"Deleted incomplete task instance {instance.name}")
						except Exception as e:
							logger.error(f"Failed to delete task instance {instance.name}: {str(e)}")

					# Clear the flag
					frappe.flags.skip_task_delete_email = False

					# Disable the task definition
					frappe.db.set_value(
						"CG Task Definition", definition_name, "enabled", 0, update_modified=True
					)
					frappe.db.commit()

					disabled_count += 1
					logger.info(
						f"Disabled task definition {definition_name} and deleted {len(incomplete_instances)} incomplete instances"
					)

				else:
					# No completed instances - FULL DELETE
					logger.info(
						f"Task definition {definition_name} has no completed instances, proceeding with full deletion"
					)

					# Set bulk flag
					frappe.flags.skip_task_delete_email = True

					# The on_trash() method will handle deletion of all task instances
					frappe.delete_doc("CG Task Definition", definition_name, force=False)

					# Clear the flag
					frappe.flags.skip_task_delete_email = False

					deleted_count += 1
					logger.info(f"Fully deleted task definition {definition_name}")

			except Exception as e:
				failed_count += 1
				error_msg = f"Error processing task definition {definition_name}: {str(e)}"
				logger.error(error_msg)
				errors.append(error_msg)
				frappe.log_error(
					message=f"{error_msg}\n{frappe.get_traceback()}",
					title=f"Task Definition Deletion Error - {definition_name}",
				)

			# Commit after each definition
			frappe.db.commit()

		# Prepare result message
		message_parts = []

		if deleted_count > 0:
			message_parts.append(f"{deleted_count} task definition(s) deleted")
		if disabled_count > 0:
			message_parts.append(f"{disabled_count} task definition(s) disabled (had completed instances)")
		if failed_count > 0:
			message_parts.append(f"{failed_count} failed")

		message = (
			"Successfully processed: " + ", ".join(message_parts)
			if message_parts
			else "No definitions processed"
		)

		# Frontend always sees success (as per requirement)
		return {
			"status": "success" if failed_count == 0 else "partial_success",
			"message": message,
			"deleted": deleted_count,
			"disabled": disabled_count,
			"failed": failed_count,
			"errors": errors if errors else None,
		}

	except Exception as e:
		logger.error(f"API error in delete_task_definitions_bulk: {str(e)}")
		frappe.log_error(
			message=f"API bulk delete error: {str(e)}\n{frappe.get_traceback()}",
			title="API Bulk Delete Task Definitions Error",
		)
		return {"status": "error", "error": str(e), "message": f"Failed to delete task definitions: {str(e)}"}

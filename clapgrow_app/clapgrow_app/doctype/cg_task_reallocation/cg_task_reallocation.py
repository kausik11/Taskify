# Copyright (c) 2025, Clapgrow and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import get_datetime, get_system_timezone, getdate, now_datetime, nowdate
from frappe.utils.background_jobs import enqueue

from clapgrow_app.api.tasks.task_utils import get_cg_user
from clapgrow_app.api.whatsapp.notify import enqueue_send_whatsapp_notification


class CGTaskReallocation(Document):
	def validate(self):
		"""Validate reallocation data and user permissions."""
		self.current_assigned_to = self.find_assigned_to()
		self.validate_task_type()
		self.validate_users()
		self.validate_dates()
		self.validate_permissions()
		self.validate_company()
		self.validate_status_filters()

	def validate_task_type(self):
		"""Ensure task type and related fields are consistent."""
		if not (self.recurring_task or self.onetime_task):
			frappe.throw(_("Please select either Recurring Task or Onetime Task."))
		if self.recurring_task and self.onetime_task:
			frappe.throw(_("Cannot select both Recurring Task and Onetime Task."))
		if self.onetime_task and not self.instance_id:
			frappe.throw(_("Instance ID is required for Onetime tasks."))
		if self.recurring_task and not self.task_definition_id:
			frappe.throw(_("Task Definition ID is required for Recurring tasks."))
		# if self.reallocation_type == "Temporary" and not self.recurring_task:
		# 	frappe.throw(_("Temporary reallocation is only allowed for Recurring tasks."))

	def validate_users(self):
		"""Ensure current and new assignees are valid and different."""
		if self.current_assigned_to == self.new_assigned_to:
			frappe.throw(_("Current Assigned To and New Assigned To cannot be the same."))
		if not frappe.db.exists("CG User", self.current_assigned_to):
			frappe.throw(_("Current Assigned To user does not exist."))
		if not frappe.db.exists("CG User", self.new_assigned_to):
			frappe.throw(_("New Assigned To user does not exist."))

	def find_assigned_to(self):
		"""Find the current assigned user based on task type."""
		if self.onetime_task:
			return frappe.get_value("CG Task Instance", self.instance_id, "assigned_to")
		elif self.recurring_task:
			return frappe.get_value("CG Task Definition", self.task_definition_id, "assigned_to")
		return None

	def validate_dates(self):
		"""Validate temporary reallocation dates."""
		if self.reallocation_type == "Temporary":
			if not self.temporary_from or not self.temporary_until:
				frappe.throw(
					_("Temporary From and Temporary Until dates are required for Temporary reallocation.")
				)
			if getdate(self.temporary_from) > getdate(self.temporary_until):
				frappe.throw(_("Temporary From date cannot be after Temporary Until date."))

	def validate_permissions(self):
		"""Check if the user has permission to create or modify reallocation."""
		user_roles = frappe.get_roles(frappe.session.user)
		if "CG-ROLE-ADMIN" not in user_roles:
			if "CG-ROLE-TEAM-LEAD" in user_roles:
				user_department = frappe.get_value("CG User", frappe.session.user, "department_id")
				user_branch = frappe.get_value("CG User", frappe.session.user, "branch_id")
				new_user = frappe.get_cached_doc("CG User", self.new_assigned_to)
				if new_user.department_id != user_department or new_user.branch_id != user_branch:
					frappe.throw(_("You can only reallocate tasks within your department and branch."))
			else:
				frappe.throw(_("You do not have permission to create or modify task reallocations."))

	def validate_company(self):
		"""Validate company_id if provided."""
		if self.company_id and not frappe.db.exists("CG Company", self.company_id):
			frappe.throw(_("Invalid Company ID."))

	def validate_status_filters(self):
		"""Ensure at least one status filter is selected for recurring tasks."""
		if self.recurring_task and not (self.due_today or self.upcoming or self.overdue):
			frappe.throw(
				_(
					"At least one status filter (Due Today, Upcoming, Overdue) must be selected for Recurring tasks."
				)
			)

	def on_update(self):
		"""Handle reallocation status transitions and execute reallocation."""
		previous_doc = self.get_doc_before_save()
		previous_status = previous_doc.reallocation_status if previous_doc else None
		if self.reallocation_status == "Approved" and previous_status != "Approved":
			self.execute_reallocation()
			self.send_notification("Approved")
		elif self.reallocation_status == "Rejected" and previous_status != "Rejected":
			self.send_notification("Rejected")
		elif self.reallocation_status == "Completed" and previous_status != "Completed":
			self.send_notification("Completed")

	def execute_reallocation(self):
		"""Execute the reallocation based on task type and reallocation type."""
		try:
			if self.onetime_task:
				self.reallocate_onetime_task()
			elif self.recurring_task:
				self.reallocate_recurring_task()
			self.reallocation_status = "Completed"
			self.db_set("reallocation_status", "Completed")
			frappe.db.commit()
		except Exception as e:
			frappe.db.rollback()
			frappe.log_error(f"Failed to execute reallocation {self.name}: {str(e)}")
			frappe.throw(_("Failed to execute reallocation: {0}").format(str(e)))

	def reallocate_onetime_task(self):
		"""Reallocate a one-time task if within temporary dates."""
		task_instance = frappe.get_doc("CG Task Instance", self.instance_id)
		if task_instance.is_completed:
			frappe.throw(_("Cannot reallocate a completed task."))
		if task_instance.status == "Completed":
			frappe.throw(_("Cannot reallocate a task with Completed status."))

		if self.reallocation_type == "Temporary":
			# Check if task's due_date is within temporary period
			due_date = getdate(task_instance.due_date)
			temp_from = getdate(self.temporary_from)
			temp_until = getdate(self.temporary_until)
			if due_date >= temp_from and due_date <= temp_until:
				task_instance.assigned_to = self.new_assigned_to
				task_instance.save()
				frappe.logger().info(
					f"Temporarily reallocated onetime task {self.instance_id} to {self.new_assigned_to}"
				)
			else:
				frappe.logger().info(
					f"Skipped onetime task {self.instance_id} as due_date {due_date} is outside temporary period"
				)
		else:
			# Permanent reallocation
			task_instance.assigned_to = self.new_assigned_to
			task_instance.save()
			frappe.logger().info(
				f"Permanently reallocated onetime task {self.instance_id} to {self.new_assigned_to}"
			)

	def reallocate_recurring_task(self):
		"""Reallocate a recurring task."""
		current_date = nowdate()
		timezone = get_system_timezone()
		frappe.logger().info(f"Current date: {current_date}, Timezone: {timezone}")

		if self.reallocation_type == "Permanent":
			# Update CG Task Definition
			task_definition = frappe.get_doc("CG Task Definition", self.task_definition_id)
			task_definition.assigned_to = self.new_assigned_to
			task_definition.save()
			frappe.logger().info(
				f"Updated Task Definition {self.task_definition_id} to {self.new_assigned_to}"
			)

			# Update existing CG Task Instances based on status filters and date for Due Today
			filters = {
				"task_definition_id": self.task_definition_id,
				"is_completed": 0,
				"status": ["!=", "Completed"],
			}
			status_filters = []
			if self.upcoming:
				status_filters.append("Upcoming")
			if self.overdue:
				status_filters.append("Overdue")
			if self.due_today:
				status_filters.append("Due Today")

			if status_filters:
				filters["status"] = ["in", status_filters]

			frappe.logger().info(f"Applying filters for permanent reallocation: {filters}")
			task_instances = frappe.get_all(
				"CG Task Instance",
				filters=filters,
				fields=["name", "status", "due_date"],
			)
			if not task_instances:
				frappe.logger().warning(f"No task instances found for filters: {filters}")
				# Log all tasks for this task definition to diagnose
				all_tasks = frappe.get_all(
					"CG Task Instance",
					filters={
						"task_definition_id": self.task_definition_id,
						"is_completed": 0,
					},
					fields=["name", "status", "due_date"],
				)
				frappe.logger().info(
					f"All incomplete tasks for task_definition_id {self.task_definition_id}: {all_tasks}"
				)

			for instance in task_instances:
				frappe.logger().info(
					f"Processing task instance {instance.name} with status {instance.status} and due_date {instance.due_date}"
				)
				if instance.status not in ["Due Today", "Upcoming", "Overdue", None]:
					frappe.logger().warning(
						f"Unexpected status {instance.status} for task instance {instance.name}"
					)
				task_instance = frappe.get_doc("CG Task Instance", instance.name)
				task_instance.assigned_to = self.new_assigned_to
				task_instance.save()
				frappe.logger().info(f"Reallocated task instance {instance.name} to {self.new_assigned_to}")

		elif self.reallocation_type == "Temporary":
			# Update CG Task Instances within the date range and status filters
			filters = {
				"task_definition_id": self.task_definition_id,
				"is_completed": 0,
				"status": ["!=", "Completed"],
				"due_date": ["between", [self.temporary_from, self.temporary_until]],
			}
			status_filters = []
			if self.upcoming:
				status_filters.append("Upcoming")
			if self.overdue:
				status_filters.append("Overdue")
			if self.due_today:
				status_filters.append("Due Today")

			if status_filters:
				filters["status"] = ["in", status_filters]

			frappe.logger().info(f"Applying filters for temporary reallocation: {filters}")
			task_instances = frappe.get_all(
				"CG Task Instance",
				filters=filters,
				fields=["name", "status", "due_date"],
			)
			if not task_instances:
				frappe.logger().warning(f"No task instances found for filters: {filters}")
				# Log all tasks in the date range to diagnose
				all_tasks = frappe.get_all(
					"CG Task Instance",
					filters={
						"task_definition_id": self.task_definition_id,
						"is_completed": 0,
						"due_date": [
							"between",
							[self.temporary_from, self.temporary_until],
						],
					},
					fields=["name", "status", "due_date"],
				)
				frappe.logger().info(
					f"All incomplete tasks in date range {self.temporary_from} to {self.temporary_until}: {all_tasks}"
				)

			for instance in task_instances:
				frappe.logger().info(
					f"Processing task instance {instance.name} with status {instance.status} and due_date {instance.due_date}"
				)
				if instance.status not in ["Due Today", "Upcoming", "Overdue", None]:
					frappe.logger().warning(
						f"Unexpected status {instance.status} for task instance {instance.name}"
					)
				task_instance = frappe.get_doc("CG Task Instance", instance.name)
				task_instance.assigned_to = self.new_assigned_to
				task_instance.save()
				frappe.logger().info(f"Reallocated task instance {instance.name} to {self.new_assigned_to}")

	def send_notification(self, method):
		"""Send email and WhatsApp notifications to current and new assignees."""
		current_user = get_cg_user(self.current_assigned_to)
		new_user = get_cg_user(self.new_assigned_to)
		task_name = (
			frappe.get_value("CG Task Instance", self.instance_id, "task_name")
			if self.onetime_task
			else frappe.get_value("CG Task Definition", self.task_definition_id, "task_name")
		)

		recipients = []
		phone_numbers = []
		if current_user and current_user.get("email"):
			recipients.append(current_user["email"])
		if current_user and current_user.get("mobile_no"):
			phone_numbers.append(current_user["mobile_no"])
		if new_user and new_user.get("email"):
			recipients.append(new_user["email"])
		if new_user and new_user.get("mobile_no"):
			phone_numbers.append(new_user["mobile_no"])

		# Build status filter description
		status_filters = []
		if self.due_today:
			status_filters.append("Due Today")
		if self.upcoming:
			status_filters.append("Upcoming")
		if self.overdue:
			status_filters.append("Overdue")
		status_text = ", ".join(status_filters) if status_filters else "All statuses"

		# Define notification message based on method
		if method == "Approved":
			message_content = f"""
            <p>The reallocation request for task <strong>{task_name}</strong> has been approved.</p>
            <p><strong>Details:</strong></p>
            <ul>
                <li><strong>Task Type</strong>: {self.recurring_task and "Recurring" or "Onetime"}</li>
                <li><strong>Current Assignee</strong>: {self.current_assigned_to}</li>
                <li><strong>New Assignee</strong>: {self.new_assigned_to}</li>
                <li><strong>Reallocation Type</strong>: {self.reallocation_type}</li>
                <li><strong>Status Filters</strong>: {status_text}</li>
                <li><strong>Reason</strong>: {self.reallocation_reason or "No reason provided"}</li>
            </ul>
            """
			whatsapp_message = (
				f"Task Reallocation Approved\n\n"
				f"*Task*: {task_name}\n"
				f"*Task Type*: {self.recurring_task and 'Recurring' or 'Onetime'}\n"
				f"*From*: {self.current_assigned_to}\n"
				f"*To*: {self.new_assigned_to}\n"
				f"*Type*: {self.reallocation_type}\n"
				f"*Status Filters*: {status_text}\n"
				f"*Reason*: {self.reallocation_reason or 'No reason provided'}"
			)
		elif method == "Rejected":
			message_content = f"""
            <p>The reallocation request for task <strong>{task_name}</strong> has been rejected.</p>
            <p><strong>Details:</strong></p>
            <ul>
                <li><strong>Task Type</strong>: {self.recurring_task and "Recurring" or "Onetime"}</li>
                <li><strong>Current Assignee</strong>: {self.current_assigned_to}</li>
                <li><strong>New Assignee</strong>: {self.new_assigned_to}</li>
                <li><strong>Reallocation Type</strong>: {self.reallocation_type}</li>
                <li><strong>Status Filters</strong>: {status_text}</li>
                <li><strong>Reason</strong>: {self.reallocation_reason or "No reason provided"}</li>
            </ul>
            """
			whatsapp_message = (
				f"Task Reallocation Rejected\n\n"
				f"*Task*: {task_name}\n"
				f"*Task Type*: {self.recurring_task and 'Recurring' or 'Onetime'}\n"
				f"*From*: {self.current_assigned_to}\n"
				f"*To*: {self.new_assigned_to}\n"
				f"*Type*: {self.reallocation_type}\n"
				f"*Status Filters*: {status_text}\n"
				f"*Reason*: {self.reallocation_reason or 'No reason provided'}"
			)
		elif method == "Completed":
			message_content = f"""
            <p>The task <strong>{task_name}</strong> has been successfully reallocated.</p>
            <p><strong>Details:</strong></p>
            <ul>
                <li><strong>Task Type</strong>: {self.recurring_task and "Recurring" or "Onetime"}</li>
                <li><strong>Current Assignee</strong>: {self.current_assigned_to}</li>
                <li><strong>New Assignee</strong>: {self.new_assigned_to}</li>
                <li><strong>Reallocation Type</strong>: {self.reallocation_type}</li>
                <li><strong>Status Filters</strong>: {status_text}</li>
                <li><strong>Reason</strong>: {self.reallocation_reason or "No reason provided"}</li>
            </ul>
            """
			whatsapp_message = (
				f"Task Reallocation Completed\n\n"
				f"*Task*: {task_name}\n"
				f"*Task Type*: {self.recurring_task and 'Recurring' or 'Onetime'}\n"
				f"*From*: {self.current_assigned_to}\n"
				f"*To*: {self.new_assigned_to}\n"
				f"*Type*: {self.reallocation_type}\n"
				f"*Status Filters*: {status_text}\n"
				f"*Reason*: {self.reallocation_reason or 'No reason provided'}"
			)

		# Email notification
		email_args = {
			"recipients": recipients,
			"subject": f"Task Reallocation {method} - {task_name}",
			"message": f"""
            <html>
            <body>
            <p>Hello,</p>
            {message_content}
            <p>Please review the details and take necessary actions.</p>
            <p>Best regards,</p>
            <p><strong>Clapgrow Team</strong></p>
            </body>
            </html>
            """,
		}
		frappe.enqueue(method=frappe.sendmail, queue="short", timeout=300, **email_args)

		# WhatsApp notification
		for phone in phone_numbers:
			enqueue_send_whatsapp_notification(
				phone_number=phone,
				notification=whatsapp_message,
				company_id=self.company_id,
			)


@frappe.whitelist()
def bulk_reallocate_tasks(
	instance_ids=None,
	task_definition_ids=None,
	new_assigned_to=None,
	reallocation_type="Permanent",
	temporary_from=None,
	temporary_until=None,
	due_today=True,
	upcoming=True,
	overdue=True,
	company_id=None,
	reallocation_reason=None,
):
	"""
	Reallocate multiple one-time and recurring tasks in bulk.

	Args:
	    instance_ids (list): List of CG Task Instance IDs for one-time tasks.
	    task_definition_ids (list): List of CG Task Definition IDs for recurring tasks.
	    new_assigned_to (str): Email of the new assignee.
	    reallocation_type (str): 'Permanent' or 'Temporary'.
	    temporary_from (str): Start date for temporary reallocation (YYYY-MM-DD).
	    temporary_until (str): End date for temporary reallocation (YYYY-MM-DD).
	    due_today (bool): Include Due Today tasks for recurring tasks.
	    upcoming (bool): Include Upcoming tasks for recurring tasks.
	    overdue (bool): Include Overdue tasks for recurring tasks.
	    company_id (str): Optional company ID.
	    reallocation_reason (str): Optional reason for reallocation.

	Returns:
	    dict: Success message and job ID.
	"""
	try:
		# Validate inputs
		if not (instance_ids or task_definition_ids):
			frappe.throw(_("At least one task instance or task definition must be provided."))
		if not new_assigned_to:
			frappe.throw(_("New Assigned To is required."))
		if not frappe.db.exists("CG User", new_assigned_to):
			frappe.throw(_("New Assigned To user does not exist."))
		if reallocation_type not in ["Permanent", "Temporary"]:
			frappe.throw(_("Reallocation Type must be Permanent or Temporary."))
		if reallocation_type == "Temporary":
			if not (temporary_from and temporary_until):
				frappe.throw(_("Temporary From and Until dates are required for Temporary reallocation."))
			if getdate(temporary_from) > getdate(temporary_until):
				frappe.throw(_("Temporary From date cannot be after Temporary Until date."))

		# Parse input lists
		instance_ids = frappe.parse_json(instance_ids) if instance_ids else []
		task_definition_ids = frappe.parse_json(task_definition_ids) if task_definition_ids else []

		# Validate permissions
		user_roles = frappe.get_roles(frappe.session.user)
		if "System Manager" not in user_roles and "CG-ROLE-ADMIN" not in user_roles:
			if "CG-ROLE-TEAM-LEAD" in user_roles:
				user_department = frappe.get_value("CG User", frappe.session.user, "department_id")
				user_branch = frappe.get_value("CG User", frappe.session.user, "branch_id")
				new_user = frappe.get_cached_doc("CG User", new_assigned_to)
				if new_user.department_id != user_department or new_user.branch_id != user_branch:
					frappe.throw(_("You can only reallocate tasks within your department and branch."))
			else:
				frappe.throw(_("You do not have permission to perform bulk task reallocation."))

		# Create reallocation documents
		reallocation_docs = []
		for instance_id in instance_ids:
			if not frappe.db.exists("CG Task Instance", instance_id):
				frappe.log_error(f"Task Instance {instance_id} does not exist.")
				continue
			task_instance = frappe.get_doc("CG Task Instance", instance_id)
			if task_instance.is_completed or task_instance.status == "Completed":
				frappe.log_error(f"Skipping completed task instance {instance_id}.")
				continue
			current_assigned_to = task_instance.assigned_to
			if current_assigned_to == new_assigned_to:
				frappe.log_error(f"Skipping task instance {instance_id}: Same assignee.")
				continue

			reallocation_doc = frappe.get_doc(
				{
					"doctype": "CG Task Reallocation",
					"onetime_task": 1,
					"instance_id": instance_id,
					"current_assigned_to": current_assigned_to,
					"new_assigned_to": new_assigned_to,
					"reallocation_type": reallocation_type,
					"temporary_from": (temporary_from if reallocation_type == "Temporary" else None),
					"temporary_until": (temporary_until if reallocation_type == "Temporary" else None),
					"reallocation_status": "Approved",
					"company_id": company_id,
					"reallocation_reason": reallocation_reason,
				}
			)
			reallocation_doc.insert()
			reallocation_docs.append(reallocation_doc.name)

		for task_definition_id in task_definition_ids:
			if not frappe.db.exists("CG Task Definition", task_definition_id):
				frappe.log_error(f"Task Definition {task_definition_id} does not exist.")
				continue
			task_definition = frappe.get_doc("CG Task Definition", task_definition_id)
			current_assigned_to = task_definition.assigned_to
			if current_assigned_to == new_assigned_to:
				frappe.log_error(f"Skipping task definition {task_definition_id}: Same assignee.")
				continue

			reallocation_doc = frappe.get_doc(
				{
					"doctype": "CG Task Reallocation",
					"recurring_task": 1,
					"task_definition_id": task_definition_id,
					"current_assigned_to": current_assigned_to,
					"new_assigned_to": new_assigned_to,
					"reallocation_type": reallocation_type,
					"temporary_from": (temporary_from if reallocation_type == "Temporary" else None),
					"temporary_until": (temporary_until if reallocation_type == "Temporary" else None),
					"due_today": due_today,
					"upcoming": upcoming,
					"overdue": overdue,
					"reallocation_status": "Approved",
					"company_id": company_id,
					"reallocation_reason": reallocation_reason,
				}
			)
			reallocation_doc.insert()
			reallocation_docs.append(reallocation_doc.name)

		if not reallocation_docs:
			frappe.throw(_("No valid tasks were selected for reallocation."))

		# Enqueue reallocation execution
		job = enqueue(
			"clapgrow_app.clapgrow_app.doctype.cg_task_reallocation.cg_task_reallocation.execute_bulk_reallocations",
			queue="long",
			timeout=3600,
			reallocation_names=reallocation_docs,
		)

		frappe.db.commit()  # Commit the reallocation documents // nosemgrep
		return {
			"status": "success",
			"message": _("Task reallocation queued successfully."),
			"job_id": job.id,
		}

	except Exception as e:
		frappe.log_error(f"Bulk reallocation failed: {str(e)}")
		frappe.throw(_("Bulk reallocation failed: {0}").format(str(e)))


def execute_bulk_reallocations(reallocation_names):
	"""Execute multiple reallocation documents."""
	for name in reallocation_names:
		try:
			reallocation = frappe.get_doc("CG Task Reallocation", name)
			reallocation.execute_reallocation()
			frappe.logger().info(f"Executed reallocation {name}")
		except Exception as e:
			frappe.log_error(f"Failed to execute reallocation {name}: {str(e)}")
	frappe.db.commit()  # Commit // nosemgrep

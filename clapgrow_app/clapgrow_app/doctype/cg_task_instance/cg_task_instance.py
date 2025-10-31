# Copyright (c) 2025, Clapgrow and contributors
# For license information, please see license.txt

import json
from datetime import datetime, timedelta

import frappe
import pytz
from frappe import _
from frappe.model.document import Document
from frappe.utils import add_days, format_datetime, get_datetime, getdate, now, now_datetime, nowdate
from frappe.utils.background_jobs import enqueue
from frappe.utils.scheduler import enqueue_events

from clapgrow_app.api.common.users import get_super_admin
from clapgrow_app.api.common.utils import (
	DATE_FORMAT_REMINDER,
	DATE_FORMAT_SHORT,
	format_due_date,
)

# Email notifications
from clapgrow_app.api.email_notifications import send_bulk_deletion_email, send_task_email
from clapgrow_app.api.tasks.task_utils import get_cg_user, parse_datetime

# WhatsApp notifications
from clapgrow_app.api.whatsapp.notify import (
	enqueue_send_whatsapp_notification,
	handle_task_completion,
	send_task_whatsapp_notification_on_update,
	send_task_whatsapp_to_assignee_on_update,
)
from clapgrow_app.clapgrow_app.doctype import (
	decrement_tag_count,
	handle_task_status,
	increment_tag_count,
)

status_order = {
	"Due Today": 0,
	"Overdue": 1,
	"Upcoming": 2,
	"Completed": 3,
	"Paused": 4,
	"Rejected": 5,
}
priority_order = {
	"Critical": 0,
	"Medium": 1,
	"Low": 2,
}

# For now, keeping it here for demonstration, but a DocType based approach would be better.
ROLE_HIERARCHY = ["CG-ROLE-ADMIN", "CG-ROLE-TEAM-LEAD", "CG-ROLE-MEMBER"]


class CGTaskInstance(Document):
	def initialize_previous_doc_state(self):
		self.previous_doc = self.get_doc_before_save()
		self.previous_is_completed = self.previous_doc.is_completed if self.previous_doc else 0
		self.previous_status = self.previous_doc.status if self.previous_doc else None
		self.previous_recurrence_type_id = self.previous_doc.recurrence_type_id if self.previous_doc else None
		self.previous_task_name = self.previous_doc.task_name if self.previous_doc else ""
		self.previous_tag = self.previous_doc.tag if self.previous_doc else None
		self.recurrence_changed = False

	def validate(self):
		self.initialize_previous_doc_state()
		self.store_last_comment()
		self.handle_paused_task_completion()
		self.validate_rejected_status()
		self.validate_paused_status()

		self.task_name_changed = self.previous_task_name and self.previous_task_name != self.task_name
		if self.task_name_changed:
			handle_task_name_change(self, self.previous_task_name)

		self.validate_recurrence_change()
		self.validate_assignee()

		if getattr(self, "is_subtask", 0) and self.has_subtask:
			frappe.throw(_("Subtasks cannot have their own subtasks"))

		# Only handle recurrence change if task name was not changed
		if self.recurrence_changed and not self.task_name_changed:
			handle_recurrence_type_change(self, self.previous_recurrence_type_id)

		self.validate_permissions()

		# Validate subtask completion for parent tasks
		if self.is_completed == 1 and self.previous_is_completed == 0 and not getattr(self, "is_subtask", 0):
			self.validate_subtask_completion()

		self.validate_reminder_settings()
		self.update_task_status()
		self.update_completion_details()
		self.calculate_delayed_time()
		self.validate_subtasks()

		# Enhanced status priority map with due_date tiebreaker
		self.status_map = status_order.get(self.status, -1)
		self.priority_map = priority_order.get(self.priority, -1)

		# Since due_date is mandatory, convert to timestamp for tiebreaking
		due_datetime = get_datetime(self.due_date)
		due_date_timestamp = str(int(due_datetime.timestamp())).zfill(10)

		# Format: status_map + priority_map + due_date_timestamp
		# This ensures: Status > Priority > Earlier Due Date
		self.status_priority_map = f"{self.status_map}{self.priority_map}{due_date_timestamp}"

	def validate_rejected_status(self):
		# Prevent updates to rejected tasks (except for admin reopening)
		if self.previous_status == "Rejected" and self.status == "Rejected":
			# Check if any field has changed
			changed_fields = [df.fieldname for df in self.meta.fields if self.has_value_changed(df.fieldname)]
			if changed_fields:
				cg_user_role = frappe.get_value("CG User", frappe.session.user, "role")
				if cg_user_role != "ROLE-Admin":
					frappe.throw(
						_("Rejected tasks cannot be modified. Only admin can reopen rejected tasks.")
					)

		# Prevent marking rejected tasks as completed
		if self.status == "Rejected" and self.is_completed == 1:
			frappe.throw(_("Rejected tasks cannot be completed."))

	def validate_paused_status(self):
		# Prevent editing paused tasks (except for completion and status changes by authorized users)
		if self.previous_status == "Paused" and self.status == "Paused" and self.is_completed == 0:
			changed_fields = [df.fieldname for df in self.meta.fields if self.has_value_changed(df.fieldname)]
			# Allow completion and status changes
			allowed_changes = [
				"is_completed",
				"status",
				"completed_by",
				"completed_on",
				"due_date",
			]
			unauthorized_changes = [field for field in changed_fields if field not in allowed_changes]

			if unauthorized_changes:
				cg_user_role = frappe.get_value("CG User", frappe.session.user, "role")
				if cg_user_role != "ROLE-Admin" and frappe.session.user != self.assigned_to:
					frappe.throw(
						_("Paused tasks can only be completed or modified by admin or the task doer.")
					)

		# Validate status transitions
		if self.previous_status and self.previous_status != self.status:
			# Allow paused tasks to go directly to completed status when is_completed is set
			if not (
				self.previous_status == "Paused" and self.status == "Completed" and self.is_completed == 1
			):
				validate_status_transition(
					self.previous_status,
					self.status,
					self.previous_is_completed,
					self.is_completed,
				)

	def validate_recurrence_change(self):
		if (
			self.previous_doc
			and self.task_type == "Recurring"
			and self.recurrence_type_id
			and self.previous_recurrence_type_id
		):
			prev_row = self.previous_recurrence_type_id[0] if self.previous_recurrence_type_id else None
			curr_row = self.recurrence_type_id[0] if self.recurrence_type_id else None
			if prev_row and curr_row:
				recurrence_fields = [
					"frequency",
					"interval",
					"week_days",
					"month_days",
					"nth_week",
					"end_date",
					"exception_date",
				]
				if prev_row.name != curr_row.name or any(
					prev_row.get(field) != curr_row.get(field) for field in recurrence_fields
				):
					self.recurrence_changed = True
		frappe.logger().info(
			f"Recurrence type changed: {self.recurrence_changed}, previous={self.previous_recurrence_type_id[0].name if self.previous_recurrence_type_id else None}, current={self.recurrence_type_id[0].name if self.recurrence_type_id else None}"
		)

	def validate_assignee(self):
		if self.task_type == "Process" and (not self.assignee or self.assignee.strip() == ""):
			try:
				super_admin = get_super_admin()
				if super_admin:
					self.assignee = super_admin.get("email")
					frappe.logger().info(
						f"Assigned super admin {self.assignee} to task {self.task_name} with task_type 'Process'"
					)
				else:
					frappe.log_error(
						message=f"No super admin found for company {self.company_id} in task {self.task_name}",
						title="Super Admin Assignment Error",
					)
			except Exception as e:
				frappe.log_error(
					message=f"Failed to assign super admin to task {self.task_name}: {str(e)}",
					title="Super Admin Assignment Error",
				)

	def validate_permissions(self):
		# Restrict marking as completed to the assigned_to user (doer) and admin
		if self.is_completed == 1 and self.previous_is_completed == 0:
			if frappe.session.user != self.assigned_to:
				cg_user_role = frappe.get_value("CG User", frappe.session.user, "role")
				if cg_user_role != "ROLE-Admin":
					frappe.throw(_("Only the assigned user or an admin can mark this task as completed."))

		# Restrict reopening task to the assignee (creator) and admin
		if self.previous_is_completed == 1 and self.is_completed == 0:
			if frappe.session.user != self.assignee:
				cg_user_role = frappe.get_value("CG User", frappe.session.user, "role")
				if cg_user_role != "ROLE-Admin":
					frappe.throw(_("Only the assignee (creator) or an admin can reopen this task."))
			self.reopened_by = frappe.session.user
			self.reopened += 1
		# Prevent updates to a task that is already completed (unless it's being reopened)
		elif self.previous_is_completed == 1 and self.is_completed == 1:
			changed_fields = [df.fieldname for df in self.meta.fields if self.has_value_changed(df.fieldname)]
			if changed_fields:
				frappe.throw(_("This document cannot be updated after being marked as complete."))

		if self.restrict == 1 and (self.is_completed == 1 and self.previous_is_completed == 0):
			if parse_datetime(self.due_date).date() != getdate(now_datetime()):
				self.is_completed = 0
				frappe.throw(_("Can't mark this task as completed before or after the due date."))

		if self.upload_required == 1 and self.is_completed == 1 and self.previous_is_completed == 0:
			if not self.submit_file or self.submit_file == "[]":
				self.is_completed = 0
				frappe.throw(_("File Upload is mandatory for this task to mark it Completed."))

	def validate_reminder_settings(self):
		# Validate starting_on when reminder_enabled is 1
		if self.reminder_enabled == 1:
			if self.task_type == "Onetime" and not self.reminder_frequency:
				frappe.throw(
					_("Reminder Frequency is required when reminders are enabled for one-time tasks.")
				)
			if self.reminder_frequency == "Custom":
				if not self.reminder_interval or not self.reminder_unit:
					frappe.throw(_("Reminder Interval and Unit are required for Custom frequency."))
				if self.reminder_unit not in ["Days", "Hours"]:
					frappe.throw(_("Reminder Unit must be 'Days' or 'Hours' for Custom frequency."))
				# For Hours-based reminders, starting_on is not required
				if self.reminder_unit == "Days" and not self.starting_on:
					frappe.throw(_("Starting At is required when reminder unit is Days."))
			else:
				# For non-Custom frequency, starting_on is required
				if not self.starting_on:
					frappe.throw(_("Starting At is required when reminders are enabled."))
			# Initialize remaining counter if not set
			if not getattr(self, "reminder_times_remaining", None) and getattr(
				self, "reminder_total_times", None
			):
				self.reminder_times_remaining = self.reminder_total_times
		else:
			self.reminder_frequency = None
			self.starting_on = None
			self.reminder_interval = None
			self.reminder_unit = None
			self.next_remind_at = None
			self.reminder_total_times = None
			self.reminder_times_remaining = None

	def update_task_status(self):
		# only update status when not manually set to Pause or Rejected
		if self.status not in ["Paused", "Rejected"]:
			self.status = handle_task_status(
				due_date=self.due_date,
				status=self.status,
				is_completed=bool(self.is_completed),
				restrict=self.restrict,
			)

	def update_completion_details(self):
		if self.is_completed == 1 and self.previous_is_completed == 0:
			self.status = "Completed"
			ist_timezone = pytz.timezone("Asia/Kolkata")
			completed_on_aware = datetime.now(ist_timezone)
			self.completed_on = completed_on_aware.replace(tzinfo=None)
			self.completed_by = frappe.session.user

			# Set completion platform - default to Mobile, but check if it's from web
			if not hasattr(self, "completion_platform") or not self.completion_platform:
				# Check if the request is coming from web platform
				user_agent = frappe.get_request_header("User-Agent", "")
				if user_agent and (
					"Mozilla" in user_agent
					or "Chrome" in user_agent
					or "Safari" in user_agent
					or "Firefox" in user_agent
				):
					self.completion_platform = "Web"
				else:
					self.completion_platform = "Mobile"
		elif self.is_completed == 0 and self.previous_is_completed == 1:
			self.completed_on = None
			self.completed_by = None
			self.completion_platform = None

	def calculate_delayed_time(self):
		if self.is_completed == 1:
			if self.checklist:
				unchecked_items = [c.checklist_item for c in self.checklist if not c.is_checked]
				if unchecked_items:
					frappe.throw(_("Read and accept checklist items before completing the task"))

			completed_on = get_datetime(self.completed_on)
			due_date = get_datetime(self.due_date)

			if completed_on > due_date:
				diff = completed_on - due_date
				total_seconds = int(diff.total_seconds())

				days = total_seconds // 86400
				months = days // 30
				days = days % 30
				hours = (total_seconds % 86400) // 3600
				minutes = (total_seconds % 3600) // 60

				self.delayed_time = f"{months} month{'s' if months != 1 else ''} {days} day{'s' if days != 1 else ''} {hours} hour{'s' if hours != 1 else ''} {minutes} minute{'s' if minutes != 1 else ''}"
			else:
				self.delayed_time = None

	def validate_subtasks(self):
		if self.has_subtask and self.subtask:
			for subtask_row in self.subtask:
				if not subtask_row.subtask_name:
					frappe.throw(_("Subtask {0}: Name is required").format(subtask_row.idx))
				if not subtask_row.assigned_to:
					frappe.throw(_("Subtask {0}: Assigned user is required").format(subtask_row.idx))
				if not subtask_row.due_date:
					frappe.throw(_("Subtask {0}: Due date is required").format(subtask_row.idx))

				if not subtask_row.company_id:
					subtask_row.company_id = self.company_id

				# Validate due date is not after parent task
				if self.due_date and subtask_row.due_date:
					if parse_datetime(subtask_row.due_date) > parse_datetime(self.due_date):
						frappe.throw(
							_("Subtask {0}: Due date cannot be after parent task due date").format(
								subtask_row.idx
							)
						)

	def validate_subtask_completion(self):
		"""Ensure all subtasks are completed before allowing the parent task to be marked complete."""
		if getattr(self, "is_subtask", 0):
			return

		incomplete_subtasks = frappe.get_all(
			"CG Task Instance",
			filters={
				"parent_task_instance": self.name,
				"is_subtask": 1,
				"is_completed": 0,
			},
			fields=["name", "task_name", "assigned_to", "due_date"],
			order_by="due_date asc",
		)

		if incomplete_subtasks:
			total = len(incomplete_subtasks)

			# Pick the most urgent subtask to show as context
			sub = incomplete_subtasks[0]
			assigned_user = frappe.get_value("CG User", sub.assigned_to, "full_name") or sub.assigned_to
			due_date = format_datetime(sub.due_date, DATE_FORMAT_SHORT) if sub.due_date else "No due date"

			frappe.throw(
				_(
					"You still have {0} incomplete subtasks. "
					"Example: {1} (Assigned to {2}, Due {3}). "
					"Please finish all subtasks before marking this task complete."
				).format(total, sub.task_name, assigned_user, due_date)
			)

	def store_last_comment(self):
		"""
		Store the most recent comment in the last_comment field when status changes to
		Completed, Rejected, or Paused.
		"""
		if not (
			self.previous_status != self.status
			and self.status
			in [
				"Completed",
				"Rejected",
				"Paused",
			]
		):
			return
		try:
			latest_comment = frappe.get_all(
				"Comment",
				filters={
					"reference_doctype": "CG Task Instance",
					"reference_name": self.name,
					"comment_type": [
						"in",
						["Comment", "Info"],
					],  # Include both user comments and info comments
				},
				fields=["content", "comment_by", "creation", "comment_type"],
				order_by="creation desc",
				limit=1,
			)

			if latest_comment:
				comment = latest_comment[0]
				try:
					user_full_name = (
						frappe.get_value("User", comment.comment_by, "full_name") or comment.comment_by
					)
				except Exception:  # noqa: E722
					user_full_name = comment.comment_by

				formatted_comment = f"[{comment.creation}] {user_full_name}: {comment.content}"

				self.last_comment = formatted_comment

				frappe.logger().info(
					f"Stored last comment for task {self.name} with status {self.status}: {formatted_comment[:100]}..."
				)
			else:
				self.last_comment = f"No comments available when status changed to {self.status}"
				frappe.logger().info(f"No comments found for task {self.name}, set default message")

		except Exception as e:
			frappe.log_error(
				message=f"Failed to store last comment for task {self.name}: {str(e)}",
				title="Store Last Comment Error",
			)
			frappe.logger().warning(
				f"Comment storage failed for task {self.name}, but validation will continue"
			)

	def handle_paused_task_completion(self):
		"""
		Handle completion of a paused task by adjusting the due date.
		Add the pause duration to the original due date.
		"""
		# Handle paused task completion with due date adjustment
		if not (
			self.is_completed == 1
			and self.previous_is_completed == 0
			and self.previous_status == "Paused"
			and hasattr(self, "auto_adjust_due_date")
		):
			return
		try:
			# Get pause start time - when the task was last set to paused
			pause_start_time = None

			# Look for the most recent status change to "Paused" in version history
			versions = frappe.get_all(
				"Version",
				filters={"ref_doctype": "CG Task Instance", "docname": self.name},
				fields=["data", "creation"],
				order_by="creation desc",
				limit=20,  # Check last 20 versions
			)

			for version in versions:
				try:
					import json

					version_data = json.loads(version.data)
					if version_data.get("changed") and len(version_data["changed"]) > 0:
						for change in version_data["changed"]:
							if (
								change[0] == "status" and len(change) >= 3 and change[2] == "Paused"
							):  # New value is "Paused"
								pause_start_time = get_datetime(version.creation)
								break
				except (json.JSONDecodeError, KeyError, IndexError):
					continue

				if pause_start_time:
					break

			# If we can't find when it was paused from version history,
			# use a fallback approach based on modified timestamp
			if not pause_start_time:
				# Fallback: assume it was paused sometime before current completion
				# Use a conservative estimate of the pause duration
				frappe.logger().warning(
					f"Could not determine exact pause time for task {self.name}, using fallback calculation"
				)
				pause_start_time = get_datetime(self.modified) - timedelta(
					days=1
				)  # Conservative 1-day estimate

			# Calculate pause duration
			current_time = now_datetime()
			pause_duration = current_time - pause_start_time

			# Add pause duration to the original due date
			if self.due_date:
				original_due_date = get_datetime(self.due_date)
				adjusted_due_date = original_due_date + pause_duration

				# Update due date
				self.due_date = adjusted_due_date

				# Log the adjustment for audit purposes
				frappe.logger().info(
					f"Adjusted due date for paused task {self.name}: "
					f"Original: {original_due_date}, Pause duration: {pause_duration}, "
					f"New due date: {adjusted_due_date}"
				)

				# Add a comment to track the adjustment
				try:
					frappe.get_doc(
						{
							"doctype": "Comment",
							"comment_type": "Info",
							"reference_doctype": "CG Task Instance",
							"reference_name": self.name,
							"content": f"Due date automatically adjusted by {pause_duration} due to task being paused and then completed. Original due date: {format_due_date(original_due_date)}, Adjusted due date: {format_due_date(adjusted_due_date)}",
							"comment_email": frappe.session.user,
							"comment_by": frappe.session.user,
						}
					).insert(ignore_permissions=True)
				except Exception as e:
					frappe.logger().warning(
						f"Could not create audit comment for due date adjustment: {str(e)}"
					)

		except Exception as e:
			frappe.log_error(
				message=f"Error adjusting due date for paused task {self.name}: {str(e)}",
				title="Paused Task Due Date Adjustment Error",
			)
			# Don't fail the completion if due date adjustment fails
			frappe.logger().warning(
				f"Due date adjustment failed for task {self.name}, but task completion will proceed"
			)

	def create_subtask_instances(self):
		"""Create separate task instances for each subtask."""
		if not self.subtask or getattr(self, "is_subtask", 0):
			return

		for subtask_data in self.subtask:
			try:
				# Always use parent's due_date and task_type as per requirements
				subtask_instance_data = {
					"doctype": "CG Task Instance",
					"task_name": subtask_data.subtask_name,
					"description": self.description,
					"assigned_to": subtask_data.assigned_to,
					"assignee": self.assignee,
					"task_type": self.task_type,  # Use parent's task_type, not "Subtask"
					"priority": self.priority,
					"company_id": (
						subtask_data.company_id
						if hasattr(subtask_data, "company_id") and subtask_data.company_id
						else self.company_id
					),
					"branch": self.branch,
					"department": self.department,
					"due_date": self.due_date,  # Always use parent's due_date
					"tag": self.tag,
					"checker": self.checker,
					"upload_required": self.upload_required,
					"restrict": self.restrict,
					"is_subtask": 1,  # Mark as subtask
					"parent_task_instance": self.name,  # Reference to parent
					"submit_file": subtask_data.submit_file or "[]",
					"has_subtask": 0,  # IMPORTANT: Subtasks cannot have their own subtasks
					"reminder_enabled": self.reminder_enabled,
					"reminder_frequency": self.reminder_frequency,
					"starting_on": self.starting_on,
					"reminder_interval": self.reminder_interval,
					"reminder_unit": self.reminder_unit,
					"recurrence_type_id": (
						self.recurrence_type_id if self.task_type == "Recurring" else None
					),
				}

				if self.task_type == "Recurring" and self.task_definition_id:
					subtask_instance_data["task_definition_id"] = self.task_definition_id

				subtask_instance = frappe.get_doc(subtask_instance_data)
				subtask_instance.insert()

				subtask_data.subtask_id = subtask_instance.name

				frappe.logger().info(
					f"Created subtask instance {subtask_instance.name} for parent task {self.name}"
				)

			except Exception as e:
				frappe.log_error(
					f"Error creating subtask instance for {subtask_data.subtask_name}: {str(e)}",
					"Subtask Instance Creation Error",
				)
				# Re-raise the exception to prevent silent failures during debugging
				frappe.throw(f"Failed to create subtask '{subtask_data.subtask_name}': {str(e)}")

		self.save()
		frappe.logger().info(f"Updated subtask_ids in child table for parent task {self.name}")

	def propagate_status_to_subtasks(self, new_status):
		"""Propagate status changes to all incomplete subtasks."""
		if not self.has_subtask or getattr(self, "is_subtask", 0):
			return

		try:
			subtasks = frappe.get_all(
				"CG Task Instance",
				filters={
					"parent_task_instance": self.name,
					"is_subtask": 1,
					"is_completed": 0,
				},
				pluck="name",
			)

			updated_count = len(subtasks)

			# OPTIMIZED: Batch update subtasks instead of loading each doc individually
			if subtasks:
				try:
					# Batch update status for all subtasks
					frappe.db.sql(
						"""
						UPDATE `tabCG Task Instance`
						SET status = %s, modified = NOW(), modified_by = %s
						WHERE name IN ({})
						""".format(",".join(["%s"] * len(subtasks))),
						[new_status, frappe.session.user] + subtasks,
					)
					frappe.logger().info(f"Batch updated {updated_count} subtasks to status {new_status}")
				except Exception as e:
					frappe.log_error(
						message=f"Failed to batch update subtasks: {str(e)}",
						title="Subtask Status Batch Update Error",
					)

			if updated_count > 0:
				frappe.db.commit()
				frappe.logger().info(
					f"Successfully updated {updated_count} subtasks to status {new_status} for parent task {self.name}"
				)
		except Exception as e:
			frappe.log_error(
				message=f"Failed to update subtasks for parent task {self.name}: {str(e)}",
				title="Subtask Status Update Error",
			)

	def get_subtask_progress(self):
		"""Get completion progress of all subtasks."""
		if not self.has_subtask or getattr(self, "is_subtask", 0):
			return None

		try:
			subtasks = frappe.get_all(
				"CG Task Instance",
				filters={"parent_task_instance": self.name, "is_subtask": 1},
				fields=[
					"name",
					"task_name",
					"assigned_to",
					"is_completed",
					"status",
					"due_date",
					"completed_by",
					"completed_on",
				],
			)

			total = len(subtasks)
			completed = len([s for s in subtasks if s.is_completed])

			# Get assigned user names for better display
			for subtask in subtasks:
				try:
					user_name = frappe.get_value("CG User", subtask.assigned_to, "full_name")
					subtask["assigned_to_name"] = user_name or subtask.assigned_to

					if subtask.completed_by:
						completed_by_name = frappe.get_value("CG User", subtask.completed_by, "full_name")
						subtask["completed_by_name"] = completed_by_name or subtask.completed_by
				except Exception:
					subtask["assigned_to_name"] = subtask.assigned_to

			return {
				"total_subtasks": total,
				"completed_subtasks": completed,
				"completion_percentage": (completed / total * 100) if total > 0 else 0,
				"subtasks": subtasks,
			}

		except Exception as e:
			frappe.log_error(
				message=f"Error getting subtask progress for task {self.name}: {str(e)}",
				title="Subtask Progress Error",
			)
			return None

	@frappe.whitelist()
	def bulk_update_subtasks(self, action, data=None):
		"""Handle bulk operations on subtasks (pause, resume, reassign)."""
		if not self.has_subtask or getattr(self, "is_subtask", 0):
			return {"success": False, "message": "No subtasks to update"}

		try:
			subtasks = frappe.get_all(
				"CG Task Instance",
				filters={
					"parent_task_instance": self.name,
					"is_subtask": 1,
					"is_completed": 0,
				},
				fields=["name"],
			)

			if not subtasks:
				return {"success": False, "message": "No incomplete subtasks found"}

			updated_count = 0
			errors = []

			for subtask in subtasks:
				try:
					subtask_doc = frappe.get_doc("CG Task Instance", subtask.name)

					if action == "pause":
						subtask_doc.status = "Paused"
					elif action == "resume" and subtask_doc.status == "Paused":
						subtask_doc.status = handle_task_status(
							due_date=subtask_doc.due_date,
							status="Due Today",
							is_completed=bool(subtask_doc.is_completed),
							restrict=subtask_doc.restrict,
						)
					elif action == "reassign" and data and data.get("new_assigned_to"):
						subtask_doc.assigned_to = data["new_assigned_to"]
					elif action == "update_due_date" and data and data.get("new_due_date"):
						subtask_doc.due_date = data["new_due_date"]
					else:
						continue

					subtask_doc.save()
					updated_count += 1

				except Exception as e:
					errors.append(f"Error updating subtask {subtask.name}: {str(e)}")
					frappe.log_error(f"Error updating subtask {subtask.name}: {str(e)}")

			# Add comment about bulk operation
			if updated_count > 0:
				action_message = {
					"pause": "paused",
					"resume": "resumed",
					"reassign": f"reassigned to {data.get('new_assigned_to', 'new user')}",
					"update_due_date": f"due date updated to {data.get('new_due_date', 'new date')}",
				}

				self.add_comment(
					"Info",
					f"Bulk operation: {updated_count} subtask(s) {action_message.get(action, action)}",
				)

			result = {
				"success": True,
				"updated_count": updated_count,
				"total_subtasks": len(subtasks),
			}

			if errors:
				result["errors"] = errors

			return result

		except Exception as e:
			frappe.log_error(
				message=f"Error in bulk_update_subtasks for task {self.name}: {str(e)}",
				title="Bulk Subtask Update Error",
			)
			return {"success": False, "message": str(e)}

	def on_update(self):
		"""Actions to perform when a document is updated."""
		self.initialize_previous_doc_state()

		# Handle subtask child table changes - create new task instances for added subtasks
		if not getattr(self, "is_subtask", 0):
			# Handle case when subtasks exist or existed
			if self.has_subtask and self.subtask:
				self.handle_subtask_additions(self.previous_doc)
				self.handle_subtask_deletions(self.previous_doc)
			# Handle case when all subtasks were removed
			elif self.previous_doc and self.previous_doc.subtask:
				self.handle_subtask_deletions(self.previous_doc)

		if self.previous_tag != self.tag:
			if self.previous_tag:
				decrement_tag_count(self.previous_tag)
			if self.tag:
				increment_tag_count(self.tag)

		# Propagate status changes to subtasks for parent tasks
		if (
			not getattr(self, "is_subtask", 0)
			and self.previous_status != self.status
			and self.status in ["Paused", "Rejected"]
		):
			self.propagate_status_to_subtasks(self.status)

		if self.previous_status != self.status or self.previous_is_completed != self.is_completed:
			# Handle workflow resumption with custom method if task is completed
			# if self.status == "Completed" and previous_is_completed != self.is_completed:
			# 	try:
			# 		# Use custom workflow handler instead of the default one
			# 		self.handle_workflow_resumption()

			# 		# Handle attached workflow trigger
			# 		if self.attached_form and self.attached_docname:
			# 			from clapgrow_workflow.clapgrow_workflow.doctype.clapgrow_workflow_task_mapping.clapgrow_workflow_task_mapping import (
			# 				trigger_attached_workflow,
			# 			)

			# 			trigger_attached_workflow(self, None)
			# 	except Exception as e:
			# 		frappe.log_error(
			# 			message=f"Error handling workflow for completed task {self.name}: {str(e)}",
			# 			title="Task Completion Workflow Error",
			# 		)

			# Check if this is a subtask completion and update parent task status
			if getattr(self, "is_subtask", 0) and self.is_completed == 1 and self.previous_is_completed == 0:
				self.check_parent_task_completion()

			# Determine email method based on status change
			self.send_notifications_on_status_change()

		# OPTIMIZED: Skip real-time events during bulk operations
		if not getattr(frappe.local, "bulk_task_creation", False):
			self.notify_task_update()

	def notify_task_update(self):
		# Notify relevant users about report update
		users_to_notify = [self.assigned_to, self.assignee]
		user_role = frappe.get_value("CG User", {"email": self.assigned_to}, "role")
		if user_role == "ROLE-Team Lead":
			teams = frappe.get_all("CG Team", filters={"team_lead": self.assigned_to}, fields=["name"])
			for team in teams:
				members = frappe.get_all(
					"CG Team Member",
					filters={"parent": team.name},
					fields=["member"],
				)
				users_to_notify.extend([member.member for member in members])

		try:
			for user in set(users_to_notify):
				if user:
					frappe.publish_realtime(
						event="report_updated",
						message={"report_name": "Total Task Status Report"},
						user=user,
					)
					frappe.logger().info(f"Emitted report_updated event to user {user} for task {self.name}")
		except Exception as e:
			frappe.log_error(
				message=f"Failed to emit report_updated event for task {self.name}: {str(e)}",
				title="Report Update Event Error",
			)

	def send_notifications_on_status_change(self):
		email_method, whatsapp_method = None, None
		# Only send specific emails for status changes, not completion
		if self.previous_status != self.status:
			if self.status == "Paused":
				email_method = "Paused"
				whatsapp_method = "Paused"
			elif self.status == "Rejected":
				email_method = "Rejected"
				whatsapp_method = "Rejected"
			elif self.previous_status == "Completed" and self.status != "Completed":
				email_method = "Reopened"
				whatsapp_method = "Reopened"
			elif self.previous_status == "Paused" and self.status == "Completed" and self.is_completed == 1:
				email_method = "Completed from Paused"
				whatsapp_method = "Completed from Paused"

		# OPTIMIZED: Skip notifications during bulk operations
		if not getattr(frappe.local, "bulk_task_creation", False):
			# Send email only if we have a specific method
			if email_method:
				frappe.logger().info(f"Sending {email_method} email for task {self.name}")
				send_task_email(self, email_method)

			# Send WhatsApp notification only if we have a specific method
			if whatsapp_method:
				send_task_whatsapp_notification_on_update(self, whatsapp_method, self.previous_status)
				if whatsapp_method in ["Completed from Paused", "Paused", "Rejected"]:
					send_task_whatsapp_to_assignee_on_update(self, whatsapp_method)

	def check_parent_task_completion(self):
		"""Check if all subtasks are completed and notify parent task assignee."""
		if not self.parent_task_instance:
			return

		try:
			# Check if all subtasks for this parent are completed
			remaining_subtasks = frappe.get_all(
				"CG Task Instance",
				filters={
					"parent_task_instance": self.parent_task_instance,
					"is_subtask": 1,
					"is_completed": 0,
				},
				fields=["name", "task_name"],
			)

			# Get parent task
			parent_task = frappe.get_doc("CG Task Instance", self.parent_task_instance)

			# Only notify when ALL subtasks are completed
			if not remaining_subtasks:
				# All subtasks completed - notify both assignee and assigned_to of parent task
				self.notify_parent_task_users(parent_task)

		except Exception as e:
			frappe.log_error(
				message=f"Error checking parent task completion for subtask {self.name}: {str(e)}",
				title="Parent Task Completion Check Error",
			)

	def notify_parent_task_users(self, parent_task):
		"""Notify both assignee and assigned_to when all subtasks are completed."""
		try:
			# Notify assignee (creator)
			try:
				assignee_user = frappe.get_doc("CG User", parent_task.assignee)
				if assignee_user.phone:
					assignee_message = (
						f"Hello {assignee_user.full_name}, \n\n"
						f"All subtasks for task '{parent_task.task_name}' have been completed! \n\n"
						f"The main task can now be marked as completed. \n\n"
						f"Task: {parent_task.task_name} \n"
						f"Due Date: {format_due_date(parent_task.due_date, DATE_FORMAT_REMINDER)}"
					)

					enqueue_send_whatsapp_notification(
						phone_number=assignee_user.phone,
						notification=assignee_message,
						company_id=parent_task.company_id,
					)

				# Send email to assignee
				send_task_email(parent_task, "All Subtasks Completed")

			except Exception as e:
				frappe.log_error(
					message=f"Failed to notify parent task assignee: {str(e)}",
					title="Subtask Completion Notification Error",
				)

			# Notify assigned_to (doer) if different from assignee
			if parent_task.assigned_to != parent_task.assignee:
				try:
					assigned_to_user = frappe.get_doc("CG User", parent_task.assigned_to)
					if assigned_to_user.phone:
						assigned_to_message = (
							f"Hello {assigned_to_user.full_name}, \n\n"
							f"All subtasks for your task '{parent_task.task_name}' have been completed! \n\n"
							f"You can now mark the main task as completed if ready. \n\n"
							f"Task: {parent_task.task_name} \n"
							f"Due Date: {format_due_date(parent_task.due_date, DATE_FORMAT_REMINDER)}"
						)

						enqueue_send_whatsapp_notification(
							phone_number=assigned_to_user.phone,
							notification=assigned_to_message,
							company_id=parent_task.company_id,
						)

				except Exception as e:
					frappe.log_error(
						message=f"Failed to notify parent task assigned_to user: {str(e)}",
						title="Subtask Completion Notification Error",
					)

		except Exception as e:
			frappe.log_error(
				message=f"Error in notify_parent_task_users for task {self.name}: {str(e)}",
				title="Parent Task Notification Error",
			)

	def on_change(self):
		"""Actions to perform when a document field changes."""
		doc_before_save = self.get_doc_before_save()
		previous_is_completed = doc_before_save.is_completed if doc_before_save else 0
		previous_status = doc_before_save.status if doc_before_save else None

		# OPTIMIZED: Skip notifications during bulk operations
		if self.is_completed == 1 and previous_is_completed == 0:
			if not getattr(frappe.local, "bulk_task_creation", False):
				handle_task_completion(self)

				# Only send completion email if not already sent from on_update
				# (i.e., if it wasn't a paused task being completed)
				if previous_status != "Paused":
					frappe.logger().info(f"Sending Completed email for task {self.name}")
					send_task_email(self, "Completed")

			# if self.task_type == "Process":
			# 	try:
			# 		frappe.logger().info(
			# 			f"Attempting to send workflow step notifications for task {self.name}"
			# 		)
			# 		send_workflow_step_notifications(self)
			# 	except Exception as e:
			# 		frappe.log_error(
			# 			message=f"Error sending workflow step notifications for task {self.name}: {str(e)}\n{frappe.get_traceback()}",
			# 			title="Workflow Step Notification Error in on_change",
			# 		)

		should_update_reminder = False

		if self.reminder_enabled == 1:
			if not doc_before_save:
				should_update_reminder = True
			elif not doc_before_save.next_remind_at and self.next_remind_at:
				should_update_reminder = True
			elif not self.next_remind_at and self.starting_on:
				should_update_reminder = True
			elif doc_before_save and (
				doc_before_save.reminder_frequency != self.reminder_frequency
				or doc_before_save.reminder_interval != self.reminder_interval
				or doc_before_save.reminder_unit != self.reminder_unit
				or get_datetime(doc_before_save.starting_on) != get_datetime(self.starting_on)
			):
				should_update_reminder = True

		if should_update_reminder:
			try:
				# Calculate next_remind_at based on reminder configuration
				if self.reminder_frequency == "Custom" and self.reminder_unit == "Hours":
					# For Hours-based reminders, calculate from due_date
					if self.due_date and self.reminder_interval:
						due_date = get_datetime(self.due_date)
						hours_before = int(self.reminder_interval)
						self.next_remind_at = due_date - timedelta(hours=hours_before)
					else:
						self.next_remind_at = None
				elif self.starting_on:
					# For Days-based reminders, first reminder should be sent at the exact "Starting at" time
					self.next_remind_at = get_datetime(self.starting_on)
				elif self.reminder_frequency in ["Daily", "Weekly"] and self.due_date:
					# For Daily/Weekly reminders without starting_on, calculate from due_date
					due_date = get_datetime(self.due_date)
					if self.reminder_frequency == "Daily":
						# Send first reminder 1 day before due date
						self.next_remind_at = due_date - timedelta(days=1)
					elif self.reminder_frequency == "Weekly":
						# Send first reminder 1 week before due date
						self.next_remind_at = due_date - timedelta(weeks=1)
				else:
					self.next_remind_at = None

				frappe.logger().info(f"Setting next_remind_at for task {self.name} to {self.next_remind_at}")
				if self.next_remind_at:
					frappe.db.set_value(
						"CG Task Instance",
						self.name,
						"next_remind_at",
						self.next_remind_at,
						update_modified=False,
					)
					frappe.logger().info(f"Saved task {self.name} with next_remind_at {self.next_remind_at}")
				else:
					frappe.logger().info(
						f"next_remind_at not set for task {self.name} as required fields are not available."
					)
			except Exception as e:
				frappe.log_error(
					message=f"Failed to set next_remind_at for task {self.name}: {str(e)}",
					title="Task Reminder Setup Error",
				)

	def after_insert(self):
		"""
		Actions to perform after a new document has been inserted and saved.
		Async notification handling via doc_events.

		Note: Actual notification scheduling is handled by doc_events.py
		This method only handles non-notification tasks.
		"""
		# Subtask creation
		if self.has_subtask and self.subtask:
			self.create_subtask_instances()

		# Propagate status to subtasks if parent is paused/rejected
		if self.status in ["Paused", "Rejected"] and self.has_subtask:
			self.propagate_status_to_subtasks()

		# Increment tag count
		if self.tag and not getattr(self, "is_subtask", 0):
			try:
				increment_tag_count(self.tag)
			except Exception as e:
				frappe.log_error(
					message=f"Error incrementing tag count: {str(e)}", title=f"Tag Count Error - {self.name}"
				)

		# NOTE: Notification handling is done via doc_events.handle_task_after_insert()
		# This is configured in hooks.py doc_events section

	def on_trash(self):
		"""Actions to perform before a document is deleted."""

		# V2: Schedule deletion notification via deletion log
		# CRITICAL: We can't query the task after deletion, so we use the deletion log
		skip_notifications = (
			frappe.flags.get("skip_task_delete_email", False)
			or getattr(frappe.local, "bulk_task_creation", False)
			or frappe.flags.get("in_parent_deletion", False)
		)

		# Check if this is an individual deletion (for immediate notification)
		is_individual_deletion = not skip_notifications

		try:
			frappe.logger().info(f"Creating deletion log for task {self.name}")

			# Create the deletion log entry with notification fields
			deletion_log = frappe.get_doc(
				{
					"doctype": "CG Task Instance Deletion Log",
					"task_instance_id": self.name,
					"task_name": self.task_name,
					"task_type": self.task_type or "",
					"status": self.status,
					"priority": self.priority,
					"due_date": self.due_date,
					"assigned_to": self.assigned_to or "",
					"assignee": self.assignee or "",
					"checker": self.checker or "",
					"branch": self.branch or "",
					"department": self.department or "",
					"company_id": self.company_id,
					"deleted_by": frappe.session.user,
					"deleted_on": now(),
					"is_completed": self.is_completed or 0,
					"completed_on": self.completed_on,
					"completed_by": self.completed_by or "",
					"description": self.description or "",
					"tag": self.tag or "",
					"task_definition_id": self.task_definition_id or "",
					"is_subtask": self.is_subtask or 0,
					"parent_task_instance": self.parent_task_instance or "",
					"full_document_json": json.dumps(self.as_dict(), indent=2, default=str),
					# CRITICAL: Add notification fields to deletion log
					"notification_pending": 0 if skip_notifications else 1,
					"notification_sent": 0,
				}
			)

			# Insert the deletion log
			deletion_log.insert(ignore_permissions=True)
			frappe.db.commit()

			# OPTIMIZED: For individual deletions, immediately enqueue notification
			if is_individual_deletion:
				frappe.logger().info(
					f"Individual deletion: Immediately enqueueing notification for task {self.name}"
				)

				# Immediately enqueue deletion notification
				frappe.enqueue(
					"clapgrow_app.api.whatsapp.notification_processor.send_deletion_notification_from_log",
					deletion_log_name=deletion_log.name,
					queue="short",
					timeout=300,
					is_async=True,
					now=False,
				)

				# Mark as processing (not pending, so cron doesn't pick it up)
				frappe.db.set_value(
					"CG Task Instance Deletion Log",
					deletion_log.name,
					{"notification_pending": 0},  # Cron won't process this
					update_modified=False,
				)
			else:
				frappe.logger().info(
					f"Bulk deletion: Scheduled notification for task {self.name} (will be processed by cron)"
				)

		except Exception as e:
			# Log the error but don't prevent deletion
			frappe.logger().error(f"Error creating deletion log for {self.name}: {str(e)}")
			frappe.log_error(title=f"Deletion Log Error - {self.name}", message=frappe.get_traceback())

		# Prevent deletion of completed tasks
		if self.is_completed == 1:
			frappe.throw(_("Completed tasks cannot be deleted."))

		frappe.logger().info(f"Starting deletion process for task {self.name}")

		# Step 1: Handle subtask cleanup - remove from parent's child table
		# Skip this if we're deleting as part of parent's subtask removal (to avoid redundant operations)
		if (
			getattr(self, "is_subtask", 0)
			and self.parent_task_instance
			and not frappe.flags.get("skip_parent_table_removal", False)
		):
			try:
				parent_doc = frappe.get_doc("CG Task Instance", self.parent_task_instance)
				if parent_doc.has_subtask and parent_doc.subtask:
					for subtask in parent_doc.subtask:
						if subtask.subtask_id == self.name:
							# Remove subtask from child table
							parent_doc.subtask.remove(subtask)
							parent_doc.save(ignore_permissions=True)

							# Add audit comment to parent task
							parent_doc.add_comment(
								"Info",
								f"Subtask '{self.task_name}' has been deleted and removed from the subtask list.",
							)

							frappe.logger().info(
								f"Removed subtask {self.name} from parent task {self.parent_task_instance} child table"
							)
							break
			except Exception as e:
				frappe.log_error(
					message=f"Failed to remove subtask from parent's child table: {str(e)}",
					title="Subtask Parent Table Removal Error",
				)
				# Re-raise to prevent deletion if we can't update parent
				frappe.throw(_("Failed to update parent task when deleting subtask: {0}").format(str(e)))

		# Step 2: Delete all subtask instances if this is a parent task
		if not getattr(self, "is_subtask", 0):
			subtask_instances = frappe.get_all(
				"CG Task Instance",
				filters={
					"parent_task_instance": self.name,
					"is_subtask": 1,
				},
				fields=["name"],
			)

			if subtask_instances:
				frappe.logger().info(
					f"Found {len(subtask_instances)} subtasks to delete for parent task {self.name}"
				)

				# OPTIMIZED: Batch delete subtasks with skip flag to avoid cascade notifications
				frappe.flags.in_parent_deletion = True
				try:
					for subtask in subtask_instances:
						try:
							frappe.delete_doc(
								"CG Task Instance", subtask.name, ignore_permissions=True, force=True
							)
							frappe.logger().info(f"Deleted subtask instance {subtask.name})")
						except Exception as e:
							frappe.log_error(
								message=f"Failed to delete subtask instance {subtask.name}: {str(e)}",
								title="Subtask Deletion Error",
							)
							# Continue with other subtasks even if one fails
							continue
				finally:
					frappe.flags.in_parent_deletion = False

		# Step 3: Add comment to parent task if this is a subtask
		if getattr(self, "is_subtask", 0) and self.parent_task_instance:
			try:
				parent_task = frappe.get_doc("CG Task Instance", self.parent_task_instance)
				parent_task.add_comment("Info", f"Subtask '{self.task_name}' has been deleted.")
			except Exception as e:
				frappe.logger().warning(f"Could not add deletion comment to parent task: {str(e)}")
				# Don't fail deletion if comment fails

		# Step 4: Delete related CG Task Reallocation records
		related_reallocations = frappe.get_all(
			"CG Task Reallocation",
			filters={"instance_id": self.name, "onetime_task": 1},
			fields=["name"],
		)

		if related_reallocations:
			frappe.logger().info(
				f"Found {len(related_reallocations)} related reallocation records for task {self.name}"
			)

			for reallocation in related_reallocations:
				try:
					reallocation_doc = frappe.get_doc("CG Task Reallocation", reallocation.name)
					reallocation_doc.delete()
					frappe.logger().info(
						f"Deleted reallocation record {reallocation.name} for task {self.name}"
					)
				except Exception as e:
					frappe.log_error(
						message=f"Failed to delete reallocation record {reallocation.name} for task {self.name}: {str(e)}",
						title="Task Reallocation Deletion Error",
					)
					frappe.throw(
						_("Cannot delete task. Failed to delete related reallocation record: {0}").format(
							reallocation.name
						)
					)

		# Step 5: Decrement tag count
		if self.tag:
			try:
				decrement_tag_count(self.tag)
				frappe.logger().info(f"Decremented tag count for tag {self.tag}")
			except Exception as e:
				frappe.log_error(
					message=f"Failed to decrement tag count for tag {self.tag}: {str(e)}",
					title="Tag Count Decrement Error",
				)
				# Don't fail deletion if tag count update fails

		# Step 6: Notifications are now handled via notification_status field (set in on_trash above)
		# OPTIMIZED: Removed direct notification calls - using DB-based scheduling instead
		# The cron job (process_pending_notifications) will handle deletion notifications in batches
		# This prevents queue overload during bulk deletions

		# Step 7: Emit real-time events to update dashboards
		# OPTIMIZED: Skip real-time events during bulk operations
		skip_notifications = (
			frappe.flags.get("skip_task_delete_email", False)
			or getattr(frappe.local, "bulk_task_creation", False)
			or frappe.flags.get("in_parent_deletion", False)
		)

		if not skip_notifications:
			users_to_notify = [self.assigned_to, self.assignee]

			# Include team members if assigned_to is a team lead
			try:
				user_role = frappe.get_value("CG User", {"email": self.assigned_to}, "role")
				if user_role == "ROLE-Team Lead":
					teams = frappe.get_all(
						"CG Team", filters={"team_lead": self.assigned_to}, fields=["name"]
					)
					for team in teams:
						members = frappe.get_all(
							"CG Team Member",
							filters={"parent": team.name},
							fields=["member"],
						)
						users_to_notify.extend([member.member for member in members])
			except Exception as e:
				frappe.logger().warning(f"Could not get team members for notifications: {str(e)}")

			# Emit events
			try:
				for user in set(users_to_notify):
					if user:
						frappe.publish_realtime(
							event="report_updated",
							message={"report_name": "Total Task Status Report"},
							user=user,
						)
						frappe.logger().info(
							f"Emitted report_updated event to user {user} for task {self.name}"
						)
			except Exception as e:
				frappe.log_error(
					message=f"Failed to emit report_updated event for task {self.name}: {str(e)}",
					title="Report Update Event Error",
				)
			# Don't fail deletion if event emission fails

		frappe.logger().info(f"Successfully completed deletion process for task {self.name}")

	def handle_subtask_additions(self, previous_doc):
		"""Handle creation of new task instances when subtasks are added to the child table."""
		try:
			# Get previous subtasks if they existed
			previous_subtasks = []
			if previous_doc and previous_doc.subtask:
				previous_subtasks = [row.subtask_name for row in previous_doc.subtask]

			# Find newly added subtasks
			new_subtasks = []
			for current_row in self.subtask or []:
				# Check if this subtask name wasn't in the previous version
				if current_row.subtask_name not in previous_subtasks:
					new_subtasks.append(current_row)

			# Create task instances for new subtasks
			for subtask_data in new_subtasks:
				try:
					# Check if a task instance already exists for this subtask
					existing_instance = frappe.get_all(
						"CG Task Instance",
						filters={
							"parent_task_instance": self.name,
							"task_name": subtask_data.subtask_name,
							"is_subtask": 1,
						},
						fields=["name"],
						limit=1,
					)

					if existing_instance:
						# Update the child table with existing instance ID
						for row in self.subtask:
							if row.subtask_name == subtask_data.subtask_name:
								row.subtask_id = existing_instance[0].name
								break
						continue

					# Create new subtask instance
					subtask_instance_data = {
						"doctype": "CG Task Instance",
						"task_name": subtask_data.subtask_name,
						"description": self.description,
						"assigned_to": subtask_data.assigned_to,
						"assignee": self.assignee,
						"task_type": self.task_type,
						"priority": self.priority,
						"company_id": self.company_id or self.company_id,
						"branch": self.branch,
						"department": self.department,
						"due_date": subtask_data.due_date or self.due_date,
						"tag": self.tag,
						"checker": self.checker,
						"upload_required": self.upload_required,
						"restrict": self.restrict,
						"is_subtask": 1,
						"parent_task_instance": self.name,
						"submit_file": self.submit_file or "[]",
						"attach_file": self.attach_file or "[]",
						"has_subtask": 0,
						"reminder_enabled": self.reminder_enabled,
						"reminder_frequency": self.reminder_frequency,
						"starting_on": self.starting_on,
						"reminder_interval": self.reminder_interval,
						"reminder_unit": self.reminder_unit,
						"recurrence_type_id": (
							self.recurrence_type_id if self.task_type == "Recurring" else None
						),
					}

					if self.task_type == "Recurring" and self.task_definition_id:
						subtask_instance_data["task_definition_id"] = self.task_definition_id

					subtask_instance = frappe.get_doc(subtask_instance_data)
					subtask_instance.insert()

					# Update the child table row with the created task instance ID
					for row in self.subtask:
						if row.subtask_name == subtask_data.subtask_name:
							row.subtask_id = subtask_instance.name
							# Save the specific field to database immediately
							frappe.db.set_value(
								"CG Subtask Instance",
								row.name,
								"subtask_id",
								subtask_instance.name,
								update_modified=False,
							)
							break

					frappe.logger().info(
						f"Created new subtask instance {subtask_instance.name} for subtask {subtask_data.subtask_name}"
					)

				except Exception as e:
					frappe.log_error(
						f"Error creating task instance for subtask {subtask_data.subtask_name}: {str(e)}",
						"Subtask Instance Creation Error",
					)
					frappe.throw(
						f"Failed to create task instance for subtask '{subtask_data.subtask_name}': {str(e)}"
					)

			# Save the parent task to persist the subtask_id updates
			if new_subtasks:
				try:
					frappe.db.commit()
					frappe.logger().info(
						f"Successfully processed {len(new_subtasks)} new subtasks for task {self.name}"
					)
				except Exception as e:
					frappe.log_error(
						f"Error saving subtask updates for task {self.name}: {str(e)}",
						"Subtask Save Error",
					)

		except Exception as e:
			frappe.log_error(
				message=f"Error handling subtask additions for task {self.name}: {str(e)}",
				title="Subtask Addition Handler Error",
			)

	def handle_subtask_deletions(self, previous_doc):
		"""Delete task instances for subtasks that were removed from the child table."""
		try:
			# Get previous subtask IDs and names
			previous_subtask_ids = {}
			if previous_doc and previous_doc.subtask:
				for row in previous_doc.subtask:
					if row.subtask_id:
						previous_subtask_ids[row.subtask_name] = row.subtask_id

			# Get current subtask names
			current_subtask_names = set()
			if self.subtask:
				current_subtask_names = {row.subtask_name for row in self.subtask}

			# Find removed subtasks
			removed_subtasks = []
			for subtask_name, subtask_id in previous_subtask_ids.items():
				if subtask_name not in current_subtask_names:
					removed_subtasks.append({"name": subtask_name, "id": subtask_id})

			# Delete the task instances for removed subtasks
			if removed_subtasks:
				frappe.logger().info(
					f"Found {len(removed_subtasks)} subtasks to delete for parent task {self.name}"
				)

				for subtask in removed_subtasks:
					try:
						# Check if the task instance still exists
						if frappe.db.exists("CG Task Instance", subtask["id"]):
							frappe.logger().info(
								f"Deleting subtask task instance {subtask['id']} ('{subtask['name']}') "
								f"removed from parent task {self.name}"
							)

							# Set flag to skip parent table removal since we're already handling it
							frappe.flags.skip_parent_table_removal = True

							try:
								# Delete the subtask task instance
								# The on_trash method of the subtask will handle cleanup
								frappe.delete_doc(
									"CG Task Instance", subtask["id"], ignore_permissions=True, force=True
								)

								frappe.logger().info(
									f"Successfully deleted subtask task instance {subtask['id']}"
								)
							finally:
								# Always clear the flag
								frappe.flags.skip_parent_table_removal = False
					except Exception as e:
						frappe.log_error(
							message=f"Error deleting subtask task instance {subtask['id']} "
							f"('{subtask['name']}'): {str(e)}",
							title="Subtask Task Instance Deletion Error",
						)
						# Continue with other subtasks even if one fails
						continue

				# Commit the deletions
				try:
					frappe.db.commit()
					frappe.logger().info(
						f"Successfully deleted {len(removed_subtasks)} subtask task instances "
						f"for parent task {self.name}"
					)
				except Exception as e:
					frappe.log_error(
						message=f"Error committing subtask deletions for task {self.name}: {str(e)}",
						title="Subtask Deletion Commit Error",
					)

		except Exception as e:
			frappe.log_error(
				message=f"Error handling subtask deletions for task {self.name}: {str(e)}",
				title="Subtask Deletion Handler Error",
			)

	def handle_workflow_resumption(self):
		"""
		Custom method to handle workflow resumption with proper object formatting
		to avoid AttributeError when workflow conditions access document attributes.
		"""
		try:
			# Check if this task has a workflow mapping
			if not frappe.db.exists("Clapgrow Workflow Task Mapping", {"task_name": self.name}):
				return

			# Import here to avoid circular imports
			from clapgrow_workflow.clapgrow_workflow.doctype.clapgrow_workflow_task_mapping.clapgrow_workflow_task_mapping import (
				resume_workflow,
			)

			# Get the mapping and related workflow data
			mapping = frappe.get_doc("Clapgrow Workflow Task Mapping", {"task_name": self.name})
			execution_log = frappe.get_doc("Clapgrow Workflow Execution Log", mapping.execution_log)
			workflow = frappe.get_doc("Clapgrow Workflow", mapping.workflow)

			context = frappe.parse_json(execution_log.initial_context)

			doctype = context.get("doctype")
			docname = context.get("docname")
			if not doctype or not docname:
				frappe.throw("Context must contain 'doctype' and 'docname' keys.")

			# Get the main document and convert to frappe._dict for dot notation support
			main_doc = frappe._dict(frappe.get_doc(doctype, docname).as_dict())

			# Get matching nodes
			matching_nodes = [node for node in workflow.nodes if node.node == mapping.node]
			matching_nodes.sort(key=lambda x: bool(x.condition), reverse=True)

			executed = False

			# Prepare step object with dot notation support
			step = frappe._dict()
			if self.attached_form and self.attached_docname:
				try:
					step_doc = frappe.get_doc(self.attached_form, self.attached_docname)
					step = frappe._dict(step_doc.as_dict())
				except Exception as e:
					frappe.log_error(
						message=f"Error loading attached document {self.attached_form}/{self.attached_docname}: {str(e)}",
						title="Workflow Step Document Error",
					)

			# Process workflow nodes
			for node in matching_nodes:
				if node.condition:
					try:
						# Evaluate condition with properly formatted objects
						if not frappe.safe_eval(node.condition, None, {"doc": main_doc, "step": step}):
							continue
					except Exception as e:
						frappe.log_error(
							message=f"Error evaluating workflow condition '{node.condition}' for task {self.name}: {str(e)}",
							title="Workflow Condition Evaluation Error",
						)
						continue

				# Get next node and execute
				next_node_name = node.next_node
				if not next_node_name:
					executed = True
					execution_log.db_set("status", "Success")
					continue

				try:
					node_doc = frappe.get_doc("Clapgrow Node Type", next_node_name)
					next_node = next((n for n in workflow.nodes if n.node == next_node_name), None)

					if next_node:
						output = next_node.execute(
							{
								**context,
								"workflow_name": workflow.name,
								"execution_log_id": execution_log.name,
								"current_node_index": node.idx,
								"company_id": workflow.company_id,
							}
						)

						execution_log.reload()
						if execution_log.recent_task_mapping != output.get("context", {}).get("mapping"):
							execution_log.append(
								"node_logs",
								{
									"node_type": node_doc.type,
									"event": node_doc.action,
									"context": frappe.as_json(context),
									"output": frappe.as_json(output),
								},
							)
							execution_log.recent_task_mapping = output.get("context", {}).get("mapping")

						execution_log.save(ignore_permissions=True)

						if output.get("pause"):
							executed = True
							execution_log.db_set("status", "Paused")
							continue
				except Exception as e:
					frappe.log_error(
						message=f"Error executing workflow node {next_node_name} for task {self.name}: {str(e)}",
						title="Workflow Node Execution Error",
					)
					continue

			# Mark as success if no node was executed
			if not executed:
				execution_log.db_set("status", "Success")

		except Exception as e:
			frappe.log_error(
				message=f"Error in custom workflow resumption for task {self.name}: {str(e)}",
				title="Custom Workflow Resumption Error",
			)


def validate_status_transition(previous_status, new_status, previous_is_completed, new_is_completed):
	"""
	Validate status transitions to ensure they follow business rules.
	Updated to allow paused tasks to be completed directly.

	Args:
		previous_status (str): The previous status of the task
		new_status (str): The new status being set
		previous_is_completed (int): Previous completion status (0 or 1)
		new_is_completed (int): New completion status (0 or 1)
	"""
	cg_user_role = frappe.get_value("CG User", frappe.session.user, "role")
	is_admin = cg_user_role == "ROLE-Admin"

	# Define valid status transitions - Updated to allow paused -> completed
	valid_transitions = {
		"Due Today": ["Overdue", "Upcoming", "Completed", "Paused", "Rejected"],
		"Overdue": ["Due Today", "Upcoming", "Completed", "Paused", "Rejected"],
		"Upcoming": ["Due Today", "Overdue", "Completed", "Paused", "Rejected"],
		"Completed": ["Due Today", "Overdue", "Upcoming"],  # Can only be reopened
		"Paused": [
			"Due Today",
			"Overdue",
			"Upcoming",
			"Completed",
			"Rejected",
		],
		"Rejected": (["Due Today", "Overdue", "Upcoming"] if is_admin else []),
	}

	# Check if the transition is valid
	if previous_status and previous_status in valid_transitions:
		if new_status not in valid_transitions[previous_status]:
			# Special case: Allow completion from any active status if is_completed is being set
			if new_status == "Completed" and new_is_completed == 1:
				return

			# Special case: Allow admin to reopen rejected tasks
			if previous_status == "Rejected" and is_admin:
				return

			frappe.throw(_(f"Invalid status transition from {previous_status} to {new_status}."))

	# Additional validation for rejected tasks
	if previous_status == "Rejected" and not is_admin:
		frappe.throw(_("Only admin can modify rejected tasks."))


@frappe.whitelist()
def get_user_role(user):
	"""Fetch the role of the given user from CG User."""
	try:
		user_doc_role = frappe.get_value("CG User", {"email": user}, "role")
		return user_doc_role if user_doc_role else None
	except Exception as e:
		frappe.log_error(
			message=f"Failed to get user role for {user}: {str(e)}",
			title="Get User Role Error",
		)
		return None


@frappe.whitelist()
def get_filtered_users(role):
	"""Fetch all users with roles lower than the given role."""
	if role not in ROLE_HIERARCHY:
		return []

	lower_roles = ROLE_HIERARCHY[ROLE_HIERARCHY.index(role) + 1 :]

	if not lower_roles:
		return []

	try:
		users = frappe.get_all(
			"CG User",
			filters={"role": ["in", lower_roles]},
			fields=["name", "full_name"],
		)
		return users
	except Exception as e:
		frappe.log_error(
			message=f"Failed to get filtered users for role {role}: {str(e)}",
			title="Get Filtered Users Error",
		)
		return []


def handle_task_name_change(self, previous_task_name):
	if (
		self.task_type == "Recurring"
		and previous_task_name is not None
		and previous_task_name != self.task_name
	):
		try:
			all_docs = frappe.get_all(
				"CG Task Instance",
				filters={
					"due_date": [">=", self.due_date],
					"task_definition_id": self.task_definition_id,
				},
			)

			# Set flag to indicate bulk deletion is happening
			frappe.flags.skip_task_delete_email = True

			deleted_count = 0
			for doc in all_docs:
				task_instance = frappe.get_doc("CG Task Instance", doc.name)
				if task_instance:
					task_instance.delete()
					deleted_count += 1

			# Clear the flag after bulk deletion
			frappe.flags.skip_task_delete_email = False

			# Send a single consolidated email if tasks were deleted
			if deleted_count > 0:
				send_bulk_deletion_email(
					self,
					"Task Name Changed",
					deleted_count,
					previous_task_name,
					self.task_name,
				)

			task_definition_doc = frappe.get_doc("CG Task Definition", self.task_definition_id)
			task_definition_doc.enabled = 0
			task_definition_doc.save()

			new_task_definition = frappe.new_doc("CG Task Definition")

			fields_to_copy = [
				"description",
				"assigned_to",
				"assignee",
				"task_type",
				"priority",
				"company_id",
				"branch",
				"department",
				"checker",
				"upload_required",
				"restrict",
				"reminder_enabled",
				"reminder_frequency",
				"starting_on",
				"reminder_interval",
				"reminder_unit",
				"recurrence_type_id",
				"tag",
				"due_date",
				"holiday_behaviour",
			]

			for field in fields_to_copy:
				if hasattr(self, field):
					new_task_definition.set(field, self.get(field))

			new_task_definition.task_name = self.task_name

			new_task_definition.insert()

			assigned_user = frappe.get_doc("User", self.assigned_to)
			if assigned_user and assigned_user.mobile_no:
				message = (
					f"Hello {assigned_user.full_name}, \n\n"
					f"The Task Name for your task on Clapgrow has changed. \n\n"
					f"*Task*: {self.task_name} \n"
					f"*Previous Task Name*: {previous_task_name} \n"
					f"*New Task Name*: {self.task_name} \n"
					f"*Due Date*: {format_due_date(self.due_date, DATE_FORMAT_REMINDER)} \n"
					f"*Priority*: {self.priority} \n\n"
					f"Please review the updated task details in the system."
				)
				enqueue_send_whatsapp_notification(
					phone_number=assigned_user.mobile_no,
					notification=message,
					company_id=self.company_id,
				)

			else:
				frappe.log_error(
					message=f"No mobile number found for assigned user {self.assigned_to} in task {self.name}.",
					title="Recurrence Change WhatsApp Notification Error",
				)

		except Exception as e:
			# Clear flag in case of error
			frappe.flags.skip_task_delete_email = False
			frappe.log_error(f"Error handling recurrence type change: {str(e)}")
			frappe.throw(f"Failed to update recurrence: {str(e)}")


def handle_recurrence_type_change(self, previous_recurrence_type_id):
	if (
		self.task_type == "Recurring"
		and previous_recurrence_type_id is not None
		and previous_recurrence_type_id != self.recurrence_type_id
	):
		try:
			old_recurrence_name = frappe.get_value(
				"CG Recurrence Type", previous_recurrence_type_id, "frequency"
			)
			all_docs = frappe.get_all(
				"CG Task Instance",
				filters={
					"due_date": [">=", self.due_date],
					"task_definition_id": self.task_definition_id,
				},
			)

			# Set flag to indicate bulk deletion is happening
			frappe.flags.skip_task_delete_email = True

			deleted_count = 0
			for doc in all_docs:
				task_instance = frappe.get_doc("CG Task Instance", doc.name)
				if task_instance:
					task_instance.delete()
					deleted_count += 1

			# Clear the flag after bulk deletion
			frappe.flags.skip_task_delete_email = False

			# Send a single consolidated email if tasks were deleted
			if deleted_count > 0:
				new_recurrence_name = frappe.get_value(
					"CG Recurrence Type", self.recurrence_type_id, "frequency"
				)
				send_bulk_deletion_email(
					self,
					"Recurrence Changed",
					deleted_count,
					old_recurrence_name,
					new_recurrence_name,
				)

			task_definition_doc = frappe.get_doc("CG Task Definition", self.task_definition_id)
			task_definition_doc.enabled = 0
			task_definition_doc.save()

			new_task_definition = frappe.new_doc("CG Task Definition")

			fields_to_copy = [
				"task_name",
				"description",
				"assigned_to",
				"assignee",
				"task_type",
				"priority",
				"company_id",
				"branch",
				"department",
				"checker",
				"upload_required",
				"restrict",
				"reminder_enabled",
				"reminder_frequency",
				"starting_on",
				"reminder_interval",
				"reminder_unit",
				"recurrence_type_id",
				"tag",
				"due_date",
			]

			for field in fields_to_copy:
				if hasattr(self, field):
					new_task_definition.set(field, self.get(field))

			new_task_definition.holiday_behaviour = task_definition_doc.holiday_behaviour
			new_task_definition.insert()

			new_recurrence_name = frappe.get_value("CG Recurrence Type", self.recurrence_type_id, "frequency")

			assigned_user = frappe.get_doc("User", self.assigned_to)
			if assigned_user and assigned_user.mobile_no:
				message = (
					f"Hello {assigned_user.full_name}, \n\n"
					f"The recurrence type for your task on Clapgrow has changed. \n\n"
					f"*Task*: {self.task_name} \n"
					f"*Old Recurrence Type*: {old_recurrence_name} \n"
					f"*New Recurrence Type*: {new_recurrence_name} \n"
					f"*Due Date*: {format_due_date(self.due_date, DATE_FORMAT_REMINDER)} \n"
					f"*Priority*: {self.priority} \n\n"
					f"Please review the updated task details in the system."
				)
				enqueue_send_whatsapp_notification(
					phone_number=assigned_user.mobile_no,
					notification=message,
					company_id=self.company_id,
				)

				send_task_email(self, "Recurrence Changed", old_recurrence_name, new_recurrence_name)
			else:
				frappe.log_error(
					message=f"No mobile number found for assigned user {self.assigned_to} in task {self.name}.",
					title="Recurrence Change WhatsApp Notification Error",
				)

		except Exception as e:
			# Clear flag in case of error
			frappe.flags.skip_task_delete_email = False
			frappe.log_error(f"Error handling recurrence type change: {str(e)}")
			frappe.throw(f"Failed to update recurrence: {str(e)}")


def send_task_reminders():
	"""
	Filter CG Task Instances with reminder_enabled=1, is_completed=0, and next_remind_at within ±7 minutes.
	Send WhatsApp notifications and update next_remind_at.
	"""
	try:
		current_time = now_datetime()
		time_window_start = current_time - timedelta(minutes=7)
		time_window_end = current_time + timedelta(minutes=7)

		tasks = frappe.get_all(
			"CG Task Instance",
			filters={
				"reminder_enabled": 1,
				"is_completed": 0,
				"next_remind_at": ["between", [time_window_start, time_window_end]],
			},
			fields=[
				"name",
				"task_name",
				"assigned_to",
				"assignee",
				"task_type",
				"is_help_ticket",
				"company_id",
				"due_date",
				"priority",
				"description",
				"reminder_frequency",
				"reminder_interval",
				"reminder_unit",
				"next_remind_at",
				"is_subtask",
				"parent_task_instance",
			],
		)

		for task in tasks:
			try:
				task_doc = frappe.get_doc("CG Task Instance", task.name)
				assigned_user = frappe.get_doc("User", task.assigned_to)
				assignee_user = frappe.get_doc("User", task.assignee)

				if not assigned_user.mobile_no:
					frappe.log_error(
						message=f"No mobile number found for assigned user {assigned_user.name} in task {task.name}.",
						title="Task Reminder Notification Error",
					)
					continue

				message = ""
				task_type_text = "subtask" if getattr(task, "is_subtask", 0) else "task"

				if task.task_type == "Onetime" and task.is_help_ticket == 0:
					message = (
						f"Hello {assigned_user.full_name}, \n\n"
						f"This is a reminder for your upcoming {task_type_text} on Clapgrow. \n\n"
						f"*Task*: {task.task_name} \n"
						f"*Priority*: {task.priority} \n"
						f"*Due Date*: {format_due_date(task.due_date, DATE_FORMAT_REMINDER)} \n"
						f"*Assignee*: {assignee_user.full_name} \n\n"
						f"Please ensure the {task_type_text} is completed by the due date."
					)
				elif task.task_type == "Recurring":
					message = (
						f"Hello {assigned_user.full_name}, \n\n"
						f"This is a reminder for your recurring task on Clapgrow. \n\n"
						f"*Open task*: {frappe.utils.get_url()}/clapgrow/task/{task_doc.name}\n"
						f"*Task*: {task.task_name} \n"
						f"*Priority*: {task.priority} \n"
						f"*Due Date*: {format_due_date(task.due_date, DATE_FORMAT_REMINDER)} \n"
						f"*Assignee*: {assignee_user.full_name} \n\n"
						f"Please ensure the task is completed by the due date."
					)
				elif task.is_help_ticket == 1:
					message = (
						f"Hello {assigned_user.full_name}, \n\n"
						f"This is a reminder for your help ticket on Clapgrow. \n\n"
						f"*Ticket ID*: {task.name} \n"
						f"*Subject*: {task.task_name} \n"
						f"*Priority*: {task.priority} \n"
						f"*Due Date*: {format_due_date(task.due_date, DATE_FORMAT_REMINDER)} \n"
						f"Please attend to this help ticket as soon as possible."
					)
				else:
					frappe.log_error(
						message=f"No specific reminder message defined for task_type '{task.task_type}' and is_help_ticket '{task.is_help_ticket}' for task {task.name}.",
						title="Task Reminder Notification Logic",
					)
					continue

				enqueue_send_whatsapp_notification(
					phone_number=assigned_user.mobile_no,
					notification=message,
					company_id=task.company_id,
				)

				current_next_remind_at = get_datetime(task_doc.next_remind_at)
				next_remind_at = None

				if task.reminder_frequency == "Daily":
					# Add 1 day to current reminder time for next reminder
					next_remind_at = current_next_remind_at + timedelta(days=1)
				elif task.reminder_frequency == "Weekly":
					# Add 1 week to current reminder time for next reminder
					next_remind_at = current_next_remind_at + timedelta(weeks=1)
				elif (
					task.reminder_frequency == "Custom"
					and task.reminder_unit in ["Days", "Hours"]
					and task.reminder_interval
				):
					if task.reminder_unit == "Days":
						# For Days-based reminders, add interval to current reminder time
						next_remind_at = current_next_remind_at + timedelta(days=task.reminder_interval)
					else:
						# For Hours-based reminders, add interval to current reminder time
						next_remind_at = current_next_remind_at + timedelta(hours=task.reminder_interval)
				else:
					frappe.logger().warning(
						f"Unexpected reminder_frequency '{task.reminder_frequency}' for task {task.name}. Defaulting to daily reminder."
					)
					next_remind_at = current_next_remind_at + timedelta(days=1)

				# Decrement remaining times if tracked
				try:
					if (
						getattr(task_doc, "reminder_times_remaining", None) is not None
						and task_doc.reminder_times_remaining > 0
					):
						task_doc.reminder_times_remaining = max(0, int(task_doc.reminder_times_remaining) - 1)
						frappe.db.set_value(
							"CG Task Instance",
							task.name,
							"reminder_times_remaining",
							task_doc.reminder_times_remaining,
							update_modified=False,
						)
				except Exception as _e:
					pass

				if next_remind_at and get_datetime(task_doc.next_remind_at) != next_remind_at:
					frappe.logger().info(f"Updating next_remind_at for task {task.name} to {next_remind_at}")
					frappe.db.set_value(
						"CG Task Instance",
						task.name,
						"next_remind_at",
						next_remind_at,
						update_modified=False,
					)
					frappe.logger().info(
						f"Successfully updated next_remind_at for task {task.name} to {next_remind_at}"
					)
				else:
					frappe.logger().info(
						f"No update needed for next_remind_at for task {task.name} (already set or no valid next date)."
					)

			except frappe.DoesNotExistError as e:
				frappe.log_error(
					message=f"Task or User related to task {task.name} does not exist: {str(e)}",
					title="Task Reminder Processing Error",
				)
			except Exception as e:
				frappe.log_error(
					message=f"Error processing reminder for task {task.name}: {str(e)}\nTraceback: {frappe.get_traceback()}",
					title="Task Reminder Processing Error",
				)

	except Exception as e:
		frappe.log_error(
			message=f"Overall error in send_task_reminders: {str(e)}\nTraceback: {frappe.get_traceback()}",
			title="Send Task Reminders Main Error",
		)

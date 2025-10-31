# Copyright (c) 2025, Clapgrow and contributors
# For license information, please see license.txt

"""
Notification Handler for CG Task Instance
Handles scheduling and processing of task notifications.
"""

import logging
from datetime import datetime, time, timedelta
from typing import Optional

import frappe
from frappe import _
from frappe.utils import getdate, nowdate

logger = logging.getLogger(__name__)


class TaskNotificationHandler:
	"""
	Centralized handler for task notification scheduling and processing.
	Determines notification type, schedule time, and manages notification lifecycle.
	"""

	# Notification type constants
	CREATED = "Created"
	UPDATED = "Updated"
	COMPLETED = "Completed"
	REOPENED = "Reopened"
	DELETED = "Deleted"
	ASSIGNED = "Assigned"
	REJECTED = "Rejected"
	PAUSED = "Paused"
	RESUMED = "Resumed"

	# Status constants
	PENDING = "Pending"
	SENT = "Sent"
	SKIPPED = "Skipped"
	FAILED = "Failed"

	@staticmethod
	def schedule_notification(task_doc, notification_type: str):
		"""
		Schedule a notification for a task.

		Args:
		    task_doc: CG Task Instance document
		    notification_type: Type of notification (Created, Updated, etc.)
		"""
		try:
			# Skip if explicitly marked
			if task_doc.flags.get("skip_notification"):
				TaskNotificationHandler._mark_as_skipped(task_doc)
				return

			# Skip notification for subtasks (they have their own handling)
			if getattr(task_doc, "is_subtask", 0):
				TaskNotificationHandler._mark_as_skipped(task_doc)
				return

			# Determine notification schedule time
			notification_time = TaskNotificationHandler._calculate_schedule_time(task_doc, notification_type)

			# Update notification fields
			task_doc.db_set(
				{
					"notification_type": notification_type,
					"notification_status": TaskNotificationHandler.PENDING,
					"notification_scheduled_for": notification_time,
					"skip_notification": 0,
				},
				update_modified=False,
			)

			logger.info(
				f"Scheduled {notification_type} notification for task {task_doc.name} at {notification_time}"
			)

		except Exception as e:
			logger.error(f"Error scheduling notification for task {task_doc.name}: {str(e)}")
			frappe.log_error(
				message=f"Error scheduling notification: {str(e)}",
				title=f"Notification Schedule Error - {task_doc.name}",
			)

	@staticmethod
	def _calculate_schedule_time(task_doc, notification_type: str) -> datetime:
		"""
		Calculate when notification should be sent based on task type and context.

		Rules:
		1. Bulk creation (recurring tasks): 8 AM on due date
		2. Manual creation (onetime, help tickets): Immediate
		3. Updates (completion, rejection, etc.): Immediate
		4. Process tasks: Immediate

		Args:
		    task_doc: CG Task Instance document
		    notification_type: Type of notification

		Returns:
		    datetime: When notification should be sent
		"""
		current_time = datetime.now()

		# Check if this is bulk creation (set by cron job)
		is_bulk_creation = getattr(frappe.local, "bulk_task_creation", False)

		# For Created notifications during bulk creation
		if notification_type == TaskNotificationHandler.CREATED and is_bulk_creation:
			if task_doc.task_type == "Recurring":
				# Schedule for 8 AM on the task's due date
				due_date = getdate(task_doc.due_date) if task_doc.due_date else getdate(nowdate())
				notification_time = datetime.combine(due_date, time(8, 0, 0))

				# If 8 AM has already passed today, schedule for 5 minutes from now
				if notification_time < current_time:
					notification_time = current_time + timedelta(minutes=5)

				return notification_time

		# All other cases: immediate notification
		return current_time

	@staticmethod
	def _mark_as_skipped(task_doc):
		"""Mark notification as skipped."""
		task_doc.db_set(
			{"notification_status": TaskNotificationHandler.SKIPPED, "skip_notification": 1},
			update_modified=False,
		)
		logger.info(f"Notification skipped for task {task_doc.name}")

	@staticmethod
	def mark_as_sent(task_name: str):
		"""
		Mark notification as sent.

		Args:
		    task_name: Name of the task instance
		"""
		try:
			frappe.db.set_value(
				"CG Task Instance",
				task_name,
				{
					"notification_status": TaskNotificationHandler.SENT,
					"notification_sent_on": datetime.now(),
				},
				update_modified=False,
			)
			frappe.db.commit()
			logger.info(f"Marked notification as sent for task {task_name}")
		except Exception as e:
			logger.error(f"Error marking notification as sent for {task_name}: {str(e)}")

	@staticmethod
	def mark_as_failed(task_name: str, error_message: str = None):
		"""
		Mark notification as failed.

		Args:
		    task_name: Name of the task instance
		    error_message: Optional error message
		"""
		try:
			frappe.db.set_value(
				"CG Task Instance",
				task_name,
				{
					"notification_status": TaskNotificationHandler.FAILED,
					"notification_sent_on": datetime.now(),
				},
				update_modified=False,
			)
			frappe.db.commit()
			logger.error(f"Marked notification as failed for task {task_name}: {error_message}")

			# Log detailed error
			if error_message:
				frappe.log_error(message=error_message, title=f"Notification Failed - {task_name}")
		except Exception as e:
			logger.error(f"Error marking notification as failed for {task_name}: {str(e)}")

	@staticmethod
	def get_pending_notifications(limit: int = 1000) -> list:
		"""
		Get all tasks with pending notifications that should be sent now.

		Args:
		    limit: Maximum number of tasks to retrieve

		Returns:
		    list: List of task documents with pending notifications
		"""
		try:
			current_time = datetime.now()

			pending_tasks = frappe.get_all(
				"CG Task Instance",
				filters={
					"notification_status": TaskNotificationHandler.PENDING,
					"notification_scheduled_for": ["<=", current_time],
					"skip_notification": 0,
				},
				fields=[
					"name",
					"task_name",
					"task_type",
					"assigned_to",
					"assignee",
					"company_id",
					"due_date",
					"notification_type",
					"notification_scheduled_for",
				],
				order_by="notification_scheduled_for asc",
				limit=limit,
			)

			return pending_tasks

		except Exception as e:
			logger.error(f"Error getting pending notifications: {str(e)}")
			return []

	@staticmethod
	def get_notification_stats() -> dict:
		"""
		Get statistics about notification processing.

		Returns:
		    dict: Statistics about notifications
		"""
		try:
			stats = {
				"pending": frappe.db.count(
					"CG Task Instance", {"notification_status": TaskNotificationHandler.PENDING}
				),
				"sent_today": frappe.db.count(
					"CG Task Instance",
					{
						"notification_status": TaskNotificationHandler.SENT,
						"notification_sent_on": [">=", datetime.now().date()],
					},
				),
				"failed_today": frappe.db.count(
					"CG Task Instance",
					{
						"notification_status": TaskNotificationHandler.FAILED,
						"notification_sent_on": [">=", datetime.now().date()],
					},
				),
				"overdue": frappe.db.count(
					"CG Task Instance",
					{
						"notification_status": TaskNotificationHandler.PENDING,
						"notification_scheduled_for": ["<", datetime.now() - timedelta(hours=1)],
					},
				),
			}

			return stats

		except Exception as e:
			logger.error(f"Error getting notification stats: {str(e)}")
			return {}


# Convenience function for backward compatibility
def schedule_task_notification(task_doc, notification_type: str):
	"""
	Convenience function to schedule a task notification.

	Args:
	    task_doc: CG Task Instance document
	    notification_type: Type of notification
	"""
	TaskNotificationHandler.schedule_notification(task_doc, notification_type)

# Copyright (c) 2025, Clapgrow and contributors
# For license information, please see license.txt

"""
Notification Processor for CG Task Instance
Processes pending notifications via scheduled jobs.

FILE LOCATION: clapgrow_app/api/tasks/notification_processor.py
"""

import logging
import time
from datetime import datetime

import frappe
from frappe import _

from clapgrow_app.api.email_notifications import send_task_email
from clapgrow_app.api.whatsapp.notification_handler import TaskNotificationHandler
from clapgrow_app.api.whatsapp.notify import handle_task_completion, notify_users_for_created_tasks

logger = logging.getLogger(__name__)


def process_pending_notifications():
	"""
	Main scheduled job function to process pending notifications.

	This function:
	1. Finds all tasks with pending notifications scheduled for now or past
	2. Enqueues them for processing in batches
	3. Updates notification status

	Runs every hour via cron schedule.
	"""
	try:
		logger.info("=" * 80)
		logger.info("NOTIFICATION PROCESSING JOB STARTED")
		logger.info(f"Server time: {datetime.now()}")
		logger.info("=" * 80)

		# Get pending notifications for active tasks
		pending_tasks = TaskNotificationHandler.get_pending_notifications(limit=1000)

		# Get pending deletion notifications from deletion log
		# OPTIMIZED: Increased limit to handle bulk deletions (>10k tasks)
		# The batch processing below ensures we don't overload the queue
		pending_deletions = frappe.get_all(
			"CG Task Instance Deletion Log",
			filters={"notification_pending": 1, "notification_sent": 0},
			fields=["name", "task_instance_id", "task_name"],
			limit=5000,  # Process up to 5000 deletions per cron run
			order_by="creation asc",  # Process oldest first (FIFO)
		)

		total_items = len(pending_tasks) + len(pending_deletions)

		if total_items == 0:
			logger.info("No pending notifications to process")
			return {"status": "success", "processed": 0, "message": "No pending notifications"}

		logger.info(
			f"Found {len(pending_tasks)} active task notifications and {len(pending_deletions)} deletion notifications"
		)

		# Process notifications in batches to avoid queue overload
		batch_size = 50
		total_processed = 0
		total_failed = 0

		# Process active task notifications
		for i in range(0, len(pending_tasks), batch_size):
			batch = pending_tasks[i : i + batch_size]

			logger.info(f"Processing active task batch {i // batch_size + 1}: {len(batch)} tasks")

			for task_data in batch:
				try:
					# Enqueue notification processing (async)
					frappe.enqueue(
						"clapgrow_app.api.whatsapp.notification_processor.send_task_notification",
						task_name=task_data["name"],
						notification_type=task_data.get("notification_type"),
						queue="short",
						timeout=300,
						is_async=True,
						now=False,  # Don't block, add to queue
					)

					total_processed += 1

				except Exception as e:
					logger.error(f"Error enqueueing notification for task {task_data['name']}: {str(e)}")
					total_failed += 1

					# Mark as failed
					TaskNotificationHandler.mark_as_failed(task_data["name"], f"Failed to enqueue: {str(e)}")

			# Small delay between batches to avoid overwhelming the queue
			if i + batch_size < len(pending_tasks):
				time.sleep(1)

		# Process deletion notifications
		for i in range(0, len(pending_deletions), batch_size):
			batch = pending_deletions[i : i + batch_size]

			logger.info(f"Processing deletion batch {i // batch_size + 1}: {len(batch)} deletions")

			for deletion_log in batch:
				try:
					# Enqueue deletion notification processing (async)
					frappe.enqueue(
						"clapgrow_app.api.whatsapp.notification_processor.send_deletion_notification_from_log",
						deletion_log_name=deletion_log["name"],
						queue="short",
						timeout=300,
						is_async=True,
						now=False,  # Don't block, add to queue
					)

					total_processed += 1

				except Exception as e:
					logger.error(
						f"Error enqueueing deletion notification for log {deletion_log['name']}: {str(e)}"
					)
					total_failed += 1

			# Small delay between batches
			if i + batch_size < len(pending_deletions):
				time.sleep(1)

		# Commit all status updates
		frappe.db.commit()

		logger.info("\n" + "=" * 80)
		logger.info("NOTIFICATION PROCESSING COMPLETED")
		logger.info(f"Active tasks processed: {len(pending_tasks)}")
		logger.info(f"Deletions processed: {len(pending_deletions)}")
		logger.info(f"Total enqueued: {total_processed}")
		logger.info(f"Total failed: {total_failed}")
		logger.info("=" * 80)

		return {
			"status": "success",
			"processed": total_processed,
			"failed": total_failed,
			"active_tasks": len(pending_tasks),
			"deletions": len(pending_deletions),
			"message": f"Enqueued {total_processed} notifications ({len(pending_tasks)} tasks, {len(pending_deletions)} deletions), {total_failed} failed",
		}

	except Exception as e:
		logger.error(f"FATAL ERROR in notification processing: {str(e)}")
		frappe.log_error(
			message=f"Fatal error in notification processing: {str(e)}\n{frappe.get_traceback()}",
			title="Notification Processing Fatal Error",
		)
		return {"status": "error", "error": str(e)}


def send_task_notification(task_name: str, notification_type: str = None):
	"""
	Background job to send notification for a specific task.

	This function runs asynchronously in the job queue.
	Determines which notification to send based on notification_type.

	Args:
	    task_name: Name of the CG Task Instance
	    notification_type: Type of notification (Created, Updated, Completed, etc.)
	"""
	try:
		# Get task document
		task_doc = frappe.get_doc("CG Task Instance", task_name)

		# Double-check notification status (may have been updated by another process)
		if task_doc.notification_status != TaskNotificationHandler.PENDING:
			logger.info(f"Task {task_name} notification status is {task_doc.notification_status}, skipping")
			return

		# Get notification type from document if not provided
		if not notification_type:
			notification_type = task_doc.notification_type

		logger.info(f"Sending {notification_type} notification for task {task_name}")

		# Send notifications based on type
		if notification_type == TaskNotificationHandler.CREATED:
			_send_creation_notification(task_doc)

		elif notification_type == TaskNotificationHandler.COMPLETED:
			_send_completion_notification(task_doc)

		elif notification_type == TaskNotificationHandler.UPDATED:
			_send_update_notification(task_doc)

		elif notification_type == TaskNotificationHandler.ASSIGNED:
			_send_assignment_notification(task_doc)

		elif notification_type in [
			TaskNotificationHandler.REOPENED,
			TaskNotificationHandler.REJECTED,
			TaskNotificationHandler.PAUSED,
			TaskNotificationHandler.RESUMED,
		]:
			_send_status_change_notification(task_doc, notification_type)

		elif notification_type == "Deleted":
			# Deletion notifications are handled via deletion log
			# This case should not occur as deleted tasks are processed separately
			logger.warning(
				f"Deletion notification requested for active task {task_name} - this should be handled via deletion log"
			)

		else:
			logger.warning(f"Unknown notification type: {notification_type} for task {task_name}")
			# Send generic notification
			_send_creation_notification(task_doc)

		# Mark as sent
		TaskNotificationHandler.mark_as_sent(task_name)

		logger.info(f"Notification processing completed for task {task_name}")

	except Exception as e:
		error_msg = f"Error sending notification for task {task_name}: {str(e)}\n{frappe.get_traceback()}"
		logger.error(error_msg)

		# Mark as failed
		TaskNotificationHandler.mark_as_failed(task_name, error_msg)


def _send_creation_notification(task_doc):
	"""Send task creation notification (WhatsApp + Email)."""
	try:
		notify_users_for_created_tasks(task_doc)
		logger.info(f"WhatsApp creation notification sent for task {task_doc.name}")
	except Exception as e:
		logger.error(f"Error sending WhatsApp creation notification: {str(e)}")

	try:
		send_task_email(task_doc, "Created")
		logger.info(f"Email creation notification sent for task {task_doc.name}")
	except Exception as e:
		logger.error(f"Error sending email creation notification: {str(e)}")


def _send_completion_notification(task_doc):
	"""Send task completion notification (WhatsApp + Email)."""
	try:
		handle_task_completion(task_doc)
		logger.info(f"WhatsApp completion notification sent for task {task_doc.name}")
	except Exception as e:
		logger.error(f"Error sending WhatsApp completion notification: {str(e)}")

	try:
		send_task_email(task_doc, "Completed")
		logger.info(f"Email completion notification sent for task {task_doc.name}")
	except Exception as e:
		logger.error(f"Error sending email completion notification: {str(e)}")


def _send_update_notification(task_doc):
	"""Send task update notification."""
	try:
		# Use existing update notification logic
		from clapgrow_app.api.whatsapp.notify import send_task_whatsapp_notification_on_update

		# Determine which method to use based on update type
		previous_doc = task_doc.get_doc_before_save()
		if previous_doc:
			send_task_whatsapp_notification_on_update(
				task_doc,
				"update",  # default method
				previous_doc.status if previous_doc else None,
			)

		logger.info(f"Update notification sent for task {task_doc.name}")
	except Exception as e:
		logger.error(f"Error sending update notification: {str(e)}")


def _send_assignment_notification(task_doc):
	"""Send task assignment notification (similar to creation)."""
	_send_creation_notification(task_doc)


def _send_status_change_notification(task_doc, status_type: str):
	"""Send status change notification (reopened, rejected, paused, resumed)."""
	try:
		# Map status type to email status
		status_map = {
			TaskNotificationHandler.REOPENED: "Reopened",
			TaskNotificationHandler.REJECTED: "Rejected",
			TaskNotificationHandler.PAUSED: "Paused",
			TaskNotificationHandler.RESUMED: "Resumed",
		}

		email_status = status_map.get(status_type, "Updated")

		send_task_email(task_doc, email_status)
		logger.info(f"{status_type} notification sent for task {task_doc.name}")
	except Exception as e:
		logger.error(f"Error sending {status_type} notification: {str(e)}")


def send_deletion_notification_from_log(deletion_log_name: str):
	"""
	Background job to send deletion notification from deletion log.
	CRITICAL: Uses deletion log because the task instance is already deleted from DB.

	Args:
	    deletion_log_name: Name of the CG Task Instance Deletion Log document
	"""
	try:
		# Get deletion log (this persists after task deletion)
		deletion_log = frappe.get_doc("CG Task Instance Deletion Log", deletion_log_name)

		# Reconstruct task data from deletion log
		task_data = frappe._dict(
			{
				"name": deletion_log.task_instance_id,
				"task_name": deletion_log.task_name,
				"assigned_to": deletion_log.assigned_to,
				"assignee": deletion_log.assignee,
				"company_id": deletion_log.company_id,
				"due_date": deletion_log.due_date,
				"priority": deletion_log.priority,
				"is_subtask": deletion_log.is_subtask,
			}
		)

		logger.info(f"Sending deletion notification for task {task_data.name} from deletion log")

		# Send email notification
		try:
			send_task_email(task_data, "Deleted")
			logger.info(f"Email deletion notification sent for task {task_data.name}")
		except Exception as e:
			logger.error(f"Error sending email deletion notification: {str(e)}")

		# Send WhatsApp notification
		try:
			from clapgrow_app.api.whatsapp.notification_utils import (
				send_whatsapp_notification_with_settings,
			)

			# Get user data (minimal query)
			user_data = frappe.db.get_value(
				"CG User", task_data.assigned_to, ["full_name", "phone"], as_dict=True
			)

			if user_data and user_data.phone:
				# Get assignee name
				assignee_full_name = "N/A"
				if task_data.assignee:
					try:
						assignee_full_name = (
							frappe.db.get_value("CG User", task_data.assignee, "full_name")
							or task_data.assignee
						)
					except Exception:
						assignee_full_name = task_data.assignee

				# Determine if this is a subtask
				task_type_text = "subtask" if task_data.is_subtask else "task"

				# Format due date
				from clapgrow_app.api.tasks.task_utils import format_due_date

				due_date_str = format_due_date(task_data.due_date)

				# Create message
				message = (
					f"Hello {user_data.full_name}, \n\n"
					f"A {task_type_text} has been deleted on Clapgrow. \n\n"
					f"*Task*: {task_data.task_name} \n"
					f"*Due Date*: {due_date_str} \n"
					f"*Assigned By*: {assignee_full_name} \n"
					f"*Priority*: {task_data.priority or 'Not set'} \n\n"
					f"If you have any questions about this deletion, please contact your administrator."
				)

				# Send via centralized notification system (already async)
				send_whatsapp_notification_with_settings(
					user_data.phone, message, task_data.company_id, "task_deletion"
				)
				logger.info(f"WhatsApp deletion notification sent for task {task_data.name}")
			else:
				logger.info(
					f"No phone number found for user {task_data.assigned_to}, skipping WhatsApp notification"
				)
		except Exception as e:
			logger.error(f"Error sending WhatsApp deletion notification: {str(e)}")

		# Mark as sent in deletion log
		frappe.db.set_value(
			"CG Task Instance Deletion Log",
			deletion_log_name,
			{"notification_sent": 1, "notification_pending": 0},
			update_modified=False,
		)
		frappe.db.commit()

		logger.info(f"Deletion notification processing completed for task {task_data.name}")

	except Exception as e:
		error_msg = f"Error sending deletion notification from log {deletion_log_name}: {str(e)}\n{frappe.get_traceback()}"
		logger.error(error_msg)
		frappe.log_error(message=error_msg, title="Deletion Notification Error")


@frappe.whitelist()
def get_notification_stats():
	"""
	Get statistics about notification processing.
	Useful for monitoring and debugging.

	Returns:
	    dict: Statistics about notifications
	"""
	return TaskNotificationHandler.get_notification_stats()


@frappe.whitelist()
def retry_failed_notifications(hours: int = 24):
	"""
	Retry failed notifications from the last N hours.

	Args:
	    hours: Number of hours to look back (default: 24)

	Returns:
	    dict: Result with retry count
	"""
	try:
		from datetime import timedelta

		cutoff_time = datetime.now() - timedelta(hours=int(hours))

		failed_tasks = frappe.get_all(
			"CG Task Instance",
			filters={
				"notification_status": TaskNotificationHandler.FAILED,
				"notification_sent_on": [">=", cutoff_time],
			},
			fields=["name", "notification_type"],
			limit=100,
		)

		retry_count = 0
		for task in failed_tasks:
			# Reset to pending and schedule for immediate processing
			frappe.db.set_value(
				"CG Task Instance",
				task["name"],
				{
					"notification_status": TaskNotificationHandler.PENDING,
					"notification_scheduled_for": datetime.now(),
				},
				update_modified=False,
			)
			retry_count += 1

		frappe.db.commit()

		logger.info(f"Reset {retry_count} failed notifications to pending")

		return {
			"status": "success",
			"retry_count": retry_count,
			"message": f"Reset {retry_count} failed notifications for retry",
		}

	except Exception as e:
		logger.error(f"Error retrying failed notifications: {str(e)}")
		return {"status": "error", "error": str(e)}

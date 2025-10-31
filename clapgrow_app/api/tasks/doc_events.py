# Copyright (c) 2025, Clapgrow and contributors
# For license information, please see license.txt

"""
Document Event Handlers for CG Task Instance
Handles all lifecycle events (insert, update, trash, cancel) and triggers appropriate notifications.

FILE LOCATION: clapgrow_app/api/tasks/doc_events.py
"""

import logging

import frappe
from frappe import _
from frappe.utils import getdate, nowdate

from clapgrow_app.api.whatsapp.notification_handler import TaskNotificationHandler

logger = logging.getLogger(__name__)


def handle_task_after_insert(doc, method=None):
	"""
	Handle task creation - schedule notification and publish realtime updates.

	Args:
	    doc: CG Task Instance document
	    method: Method name (from hook)
	"""
	try:
		logger.info(f"after_insert triggered for task {doc.name}")

		# Schedule notification for task creation
		_schedule_creation_notification(doc)

		# Publish realtime updates for immediate UI feedback
		_publish_realtime_updates(doc)

	except Exception as e:
		logger.error(f"Error in after_insert for task {doc.name}: {str(e)}")
		frappe.log_error(
			message=f"after_insert error: {str(e)}\n{frappe.get_traceback()}",
			title=f"Task After Insert Error - {doc.name}",
		)


def handle_task_on_update(doc, method=None):
	"""
	Handle task updates - check for status changes, completions, and schedule appropriate notifications.

	Args:
	    doc: CG Task Instance document
	    method: Method name (from hook)
	"""
	try:
		# Get previous version of document
		previous_doc = doc.get_doc_before_save()

		if not previous_doc:
			return

		logger.info(f"on_update triggered for task {doc.name}")

		# Check for completion
		if doc.is_completed == 1 and previous_doc.is_completed == 0:
			_handle_task_completion(doc)

		# Check for reopening
		elif previous_doc.is_completed == 1 and doc.is_completed == 0:
			_handle_task_reopening(doc)

		# Check for status changes
		elif previous_doc.status != doc.status:
			_handle_status_change(doc, previous_doc.status, doc.status)

		# Check for assignment changes
		elif previous_doc.assigned_to != doc.assigned_to:
			_handle_assignment_change(doc, previous_doc.assigned_to)

		# Check for other significant updates
		elif _has_significant_update(doc, previous_doc):
			_handle_generic_update(doc)

		# Publish realtime updates
		_publish_realtime_updates(doc)

	except Exception as e:
		logger.error(f"Error in on_update for task {doc.name}: {str(e)}")
		frappe.log_error(
			message=f"on_update error: {str(e)}\n{frappe.get_traceback()}",
			title=f"Task On Update Error - {doc.name}",
		)


def handle_task_on_trash(doc, method=None):
	"""
	Handle task deletion - mark notification as skipped.

	Args:
	    doc: CG Task Instance document
	    method: Method name (from hook)
	"""
	try:
		logger.info(f"on_trash triggered for task {doc.name}")

		# If notification was pending, mark as skipped
		if hasattr(doc, "notification_status") and doc.notification_status == TaskNotificationHandler.PENDING:
			doc.db_set(
				{
					"notification_status": TaskNotificationHandler.SKIPPED,
					"notification_type": TaskNotificationHandler.DELETED,
					"skip_notification": 1,
				},
				update_modified=False,
			)

			logger.info(f"Marked notification as skipped for deleted task {doc.name}")

		# Optionally send deletion notification to assignee (for audit trail)
		if doc.flags.get("send_deletion_notification"):
			_schedule_deletion_notification(doc)

	except Exception as e:
		logger.error(f"Error in on_trash for task {doc.name}: {str(e)}")


def handle_task_on_cancel(doc, method=None):
	"""
	Handle task cancellation - similar to trash.

	Args:
	    doc: CG Task Instance document
	    method: Method name (from hook)
	"""
	try:
		logger.info(f"on_cancel triggered for task {doc.name}")

		# Mark notification as skipped
		if hasattr(doc, "notification_status"):
			doc.db_set(
				{"notification_status": TaskNotificationHandler.SKIPPED, "skip_notification": 1},
				update_modified=False,
			)

	except Exception as e:
		logger.error(f"Error in on_cancel for task {doc.name}: {str(e)}")


# Private helper functions


def _schedule_creation_notification(doc):
	"""
	Schedule notification for task creation.
	OPTIMIZED: Immediate enqueue for individual tasks, batched for bulk operations.
	"""
	# Determine if this should notify based on task type
	should_notify = True

	if doc.task_type == "Onetime":
		should_notify = True  # Always notify for one-time tasks

	elif doc.task_type == "Recurring":
		# Check if this is bulk creation or if task is due today
		is_bulk_creation = getattr(frappe.local, "bulk_task_creation", False)

		if is_bulk_creation:
			# Always schedule for bulk creation (will be sent at 8 AM)
			should_notify = True
		else:
			# For manual creation, check if due today
			today = getdate(nowdate())
			task_due_date = getdate(doc.due_date) if doc.due_date else None
			should_notify = task_due_date and task_due_date == today

	elif doc.task_type == "Process":
		should_notify = True  # Always notify for process tasks

	elif not getattr(doc, "is_subtask", 0):
		should_notify = True  # Notify for non-subtasks

	else:
		should_notify = False  # Skip for subtasks

	if should_notify:
		# OPTIMIZED: Check if this is a bulk operation
		is_bulk = getattr(frappe.local, "bulk_task_creation", False)

		if is_bulk:
			# Bulk operation: Schedule for cron processing (prevents queue overload)
			logger.info(f"Bulk mode: Scheduling notification for task {doc.name} (will be processed by cron)")
			TaskNotificationHandler.schedule_notification(doc, TaskNotificationHandler.CREATED)
		else:
			# Individual operation: Send immediately (better UX)
			logger.info(f"Individual mode: Immediately enqueueing notification for task {doc.name}")
			_send_immediate_notification(doc, TaskNotificationHandler.CREATED)
	else:
		# Mark as skipped
		doc.flags.skip_notification = True
		TaskNotificationHandler.schedule_notification(doc, TaskNotificationHandler.CREATED)


def _send_immediate_notification(doc, notification_type):
	"""
	Send notification immediately for individual task operations.
	Enqueues directly to background worker without waiting for cron.

	Args:
	    doc: Task document
	    notification_type: Type of notification (Created, Updated, etc.)
	"""
	try:
		# Mark as pending and enqueue immediately (notification will be sent via background job)
		doc.db_set(
			{
				"notification_status": TaskNotificationHandler.PENDING,
				"notification_type": notification_type,
				"skip_notification": 0,
			},
			update_modified=False,
		)

		# Immediately enqueue to background worker
		frappe.enqueue(
			"clapgrow_app.api.whatsapp.notification_processor.send_task_notification",
			task_name=doc.name,
			notification_type=notification_type,
			queue="short",
			timeout=300,
			is_async=True,
			now=False,  # Add to queue, don't block
		)

		logger.info(f"Immediately enqueued notification for task {doc.name} (type: {notification_type})")

	except Exception as e:
		logger.error(f"Error enqueueing immediate notification for task {doc.name}: {str(e)}")
		# Fallback to scheduled notification
		TaskNotificationHandler.schedule_notification(doc, notification_type)


def _handle_task_completion(doc):
	"""Handle task completion - send notification."""
	logger.info(f"Task {doc.name} marked as completed")

	# OPTIMIZED: Check if bulk operation
	is_bulk = getattr(frappe.local, "bulk_task_creation", False)

	if is_bulk:
		# Bulk: Schedule for cron
		TaskNotificationHandler.schedule_notification(doc, TaskNotificationHandler.COMPLETED)
	else:
		# Individual: Send immediately
		_send_immediate_notification(doc, TaskNotificationHandler.COMPLETED)


def _handle_task_reopening(doc):
	"""Handle task reopening - send notification."""
	logger.info(f"Task {doc.name} reopened")

	# OPTIMIZED: Check if bulk operation
	is_bulk = getattr(frappe.local, "bulk_task_creation", False)

	if is_bulk:
		# Bulk: Schedule for cron
		TaskNotificationHandler.schedule_notification(doc, TaskNotificationHandler.REOPENED)
	else:
		# Individual: Send immediately
		_send_immediate_notification(doc, TaskNotificationHandler.REOPENED)


def _handle_status_change(doc, previous_status, new_status):
	"""Handle status change - send appropriate notification."""
	logger.info(f"Task {doc.name} status changed from {previous_status} to {new_status}")

	# Determine notification type based on status
	notification_type = TaskNotificationHandler.UPDATED

	if new_status == "Rejected":
		notification_type = TaskNotificationHandler.REJECTED
	elif new_status == "Paused":
		notification_type = TaskNotificationHandler.PAUSED
	elif previous_status == "Paused" and new_status != "Completed":
		notification_type = TaskNotificationHandler.RESUMED

	# OPTIMIZED: Check if bulk operation
	is_bulk = getattr(frappe.local, "bulk_task_creation", False)

	if is_bulk:
		TaskNotificationHandler.schedule_notification(doc, notification_type)
	else:
		_send_immediate_notification(doc, notification_type)


def _handle_assignment_change(doc, previous_assigned_to):
	"""Handle assignment change - send notification."""
	logger.info(f"Task {doc.name} reassigned from {previous_assigned_to} to {doc.assigned_to}")

	# OPTIMIZED: Check if bulk operation
	is_bulk = getattr(frappe.local, "bulk_task_creation", False)

	if is_bulk:
		TaskNotificationHandler.schedule_notification(doc, TaskNotificationHandler.ASSIGNED)
	else:
		_send_immediate_notification(doc, TaskNotificationHandler.ASSIGNED)


def _handle_generic_update(doc):
	"""Handle generic updates - send notification."""
	logger.info(f"Task {doc.name} updated")

	# Only notify for significant updates, not every save
	# Check if notification is needed
	if doc.flags.get("notify_on_update"):
		# OPTIMIZED: Check if bulk operation
		is_bulk = getattr(frappe.local, "bulk_task_creation", False)

		if is_bulk:
			TaskNotificationHandler.schedule_notification(doc, TaskNotificationHandler.UPDATED)
		else:
			_send_immediate_notification(doc, TaskNotificationHandler.UPDATED)


def _has_significant_update(doc, previous_doc):
	"""
	Check if the update is significant enough to warrant a notification.

	Args:
	    doc: Current document
	    previous_doc: Previous version of document

	Returns:
	    bool: True if significant update
	"""
	# Define fields that trigger notifications when changed
	significant_fields = [
		"task_name",
		"description",
		"due_date",
		"priority",
		"checker",
	]

	for field in significant_fields:
		if doc.get(field) != previous_doc.get(field):
			return True

	return False


def _schedule_deletion_notification(doc):
	"""Schedule deletion notification (optional, for audit purposes)."""
	# This is optional - you can enable it by setting flag before deletion
	TaskNotificationHandler.schedule_notification(doc, TaskNotificationHandler.DELETED)


def _publish_realtime_updates(doc):
	"""
	Publish realtime updates for UI (lightweight synchronous operation).
	This provides immediate feedback without waiting for notifications.
	"""
	try:
		users_to_notify = [doc.assigned_to, doc.assignee]

		# Add team members for recurring tasks with team lead
		if doc.task_type == "Recurring" and doc.assigned_to:
			user_role = frappe.get_value("CG User", {"email": doc.assigned_to}, "role")
			if user_role == "ROLE-Team Lead":
				teams = frappe.get_all("CG Team", filters={"team_lead": doc.assigned_to}, fields=["name"])
				for team in teams:
					members = frappe.get_all(
						"CG Team Member",
						filters={"parent": team.name},
						fields=["member"],
					)
					users_to_notify.extend([member.member for member in members])

		# Remove duplicates and None values
		users_to_notify = list(set(filter(None, users_to_notify)))

		for user in users_to_notify:
			frappe.publish_realtime(
				event="custom_task_inserted",
				message={
					"task_name": doc.name,
					"task_title": doc.task_name,
					"creation_time": doc.creation if hasattr(doc, "creation") else None,
					"company_id": doc.company_id,
					"assigned_to": doc.assigned_to,
				},
				user=user,
			)

			frappe.publish_realtime(
				event="report_updated",
				message={"report_name": "Total Task Status Report"},
				user=user,
			)

	except Exception as e:
		logger.error(f"Error publishing realtime updates for task {doc.name}: {str(e)}")

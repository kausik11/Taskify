# Copyright (c) 2025, Clapgrow and contributors
# For license information, please see license.txt

from datetime import datetime

import frappe
from frappe import _
from frappe.utils.background_jobs import enqueue

from clapgrow_app.api.tasks.task_utils import get_cg_user
from clapgrow_app.api.whatsapp.notification_utils import send_email_notification_with_settings


def send_task_email(task_doc, method, old_recurrence_name=None, new_recurrence_name=None):
	"""
	Send an email to the assigned_to user when a task is created, updated, deleted, reminded, or recurrence type changes.

	Args:
	    task_doc: CG Task Instance document
	    method (str): The method of the event (Created, Completed, Reopened, Deleted, Reminder, Recurrence Changed, etc.).
	    old_recurrence_name (str, optional): Name of the previous recurrence type.
	    new_recurrence_name (str, optional): Name of the new recurrence type.
	"""
	if not task_doc.assigned_to:
		frappe.logger().info("No assigned_to set for the task, skipping email.")
		return

	try:
		user = get_cg_user(task_doc.assigned_to)
		if not user or not user.get("email"):
			frappe.logger().info(
				f"User not found or email not set for assigned_to: {task_doc.assigned_to}, skipping email."
			)
			return

		recipient = user["email"]
		first_name = user.get("first_name", "User")

		# Fetch the image URL from File doctype
		file = frappe.get_all(
			"File",
			filters={"file_name": "clapgrow_email_cover.jpg"},
			fields=["file_url"],
		)
		image_url = file[0].file_url if file else "/files/clapgrow_email_cover.jpg"

		completed_by_full_name = "N/A"
		if task_doc.completed_by:
			completed_by_user = frappe.get_doc("CG User", task_doc.completed_by)
			completed_by_full_name = completed_by_user.full_name if completed_by_user else "N/A"

		# Fetch the assigner's full name
		assigner_full_name = "N/A"
		if task_doc.owner:
			assigner_user = frappe.get_doc("CG User", task_doc.assigned_to)
			assigner_full_name = assigner_user.full_name if assigner_user else "N/A"

		# Initialize variables
		subject = ""
		message_content = ""

		# Add subtask indicator if this is a subtask
		task_type_indicator = " (Subtask)" if getattr(task_doc, "is_subtask", 0) else ""

		task_details = f"""
		<ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 22px; color: #202124;">
			<li><strong>📌 Task</strong>: {task_doc.task_name}{task_type_indicator}</li>
			<li><strong>📝 Details</strong>: {task_doc.description or "N/A"}</li>
			<li><strong>📅 Due Date</strong>: {task_doc.due_date}</li>
			<li><strong>👤 Assigned By</strong>: {assigner_full_name}</li>
		</ul>
		"""

		# Add parent task info if this is a subtask
		if getattr(task_doc, "is_subtask", 0) and task_doc.parent_task_instance:
			try:
				parent_task = frappe.get_doc("CG Task Instance", task_doc.parent_task_instance)
				task_details += f"""
				<ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 22px; color: #202124;">
					<li><strong>🔗 Parent Task</strong>: {parent_task.task_name}</li>
				</ul>
				"""
			except Exception:
				pass

		# Determine email content based on method
		notification_type = "task_assigned"  # Default

		if method == "Created":
			notification_type = "task_assigned"
			if hasattr(task_doc, "recurrence") and task_doc.recurrence:
				subject = "🚀 New Scheduled Task Assigned on Clapgrow"
				message_content = (
					f"<p style='margin: 0 0 16px; font-size: 14px; line-height: 22px; color: #202124;'>"
					f"You have been assigned a new scheduled task on Clapgrow! Please find the details below:"
					f"</p>"
					f"<ul style='margin: 0; padding-left: 20px; font-size: 14px; line-height: 22px; color: #202124;'>"
					f"<li><strong>🔄 Frequency</strong>: {task_doc.recurrence}</li>"
					f"</ul>"
				)
			else:
				task_type_text = "subtask" if getattr(task_doc, "is_subtask", 0) else "task"
				subject = f"🚀 New {task_type_text.title()} Assigned on Clapgrow"
				message_content = (
					f"<p style='margin: 0 0 16px; font-size: 14px; line-height: 22px; color: #202124;'>"
					f"You have been assigned a new {task_type_text} on Clapgrow! Please find the details below:"
					f"</p>"
				)
		elif method == "Completed":
			notification_type = "task_completion"
			task_type_text = "subtask" if getattr(task_doc, "is_subtask", 0) else "task"
			subject = f"🎉 {task_type_text.title()} Marked as Done on Clapgrow"
			completion_date = datetime.now().strftime("%Y-%m-%d")
			completion_comment = getattr(task_doc, "completion_comment", "N/A")
			message_content = (
				f"<p style='margin: 0 0 16px; font-size: 14px; line-height: 22px; color: #202124;'>"
				f"The {task_type_text} you assigned has been successfully completed on Clapgrow! 🎉 Please find the details below:"
				f"</p>"
			)
			task_details = f"""
			<ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 22px; color: #202124;">
				<li><strong>📌 Task</strong>: {task_doc.task_name}{task_type_indicator}</li>
				<li><strong>✅ Completed By</strong>: {completed_by_full_name}</li>
				<li><strong>📅 Completed On</strong>: {completion_date}</li>
				<li><strong>💬 Comment</strong>: {completion_comment}</li>
			</ul>
			"""
		elif method == "Completed from Paused":
			notification_type = "task_completion"
			task_type_text = "subtask" if getattr(task_doc, "is_subtask", 0) else "task"
			subject = f"🎉 Paused {task_type_text.title()} Completed with Adjusted Due Date on Clapgrow"
			completion_date = datetime.now().strftime("%Y-%m-%d")
			message_content = (
				f"<p style='margin: 0 0 16px; font-size: 14px; line-height: 22px; color: #202124;'>"
				f"A paused {task_type_text} has been successfully completed on Clapgrow! 🎉 The due date was automatically adjusted to account for the pause period. Please find the details below:"
				f"</p>"
			)
			task_details = f"""
			<ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 22px; color: #202124;">
				<li><strong>📌 Task</strong>: {task_doc.task_name}{task_type_indicator}</li>
				<li><strong>✅ Completed By</strong>: {completed_by_full_name}</li>
				<li><strong>📅 Completed On</strong>: {completion_date}</li>
				<li><strong>⏰ Adjusted Due Date</strong>: {task_doc.due_date}</li>
				<li><strong>ℹ️ Note</strong>: Due date was automatically extended to account for pause time</li>
			</ul>
			"""
		elif method == "Reopened":
			notification_type = "task_reopened"
			task_type_text = "subtask" if getattr(task_doc, "is_subtask", 0) else "task"
			subject = f"🔄 {task_type_text.title()} Reopened - {task_doc.task_name}"
			message_content = (
				f"<p style='margin: 0 0 16px; font-size: 14px; line-height: 22px; color: #202124;'>"
				f"<strong>{task_doc.task_name}</strong> has been reopened. Below are the updated details of the {task_type_text}:"
				f"</p>"
			)
		elif method == "Updated":
			notification_type = "task_update"
			task_type_text = "subtask" if getattr(task_doc, "is_subtask", 0) else "task"
			subject = f"📝 {task_type_text.title()} Updated - {task_doc.task_name}"
			message_content = (
				f"<p style='margin: 0 0 16px; font-size: 14px; line-height: 22px; color: #202124;'>"
				f"<strong>{task_doc.task_name}</strong> has been updated. Below are the current details of the {task_type_text}:"
				f"</p>"
			)
		elif method == "Reminder":
			notification_type = "default_reminder"
			task_type_text = "subtask" if getattr(task_doc, "is_subtask", 0) else "task"
			subject = f"⏰ Reminder: {task_type_text.title()} Due - {task_doc.task_name}"
			message_content = (
				f"<p style='margin: 0 0 16px; font-size: 14px; line-height: 22px; color: #202124;'>"
				f"This is a reminder for your upcoming {task_type_text} <strong>{task_doc.task_name}</strong>. "
				f"Please ensure it is completed by the due date."
				f"</p>"
			)
		elif method == "Recurrence Changed":
			notification_type = "task_update"
			subject = f"🔄 Recurrence Changed - {task_doc.task_name}"
			message_content = (
				f"<p style='margin: 0 0 16px; font-size: 14px; line-height: 22px; color: #202124;'>"
				f"The recurrence type for <strong>{task_doc.task_name}</strong> has been changed from "
				f"<strong>{old_recurrence_name}</strong> to <strong>{new_recurrence_name}</strong>. "
				f"Below are the updated details of the task:"
				f"</p>"
			)
		elif method == "Paused":
			notification_type = "task_paused"
			task_type_text = "subtask" if getattr(task_doc, "is_subtask", 0) else "task"
			subject = f"⏸️ {task_type_text.title()} Paused - {task_doc.task_name}"
			message_content = (
				f"<p style='margin: 0 0 16px; font-size: 14px; line-height: 22px; color: #202124;'>"
				f"<strong>{task_doc.task_name}</strong> has been paused. The {task_type_text} can still be completed directly, and the due date will be automatically adjusted when completed."
				f"</p>"
			)
		elif method == "Rejected":
			notification_type = "task_rejected"
			task_type_text = "subtask" if getattr(task_doc, "is_subtask", 0) else "task"
			subject = f"❌ {task_type_text.title()} Rejected - {task_doc.task_name}"
			message_content = (
				f"<p style='margin: 0 0 16px; font-size: 14px; line-height: 22px; color: #202124;'>"
				f"<strong>{task_doc.task_name}</strong> has been rejected. Please contact your administrator for more information."
				f"</p>"
			)
		elif method == "Deleted":
			notification_type = "task_deletion"
			task_type_text = "subtask" if getattr(task_doc, "is_subtask", 0) else "task"
			subject = f"🗑️ {task_type_text.title()} Deleted - {task_doc.task_name}"
			message_content = (
				f"<p style='margin: 0 0 16px; font-size: 14px; line-height: 22px; color: #202124;'>"
				f"<strong>{task_doc.task_name}</strong> has been deleted. Here are the details of the {task_type_text} before it was deleted:"
				f"</p>"
			)
		elif method == "All Subtasks Completed":
			notification_type = "subtask_completed"
			subject = f"✅ All Subtasks Completed - {task_doc.task_name}"
			message_content = (
				f"<p style='margin: 0 0 16px; font-size: 14px; line-height: 22px; color: #202124;'>"
				f"All subtasks for <strong>{task_doc.task_name}</strong> have been completed! You can now mark the main task as completed if ready."
				f"</p>"
			)
		else:
			frappe.logger().warning(f"Unknown email method: {method} for task {task_doc.name}")
			return

		# HTML email template
		message = f"""
		<html>
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
		</head>
		<body style="margin: 0; padding: 0; font-family: 'Roboto', Arial, sans-serif; color: #202124; background-color: #f9f9f9;">
			<table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #dadce0; border-radius: 8px;">
				<tr>
					<td style="padding: 24px 24px 24px 24px; background-image: url('{image_url}'); background-size: cover; background-position: top center; background-repeat: no-repeat;">
						<div style="padding-top: 25px;">
							<h1 style="font-size: 16px; font-weight: 500; margin: 0 0 16px; color: #202124;">{subject}</h1>
							<p style="margin: 0 0 16px; font-size: 14px; line-height: 22px; color: #202124;">
								Dear {first_name},
							</p>
							{message_content}
							{task_details}
							<p style="margin: 16px 0; font-size: 14px; line-height: 22px; color: #202124;">
								{"Feel free to review the task or provide feedback if needed. Let us know if you have any questions!" if method == "Completed" else "Please review the task details and get started at the earliest. If you have any questions, feel free to reach out."}
							</p>
							<p style="margin: 16px 0; font-size: 14px; line-height: 22px; color: #202124;">
								If you have any questions or need assistance, please reach out to <a href="mailto:techtools@clapgrow.com" style="color: #1a73e8; text-decoration: none;">techtools@clapgrow.com</a>.
							</p>
							<p style="margin: 24px 0 0; font-size: 14px; line-height: 22px; color: #202124;">
								Best regards,<br>
								<strong>Clapgrow Team</strong>
							</p>
						</div>
					</td>
				</tr>
			</table>
		</body>
		</html>
		"""

		# Email arguments
		email_args = {
			"recipients": [recipient],
			"subject": subject,
			"message": message,
			"header": [subject, "blue"],
		}

		# Send email using centralized notification system
		frappe.logger().info(f"Enqueueing {method} email for task {task_doc.name} to {recipient}")
		send_email_notification_with_settings(email_args, task_doc.company_id, notification_type)

	except Exception as e:
		frappe.log_error(
			message=f"Failed to send task email for task {task_doc.name}, method {method}: {str(e)}",
			title="Task Email Error",
		)


def send_bulk_deletion_email(task_doc, reason, count, old_value=None, new_value=None):
	"""
	Send a single consolidated email for bulk task deletions.

	Args:
		task_doc: CG Task Instance document
		reason (str): Reason for bulk deletion ("Task Name Changed" or "Recurrence Changed")
		count (int): Number of tasks deleted
		old_value (str): Previous value (task name or recurrence type)
		new_value (str): New value (task name or recurrence type)
	"""
	if not task_doc.assigned_to:
		frappe.logger().info("No assigned_to set for the task, skipping bulk deletion email.")
		return

	try:
		user = get_cg_user(task_doc.assigned_to)
		if not user or not user.get("email"):
			frappe.logger().info(
				f"User not found or email not set for assigned_to: {task_doc.assigned_to}, skipping email."
			)
			return

		recipient = user["email"]
		first_name = user.get("first_name", "User")

		# Fetch the image URL from File doctype
		file = frappe.get_all(
			"File",
			filters={"file_name": "clapgrow_email_cover.jpg"},
			fields=["file_url"],
		)
		image_url = file[0].file_url if file else "/files/clapgrow_email_cover.jpg"

		if reason == "Task Name Changed":
			subject = f"🔄 Recurring Task Updated - {new_value}"
			message_content = (
				f"<p style='margin: 0 0 16px; font-size: 14px; line-height: 22px; color: #202124;'>"
				f"The task name for your recurring task has been changed from <strong>{old_value}</strong> to <strong>{new_value}</strong>."
				f"</p>"
				f"<p style='margin: 0 0 16px; font-size: 14px; line-height: 22px; color: #202124;'>"
				f"As a result, <strong>{count} future task instance(s)</strong> have been removed and will be regenerated with the new task name."
				f"</p>"
			)
		elif reason == "Recurrence Changed":
			subject = f"🔄 Task Recurrence Updated - {task_doc.task_name}"
			message_content = (
				f"<p style='margin: 0 0 16px; font-size: 14px; line-height: 22px; color: #202124;'>"
				f"The recurrence pattern for <strong>{task_doc.task_name}</strong> has been changed from <strong>{old_value}</strong> to <strong>{new_value}</strong>."
				f"</p>"
				f"<p style='margin: 0 0 16px; font-size: 14px; line-height: 22px; color: #202124;'>"
				f"As a result, <strong>{count} future task instance(s)</strong> have been removed and will be regenerated with the new recurrence pattern."
				f"</p>"
			)
		else:
			subject = f"🔄 Tasks Updated - {task_doc.task_name}"
			message_content = (
				f"<p style='margin: 0 0 16px; font-size: 14px; line-height: 22px; color: #202124;'>"
				f"<strong>{count} task instance(s)</strong> have been updated for <strong>{task_doc.task_name}</strong>."
				f"</p>"
			)

		# HTML email template
		message = f"""
		<html>
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
		</head>
		<body style="margin: 0; padding: 0; font-family: 'Roboto', Arial, sans-serif; color: #202124; background-color: #f9f9f9;">
			<table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #dadce0; border-radius: 8px;">
				<tr>
					<td style="padding: 24px 24px 24px 24px; background-image: url('{image_url}'); background-size: cover; background-position: top center; background-repeat: no-repeat;">
						<div style="padding-top: 25px;">
							<h1 style="font-size: 16px; font-weight: 500; margin: 0 0 16px; color: #202124;">{subject}</h1>
							<p style="margin: 0 0 16px; font-size: 14px; line-height: 22px; color: #202124;">
								Dear {first_name},
							</p>
							{message_content}
							<p style="margin: 16px 0; font-size: 14px; line-height: 22px; color: #202124;">
								The system will automatically generate new task instances based on the updated settings.
								Please check your task list for the updated schedule.
							</p>
							<p style="margin: 16px 0; font-size: 14px; line-height: 22px; color: #202124;">
								If you have any questions or need assistance, please reach out to <a href="mailto:techtools@clapgrow.com" style="color: #1a73e8; text-decoration: none;">techtools@clapgrow.com</a>.
							</p>
							<p style="margin: 24px 0 0; font-size: 14px; line-height: 22px; color: #202124;">
								Best regards,<br>
								<strong>Clapgrow Team</strong>
							</p>
						</div>
					</td>
				</tr>
			</table>
		</body>
		</html>
		"""

		# Email arguments
		email_args = {
			"recipients": [recipient],
			"subject": subject,
			"message": message,
			"header": [subject, "blue"],
		}

		# Send email using centralized notification system
		send_email_notification_with_settings(email_args, task_doc.company_id, "task_update")
		frappe.logger().info(f"Sent bulk deletion email for {count} tasks, reason: {reason}")

	except Exception as e:
		frappe.log_error(
			message=f"Failed to send bulk deletion email for task {task_doc.name}, reason {reason}: {str(e)}",
			title="Bulk Task Email Error",
		)

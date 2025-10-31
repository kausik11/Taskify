from datetime import datetime

import frappe
import requests
from frappe import _

from clapgrow_app.api.whatsapp.notification_utils import (
	send_whatsapp_notification_with_settings,
	should_send_notification,
)


def send_task_created_whatsapp(task):
	"""Send WhatsApp notification when a task is created."""
	if not should_send_notification(task.company_id, "task_assigned", "whatsapp"):
		return

	try:
		assigned_user = frappe.get_doc("CG User", task.assigned_to)
		if not assigned_user or not assigned_user.phone:
			return

		assignee = get_full_name(task.assignee)
		plain_description = html_to_text(task.description)

		due_date_str = (
			task.due_date.strftime("%d-%m-%Y") + " at " + task.due_date.strftime("%H:%M:%S")
			if task.due_date
			else "Not specified"
		)

		base_url = frappe.utils.get_url()
		greeting = f"Hello {assigned_user.full_name} 🚀,\n"

		if task.task_type == "Onetime" and not task.is_help_ticket:
			notification = (
				f"{greeting}"
				"You've been assigned a new task on Clapgrow!\n\n"
				f"*Task*: {task.task_name}\n"
				f"*Open task*: {base_url}/clapgrow/task/{task.name}\n"
				f"*Details*: {plain_description}\n"
				f"*Due Date*: {due_date_str}\n"
				f"*Assigned By*: {assignee}\n\n"
				"Please ensure to review the task details and get started on it promptly."
			)
		elif task.task_type == "Onetime" and task.is_help_ticket:
			notification = (
				f"{greeting}"
				"Your team member needs your help!\n\n"
				f"*Open task*: {base_url}/clapgrow/task/{task.name}\n"
				f"*Subject*: {task.task_name}\n"
				f"*Details*: {plain_description}\n"
				f"*Due Date*: {due_date_str}\n"
				f"*Assigned By*: {assignee}\n\n"
				"Please ensure to comment back and help!"
			)
		elif task.task_type == "Recurring":
			frequency = "Not specified"
			if task.recurrence_type_id:
				definition = frappe.get_doc("CG Task Definition", task.task_definition_id)
				frequency = (
					definition.recurrence_type_id[0].frequency
					if definition.recurrence_type_id
					else "Not specified"
				)

			notification = (
				f"{greeting}"
				"You've been assigned a new recurring task on Clapgrow!\n\n"
				f"*Open task*: {base_url}/clapgrow/task/{task.name}\n"
				f"*Task*: {task.task_name}\n"
				f"*Details*: {plain_description}\n"
				f"*Due Date*: {due_date_str}\n"
				f"*Frequency*: {frequency}\n"
				f"*Assigned By*: {assignee}\n\n"
				"Please ensure to review the task details and get started on it promptly."
			)
		elif task.task_type == "Process":
			notification = (
				f"{greeting}"
				"You've been assigned a new process task on Clapgrow!\n\n"
				f"*Process*: {task.task_name}\n"
				f"*Open task*: {base_url}/clapgrow/process/{task.name}\n"
				f"*Details*: {plain_description}\n"
				f"*Due Date*: {due_date_str}\n"
				f"*Assigned By*: {assignee}\n\n"
				"Please go through the process steps and ensure completion as per the guidelines."
			)
		else:
			return

		send_whatsapp_notification_with_settings(
			assigned_user.phone, notification, task.company_id, "task_assigned"
		)

	except Exception as e:
		frappe.log_error(
			message=f"Failed to send WhatsApp notification for task {task.name}: {str(e)}",
			title="Task WhatsApp Notification Error",
		)


def send_task_completed_whatsapp(task):
	"""Send WhatsApp notification when a task is completed."""
	notification_type = (
		"recurring_task_completion" if task.task_type == "Recurring" else "onetime_task_completion"
	)

	if not should_send_notification(task.company_id, notification_type, "whatsapp"):
		return

	try:
		user = frappe.get_doc("CG User", task.assignee)
		if not user or not user.phone:
			return

		completed_by = get_full_name(task.completed_by)

		# Get last comment
		comment_count = frappe.db.count(
			"Comment",
			filters={
				"reference_doctype": task.doctype,
				"reference_name": task.name,
				"comment_type": "Comment",
				"comment_email": task.completed_by,
			},
		)

		comment = "No comments"
		if comment_count > 0:
			comment_doc = frappe.get_last_doc(
				"Comment",
				filters={
					"reference_doctype": task.doctype,
					"reference_name": task.name,
					"comment_type": "Comment",
					"comment_email": task.completed_by,
				},
				order_by="creation desc",
			)
			comment = comment_doc.content if comment_doc else "No comments"

		if (task.task_type == "Onetime" and task.is_help_ticket == 0) or task.task_type == "Recurring":
			message = (
				f"Hello {user.full_name}, \n\n"
				f"Task assigned by you has been marked as done on Clapgrow! 🎉 \n\n"
				f"*Task:* {task.task_name}\n"
				f"*Completed By:* {completed_by}\n"
				f"*Completed On*: {task.completed_on.strftime('%d-%m-%Y')} at {task.completed_on.strftime('%H:%M:%S')}\n"
				f"*Comment*: {comment}\n\n"
				f"Feel free to review the task or provide feedback if needed"
			)
		else:
			message = (
				f"Hello {user.full_name}, \n\n"
				f"{completed_by} has marked ticket as resolved. \n\n"
				f"*Subject:* {task.task_name}\n"
				f"*Ticket Details:* {html_to_text(task.description)}\n"
				f"*Comment*: {comment}"
			)

		send_whatsapp_notification_with_settings(user.phone, message, task.company_id, notification_type)

	except Exception as e:
		frappe.log_error(
			message=f"Failed to send task completion WhatsApp for task {task.name}: {str(e)}",
			title="Task Completion WhatsApp Error",
		)


def send_task_status_change_whatsapp(task, method, previous_status=None):
	"""Send WhatsApp notification for task status changes."""
	if not should_send_notification(task.company_id, "task_update", "whatsapp"):
		return

	try:
		assigned_user = frappe.get_doc("CG User", task.assigned_to)
		if not assigned_user or not assigned_user.phone:
			return

		assignee_user = frappe.get_doc("CG User", task.assignee)
		assignee_full_name = assignee_user.full_name if assignee_user else "N/A"

		base_url = frappe.utils.get_url()
		task_link = f"{base_url}/clapgrow/task/{task.name}"
		task_type_indicator = " (Subtask)" if getattr(task, "is_subtask", 0) else ""

		if method == "Paused":
			message = (
				f"Hello {assigned_user.full_name}, \n\n"
				f"Your task{task_type_indicator} on Clapgrow has been paused. \n\n"
				f"*Task*: {task.task_name} \n"
				f"*Open task*: {task_link}\n"
				f"*Status*: Paused \n"
				f"*Due Date*: {task.due_date} \n"
				f"*Assigned By*: {assignee_full_name} \n\n"
				f"You can still complete this task directly, and the due date will be automatically adjusted."
			)
		elif method == "Rejected":
			message = (
				f"Hello {assigned_user.full_name}, \n\n"
				f"Your task{task_type_indicator} on Clapgrow has been rejected. \n\n"
				f"*Task*: {task.task_name} \n"
				f"*Open task*: {task_link}\n"
				f"*Status*: Rejected \n"
				f"*Due Date*: {task.due_date} \n"
				f"*Assigned By*: {assignee_full_name} \n\n"
				f"Please contact your administrator for more information."
			)
		elif method == "Reopened":
			message = (
				f"Hello {assigned_user.full_name}, \n\n"
				f"Your task{task_type_indicator} on Clapgrow has been reopened. \n\n"
				f"*Task*: {task.task_name} \n"
				f"*Open task*: {task_link}\n"
				f"*Previous Status*: {previous_status} \n"
				f"*Current Status*: {task.status} \n"
				f"*Due Date*: {task.due_date} \n"
				f"*Assigned By*: {assignee_full_name} \n\n"
				f"Please review the task and complete it as required."
			)
		else:
			return

		send_whatsapp_notification_with_settings(assigned_user.phone, message, task.company_id, "task_update")

	except Exception as e:
		frappe.log_error(
			message=f"Failed to send status change WhatsApp for task {task.name}: {str(e)}",
			title="Task Status WhatsApp Error",
		)


def send_task_deletion_whatsapp(task):
	"""Send WhatsApp notification when a task is deleted.
	FIXED: Now fully asynchronous using enqueue pattern.
	"""
	if not should_send_notification(task.company_id, "task_deletion", "whatsapp"):
		return

	try:
		assigned_user = frappe.get_doc("CG User", task.assigned_to)
		if not assigned_user or not assigned_user.phone:
			return

		assignee_full_name = "N/A"
		try:
			assignee_user = frappe.get_doc("CG User", task.assignee)
			assignee_full_name = assignee_user.full_name if assignee_user else "N/A"
		except Exception:
			pass

		task_type_indicator = " (Subtask)" if getattr(task, "is_subtask", 0) else "task"

		message = (
			f"Hello {assigned_user.full_name}, \n\n"
			f"A {task_type_indicator} assigned to you has been deleted from Clapgrow. \n\n"
			f"*Task*: {task.task_name} \n"
			f"*Details*: {task.description or 'No description provided'} \n"
			f"*Due Date*: {task.due_date} \n"
			f"*Priority*: {task.priority} \n"
			f"*Assigned By*: {assignee_full_name} \n\n"
			f"If you have any questions about this deletion, please contact your administrator."
		)

		# FIXED: Use async enqueue instead of direct HTTP call
		enqueue_send_whatsapp_notification(
			phone_number=assigned_user.phone, notification=message, company_id=task.company_id
		)

	except Exception as e:
		frappe.log_error(
			message=f"Failed to send deletion WhatsApp for task {task.name}: {str(e)}",
			title="Task Deletion WhatsApp Error",
		)


def send_task_comment_whatsapp(task, comment_content, commenting_user_full_name):
	"""Send WhatsApp notification when a comment is added to a task."""
	if not should_send_notification(task.company_id, "task_comment", "whatsapp"):
		return

	try:
		assigned_user = frappe.get_doc("User", task.assigned_to)
		if not assigned_user or not assigned_user.mobile_no:
			return

		task_type_text = "subtask" if getattr(task, "is_subtask", 0) else "task"

		if task.task_type == "Onetime" and task.is_help_ticket == 0:
			message = (
				f"Hello {assigned_user.full_name}, \n\n"
				f"A new comment has been added to your {task_type_text} on Clapgrow. \n\n"
				f"*Task*: {task.task_name} \n"
				f"*Comment*: {comment_content} \n"
				f"*Commented By*: {commenting_user_full_name} \n\n"
				f"Please review the comment and make any necessary updates to your {task_type_text}."
			)
		elif task.task_type == "Recurring":
			message = (
				f"Hello {assigned_user.full_name}, \n\n"
				f"A new comment has been added to your recurring task on Clapgrow. \n\n"
				f"*Task*: {task.task_name} \n"
				f"*Comment*: {comment_content} \n"
				f"*Commented By*: {commenting_user_full_name} \n\n"
				f"Please review the comment and make any necessary updates to your task."
			)
		elif task.task_type == "Onetime" and task.is_help_ticket == 1:
			message = (
				f"Hello {assigned_user.full_name}, \n\n"
				f"{commenting_user_full_name} has commented on a help ticket.\n\n"
				f"*Ticket ID*: {task.name} \n"
				f"*Subject*: {task.task_name} \n"
				f"*Ticket Details*: {task.description or 'No description provided'} \n"
				f"*Comments*: {comment_content} \n"
				f"*Commented At*: {datetime.now().replace(microsecond=0)}"
			)
		else:
			return

		send_whatsapp_notification_with_settings(
			assigned_user.mobile_no, message, task.company_id, "task_comment"
		)

	except Exception as e:
		frappe.log_error(
			message=f"Failed to send comment WhatsApp for task {task.name}: {str(e)}",
			title="Task Comment WhatsApp Error",
		)


def send_subtask_completion_whatsapp(parent_task, subtask_name, remaining_count):
	"""Send WhatsApp notification when subtasks are completed."""
	try:
		# Notify assignee
		assignee_user = frappe.get_doc("CG User", parent_task.assignee)
		if assignee_user and assignee_user.phone:
			if remaining_count == 0:
				message = (
					f"Hello {assignee_user.full_name}, \n\n"
					f"All subtasks for your task '{parent_task.task_name}' have been completed! \n\n"
					f"You can now mark the main task as completed if ready. \n\n"
					f"Task: {parent_task.task_name} \n"
					f"Due Date: {parent_task.due_date}"
				)
			else:
				message = (
					f"Hello {assignee_user.full_name}, \n\n"
					f"Subtask '{subtask_name}' has been completed. \n"
					f"{remaining_count} subtask(s) remaining for '{parent_task.task_name}'."
				)

			enqueue_send_whatsapp_notification(
				phone_number=assignee_user.phone,
				notification=message,
				company_id=parent_task.company_id,
			)

		# Notify assigned_to if different
		if parent_task.assigned_to != parent_task.assignee:
			assigned_to_user = frappe.get_doc("CG User", parent_task.assigned_to)
			if assigned_to_user and assigned_to_user.phone:
				if remaining_count == 0:
					message = (
						f"Hello {assigned_to_user.full_name}, \n\n"
						f"All subtasks for task '{parent_task.task_name}' have been completed! \n\n"
						f"The main task can now be marked as completed. \n\n"
						f"Task: {parent_task.task_name} \n"
						f"Due Date: {parent_task.due_date}"
					)

					enqueue_send_whatsapp_notification(
						phone_number=assigned_to_user.phone,
						notification=message,
						company_id=parent_task.company_id,
					)

	except Exception as e:
		frappe.log_error(
			message=f"Failed to send subtask completion WhatsApp: {str(e)}",
			title="Subtask WhatsApp Error",
		)


def enqueue_send_whatsapp_notification(phone_number, notification, company_id):
	"""Enqueue WhatsApp notification for background processing."""
	frappe.enqueue(
		"clapgrow_app.api.whatsapp.whatsapp_notifications.send_whatsapp_notification",
		phone_number=phone_number,
		notification=notification,
		company_id=company_id,
		queue="default",
	)


def send_whatsapp_notification(phone_number, notification, company_id, media_url=None):
	"""Core function to send WhatsApp notifications using WAAPI."""
	phone_number = "".join(e for e in phone_number if e.isalnum())
	if not phone_number:
		frappe.throw(_("Invalid phone number."))

	chat_id = f"{phone_number}@c.us"
	settings = frappe.get_value(
		"Whatsapp Setting",
		filters={"company_id": company_id},
		fieldname=["wa_api_url", "wa_api_token", "instance_id"],
		as_dict=True,
	)

	if not settings or not all(settings.values()):
		frappe.throw(_("Incomplete WhatsApp API settings for the current company."))

	wa_api_url = settings["wa_api_url"]
	wa_api_token = settings["wa_api_token"]
	instance_id = settings["instance_id"]

	message_url = f"{wa_api_url}{instance_id}/client/action/send-message"
	headers = {
		"Authorization": f"Bearer {wa_api_token}",
		"Accept": "application/json",
		"Content-Type": "application/json",
	}

	if media_url:
		media_upload_url = f"{wa_api_url}{instance_id}/client/action/upload-media"
		media_payload = {"url": media_url}
		try:
			media_response = requests.post(media_upload_url, json=media_payload, headers=headers)
			if media_response.ok:
				media_id = media_response.json().get("mediaId")
				if not media_id:
					frappe.throw(_("Failed to retrieve media ID from upload response."))
				payload = {
					"chatId": chat_id,
					"mediaId": media_id,
					"caption": notification,
				}
				response = requests.post(message_url, json=payload, headers=headers)
				if not response.ok:
					frappe.log_error(f"WhatsApp multimedia message failed: {response.text}")
			else:
				frappe.log_error(f"Media upload failed: {media_response.text}")
		except requests.RequestException as e:
			frappe.log_error(f"Error during WhatsApp API request: {str(e)}")
	else:
		payload = {"chatId": chat_id, "message": notification}
		try:
			response = requests.post(message_url, json=payload, headers=headers)
			if not response.ok:
				frappe.log_error(f"WhatsApp message failed: {response.text}")
			else:
				frappe.msgprint(_("WhatsApp notification sent successfully."))
		except requests.RequestException as e:
			frappe.log_error(f"Error during WhatsApp API request: {str(e)}")


# Utility functions
def get_full_name(user):
	"""Get the full name of a user."""
	try:
		user_doc = frappe.get_doc("CG User", user)
		return user_doc.full_name if user_doc else None
	except Exception:
		return None


def html_to_text(html_content):
	"""Convert HTML content to WhatsApp-compatible text."""
	import re
	from html import unescape

	if not html_content or not html_content.strip():
		return "N/A"

	text = unescape(html_content)
	text = re.sub(r"[ \t]+", " ", text)
	text = re.sub(r"\n\s*\n+", "\n", text).strip()

	# WhatsApp formatting
	text = re.sub(r"<strong[^>]*>(.*?)</strong>", r"*\1*", text, flags=re.DOTALL)
	text = re.sub(r"<b[^>]*>(.*?)</b>", r"*\1*", text, flags=re.DOTALL)
	text = re.sub(r"<em[^>]*>(.*?)</em>", r"_\1_", text, flags=re.DOTALL)
	text = re.sub(r"<i[^>]*>(.*?)</i>", r"_\1_", text, flags=re.DOTALL)
	text = re.sub(r"<s[^>]*>(.*?)</s>", r"~\1~", text, flags=re.DOTALL)
	text = re.sub(r"<strike[^>]*>(.*?)</strike>", r"~\1~", text, flags=re.DOTALL)

	# Remove remaining HTML tags
	text = re.sub(r"<[^>]+>", "", text)

	# Clean up whitespace
	text = re.sub(r"\n\s*\n\s*\n+", "\n\n", text)
	text = re.sub(r"[ \t]+", " ", text)

	return text.strip() if text else "N/A"


# Keep the existing functions that need to remain in this file for compatibility
def is_valid_email(email):
	return bool(email and isinstance(email, str) and "@" in email)

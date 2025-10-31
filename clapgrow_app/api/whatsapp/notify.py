import base64
import logging
import re
from datetime import date, datetime, time, timedelta
from html import unescape

import frappe
import requests
from frappe import _
from frappe.utils import format_datetime, getdate, nowdate

from clapgrow_app.api.tasks.task_utils import parse_datetime
from clapgrow_app.api.whatsapp.notification_utils import (
	send_whatsapp_notification_with_settings,
)

logger = logging.getLogger(__name__)


def html_to_text(html_content):
	"""Convert HTML content to WhatsApp-compatible text, preserving formatting and structure."""
	if not html_content or not html_content.strip():
		return "N/A"

	# Step 1: Decode HTML entities (e.g., & -> &,   -> space)
	text = unescape(html_content)

	# Step 2: Normalize initial whitespace
	text = re.sub(r"[ \t]+", " ", text)  # Replace multiple spaces/tabs with single space
	text = re.sub(r"\n\s*\n+", "\n", text).strip()  # Normalize multiple newlines

	# Step 3: Handle WhatsApp-compatible formatting for inline tags
	# Bold: <strong>, <b> -> *text*
	text = re.sub(r"<strong[^>]*>(.*?)</strong>", r"*\1*", text, flags=re.DOTALL)
	text = re.sub(r"<b[^>]*>(.*?)</b>", r"*\1*", text, flags=re.DOTALL)

	# Italic: <em>, <i> -> _text_
	text = re.sub(r"<em[^>]*>(.*?)</em>", r"_\1_", text, flags=re.DOTALL)
	text = re.sub(r"<i[^>]*>(.*?)</i>", r"_\1_", text, flags=re.DOTALL)

	# Strikethrough: <s>, <strike> -> ~text~
	text = re.sub(r"<s[^>]*>(.*?)</s>", r"~\1~", text, flags=re.DOTALL)
	text = re.sub(r"<strike[^>]*>(.*?)</strike>", r"~\1~", text, flags=re.DOTALL)

	# Underline: <u> -> Not supported in WhatsApp, preserve content
	text = re.sub(r"<u[^>]*>(.*?)</u>", r"\1", text, flags=re.DOTALL)

	# Step 4: Handle block elements
	# Headings: <h1>, <h2>, etc. -> Bold with newlines
	text = re.sub(r"<h[1-6][^>]*>(.*?)</h[1-6]>", r"\n*\1*\n", text, flags=re.DOTALL)

	# Paragraphs and line breaks
	# Remove empty <p><br></p> or <p></p>
	text = re.sub(r"<p[^>]*>\s*(<br\s*/?>)?\s*</p>", "", text, flags=re.DOTALL)
	# Handle <br> within <p> as a single newline
	text = re.sub(r"<p[^>]*>(.*?)<br\s*/?>(.*?)</p>", r"\n\n\1\n\2", text, flags=re.DOTALL)
	# Normal paragraphs: Add double newlines
	text = re.sub(r"<p[^>]*>", "\n\n", text)
	text = re.sub(r"</p>", "", text)

	# Divs: Treat as block elements with double newlines
	text = re.sub(r"<div[^>]*>", "\n\n", text)
	text = re.sub(r"</div>", "\n", text)

	# Standalone line breaks: Convert <br> to single newline
	text = re.sub(r"<br\s*/?>", "\n", text)

	# Step 5: Handle lists
	# Unordered lists: Use bullet points
	text = re.sub(r"<ul[^>]*>", "\n", text)
	text = re.sub(r"</ul>", "", text)
	text = re.sub(r"<li[^>]*>", "\n- ", text)
	text = re.sub(r"</li>", "", text)

	# Ordered lists: Number items dynamically
	def number_list_items(match):
		items = match.group(1)
		li_items = re.findall(r"<li[^>]*>(.*?)</li>", items, re.DOTALL)
		formatted_items = []
		for i, item in enumerate(li_items, 1):
			if not item.strip():
				continue  # Skip empty items
			# Preserve formatting and normalize whitespace
			cleaned_item = re.sub(r"\n+", " ", item.strip())  # Collapse newlines within items
			formatted_items.append(f"{i}. {cleaned_item}")
		return "\n" + "\n".join(formatted_items) if formatted_items else ""

	text = re.sub(r"<ol[^>]*>(.*?)</ol>", number_list_items, text, flags=re.DOTALL)

	# Step 6: Remove all remaining HTML tags
	text = re.sub(r"<[^>]+>", "", text)

	# Step 7: Clean up whitespace
	text = re.sub(r"\n\s*\n\s*\n+", "\n\n", text)  # Max two newlines
	text = re.sub(r"[ \t]+", " ", text)  # Normalize spaces/tabs
	text = text.strip()

	# Step 8: Handle WhatsApp formatting edge cases
	# Ensure no spaces between formatting markers and text
	text = re.sub(r"\*\s*([^ *]+)\s*\*", r"*\1*", text)
	text = re.sub(r"_\s*([^ _]+)\s*_", r"_\1_", text)
	text = re.sub(r"~\s*([^ ~]+)\s*~", r"~\1~", text)

	# Prevent nested formatting issues
	text = re.sub(r"\*(_[^_]+_)(\*+)", r"\1", text)  # Remove bold around italic
	text = re.sub(r"_(\*[^ *]+\*)_", r"\1", text)  # Remove italic around bold

	# Step 9: Ensure no trailing newlines
	text = text.strip()

	return text if text else "N/A"


def html_to_whatsapp_text(html_content):
	"""
	Convert HTML content to WhatsApp-compatible text.
	Simplified version that focuses on preserving content rather than complex formatting.
	"""
	if not html_content or not html_content.strip():
		return "N/A"

	text = html_content

	# Step 1: Decode HTML entities
	text = unescape(text)

	# Step 2: Handle bold formatting - preserve *text* format for WhatsApp
	text = re.sub(r"<strong[^>]*>(.*?)</strong>", r"*\1*", text, flags=re.DOTALL | re.IGNORECASE)
	text = re.sub(r"<b[^>]*>(.*?)</b>", r"*\1*", text, flags=re.DOTALL | re.IGNORECASE)

	# Step 3: Handle italic formatting - preserve _text_ format for WhatsApp
	text = re.sub(r"<em[^>]*>(.*?)</em>", r"_\1_", text, flags=re.DOTALL | re.IGNORECASE)
	text = re.sub(r"<i[^>]*>(.*?)</i>", r"_\1_", text, flags=re.DOTALL | re.IGNORECASE)

	# Step 4: Handle strikethrough - preserve ~text~ format for WhatsApp
	text = re.sub(r"<s[^>]*>(.*?)</s>", r"~\1~", text, flags=re.DOTALL | re.IGNORECASE)
	text = re.sub(r"<strike[^>]*>(.*?)</strike>", r"~\1~", text, flags=re.DOTALL | re.IGNORECASE)
	text = re.sub(r"<del[^>]*>(.*?)</del>", r"~\1~", text, flags=re.DOTALL | re.IGNORECASE)

	# Step 5: Remove underline tags (not supported in WhatsApp)
	text = re.sub(r"<u[^>]*>(.*?)</u>", r"\1", text, flags=re.DOTALL | re.IGNORECASE)

	# Step 6: Handle headings - make them bold with newlines
	text = re.sub(
		r"<h[1-6][^>]*>(.*?)</h[1-6]>",
		r"\n*\1*\n",
		text,
		flags=re.DOTALL | re.IGNORECASE,
	)

	# Step 7: Handle paragraphs - add double newlines
	text = re.sub(r"<p[^>]*>(.*?)</p>", r"\n\1\n", text, flags=re.DOTALL | re.IGNORECASE)

	# Step 8: Handle line breaks
	text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)

	# Step 9: Handle divs - just add newlines
	text = re.sub(r"<div[^>]*>(.*?)</div>", r"\n\1\n", text, flags=re.DOTALL | re.IGNORECASE)

	# Step 10: Handle lists
	# Unordered lists
	text = re.sub(r"<ul[^>]*>", "\n", text, flags=re.IGNORECASE)
	text = re.sub(r"</ul>", "\n", text, flags=re.IGNORECASE)
	text = re.sub(r"<li[^>]*>(.*?)</li>", r"• \1\n", text, flags=re.DOTALL | re.IGNORECASE)

	# Ordered lists - convert to numbered format
	def convert_ol(match):
		items = re.findall(r"<li[^>]*>(.*?)</li>", match.group(0), re.DOTALL | re.IGNORECASE)
		result = "\n"
		for i, item in enumerate(items, 1):
			# Clean the item text
			item_text = re.sub(r"<[^>]+>", "", item).strip()
			if item_text:
				result += f"{i}. {item_text}\n"
		return result

	text = re.sub(r"<ol[^>]*>.*?</ol>", convert_ol, text, flags=re.DOTALL | re.IGNORECASE)

	# Step 11: Handle links - show as "text (url)"
	text = re.sub(
		r'<a[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>',
		r"\2 (\1)",
		text,
		flags=re.DOTALL | re.IGNORECASE,
	)

	# Step 12: Remove all remaining HTML tags
	text = re.sub(r"<[^>]+>", "", text)

	# Step 13: Clean up whitespace
	# Replace multiple spaces with single space
	text = re.sub(r" +", " ", text)

	# Replace 3+ newlines with just 2
	text = re.sub(r"\n\s*\n\s*\n+", "\n\n", text)

	# Remove spaces at start/end of lines
	text = "\n".join(line.strip() for line in text.split("\n"))

	# Remove leading/trailing whitespace
	text = text.strip()

	# Step 14: Fix WhatsApp formatting edge cases
	# Ensure no spaces between formatting markers and text
	text = re.sub(r"\*\s+([^\*]+)\s+\*", r"*\1*", text)
	text = re.sub(r"_\s+([^_]+)\s+_", r"_\1_", text)
	text = re.sub(r"~\s+([^~]+)\s+~", r"~\1~", text)

	return text if text else "N/A"


def enqueue_send_whatsapp_notification(phone_number, notification, company_id):
	"""Enqueues the sending of a WhatsApp notification asynchronously."""
	frappe.enqueue(
		"clapgrow_app.api.whatsapp.notify.send_whatsapp_notification",
		phone_number=phone_number,
		notification=notification,
		company_id=company_id,
		queue="default",
	)


def send_whatsapp_notification(phone_number, notification, company_id, media_url=None):
	"""Helper function to send WhatsApp notifications using WAAPI, with support for multimedia."""
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

	if not instance_id:
		frappe.throw(_("Instance ID is missing in WhatsApp API settings for the current company."))

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
				frappe.throw(_("Failed to upload media for WhatsApp notification."))
		except requests.RequestException as e:
			frappe.log_error(f"Error during WhatsApp API request: {str(e)}")
			frappe.throw(_("Failed to send WhatsApp multimedia notification."))
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
			frappe.throw(_("Failed to send WhatsApp notification."))


def send_task_whatsapp_notification_on_update(task_doc, method, previous_status=None):
	"""
	Send WhatsApp notification when a task is updated.

	Args:
	        task_doc: CG Task Instance document
	        method (str): The method of the update (Paused, Rejected, Reopened, Completed from Paused, etc.).
	        previous_status (str): The previous status of the task.
	"""
	if not task_doc.assigned_to:
		frappe.logger().info("No assigned_to set for the task, skipping WhatsApp notification.")
		return

	try:
		# Get assigned user details
		assigned_user = frappe.get_doc("CG User", task_doc.assigned_to)
		if not assigned_user or not assigned_user.phone:
			frappe.logger().info(
				f"User not found or phone not set for assigned_to: {task_doc.assigned_to}, skipping WhatsApp notification."
			)
			return

		# Get assignee (creator) full name
		assignee_user = frappe.get_doc("CG User", task_doc.assignee)
		assignee_full_name = assignee_user.full_name if assignee_user else "N/A"

		# Get completed by full name if applicable
		completed_by_full_name = "N/A"
		if task_doc.completed_by:
			try:
				completed_by_user = frappe.get_doc("CG User", task_doc.completed_by)
				completed_by_full_name = completed_by_user.full_name if completed_by_user else "N/A"
			except Exception:
				completed_by_full_name = "N/A"

		# Base URL for task links
		base_url = frappe.utils.get_url()
		task_link = f"{base_url}/clapgrow/task/{task_doc.name}"

		# Add subtask indicator
		task_type_indicator = " (Subtask)" if getattr(task_doc, "is_subtask", 0) else ""

		# Generate appropriate message based on method
		message = ""
		notification_type = "task_update"  # Default

		if method == "Paused":
			notification_type = "task_paused"
			message = (
				f"Hello {assigned_user.full_name}, \n\n"
				f"Your task{task_type_indicator} on Clapgrow has been paused. \n\n"
				f"*Task*: {task_doc.task_name} \n"
				f"*Open task*: {task_link}\n"
				f"*Status*: Paused \n"
				f"*Due Date*: {task_doc.due_date} \n"
				f"*Assigned By*: {assignee_full_name} \n\n"
				f"You can still complete this task directly, and the due date will be automatically adjusted."
			)

		elif method == "Rejected":
			notification_type = "task_rejected"
			message = (
				f"Hello {assigned_user.full_name}, \n\n"
				f"Your task{task_type_indicator} on Clapgrow has been rejected. \n\n"
				f"*Task*: {task_doc.task_name} \n"
				f"*Open task*: {task_link}\n"
				f"*Status*: Rejected \n"
				f"*Due Date*: {task_doc.due_date} \n"
				f"*Assigned By*: {assignee_full_name} \n\n"
				f"Please contact your administrator for more information."
			)

		elif method == "Reopened":
			notification_type = "task_reopened"
			message = (
				f"Hello {assigned_user.full_name}, \n\n"
				f"Your task{task_type_indicator} on Clapgrow has been reopened. \n\n"
				f"*Task*: {task_doc.task_name} \n"
				f"*Open task*: {task_link}\n"
				f"*Previous Status*: {previous_status} \n"
				f"*Current Status*: {task_doc.status} \n"
				f"*Due Date*: {task_doc.due_date} \n"
				f"*Assigned By*: {assignee_full_name} \n\n"
				f"Please review the task and complete it as required."
			)

		elif method == "Completed from Paused":
			notification_type = "task_completion"
			completion_date = datetime.now().strftime("%d-%m-%Y")
			completion_time = datetime.now().strftime("%H:%M:%S")
			message = (
				f"Hello {assignee_full_name}, \n\n"
				f"A paused task{task_type_indicator} has been completed on Clapgrow! 🎉 \n\n"
				f"*Task*: {task_doc.task_name} \n"
				f"*Completed By*: {completed_by_full_name} \n"
				f"*Completed On*: {completion_date} at {completion_time} \n"
				f"*Note*: Due date was automatically adjusted for pause time \n"
				f"*Adjusted Due Date*: {task_doc.due_date} \n\n"
				f"The task completion took into account the pause period."
			)

		else:
			# Generic update message
			message = (
				f"Hello {assigned_user.full_name}, \n\n"
				f"Your task{task_type_indicator} on Clapgrow has been updated. \n\n"
				f"*Task*: {task_doc.task_name} \n"
				f"*Open task*: {task_link}\n"
				f"*Status*: {task_doc.status} \n"
				f"*Due Date*: {task_doc.due_date} \n"
				f"*Assigned By*: {assignee_full_name} \n\n"
				f"Please review the updated task details."
			)

		# Send WhatsApp notification using centralized system
		send_whatsapp_notification_with_settings(
			assigned_user.phone, message, task_doc.company_id, notification_type
		)

		frappe.logger().info(f"WhatsApp notification sent for task {task_doc.name} with method {method}")

	except Exception as e:
		frappe.log_error(
			message=f"Failed to send WhatsApp notification for task {task_doc.name}, method {method}: {str(e)}",
			title="Task WhatsApp Notification Error",
		)


def send_task_whatsapp_to_assignee_on_update(task_doc, method):
	"""
	Send WhatsApp notification to the assignee (task creator) when task is updated.
	This is separate from the assigned_to user notifications.
	"""
	if not task_doc.assignee or task_doc.assignee == task_doc.assigned_to:
		# Skip if no assignee or if assignee and assigned_to are the same person
		return

	try:
		assignee_user = frappe.get_doc("CG User", task_doc.assignee)
		if not assignee_user or not assignee_user.phone:
			frappe.logger().info(
				f"Assignee not found or phone not set for assignee: {task_doc.assignee}, skipping WhatsApp notification."
			)
			return

		assigned_user = frappe.get_doc("CG User", task_doc.assigned_to)
		assigned_full_name = assigned_user.full_name if assigned_user else "N/A"

		base_url = frappe.utils.get_url()
		task_link = f"{base_url}/clapgrow/task/{task_doc.name}"

		# Add subtask indicator
		task_type_indicator = " (Subtask)" if getattr(task_doc, "is_subtask", 0) else ""

		notification_type = "task_update"  # Default

		if method == "Completed from Paused":
			notification_type = "task_completion"
			completion_date = datetime.now().strftime("%d-%m-%Y")
			completion_time = datetime.now().strftime("%H:%M:%S")
			message = (
				f"Hello {assignee_user.full_name}, \n\n"
				f"A paused task{task_type_indicator} you assigned has been completed! 🎉 \n\n"
				f"*Task*: {task_doc.task_name} \n"
				f"*Completed By*: {assigned_full_name} \n"
				f"*Completed On*: {completion_date} at {completion_time} \n"
				f"*Note*: Due date was automatically adjusted for pause time \n"
				f"*Adjusted Due Date*: {task_doc.due_date} \n\n"
				f"The task completion took into account the pause period."
			)
		else:
			message = (
				f"Hello {assignee_user.full_name}, \n\n"
				f"A task{task_type_indicator} you assigned has been updated on Clapgrow. \n\n"
				f"*Task*: {task_doc.task_name} \n"
				f"*Open task*: {task_link}\n"
				f"*Status*: {task_doc.status} \n"
				f"*Updated By*: {assigned_full_name} \n"
				f"*Due Date*: {task_doc.due_date} \n\n"
				f"Please review the task status if needed."
			)

		send_whatsapp_notification_with_settings(
			assignee_user.phone, message, task_doc.company_id, notification_type
		)

	except Exception as e:
		frappe.log_error(
			message=f"Failed to send WhatsApp notification to assignee for task {task_doc.name}: {str(e)}",
			title="Assignee WhatsApp Notification Error",
		)


@frappe.whitelist(allow_guest=False)
def daily_task_summary():
	"""Generates and sends a daily task summary for each user in a company, only if they have tasks."""
	try:
		companies_doc = frappe.get_all("CG Company", fields=["name"])

		today = getdate(nowdate())
		today_start, today_end = get_time_range(today)

		for company in companies_doc:
			company_id = company["name"]

			users = frappe.get_all(
				"CG User",
				filters={"company_id": company_id},
				fields=["name", "phone", "full_name", "email"],
			)

			for user in users:
				user_name = user["name"]
				user_phone = user["phone"]
				user_full_name = user["full_name"]
				user_email = user["email"]

				onetime_tasks = frappe.get_all(
					"CG Task Instance",
					filters={
						"task_type": "Onetime",
						"assigned_to": user_name,
						"is_help_ticket": 0,
					},
					fields=["task_name", "due_date"],
				)

				scheduled_tasks = frappe.get_all(
					"CG Task Instance",
					filters={
						"task_type": "Recurring",
						"assigned_to": user_name,
						"is_help_ticket": 0,
					},
					fields=["task_name", "due_date"],
				)

				# Only generate and send notifications if the user has at least one task
				if onetime_tasks or scheduled_tasks:
					# Send WhatsApp notification using centralized system
					whatsapp_message = generate_summary_message(
						user_full_name, onetime_tasks, scheduled_tasks
					)
					send_whatsapp_notification_with_settings(
						user_phone, whatsapp_message, company_id, "summary_digest"
					)

					# Send email notification if user has a valid email
					if is_valid_email(user_email):
						from clapgrow_app.api.email_notifications import send_task_email

						email_message = generate_daily_task_email(
							user_full_name, onetime_tasks + scheduled_tasks
						)
						email_args = {
							"recipients": [user_email],
							"subject": "📋 Daily Task Summary – Pending Tasks for Today",
							"message": email_message,
						}
						from clapgrow_app.api.whatsapp.notification_utils import (
							send_email_notification_with_settings,
						)

						send_email_notification_with_settings(email_args, company_id, "summary_digest")

	except Exception:
		frappe.log_error(message=frappe.get_traceback(), title="Daily Task Summary Error")


def generate_daily_task_email(full_name, tasks):
	"""Generates the email content for daily task summary with HTML table format."""
	task_details = ""
	for index, task in enumerate(tasks, start=1):
		due_date_str = (
			f"Today, {task.due_date.strftime('%I:%M %p')}"
			if task.due_date and task.due_date.time() != time.min
			else "Today"
		)
		task_details += f"""
<tr>
    <td style="padding: 8px; border: 1px solid #dadce0;">{index}</td>
    <td style="padding: 8px; border: 1px solid #dadce0;">{task.task_name}</td>
    <td style="padding: 8px; border: 1px solid #dadce0;">{due_date_str}</td>
</tr>
"""

	first_name = full_name.split(" ")[0] if full_name else "User"

	return f"""
<html>
    <body style="font-family: Arial, sans-serif; color: #333333; line-height: 1.6;">
        <p>Dear {first_name},</p>
        <p>Please review and complete the following tasks for today:</p>
        <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%; margin: 16px 0;">
            <thead style="background-color: #f2f2f2;">
                <tr>
                    <th style="padding: 8px; border: 1px solid #dadce0; text-align: left;">#</th>
                    <th style="padding: 8px; border: 1px solid #dadce0; text-align: left;">Task Name</th>
                    <th style="padding: 8px; border: 1px solid #dadce0; text-align: left;">Due Date</th>
                </tr>
            </thead>
            <tbody>
                {task_details}
            </tbody>
        </table>
        <p>Kindly prioritize your tasks accordingly and ensure timely completion. Let us know if you need any assistance.</p>
        <p>Best regards,<br/><strong>Clapgrow Team</strong></p>
    </body>
</html>
""".strip()


@frappe.whitelist(allow_guest=True)
def daily_task_digest():
	"""Generates and sends a daily task summary for admins of a company."""
	try:
		companies_doc = frappe.get_all("CG Company", fields=["name"])
		if not companies_doc:
			frappe.logger().info("No companies found for daily task digest.")
			return

		yesterday = getdate(nowdate()) - timedelta(days=1)
		yesterday_start, yesterday_end = get_time_range(yesterday)

		for company in companies_doc:
			company_id = company.name
			try:
				total_users = frappe.db.count("CG User", filters={"company_id": company_id, "enabled": 1})

				# Tasks that were DUE yesterday
				yesterdays_onetime_tasks = count_tasks(
					"CG Task Instance",
					"Onetime",
					company_id,
					yesterday_start,
					yesterday_end,
					is_help_ticket=0,
				)
				yesterdays_scheduled_tasks = count_tasks(
					"CG Task Instance",
					"Recurring",
					company_id,
					yesterday_start,
					yesterday_end,
					is_help_ticket=0,
				)
				total_tasks_due_yesterday = yesterdays_onetime_tasks + yesterdays_scheduled_tasks

				# Tasks that were DUE yesterday AND completed yesterday
				onetime_due_and_completed_yesterday = frappe.db.count(
					"CG Task Instance",
					filters={
						"task_type": "Onetime",
						"company_id": company_id,
						"due_date": ["between", [yesterday_start, yesterday_end]],
						"status": "Completed",
						"completed_on": ["between", [yesterday_start, yesterday_end]],
						"is_help_ticket": 0,
					},
				)

				scheduled_due_and_completed_yesterday = frappe.db.count(
					"CG Task Instance",
					filters={
						"task_type": "Recurring",
						"company_id": company_id,
						"due_date": ["between", [yesterday_start, yesterday_end]],
						"status": "Completed",
						"completed_on": ["between", [yesterday_start, yesterday_end]],
						"is_help_ticket": 0,
					},
				)

				total_due_and_completed_yesterday = (
					onetime_due_and_completed_yesterday + scheduled_due_and_completed_yesterday
				)

				# Calculate completion percentage for tasks that were due yesterday
				completion_percentage = calculate_completion_percentage(
					total_due_and_completed_yesterday, total_tasks_due_yesterday
				)

				admin_users = get_admin_users(company_id)
				if not admin_users:
					frappe.logger().info(f"No admins found for company {company_id}.")
					continue

				for admin in admin_users:
					if not hasattr(admin, "phone") or not admin.phone:
						frappe.logger().warning(
							f"Admin {admin.full_name} has no phone number for company {company_id}."
						)
						continue

					message = generate_digest_message(
						admin.full_name,
						total_users,
						yesterdays_onetime_tasks,
						yesterdays_scheduled_tasks,
						total_tasks_due_yesterday,
						total_due_and_completed_yesterday,
						completion_percentage,
					)
					send_whatsapp_notification_with_settings(
						admin.phone, message, company_id, "summary_digest"
					)
					frappe.logger().info(f"Notification sent to {admin.full_name} for company {company_id}.")

			except Exception as e:
				frappe.log_error(
					f"Error in daily_task_digest for company {company_id}: {str(e)}",
					"Daily Task Digest Error",
				)

	except Exception as e:
		frappe.log_error(f"Error in daily_task_digest: {str(e)}", "Daily Task Digest Error")


def generate_digest_message(
	admin_name,
	total_users,
	one_time_tasks,
	scheduled_tasks,
	total_tasks_due,
	completed_tasks_due,
	completion_percentage,
):
	"""Generate the digest message with detailed completion breakdown."""
	return f"""
Hi {admin_name},

Your Clapgrow Update for the previous day:

*No. of current doers:* {total_users}
*No. of one-time tasks due:* {one_time_tasks}
*No. of scheduled tasks due:* {scheduled_tasks}
*Total tasks due yesterday:* {total_tasks_due}
*Tasks due yesterday & completed:* {completed_tasks_due}
*% of due tasks completed:* {completion_percentage:.2f}%

PS: Don't forget to do your weekly review meetings.
"""


def get_company_id(user):
	"""Fetches the company ID for a given user."""
	return frappe.get_value("CG User", user, "company_id")


def get_admin_users(company_id):
	return frappe.get_all(
		"CG User",
		filters={"role": "ROLE-ADMIN", "company_id": company_id},
		fields=["name", "phone", "full_name"],
	)


def count_tasks(doctype, task_type, company_id, start, end, is_help_ticket=None):
	filters = {
		"task_type": task_type,
		"company_id": company_id,
		"due_date": ["between", [start, end]],
	}
	return frappe.db.count(doctype, filters=filters)


def count_overdue_tasks(doctype, company_id, start, end):
	return frappe.db.count(
		doctype,
		filters={
			"company_id": company_id,
			"status": "Overdue",
			"due_date": ["between", [start, end]],
		},
	)


def count_completed_tasks(doctype, task_type, company_id, start, end):
	return frappe.db.count(
		doctype,
		filters={
			"task_type": task_type,
			"company_id": company_id,
			"status": "Completed",
			"completed_on": ["between", [start, end]],
		},
	)


def get_time_range(yesterday):
	yesterday_start = datetime.combine(yesterday, time.min)
	yesterday_end = datetime.combine(yesterday, time.max)
	return yesterday_start, yesterday_end


def calculate_completion_percentage(completed_tasks, total_tasks):
	return (completed_tasks / total_tasks) * 100 if total_tasks > 0 else 0


def generate_summary_message(user_name, onetime_tasks, scheduled_tasks):
	"""Generates the summary message for a user."""
	onetime_task_list = (
		"\n".join([f"- {task['task_name']}" for task in onetime_tasks])
		if onetime_tasks
		else "No one-time tasks assigned."
	)
	scheduled_task_list = (
		"\n".join([f"- {task['task_name']}" for task in scheduled_tasks])
		if scheduled_tasks
		else "No scheduled tasks assigned."
	)

	return f"""
Hi {user_name},

Please find today's task details below:

*Onetime Tasks:*
{onetime_task_list}

*Scheduled Tasks:*
{scheduled_task_list}

Please complete the tasks.
"""


def notify_on_user_creation(doc, method):
	"""Notify a user upon creation via WhatsApp."""
	try:
		user = frappe.get_doc("CG User", {"email": doc.email})
		company_id = doc.company_id
		phone_number = doc.phone
		if not phone_number:
			frappe.log_error(
				message=f"No phone number provided for user {doc.email}",
				title="WhatsApp Notification Error",
			)
			return

		login_link = f"{frappe.utils.get_url()}" or "https://clapgrow.frappe.cloud/clapgrow/"
		message = f"Hi {doc.first_name} \nWelcome to Clapgrow. Please find your login details below: \n\nLogin Link: {login_link} \nEmail: {user.email} \nPassword: root@1234 \n\nPlease ensure to change your password after logging in. \n\nNeed help? Schedule a training session with the Clapgrow team!\nYou can now also work on the go with our mobile app"

		send_whatsapp_notification_with_settings(phone_number, message, company_id, "user_creation")
	except frappe.DoesNotExistError:
		frappe.log_error(
			message=f"User with email {doc.email} does not exist.",
			title="WhatsApp Notification Error",
		)
	except Exception as e:
		frappe.log_error(
			message=f"Error sending WhatsApp notification for user {doc.email}: {str(e)}",
			title="WhatsApp Notification Error",
		)


def send_multimedia_message(phone_number, media_url=None, media_base64=None):
	"""
	Send a multimedia message (image, PDF, etc.) via WhatsApp using the WAAPI.
	"""
	url = "https://waapi.app/api/v1/instances/34678/client/action/send-media"
	headers = {
		"accept": "application/json",
		"authorization": "Bearer kibsnRZPg2xmFz9w2GsClzf00gi4WkECpcGobeJCa31e7162",
		"content-type": "application/json",
	}

	if not media_url and not media_base64:
		raise ValueError("Either media_url or media_base64 must be provided.")

	chat_id = f"{phone_number}@c.us"

	data = {
		"chatId": chat_id,
		"mediaUrl": media_url or "",
		"mediaBase64": media_base64 or "",
	}

	response = requests.post(url, json=data, headers=headers)

	if response.status_code == 200:
		print(f"Message sent successfully to {phone_number}")
	else:
		print(f"Failed to send message to {phone_number}. Response: {response.text}")


def get_file_from_frappe(file_name):
	file_doc = frappe.get_all("File", filters={"file_name": file_name}, fields=["file_url", "content"])

	if not file_doc:
		raise FileNotFoundError(f"File '{file_name}' not found in the File Manager.")

	file_url = file_doc[0].get("file_url")
	file_content = file_doc[0].get("content")

	if file_url:
		return file_url

	if file_content:
		return base64.b64encode(file_content).decode("utf-8")

	raise ValueError("File does not have a valid URL or Base64 content.")


@frappe.whitelist(allow_guest=False)
def send_frappe_file_via_whatsapp(phone_number, file_name):
	"""
	Retrieve a file from Frappe File Manager and send it via WhatsApp.
	"""
	try:
		file_content_or_url = get_file_from_frappe(file_name)
		if file_content_or_url.startswith("http"):
			send_multimedia_message(phone_number, media_url=file_content_or_url)
		else:
			send_multimedia_message(phone_number, media_base64=file_content_or_url)

	except Exception as e:
		print(f"Error sending file via WhatsApp: {str(e)}")


@frappe.whitelist(allow_guest=False)
def enqueue_task_digest():
	try:
		frappe.enqueue(
			"clapgrow_app.api.whatsapp.notify.daily_task_digest",
			queue="short",
			job_name="task_digest",
			enqueue_after_commit=False,
		)
		frappe.logger().info("Task Digest enqueued successfully.")
	except Exception as e:
		frappe.log_error(
			message=f"Error enqueuing daily task digest job: {str(e)}",
			title="Enqueue Job Error",
		)
		raise e


def notify_users_for_created_tasks(task_doc):
	"""Notify users about the created tasks via WhatsApp."""
	# task_id = task_doc.name
	task_type = task_doc.task_type

	assigned_user = frappe.get_doc("CG User", task_doc.assigned_to)
	assignee = get_full_name(task_doc.assignee)
	plain_description = html_to_text(task_doc.description)

	due_date_str = (
		format_datetime(task_doc.due_date, "dd-MM-yyyy 'at' HH:mm:ss")
		if task_doc.due_date
		else "Not specified"
	)

	base_url = frappe.utils.get_url()
	greeting = f"Hello {assigned_user.full_name} 🚀,\n"

	notification_type = "task_assigned"

	if task_type == "Onetime" and not task_doc.is_help_ticket:
		notification = (
			f"{greeting}"
			"You've been assigned a new task on Clapgrow!\n\n"
			f"*Task*: {task_doc.task_name}\n"
			f"*Open task*: {base_url}/clapgrow/task/{task_doc.name}\n"
			f"*Details*: {plain_description}\n"
			f"*Due Date*: {due_date_str}\n"
			f"*Assigned By*: {assignee}\n\n"
			"Please ensure to review the task details and get started on it promptly."
		)

	elif task_type == "Onetime" and task_doc.is_help_ticket:
		notification = (
			f"{greeting}"
			"Your team member needs your help!\n\n"
			f"*Open task*: {base_url}/clapgrow/task/{task_doc.name}\n"
			f"*Subject*: {task_doc.task_name}\n"
			f"*Details*: {plain_description}\n"
			f"*Due Date*: {due_date_str}\n"
			f"*Assigned By*: {assignee}\n\n"
			"Please ensure to comment back and help!"
		)

	elif task_type == "Recurring":
		definition = frappe.get_doc("CG Task Definition", task_doc.task_definition_id)

		frequency = (
			definition.recurrence_type_id[0].frequency if definition.recurrence_type_id else "Not specified"
		)
		notification_type = "recurring_reminder"
		notification = (
			f"{greeting}"
			"You've been assigned a new recurring task on Clapgrow!\n\n"
			f"*Open task*: {base_url}/clapgrow/task/{task_doc.name}\n"
			f"*Task*: {task_doc.task_name}\n"
			f"*Details*: {plain_description}\n"
			f"*Due Date*: {due_date_str}\n"
			f"*Frequency*: {frequency}\n"
			f"*Assigned By*: {assignee}\n\n"
			"Please ensure to review the task details and get started on it promptly."
		)
	elif task_type == "Process":
		notification_type = "process_notification"
		notification = (
			f"{greeting}"
			"You've been assigned a new process task on Clapgrow!\n\n"
			f"*Process*: {task_doc.task_name}\n"
			f"*Open task*: {base_url}/clapgrow/process/{task_doc.name}\n"
			f"*Details*: {plain_description}\n"
			f"*Due Date*: {due_date_str}\n"
			f"*Assigned By*: {assignee}\n\n"
			"Please go through the process steps and ensure completion as per the guidelines."
		)

	send_whatsapp_notification_with_settings(
		assigned_user.phone, notification, task_doc.company_id, notification_type
	)


def handle_task_completion(task_doc):
	user = frappe.get_doc("CG User", task_doc.assignee)
	message = generate_completion_message(task_doc, user)

	notification_type = (
		"recurring_task_completion" if task_doc.task_type == "Recurring" else "onetime_task_completion"
	)

	send_whatsapp_notification_with_settings(user.phone, message, task_doc.company_id, notification_type)


def generate_completion_message(task_doc, user):
	completed_by = get_full_name(task_doc.completed_by)
	comment_count = frappe.db.count(
		"Comment",
		filters={
			"reference_doctype": task_doc.doctype,
			"reference_name": task_doc.name,
			"comment_type": "Comment",
			"comment_email": task_doc.completed_by,
		},
	)
	comment = "No comments"
	if comment_count > 0:
		comment_doc = frappe.get_last_doc(
			"Comment",
			filters={
				"reference_doctype": task_doc.doctype,
				"reference_name": task_doc.name,
				"comment_type": "Comment",
				"comment_email": task_doc.completed_by,
			},
			order_by="creation desc",
		)
		comment = comment_doc.content if comment_doc else "No comments"

	if (
		task_doc.task_type == "Onetime" and task_doc.is_help_ticket == 0
	) or task_doc.task_type == "Recurring":
		print(task_doc.completed_on.strftime("%Y-%m-%d %H:%M:%S"))
		return (
			f"Hello {user.full_name}, \n\n"
			f"Task assigned by you has been marked as done on Clapgrow! 🎉 \n\n"
			f"*Task:* {task_doc.task_name}\n"
			f"*Completed By:* {completed_by}\n"
			f"*Completed On*: {task_doc.completed_on.strftime('%d-%m-%Y')} at {task_doc.completed_on.strftime('%H:%M:%S')}\n"
			f"*Comment*: {comment}\n\n"
			f"Feel free to review the task or provide feedback if needed"
		)
	elif task_doc.task_type == "Onetime" and task_doc.is_help_ticket == 1:
		return (
			f"Hello {user.full_name}, \n\n"
			f"{completed_by} has marked ticket as resolved.  \n\n"
			f"*Subject:* {task_doc.task_name}\n"
			f"*Ticket Details:* {html_to_text(task_doc.description)}\n"
			f"*Comment*: {comment}"
		)
	elif task_doc.task_type == "Process":
		return (
			f"Hello {user.full_name}, \n\n"
			f"Process task assigned by you has been marked as done on Clapgrow! 🎉 \n\n"
			f"*Task:* {task_doc.task_name}\n"
			f"*Completed By:* {completed_by}\n"
			f"*Completed On*: {task_doc.completed_on.strftime('%d-%m-%Y')} at {task_doc.completed_on.strftime('%H:%M:%S')}\n"
			f"*Comment*: {comment}\n\n"
			f"Feel free to review the process task or provide feedback if needed"
		)


def get_full_name(user):
	"""Fetches the full name of a user."""
	user_doc = frappe.get_doc("CG User", user)
	return user_doc.full_name if user_doc else None


def is_valid_email(email):
	return bool(email and isinstance(email, str) and "@" in email)


def generate_email_content(first_name, company_name, tasks, is_admin=False):
	task_details = ""
	for index, task in enumerate(tasks, start=1):
		due_date_str = format_datetime(task.due_date, "dd-MM-yyyy 'at' HH:mm:ss") if task.due_date else "N/A"
		if is_admin:
			task_details += f"""
<tr>
    <td>{index}</td>
    <td>{task.task_name}</td>
    <td>{task.assigned_to}</td>
    <td>{due_date_str}</td>
</tr>
"""
		else:
			task_details += f"""
<tr>
    <td>{index}</td>
    <td>{task.task_name}</td>
    <td>{due_date_str}</td>
</tr>
"""

	table_headers = (
		"""
<tr>
    <th>#</th>
    <th>Task Name</th>
    <th>Assigned To</th>
    <th>Due Date</th>
</tr>
"""
		if is_admin
		else """
<tr>
    <th>#</th>
    <th>Task Name</th>
    <th>Due Date</th>
</tr>
"""
	)

	return f"""
<html>
    <body style="font-family: Arial, sans-serif; color: #333333; line-height: 1.6;">
        <p>Dear {first_name},</p>
        <p>Below is the list of {"incomplete" if is_admin else "your overdue"} tasks for <strong>{company_name}</strong>:</p>
        <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
            <thead style="background-color: #f2f2f2;">
                {table_headers}
            </thead>
            <tbody>
                {task_details}
            </tbody>
        </table>
        <p>{"Please review and take necessary actions." if is_admin else "Please complete these tasks at your earliest convenience."}</p>
        <p>If you have any questions or need assistance, feel free to reach out.</p>
        <p>Best regards,<br/><strong>Clapgrow Team</strong></p>
    </body>
</html>
""".strip()


# Add these functions to notify.py


def incomplete_tasks_reminder_with_time(time_of_day="morning"):
	"""
	Sends reminder notifications for incomplete tasks.

	Args:
	        time_of_day (str): Either "morning" or "evening" to customize the message
	"""
	logger.info(f"Starting {time_of_day} incomplete_tasks_reminder execution")

	try:
		companies = frappe.get_all("CG Company", fields=["name"])
		logger.info(f"Found {len(companies)} companies")

		if not companies:
			logger.info("No companies found. Exiting.")
			return "No companies to process."

		# Customize subject and greeting based on time of day
		if time_of_day == "morning":
			subject_prefix = "Morning Reminder"
			greeting_suffix = "to start your day"
		else:
			subject_prefix = "Evening Reminder"
			greeting_suffix = "before end of day"

		for company in companies:
			try:
				users = frappe.get_all(
					"CG User",
					filters={"company_id": company.name},
					fields=[
						"name",
						"phone",
						"full_name",
						"email",
						"company_id",
						"role",
					],
				)
				admins = [user for user in users if user.role == "ROLE-Admin"]
				other_users = [user for user in users if user.role in ["ROLE-Member", "ROLE-Team Lead"]]
				logger.info(
					f"Found {len(admins)} admins and {len(other_users)} members/team leads for company {company.name}"
				)

				incomplete_task_list = frappe.get_all(
					"CG Task Instance",
					filters={"company_id": company.name, "status": "Overdue"},
					fields=["task_name", "due_date", "assigned_to"],
				)
				logger.info(f"Found {len(incomplete_task_list)} incomplete tasks for company {company.name}")

				if incomplete_task_list:
					for admin in admins:
						if not is_valid_email(admin.email):
							logger.warning(f"Invalid email for admin {admin.name} in company {company.name}")
							continue
						first_name = admin.full_name.split(" ")[0] if admin.full_name else "Admin"
						message = generate_email_content_with_time(
							first_name,
							company.name,
							incomplete_task_list,
							is_admin=True,
							time_of_day=time_of_day,
						)
						subject = f"{subject_prefix}: Incomplete Tasks for {company.name}"
						email_args = {
							"recipients": [admin.email],
							"subject": subject,
							"message": message,
						}
					logger.info(f"Enqueuing {time_of_day} email for {admin.email} (Company: {company.name})")
					from clapgrow_app.api.whatsapp.notification_utils import (
						send_email_notification_with_settings,
					)

					send_email_notification_with_settings(email_args, company.name, "overdue_task")

				for user in other_users:
					if not is_valid_email(user.email):
						logger.warning(f"Invalid email for user {user.name} in company {company.name}")
						continue
					first_name = user.full_name.split(" ")[0] if user.full_name else user.name
					user_tasks = [task for task in incomplete_task_list if task.assigned_to == user.name]
					if not user_tasks:
						logger.info(
							f"No incomplete tasks for user {user.name} in company {company.name}, skipping email"
						)
						continue
					logger.info(
						f"Found {len(user_tasks)} incomplete tasks for user {user.name} in company {company.name}"
					)
					message = generate_email_content_with_time(
						first_name,
						company.name,
						user_tasks,
						is_admin=False,
						time_of_day=time_of_day,
					)
					subject = f"{subject_prefix}: Your Incomplete Tasks {greeting_suffix}"
					email_args = {
						"recipients": [user.email],
						"subject": subject,
						"message": message,
					}
					logger.info(
						f"Enqueuing {time_of_day} email for {user.email} (Role: {user.role}, Company: {company.name})"
					)
					from clapgrow_app.api.whatsapp.notification_utils import (
						send_email_notification_with_settings,
					)

					send_email_notification_with_settings(email_args, company.name, "overdue_task")

			except Exception as e:
				logger.error(f"Error processing company {company.name}: {str(e)}")
				admin_email = frappe.get_value("CG Company", company.name, "admin_email")
				if admin_email and is_valid_email(admin_email):
					frappe.sendmail(
						recipients=[admin_email],
						subject=f"Task Reminder Error for {company.name}",
						message=f"Error in {time_of_day} incomplete_tasks_reminder: {str(e)}",
					)
				continue

	except Exception as e:
		logger.error(f"Critical error in {time_of_day} incomplete_tasks_reminder: {str(e)}")
		frappe.sendmail(
			recipients=["techtools@clapgrow.com"],
			subject=f"Critical Task Reminder Error ({time_of_day})",
			message=f"Critical error in {time_of_day} incomplete_tasks_reminder: \n\n {str(e)}",
		)
		return "Failed to process due to critical error."

	logger.info(f"Completed {time_of_day} incomplete_tasks_reminder execution")
	return "Emails sent successfully."


def generate_email_content_with_time(first_name, company_name, tasks, is_admin=False, time_of_day="morning"):
	"""Generate email content with time-specific messaging"""
	task_details = ""
	for index, task in enumerate(tasks, start=1):
		due_date_str = format_datetime(task.due_date, "dd-MM-yyyy 'at' HH:mm:ss") if task.due_date else "N/A"
		if is_admin:
			task_details += f"""
<tr>
    <td>{index}</td>
    <td>{task.task_name}</td>
    <td>{task.assigned_to}</td>
    <td>{due_date_str}</td>
</tr>
"""
		else:
			task_details += f"""
<tr>
    <td>{index}</td>
    <td>{task.task_name}</td>
    <td>{due_date_str}</td>
</tr>
"""

	table_headers = (
		"""
<tr>
    <th>#</th>
    <th>Task Name</th>
    <th>Assigned To</th>
    <th>Due Date</th>
</tr>
"""
		if is_admin
		else """
<tr>
    <th>#</th>
    <th>Task Name</th>
    <th>Due Date</th>
</tr>
"""
	)

	# Customize message based on time of day
	if time_of_day == "morning":
		if is_admin:
			time_message = (
				"Good morning! Here's your daily overview of your team's tasks scheduled for today."
			)
			action_message = "Please review task assignments, check progress, and ensure priorities are clearly communicated."
		else:
			time_message = "Good morning! Here's a quick reminder about your tasks planned for today."
			action_message = (
				"Please focus on your key priorities and aim to make steady progress. "
				"If you need help, don't hesitate to reach out to your team lead."
			)
	else:
		if is_admin:
			time_message = "Good evening! Here's a quick update on your team's pending tasks."
			action_message = (
				"Review any remaining items, follow up where needed, and plan next steps for tomorrow."
			)
		else:
			time_message = "Good evening! Here's a gentle reminder about your pending tasks for today."
			action_message = (
				"If you cannot complete these today, please update their status or reach out for assistance. "
			)

	return f"""
<html>
    <body style="font-family: Arial, sans-serif; color: #333333; line-height: 1.6;">
        <p>Dear {first_name},</p>
        <p>{time_message}</p>
        <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
            <thead style="background-color: #f2f2f2;">
                {table_headers}
            </thead>
            <tbody>
                {task_details}
            </tbody>
        </table>
        <p>{action_message}</p>
        <p>If you have any questions or need assistance, feel free to reach out.</p>
        <p>Best regards,<br/><strong>Clapgrow Team</strong></p>
    </body>
</html>
""".strip()


@frappe.whitelist(allow_guest=False)
def morning_incomplete_tasks_reminder():
	"""Morning reminder for incomplete tasks"""
	return incomplete_tasks_reminder_with_time(time_of_day="morning")


@frappe.whitelist(allow_guest=False)
def evening_incomplete_tasks_reminder():
	"""Evening reminder for incomplete tasks"""
	return incomplete_tasks_reminder_with_time(time_of_day="evening")


@frappe.whitelist(allow_guest=False)
def daily_recurring_task_reminder():
	"""Sends reminder notifications at 8 AM for recurring tasks due today."""
	try:
		companies_doc = frappe.get_all("CG Company", fields=["name"])

		if not companies_doc:
			frappe.logger().info("No companies found for recurring task reminder.")
			return

		today = getdate(nowdate())
		today_start, today_end = get_time_range(today)

		for company in companies_doc:
			company_id = company["name"]

			# Get all users in this company
			users = frappe.get_all(
				"CG User",
				filters={"company_id": company_id},
				fields=["name", "phone", "full_name", "email"],
			)

			for user in users:
				user_name = user["name"]
				user_phone = user["phone"]
				user_full_name = user["full_name"]
				user_email = user["email"]

				# Get recurring tasks due today for this user
				recurring_tasks = frappe.get_all(
					"CG Task Instance",
					filters={
						"task_type": "Recurring",
						"assigned_to": user_name,
						"due_date": ["between", [today_start, today_end]],
						"is_completed": 0,
						"status": ["!=", "Completed"],
					},
					fields=["name", "task_name", "due_date", "priority", "description"],
				)

				# Only send notification if user has recurring tasks due today
				if recurring_tasks:
					# Send WhatsApp notification using centralized system
					whatsapp_message = generate_recurring_task_reminder_message(
						user_full_name, recurring_tasks
					)
					if user_phone:
						send_whatsapp_notification_with_settings(
							user_phone,
							whatsapp_message,
							company_id,
							"recurring_reminder",
						)

					# Send email notification if user has valid email
					if is_valid_email(user_email):
						email_message = generate_recurring_task_reminder_email(
							user_full_name, recurring_tasks
						)
						email_args = {
							"recipients": [user_email],
							"subject": "Evening Reminder: Recurring Tasks Due Today",
							"message": email_message,
						}
						from clapgrow_app.api.whatsapp.notification_utils import (
							send_email_notification_with_settings,
						)

						send_email_notification_with_settings(email_args, company_id, "recurring_reminder")

	except Exception as e:
		frappe.log_error(message=frappe.get_traceback(), title="Daily Recurring Task Reminder Error")
		frappe.logger().error(f"Error in daily_recurring_task_reminder: {str(e)}")


def generate_recurring_task_reminder_message(user_name, tasks):
	"""Generates WhatsApp reminder message for recurring tasks due today in detailed format."""
	message_parts = []

	for task in tasks:
		due_datetime = parse_datetime(task.due_date) if task.due_date else None
		due_date_str = due_datetime.strftime("%d-%m-%Y") if due_datetime else "N/A"
		due_time_str = due_datetime.strftime("%H:%M:%S") if due_datetime else "N/A"

		base_url = frappe.utils.get_url()

		plain_description = task.description or "No description provided"

		message_parts.append(
			f"*Task*: {task.task_name}\n"
			f"*Open task*: {base_url}/clapgrow/task/{task.name}\n"
			f"*Details*: {plain_description}\n"
			f"*Due Date*: {due_date_str} at {due_time_str}\n"
			f"*Frequency*: Recurring\n"
			f"*Priority*: {task.priority or 'Not set'}"
		)

	tasks_str = "\n\n".join(message_parts)

	return (
		f"Hello {user_name} 🚀,\n"
		f"This is your reminder for recurring tasks due today.\n\n"
		f"{tasks_str}\n\n"
		f"Please ensure these tasks are completed before the day ends."
	)


def generate_recurring_task_reminder_email(full_name, tasks):
	"""Generates email content for recurring task reminder."""
	task_lines = []
	for task in tasks:
		due_time_str = ""
		if task.due_date:
			due_datetime = parse_datetime(task.due_date)
			if due_datetime.time() != time.min:
				due_time_str = f" at {due_datetime.strftime('%I:%M %p')}"
			else:
				due_time_str = " (End of day)"

		task_lines.append(
			f"<li><strong>{task.task_name}</strong><br>"
			f"Due: Today{due_time_str}<br>"
			f"{task.description[:100] + '...' if task.description and len(task.description) > 100 else task.description or 'No description'}</li>"
		)

	first_name = full_name.split(" ")[0] if full_name else "User"
	task_list = "<ul>" + "".join(task_lines) + "</ul>"

	# Fetch the image URL from File doctype
	file = frappe.get_all(
		"File",
		filters={"file_name": "clapgrow_email_cover.jpg"},
		fields=["file_url"],
	)
	image_url = file[0].file_url if file else "/files/clapgrow_email_cover.jpg"

	return f"""
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
						<h1 style="font-size: 16px; font-weight: 500; margin: 0 0 16px; color: #202124;">🔄 Evening Reminder: Recurring Tasks Due Today</h1>
						<p style="margin: 0 0 16px; font-size: 14px; line-height: 22px; color: #202124;">
							Dear {first_name},
						</p>
						<p style="margin: 0 0 16px; font-size: 14px; line-height: 22px; color: #202124;">
							This is your evening reminder for <strong>{len(tasks)} recurring task(s)</strong> that are due today:
						</p>
						{task_list}
						<p style="margin: 16px 0; font-size: 14px; line-height: 22px; color: #202124;">
							Please ensure these recurring tasks are completed before the day ends. If you need assistance or have any questions, please don't hesitate to reach out.
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


def notify_on_comment(doc, method):
	"""Send WhatsApp and email notifications to assigned_to user when a comment is added to CG Task Instance."""
	try:
		if doc.reference_doctype != "CG Task Instance":
			return

		if not doc.reference_name:
			return

		try:
			task = frappe.get_doc("CG Task Instance", doc.reference_name)
		except frappe.DoesNotExistError:
			return

		if not task:
			return

		assigned_user = frappe.get_doc("User", task.assigned_to)
		assignee_user = frappe.get_doc("User", task.assignee)
		if not assigned_user or not assigned_user.mobile_no:
			frappe.log_error(
				message=f"Assigned user {task.assigned_to} not found or no mobile number for user {assigned_user.name}.",
				title="Comment Notification Error",
			)
			return

		company_id = task.company_id
		commenting_user_full_name = (
			frappe.get_value("User", frappe.session.user, "full_name") or frappe.session.user
		)

		# Add subtask indicator for messages
		task_type_text = "subtask" if getattr(task, "is_subtask", 0) else "task"

		message = ""
		if task.task_type == "Onetime" and task.is_help_ticket == 0:
			message = (
				f"Hello {assignee_user.full_name}, \n\n"
				f"A new comment has been added to your {task_type_text} on Clapgrow. \n\n"
				f"*Task*: {task.task_name} \n"
				f"*Comment*: {doc.content} \n"
				f"*Commented By*: {commenting_user_full_name} \n\n"
				f"Please review the comment and make any necessary updates to your {task_type_text}."
			)
		elif task.task_type == "Recurring":
			message = (
				f"Hello {assignee_user.full_name}, \n\n"
				f"A new comment has been added to your recurring task on Clapgrow. \n\n"
				f"*Task*: {task.task_name} \n"
				f"*Comment*: {doc.content} \n"
				f"*Commented By*: {commenting_user_full_name} \n\n"
				f"Please review the comment and make any necessary updates to your task."
			)
		elif task.task_type == "Onetime" and task.is_help_ticket == 1:
			message = (
				f"Hello {assignee_user.full_name}, \n\n"
				f"{commenting_user_full_name} has commented on a help ticket.\n\n"
				f"*Ticket ID*: {task.name} \n"
				f"*Subject*: {task.task_name} \n"
				f"*Ticket Details*: {task.description or 'No description provided'} \n"
				f"*Comment*: {doc.content} \n"
				f"*Commented By*: {datetime.now().replace(microsecond=0)}"
			)
		elif task.task_type == "Process":
			message = (
				f"Hello {assignee_user.full_name}, \n\n"
				f"A new comment has been added to your process task on Clapgrow. \n\n"
				f"*Task*: {task.task_name} \n"
				f"*Comment*: {doc.content} \n"
				f"*Commented By*: {commenting_user_full_name} \n\n"
				f"Please review the comment and make any necessary updates to your task."
			)
		else:
			frappe.log_error(
				message=f"Invalid task_type ('{task.task_type}') or is_help_ticket ('{task.is_help_ticket}') combination for task {task.name} for comment notification.",
				title="Comment Notification Logic Error",
			)
			return

		# Send WhatsApp notification using centralized system
		send_whatsapp_notification_with_settings(assignee_user.mobile_no, message, company_id, "task_comment")

		# Email notification
		if assignee_user.email:
			# Fetch the image URL from File doctype
			file = frappe.get_all(
				"File",
				filters={"file_name": "clapgrow_email_cover.jpg"},
				fields=["file_url"],
			)
			image_url = file[0].file_url if file else "/files/clapgrow_email_cover.jpg"

			subject = f"💬 New Comment Added to Your {task_type_text.title()} on Clapgrow"
			message_content = (
				f"<p style='margin: 0 0 16px; font-size: 14px; line-height: 22px; color: #202124;'>"
				f"</p>"
				f"<ul style='margin: 0; padding-left: 20px; font-size: 14px; line-height: 22px; color: #202124;'>"
				f"<li><strong>📌 Task</strong>: {task.task_name}</li>"
				f"<li><strong>💬 Comment</strong>: {doc.content}</li>"
				f"<li><strong>👤 By</strong>: {commenting_user_full_name}</li>"
				f"</ul>"
				f"<p style='margin: 16px 0; font-size: 14px; line-height: 22px; color: #202124;'>"
				f"Please review the comment and make any necessary updates to your {task_type_text}. Let us know if you need any assistance."
				f"</p>"
				f"<p style='margin: 16px 0; font-size: 14px; line-height: 22px; color: #202124;'>"
				f"If you have any questions or need assistance, please reach out to <a href='mailto:techtools@clapgrow.com' style='color: #1a73e8; text-decoration: none;'>techtools@clapgrow.com</a>."
				f"</p>"
			)

			html_message = f"""
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
								<p style="margin: 0 0 16px; font-size: 14px; line-height: 22px; color: #202124;">
									Dear {assignee_user.full_name},
								</p>
								{message_content}
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

			email_args = {
				"recipients": [assignee_user.email],
				"subject": subject,
				"message": html_message,
				"header": [subject, "blue"],
			}

			from clapgrow_app.api.whatsapp.notification_utils import (
				send_email_notification_with_settings,
			)

			send_email_notification_with_settings(email_args, company_id, "task_comment")
		else:
			frappe.log_error(
				message=f"No email found for assigned user {assigned_user.name} in task {task.name}.",
				title="Comment Email Notification Error",
			)

	except frappe.DoesNotExistError:
		pass
	except Exception as e:
		frappe.log_error(
			message=f"Unexpected error in notify_on_comment: {str(e)}\nTraceback: {frappe.get_traceback()}",
			title="Comment Notification General Error",
		)


def handle_comment_added(doc, method):
	"""Emit a real-time event when a comment is added to Custom Task."""
	if doc.reference_doctype != "CG Task Instance":
		return

	frappe.publish_realtime(
		event="custom_task_commented",
		message={
			"doc_name": doc.name,
			"comment": doc.content,
			"comment_time": doc.creation,
		},
		user=doc.reference_owner,
	)

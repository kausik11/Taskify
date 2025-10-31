import logging

import frappe

logger = logging.getLogger(__name__)

# Mapping of notification types to their field prefixes in CG Notification Setting
NOTIFICATION_TYPE_MAPPING = {
	"task_assigned": "ta",
	"upcoming_task": "ut",
	"overdue_task": "ot",
	"summary_digest": "sd",
	"weekly_score": "ws",
	"mis_score": "ms",
	"default_reminder": "dr",
	"task_completion": "ta",  # Using task_assigned settings for completion
	"task_comment": "ta",  # Using task_assigned settings for comments
	"task_update": "ta",  # Using task_assigned settings for updates
	"user_creation": "ta",  # Using task_assigned settings for user creation
	"recurring_reminder": "ut",  # Using upcoming_task settings for recurring reminders
	"task_paused": "ta",  # Using task_assigned settings for paused tasks
	"task_rejected": "ta",  # Using task_assigned settings for rejected tasks
	"task_reopened": "ta",  # Using task_assigned settings for reopened tasks
	"subtask_completed": "ta",  # Using task_assigned settings for subtask completion
	"recurring_task_completion": "rtc",
	"onetime_task_completion": "otc",
	"task_deletion": "td",
	"process_notification": "pn",
}


def get_notification_settings(company_id, notification_type):
	"""
	Get notification settings for a specific company and notification type.

	Args:
	    company_id (str): Company ID
	    notification_type (str): Type of notification (e.g., 'task_assigned', 'upcoming_task', etc.)

	Returns:
	    dict: Dictionary with 'enabled', 'whatsapp_enabled', 'email_enabled' keys
	"""
	try:
		# Get the field prefix for this notification type
		field_prefix = NOTIFICATION_TYPE_MAPPING.get(notification_type)
		if not field_prefix:
			logger.warning(f"Unknown notification type: {notification_type}")
			return {"enabled": False, "whatsapp_enabled": False, "email_enabled": False}

		# Get notification settings for the company
		settings = frappe.get_value(
			"CG Notification Setting",
			filters={"company_id": company_id},
			fieldname=[
				f"{field_prefix}_on",
				f"{field_prefix}_wa",
				f"{field_prefix}_email",
			],
			as_dict=True,
		)

		if not settings:
			logger.info(
				f"No notification settings found for company {company_id}, allowing all notifications"
			)
			return {"enabled": True, "whatsapp_enabled": True, "email_enabled": True}

		return {
			"enabled": bool(settings.get(f"{field_prefix}_on", 0)),
			"whatsapp_enabled": bool(settings.get(f"{field_prefix}_wa", 0)),
			"email_enabled": bool(settings.get(f"{field_prefix}_email", 0)),
		}

	except Exception as e:
		logger.error(f"Error getting notification settings for company {company_id}: {str(e)}")
		# Default to allowing notifications if there's an error
		return {"enabled": True, "whatsapp_enabled": True, "email_enabled": True}


def should_send_notification(company_id, notification_type, medium):
	"""
	Check if a notification should be sent based on company settings.

	Args:
	    company_id (str): Company ID
	    notification_type (str): Type of notification
	    medium (str): 'whatsapp' or 'email'

	Returns:
	    bool: True if notification should be sent, False otherwise
	"""
	settings = get_notification_settings(company_id, notification_type)

	if not settings["enabled"]:
		logger.info(f"Notification type {notification_type} is disabled for company {company_id}")
		return False

	if medium == "whatsapp" and not settings["whatsapp_enabled"]:
		logger.info(f"WhatsApp notifications for {notification_type} are disabled for company {company_id}")
		return False

	if medium == "email" and not settings["email_enabled"]:
		logger.info(f"Email notifications for {notification_type} are disabled for company {company_id}")
		return False

	return True


def send_whatsapp_notification_with_settings(phone_number, notification, company_id, notification_type):
	"""
	Send WhatsApp notification only if settings allow it.

	Args:
	    phone_number (str): Phone number to send to
	    notification (str): Message content
	    company_id (str): Company ID
	    notification_type (str): Type of notification
	"""
	if should_send_notification(company_id, notification_type, "whatsapp"):
		from clapgrow_app.api.whatsapp.notify import enqueue_send_whatsapp_notification

		enqueue_send_whatsapp_notification(phone_number, notification, company_id)
	else:
		logger.info(f"WhatsApp notification skipped for {notification_type} in company {company_id}")


def send_email_notification_with_settings(email_args, company_id, notification_type):
	"""
	Send email notification only if settings allow it.

	Args:
	    email_args (dict): Email arguments for frappe.sendmail
	    company_id (str): Company ID
	    notification_type (str): Type of notification
	"""
	if should_send_notification(company_id, notification_type, "email"):
		from frappe.utils.background_jobs import enqueue

		enqueue(method=frappe.sendmail, queue="short", timeout=300, **email_args)
	else:
		logger.info(f"Email notification skipped for {notification_type} in company {company_id}")


def get_notification_frequency_settings(company_id, notification_type):
	"""
	Get frequency settings for digest-type notifications.

	Args:
	    company_id (str): Company ID
	    notification_type (str): Type of notification

	Returns:
	    str: Frequency setting ('Daily', 'Weekly', 'Monthly')
	"""
	try:
		field_prefix = NOTIFICATION_TYPE_MAPPING.get(notification_type)
		if not field_prefix:
			return "Weekly"  # Default

		# Get frequency setting if it exists
		frequency_field = f"{field_prefix}_freq"
		settings = frappe.get_value(
			"CG Notification Setting",
			filters={"company_id": company_id},
			fieldname=frequency_field,
		)

		return settings or "Weekly"

	except Exception as e:
		logger.error(f"Error getting frequency settings for company {company_id}: {str(e)}")
		return "Weekly"


def get_notification_time_settings(company_id, notification_type):
	"""
	Get time settings for scheduled notifications.

	Args:
	    company_id (str): Company ID
	    notification_type (str): Type of notification

	Returns:
	    str: Time setting ('08:00', '12:00', '16:00', '20:00')
	"""
	try:
		field_prefix = NOTIFICATION_TYPE_MAPPING.get(notification_type)
		if not field_prefix:
			return "08:00"  # Default

		# Get time setting if it exists
		time_field = f"{field_prefix}_time"
		settings = frappe.get_value(
			"CG Notification Setting",
			filters={"company_id": company_id},
			fieldname=time_field,
		)

		return settings or "08:00"

	except Exception as e:
		logger.error(f"Error getting time settings for company {company_id}: {str(e)}")
		return "08:00"


def send_process_notification(task_instance, workflow_name=None):
	"""
	Send process notification using workflow-specific templates.

	Args:
	    task_instance: CG Task Instance document
	    workflow_name (str, optional): Name of the workflow to get templates from
	"""
	try:
		# Check if process notifications are enabled
		if not should_send_notification(
			task_instance.company_id, "process_notification", "email"
		) and not should_send_notification(task_instance.company_id, "process_notification", "whatsapp"):
			logger.info(f"Process notifications disabled for company {task_instance.company_id}")
			return

		# Get user details
		try:
			assigned_user = frappe.get_doc("CG User", task_instance.assigned_to)
		except frappe.DoesNotExistError:
			logger.warning(f"Assigned user {task_instance.assigned_to} not found")
			return

		# Get workflow and templates if workflow_name provided
		workflow_doc = None
		if workflow_name:
			try:
				workflow_doc = frappe.get_doc("Clapgrow Workflow", workflow_name)
			except frappe.DoesNotExistError:
				logger.warning(f"Workflow {workflow_name} not found")

		# Get template context
		context = get_template_context(task_instance, assigned_user, workflow_doc)

		# Send email notification
		if should_send_notification(task_instance.company_id, "process_notification", "email"):
			send_process_email_notification(assigned_user, context, workflow_doc, task_instance.company_id)

		# Send WhatsApp notification
		if should_send_notification(task_instance.company_id, "process_notification", "whatsapp"):
			send_process_whatsapp_notification(assigned_user, context, workflow_doc, task_instance.company_id)

	except Exception as e:
		frappe.log_error(
			message=f"Error sending process notification for task {task_instance.name}: {str(e)}",
			title="Process Notification Error",
		)


def get_template_context(task_instance, assigned_user, workflow_doc=None):
	"""
	Get context variables for template rendering.
	"""
	try:
		assignee_user = frappe.get_doc("CG User", task_instance.assignee) if task_instance.assignee else None
		company_doc = (
			frappe.get_doc("CG Company", task_instance.company_id) if task_instance.company_id else None
		)

		return {
			"task_name": task_instance.task_name or "N/A",
			"assigned_to": assigned_user.full_name or assigned_user.name,
			"assignee": assignee_user.full_name if assignee_user else "N/A",
			"due_date": task_instance.due_date.strftime("%d-%m-%Y %H:%M:%S")
			if task_instance.due_date
			else "N/A",
			"description": frappe.utils.strip_html_tags(task_instance.description)
			if task_instance.description
			else "N/A",
			"company_name": company_doc.company_name if company_doc else "N/A",
			"workflow_name": workflow_doc.title if workflow_doc else "N/A",
			"task_link": f"{frappe.utils.get_url()}/clapgrow/task/{task_instance.name}",
		}
	except Exception as e:
		logger.error(f"Error building template context: {str(e)}")
		return {}


def send_process_email_notification(assigned_user, context, workflow_doc, company_id):
	"""
	Send email notification using workflow template or default template.
	"""
	try:
		if not assigned_user.email:
			logger.warning(f"No email found for user {assigned_user.name}")
			return

		# Use workflow template or default
		if workflow_doc and workflow_doc.notification_template:
			email_content = frappe.render_template(workflow_doc.notification_template, context)
			subject = f"Process Task: {context['task_name']} - {context['workflow_name']}"
		else:
			# Default email template
			email_content = get_default_process_email_template(context)
			subject = f"Process Task Assigned: {context['task_name']}"

		# Fetch the image URL from File doctype
		file = frappe.get_all(
			"File",
			filters={"file_name": "clapgrow_email_cover.jpg"},
			fields=["file_url"],
		)
		image_url = file[0].file_url if file else "/files/clapgrow_email_cover.jpg"

		# Wrap content in email layout
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
							<h1 style="font-size: 16px; font-weight: 500; margin: 0 0 16px; color: #202124;">{subject}</h1>
							{email_content}
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
			"recipients": [assigned_user.email],
			"subject": subject,
			"message": html_message,
			"header": [subject, "blue"],
		}

		send_email_notification_with_settings(email_args, company_id, "process_notification")

	except Exception as e:
		frappe.log_error(
			message=f"Error sending process email notification: {str(e)}",
			title="Process Email Notification Error",
		)


def send_process_whatsapp_notification(assigned_user, context, workflow_doc, company_id):
	"""
	Send WhatsApp notification using workflow template or default template.
	"""
	try:
		if not assigned_user.phone:
			logger.warning(f"No phone found for user {assigned_user.name}")
			return

		# Use workflow template or default
		if workflow_doc and workflow_doc.whatsapp_notification_template:
			message = frappe.render_template(workflow_doc.whatsapp_notification_template, context)
		else:
			# Default WhatsApp template
			message = get_default_process_whatsapp_template(context)

		send_whatsapp_notification_with_settings(
			assigned_user.phone, message, company_id, "process_notification"
		)

	except Exception as e:
		frappe.log_error(
			message=f"Error sending process WhatsApp notification: {str(e)}",
			title="Process WhatsApp Notification Error",
		)


def get_default_process_email_template(context):
	"""
	Get default email template for process notifications.
	"""
	return f"""
	<p style="margin: 0 0 16px; font-size: 14px; line-height: 22px; color: #202124;">
		Dear {context["assigned_to"]},
	</p>
	<p style="margin: 0 0 16px; font-size: 14px; line-height: 22px; color: #202124;">
		You have been assigned a new process task on Clapgrow! Please find the details below:
	</p>
	<ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 22px; color: #202124;">
		<li><strong>📌 Task</strong>: {context["task_name"]}</li>
		<li><strong>🔗 Open Task</strong>: <a href="{context["task_link"]}" style="color: #1a73e8; text-decoration: none;">Click here</a></li>
		<li><strong>📝 Details</strong>: {context["description"]}</li>
		<li><strong>📅 Due Date</strong>: {context["due_date"]}</li>
		<li><strong>👤 Assigned By</strong>: {context["assignee"]}</li>
		<li><strong>🏢 Company</strong>: {context["company_name"]}</li>
	</ul>
	<p style="margin: 16px 0; font-size: 14px; line-height: 22px; color: #202124;">
		Please go through the process steps and ensure completion as per the guidelines.
	</p>
	<p style="margin: 16px 0; font-size: 14px; line-height: 22px; color: #202124;">
		If you have any questions or need assistance, please reach out to <a href="mailto:techtools@clapgrow.com" style="color: #1a73e8; text-decoration: none;">techtools@clapgrow.com</a>.
	</p>
	"""


def get_default_process_whatsapp_template(context):
	"""
	Get default WhatsApp template for process notifications.
	"""
	return f"""Hello {context["assigned_to"]},

You've been assigned a new process task on Clapgrow!

*Process*: {context["task_name"]}
*Open task*: {context["task_link"]}
*Details*: {context["description"]}
*Due Date*: {context["due_date"]}
*Assigned By*: {context["assignee"]}

Please go through the process steps and ensure completion as per the guidelines."""

# Copyright (c) 2025, Clapgrow and contributors
# For license information, please see license.txt

import frappe
from frappe import _

from clapgrow_app.api.whatsapp.notification_utils import (
	send_email_notification_with_settings,
	send_whatsapp_notification_with_settings,
	should_send_notification,
)
from clapgrow_app.api.whatsapp.notify import html_to_text


def send_workflow_step_notifications(task_doc):
	"""
	Send notifications when a workflow step task is completed.
	Checks if the task is part of a workflow and sends notifications based on node configuration.

	Args:
	    task_doc: CG Task Instance document or dict that was completed
	"""
	try:
		# Convert dict to document if needed (for background job compatibility)
		if isinstance(task_doc, dict):
			task_doc = frappe.get_doc("CG Task Instance", task_doc.get("name"))

		# Check if this task is part of a workflow
		mapping = frappe.db.get_value(
			"Clapgrow Workflow Task Mapping",
			{"task_name": task_doc.name},
			["node", "workflow", "execution_log", "node_index"],
			as_dict=True,
		)

		if not mapping:
			frappe.logger().debug(
				f"Task {task_doc.name} is not part of a workflow, skipping workflow notifications"
			)
			return

		# Get the node type configuration
		node_type = frappe.get_doc("Clapgrow Node Type", mapping.node)

		# Check if notifications are configured - EARLY VALIDATION
		if not node_type.notification_channel:
			frappe.logger().debug(f"No notification channel configured for node {mapping.node}")
			return

		if not node_type.notification_template:
			frappe.logger().warning(f"No notification template configured for node {mapping.node}")
			return

		if not node_type.notification_recipient or len(node_type.notification_recipient) == 0:
			frappe.logger().warning(f"No notification recipients configured for node {mapping.node}")
			return

		# Get context for template rendering
		context = get_notification_context(task_doc, node_type, mapping)

		# Render the notification template
		try:
			notification_html = frappe.render_template(node_type.notification_template, context)
			frappe.logger().debug(
				f"Rendered notification template for node {mapping.node}: {notification_html[:100]}..."
			)
		except Exception as e:
			frappe.log_error(
				message=f"Error rendering notification template for node {mapping.node}: {str(e)}\n\nTemplate:\n{node_type.notification_template}\n\nContext:\n{frappe.as_json(context, indent=2)}",
				title="Notification Template Rendering Error",
			)
			return

		# Get all recipients
		recipients = get_notification_recipients(node_type, task_doc, mapping)

		if not recipients:
			frappe.logger().warning(f"No valid recipients found for node {mapping.node}")
			return

		# Send notifications based on channel
		channel = node_type.notification_channel
		company_id = task_doc.company_id
		notification_count = {"whatsapp": 0, "email": 0}
		notification_type = "process_notification"

		for recipient in recipients:
			try:
				# Send WhatsApp notification
				if channel in ["Whatsapp", "Both"] and recipient.get("phone"):
					if should_send_notification(company_id, notification_type, "whatsapp"):
						# Convert HTML to WhatsApp-compatible text
						whatsapp_message = html_to_text(notification_html)

						send_whatsapp_notification_with_settings(
							recipient.get("phone"),
							whatsapp_message,
							company_id,
							notification_type,
						)
						notification_count["whatsapp"] += 1
						frappe.logger().info(
							f"Sent WhatsApp notification to {recipient.get('name')} for task {task_doc.name}"
						)

				# Send Email notification
				if channel in ["Email", "Both"] and recipient.get("email"):
					if should_send_notification(company_id, notification_type, "email"):
						# Use HTML message for email
						email_subject = f"Workflow Notification - {task_doc.task_name}"

						# Wrap in email template if needed
						email_html = wrap_in_email_template(notification_html, email_subject)

						email_args = {
							"recipients": [recipient.get("email")],
							"subject": email_subject,
							"message": email_html,
						}
						send_email_notification_with_settings(
							email_args,
							company_id,
							notification_type,
						)
						notification_count["email"] += 1
						frappe.logger().info(
							f"Sent email notification to {recipient.get('name')} for task {task_doc.name}"
						)

			except Exception as e:
				frappe.log_error(
					message=f"Error sending {notification_type} to {recipient.get('name', 'Unknown')} for task {task_doc.name}: {str(e)}",
					title="Workflow Notification Error",
				)
				continue

		frappe.logger().info(
			f"Sent workflow notifications for task {task_doc.name}: "
			f"{notification_count['whatsapp']} WhatsApp, {notification_count['email']} Email"
		)

	except Exception as e:
		frappe.log_error(
			message=f"Error in send_workflow_step_notifications for task {task_doc.name}: {str(e)}\n{frappe.get_traceback()}",
			title="Workflow Step Notification Error",
		)


def get_notification_context(task_doc, node_type, mapping):
	"""
	Build context for notification template rendering.
	Returns a dict with all necessary variables for Jinja templates.
	"""
	try:
		execution_log = frappe.get_doc("Clapgrow Workflow Execution Log", mapping.execution_log)
		initial_context = frappe.parse_json(execution_log.initial_context)

		# Get main document (event document that triggered workflow)
		doc = frappe._dict()
		if initial_context.get("doctype") and initial_context.get("docname"):
			try:
				main_doc = frappe.get_doc(initial_context["doctype"], initial_context["docname"])
				doc = frappe._dict(main_doc.as_dict())
			except Exception as e:
				frappe.logger().warning(f"Could not load main document: {str(e)}")

		# Get current step form data (attached form to this task)
		step = frappe._dict()
		if task_doc.attached_form and task_doc.attached_docname:
			try:
				step_doc = frappe.get_doc(task_doc.attached_form, task_doc.attached_docname)
				step = frappe._dict(step_doc.as_dict())
			except Exception as e:
				frappe.logger().warning(f"Could not load step form: {str(e)}")

		# Get previous steps data - structured by step form names
		prev_steps = {}
		prev_steps_list = []  # Keep original list structure for backward compatibility
		try:
			previous_mappings = frappe.get_all(
				"Clapgrow Workflow Task Mapping",
				filters={
					"workflow": mapping.workflow,
					"execution_log": mapping.execution_log,
					"node_index": ["<", mapping.node_index],
				},
				fields=["task_name", "node", "node_index"],
				order_by="node_index asc",
			)

			for prev_mapping in previous_mappings:
				try:
					prev_task = frappe.get_doc("CG Task Instance", prev_mapping.task_name)
					prev_step_data = frappe._dict()

					if prev_task.attached_form and prev_task.attached_docname:
						prev_step_doc = frappe.get_doc(prev_task.attached_form, prev_task.attached_docname)
						prev_step_data = frappe._dict(prev_step_doc.as_dict())

						# Create step form key (convert to lowercase with underscores)
						import re

						step_form_key = re.sub(r"\s+", "_", prev_task.attached_form).lower()
						prev_steps[step_form_key] = prev_step_data

					# Also maintain the original list structure
					prev_steps_list.append(
						frappe._dict(
							{
								"node": prev_mapping.node,
								"task": frappe._dict(prev_task.as_dict()),
								"form": prev_step_data,
							}
						)
					)
				except Exception as e:
					frappe.logger().warning(f"Could not load previous step {prev_mapping.node}: {str(e)}")
					continue
		except Exception as e:
			frappe.logger().warning(f"Could not load previous steps: {str(e)}")

		# Get workflow document
		workflow_doc = frappe._dict()
		try:
			workflow = frappe.get_doc("Clapgrow Workflow", mapping.workflow)
			workflow_doc = frappe._dict(workflow.as_dict())
		except Exception as e:
			frappe.logger().warning(f"Could not load workflow document: {str(e)}")

		# Build comprehensive context
		context = {
			"doc": doc,  # Main workflow document
			"step": step,  # Current step form data
			"prev_steps": prev_steps,  # Previous steps structured by step form names (e.g., prev_steps.send_customer_data.email)
			"prev_steps_list": prev_steps_list,  # Original list structure for backward compatibility
			"task": frappe._dict(task_doc.as_dict()),  # Current task instance
			"workflow": workflow_doc,  # Workflow configuration
			"node": frappe._dict(node_type.as_dict()),  # Current node configuration
		}

		return context

	except Exception as e:
		frappe.log_error(
			message=f"Error building notification context: {str(e)}\n{frappe.get_traceback()}",
			title="Notification Context Error",
		)
		# Return minimal context to prevent complete failure
		return {
			"doc": frappe._dict(),
			"step": frappe._dict(),
			"prev_steps": {},
			"prev_steps_list": [],
			"task": (
				frappe._dict(task_doc.as_dict()) if hasattr(task_doc, "as_dict") else frappe._dict(task_doc)
			),
			"workflow": frappe._dict(),
			"node": frappe._dict(),
		}


def get_notification_recipients(node_type, task_doc, mapping):
	"""
	Extract recipient information from notification_recipient table.
	Returns a list of dicts with 'name', 'email', and 'phone' keys.
	"""
	recipients = []

	for idx, recipient_row in enumerate(node_type.notification_recipient):
		try:
			if recipient_row.recipient_type == "Static User":
				recipient_data = {"name": None, "email": None, "phone": None}

				if recipient_row.static_recipient:
					try:
						user = frappe.get_doc("User", recipient_row.static_recipient)
						recipient_data = {
							"name": user.full_name or user.name,
							"email": user.email,
							"phone": user.mobile_no or user.phone,
						}
					except frappe.DoesNotExistError:
						frappe.logger().warning(
							f"Static recipient {recipient_row.static_recipient} not found"
						)

				# Override with explicitly provided values
				if recipient_row.static_email:
					recipient_data["email"] = recipient_row.static_email
				if recipient_row.static_phone and recipient_row.static_phone != "+91-":
					recipient_data["phone"] = recipient_row.static_phone

				if recipient_data.get("email") or recipient_data.get("phone"):
					if not recipient_data["name"]:
						recipient_data["name"] = recipient_data.get("email") or recipient_data.get("phone")
					recipients.append(recipient_data)

			elif recipient_row.recipient_type == "From Form Field":
				if recipient_row.recipient_field_doctype:
					email = None
					phone = None
					doc_to_check = None

					execution_log = frappe.get_doc("Clapgrow Workflow Execution Log", mapping.execution_log)
					initial_context = frappe.parse_json(execution_log.initial_context)

					# Check main document
					if recipient_row.recipient_field_doctype == initial_context.get("doctype"):
						try:
							doc_to_check = frappe.get_doc(
								initial_context["doctype"], initial_context["docname"]
							)
						except Exception as e:
							frappe.logger().warning(f"Could not get main doc: {str(e)}")

					# Check current step form
					elif (
						task_doc.attached_form
						and recipient_row.recipient_field_doctype == task_doc.attached_form
					):
						try:
							doc_to_check = frappe.get_doc(task_doc.attached_form, task_doc.attached_docname)
						except Exception as e:
							frappe.logger().warning(f"Could not get step form: {str(e)}")

					# Check previous steps
					else:
						prev_mappings = frappe.get_all(
							"Clapgrow Workflow Task Mapping",
							filters={
								"workflow": mapping.workflow,
								"execution_log": mapping.execution_log,
								"node_index": ["<", mapping.node_index],
							},
							fields=["task_name"],
							order_by="node_index desc",
							limit=20,
						)

						for prev_mapping in prev_mappings:
							try:
								prev_task = frappe.get_doc("CG Task Instance", prev_mapping.task_name)
								if (
									prev_task.attached_form == recipient_row.recipient_field_doctype
									and prev_task.attached_docname
								):
									doc_to_check = frappe.get_doc(
										prev_task.attached_form,
										prev_task.attached_docname,
									)
									break
							except Exception:
								continue

					# Extract email and phone from the document fields
					if doc_to_check:
						if recipient_row.email_field:
							email = doc_to_check.get(recipient_row.email_field)
						if recipient_row.phone_field:
							phone = doc_to_check.get(recipient_row.phone_field)

						if email or phone:
							recipient_name = email or phone or "Unknown"
							# Try to extract name from email
							if email and "@" in email:
								recipient_name = email.split("@")[0].replace(".", " ").title()

							recipients.append(
								{
									"name": recipient_name,
									"email": email,
									"phone": phone,
								}
							)

		except Exception as e:
			frappe.log_error(
				message=f"Error processing recipient row {idx + 1}: {str(e)}",
				title="Recipient Processing Error",
			)
			continue

	return recipients


def wrap_in_email_template(html_content, subject):
	"""
	Wrap the notification HTML in a standard email template.
	"""
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
						<h1 style="font-size: 16px; font-weight: 500; margin: 0 0 16px; color: #202124;">{subject}</h1>
						{html_content}
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

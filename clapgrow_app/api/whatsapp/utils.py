import base64
from datetime import datetime
from io import BytesIO

import frappe
import requests
from frappe import _
from PIL import Image

from clapgrow_app.api.error_classes import standard_response
from clapgrow_app.api.tasks.task_utils import handle_file_upload


@frappe.whitelist()
def create_whatsapp_instance():
	user_doc = frappe.get_doc("CG User", frappe.session.user, fields=["company_id"])
	company_id = user_doc.company_id

	existing_instance = frappe.get_all("Whatsapp Instance", filters={"company_id": company_id})
	if existing_instance:
		return {"status": "success", "instance_id": existing_instance[0].name}

	settings = frappe.get_doc("Whatsapp Setting", company_id)
	token = settings.wa_api_token

	headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
	url = settings.wa_api_url

	response = requests.post(url, headers=headers)

	if response.status_code == 201:
		data = response.json().get("instance", {})

		# Extract fields from API response
		instance_id = data.get("id", None)
		owner = data.get("owner", "")
		webhook_url = data.get("webhook_url", None)
		webhook_events = ", ".join(data.get("webhook_events", []))
		is_trial = True if data.get("is_trial", 0) == 1 else False
		status = data.get("status", "")

		# Create and save the WhatsApp Instance
		instance = frappe.get_doc(
			{
				"doctype": "Whatsapp Instance",
				"instance_id": instance_id,
				"instance_owner": owner,
				"webhook_url": webhook_url,
				"webhook_events": webhook_events,
				"is_trial": is_trial,
				"company_id": company_id,
				"status": status,
			}
		)
		instance.insert()
		setting_doc = frappe.get_doc("Whatsapp Setting", company_id)
		setting_doc.instance_id = instance.name
		setting_doc.save()
		frappe.db.commit()  # manual commit to commmit // nosemgrep

		return standard_response(
			success=True,
			data={"instance_id": instance.name},
			message="Instance created successfully",
			status_code=200,
		)
	else:
		frappe.throw(_("Failed to create WhatsApp instance."))


@frappe.whitelist()
def get_client_status(instance_id):
	user_doc = frappe.get_doc("CG User", frappe.session.user, fields=["company_id"])
	if not user_doc:
		return {"status": "error", "message": "Company ID is required."}

	company_id = user_doc.company_id
	settings = frappe.get_doc("Whatsapp Setting", company_id)
	token = settings.get("wa_api_token")
	headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
	url = f"https://waapi.app/api/v1/instances/{instance_id}/client/status"

	response = requests.get(url, headers=headers)

	if response.status_code == 200:
		return response.json()
	else:
		frappe.throw(_("Failed to fetch client status."))


@frappe.whitelist()
def get_qr_code(instance_id):
	settings = frappe.get_doc("Whatsapp Setting")
	token = settings.get("token")
	headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
	url = f"https://waapi.app/api/v1/instances/{instance_id}/client/qr"

	# API Request to fetch QR Code
	response = requests.get(url, headers=headers)

	if response.status_code == 200:
		data = response.json().get("qrCode", {}).get("data", {})
		# Save QR Code to the QR Code Doctype
		qr_doc = frappe.get_doc(
			{
				"doctype": "QR Code",
				"instance_id": instance_id,
				"qr_code": data.get("qr_code"),
				"status": data.get("status"),
			}
		)
		qr_doc.insert(ignore_permissions=True)

		return {"status": "success", "qr_code": data.get("qr_code")}
	else:
		frappe.throw(_("Failed to fetch QR code."))


@frappe.whitelist(allow_guest=False)
def webhook_handler(data):
	if data.get("event") == "qr":
		instance_id = data.get("instance_id")
		qr_data = data.get("qr_data")
		generated_on = data.get("generated_on") or frappe.utils.now()
		try:
			instance = frappe.get_doc("Whatsapp Instance", {"instance_id": instance_id})
			company_id = instance.company_id
		except frappe.DoesNotExistError:
			frappe.log_error(f"Instance ID {instance_id} not found", "Webhook QR Handler")
			return {"status": "error", "message": "Instance not found"}

		try:
			qr_code_doc = frappe.get_doc(
				{
					"doctype": "QR Code",
					"instance_id": instance_id,
					"company_id": company_id,
					"qr_code_data": qr_data,
					"generated_on": generated_on,
				}
			)
			qr_code_doc.insert(ignore_permissions=True)
			frappe.db.commit()  # manual commit to commmit // nosemgrep

			return {"status": "success", "message": "QR Code created successfully"}
		except Exception as e:
			frappe.log_error(f"Failed to create QR Code: {str(e)}", "Webhook QR Handler")
			return {"status": "error", "message": "Failed to create QR Code"}
	elif data.get("event") == "logged_in":
		# Existing logic for logged_in
		instance_id = data.get("instance_id")
		try:
			instance = frappe.get_doc("Whatsapp Instance", instance_id)
			instance.status = "Logged In"
			instance.save(ignore_permissions=True)
			frappe.db.commit()  # manual commit to commmit // nosemgrep

			# Notify users
			company_id = instance.company_id
			users = frappe.get_all(
				"User Permission",
				filters={"for_value": company_id, "allow": "CG Company"},
				fields=["user"],
			)
			for user in users:
				frappe.publish_realtime(
					event="whatsapp_instance_logged_in",
					message={"company_id": company_id, "instance_id": instance_id},
					user=user["user"],
				)
		except frappe.DoesNotExistError as e:
			frappe.log_error(_(str(e)))
			return {"status": "error", "message": _({str(e)})}
		except Exception as e:
			frappe.log_error(_({str(e)}))
			return {"status": "error", "message": _({str(e)})}


@frappe.whitelist()
def send_whatsapp_message(company_id, chat_id, message, media_url=None, media_caption=None):
	# Fetch the active WhatsApp instance for the company

	instances = frappe.get_all(
		"Whatsapp Instance", filters={"company_id": company_id, "status": "success"}, fields=["name"]
	)
	if instances:
		instance = frappe.get_doc("Whatsapp Instance", instances[0]["name"])

	settings = frappe.get_doc("Whatsapp Setting", {company_id})
	token = settings.get("wa_api_token")
	headers = {
		"Authorization": f"Bearer {token}",
		"Accept": "application/json",
		"Content-Type": "application/json",
	}
	url = f"https://waapi.app/api/v1/instances/{instance.name}/client/action/send-message"

	payload = {"chatId": chat_id, "message": message}
	if media_url:
		payload.update({"mediaUrl": media_url, "mediaCaption": media_caption})
	response = requests.post(url, json=payload, headers=headers)

	if response.status_code == 200:
		return response.json()
	else:
		frappe.throw(_("Failed to send WhatsApp message."))


@frappe.whitelist(allow_guest=False)
def fetch_and_save_qr_code():
	try:
		# Fetch WhatsApp Instance and related settings
		user_doc = frappe.get_doc("CG User", frappe.session.user)
		if not user_doc:
			return {"status": "error", "message": "Company ID is required."}

		company_id = user_doc.company_id
		instance = frappe.get_all("Whatsapp Instance", filters={"company_id": company_id}, fields=["name"])
		if not instance:
			return {"status": "error", "message": "WhatsApp instance not found for the company."}

		instance_id = instance[0].name
		whatsapp_setting = frappe.get_all(
			"Whatsapp Setting", filters={"company_id": company_id}, fields=["wa_api_url", "wa_api_token"]
		)

		if not whatsapp_setting:
			return {"status": "error", "message": "WhatsApp setting not found for the company."}

		api_url = f"{whatsapp_setting[0].wa_api_url}{instance_id}/client/qr"
		token = whatsapp_setting[0].wa_api_token

		response = requests.get(
			api_url, headers={"accept": "application/json", "authorization": f"Bearer {token}"}
		)

		if response.status_code != 200:
			return {
				"status": "error",
				"message": f"API request failed with status code {response.status_code}: {response.text}",
			}

		qr_data = response.json()
		qr_code_data = qr_data.get("qrCode", {}).get("data", {}).get("qr_code")

		if not qr_code_data:
			return {"status": "error", "message": "QR Code data is missing in the API response."}

		if not qr_code_data.startswith("data:image/png;base64,"):
			qr_code_data = "data:image/png;base64," + qr_code_data

		try:
			qr_code_image = base64.b64decode(qr_code_data.split(",")[1])
			image = Image.open(BytesIO(qr_code_image))

			img_byte_array = BytesIO()
			image.save(img_byte_array, format="PNG")
			img_byte_array.seek(0)

			file_data = {
				"filename": f"qr_code_{frappe.generate_hash()}.png",
				"content": img_byte_array.getvalue(),
				"content_length": len(img_byte_array.getvalue()),
			}
			qr_image_doc = handle_file_upload(instance[0], file_data)

			file_url = qr_image_doc.file_url
			qr_code_image_data = base64.b64encode(img_byte_array.getvalue()).decode("utf-8")

		except Exception as e:
			return {"status": "error", "message": f"Error processing QR code image: {str(e)}"}

		existing_qr_code = frappe.get_all(
			"QR Code", filters={"instance_id": instance_id, "company_id": company_id}, fields=["name"]
		)

		if existing_qr_code:
			qr_code_doc = frappe.get_doc("QR Code", existing_qr_code[0]["name"])
			qr_code_doc.update(
				{
					"qr_code_data": qr_code_data,
					"image": file_url,
				}
			)
			qr_code_doc.save(ignore_permissions=True)
		else:
			qr_code_doc = frappe.get_doc(
				{
					"doctype": "QR Code",
					"instance_id": instance_id,
					"company_id": company_id,
					"qr_code_data": qr_code_data,
					"generated_on": datetime.now(),
					"image": f"private/files/{file_url}",
				}
			)
			qr_code_doc.insert()

		frappe.db.commit()  # manual commit to commmit // nosemgrep
		return {
			"status": "success",
			"message": "QR Code fetched and saved successfully.",
			"qr_code_image": file_url,
			"qr_code_image_base64": f"data:image/png;base64,{qr_code_image_data}",
		}

	except frappe.DoesNotExistError as e:
		frappe.log_error(frappe.get_traceback(), "Instance or Settings Not Found")
		return {"status": "error", "message": f"Instance or settings not found: {str(e)}"}

	except Exception as e:
		frappe.log_error(frappe.get_traceback(), "Fetch and Save QR Code")
		return {"status": "error", "message": f"An error occurred: {str(e)}"}

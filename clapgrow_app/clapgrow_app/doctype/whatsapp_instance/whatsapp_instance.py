# Copyright (c) 2025, Clapgrow and contributors
# For license information, please see license.txt
from io import BytesIO

import frappe
import requests
from frappe.model.document import Document
from frappe.utils.file_manager import save_file


class WhatsappInstance(Document):
	def generate_qr_code(self):
		# Fetch the QR code URL from the WAAPI API
		url = self.get_authentication_url()

		# Make the GET request to fetch the QR code
		qr_response = self.fetch_qr_code(url)

		if qr_response:
			# Save the QR code as a file in Frappe
			self.qr_code = self.save_qr_code_image(qr_response)
			self.save()

	def get_authentication_url(self):
		"""
		Replace with the actual WAAPI URL to fetch the QR code.
		This URL will usually be dynamically created or fetched.
		"""
		# Construct the WAAPI URL dynamically if needed
		instance_id = self.name  # Assuming instance name is used to form URL
		return f"https://waapi.app/api/v1/instances/{instance_id}/client/qr"

	def fetch_qr_code(self, url):
		settings = frappe.get_doc("Whatsapp Setting")
		headers = {
			"accept": "application/json",
			"authorization": f"Bearer {settings.wa_api_token}",  # Fetch from settings
		}
		response = requests.get(url, headers=headers)
		if response.status_code == 200:
			return response.content
		else:
			frappe.throw(f"Failed to fetch QR code. Status code: {response.status_code}")

	def save_qr_code_image(self, image_data):
		"""
		Save the QR code image to Frappe as an attachment and return the file URL.
		"""
		file_name = "qr_code.png"
		file_doc = save_file(file_name, image_data, self.doctype, self.name, decode=True, is_private=1)

		return file_doc.file_url

import frappe


def override_notification_recipient_field(bootinfo):
	try:
		meta = frappe.get_meta("Notification Recipient")
		for field in meta.fields:
			if field.fieldname == "receiver_by_document_field":
				field.fieldtype = "Data"
				field.options = ""
				break
	except Exception:
		frappe.log_error(
			frappe.get_traceback(),
			"Failed to override Notification Recipient fieldtype",
		)

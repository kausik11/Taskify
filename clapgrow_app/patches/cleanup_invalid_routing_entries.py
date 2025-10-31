import frappe
from frappe import _


def execute():
	"""
	Patch to clean up invalid routing entries in Clapgrow Routing Configuration.
	"""
	try:
		if not frappe.db.exists("DocType", "Clapgrow Routing Configuration"):
			print("Clapgrow Routing Configuration DocType not found. Skipping patch.")
			return

		routing_config = frappe.get_single("Clapgrow Routing Configuration")
		invalid_entries = []

		for idx, row in enumerate(routing_config.routing):
			if row.doctype_name and not frappe.db.exists("DocType", row.doctype_name):
				invalid_entries.append({"idx": idx, "doctype_name": row.doctype_name, "label": row.label})
				print(f"Found invalid routing entry: Row #{idx + 1}: {row.doctype_name} ({row.label})")

		# Remove invalid entries
		if invalid_entries:
			for entry in reversed(invalid_entries):
				print(f"Removing invalid entry: {entry['doctype_name']}")
				routing_config.routing.pop(entry["idx"])

			routing_config.flags.ignore_validate = True
			routing_config.save()
			frappe.db.commit()
		else:
			frappe.log_error("✓ No invalid routing entries found. Configuration is clean.")

	except Exception:
		frappe.db.rollback()
		frappe.log_error(frappe.get_traceback(), "Patch: cleanup_invalid_routing_entries failed")
		# Don't raise the exception - let the patch complete
		# This way it won't block other patches from running

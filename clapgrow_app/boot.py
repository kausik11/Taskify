import frappe

from clapgrow_app.api.form.create_form import get_doctype_routing_map


def boot_session(bootinfo):
	"""
	Extend the boot session to include the routing map of all custom doctypes
	"""

	bootinfo.clapgrow_routing_map = get_doctype_routing_map()

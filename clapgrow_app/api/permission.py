import frappe


def has_app_permission(user=None):
	"""
	Check if user has permission to access Clapgrow app
	"""
	if not user:
		user = frappe.session.user

	# Deny access to guest users
	if user == "Guest":
		return False

	# Allow System Manager
	if "System Manager" in frappe.get_roles(user):
		return True

	# Check if user has access to any CG doctype
	cg_doctypes = ["CG User", "CG Company", "CG Task Instance", "CG Task Definition"]

	for doctype in cg_doctypes:
		if frappe.has_permission(doctype, "read", user=user):
			return True

	return False

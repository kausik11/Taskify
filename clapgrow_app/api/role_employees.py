import frappe
from frappe import _


@frappe.whitelist()
def get_filtered_employees(company_id, role_name, current_user):
	# Get role by role_name
	role = frappe.get_all(
		"CG Role",
		filters={"role_name": role_name.replace("ROLE-", "")},
		fields=["name"],
		limit=1,
	)

	if not role:
		frappe.log_error(f"No CG Role found for role_name: {role_name}")
		return []

	# Fetch the full document to access child table
	permissions = frappe.get_doc("CG Role", role[0].name)
	# permissions = role_doc.get("role_permission")[0] if role_doc.get("role_permission") else {}

	# Check assign permissions
	has_assign_permissions = (
		permissions.get("assign_self", 0)
		or permissions.get("assign_team_member", 0)
		or permissions.get("assign_team_lead", 0)
		or permissions.get("assign_admin", 0)
	)

	if not has_assign_permissions:
		return []

	# Build role filters
	allowed_roles = []
	if permissions.get("assign_team_member", 0):
		allowed_roles.append("ROLE-Member")
	if permissions.get("assign_team_lead", 0):
		allowed_roles.append("ROLE-Team Lead")
	if permissions.get("assign_admin", 0):
		allowed_roles.append("ROLE-Admin")

	# Build query filters
	filters = {"company_id": company_id, "enabled": 1}
	or_filters = []

	if not permissions.get("assign_self", 0) and allowed_roles:
		filters["role"] = ["in", allowed_roles]
	elif permissions.get("assign_self", 0) and not allowed_roles:
		filters["email"] = current_user
	elif permissions.get("assign_self", 0) and allowed_roles:
		or_filters = [["email", "=", current_user], ["role", "in", allowed_roles]]

	# Fetch employees
	employees = frappe.get_all(
		"CG User",
		fields=["full_name", "user_image", "first_name", "last_name", "email", "role"],
		filters=filters,
		or_filters=or_filters,
		order_by="full_name asc",
	)

	return employees

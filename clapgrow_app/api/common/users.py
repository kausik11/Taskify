import frappe
from frappe import _
from frappe.handler import logout
from frappe.sessions import clear_all_sessions, clear_user_cache


@frappe.whitelist(allow_guest=False)
def get_user_lists():
	"""Returns a list of user names."""
	try:
		user_lists = frappe.get_list("User", fields=["name"], order_by="creation")
		return success_response(user_lists, 200)
	except Exception as e:
		frappe.log_error(f"Error fetching user lists: {str(e)}", "User List Retrieval Error")
		return error_response("Failed to fetch user lists.", 500)


@frappe.whitelist(allow_guest=False)
def get_current_user():
	"""Returns the current user's information."""
	try:
		current_user = frappe.session.user
		if not current_user or current_user == "Guest":
			return error_response("User not found or session is invalid.", 404)

		user_doc = frappe.get_cached_doc("User", current_user)
		return success_response(user_doc.email, 200)
	except Exception as e:
		frappe.log_error(f"Error fetching current user: {str(e)}", "Current User Retrieval Error")
		return error_response("Failed to fetch current user.", 500)


@frappe.whitelist(allow_guest=False)
def logout_user():
	"""Logs out the current user, invalidates the session, and clears cache."""
	try:
		current_user = frappe.session.user
		if current_user == "Guest":
			return error_response("No active session to logout.", 400)

		# Invalidate all sessions for the current user
		clear_all_sessions(current_user)

		# Clear cache
		clear_user_cache(current_user)

		# Log out the user
		logout()

		return success_response(f"User {current_user} has been logged out successfully.", 200)
	except Exception as e:
		frappe.log_error(f"Error during logout: {str(e)}", "Logout Error")
		return error_response("Failed to logout user.", 500)


@frappe.whitelist(allow_guest=False)
def get_user_list_details(name):
	"""Returns the details of a specific user."""
	try:
		user_list = frappe.get_cached_doc("CG User", name)
		if not user_list:
			return error_response("User List not found.", 404)
		return success_response(user_list, 200)
	except Exception as e:
		frappe.log_error(
			f"Error fetching user list details: {str(e)}",
			"User List Details Retrieval Error",
		)
		return error_response("Failed to fetch user list details.", 500)


@frappe.whitelist(allow_guest=False)
def get_department_details(task_name):
	"""Returns the department details associated with a specific task."""
	try:
		# Fetch the CG Task Definition document by name
		task_doc = frappe.get_cached_doc("CG Task Definition", task_name)
		if not task_doc:
			return error_response("Task List not found.", 404)

		# Fetch the assignee (CG User)
		assignee_id = task_doc.assigned_to
		assignee_doc = frappe.get_cached_doc("CG User", assignee_id)

		if not assignee_doc or not assignee_doc.department_id:
			return error_response("Department not found for the assigned user.", 404)

		department_doc = frappe.get_cached_doc("CG Department", assignee_doc.department_id)

		if not department_doc or not department_doc.department_name:
			return error_response("Department details not found.", 404)

		# Prepare the response
		response_data = {
			"task_list": task_doc,
			"department_name": department_doc.department_name,
		}

		return success_response(response_data, 200)

	except Exception as e:
		frappe.log_error(
			f"Error in get_department_details: {str(e)}",
			"Department Details Retrieval Error",
		)
		return error_response(f"An error occurred: {str(e)}", 500)


def get_super_admin():
	"""Fetch the super admin for the current user's company"""

	try:
		user_doc = frappe.get_doc("CG User", frappe.session.user)
		company_id = user_doc.company_id
	except frappe.DoesNotExistError:
		frappe.throw(_("User not found in CG User"))

	user_list = frappe.get_all(
		"CG User", filters={"company_id": company_id, "is_super_admin": 1}, fields=["email", "full_name"]
	)

	if not user_list:
		frappe.throw(_("No super admin found for the company"))

	if len(user_list) > 1:
		frappe.throw(_("Multiple super admins found for the company"))

	return user_list[0]


def error_response(message, status):
	"""Returns a standardized error response."""
	return {"status": "error", "code": status, "message": message}


def success_response(data, status):
	"""Returns a standardized success response."""
	return {"status": "success", "code": status, "data": data}

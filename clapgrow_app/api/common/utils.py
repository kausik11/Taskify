import frappe
from frappe import _
from frappe.utils import format_datetime

DATE_FORMAT_AUDIT = "dd-MM-yyyy HH:mm:ss"  # For logs, audit trails
DATE_FORMAT_REMINDER = "dd MMM, HH:mm"  # For WhatsApp/email reminders
DATE_FORMAT_SHORT = "dd MMM"  # For compact display (subtasks etc.)


@frappe.whitelist(allow_guest=False)
def org_name(current_user=None, method="GET"):
	"""Fetch and cache the company, branch, and department names for the current user."""

	if method != "GET":
		return generate_response("Invalid request method. Only GET is allowed.", 405, "error")

	try:
		# Use frappe.session.user if current_user is not provided
		current_user = current_user or frappe.session.user
		if not isinstance(current_user, str) or "@" not in current_user:
			return generate_response("Invalid user email provided.", 400, "error")

		# Check permission early
		if not frappe.has_permission("CG Company", "read", user=current_user):
			return generate_response("Permission denied to access company details.", 403, "error")

		# Fetch user details
		user_details = frappe.db.get_values(
			"CG User",
			{"email": current_user},
			["company_id", "branch_id", "department_id"],
			as_dict=True,
		)
		if not user_details:
			return generate_response("User not found.", 404, "error")

		user_company = user_details[0].get("company_id")
		if not user_company:
			return generate_response("User has no associated company.", 404, "error")

		user_branch = user_details[0].get("branch_id")
		if not user_branch:
			return generate_response("User has no associated branch.", 404, "error")

		user_dept = user_details[0].get("department_id")
		if not user_dept:
			return generate_response("User has no associated department.", 404, "error")

		# Fetch company details
		company_records = frappe.get_all(
			"CG Company",
			filters={"name": user_company},
			fields=["company_name", "company_logo"],
		)
		if not company_records:
			return generate_response("No company found for the user.", 404, "error")

		company_name = company_records[0]["company_name"]
		company_logo = company_records[0]["company_logo"]

		# Fetch branch details
		branch_records = frappe.get_all(
			"CG Branch",
			filters={"name": user_branch},
			fields=["branch_name", "start_time", "end_time"],
		)
		if not branch_records:
			return generate_response("No branch found for the company.", 404, "error")

		branch_name = branch_records[0]["branch_name"]
		start_time = branch_records[0]["start_time"]
		end_time = branch_records[0]["end_time"]

		# Fetch department details
		department_records = frappe.get_all(
			"CG Department", filters={"name": user_dept}, fields=["department_name"]
		)
		if not department_records:
			return generate_response("No department found for the company.", 404, "error")

		department_name = department_records[0]["department_name"]

		# Cache data with user-specific keys
		cache_prefix = f"{current_user}:org_details"
		frappe.cache().set_value(f"{cache_prefix}:company_name", company_name, expires_in_sec=36000)
		frappe.cache().set_value(f"{cache_prefix}:company_logo", company_logo, expires_in_sec=36000)
		frappe.cache().set_value(f"{cache_prefix}:branch_name", branch_name, expires_in_sec=36000)
		frappe.cache().set_value(f"{cache_prefix}:start_time", start_time, expires_in_sec=36000)
		frappe.cache().set_value(f"{cache_prefix}:end_time", end_time, expires_in_sec=36000)
		frappe.cache().set_value(f"{cache_prefix}:department_name", department_name, expires_in_sec=36000)

		# Return response
		return generate_response(
			"Company, branch, and department names fetched and cached successfully.",
			200,
			"success",
			data={
				"company_name": company_name,
				"company_logo": company_logo,
				"branch_name": branch_name,
				"start_time": start_time,
				"end_time": end_time,
				"department_name": department_name,
			},
		)

	except frappe.exceptions.PermissionError:
		return generate_response("Permission denied to access organization details.", 403, "error")
	except frappe.exceptions.DoesNotExistError:
		return generate_response("Requested resource not found.", 404, "error")
	except Exception as e:
		frappe.log_error(
			f"Error fetching organization details for user {current_user}: {str(e)}",
			"Fetch Organization Details Error",
		)
		return generate_response(
			"An unexpected error occurred while fetching organization details.",
			500,
			"error",
		)


def generate_response(message, status_code, status, **kwargs):
	"""Generates a standardized response."""
	frappe.local.response["http_status_code"] = status_code
	response = {
		"status": status,
		"code": status_code,
		"message": message,
	}
	response.update(kwargs)
	return response


def format_due_date(due_date, fmt=DATE_FORMAT_AUDIT, fallback="N/A"):
	"""Safely format Frappe datetime fields (which may be strings)."""
	if not due_date:
		return fallback
	return format_datetime(due_date, fmt)

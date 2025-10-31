from datetime import datetime

import frappe
import frappe.utils
import frappe.utils.password
from frappe import _
from frappe.auth import LoginManager
from frappe.twofactor import should_run_2fa, two_factor_is_enabled
from frappe.utils import getdate, now_datetime, nowdate
from frappe.utils.html_utils import get_icon_html
from frappe.utils.oauth import get_oauth2_authorize_url, get_oauth_keys
from frappe.utils.password import get_decrypted_password
from frappe.website.utils import get_home_page

from clapgrow_app.api.error_classes import standard_response

no_cache = True


@frappe.whitelist(allow_guest=True)
def get_context():
	redirect_to = frappe.local.request.args.get("redirect-to")
	context = {"provider_logins": []}
	providers = frappe.get_all(
		"Social Login Key",
		filters={"enable_social_login": 1},
		fields=[
			"name",
			"client_id",
			"base_url",
			"provider_name",
			"icon",
			"redirect_url",
		],
		order_by="name",
	)

	for provider in providers:
		client_secret = get_decrypted_password("Social Login Key", provider.name, "client_secret")
		if not client_secret:
			continue

		icon = {
			"html": "",
			"src": "",
			"alt": "",
		}
		if provider.icon:
			if provider.provider_name == "Custom":
				icon["html"] = get_icon_html(provider.icon, small=True)
			else:
				icon["src"] = provider.icon
				icon["alt"] = provider.provider_name

		if provider.client_id and provider.base_url and get_oauth_keys(provider.name):
			context["provider_logins"].append(
				{
					"name": provider.name,
					"auth_url": get_oauth2_authorize_url(provider.name, redirect_to),
					"provider_name": provider.provider_name,
					"icon": icon,
					"redirect_to": provider.redirect_url,
				}
			)
			context["social_login"] = True

	login_label = [_("Email")]
	if frappe.utils.cint(frappe.get_system_settings("allow_login_using_mobile_number")):
		login_label.append(_("Mobile"))

	if frappe.utils.cint(frappe.get_system_settings("allow_login_using_user_name")):
		login_label.append(_("Username"))

	context["login_label"] = f" {_('/')} ".join(login_label)

	context["login_with_email_link"] = frappe.get_system_settings("login_with_email_link")
	context["two_factor_is_enabled"] = two_factor_is_enabled()
	context["disable_signup"] = frappe.get_website_settings("disable_signup")

	return context


# @frappe.whitelist(allow_guest=True)
# def login(usr, pwd):
#     """
#     Handles the login process via email/username and password
#     """
#     if not usr or not pwd:
#         frappe.throw(
#             _("Username and Password are required"), frappe.AuthenticationError
#         )

#     try:
#         login_manager = LoginManager()
#         login_manager.authenticate(user=usr, pwd=pwd)
#         login_manager.post_login()

#         # If 2FA is enabled, trigger it
#         if should_run_2fa(usr):
#             frappe.local.response["redirect_to"] = "/twofactor"
#             frappe.local.response["message"] = _(
#                 "Redirecting to two-factor authentication..."
#             )
#             return

#         # Get user roles
#         roles = frappe.get_roles(usr)

#         # Check if user has any CG roles
#         has_cg_role = any(role.startswith("CG-ROLE-") for role in roles)

#         # Determine redirect URL based on roles
#         if has_cg_role:
#             redirect_url = "/clapgrow/dashboard"
#             user_roles = [
#                 f"ROLE-{role.replace('CG-ROLE-', '').title()}"
#                 for role in roles
#                 if role.startswith("CG-ROLE-")
#             ]
#             user_role = user_roles[0] if user_roles else None
#         else:
#             redirect_url = "/app"
#             user_role = None

#         frappe.local.response["message"] = _("Logged in successfully")
#         frappe.local.response["redirect_to"] = redirect_url
#         frappe.local.response["user"] = usr
#         frappe.local.response["role"] = user_role
#         frappe.local.response["has_cg_role"] = has_cg_role

#     except frappe.AuthenticationError:
#         frappe.local.response["message"] = _("Invalid login credentials")
#         frappe.local.response["http_status_code"] = 401
#         return

#     except Exception:
#         frappe.log_error(frappe.get_traceback(), _("Login Error"))
#         frappe.local.response["message"] = _(
#             "An unexpected error occurred during login"
#         )
#         frappe.local.response["http_status_code"] = 500
#         return


@frappe.whitelist(allow_guest=False)
def update_task_status():
	# Fetch non-completed CG Task Instance documents with relevant statuses
	tasks = frappe.get_all(
		"CG Task Instance",
		fields=["name", "due_date", "status", "restrict", "is_completed"],
		filters={
			"enabled": 1,
			"is_completed": 0,
			"status": ["in", ["Due Today", "Upcoming"]],
		},
	)

	# Get current datetime (server is in IST)
	current_datetime = now_datetime()
	current_date = current_datetime.date()

	updated_count = 0

	for task in tasks:
		task_doc = frappe.get_doc("CG Task Instance", task.name)
		due_datetime = task.due_date
		due_date = getdate(task.due_date) if task.due_date else None

		new_status = task_doc.status  # Default to current status

		if due_datetime:
			if current_datetime > due_datetime:
				new_status = "Overdue"
			elif due_date == current_date:
				new_status = "Due Today"
			else:
				new_status = "Upcoming"

			if task_doc.status != new_status:
				task_doc.status = new_status
				task_doc.save()
				updated_count += 1

	frappe.log(f"Updated status for {updated_count} CG Task Instance documents.")
	return {
		"status": "success",
		"message": f"Updated status for {updated_count} CG Task Instance documents.",
	}


@frappe.whitelist(allow_guest=True)
def oauth_login(provider_name):
	"""
	Handles login through OAuth providers.
	"""

	try:
		redirect_to = frappe.local.request.args.get("redirect-to", "/")
		auth_url = get_oauth2_authorize_url(provider_name, redirect_to)

		if frappe.local.request.headers.get("Accept") == "application/json" or frappe.form_dict.get("api"):
			frappe.response["message"] = {"redirect_to": auth_url}
			frappe.response["http_status_code"] = 200
			return

		frappe.local.response["type"] = "redirect"
		frappe.local.response["location"] = auth_url
		frappe.local.response["http_status_code"] = 302

	except Exception:
		frappe.log_error(frappe.get_traceback(), _("OAuth Login Error"))
		frappe.local.response["message"] = _("OAuth login failed")
		frappe.local.response["http_status_code"] = 500


@frappe.whitelist(allow_guest=False)
def logout():
	"""
	Handles user logout and clears session.
	"""

	try:
		frappe.local.login_manager.logout()
		frappe.local.response["message"] = _("Logged out successfully")
		frappe.local.response["redirect_to"] = "/login"

	except Exception:
		frappe.log_error(frappe.get_traceback(), _("Logout Error"))
		frappe.local.response["message"] = _("An error occurred during logout")
		frappe.local.response["http_status_code"] = 500


@frappe.whitelist(allow_guest=False)
def block_user(company_id):
	try:
		company = frappe.get_doc("CG Company", company_id)
		cg_users = frappe.get_all("CG User", filters={"company_id": company_id}, fields=["email"])
		if company.is_trial:
			user_emails = [user["email"] for user in cg_users]

			users = frappe.get_all(
				"User",
				filters={"email": ["in", user_emails]},
				fields=["name", "enabled", "creation"],
			)
			for user_doc in users:
				user = frappe.get_doc("User", user_doc.name)

				if isinstance(user.creation, str):
					user_creation_date = datetime.strptime(user.creation, "%Y-%m-%d %H:%M:%S")
				else:
					user_creation_date = user.creation

				days_since_creation = (frappe.utils.now_datetime() - user_creation_date).days
				if days_since_creation > 15:
					user.reload()

					user.enabled = 0
					user.save()
					frappe.msgprint(_("Your trial has expired. Upgrade to continue"))

			frappe.db.commit()  # Manual commit to database // nosemgrep

			return standard_response(
				success=True,
				message="All users have been blocked. Consider upgrading to continue using Clapgrow.",
				status_code=200,
			)
		else:
			# If the company is not in trial, return failure response
			return standard_response(
				success=False,
				message="Failed to block users. The company is not in a trial period.",
				status_code=400,
			)

	except frappe.DoesNotExistError as e:
		return standard_response(
			success=False,
			message=f"Company or User not found: {str(e)}",
			status_code=404,
		)
	except Exception as e:
		frappe.log_error(frappe.get_traceback(), _("Block User Error"))
		return standard_response(success=False, message=f"An error occurred: {str(e)}", status_code=500)


@frappe.whitelist(allow_guest=True)
def oauth_callback():
	"""
	OAuth2 callback to handle authorization response.
	"""
	params = frappe.local.request.args  # Get query parameters
	authorization_code = params.get("code")
	error = params.get("error")

	if error:
		frappe.local.response["message"] = f"OAuth Error: {error}"
		frappe.local.response["http_status_code"] = 400
		return

	if not authorization_code:
		frappe.local.response["message"] = "No authorization code received."
		frappe.local.response["http_status_code"] = 400
		return

	frappe.local.response["message"] = f"Authorization Code: {authorization_code}"
	return authorization_code


@frappe.whitelist(allow_guest=True)
def login_and_get_token(email, password):
	"""
	Authenticate user and return their API Key and Secret if valid.
	"""
	try:
		# Validate user credentials
		user = frappe.get_doc("User", email)
		if not user.enabled:
			return {"error": "User is disabled"}

		# Check password
		if not frappe.utils.password.check_password(email, password):
			return {"error": "Invalid credentials"}

		# Get or generate API Key and Secret
		if not user.api_key or not user.get_password("api_secret"):
			user.api_key = frappe.generate_hash(length=10)
			new_api_secret = frappe.generate_hash(length=15)
			user.api_secret = new_api_secret
			user.save(ignore_permissions=True)
			frappe.db.commit()

		# Fetch the stored api_secret
		api_secret = user.get_password("api_secret")

		return {
			"api_key": user.api_key,
			"api_secret": api_secret,
			"message": "Login successful",
		}
	except Exception as e:
		return {"error": str(e)}


@frappe.whitelist(allow_guest=True)
def validate_clapgrow_access(user=None):
	"""
	Comprehensive validation for Clapgrow access.
	Checks both CG role and CG User document existence with caching.

	Returns:
	    dict: {
	        'has_access': bool,
	        'redirect_url': str,
	        'user_type': str,
	        'reason': str (if no access)
	    }
	"""
	if not user:
		user = frappe.session.user

	if user == "Guest":
		return {
			"has_access": False,
			"redirect_url": "/login",
			"user_type": "guest",
			"reason": "User not authenticated",
		}

	try:
		# Use cache key for efficiency in production
		cache_key = f"clapgrow_access_{user}"
		cached_result = frappe.cache().get_value(cache_key)

		if cached_result:
			return cached_result

		# Get user roles efficiently
		roles = frappe.get_roles(user)
		has_cg_role = any(role.startswith("CG-ROLE-") for role in roles)

		# Check CG User document existence
		cg_user_exists = frappe.db.exists("CG User", {"email": user, "enabled": 1})

		# Determine access and redirect URL
		result = {
			"user_type": "standard_user",
			"has_access": False,
			"redirect_url": "/app",
			"reason": None,
		}

		if has_cg_role and cg_user_exists:
			# User has both CG role and CG User document - full Clapgrow access
			result.update(
				{
					"has_access": True,
					"redirect_url": "/clapgrow/dashboard",
					"user_type": "cg_user",
				}
			)
		elif has_cg_role and not cg_user_exists:
			# User has CG role but no CG User document - deny Clapgrow access
			result.update(
				{
					"has_access": False,
					"redirect_url": "/app",
					"user_type": "incomplete_cg_user",
					"reason": "CG User document not found or disabled",
				}
			)
		elif not has_cg_role and cg_user_exists:
			# User has CG User document but no CG role - deny Clapgrow access
			result.update(
				{
					"has_access": False,
					"redirect_url": "/app",
					"user_type": "incomplete_cg_user",
					"reason": "Required CG role not assigned",
				}
			)
		else:
			# Standard user - no CG access
			result.update(
				{
					"has_access": False,
					"redirect_url": "/app",
					"user_type": "standard_user",
					"reason": "Not a Clapgrow user",
				}
			)

		# Cache result for 5 minutes for production efficiency
		frappe.cache().set_value(cache_key, result, expires_in_sec=300)

		return result

	except Exception as e:
		frappe.log_error(f"Error validating Clapgrow access for user {user}: {str(e)}")
		return {
			"has_access": False,
			"redirect_url": "/app",
			"user_type": "error",
			"reason": "Access validation error",
		}


@frappe.whitelist(allow_guest=True)
def get_user_redirect_url(user=None):
	"""
	Enhanced redirect URL function with CG User validation.
	Now checks both role and CG User document existence.
	"""
	if not user:
		user = frappe.session.user

	if user == "Guest":
		return "/login"

	try:
		access_result = validate_clapgrow_access(user)
		return access_result["redirect_url"]

	except Exception as e:
		frappe.log_error(f"Error getting redirect URL for user {user}: {str(e)}")
		return "/app"  # Safe fallback


@frappe.whitelist(allow_guest=True)
def check_clapgrow_route_access(user=None, route=None):
	"""
	Middleware function to check if user can access specific Clapgrow routes.
	Used for frontend route protection.
	"""
	if not user:
		user = frappe.session.user

	if not route:
		return {"allowed": False, "reason": "No route specified"}

	# Check if it's a Clapgrow route
	if not (route.startswith("/clapgrow") or route.startswith("clapgrow")):
		return {"allowed": True, "reason": "Not a Clapgrow route"}

	access_result = validate_clapgrow_access(user)

	return {
		"allowed": access_result["has_access"],
		"reason": access_result.get("reason", ""),
		"redirect_url": access_result["redirect_url"],
		"user_type": access_result["user_type"],
	}


@frappe.whitelist()
def refresh_user_access_cache(user=None):
	"""
	Force refresh of user access cache.
	Useful after role/user changes.
	"""
	if not user:
		user = frappe.session.user

	cache_key = f"clapgrow_access_{user}"
	frappe.cache().delete_value(cache_key)

	# Return fresh validation result
	return validate_clapgrow_access(user)


@frappe.whitelist(allow_guest=True)
def login(usr, pwd):
	"""
	Enhanced login function with proper Clapgrow access validation
	"""
	if not usr or not pwd:
		frappe.throw(_("Username and Password are required"), frappe.AuthenticationError)

	try:
		login_manager = LoginManager()
		login_manager.authenticate(user=usr, pwd=pwd)
		login_manager.post_login()

		# If 2FA is enabled, trigger it
		if should_run_2fa(usr):
			return {
				"message": _("Redirecting to two-factor authentication..."),
				"redirect_to": "/twofactor",
				"require_2fa": True,
			}

		# Use enhanced validation for redirect
		access_result = validate_clapgrow_access(usr)

		return {
			"message": _("Logged in successfully"),
			"redirect_to": access_result["redirect_url"],
			"user": usr,
			"user_type": access_result["user_type"],
			"has_clapgrow_access": access_result["has_access"],
		}

	except frappe.AuthenticationError:
		frappe.local.response.http_status_code = 401
		frappe.throw(_("Invalid login credentials"), frappe.AuthenticationError)

	except Exception:
		frappe.log_error(frappe.get_traceback(), _("Login Error"))
		frappe.local.response.http_status_code = 500
		frappe.throw(_("An unexpected error occurred during login"))


def on_user_update(doc, method):
	"""Invalidate access cache when user roles change"""
	frappe.cache().delete_value(f"clapgrow_access_{doc.email}")


def on_cg_user_update(doc, method):
	"""Invalidate access cache when CG User document changes"""
	frappe.cache().delete_value(f"clapgrow_access_{doc.email}")

import os

import frappe
from frappe import _
from frappe.permissions import add_permission

from .login import oauth_callback


def after_install():
	provide_permission_user_comment()
	set_desk_access()
	setup_email_account()


rights = (
	"select",
	"read",
	"write",
	"create",
	"delete",
	"submit",
	"cancel",
	"amend",
	"print",
	"email",
	"report",
	"import",
	"export",
	"share",
)


def provide_permission_user_comment():
	"""
	Update or create permissions for CG roles only, without affecting other roles.
	Focus on CG-specific doctypes and leave system doctypes to be managed by individual apps.
	"""
	logger = frappe.logger("permission_setup")

	# Only manage permissions for CG-specific doctypes
	cg_doctypes = [
		"CG User",
		"CG Company",
		"CG Branch",
		"CG Department",
		"CG Team",
		"CG Task Instance",
		"CG Task Definition",
		"CG Role",
		"CG Holiday",
		"CG Employee Holiday List",
		"CG Tags",
		"CG Notification Setting",
		"CG User Team",
		"CG Team Member",
	]

	# Define CG role permissions
	cg_roles = ["CG-ROLE-ADMIN", "CG-ROLE-TEAM-LEAD", "CG-ROLE-MEMBER"]

	logger.info(f"Executing provide_permission_user_comment as user: {frappe.session.user}")

	for doctype in cg_doctypes:
		# Verify doctype exists
		if not frappe.db.exists("DocType", doctype):
			logger.info(f"DocType {doctype} does not exist. Skipping.")
			continue

		for role in cg_roles:
			# Verify role exists
			if not frappe.db.exists("Role", {"role_name": role}):
				logger.error(f"Role {role} does not exist. Skipping permission setup.")
				continue

			try:
				# Check for existing Custom DocPerm
				existing_perm = frappe.db.get_value(
					"Custom DocPerm",
					{
						"parent": doctype,
						"role": role,
						"permlevel": 0,
						"if_owner": 0,
					},
					["name"],
					as_dict=True,
				)

				if existing_perm:
					# Update existing Custom DocPerm
					logger.info(
						f"Found existing Custom DocPerm for {role} on {doctype}: {existing_perm.name}"
					)
					doc_perm = frappe.get_doc("Custom DocPerm", existing_perm.name)
				else:
					# Create new Custom DocPerm
					logger.info(f"No Custom DocPerm found for {role} on {doctype}. Creating new.")
					doc_perm = frappe.new_doc("Custom DocPerm")
					doc_perm.update(
						{
							"parent": doctype,
							"role": role,
							"permlevel": 0,
							"if_owner": 0,
						}
					)

				# Set permissions based on role hierarchy
				if role == "CG-ROLE-ADMIN":
					# Admin gets full permissions on CG doctypes
					for right in rights:
						setattr(doc_perm, right, 1)
				elif role == "CG-ROLE-TEAM-LEAD":
					# Team Lead gets read/write/create with limited delete
					doc_perm.read = 1
					doc_perm.write = 1
					doc_perm.create = 1
					doc_perm.select = 1
					doc_perm.export = 1
					doc_perm.print = 1
					doc_perm.email = 1
					doc_perm.share = 1
					doc_perm.report = 1
					setattr(doc_perm, "import", 1)
					doc_perm.delete = 0  # Limited delete
					doc_perm.submit = 0
					doc_perm.cancel = 0
					doc_perm.amend = 0
				elif role == "CG-ROLE-MEMBER":
					# Member gets read with limited write
					doc_perm.read = 1
					doc_perm.select = 1
					doc_perm.export = 1
					doc_perm.print = 1
					doc_perm.email = 1
					doc_perm.share = 1
					doc_perm.report = 1
					doc_perm.write = 1  # Allow write for their own records
					doc_perm.create = 0  # Limited create
					doc_perm.delete = 0
					doc_perm.submit = 0
					doc_perm.cancel = 0
					doc_perm.amend = 0
					setattr(doc_perm, "import", 0)

				if existing_perm:
					doc_perm.save(ignore_permissions=True)
					logger.info(f"Updated Custom DocPerm for {role} on {doctype}")
				else:
					doc_perm.insert(ignore_permissions=True)
					logger.info(f"Created new Custom DocPerm for {role} on {doctype}")

				frappe.db.commit()
				logger.info(f"Committed changes for {role} on {doctype}")

			except Exception as e:
				logger.error(f"Error updating permissions for {role} on {doctype}: {str(e)}")
				import traceback

				logger.error(f"Traceback: {traceback.format_exc()}")
				frappe.db.rollback()
				continue

	# For system doctypes that CG users need to access, add minimal permissions
	# This allows integration with other apps
	system_doctype_permissions = {
		"Comment": {
			"CG-ROLE-ADMIN": {
				"read": 1,
				"write": 1,
				"create": 1,
				"delete": 1,
				"select": 1,
			},
			"CG-ROLE-TEAM-LEAD": {
				"read": 1,
				"write": 1,
				"create": 1,
				"delete": 0,
				"select": 1,
			},
			"CG-ROLE-MEMBER": {
				"read": 1,
				"write": 1,
				"create": 1,
				"delete": 0,
				"select": 1,
			},
		},
		"Version": {
			"CG-ROLE-ADMIN": {"read": 1, "select": 1},
			"CG-ROLE-TEAM-LEAD": {"read": 1, "select": 1},
			"CG-ROLE-MEMBER": {"read": 1, "select": 1},
		},
		# Note: We're NOT setting permissions for User and Role doctypes
		# Let other apps and system manage those
	}

	for doctype, role_permissions in system_doctype_permissions.items():
		if not frappe.db.exists("DocType", doctype):
			continue

		for role, permissions in role_permissions.items():
			if not frappe.db.exists("Role", {"role_name": role}):
				continue

			try:
				existing_perm = frappe.db.get_value(
					"Custom DocPerm",
					{
						"parent": doctype,
						"role": role,
						"permlevel": 0,
						"if_owner": 0,
					},
					["name"],
					as_dict=True,
				)

				if existing_perm:
					doc_perm = frappe.get_doc("Custom DocPerm", existing_perm.name)
				else:
					doc_perm = frappe.new_doc("Custom DocPerm")
					doc_perm.update(
						{
							"parent": doctype,
							"role": role,
							"permlevel": 0,
							"if_owner": 0,
						}
					)

				# Set specified permissions, leave others as 0
				for right in rights:
					setattr(doc_perm, right, permissions.get(right, 0))

				if existing_perm:
					doc_perm.save(ignore_permissions=True)
				else:
					doc_perm.insert(ignore_permissions=True)

				frappe.db.commit()

			except Exception as e:
				logger.error(f"Error setting permission for {role} on {doctype}: {str(e)}")
				frappe.db.rollback()
				continue

	# Clear cache to ensure permissions take effect
	frappe.clear_cache()
	logger.info("CG permissions updated and cache cleared")


def set_desk_access():
	"""
	Set desk_access to 1 (enabled) for CG roles to allow integration with other apps.
	This is CRITICAL for allowing users to access ERPNext, HRMS, Insights, etc.
	"""
	logger = frappe.logger("permission_setup")
	roles = ["CG-ROLE-ADMIN", "CG-ROLE-TEAM-LEAD", "CG-ROLE-MEMBER"]

	logger.info(f"Executing set_desk_access as user: {frappe.session.user}")

	for role in roles:
		try:
			# Verify role exists
			if not frappe.db.exists("Role", {"role_name": role}):
				logger.error(f"Role {role} does not exist. Skipping desk access update.")
				continue

			# IMPORTANT: Set desk_access to 1 to allow access to other apps
			current_desk_access = frappe.db.get_value("Role", {"role_name": role}, "desk_access")
			if current_desk_access == 0:
				frappe.db.set_value("Role", {"role_name": role}, "desk_access", 1, update_modified=False)
				frappe.db.commit()
				logger.info(f"Set desk_access to 1 (enabled) for role {role}")
			else:
				logger.info(f"Role {role} already has desk_access set to 1. No update needed.")

		except Exception as e:
			logger.error(f"Error setting desk_access for {role}: {str(e)}")
			import traceback

			logger.error(f"Traceback: {traceback.format_exc()}")
			frappe.db.rollback()
			continue

	# Clear cache to ensure desk access changes take effect
	frappe.clear_cache()
	logger.info("Desk access updated and cache cleared")


def setup_email_account():
	"""
	Create an Email Account during installation with validation and secure configuration.
	"""
	try:
		# Retrieve email credentials from environment variables or configuration
		email_id = os.getenv("EMAIL_ID") or frappe.conf.get("email_id")
		email_password = os.getenv("EMAIL_PASSWORD") or frappe.conf.get("email_password")

		# Validate required fields
		if not email_id or not email_password:
			frappe.log_error(
				message="Email ID or password not set in environment variables or configuration.",
				title="Email Account Setup",
			)
			return False

		# Validate email format
		if not frappe.utils.validate_email_address(email_id):
			frappe.log_error(
				message=f"Invalid email address: {email_id}",
				title="Email Account Setup",
			)
			return False

		# Check if email account already exists
		if frappe.db.exists("Email Account", {"email_id": email_id}):
			frappe.msgprint(
				msg=f"Email account {email_id} already exists.",
				title="Email Account Setup",
			)
			return True

		# Define email service settings (configurable via environment or config)
		service = os.getenv("EMAIL_SERVICE", "GMail")
		email_account_name = os.getenv("EMAIL_ACCOUNT_NAME", "Clapgrow Support")
		smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com" if service == "GMail" else "")
		smtp_port = int(os.getenv("SMTP_PORT", 587 if service == "GMail" else 0))
		use_tls = int(os.getenv("USE_TLS", 1 if service == "GMail" else 0))
		use_ssl = int(os.getenv("USE_SSL", 0))

		# Create Email Account document
		email_account = frappe.get_doc(
			{
				"doctype": "Email Account",
				"email_id": email_id,
				"password": email_password,
				"email_account_name": email_account_name,
				"auth_method": "Basic",
				"service": service,
				"smtp_server": smtp_server,
				"smtp_port": smtp_port,
				"use_tls": use_tls,
				"use_ssl": use_ssl,
				"enable_incoming": 0,
				"enable_outgoing": 1,
				"default_outgoing": 1,
				"always_use_account_email_id_as_sender": 1,
				"always_use_account_name_as_sender": 1,
			}
		)

		email_account.insert()

		frappe.msgprint(
			msg=f"Email account {email_id} created successfully",
			title="Email Account Setup",
		)
		return True

	except Exception as e:
		frappe.log_error(
			message=f"Error creating Email Account: {str(e)}",
			title="Email Account Setup",
		)
		return False


def setup_website_settings():
	"""
	Configure Website Settings during installation, including home page, app name, and route redirects.
	"""
	try:
		# Get the existing Website Settings record (Single doctype)
		website_settings = frappe.get_single("Website Settings")

		# Update basic settings
		website_settings.update(
			{
				"home_page": "clapgrow",
				"title_prefix": "Clapgrow",
				"app_name": "Clapgrow",
				"app_logo": "/assets/clapgrow_app/images/clapgrow-logo.png",
				"favicon": "/assets/clapgrow_app/images/clapgrow-logo.png",
				"website_theme": "Standard",
				"enable_google_indexing": 1,
				"google_analytics_id": "",
				"google_ads_id": "",
				"robots_txt": "User-agent: *\nAllow: /\nSitemap: https://clapgrow.frappe.cloud/sitemap.xml",
			}
		)

		# Define desired route redirects
		desired_redirects = [
			{"source": "/", "target": "/clapgrow/dashboard"},
			{"source": "/login", "target": "/clapgrow/login"},
			{"source": "/logout", "target": "/clapgrow/logout"},
		]

		# Clear existing route_redirects to avoid duplicates
		website_settings.route_redirects = []

		# Add or update route redirects
		for redirect in desired_redirects:
			# Check if the redirect already exists
			existing_redirect = next(
				(r for r in website_settings.route_redirects if r.source == redirect["source"]),
				None,
			)
			if existing_redirect:
				# Update existing redirect
				existing_redirect.target = redirect["target"]
			else:
				# Append new redirect to the child table
				website_settings.append(
					"route_redirects",
					{
						"source": redirect["source"],
						"target": redirect["target"],
					},
				)

		# Save the updated Website Settings
		website_settings.save(ignore_permissions=True)

		# Clear cache to reflect changes on the website
		frappe.clear_cache()

		frappe.msgprint(
			msg="Website Settings configured successfully",
			title="Website Settings Setup",
		)
		return True

	except Exception as e:
		frappe.log_error(
			message=f"Error configuring Website Settings: {str(e)}",
			title="Website Settings Setup",
		)
		return False

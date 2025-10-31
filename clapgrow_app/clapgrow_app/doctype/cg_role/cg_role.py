import re

import frappe
from frappe import _
from frappe.model.document import Document


class CGRole(Document):
	def autoname(self):
		# Add 'ROLE-' before the role_name
		self.name = f"ROLE-{self.role_name}"

	def format_role_name_for_core(self):
		if not self.role_name:
			frappe.throw(_("Role name cannot be None"))

		# Format for the Role doctype
		core_role_name = self.role_name.upper().replace(" ", "-")
		if not core_role_name.startswith("CG-ROLE-"):
			core_role_name = "CG-ROLE-" + core_role_name
		return core_role_name

	def create_core_role(self):
		if not self.role_name:
			frappe.throw(_("Role name cannot be None"))

		core_role_name = self.format_role_name_for_core()
		if not frappe.db.exists("Role", core_role_name):
			core_role = frappe.get_doc(
				{
					"doctype": "Role",
					"role_name": core_role_name,
					"desk_access": 1,  # CHANGED: Set to 1 to allow access to other apps
					"disabled": 0,
					"is_custom": 1,
					"restrict_to_domain": "",
					"two_factor_auth": 0,
				}
			)
			core_role.insert()
			frappe.msgprint(_("Core Role '{0}' created automatically.").format(core_role_name))
		else:
			# Update existing role to ensure desk_access is enabled
			frappe.db.set_value("Role", core_role_name, "desk_access", 1)
			frappe.msgprint(_("Core Role '{0}' already exists and has been updated.").format(core_role_name))

	def after_insert(self):
		self.create_core_role()
		# self.update_role_permissions()

	def validate(self):
		if not self.role_name:
			frappe.throw(_("Role name cannot be None"))

		# Add validation for invalid characters in role_name
		if not re.match("^[A-Za-z0-9 ]+$", self.role_name):
			frappe.throw(_("Role name can only contain letters, numbers, and spaces"))

	def before_rename(self, old_name, new_name, merge=False):
		if not new_name:
			frappe.throw(_("New name cannot be None"))
		return new_name

	def after_rename(self, old_name, new_name, merge=False):
		if not new_name:
			frappe.throw(_("New name cannot be None"))

		# Remove 'ROLE-' prefix from the new name if it exists
		if new_name.startswith("ROLE-"):
			new_name = new_name.replace("ROLE-", "")

		# Update the role_name field in the CG Role doctype
		self.role_name = new_name
		self.db_update()

		# Format the core role names
		old_core_role_name = old_name.replace("ROLE-", "CG-ROLE-")
		new_core_role_name = self.format_role_name_for_core()

		# Check if the old core role exists before renaming
		if frappe.db.exists("Role", old_core_role_name):
			frappe.rename_doc("Role", old_core_role_name, new_core_role_name, merge=merge)
		else:
			self.create_core_role()

	def on_update(self):
		self.update_role_permissions()

	def update_role_permissions(self):
		"""Update permissions in Role Permissions Manager based on CG Role settings"""
		core_role_name = self.format_role_name_for_core()
		logger = frappe.logger("permission_setup")

		# Map CG Role fields to CG-specific doctypes only
		# We only manage permissions for CG doctypes, not system doctypes
		permission_map = {
			"CG Branch": {
				"create": self.branches_create,
				"delete": self.branches_delete,
				"read": self.branches_read,
				"write": self.branches_write,
			},
			"CG Department": {
				"create": self.department_create,
				"delete": self.department_delete,
				"read": self.department_read,
				"write": self.department_write,
			},
			"CG Holiday": {
				"create": self.holiday_create,
				"delete": self.holiday_delete,
				"read": self.holiday_read,
				"write": self.holiday_write,
			},
			"CG User": {
				"create": self.team_members_create,
				"delete": self.team_members_delete,
				"read": self.team_members_read,
				"write": self.team_members_write,
			},
			"CG Notification Setting": {
				"create": self.notifications_create,
				"delete": self.notifications_delete,
				"read": self.notifications_read,
				"write": self.notifications_write,
			},
			"CG Tags": {
				"create": self.tags_create,
				"delete": self.tags_delete,
				"read": self.tags_read,
				"write": self.tags_write,
			},
			"CG Role": {
				"create": self.roles_create,
				"delete": self.roles_delete,
				"read": self.roles_read,
				"write": self.roles_write,
			},
		}

		# Log the user executing the permission update
		logger.info(f"Updating permissions for role: {core_role_name} as user: {frappe.session.user}")

		# Iterate through each doctype in the permission map
		for doctype, permissions in permission_map.items():
			# Verify doctype exists
			if not frappe.db.exists("DocType", doctype):
				logger.info(f"DocType {doctype} does not exist. Skipping permission update.")
				continue

			# Check for existing Custom DocPerm
			existing_perm = frappe.db.get_value(
				"Custom DocPerm",
				{
					"parent": doctype,
					"role": core_role_name,
					"permlevel": 0,
					"if_owner": 0,
				},
				["name"],
				as_dict=True,
			)

			try:
				if existing_perm:
					# Update existing Custom DocPerm
					logger.info(
						f"Found existing Custom DocPerm for {core_role_name} on {doctype}: {existing_perm.name}"
					)
					doc_perm = frappe.get_doc("Custom DocPerm", existing_perm.name)
					# Update permissions based on CG Role settings
					for perm_type, value in permissions.items():
						setattr(doc_perm, perm_type, 1 if value else 0)
					# Also set select, export, and other standard permissions
					if permissions.get("read"):
						doc_perm.select = 1
						doc_perm.export = 1
						doc_perm.print = 1
						doc_perm.email = 1
						doc_perm.report = 1
						doc_perm.share = 1
					doc_perm.save(ignore_permissions=True)
					logger.info(f"Updated Custom DocPerm for {core_role_name} on {doctype}")
				else:
					# Create new Custom DocPerm
					logger.info(f"No Custom DocPerm found for {core_role_name} on {doctype}. Creating new.")
					doc_perm = frappe.new_doc("Custom DocPerm")
					doc_perm.update(
						{
							"parent": doctype,
							"role": core_role_name,
							"permlevel": 0,
							"if_owner": 0,
						}
					)
					# Set permissions based on CG Role settings
					for perm_type, value in permissions.items():
						setattr(doc_perm, perm_type, 1 if value else 0)
					# Also set select, export, and other standard permissions
					if permissions.get("read"):
						doc_perm.select = 1
						doc_perm.export = 1
						doc_perm.print = 1
						doc_perm.email = 1
						doc_perm.report = 1
						doc_perm.share = 1
					doc_perm.insert(ignore_permissions=True)
					logger.info(f"Created new Custom DocPerm for {core_role_name} on {doctype}")

				frappe.db.commit()
				logger.info(f"Committed permission changes for {core_role_name} on {doctype}")

			except Exception as e:
				logger.error(f"Error updating permissions for {core_role_name} on {doctype}: {str(e)}")
				import traceback

				logger.error(f"Traceback: {traceback.format_exc()}")
				frappe.db.rollback()
				continue

		# Clear cache to ensure permissions take effect
		frappe.clear_cache()
		logger.info(f"Permissions updated and cache cleared for role: {core_role_name}")

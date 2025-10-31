import os

import frappe
from frappe import _
from frappe.model.document import Document

from clapgrow_app.api import provide_permission_user_comment, setup_website_settings


class CGCompany(Document):
	def before_insert(self):
		"""Validate company name and ensure it is unique."""
		company_count = frappe.db.count("CG Company")
		if company_count == 0:
			setup_website_settings()

		if not self.company_name:
			frappe.throw(_("Company Name is required."))

		if frappe.db.exists("CG Company", {"company_name": self.company_name}):
			frappe.throw(_("Company Name must be unique."))

		# Ensure company ID is set
		if not self.name:
			self.name = self.company_name

	def after_insert(self):
		try:
			wa_api_token = self.get_whatsapp_api_token()

			# Create WhatsApp Setting if it doesn't exist
			if not frappe.db.exists("Whatsapp Setting", {"company_id": self.name}):
				frappe.get_doc(
					{
						"doctype": "Whatsapp Setting",
						"company_id": self.name,
						"wa_api_url": "https://waapi.app/api/v1/instances/",
						"wa_api_token": wa_api_token,
					}
				).insert()

			create_company_roles(self)
			create_company_settings_and_notifications(self)
			frappe.db.commit()

		except Exception as e:
			frappe.log_error(f"Error in after_insert for company {self.name}: {str(e)}")
			raise

	def get_whatsapp_api_token(self):
		"""Retrieve WhatsApp API token from environment or configuration."""
		return os.getenv("WA_API_TOKEN") or frappe.conf.get("wa_api_token") or "asdada"


def create_company_settings_and_notifications(company):
	"""Create notification settings for a given company."""
	try:
		# Check if notification settings already exist
		if not frappe.db.exists("CG Notification Setting", {"company_id": company.name}):
			frappe.get_doc(
				{
					"doctype": "CG Notification Setting",
					"company_id": company.name,
					"ta_on": 1,
					"ta_wa": 1,
					"ta_email": 1,
					"ut_on": 1,
					"ut_wa": 1,
					"ut_email": 1,
					"ut_time": "08:00",
					"ot_on": 1,
					"ot_wa": 0,
					"ot_email": 1,
					"sd_on": 0,
					"sd_wa": 0,
					"sd_email": 0,
					"sd_freq": "Weekly",
					"ws_on": 0,
					"ws_wa": 0,
					"ws_email": 0,
					"ms_on": 0,
					"ms_wa": 0,
					"ms_email": 0,
					"dr_on": 0,
					"dr_wa": 0,
					"dr_email": 0,
					"dr_freq": "Weekly",
				}
			).insert()
		else:
			frappe.log_error(f"CG Notification Setting already exists for {company.name}")

	except Exception as e:
		frappe.log_error(f"Failed to create CG Notification Setting for {company.name}: {str(e)}")
		raise


def create_company_roles(company):
	"""Create Admin, Team Lead, and Member roles for the new company."""
	roles = [
		{
			"role_name": "Admin",
			"assign_team_member": 1,
			"assign_team_lead": 1,
			"assign_admin": 1,
			"assign_self": 1,
			"create_onetime_task": 1,
			"create_recurring_task": 1,
			"create_fms": 1,
			"create_help_ticket": 1,
			"branches_create": 1,
			"branches_delete": 1,
			"branches_read": 1,
			"branches_write": 1,
			"department_create": 1,
			"department_delete": 1,
			"department_read": 1,
			"department_write": 1,
			"holiday_create": 1,
			"holiday_delete": 1,
			"holiday_read": 1,
			"holiday_write": 1,
			"team_members_create": 1,
			"team_members_delete": 1,
			"team_members_read": 1,
			"team_members_write": 1,
			"notifications_create": 1,
			"notifications_delete": 1,
			"notifications_read": 1,
			"notifications_write": 1,
			"tags_create": 1,
			"tags_delete": 1,
			"tags_read": 1,
			"tags_write": 1,
			"roles_create": 1,
			"roles_delete": 1,
			"roles_read": 1,
			"roles_write": 1,
			"mis": 1,
			"smart_insights": 1,
		},
		{
			"role_name": "Team Lead",
			"assign_team_member": 1,
			"assign_team_lead": 0,
			"assign_admin": 0,
			"assign_self": 1,
			"create_onetime_task": 1,
			"create_recurring_task": 1,
			"create_fms": 0,
			"create_help_ticket": 1,
			"branches_create": 0,
			"branches_delete": 0,
			"branches_read": 1,
			"branches_write": 0,
			"department_create": 0,
			"department_delete": 0,
			"department_read": 1,
			"department_write": 0,
			"holiday_create": 0,
			"holiday_delete": 0,
			"holiday_read": 1,
			"holiday_write": 0,
			"team_members_create": 0,
			"team_members_delete": 0,
			"team_members_read": 1,
			"team_members_write": 0,
			"notifications_create": 0,
			"notifications_delete": 0,
			"notifications_read": 1,
			"notifications_write": 0,
			"tags_create": 1,
			"tags_delete": 0,
			"tags_read": 1,
			"tags_write": 1,
			"roles_create": 0,
			"roles_delete": 0,
			"roles_read": 1,
			"roles_write": 0,
			"mis": 1,
			"smart_insights": 1,
		},
		{
			"role_name": "Member",
			"assign_team_member": 0,
			"assign_team_lead": 0,
			"assign_admin": 0,
			"assign_self": 1,
			"create_onetime_task": 1,
			"create_recurring_task": 0,
			"create_fms": 0,
			"create_help_ticket": 1,
			"branches_create": 0,
			"branches_delete": 0,
			"branches_read": 1,
			"branches_write": 0,
			"department_create": 0,
			"department_delete": 0,
			"department_read": 1,
			"department_write": 0,
			"holiday_create": 0,
			"holiday_delete": 0,
			"holiday_read": 1,
			"holiday_write": 0,
			"team_members_create": 0,
			"team_members_delete": 0,
			"team_members_read": 1,
			"team_members_write": 0,
			"notifications_create": 0,
			"notifications_delete": 0,
			"notifications_read": 1,
			"notifications_write": 0,
			"tags_create": 1,
			"tags_delete": 0,
			"tags_read": 1,
			"tags_write": 1,
			"roles_create": 0,
			"roles_delete": 0,
			"roles_read": 1,
			"roles_write": 0,
			"mis": 0,
			"smart_insights": 0,
		},
	]

	for role_data in roles:
		try:
			existing = frappe.get_all(
				"CG Role",
				filters={
					"role_name": role_data["role_name"],
					# "company_id": company.name,
				},
				fields=["name"],
			)
			if existing:
				continue

			frappe.get_doc({"doctype": "CG Role", **role_data}).insert()

		except Exception as e:
			frappe.log_error(
				f"Failed to create CG Role {role_data['role_name']} for {company.name}: {str(e)}"
			)
			raise  # Raise to ensure role creation failures are not ignored

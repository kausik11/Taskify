import frappe
from frappe import _
from frappe.model.document import Document


class CGTags(Document):
	def validate(self):
		"""Ensure only admins can create tags and required fields exist."""
		if not self.tag_name:
			frappe.throw(_("Tag Name is required"))
		if not self.company_id:
			frappe.throw(_("Company ID is required"))
		if not is_admin():
			frappe.throw(_("You do not have permission to create tags."))

	def on_insert(self):
		"""Create corresponding tag in Core Tags on insert."""
		create_tag(self.tag_name)


def is_admin() -> bool:
	"""Check if the current session user has the admin role."""
	user_email = frappe.session.user
	roles = frappe.get_roles(user_email)
	return "CG-ROLE-ADMIN" in roles


def create_tag(tag_name: str):
	"""Create the tag in Core Tags if it doesn't already exist."""
	tag_name = tag_name.strip()
	if not tag_name:
		frappe.throw(_("Tag Name cannot be empty."))

	if not frappe.db.exists("Tag", {"name": tag_name}):
		new_tag = frappe.get_doc({"doctype": "Tag", "name": tag_name})
		new_tag.insert()

	return None

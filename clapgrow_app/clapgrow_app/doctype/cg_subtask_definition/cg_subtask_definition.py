# Copyright (c) 2025, Clapgrow and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document

from clapgrow_app.api.tasks.task_utils import parse_datetime


class CGSubtaskDefinition(Document):
	def validate(self):
		"""Validate subtask definition fields and business rules."""
		self.validate_required_fields()
		self.validate_due_date()
		self.validate_assigned_user()

	def validate_required_fields(self):
		"""Ensure all required fields are properly filled."""
		if not self.subtask_name or not self.subtask_name.strip():
			frappe.throw(_("Subtask name is required"))

		if not self.assigned_to:
			frappe.throw(_("Assigned To is required for subtask"))

		if not self.due_date:
			frappe.throw(_("Due date is required for subtask"))

	def validate_due_date(self):
		"""Validate subtask due date against parent task (if available)."""
		# Get parent task definition from the parent document
		if hasattr(self, "parent") and self.parent:
			try:
				parent_doc = frappe.get_doc("CG Task Definition", self.parent)
				if parent_doc.due_date and self.due_date:
					parent_due = parse_datetime(parent_doc.due_date)
					subtask_due = parse_datetime(self.due_date)

					if subtask_due > parent_due:
						frappe.throw(
							_("Subtask '{0}' due date cannot be after parent task due date").format(
								self.subtask_name
							)
						)
			except Exception as e:
				frappe.logger().warning(f"Could not validate due date against parent: {str(e)}")

	def validate_assigned_user(self):
		"""Validate that the assigned user exists and is active."""
		if self.assigned_to:
			user_exists = frappe.db.exists("CG User", self.assigned_to)
			if not user_exists:
				frappe.throw(_("Assigned user '{0}' does not exist").format(self.assigned_to))

			# Check if user is enabled
			user_enabled = frappe.get_value("CG User", self.assigned_to, "enabled")
			if not user_enabled:
				frappe.throw(_("Cannot assign subtask to disabled user '{0}'").format(self.assigned_to))

	def before_save(self):
		"""Actions to perform before saving the document."""
		# Ensure subtask name is trimmed
		if self.subtask_name:
			self.subtask_name = self.subtask_name.strip()

	def get_subtask_summary(self):
		"""Get a summary of this subtask for display purposes."""
		return {
			"name": self.subtask_name,
			"assigned_to": self.assigned_to,
			"due_date": self.due_date,
			"is_completed": getattr(self, "is_completed", 0),
			"submit_file": self.submit_file or "[]",
		}

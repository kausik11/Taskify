# Copyright (c) 2025, Clapgrow and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document

from clapgrow_app.api.tasks.task_utils import parse_datetime


class CGSubtaskInstance(Document):
	def validate(self):
		"""Validate subtask instance fields and business rules."""
		self.validate_required_fields()
		self.validate_due_date()
		self.validate_assigned_user()
		self.validate_parent_reference()

	def validate_required_fields(self):
		"""Ensure all required fields are properly filled."""
		if not self.subtask_name or not self.subtask_name.strip():
			frappe.throw(_("Subtask name is required"))

		if not self.assigned_to:
			frappe.throw(_("Assigned To is required for subtask"))

		if not self.due_date:
			frappe.throw(_("Due date is required for subtask"))

		if not self.company_id:
			frappe.throw(_("Company ID is required for subtask"))

	def validate_due_date(self):
		"""Validate subtask due date against parent task (if available)."""
		# Get parent task instance from the parent document
		if hasattr(self, "parent") and self.parent:
			try:
				parent_doc = frappe.get_doc("CG Task Instance", self.parent)
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

	def validate_parent_reference(self):
		"""Validate parent task reference if this is part of a parent task."""
		# This validation will be handled by the parent CGTaskInstance
		# when subtask instances are created from subtask definitions
		pass

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
			"is_completed": self.is_completed,
			"submit_file": self.submit_file or "[]",
			"company_id": self.company_id,
		}

	def on_update(self):
		"""Actions to perform when subtask instance is updated."""
		previous_doc = self.get_doc_before_save()
		previous_is_completed = previous_doc.is_completed if previous_doc else 0

		# If this subtask is completed, notify parent task about completion
		if self.is_completed == 1 and previous_is_completed == 0:
			self.notify_parent_task_completion()

	def notify_parent_task_completion(self):
		"""Notify parent task when this subtask is completed."""
		# This will be handled by the main CGTaskInstance when the
		# actual task instance (not this subtask definition) is completed
		pass

	def before_insert(self):
		"""Actions to perform before inserting new subtask instance."""
		# Ensure company_id is set
		if not self.company_id:
			if hasattr(self, "parent") and self.parent:
				try:
					parent_doc = frappe.get_doc("CG Task Instance", self.parent)
					self.company_id = parent_doc.company_id
					frappe.logger().info(f"Set company_id {self.company_id} from parent task {self.parent}")
				except Exception as e:
					frappe.logger().warning(f"Could not set company_id from parent: {str(e)}")

			# If still no company_id, try to get it from the current user's default company
			if not self.company_id:
				try:
					user_company = frappe.get_value("CG User", frappe.session.user, "company_id")
					if user_company:
						self.company_id = user_company
						frappe.logger().info(f"Set company_id {self.company_id} from current user")
				except Exception as e:
					frappe.logger().warning(f"Could not set company_id from current user: {str(e)}")

	def get_completion_status(self):
		"""Get completion status for reporting purposes."""
		return {
			"subtask_name": self.subtask_name,
			"assigned_to": self.assigned_to,
			"is_completed": self.is_completed,
			"due_date": self.due_date,
		}

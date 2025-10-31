"""
Patch to update all previously completed CG Task Instance documents
to have completion_platform set to 'Web' since they were completed via web interface.
"""

import frappe
from frappe import _


def execute():
	"""
	Update all completed CG Task Instance documents to set completion_platform to 'Web'
	for tasks that were completed before this field was introduced.
	"""
	try:
		# Get all completed tasks that don't have completion_platform set
		completed_tasks = frappe.get_all(
			"CG Task Instance",
			filters={"is_completed": 1, "completion_platform": ["is", "not set"]},
			fields=["name"],
		)

		if not completed_tasks:
			frappe.msgprint(_("No completed tasks found that need completion_platform update."))
			return

		frappe.msgprint(f"Found {len(completed_tasks)} completed tasks to update.")

		# Update each task
		updated_count = 0
		for task in completed_tasks:
			try:
				frappe.db.set_value("CG Task Instance", task.name, "completion_platform", "Web")
				updated_count += 1
			except Exception as e:
				frappe.log_error(
					f"Error updating task {task.name}: {str(e)}",
					"Completion Platform Update Error",
				)

		# Commit the changes
		frappe.db.commit()

		frappe.msgprint(f"Successfully updated {updated_count} tasks with completion_platform = 'Web'")

		# Log the migration
		frappe.logger().info(
			f"Migration completed: Updated {updated_count} CG Task Instance documents with completion_platform = 'Web'"
		)

	except Exception as e:
		frappe.log_error(
			f"Error in completion_platform migration: {str(e)}",
			"Completion Platform Migration Error",
		)
		frappe.msgprint(f"Migration failed: {str(e)}")
		raise

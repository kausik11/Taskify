import frappe
from frappe.utils import get_datetime


def execute():
	"""
	Update status_priority_map for all existing CG Task Instance records
	to include due_date timestamp for proper sorting.
	"""

	status_order = {
		"Due Today": 0,
		"Overdue": 1,
		"Upcoming": 2,
		"Completed": 3,
		"Paused": 4,
		"Rejected": 5,
	}
	priority_order = {
		"Critical": 0,
		"Medium": 1,
		"Low": 2,
	}

	# Get all task instances
	tasks = frappe.get_all("CG Task Instance", fields=["name", "status", "priority", "due_date"])

	frappe.logger().info(f"Found {len(tasks)} tasks to update")

	updated_count = 0
	error_count = 0

	for task in tasks:
		try:
			status_map = status_order.get(task.status, -1)
			priority_map = priority_order.get(task.priority, -1)

			# Convert due_date to timestamp
			due_datetime = get_datetime(task.due_date)
			due_date_timestamp = str(int(due_datetime.timestamp())).zfill(10)

			# Create new status_priority_map
			new_status_priority_map = f"{status_map}{priority_map}{due_date_timestamp}"

			# Update directly in database (bypasses validation/triggers)
			frappe.db.set_value(
				"CG Task Instance",
				task.name,
				"status_priority_map",
				new_status_priority_map,
				update_modified=False,  # Don't update modified timestamp
			)

			updated_count += 1

			# Progress indicator
			if updated_count % 100 == 0:
				frappe.logger().info(f"Updated {updated_count} tasks...")
				frappe.db.commit()  # Commit every 100 records

		except Exception as e:
			error_count += 1
			frappe.logger().error(f"Error updating task {task.name}: {str(e)}")
			continue

	# Final commit
	frappe.db.commit()

	frappe.logger().info(f"Migration completed: {updated_count} updated, {error_count} errors")

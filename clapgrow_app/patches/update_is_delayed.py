import frappe
from frappe.utils import get_datetime


def execute():
	"""
	Migration script to populate is_delayed field for existing CG Task Instance records.
	This should be run after adding the is_delayed field to the DocType.
	"""
	try:
		completed_tasks = frappe.get_all(
			"CG Task Instance",
			filters={"is_completed": 1},
			fields=["name", "completed_on", "due_date", "delayed_time"],
			limit=None,
		)

		updated_count = 0
		delayed_count = 0

		for task in completed_tasks:
			try:
				is_delayed = 0
				if task.delayed_time and task.delayed_time.strip():
					is_delayed = 1
					delayed_count += 1
				else:
					if task.completed_on and task.due_date:
						completed_on = get_datetime(task.completed_on)
						due_date = get_datetime(task.due_date)
						if completed_on > due_date:
							is_delayed = 1
							delayed_count += 1

				frappe.db.set_value(
					"CG Task Instance",
					task.name,
					"is_delayed",
					is_delayed,
					update_modified=False,
				)

				updated_count += 1

				if updated_count % 100 == 0:
					frappe.db.commit()

			except Exception as e:
				frappe.log_error(
					message=f"Error updating task {task.name}: {str(e)}",
					title="Migration Script Error",
				)
				continue

		# Final commit
		frappe.db.commit()

		return {
			"success": True,
			"updated_count": updated_count,
			"delayed_count": delayed_count,
		}

	except Exception as e:
		frappe.log_error(message=f"Migration script failed: {str(e)}", title="Migration Script Error")
		return {"success": False, "error": str(e)}

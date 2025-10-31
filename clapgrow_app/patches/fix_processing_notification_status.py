# Migration script to fix invalid "Processing" notification_status values
# This patch updates all CG Task Instance documents that have notification_status = "Processing"
# to "Pending" since "Processing" is not a valid option in the field definition

import frappe


def execute():
	"""
	Fix invalid "Processing" notification_status values in existing task instances.
	Updates them to "Pending" which is a valid value.
	"""
	print("=" * 80)
	print("Fixing invalid 'Processing' notification_status values")
	print("=" * 80)

	try:
		# Get all tasks with notification_status = "Processing"
		tasks = frappe.db.sql(
			"""
			SELECT name, notification_status
			FROM `tabCG Task Instance`
			WHERE notification_status = 'Processing'
			""",
			as_dict=True,
		)

		print(f"\nFound {len(tasks)} tasks with invalid 'Processing' status")

		if not tasks:
			print("No tasks to fix. All tasks have valid notification status.")
			return {"status": "success", "total_updated": 0}

		# Update in batches
		batch_size = 500
		total_updated = 0

		for i in range(0, len(tasks), batch_size):
			batch = tasks[i : i + batch_size]

			print(f"\nProcessing batch {i // batch_size + 1}: {len(batch)} tasks")

			for task in batch:
				try:
					# Update notification_status from "Processing" to "Pending"
					frappe.db.set_value(
						"CG Task Instance",
						task["name"],
						"notification_status",
						"Pending",
						update_modified=False,
					)

					total_updated += 1

					if total_updated % 100 == 0:
						print(f"  Updated {total_updated} tasks...")

				except Exception as e:
					print(f"  Error updating task {task['name']}: {str(e)}")
					continue

			# Commit after each batch
			frappe.db.commit()
			print(f"  Batch committed: {len(batch)} tasks updated")

		print("\n" + "=" * 80)
		print(f"MIGRATION COMPLETED: {total_updated} tasks updated")
		print("All 'Processing' values have been changed to 'Pending'")
		print("=" * 80)

		return {"status": "success", "total_updated": total_updated}

	except Exception as e:
		print(f"\nERROR during migration: {str(e)}")
		frappe.log_error(
			message=f"Migration error: {str(e)}\n{frappe.get_traceback()}",
			title="Fix Processing Notification Status Error",
		)

		return {"status": "error", "error": str(e)}

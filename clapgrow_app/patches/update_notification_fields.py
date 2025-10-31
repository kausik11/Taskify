# Migration script to update existing task instances with notification fields
# RUN THIS ONCE after deploying the changes

from datetime import datetime

import frappe


def execute():
	"""
	Migrate existing task instances to have proper notification fields including notification_type.
	Sets notification_status to "Sent" for old tasks (assuming they were already notified).
	Sets appropriate notification_type based on task state.
	"""

	print("=" * 80)
	print("Adding notification tracking to existing tasks")
	print("=" * 80)

	try:
		# Get all tasks without notification_status set
		tasks = frappe.get_all(
			"CG Task Instance",
			# filters=[["notification_status", "in", ["", None]]],
			fields=["name", "creation", "task_type", "is_completed", "status", "modified"],
			limit_page_length=0,  # Get all
		)

		print(f"\nFound {len(tasks)} tasks to migrate")

		if not tasks:
			print("No tasks to migrate. All tasks already have notification status.")
			return

		# Process in batches
		batch_size = 500
		total_updated = 0

		for i in range(0, len(tasks), batch_size):
			batch = tasks[i : i + batch_size]

			print(f"\nProcessing batch {i // batch_size + 1}: {len(batch)} tasks")

			for task in batch:
				try:
					# Determine appropriate notification type based on task state
					notification_type = _determine_notification_type(task)

					# For old tasks, set as "Sent" (assume they were already notified)
					notification_status = "Sent"
					notification_sent_on = task["creation"]

					frappe.db.set_value(
						"CG Task Instance",
						task["name"],
						{
							"notification_type": notification_type,
							"notification_status": notification_status,
							"notification_sent_on": notification_sent_on,
							"skip_notification": 0,
						},
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
		print("=" * 80)

		return {"status": "success", "total_updated": total_updated}

	except Exception as e:
		print(f"\nERROR during migration: {str(e)}")
		frappe.log_error(
			message=f"Migration error: {str(e)}\n{frappe.get_traceback()}",
			title="Task Notification Migration V2 Error",
		)

		return {"status": "error", "error": str(e)}


def _determine_notification_type(task):
	"""
	Determine appropriate notification type based on task state.

	Args:
	    task: Task data dict

	Returns:
	    str: Notification type
	"""
	# If completed, set as Completed
	if task.get("is_completed"):
		return "Completed"

	# If rejected, set as Rejected
	if task.get("status") == "Rejected":
		return "Rejected"

	# If paused, set as Paused
	if task.get("status") == "Paused":
		return "Paused"

	# Default: Created (most tasks are creation notifications)
	return "Created"

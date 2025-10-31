# Copyright (c) 2024, Clapgrow and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class CGTaskGenerationLog(Document):
	"""Log for tracking CG Task Definition generation status and results."""

	def validate(self):
		"""Validate the generation log data."""
		if not self.generation_date:
			frappe.throw("Generation Date is required")

		if not self.generation_status:
			frappe.throw("Generation Status is required")

		# Validate status values
		valid_statuses = ["In Progress", "Completed", "Failed", "Partial Success"]
		if self.generation_status not in valid_statuses:
			frappe.throw(f"Generation Status must be one of: {', '.join(valid_statuses)}")

	def before_save(self):
		"""Set audit fields before saving."""
		if not self.created_by:
			self.created_by = frappe.session.user

		if not self.creation_time:
			self.creation_time = frappe.utils.now()

		self.modified_by = frappe.session.user
		self.modified_time = frappe.utils.now()


@frappe.whitelist()
def create_generation_log(
	generation_date,
	generation_status,
	total_task_definitions=0,
	active_task_definitions=0,
	paused_task_definitions=0,
	auto_resumed_task_definitions=0,
	total_instances_created=0,
	generation_duration_seconds=0,
	week_start_date=None,
	week_end_date=None,
	error_message=None,
	error_details=None,
	generation_summary=None,
):
	"""
	Create a new task generation log entry.

	Args:
		generation_date: Date when generation was performed
		generation_status: Status of generation (Success/Failed/Partial Success)
		total_task_definitions: Total number of task definitions processed
		active_task_definitions: Number of active task definitions
		paused_task_definitions: Number of paused task definitions
		auto_resumed_task_definitions: Number of auto-resumed task definitions
		total_instances_created: Total number of task instances created
		generation_duration_seconds: Duration of generation process in seconds
		week_start_date: Start date of the week for which instances were generated
		week_end_date: End date of the week for which instances were generated
		error_message: Error message if generation failed
		error_details: Detailed error information
		generation_summary: Summary of the generation process

	Returns:
		The created log document
	"""
	try:
		log_doc = frappe.get_doc(
			{
				"doctype": "CG Task Generation Log",
				"generation_date": generation_date,
				"generation_status": generation_status,
				"total_task_definitions": total_task_definitions,
				"active_task_definitions": active_task_definitions,
				"paused_task_definitions": paused_task_definitions,
				"auto_resumed_task_definitions": auto_resumed_task_definitions,
				"total_instances_created": total_instances_created,
				"generation_duration_seconds": generation_duration_seconds,
				"week_start_date": week_start_date,
				"week_end_date": week_end_date,
				"error_message": error_message,
				"error_details": error_details,
				"generation_summary": generation_summary,
			}
		)

		log_doc.insert(ignore_permissions=True)
		frappe.db.commit()

		return log_doc

	except Exception as e:
		frappe.log_error(
			message=f"Failed to create task generation log: {str(e)}", title="Task Generation Log Error"
		)
		raise


@frappe.whitelist()
def get_recent_generation_logs(limit=10):
	"""
	Get recent task generation logs.

	Args:
		limit: Maximum number of logs to return

	Returns:
		List of recent generation logs
	"""
	try:
		logs = frappe.get_all(
			"CG Task Generation Log",
			fields=[
				"name",
				"generation_date",
				"generation_status",
				"total_task_definitions",
				"active_task_definitions",
				"paused_task_definitions",
				"auto_resumed_task_definitions",
				"total_instances_created",
				"generation_duration_seconds",
				"week_start_date",
				"week_end_date",
				"error_message",
				"creation_time",
			],
			order_by="creation_time desc",
			limit=limit,
		)

		return logs

	except Exception as e:
		frappe.log_error(
			message=f"Failed to get recent generation logs: {str(e)}", title="Get Generation Logs Error"
		)
		return []


@frappe.whitelist()
def get_generation_log_by_date(generation_date):
	"""
	Get task generation log for a specific date.

	Args:
		generation_date: Date to get log for

	Returns:
		Generation log for the specified date or None
	"""
	try:
		logs = frappe.get_all(
			"CG Task Generation Log",
			filters={"generation_date": generation_date},
			fields=[
				"name",
				"generation_date",
				"generation_status",
				"total_task_definitions",
				"active_task_definitions",
				"paused_task_definitions",
				"auto_resumed_task_definitions",
				"total_instances_created",
				"generation_duration_seconds",
				"week_start_date",
				"week_end_date",
				"error_message",
				"error_details",
				"generation_summary",
				"creation_time",
			],
			order_by="creation_time desc",
			limit=1,
		)

		return logs[0] if logs else None

	except Exception as e:
		frappe.log_error(
			message=f"Failed to get generation log for date {generation_date}: {str(e)}",
			title="Get Generation Log by Date Error",
		)
		return None

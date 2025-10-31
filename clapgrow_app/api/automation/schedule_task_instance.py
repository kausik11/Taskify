from datetime import datetime, timedelta

import frappe
from dateutil.relativedelta import relativedelta

from clapgrow_app.api.tasks.task_utils import get_user_email, handle_task_status, parse_date
from clapgrow_app.clapgrow_app.doctype.cg_task_definition.cg_task_definition import create_task_instance


def enqueue_generate_recurring_task():
	"""Enqueue the generate_scheduled_task_instances job."""
	try:
		frappe.enqueue(
			"clapgrow_app.api.automation.schedule_task_instance.generate_recurring_tasks",
			queue="long",
			job_name="generate_recurring_tasks",
			enqueue_after_commit=True,
		)

	except Exception as e:
		frappe.log_error(frappe.get_traceback(), "Scheduler Error")
		raise e


def generate_recurring_tasks():
	"""Generate recurring task instances every Sunday at 3 AM."""
	frappe.logger().info("Generating recurring tasks - function started.")

	monday_datetime = datetime.now() + timedelta(days=1)
	start_of_week = monday_datetime.replace(hour=0, minute=0, second=0, microsecond=0)
	end_of_week = start_of_week + timedelta(days=5)  # Saturday

	recurring_tasks = frappe.get_all(
		"CG Task Definition",
		filters={
			"task_type": "Recurring",
			"generated_till_date": ("<=", end_of_week),
			"is_completed": 0,
			"enabled": 1,
		},
		fields=["name", "generated_till_date"],
	)

	for task in recurring_tasks:
		task_doc = frappe.get_last_doc(
			"CG Task Instance", {"task_definition_id": task["name"], "task_type": "Recurring"}
		)

		# Parse generated_till_date as a datetime object
		generated_till_date = parse_date(task.generated_till_date)

		if task.recurrence_type_id.lower() == "daily":
			generate_daily_tasks(task_doc, start_of_week, end_of_week, generated_till_date)
		else:
			generate_other_frequency_tasks(task_doc, generated_till_date)

	frappe.logger().info("Generating recurring tasks - function completed.")


def generate_daily_tasks(task_doc, start_of_week, end_of_week, generated_till_date):
	"""Generates daily recurring tasks for the upcoming week."""
	current_time = datetime.now()

	# If the generated_till_date is before the current week, then create tasks from Monday to Saturday.
	# But ensure we don't start from a date before current time
	current_date = generated_till_date if generated_till_date >= start_of_week else start_of_week
	current_date = max(current_date, current_time)

	while current_date <= end_of_week:
		create_and_schedule_task(task_doc, current_date)
		current_date += timedelta(days=1)


def generate_other_frequency_tasks(task_doc, generated_till_date):
	"""Generates tasks for frequencies other than daily (Weekly, Monthly)."""
	frequency = task_doc.recurrence_type_id
	new_date = get_next_date(frequency, generated_till_date)
	scheduled_task = create_scheduled_task_instance(task_doc, new_date)
	scheduled_task.insert()


def create_and_schedule_task(task_doc, new_due_date):
	"""Creates and schedules a task instance."""
	scheduled_task = create_task_instance(task_doc, new_due_date)
	scheduled_task.insert()

	scheduled_task.save()


def create_scheduled_task_instance(task_doc, new_due_date):
	"""Creates a scheduled task instance."""
	scheduled_task = frappe.get_doc(
		{
			"doctype": "CG Task Instance",
			"task_definition_id": task_doc.task_definition_id,
			"task_name": task_doc.task_name,
			"description": task_doc.description,
			"status": handle_task_status(new_due_date.strftime("%Y-%m-%d")),
			"recurrence_type_id": task_doc.recurrence_type_id,
			"due_date": new_due_date,
			"priority": task_doc.priority,
			"assigned_to": get_user_email(task_doc.assigned_to),
			"assignee": get_user_email(task_doc.assignee),
			"checker": get_user_email(task_doc.checker, allow_none=True),
			"upload_required": task_doc.upload_required,
			"company_id": task_doc.company_id,
		}
	)
	return scheduled_task


def create_cg_subtask_link(subtask_doc, parent_task_doc):
	"""Creates a link between the subtask and its parent task."""
	cg_subtask_doc = frappe.get_doc(
		{
			"doctype": "CG Subtask",
			"parent_task_type": parent_task_doc.doctype,
			"parent_task_id": parent_task_doc.name,
			"subtask_id": subtask_doc.name,
			"company_id": parent_task_doc.company_id,
		}
	)
	cg_subtask_doc.insert()


def add_tags_to_task(task_doc, tags):
	"""Adds tags to a task."""
	if tags:
		for tag in tags:
			task_doc.add_tag(tag)


def get_next_date(frequency, last_generated_date):
	"""Returns the next scheduled date based on the task's frequency with exact calendar calculations."""

	# Ensure last_generated_date is a datetime object
	if isinstance(last_generated_date, str):
		last_generated_date = parse_date(last_generated_date).date()

	if frequency.lower() == "weekly":
		return last_generated_date + relativedelta(weeks=1)

	elif frequency.lower() == "fortnightly":
		return last_generated_date + relativedelta(weeks=2)

	elif frequency.lower() == "monthly":
		return last_generated_date + relativedelta(months=1)

	elif frequency.lower() == "quarterly":
		return last_generated_date + relativedelta(months=3)

	elif frequency.lower() == "half-yearly":
		return last_generated_date + relativedelta(months=6)

	elif frequency.lower() == "yearly":
		return last_generated_date + relativedelta(years=1)

	else:
		frappe.throw(f"Unknown frequency type: {frequency}")

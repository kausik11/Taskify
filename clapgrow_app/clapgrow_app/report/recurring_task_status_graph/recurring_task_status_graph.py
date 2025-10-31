# Copyright (c) 2025, Clapgrow and contributors
# For license information, please see license.txt

from datetime import datetime, timedelta

import frappe
from frappe import _
from frappe.utils import get_first_day, get_last_day, getdate, now_datetime, nowdate

from clapgrow_app.clapgrow_app.report.recurring_task_status.recurring_task_status import get_date_range


def execute(filters: dict | None = None):
	"""Return columns and data for the report."""
	filters = filters or {}
	trend_type = filters.get("trend", "This Week")
	company_id = filters.get("company_id")

	if not company_id:
		frappe.throw(_("Please select a company to view the report."))

	start_date, end_date = get_date_range(trend_type)

	columns = get_columns()
	data = get_data(start_date, end_date, company_id)
	return columns, data


def get_columns():
	"""Return columns for the report including department task status fields."""
	return [
		{"label": _("Department"), "fieldname": "department", "fieldtype": "Data", "width": 150},
		{"label": _("Completed"), "fieldname": "completed", "fieldtype": "Int", "width": 120},
		{"label": _("Upcoming"), "fieldname": "upcoming", "fieldtype": "Int", "width": 120},
		{"label": _("Overdue"), "fieldname": "overdue", "fieldtype": "Int", "width": 120},
		{"label": _("Due Today"), "fieldname": "due_today", "fieldtype": "Int", "width": 120},
		{"label": _("Total Tasks"), "fieldname": "total_tasks", "fieldtype": "Int", "width": 120},
	]


def get_data(start_date, end_date, company_id):
	"""Return aggregated task status data by department for the specified company."""
	department_task_status = get_task_status_by_department(start_date, end_date, company_id)

	# Prepare the data for the report based on the department task status
	results = []
	for department, status in department_task_status.items():
		results.append(
			{
				"department": department.split("-")[0].strip() if department else department,
				"completed": status["completed"],
				"upcoming": status["upcoming"],
				"overdue": status["overdue"],
				"due_today": status["due_today"],
				"total_tasks": status["total_tasks"],
			}
		)

	# Sorting the results based on the completed tasks
	results = sorted(results, key=lambda x: x["completed"], reverse=True)
	return results


def get_task_status_by_department(start_date, end_date, company_id):
	"""Return aggregated task status for each department based on recurring tasks for the company."""

	users = frappe.get_all(
		"CG User", filters={"company_id": company_id}, fields=["full_name", "email", "department_id"]
	)

	if not users:
		return {}

	user_emails = [user["email"] for user in users]

	# Fetch all recurring tasks in the date range for company users
	tasks = frappe.get_all(
		"CG Task Instance",
		filters={
			"task_type": "Recurring",
			"due_date": ["between", [start_date, end_date]],
			"assigned_to": ["in", user_emails],
		},
		fields=["status", "assigned_to", "due_date"],
	)

	# Initialize a dictionary to hold task status aggregates by department
	department_task_status = {}

	# Initialize department_task_status with empty counts for each department
	for user in users:
		department_id = user.get("department_id")
		if department_id not in department_task_status:
			department_task_status[department_id] = {
				"completed": 0,
				"upcoming": 0,
				"overdue": 0,
				"due_today": 0,
				"total_tasks": 0,
			}

	# Process the tasks and update the task status in the department dictionary
	for task in tasks:
		assigned_to = task.get("assigned_to")
		status = task.get("status")

		# Find the department the user belongs to
		user_department = next(
			(user["department_id"] for user in users if user["email"] == assigned_to), None
		)

		if user_department:
			# Update department task status based on task status
			department_task_status[user_department]["total_tasks"] += 1
			if status == "Completed":
				department_task_status[user_department]["completed"] += 1
			elif status == "Upcoming":
				department_task_status[user_department]["upcoming"] += 1
			elif status == "Overdue":
				department_task_status[user_department]["overdue"] += 1
			elif status == "Due Today":
				department_task_status[user_department]["due_today"] += 1

	return department_task_status

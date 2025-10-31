# Copyright (c) 2025, Clapgrow and contributors
# For license information, please see license.txt

from datetime import datetime, timedelta

import frappe
from frappe import _
from frappe.utils import get_first_day, get_last_day, getdate, now_datetime, nowdate


def execute(filters: dict | None = None):
	"""Return columns and data for the report."""
	filters = filters or {}
	company_id = filters.get("company_id")
	if not company_id:
		frappe.throw(_("Please select a company to view the report."))

	columns = get_columns()
	data = get_data(filters, company_id)
	return columns, data


def get_columns():
	"""Return columns for the report including comparison fields."""
	return [
		{
			"label": _("Completed(%)"),
			"fieldname": "completed_percentage",
			"fieldtype": "Float",
			"width": 120,
		},
		{
			"label": _("Previous Completed(%)"),
			"fieldname": "previous_completed_percentage",
			"fieldtype": "Float",
			"width": 150,
		},
		{"label": _("Change(%)"), "fieldname": "change_percentage", "fieldtype": "Float", "width": 120},
		{"label": _("Completed"), "fieldname": "completed", "fieldtype": "Int", "width": 120},
		{"label": _("Overdue"), "fieldname": "overdue", "fieldtype": "Int", "width": 120},
		{"label": _("Upcoming"), "fieldname": "upcoming", "fieldtype": "Int", "width": 120},
		{"label": _("Due Today"), "fieldname": "due_today", "fieldtype": "Int", "width": 120},
		{"label": _("Total Tasks"), "fieldname": "total_tasks", "fieldtype": "Int", "width": 120},
	]


def get_data(filters, company_id):
	"""Return data based on the selected trend filter and company."""
	results = []
	trend_type = filters.get("trend") if filters else "This Week"

	user_filters = {"company_id": company_id} if company_id else {}
	users = frappe.get_all(
		"CG User",
		filters=user_filters,
		fields=["email"],
	)
	user_emails = [user["email"] for user in users]

	if not user_emails:  # If no users found for the company, return empty results
		return results

	if trend_type == "This Week":
		current_data = get_task_stats("This Week", "Recurring", user_emails)
		previous_data = get_task_stats("Last Week", "Recurring", user_emails)
		change = current_data["completed_percentage"] - previous_data["completed_percentage"]
		results.append(
			{
				"completed_percentage": current_data["completed_percentage"],
				"previous_completed_percentage": previous_data["completed_percentage"],
				"change_percentage": change,
				"completed": current_data["completed"],
				"overdue": current_data["overdue"],
				"upcoming": current_data["upcoming"],
				"due_today": current_data["due_today"],
				"total_tasks": current_data["total_tasks"],
			}
		)
	elif trend_type == "Last 30 Days":
		current_data = get_task_stats("Last 30 Days", "Recurring", user_emails)
		previous_data = get_task_stats("Previous 30 Days", "Recurring", user_emails)
		change = current_data["completed_percentage"] - previous_data["completed_percentage"]
		results.append(
			{
				"completed_percentage": current_data["completed_percentage"],
				"previous_completed_percentage": previous_data["completed_percentage"],
				"change_percentage": change,
				"completed": current_data["completed"],
				"overdue": current_data["overdue"],
				"upcoming": current_data["upcoming"],
				"due_today": current_data["due_today"],
				"total_tasks": current_data["total_tasks"],
			}
		)
	else:
		# Default to original behavior if no trend is selected
		this_week_data = get_task_stats("This Week", "Recurring", user_emails)
		this_week_data["trend"] = "This Week"
		results.append(this_week_data)

		last_month_data = get_task_stats("Last Month", "Recurring", user_emails)
		last_month_data["trend"] = "Last Month"
		results.append(last_month_data)

	results = sorted(results, key=lambda x: x["completed_percentage"], reverse=True)
	return results


def get_task_stats(time_range, task_type=None, user_emails=None):
	"""Fetch task statistics for the given time range and users."""
	start_date, end_date = get_date_range(time_range)

	task_filters = {
		"due_date": ["between", [start_date, end_date]],
		"task_type": task_type,
	}
	if user_emails:
		task_filters["assigned_to"] = ["in", user_emails]

	tasks = frappe.get_all(
		"CG Task Instance",
		filters=task_filters,
		fields=["status", "due_date"],
	)

	total_tasks = len(tasks)
	completed_tasks = sum(1 for task in tasks if task["status"] == "Completed")
	overdue_tasks = sum(1 for task in tasks if task["status"] == "Overdue")
	upcoming_tasks = sum(1 for task in tasks if task["status"] == "Upcoming")
	due_today_tasks = sum(1 for task in tasks if task["status"] == "Due Today")

	completed_percentage = (completed_tasks / total_tasks * 100) if total_tasks else 0

	return {
		"completed_percentage": round(completed_percentage, 2),
		"completed": completed_tasks,
		"overdue": overdue_tasks,
		"upcoming": upcoming_tasks,
		"due_today": due_today_tasks,
		"total_tasks": total_tasks,
	}


def get_date_range(time_range):
	"""Return start and end dates for various time ranges."""
	today = now_datetime().date()
	datetime_min = datetime.min.time()
	datetime_max = datetime.max.time()

	if time_range == "This Week":
		start = today - timedelta(days=today.weekday())
		end = start + timedelta(days=6)
	elif time_range == "Last Week":
		start = today - timedelta(days=today.weekday() + 7)
		end = start + timedelta(days=6)
	elif time_range == "Last 30 Days":
		end = today
		start = today - timedelta(days=30)
	elif time_range == "Previous 30 Days":
		end = today - timedelta(days=30)
		start = end - timedelta(days=30)
	elif time_range == "Last Month":
		start = get_first_day(today - timedelta(days=1))
		end = get_last_day(today - timedelta(days=1))
	else:
		raise ValueError(f"Invalid time_range: {time_range}")

	return datetime.combine(start, datetime_min), datetime.combine(end, datetime_max)

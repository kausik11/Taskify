# Copyright (c) 2025, Clapgrow and contributors
# For license information, please see license.txt

from datetime import datetime, timedelta

import frappe
from frappe import _
from frappe.utils import get_first_day, get_last_day, now_datetime

from clapgrow_app.clapgrow_app.report.recurring_task_status.recurring_task_status import get_date_range


def execute(filters=None):
	"""Return columns and data for the report.

	This is the main entry point for the report. It accepts the filters as a
	dictionary and should return columns and data. It is called by the framework
	every time the report is refreshed or a filter is updated.
	"""
	filters = filters or {}
	trend_type = filters.get("trend")
	company_id = filters.get("company_id")  # Get company_id from filters

	# Get date range based on selection
	start_date, end_date = get_date_range(trend_type)

	columns = get_columns()
	data = get_data(start_date, end_date, company_id)  # Pass company_id to get_data
	return columns, data


def get_columns():
	"""Return columns for the report.

	One field definition per column, just like a DocType field definition.
	"""
	return [
		{"label": _("Full Name"), "fieldname": "full_name", "fieldtype": "Data", "width": 220},
		{"label": _("Email"), "fieldname": "email", "fieldtype": "Data", "width": 280},
		{"label": _("User Image"), "fieldname": "user_image", "fieldtype": "Image", "width": 100},
		{"label": _("Department"), "fieldname": "department", "fieldtype": "Data", "width": 150},
		{"label": _("Branch"), "fieldname": "branch", "fieldtype": "Data", "width": 150},
		{"label": _("Weekly Score (%)"), "fieldname": "weekly_score", "fieldtype": "Float", "width": 120},
		{"label": _("Completed Tasks"), "fieldname": "completed_tasks", "fieldtype": "Int", "width": 120},
		{"label": _("Total Tasks"), "fieldname": "total_tasks", "fieldtype": "Int", "width": 120},
		{"label": _("Incomplete Tasks"), "fieldname": "incomplete_tasks", "fieldtype": "Int", "width": 120},
	]


def get_data(start_date, end_date, company_id=None):
	# Filter users by company_id if provided
	user_filters = {"company_id": company_id} if company_id else {}
	users = frappe.get_all(
		"CG User", fields=["full_name", "email", "department_id", "branch_id"], filters=user_filters
	)
	results = []

	for user in users:
		# Fetch user image from User doctype
		user_image = frappe.get_value("User", user["email"], "user_image") or ""

		# Fetch tasks only within the selected time range
		tasks = frappe.get_all(
			"CG Task Instance",
			filters={
				"assigned_to": user["email"],
				"due_date": ["between", [start_date, end_date]],
			},
			fields=["status", "due_date"],
		)

		total_tasks = len(tasks)
		if not tasks or total_tasks == 0:
			continue

		completed_tasks = sum(1 for task in tasks if task["status"] == "Completed")
		incomplete_tasks = total_tasks - completed_tasks

		# If no tasks, set the score to 100% (merciful approach)
		weekly_score = (completed_tasks / total_tasks * 100) if total_tasks else 100

		# Include all users, even those with no tasks, for fairness
		results.append(
			{
				"full_name": user["full_name"],
				"email": user["email"],
				"user_image": user_image,
				"department": user["department_id"],
				"branch": user["branch_id"],
				"weekly_score": round(weekly_score, 2),
				"completed_tasks": completed_tasks,
				"total_tasks": total_tasks,
				"incomplete_tasks": incomplete_tasks,
			}
		)

	# Sort by:
	# 1. Weekly score ascending (lower is worse)
	# 2. Incomplete tasks descending (more is worse) as a tiebreaker
	results.sort(key=lambda x: (x["weekly_score"], -x["incomplete_tasks"]))

	# Get bottom 5 performers
	bottom_performers = results[:5]

	return bottom_performers

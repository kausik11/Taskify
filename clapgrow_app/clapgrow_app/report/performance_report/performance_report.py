# Copyright (c) 2025, Clapgrow and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import add_days, now_datetime


def execute(filters: dict | None = None):
	"""Return columns and data for the report."""
	filters = filters or {}
	company_id = filters.get("company_id")

	if not company_id:
		frappe.throw(_("Please select a company to view the report."))

	columns = get_columns()
	data = get_data(filters)
	return columns, data


def get_columns() -> list[dict]:
	"""Return columns for the report."""
	return [
		{"label": _("Users (80-100)"), "fieldname": "users_80_100", "fieldtype": "Int", "width": 150},
		{"label": _("Users (20-80)"), "fieldname": "users_20_80", "fieldtype": "Int", "width": 150},
		{"label": _("Users (<20)"), "fieldname": "users_below_20", "fieldtype": "Int", "width": 150},
	]


def get_data(filters: dict) -> list[list]:
	"""Return data for the report."""
	company_id = filters["company_id"]

	# Determine date range based on trend filter
	today = now_datetime().date()
	if filters.get("trend") == "This Week":
		start_date = add_days(today, -today.weekday())
		end_date = today
	else:
		start_date = add_days(today, -30)
		end_date = today

	user_conditions = {"company_id": company_id}

	users = frappe.get_all("CG User", filters=user_conditions, fields=["full_name", "email"])

	if not users:
		return [[0, 0, 0]]  # Return zeros if no users found for the company

	# Initialize counters
	score_counts = {
		"80-100": 0,  # Maps to 0 to -20
		"20-80": 0,  # Maps to -20 to -80
		"<20": 0,  # Maps to -80 to -100
	}

	for user in users:
		tasks = frappe.get_all(
			"CG Task Instance",
			filters={"assigned_to": user["email"], "due_date": ["between", [start_date, end_date]]},
			fields=["status"],
		)

		total_tasks = len(tasks)
		completed_tasks = sum(1 for task in tasks if task["status"] == "Completed")
		weekly_score = (((completed_tasks / total_tasks) - 1) * 100) if total_tasks else 0

		# Categorize based on score
		if -20 <= weekly_score <= 0:  # Top performers (80-100%)
			score_counts["80-100"] += 1
		elif -80 <= weekly_score < -20:  # Middle range (20-80%)
			score_counts["20-80"] += 1
		elif weekly_score < -80:  # Bottom performers (<20%)
			score_counts["<20"] += 1

	# Prepare data row
	data = [[score_counts["80-100"], score_counts["20-80"], score_counts["<20"]]]

	return data

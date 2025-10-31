# Copyright (c) 2025, Clapgrow and contributors
# For license information, please see license.txt

from datetime import datetime, timedelta

import frappe
from frappe import _
from frappe.utils import now_datetime

from clapgrow_app.api.tasks.task_utils import get_company_id


def execute(filters=None):
	"""Return columns and data for the report.

	This is the main entry point for the report. It accepts the filters as a
	dictionary and should return columns and data. It is called by the framework
	every time the report is refreshed or a filter is updated.
	"""
	columns = get_columns()
	data = get_data(filters)
	return columns, data


def get_columns():
	"""Return columns for the report.

	One field definition per column, just like a DocType field definition.
	"""
	return [
		{
			"label": _("Name"),
			"fieldname": "full_name",
			"fieldtype": "Data",
			"width": 220,
		},
		{
			"label": _("User Image"),
			"fieldname": "user_image",
			"fieldtype": "Image",
			"width": 100,
		},
		{
			"label": _("Task Overdue"),
			"fieldname": "overdue_tasks",
			"fieldtype": "Int",
			"width": 120,
		},
		{
			"label": _("Weekly Score (%)"),
			"fieldname": "display_score",
			"fieldtype": "Float",
			"width": 120,
		},
		{
			"label": _("Department"),
			"fieldname": "department",
			"fieldtype": "Data",
			"width": 150,
		},
		{
			"label": _("Branch"),
			"fieldname": "branch",
			"fieldtype": "Data",
			"width": 150,
		},
		{
			"label": _("Completed Tasks"),
			"fieldname": "completed_tasks",
			"fieldtype": "Int",
			"width": 120,
		},
		{
			"label": _("Total Tasks"),
			"fieldname": "total_tasks",
			"fieldtype": "Int",
			"width": 120,
		},
		{
			"label": _("On Time Tasks"),
			"fieldname": "on_time_tasks",
			"fieldtype": "Int",
			"width": 120,
		},
		{
			"label": _("On Time %"),
			"fieldname": "on_time_percentage",
			"fieldtype": "Float",
			"width": 120,
		},
	]


def get_data(filters=None):
	"""Return data for the report."""
	if not filters:
		filters = {}

	company_id = filters.get("company_id") or get_company_id()
	from_date = filters.get("from_date")
	to_date = filters.get("to_date")
	department = filters.get("department")
	branch = filters.get("branch")
	score_range = filters.get("score_range")
	last_week_report = filters.get("last_week_report", False)

	# Handle last week report - override date range if enabled
	if last_week_report:
		last_week_start, last_week_end = get_last_week_date_range()
		from_date = last_week_start.strftime("%Y-%m-%d")
		to_date = last_week_end.strftime("%Y-%m-%d")

	# Validate date range
	if not from_date or not to_date:
		frappe.throw(_("From Date and To Date are required."))

	try:
		start_date = datetime.strptime(from_date, "%Y-%m-%d")
		end_date = datetime.strptime(to_date, "%Y-%m-%d")
	except ValueError:
		frappe.throw(_("Invalid date format. Please use YYYY-MM-DD format."))

	if start_date > end_date:
		frappe.throw(_("From Date cannot be after To Date."))

	# Get filtered users based on role-based permissions
	users = get_filtered_users_by_role(company_id, department, branch)

	results = []

	for user in users:
		user_image = frappe.get_value("CG User", user["email"], "user_image") or ""

		# Build task filters for the specified date range
		task_filters = {
			"assigned_to": user["email"],
			"due_date": ["between", [start_date, end_date]],
		}

		# Fetch tasks assigned to the user within the date range
		tasks = frappe.get_all(
			"CG Task Instance",
			filters=task_filters,
			fields=["status", "due_date", "completed_on"],
		)

		# Calculate task metrics
		total_tasks = len(tasks)
		completed_tasks = sum(1 for task in tasks if task["status"] == "Completed")
		overdue_tasks = sum(1 for task in tasks if task["status"] == "Overdue")

		# Calculate on-time completion (completed within due date)
		on_time_tasks = sum(
			1
			for task in tasks
			if task["status"] == "Completed"
			and task["completed_on"]
			and task["completed_on"] <= task["due_date"]
		)

		# Calculate scores
		completion_score = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 100
		on_time_percentage = (on_time_tasks / completed_tasks * 100) if completed_tasks > 0 else 0

		# Apply score_range filter based on completion_score
		if score_range:
			if score_range == "75-100" and not (75 <= completion_score <= 100):
				continue
			elif score_range == "50-74" and not (50 <= completion_score < 75):
				continue
			elif score_range == "25-49" and not (25 <= completion_score < 50):
				continue
			elif score_range == "<25" and not (completion_score < 25):
				continue

		# Skip users with no tasks in the date range (unless specifically filtered)
		if total_tasks == 0 and (department or branch or score_range):
			continue

		results.append(
			{
				"full_name": user["full_name"],
				"user_image": user_image,
				"overdue_tasks": overdue_tasks,
				"display_score": round(completion_score, 2),
				"department": user["department_id"],
				"branch": user["branch_id"],
				"completed_tasks": completed_tasks,
				"total_tasks": total_tasks,
				"on_time_tasks": on_time_tasks,
				"on_time_percentage": round(on_time_percentage, 2),
			}
		)

	# Sort by full name for consistent ordering
	results.sort(key=lambda x: x["full_name"])
	return results


def get_filtered_users_by_role(company_id, department=None, branch=None):
	"""Get users based on role-based permissions and filters."""
	# Get current user's role
	current_user_email = frappe.session.user
	current_user_role = None

	try:
		current_user_role = frappe.get_value("CG User", current_user_email, "role")
	except Exception:
		frappe.throw(_("Current user not found in CG User records."))

	if not current_user_role:
		frappe.throw(_("Current user does not have a valid role assigned."))

	# Build base user filters
	user_filters = {"enabled": 1}
	if company_id:
		user_filters["company_id"] = company_id
	if department:
		user_filters["department_id"] = department
	if branch:
		user_filters["branch_id"] = branch

	# Apply role-based filtering
	if current_user_role == "ROLE-Admin":
		# Admins can see all users - no additional filtering needed
		pass

	elif current_user_role == "ROLE-Team Lead":
		# Team leads can see their team members + themselves
		team_member_emails = get_team_members_for_lead(current_user_email)

		if team_member_emails:
			# Include the team lead themselves in the list
			if current_user_email not in team_member_emails:
				team_member_emails.append(current_user_email)
			user_filters["name"] = ["in", team_member_emails]
		else:
			# If no team members found, only show themselves
			user_filters["name"] = current_user_email

	elif current_user_role == "ROLE-Member":
		# Members can only see their own data
		user_filters["name"] = current_user_email

	else:
		frappe.throw(_("Invalid user role: {0}").format(current_user_role))

	try:
		return frappe.get_all(
			"CG User",
			filters=user_filters,
			fields=["full_name", "email", "department_id", "branch_id"],
			order_by="full_name",
		)
	except Exception as e:
		frappe.throw(f"Error fetching users: {str(e)}")


def get_team_members_for_lead(team_lead_email: str) -> list[str]:
	"""Get all team members for a specific team lead."""
	try:
		# Find teams where the user is the team lead
		teams = frappe.get_all("CG Team", filters={"team_lead": team_lead_email}, fields=["name"])

		team_member_emails = []
		for team in teams:
			# Get all members of this team
			members = frappe.get_all("CG Team Member", filters={"parent": team.name}, fields=["member"])
			team_member_emails.extend([member.member for member in members])

		# Remove duplicates and return
		return list(set(team_member_emails))

	except Exception as e:
		frappe.log_error(f"Error fetching team members for {team_lead_email}: {str(e)}")
		return []


def get_last_week_date_range():
	"""Return start and end dates for the previous week."""
	today = datetime.now().date()

	# Calculate the start of the current week (Monday)
	current_week_start = today - timedelta(days=today.weekday())

	# Calculate the start and end of the previous week
	last_week_start = current_week_start - timedelta(days=7)
	last_week_end = last_week_start + timedelta(days=6)

	# Convert to datetime objects with time set to start and end of day
	start_datetime = datetime.combine(last_week_start, datetime.min.time())
	end_datetime = datetime.combine(last_week_end, datetime.max.time())

	return start_datetime, end_datetime


def get_date_range(trend):
	"""Return start and end dates for the given trend."""
	today = datetime.now().date()
	datetime_min = datetime.min.time()
	datetime_max = datetime.max.time()

	if trend == "This Week":
		start = today - timedelta(days=today.weekday())
		end = start + timedelta(days=6)
	elif trend == "Last 30 Days":
		end = today
		start = today - timedelta(days=30)
	else:
		start = today - timedelta(days=today.weekday())
		end = start + timedelta(days=6)

	return datetime.combine(start, datetime_min), datetime.combine(end, datetime_max)

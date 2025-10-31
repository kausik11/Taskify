from datetime import datetime, timedelta

import frappe
from frappe import _
from frappe.utils import get_first_day, get_last_day, now_datetime

from clapgrow_app.api.tasks.task_utils import get_company_id
from clapgrow_app.clapgrow_app.report.recurring_task_status.recurring_task_status import get_date_range


def execute(filters: dict | None = None):
	"""Return columns and data for the task status report."""
	company = filters.get("company") if filters else None
	if not company:
		company = get_company_id()
		if not company:
			frappe.throw(_("No company ID found. Please ensure a company is configured for the user."))

	trend_type = filters.get("trend") if filters else None
	task_scope = filters.get("task_scope", "My Task")  # Default to "My Task"
	user = filters.get("user") if filters else frappe.session.user

	# Get user role
	user_role = frappe.db.get_value("CG User", {"email": user}, "role")
	if not user_role:
		frappe.throw(_("No role found for the selected user."))

	# Get current user's role for permission check
	current_user_role = frappe.db.get_value("CG User", {"email": frappe.session.user}, "role")
	if not current_user_role:
		frappe.throw(_("No role found for the current user."))

	# Permission check: Restrict non-Admins and non-Team Leads from viewing other users' tasks
	if user != frappe.session.user and current_user_role != "ROLE-Admin":
		if current_user_role == "ROLE-Team Lead":
			teams = frappe.get_all(
				"CG Team",
				filters={"team_lead": frappe.session.user},
				fields=["name"],
			)
			team_members = set()
			for team in teams:
				members = frappe.get_all(
					"CG Team Member",
					filters={"parent": team.name},
					fields=["member"],
				)
				team_members.update(member.member for member in members)
			if user not in team_members:
				frappe.throw(_("You do not have permission to view tasks for this user."))
		else:
			frappe.throw(_("You do not have permission to view tasks for other users."))

	start_date, end_date = get_date_range(trend_type)
	if not start_date or not end_date:
		frappe.throw(_("Invalid date range provided for the trend type."))

	columns = get_columns()
	data = get_data(company, start_date, end_date, user, task_scope, user_role)
	return columns, data


def get_columns():
	"""Return columns for the report."""
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
		{
			"label": _("Change(%)"),
			"fieldname": "change_percentage",
			"fieldtype": "Float",
			"width": 120,
		},
		{
			"label": _("Completed"),
			"fieldname": "completed",
			"fieldtype": "Int",
			"width": 120,
		},
		{
			"label": _("Overdue"),
			"fieldname": "overdue",
			"fieldtype": "Int",
			"width": 120,
		},
		{
			"label": _("Upcoming"),
			"fieldname": "upcoming",
			"fieldtype": "Int",
			"width": 120,
		},
		{
			"label": _("Due Today"),
			"fieldname": "due_today",
			"fieldtype": "Int",
			"width": 120,
		},
		{
			"label": _("Total Tasks"),
			"fieldname": "total_tasks",
			"fieldtype": "Int",
			"width": 120,
		},
	]


def get_team_users(user_email, user_role, task_scope):
	"""Return a list of email addresses based on user role and task scope."""
	if task_scope == "My Task":
		return [user_email]  # All roles see only their own tasks (assigned_to) in My Task mode

	if user_role == "ROLE-Admin" and task_scope == "Team Tasks":
		return None  # Admins see all tasks in their company (no user filter)

	if user_role == "ROLE-Team Lead" and task_scope == "Team Tasks":
		# Get teams where the user is the team lead
		teams = frappe.get_all(
			"CG Team",
			filters={"team_lead": user_email},
			fields=["name"],
		)
		team_users = set([user_email])  # Include the team lead
		for team in teams:
			# Get members from CG Team Member
			members = frappe.get_all(
				"CG Team Member",
				filters={"parent": team.name},
				fields=["member"],
			)
			for member in members:
				if member.member:
					team_users.add(member.member)
		team_users_list = list(team_users)
		return team_users_list if team_users_list else [user_email]

	if user_role == "ROLE-Member" and task_scope == "Team Tasks":
		return [user_email]  # Members see only their tasks (assignee) in Team Tasks mode

	return [user_email]  # Fallback to selected user


def get_data(
	company_id,
	start_date,
	end_date,
	user_email=None,
	task_scope="My Task",
	user_role="ROLE-Member",
):
	"""Return task data based on user role and task scope."""
	assigned_to_users = get_team_users(user_email, user_role, task_scope)

	if assigned_to_users is not None and not assigned_to_users:
		return [
			{
				"completed_percentage": 0,
				"previous_completed_percentage": 0,
				"change_percentage": 0,
				"completed": 0,
				"overdue": 0,
				"upcoming": 0,
				"due_today": 0,
				"total_tasks": 0,
				"completed_tasks_change": 0,
			}
		]

	# Base task filters
	task_filters = [
		["company_id", "=", company_id],
		["due_date", "between", [start_date, end_date]],
	]

	# Apply role-specific filters
	if task_scope == "My Task":
		# All roles see tasks where they are assigned_to
		task_filters.append(["assigned_to", "in", assigned_to_users])
	elif task_scope == "Team Tasks":
		if user_role == "ROLE-Admin":
			# No user filter; admin sees all company tasks
			pass
		elif user_role == "ROLE-Team Lead" and assigned_to_users:
			# Team Lead sees tasks assigned to team members (assigned_to)
			task_filters.append(["assigned_to", "in", assigned_to_users])
		elif user_role == "ROLE-Member":
			# Member sees tasks where they are assignee
			task_filters.append(["assignee", "=", user_email])

	tasks = frappe.get_all(
		"CG Task Instance",
		filters=task_filters,
		fields=["name", "status", "due_date", "assigned_to", "assignee"],
	)

	total_tasks = len(tasks)
	completed = sum(1 for task in tasks if task["status"] == "Completed")
	overdue = sum(1 for task in tasks if task["status"] == "Overdue")
	upcoming = sum(1 for task in tasks if task["status"] == "Upcoming")
	due_today = sum(1 for task in tasks if task["status"] == "Due Today")

	# Calculate completion percentage
	completed_percentage = (completed / total_tasks * 100) if total_tasks else 0

	# Get previous period's tasks
	previous_start_date = start_date - timedelta(weeks=1)
	previous_end_date = end_date - timedelta(weeks=1)
	previous_task_filters = [
		["company_id", "=", company_id],
		["due_date", "between", [previous_start_date, previous_end_date]],
	]

	if task_scope == "My Task":
		previous_task_filters.append(["assigned_to", "in", assigned_to_users])
	elif task_scope == "Team Tasks":
		if user_role == "ROLE-Admin":
			pass
		elif user_role == "ROLE-Team Lead" and assigned_to_users:
			previous_task_filters.append(["assigned_to", "in", assigned_to_users])
		elif user_role == "ROLE-Member":
			previous_task_filters.append(["assignee", "=", user_email])

	previous_tasks = frappe.get_all(
		"CG Task Instance",
		filters=previous_task_filters,
		fields=["status"],
	)

	previous_total_tasks = len(previous_tasks)
	previous_completed = sum(1 for task in previous_tasks if task["status"] == "Completed")
	previous_completed_percentage = (
		(previous_completed / previous_total_tasks * 100) if previous_total_tasks else 0
	)

	completed_tasks_change = completed - previous_completed
	change_percentage = (completed_tasks_change / previous_completed * 100) if previous_completed else 0

	return [
		{
			"completed_percentage": round(completed_percentage, 2),
			"previous_completed_percentage": round(previous_completed_percentage, 2),
			"change_percentage": round(change_percentage, 2),
			"completed": completed,
			"overdue": overdue,
			"upcoming": upcoming,
			"due_today": due_today,
			"total_tasks": total_tasks,
			"completed_tasks_change": completed_tasks_change,
		}
	]

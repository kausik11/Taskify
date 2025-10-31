# Copyright (c) 2025, Clapgrow and contributors
# For license information, please see license.txt

from datetime import datetime, timedelta

import frappe
from frappe import _

from clapgrow_app.api.tasks.task_utils import get_company_id


def execute(filters: dict | None = None):
	"""Execute the MIS Score report."""
	filters = filters or {}
	columns = get_columns()
	data = get_data(filters)
	frappe.logger().info(f"MIS Score Report completed: {len(data)} rows")
	return columns, data


def get_columns() -> list[dict]:
	"""Define report columns."""
	return [
		{
			"label": _("Full Name"),
			"fieldname": "full_name",
			"fieldtype": "Data",
			"width": 150,
		},
		{"label": _("Email"), "fieldname": "email", "fieldtype": "Data", "width": 150},
		{
			"label": _("First Name"),
			"fieldname": "first_name",
			"fieldtype": "Data",
			"width": 120,
		},
		{
			"label": _("Last Name"),
			"fieldname": "last_name",
			"fieldtype": "Data",
			"width": 120,
		},
		{
			"label": _("User Image"),
			"fieldname": "user_image",
			"fieldtype": "Data",
			"width": 120,
		},
		{
			"label": _("Department"),
			"fieldname": "department",
			"fieldtype": "Link",
			"options": "CG Department",
			"width": 120,
		},
		{
			"label": _("Branch"),
			"fieldname": "branch",
			"fieldtype": "Link",
			"options": "CG Branch",
			"width": 120,
		},
		{"label": _("KRA"), "fieldname": "kra", "fieldtype": "Data", "width": 150},
		{"label": _("KPI"), "fieldname": "kpi", "fieldtype": "Data", "width": 150},
		{
			"label": _("Current Period Planned"),
			"fieldname": "current_week_planned",
			"fieldtype": "Int",
			"width": 150,
		},
		{
			"label": _("Current Period Actual"),
			"fieldname": "current_week_actual",
			"fieldtype": "Int",
			"width": 150,
		},
		{
			"label": _("Current Period Actual %"),
			"fieldname": "current_week_actual_percentage",
			"fieldtype": "Float",
			"width": 150,
		},
	]


def get_data(filters: dict) -> list[dict]:
	"""Generate data rows for report."""
	validated = validate_and_prepare_filters(filters)
	users = fetch_filtered_users(validated)
	if not users:
		return []

	data = []
	for user in users:
		rows = process_user_metrics(user, validated)
		data.extend(rows)

	return data


def validate_and_prepare_filters(filters: dict) -> dict:
	"""Sanitize and prepare filter values."""
	validated = {
		"company_id": filters.get("company_id") or get_company_id(),
		"department_id": filters.get("department_id"),
		"branch_id": filters.get("branch_id"),
		"team_member": filters.get("team_member"),
		"task_type": filters.get("task_type", "All"),
		"priority": filters.get("priority", "All"),
		"score_tab": filters.get("score_tab", "All"),
		"last_week_report": filters.get("last_week_report", False),
	}

	if validated["team_member"] and not frappe.db.exists("CG User", validated["team_member"]):
		frappe.throw(_("Selected Team Member {0} does not exist.").format(validated["team_member"]))

	if validated["last_week_report"]:
		validated["start_date"], validated["end_date"] = get_last_week_date_range()
	else:
		try:
			validated["start_date"] = datetime.strptime(filters["from_date"], "%Y-%m-%d")
			validated["end_date"] = datetime.strptime(filters["to_date"], "%Y-%m-%d")
		except Exception:
			frappe.throw(_("Invalid or missing From Date / To Date. Use YYYY-MM-DD format."))

		if validated["start_date"] > validated["end_date"]:
			frappe.throw(_("From Date cannot be after To Date."))

	return validated


def fetch_filtered_users(filters: dict) -> list[dict]:
	"""Get users based on validated filters and role-based permissions."""
	# Get current user's role
	current_user_email = frappe.session.user
	current_user_role = None

	try:
		current_user_role = frappe.get_value("CG User", current_user_email, "role")
	except Exception:
		frappe.throw(_("Current user not found in CG User records."))

	if not current_user_role:
		frappe.throw(_("Current user does not have a valid role assigned."))

	# Base filters
	user_filters = {"company_id": filters["company_id"], "enabled": 1}

	# Add department and branch filters if specified
	for field in ["department_id", "branch_id"]:
		if filters.get(field):
			user_filters[field] = filters[field]

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
		# Members can only see their own MIS scores
		user_filters["name"] = current_user_email

	else:
		frappe.throw(_("Invalid user role: {0}").format(current_user_role))

	# Apply team_member filter if specified (this allows further filtering within allowed users)
	if filters.get("team_member"):
		if current_user_role == "ROLE-Admin":
			# Admin can filter by any team member
			user_filters["name"] = filters["team_member"]
		elif current_user_role == "ROLE-Team Lead":
			# Team lead can only filter within their team + themselves
			allowed_users = get_team_members_for_lead(current_user_email)
			if current_user_email not in allowed_users:
				allowed_users.append(current_user_email)

			if filters["team_member"] not in allowed_users:
				frappe.throw(_("You can only view MIS scores for your team members."))
			user_filters["name"] = filters["team_member"]
		elif current_user_role == "ROLE-Member":
			# Members can only filter to themselves
			if filters["team_member"] != current_user_email:
				frappe.throw(_("You can only view your own MIS scores."))
			user_filters["name"] = current_user_email

	try:
		return frappe.get_all(
			"CG User",
			filters=user_filters,
			fields=[
				"name",
				"email",
				"first_name",
				"last_name",
				"full_name",
				"user_image",
				"department_id as department",
				"branch_id as branch",
			],
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


def fetch_user_tasks(user_name: str, filters: dict) -> list[dict]:
	"""Get all tasks assigned to a user within the date range."""
	task_filters = {
		"assigned_to": user_name,
		"due_date": ["between", [filters["start_date"], filters["end_date"]]],
	}

	if filters["task_type"] != "All":
		if filters["task_type"] == "Help":
			task_filters.update({"task_type": "Onetime", "is_help_ticket": 1})
		else:
			task_filters["task_type"] = filters["task_type"]

	if filters["priority"] != "All":
		task_filters["priority"] = filters["priority"]

	try:
		return frappe.get_all(
			"CG Task Instance",
			filters=task_filters,
			fields=["status", "due_date", "completed_on"],
		)
	except Exception as e:
		frappe.logger().error(f"Error fetching tasks for user {user_name}: {str(e)}")
		return []


def calculate_user_metrics(tasks: list[dict]) -> tuple[dict, dict]:
	"""Calculate completion and on-time metrics."""
	total = len(tasks)
	completed = [t for t in tasks if t["status"] == "Completed"]
	on_time = [t for t in completed if t["completed_on"] and t["completed_on"] <= t["due_date"]]

	metric1 = {
		"kra": "All work should be done",
		"kpi": "% of work completed",
		"planned": total,
		"actual": len(completed),
		"percentage": round(len(completed) / total * 100, 2) if total else 0.0,
	}

	metric2 = {
		"kra": "All work should be done on time",
		"kpi": "% of work completed on time",
		"planned": len(completed),
		"actual": len(on_time),
		"percentage": (round(len(on_time) / len(completed) * 100, 2) if completed else 0.0),
	}

	return metric1, metric2


def process_user_metrics(user: dict, filters: dict) -> list[dict]:
	"""Compute metrics for a user and convert to report rows."""
	tasks = fetch_user_tasks(user["name"], filters)

	if not tasks and filters.get("team_member") and filters["team_member"] != user["name"]:
		return []

	metric1, metric2 = (
		calculate_user_metrics(tasks)
		if tasks
		else (
			{
				"kra": "All work should be done",
				"kpi": "% of work completed",
				"planned": 0,
				"actual": 0,
				"percentage": 0.0,
			},
			{
				"kra": "All work should be done on time",
				"kpi": "% of work completed on time",
				"planned": 0,
				"actual": 0,
				"percentage": 0.0,
			},
		)
	)

	rows = []
	for metric in apply_score_filter([metric1, metric2], filters["score_tab"]):
		rows.append(
			{
				"full_name": user["full_name"],
				"email": user["email"],
				"first_name": user["first_name"],
				"last_name": user["last_name"],
				"user_image": user["user_image"],
				"department": user["department"],
				"branch": user["branch"],
				"kra": metric["kra"],
				"kpi": metric["kpi"],
				"current_week_planned": metric["planned"],
				"current_week_actual": metric["actual"],
				"current_week_actual_percentage": metric["percentage"],
			}
		)

	return rows


def apply_score_filter(metrics: list[dict], score_tab: str) -> list[dict]:
	"""Filter metrics based on score category."""
	if score_tab == "All":
		return metrics

	score_ranges = {
		"75-100": (75, 100),
		"74-50": (50, 74),
		"49-25": (25, 49),
		"<25": (0, 24),
	}

	min_score, max_score = score_ranges.get(score_tab, (0, 100))
	return [m for m in metrics if min_score <= m["percentage"] <= max_score]


def get_last_week_date_range() -> tuple[datetime, datetime]:
	"""Get Monday-Sunday range for last week."""
	today = datetime.now().date()
	start = today - timedelta(days=today.weekday() + 7)
	end = start + timedelta(days=6)
	return datetime.combine(start, datetime.min.time()), datetime.combine(end, datetime.max.time())

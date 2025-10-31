import logging
from datetime import datetime, time
from typing import Any

import frappe
from frappe import _
from frappe.utils import getdate

from clapgrow_app.api.insights.member_insights import get_date_range, standard_response  # round_off,
from clapgrow_app.api.tasks.role_based_access import get_session_user_email, get_session_user_role
from clapgrow_app.api.tasks.task_utils import (
	get_cg_user,
	get_company_id,
	parse_date,
	parse_datetime,
	round_off,
)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Role_hierarchy = {
	"CG-ROLE-ADMIN": 4,
	"CG-ROLE-TEAM-MANAGER": 3,
	"CG-ROLE-TEAM-LEAD": 2,
	"CG-ROLE-MEMBER": 1,
}


def get_session_user_info() -> tuple[str, str]:
	"""Get the current session user's email and highest role."""
	email = frappe.db.get_value("User", frappe.session.user, "email")
	roles = frappe.get_all("Has Role", filters={"parent": email}, fields=["role"])
	highest_role = max(
		(role["role"] for role in roles),
		key=lambda r: Role_hierarchy.get(r, 0),
		default=None,
	)
	return email, highest_role


def get_allowed_emails(current_user_role: str) -> list[str]:
	"""Get emails of users with roles lower than or equal to the current user's role."""
	current_role_value = Role_hierarchy.get(current_user_role, 0)
	allowed_roles = [role for role, value in Role_hierarchy.items() if value <= current_role_value]
	allowed_emails = [
		frappe.db.get_value("User", user["parent"], "email")
		for role in allowed_roles
		for user in frappe.get_all("Has Role", filters={"role": role}, fields=["parent"])
		if frappe.db.get_value("User", user["parent"], "email")
	]
	return allowed_emails


@frappe.whitelist(allow_guest=False)
def recurring_task_insights(
	department: str | None = None,
	trend: str = "Weekly",
	day: str = "Saturday",
) -> dict[str, Any]:
	"""
	Fetches and categorizes recurring tasks based on their status and department.

	Parameters:
	- department (str | None): The department for which to fetch tasks. If None, tasks for all departments are fetched.
	- trend (str): The trend for which to fetch tasks. Default is "Weekly".
	- day (str): The day of the week for which to fetch tasks. Default is "Saturday"

	Returns:
	dict[str, Any]: A dictionary containing the aggregated task data and status.
	"""
	try:
		# Fetch date range and today's date
		start_date, end_date = get_date_range(trend, day)
		today = getdate()

		# Construct filters
		user_filters = {"company_id": get_company_id()}
		if department:
			user_filters["department_id"] = department

		# Fetch users and their recurring tasks in one query
		users_tasks = frappe.get_all(
			"CG User",
			filters=user_filters,
			fields=["name", "department_id", "email"],
			as_list=False,
		)
		user_ids = [user["name"] for user in users_tasks]

		recurring_tasks = fetch_recurring_tasks(user_ids, start_date, end_date)

		# Initialize data storage
		departments_task_data = categorize_tasks_by_department(users_tasks, recurring_tasks, today)

		# Aggregate department-wise task status counts
		aggregated_data = aggregate_task_data(departments_task_data)

		return standard_response(
			success=True,
			message="Recurring task status data generated successfully.",
			data={
				"aggregated_data": aggregated_data,
				"recurring_task_status": recurring_task_status(trend, day, today),
				"start_date": start_date,
				"end_date": end_date,
			},
		)

	except frappe.exceptions.DoesNotExistError as e:
		logger.error("Database error: %s", str(e))
		return standard_response(
			success=False,
			message="Database error, please try again later.",
			status_code=500,
		)
	except Exception as e:
		logger.error("Error in get_recurring_task_insights: %s", str(e))
		return standard_response(
			success=False,
			message=str(e),
			status_code=500,
		)


def fetch_recurring_tasks(user_ids: list[str], start_date: datetime.date, end_date: datetime.date):
	"""Returns a list of recurring tasks assigned to the users within the specified date range."""
	try:
		return frappe.get_all(
			"CG Scheduled Task Instance",
			filters={
				"assigned_to": ["in", user_ids],
				"due_date": ["between", (start_date, end_date)],
			},
			fields=["assigned_to", "due_date", "status", "completed_on"],
		)
	except Exception as e:
		logger.error("Error fetching recurring tasks: %s", str(e))
		return []


def categorize_tasks_by_department(
	users: list[dict[str, Any]],
	recurring_tasks: list[dict[str, Any]],
	today: datetime.date,
) -> dict[str, Any]:
	"""Categorizes tasks by department and their status."""
	departments_task_data = {}

	for user in users:
		user_id = user["name"]
		department_name = user["department_id"]

		if department_name not in departments_task_data:
			departments_task_data[department_name] = {
				"Completed": [],
				"Upcoming": [],
				"Due Today": [],
				"Overdue": [],
				"user_count": 0,
				"task_count": 0,
			}

		# Increment user count for the department
		departments_task_data[department_name]["user_count"] += 1

		# Filter tasks by user
		user_tasks = [task for task in recurring_tasks if task["assigned_to"] == user_id]

		# Categorize tasks by their status
		for task in user_tasks:
			status = task["status"]
			due_date = getdate(task["due_date"])

			if status == "Completed":
				departments_task_data[department_name]["Completed"].append(task)
			elif due_date == today:
				departments_task_data[department_name]["Due Today"].append(task)
			elif due_date > today:
				departments_task_data[department_name]["Upcoming"].append(task)
			elif due_date < today:
				departments_task_data[department_name]["Overdue"].append(task)

			# Increment task count for the department
			departments_task_data[department_name]["task_count"] += 1

	return departments_task_data


def aggregate_task_data(departments_task_data: dict[str, Any]) -> dict[str, Any]:
	"""Aggregates department-wise task status counts."""
	return {
		department_name: {
			"user_count": data["user_count"],
			"task_count": data["task_count"],
			"Completed": len(data["Completed"]),
			"Upcoming": len(data["Upcoming"]),
			"Due Today": len(data["Due Today"]),
			"Overdue": len(data["Overdue"]),
		}
		for department_name, data in departments_task_data.items()
	}


def recurring_task_status(trend="Weekly", day="Saturday", today=None):
	"""Fetches and categorizes recurring tasks based on their status."""
	start_date, end_date = get_date_range(trend, day)

	recurring_tasks = frappe.get_all(
		"CG Scheduled Task Instance",
		filters={"due_date": ["between", (start_date, end_date)]},
		fields=["due_date", "status", "name"],
	)

	task_data = {
		"completed": 0,
		"overdue": 0,
		"upcoming": 0,
		"due_today": 0,
		"total": 0,
	}

	for task in recurring_tasks:
		task_data["total"] += 1
		due_date = getdate(task.due_date)
		if task.status == "Completed":
			task_data["completed"] += 1
		elif due_date < today:
			task_data["overdue"] += 1
		elif due_date == today:
			task_data["due_today"] += 1
		else:
			task_data["upcoming"] += 1

	return task_data


@frappe.whitelist(allow_guest=False)
def recurring_task_table(
	page: int = 1,
	page_size: int = 10,
	search: str | None = None,
	assigned_to: str | None = None,
	assignee: list[str] | None = None,
	status: str | None = None,
	priority: str | None = None,
	tags: list[str] | None = None,
	start_date: str | None = None,
	end_date: str | None = None,
) -> list[dict[str, Any]]:
	"""
	Fetches all recurring tasks without session user restrictions.
	Filters: assigned_to, assignee, status, priority, tags, start_date, end_date.
	Includes pagination.
	"""
	try:
		task_filters = {"task_type": "Recurring"}
		if search:
			task_filters["task_name"] = ["like", f"%{search}%"]
		if priority:
			task_filters["priority"] = priority

		task_definitions = frappe.get_all(
			"CG Task Definition",
			filters=task_filters,
			fields=["name", "task_name", "recurrence_type_id", "priority"],
		)

		final_results = []
		today = getdate()

		# Apply date range filter before the loop
		scheduled_filters = {}
		if start_date and end_date:
			scheduled_filters["due_date"] = ["between", [getdate(start_date), getdate(end_date)]]
		if assigned_to:
			scheduled_filters["assigned_to"] = assigned_to
		if assignee:
			scheduled_filters["assigned_to"] = ["in", assignee]
		if tags:
			scheduled_filters["tags"] = ["in", tags]

		for task_def in task_definitions:
			scheduled_filters["task_definition_id"] = task_def.name

			# Apply status filter correctly
			if status:
				if status == "overdue":
					scheduled_filters["due_date"] = ["<", today]
					scheduled_filters["status"] = ["!=", "Completed"]
				elif status == "due_today":
					scheduled_filters["due_date"] = today
					scheduled_filters["status"] = ["!=", "Completed"]
				elif status == "upcoming":
					scheduled_filters["due_date"] = [">", today]
					scheduled_filters["status"] = ["!=", "Completed"]
				elif status == "completed":
					scheduled_filters["status"] = "Completed"

			# Fetch Scheduled Task Instances for this task definition
			scheduled_instances = frappe.get_all(
				"CG Scheduled Task Instance",
				filters=scheduled_filters,
				fields=["task_name", "assigned_to", "due_date", "status", "completed_on"],
			)

			if not scheduled_instances:
				continue

			done_tasks = sum(1 for instance in scheduled_instances if instance.get("status") == "Completed")
			done_on_time_tasks = sum(
				1
				for instance in scheduled_instances
				if instance.get("status") == "Completed"
				and instance.get("due_date")
				and parse_datetime(instance["completed_on"]).date() <= getdate(instance["due_date"])
			)

			assigned_to_email = scheduled_instances[0]["assigned_to"]
			user_data = get_cg_user(assigned_to_email)
			full_name = user_data["user_name"]

			on_time_percentage = (done_on_time_tasks / done_tasks * 100) if done_tasks else 0
			completion_score = (done_tasks / len(scheduled_instances)) if scheduled_instances else 0

			final_results.append(
				{
					"recurring_tasks": task_def.task_name,
					"frequency": task_def.recurrence_type_id,
					"assigned_to": full_name,
					"on_time_percentage": round_off(on_time_percentage),
					"completion_score": round_off(completion_score),
					"priority": task_def.priority,
					"team_member": get_cg_user(assigned_to_email),
				}
			)

		# Pagination
		total_results = len(final_results)
		total_pages = (total_results + page_size - 1) // page_size
		paginated_results = final_results[(page - 1) * page_size : page * page_size]

		return standard_response(
			success=True,
			message="Recurring task table fetched successfully.",
			data={
				"final_results": paginated_results,
				"current_page": page,
				"page_size": page_size,
				"total_counts": total_results,
				"total_pages": total_pages,
			},
		)

	except Exception as e:
		return standard_response(success=False, message=str(e), data=[])

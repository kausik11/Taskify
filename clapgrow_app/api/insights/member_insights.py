import logging
from datetime import datetime, timedelta
from typing import Any

import frappe
from dateutil import parser
from frappe import _
from frappe.utils import getdate

from clapgrow_app.api.error_classes import standard_response
from clapgrow_app.api.tasks.task_utils import (
	get_cg_user,
	get_company_id,
	get_date_range,
	parse_date,
	parse_datetime,
	round_off_int,
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


def date_range(start_date: datetime.date, end_date: datetime.date) -> list[datetime.date]:
	return [start_date + timedelta(days=i) for i in range((end_date - start_date).days + 1)]


def get_week_start(date: datetime.date, week_start_day: str = "Monday") -> datetime.date:
	"""Get the start of the week for a given date."""
	days = [
		"Monday",
		"Tuesday",
		"Wednesday",
		"Thursday",
		"Friday",
		"Saturday",
		"Sunday",
	]
	weekday = date.weekday()
	start_day_index = days.index(week_start_day)
	days_to_subtract = (weekday - start_day_index) % 7
	return date - timedelta(days=days_to_subtract)


@frappe.whitelist(allow_guest=False)
def completed_task_insights(trend: str = "This Week", day: str = "Saturday") -> dict[str, Any]:
	"""
	Generates cumulative graph data for completed tasks, aggregated by week for 'Last 30 Days'.

	Parameters:
	- trend (str): The trend for generating the graph data.
	- day (str): The day for filtering tasks (used for 'This Week' trend).

	Returns:
	- dict[str, Any]: A dictionary with cumulative data for completed tasks and tasks completed on time.
	"""
	try:
		if trend not in ["This Week", "Last 30 Days"]:
			return standard_response(
				success=False,
				message="Invalid trend value. Allowed values are 'This Week' and 'Last 30 Days'",
				status_code=400,
			)

		if day not in ["Saturday", "Sunday"]:
			return standard_response(
				success=False,
				message="Invalid day value. Allowed values are 'Saturday' and 'Sunday'",
				status_code=400,
			)

		start_date, end_date = get_date_range("Weekly" if trend == "This Week" else "last_30_days")

		total_tasks = frappe.db.count(
			"CG Task Instance",
			filters={
				"company_id": get_company_id(),
				"due_date": ["between", (start_date, end_date)],
			},
		)

		completed_instances = frappe.get_all(
			"CG Task Instance",
			filters={
				"status": "Completed",
				"due_date": ["between", (start_date, end_date)],
				"company_id": get_company_id(),
			},
			fields=["due_date", "completed_on"],
		)

		result = []

		if trend == "This Week":
			current_date = start_date
			cumulative_completed = 0
			cumulative_on_time = 0

			while current_date <= end_date:
				daily_completed = sum(
					1 for task in completed_instances if task["due_date"].date() == current_date
				)
				daily_on_time = sum(
					1
					for task in completed_instances
					if task["due_date"].date() == current_date
					and task["completed_on"] is not None
					and task["completed_on"].date() <= task["due_date"].date()
				)

				cumulative_completed += daily_completed
				cumulative_on_time += daily_on_time

				daily_completed_percentage = (cumulative_completed / total_tasks) * 100 if total_tasks else 0
				daily_on_time_percentage = (cumulative_on_time / total_tasks) * 100 if total_tasks else 0

				result.append(
					{
						"date": current_date.strftime("%Y-%m-%d"),
						"completed": daily_completed_percentage,
						"on_time": daily_on_time_percentage,
					}
				)

				current_date += timedelta(days=1)

		else:  # Last 30 Days
			# Group by weeks, starting from Monday
			week_starts = []
			current_date = start_date
			while current_date <= end_date:
				week_start = get_week_start(current_date)
				if week_start not in week_starts and week_start >= start_date:
					week_starts.append(week_start)
				current_date += timedelta(days=7)

			cumulative_completed = 0
			cumulative_on_time = 0

			for week_start in week_starts:
				week_end = week_start + timedelta(days=6)
				if week_end > end_date:
					week_end = end_date

				weekly_completed = sum(
					1 for task in completed_instances if week_start <= task["due_date"].date() <= week_end
				)
				weekly_on_time = sum(
					1
					for task in completed_instances
					if week_start <= task["due_date"].date() <= week_end
					and task["completed_on"] is not None
					and task["completed_on"].date() <= task["due_date"].date()
				)

				cumulative_completed += weekly_completed
				cumulative_on_time += weekly_on_time

				weekly_completed_percentage = (cumulative_completed / total_tasks) * 100 if total_tasks else 0
				weekly_on_time_percentage = (cumulative_on_time / total_tasks) * 100 if total_tasks else 0

				result.append(
					{
						"date": week_start.strftime("%Y-%m-%d"),
						"completed": weekly_completed_percentage,
						"on_time": weekly_on_time_percentage,
					}
				)

		return standard_response(
			success=True,
			message="Cumulative graph data generated successfully.",
			data={
				"result": result,
				"start_date": start_date,
				"end_date": end_date,
			},
		)

	except Exception as e:
		logger.error("Error in completed_task_insights: %s", str(e))
		return standard_response(
			success=False,
			message=str(e),
			status_code=500,
		)


# def fetch_assigned_tasks(
# 	user_id: str, task_type: list[str] | None = None, priority: str | None = None
# ) -> list[dict[str, Any]]:
# 	"""Fetch tasks for a user with optional filtering by task type and priority."""
# 	tasks = []
# 	user_doc = frappe.get_doc("CG User", user_id)

# 	if user_doc.role in ["ROLE-Admin"]:
# 		task_filters = {"company_id": get_company_id()}
# 	else:
# 		task_filters = {"assigned_to": user_id, "company_id": get_company_id()}

# 	if priority:
# 		task_filters["priority"] = priority

# 	task_types = {
# 		"Onetime": "CG Single Task",
# 		"Recurring": "CG Scheduled Task Instance",
# 	}
# 	for type_key, doctype in task_types.items():
# 		if not task_type or type_key in task_type:
# 			task_data = frappe.get_all(
# 				doctype,
# 				filters=task_filters,
# 				fields=[
# 					"assigned_to",
# 					"is_completed",
# 					"due_date",
# 					"status",
# 					"priority",
# 					"is_help_ticket" if doctype == "CG Single Task" else "",
# 					"completed_on",
# 				],
# 			)
# 			if type_key == "Onetime" and task_type:
# 				task_data = [
# 					task
# 					for task in task_data
# 					if ("Onetime" in task_type and not task.get("is_help_ticket"))
# 					or ("Help Ticket" in task_type and task.get("is_help_ticket"))
# 				]
# 			tasks.extend(task_data)

# 	return tasks


# def fetch_user_insights_data(
# 	user_id: str,
# 	task_type: list[str] | None,
# 	start_date: datetime.date,
# 	end_date: datetime.date,
# 	priority: str | None = None,
# ) -> dict[str, Any]:
# 	"""Fetches and processes the task insights data for a user within a given date range."""
# 	assigned_tasks = fetch_assigned_tasks(user_id, task_type, priority)

# 	total_tasks = (
# 		done_tasks
# 	) = done_on_time_tasks = overdue_count = not_approved_count = not_done_on_time_tasks = 0

# 	for task in assigned_tasks:
# 		due_date = parse_datetime(task.get("due_date"))
# 		completed_on = parse_datetime(task.get("completed_on"))

# 		if due_date and start_date <= due_date.date() <= end_date:
# 			total_tasks += 1

# 			if task.get("status") == "Completed":
# 				done_tasks += 1

# 				if completed_on and completed_on <= due_date:
# 					done_on_time_tasks += 1
# 				elif completed_on:
# 					not_done_on_time_tasks += 1

# 			elif due_date < datetime.now():
# 				overdue_count += 1

# 			if task.get("status") == "Not Approved":
# 				not_approved_count += 1

# 	current_actual_percentage = ((done_tasks / total_tasks) - 1) * 100 if total_tasks > 0 else 0
# 	current_actual_on_time_percentage = ((done_on_time_tasks / done_tasks) - 1) * 100 if done_tasks > 0 else 0

# 	return {
# 		"total_tasks": total_tasks,
# 		"done_tasks": done_tasks,
# 		"done_on_time_tasks": done_on_time_tasks,
# 		"not_done_on_time_tasks": not_done_on_time_tasks,
# 		"overdue_count": overdue_count,
# 		"not_approved_count": not_approved_count,
# 		"current_actual_percentage": round_off_int(current_actual_percentage),
# 		"current_actual_on_time_percentage": round_off_int(current_actual_on_time_percentage),
# 	}


# @frappe.whitelist(allow_guest=False)
# def generate_task_insights(
# 	score_interval: str = "Weekly",
# 	day: str = "Saturday",
# 	search: str | None = None,
# 	start_date: str | None = None,
# 	end_date: str | None = None,
# 	branch: str | None = None,
# 	department: str | None = None,
# 	designation: str | None = None,
# 	team_member: list[str] | None = None,
# 	score_tab: str | None = None,
# 	task_type: list[str] | None = None,
# 	page: int = 1,
# 	priority: str | None = None,
# 	page_size: int = 10,
# ) -> dict[str, Any]:
# 	"""
# 	Generates task insights based on the provided parameters.

# 	Parameters:
# 	- score_interval (str): The interval for scoring tasks (default is "Weekly").
# 	- day (str): The day for filtering tasks (default is "Saturday").
# 	- start_date (str): The start date for filtering tasks (optional).
# 	- end_date (str): The end date for filtering tasks (optional).
# 	- branch (str): The branch for filtering tasks (optional).
# 	- department (str): The department for filtering tasks (optional).
# 	- team_member (list[str]): The team members for filtering tasks (optional).
# 	- score_tab (str): The score tab for filtering tasks (optional).
# 	- task_type (list[str]): The task types for filtering tasks (optional).
# 	- page (int): The current page for pagination (default is 1).
# 	- page_size (int): The page size for pagination (default is 10).

# 	Returns:
# 	- dict[str, Any]: A dictionary containing the success status, message, and data.
# 	"""
# 	try:
# 		start_date, end_date = (
# 			(getdate(start_date), getdate(end_date))
# 			if start_date and end_date
# 			else get_date_range(score_interval, day)
# 		)

# 		current_user_email, current_user_role = get_session_user_info()
# 		allowed_emails = get_allowed_emails(current_user_role)
# 		if current_user_email not in allowed_emails:
# 			allowed_emails.append(current_user_email)

# 		user_filters = {"company_id": get_company_id(), "email": ["in", allowed_emails]}
# 		if search:
# 			user_filters["full_name"] = ["like", f"%{search}%"]
# 		if branch:
# 			user_filters["branch_id"] = branch
# 		if department:
# 			user_filters["department_id"] = department
# 		if team_member:
# 			user_filters["name"] = ["in", team_member]

# 		limit_start = (page - 1) * page_size
# 		users = frappe.get_all(
# 			"CG User",
# 			filters=user_filters,
# 			fields=["name", "branch_id", "department_id", "email", "role", "designation"],
# 			limit_start=limit_start,
# 			limit_page_length=page_size,
# 		)

# 		insights = []
# 		score_ranges = {
# 			"75-100": (-25, 0),
# 			"50-74": (-50, -26),
# 			"25-49": (-75, -51),
# 			"<25": (-100, -76),
# 		}
# 		score_range = score_ranges.get(score_tab)

# 		for user in users:
# 			user_id = user["name"]
# 			user_branch = branch or user["branch_id"]
# 			user_department = department or user["department_id"]
# 			user_designation = designation or user["designation"]

# 			user_role = user["role"]
# 			user_data = fetch_user_insights_data(user_id, task_type, start_date, end_date, priority)
# 			if score_range and not (
# 				score_range[0] <= user_data["current_actual_percentage"] <= score_range[1]
# 			):
# 				continue

# 			insights.append(
# 				{
# 					"team_member": get_cg_user(user_id),
# 					"branch": user_branch,
# 					"department": user_department,
# 					"not_done_tasks": user_data["total_tasks"] - user_data["done_tasks"],
# 					"not_done_tasks_percentage": round_off_int(
# 						((user_data["total_tasks"] - user_data["done_tasks"]) / user_data["total_tasks"])
# 						/ 100
# 					)
# 					if user_data["total_tasks"] > 0
# 					else 0,
# 					"not_done_on_time_tasks": user_data["not_done_on_time_tasks"],
# 					"not_done_on_time_tasks_percentage": round_off_int(
# 						((user_data["not_done_on_time_tasks"] / user_data["total_tasks"]) * 100)
# 						if user_data["total_tasks"] > 0
# 						else 0
# 					),
# 					"overdue_tasks": user_data["overdue_count"],
# 					"current_planned": user_data["total_tasks"],
# 					"current_actual": user_data["done_tasks"],
# 					"current_actual_percentage": user_data["current_actual_percentage"],
# 					"current_actual_on_time": user_data["done_on_time_tasks"],
# 					"current_actual_on_time_percentage": user_data["current_actual_on_time_percentage"],
# 					"not_approved_count": user_data["not_approved_count"],
# 					"role": user_role,
# 					"designation": user_designation,
# 				}
# 			)

# 		total_users = frappe.db.count("CG User", filters=user_filters)

# 		return standard_response(
# 			success=True,
# 			message="Insights generated successfully.",
# 			data={
# 				"insights": insights,
# 				"current_page": page,
# 				"page_size": page_size,
# 				"total_count": total_users,
# 				"total_pages": (total_users + page_size - 1) // page_size,
# 			},
# 		)

# 	except Exception as e:
# 		logger.error("Error in generate_task_insights: %s", str(e))
# 		return standard_response(
# 			success=False,
# 			message=str(e),
# 			status_code=500,
# 		)


# @frappe.whitelist(allow_guest=False)
# def check_user_insights(email: str) -> dict[str, Any]:
# 	"""
# 	Check the task status for a specific user.

# 	Parameters:
# 	- email (str): The email of the user whose task status needs to be checked.

# 	Returns:
# 	- dict[str, Any]: A dictionary containing the success status, message, and data.
# 	  The data includes the email of the user, the total number of tasks assigned,
# 	  the number of completed tasks, and the number of overdue tasks.
# 	"""
# 	try:
# 		assigned_tasks = frappe.get_all(
# 			"CG Single Task",
# 			filters={"assigned_to": email},
# 			fields=["is_completed", "due_date"],
# 		) + frappe.get_all(
# 			"CG Scheduled Task Instance",
# 			filters={"assigned_to": email},
# 			fields=["is_completed", "due_date"],
# 		)

# 		total_task_count = len(assigned_tasks)
# 		completed_task_count = sum(1 for task in assigned_tasks if task["is_completed"])
# 		overdue_count = sum(
# 			1
# 			for task in assigned_tasks
# 			if parse_date(task["due_date"]) < datetime.now() and not task["is_completed"]
# 		)

# 		return standard_response(
# 			success=True,
# 			message="Task status checked successfully.",
# 			data={
# 				"email": get_cg_user(email),
# 				"total_tasks": total_task_count,
# 				"completed_tasks": completed_task_count,
# 				"overdue_tasks": overdue_count,
# 			},
# 		)

# 	except Exception as e:
# 		logger.error("Error in check_user_insights: %s", str(e))
# 		return standard_response(
# 			success=False,
# 			message=str(e),
# 			status_code=500,
# 		)


# @frappe.whitelist(allow_guest=False)
# def completed_task_insights(trend: str = "Weekly", day: str = "Saturday") -> dict[str, Any]:
# 	"""
# 	Generates cumulative graph data for completed tasks.

# 	Parameters:
# 	- trend (str): The trend for generating the graph data.
# 	- day (str): The day for filtering tasks.

# 	Returns:
# 	- dict[str, Any]: A dictionary with cumulative data for completed tasks and tasks completed on time.
# 	"""
# 	try:
# 		if trend not in ["Weekly", "last_30_days"]:
# 			return standard_response(
# 				success=False,
# 				message="Invalid trend value. Allowed values are 'Weekly' and 'last_30_days'.",
# 				status_code=400,
# 			)

# 		if day not in ["Saturday", "Sunday"]:
# 			return standard_response(
# 				success=False,
# 				message="Invalid day value. Allowed values are 'Saturday' and 'Sunday'.",
# 				status_code=400,
# 			)

# 		# Fetch date range
# 		start_date, end_date = get_date_range("Weekly" if trend == "Weekly" else "last_30_days", day)
# 		current_user_email, current_user_role = get_session_user_info()

# 		# Determine the users
# 		users = []
# 		if current_user_role == "CG-ROLE-ADMIN":
# 			users = frappe.get_all("CG User", filters={"company_id": get_company_id()}, fields=["email"])
# 		elif current_user_role == "CG-ROLE-TEAM-LEAD":
# 			users = frappe.get_all(
# 				"CG User",
# 				filters={"role": "CG-ROLE-MEMBER", "company_id": get_company_id()},
# 				fields=["email"],
# 			)
# 			users.append({"email": current_user_email})
# 		else:
# 			users = [{"email": current_user_email}]

# 		# Initialize daily task counts
# 		daily_completed_tasks = {date: 0 for date in date_range(start_date, end_date)}
# 		daily_completed_on_time_tasks = {date: 0 for date in date_range(start_date, end_date)}

# 		# Populate task counts for each user
# 		for user in users:
# 			task_counts = fetch_task_counts_by_date(user["email"], start_date, end_date)
# 			for date, counts in task_counts.items():
# 				daily_completed_tasks[date] += counts["completed_tasks"]
# 				daily_completed_on_time_tasks[date] += counts["completed_on_time_tasks"]

# 		# Calculate cumulative totals
# 		cumulative_completed = 0
# 		cumulative_on_time = 0
# 		total_task_count = fetch_total_task_count(trend, day)

# 		completed_percentages = []
# 		on_time_percentages = []

# 		for date in sorted(daily_completed_tasks):
# 			cumulative_completed += daily_completed_tasks[date]
# 			cumulative_on_time += daily_completed_on_time_tasks[date]

# 			completed_percentages.append(
# 				round_off_int(
# 					(cumulative_completed / (0.01 * total_task_count)) if total_task_count > 0 else 0
# 				)
# 			)
# 			on_time_percentages.append(
# 				round_off_int((cumulative_on_time / (0.01 * total_task_count)) if total_task_count > 0 else 0)
# 			)

# 		result_data = {
# 			"completed": completed_percentages,
# 			"on_time": on_time_percentages,
# 		}

# 		return standard_response(
# 			success=True,
# 			message="Cumulative graph data generated successfully.",
# 			data={
# 				**result_data,
# 				"start_date": start_date,
# 				"end_date": end_date,
# 			},
# 		)

# 	except Exception as e:
# 		logger.error("Error in completed_task_insights: %s", str(e))
# 		return standard_response(
# 			success=False,
# 			message=str(e),
# 			status_code=500,
# 		)


# def fetch_total_task_count(trend: str | None, day: str | None):
# 	start_date, end_date = get_date_range("Weekly" if trend == "Weekly" else "last_30_days", day)
# 	total_task_count = frappe.db.count(
# 		"CG Scheduled Task Instance",
# 		filters={
# 			"due_date": ["between", (start_date, end_date)],
# 		},
# 	) + frappe.db.count(
# 		"CG Single Task",
# 		filters={
# 			"due_date": ["between", (start_date, end_date)],
# 		},
# 	)
# 	return total_task_count


# def fetch_task_counts_by_date(
# 	assigned_to: str, start_date: datetime.date, end_date: datetime.date
# ) -> dict[datetime.date, dict[str, int]]:
# 	tasks = frappe.get_all(
# 		"CG Single Task",
# 		filters={
# 			"assigned_to": assigned_to,
# 			"is_completed": 1,
# 			"due_date": ["between", (start_date, end_date)],
# 		},
# 		fields=["completed_on", "due_date", "status"],
# 	)

# 	daily_counts = {}
# 	for task in tasks:
# 		due_date = getdate(task["due_date"])
# 		if due_date not in daily_counts:
# 			daily_counts[due_date] = {
# 				"completed_tasks": 0,
# 				"completed_on_time_tasks": 0,
# 			}
# 		daily_counts[due_date]["completed_tasks"] += 1

# 		if task["status"] == "Completed" and getdate(task["completed_on"]) <= due_date:
# 			daily_counts[due_date]["completed_on_time_tasks"] += 1

# 	return daily_counts


# @frappe.whitelist(allow_guest=False)
# def performer_list(
# 	trend: str | None = "Weekly",
# 	day: str = "Saturday",
# 	order: str = "top",
# ) -> dict[str, Any]:
# 	try:
# 		start_date, end_date = get_date_range("Weekly" if trend == "Weekly" else "last_30_days", day)

# 		current_user_email, current_user_role = get_session_user_info()

# 		allowed_emails = get_allowed_emails(current_user_role)
# 		if current_user_email not in allowed_emails:
# 			allowed_emails.append(current_user_email)

# 		users = frappe.get_all(
# 			"CG User",
# 			filters={"company_id": get_company_id(), "email": ["in", allowed_emails]},
# 			fields=["name", "designation", "email"],
# 		)

# 		results = []

# 		for user in users:
# 			user_id = user["name"]
# 			user_designation = user.get("designation")
# 			user_data = fetch_user_insights_data(
# 				user_id=user_id, task_type=None, start_date=start_date, end_date=end_date
# 			)
# 			score = user_data["current_actual_percentage"]
# 			results.append(
# 				{
# 					"user": get_cg_user(user_id),
# 					"designation": user_designation,
# 					"current_actual_on_time_percentage": score,
# 					"score": score,
# 				}
# 			)

# 		# Sort based on the order
# 		results.sort(key=lambda x: x["current_actual_on_time_percentage"], reverse=(order == "top"))
# 		top_5_results = results[:5]

# 		return standard_response(
# 			success=True,
# 			message=f"{order.capitalize()} performers generated successfully.",
# 			data={"results": top_5_results},
# 		)

# 	except Exception as e:
# 		logger.error("Error in performer_list: %s", str(e))
# 		return standard_response(
# 			success=False,
# 			message="An error occurred while generating the performer list.",
# 			status_code=500,
# 		)


# @frappe.whitelist(allow_guest=False)
# def member_performance_report(
# 	trend: str | None = "Weekly",
# 	day: str = "Saturday",
# ) -> dict[str, Any]:
# 	try:
# 		start_date, end_date = get_date_range("Weekly" if trend == "Weekly" else "last_30_days", day)

# 		current_user_email, current_user_role = get_session_user_info()

# 		if current_user_role == "CG-ROLE-ADMIN":
# 			users = frappe.get_all("CG User", filters={"company_id": get_company_id()}, fields=["email"])

# 		results = []
# 		for user in users:
# 			user_id = user["email"]
# 			user_data = fetch_user_insights_data(
# 				user_id=user_id, task_type=None, start_date=start_date, end_date=end_date
# 			)
# 			results.append(
# 				{
# 					"user": get_cg_user(user_id),
# 					"current_actual_on_time_percentage": user_data["current_actual_on_time_percentage"],
# 				}
# 			)

# 		results.sort(key=lambda x: x["current_actual_on_time_percentage"], reverse=True)
# 		zero_to_twenty = twenty_to_eighty = greater_than_eighty = 0
# 		percentages = [float(entry["current_actual_on_time_percentage"]) for entry in results]
# 		for percentage in percentages:
# 			if 0 <= (100 + percentage) <= 20:
# 				zero_to_twenty += 1
# 			elif 20 < (100 + percentage) <= 80:
# 				twenty_to_eighty += 1
# 			else:
# 				greater_than_eighty += 1

# 		return standard_response(
# 			success=True,
# 			message="Member performance count generated successfully.",
# 			data={
# 				"zero_to_twenty": zero_to_twenty,
# 				"twenty_to_eighty": twenty_to_eighty,
# 				"greater_than_eighty": greater_than_eighty,
# 			},
# 		)

# 	except Exception as e:
# 		logger.error("Error in member_performance_count: %s", str(e))
# 		return standard_response(
# 			success=False,
# 			message="An error occurred while generating member performance count.",
# 			status_code=500,
# 		)


# @frappe.whitelist(allow_guest=False)
# def get_user_tasks(user_email: str, page=1, page_size=10):
# 	"""
# 	Fetches tasks assigned to a specific user.

# 	Parameters:
# 	- user_email (str): Email of the user whose tasks need to be fetched.
# 	- page (int): Page number for pagination (default: 1).
# 	- page_size (int): Number of records per page (default: 10).

# 	Returns:
# 	- dict: Contains user details and categorized tasks.
# 	"""
# 	page = int(page)
# 	page_size = int(page_size)

# 	# Fetch user details
# 	user = frappe.db.get_value(
# 		"CG User",
# 		{"email": user_email},
# 		["name", "user_image", "full_name", "role", "designation", "branch_id"],
# 		as_dict=True,
# 	)

# 	if not user:
# 		return {"success": False, "message": f"No user found for email {user_email}"}

# 	# Initialize response structure
# 	user_details = {
# 		"user_id": user.get("name"),
# 		"user_image": user.get("user_image"),
# 		"full_name": user.get("full_name"),
# 		"role": user.get("role"),
# 		"designation": user.get("designation"),
# 		"branch_id": user.get("branch_id"),
# 		"tasks": {
# 			"single_tasks": [],
# 			"scheduled_tasks": [],
# 			"help_ticket_tasks": [],
# 			"process_tasks": [],
# 		},
# 		"task_counts": {
# 			"single_tasks": 0,
# 			"scheduled_tasks": 0,
# 			"help_ticket_tasks": 0,
# 			"process": 0,
# 		},
# 	}

# 	# Fetch Single Tasks
# 	single_tasks = frappe.get_all(
# 		"CG Single Task",
# 		filters={"assigned_to": user_email},
# 		fields=["task_name", "due_date", "status", "assigned_to", "priority", "is_help_ticket"],
# 		start=(page - 1) * page_size,
# 		page_length=page_size,
# 	)

# 	for task in single_tasks:
# 		assignee_details = get_cg_user(task.get("assigned_to"), allow_none=True)
# 		task_data = {
# 			"task_name": task.get("task_name"),
# 			"due_date": task.get("due_date"),
# 			"status": task.get("status"),
# 			"assignee": task.get("assigned_to"),
# 			"priority": task.get("priority"),
# 			"assignee_details": assignee_details,
# 		}

# 		if task.get("is_help_ticket") == 1:
# 			user_details["tasks"]["help_ticket_tasks"].append(task_data)
# 		else:
# 			user_details["tasks"]["single_tasks"].append(task_data)

# 	# Fetch Scheduled Tasks
# 	scheduled_tasks = frappe.get_all(
# 		"CG Scheduled Task Instance",
# 		filters={"assigned_to": user_email},
# 		fields=["task_name", "due_date", "status", "assigned_to", "priority"],
# 		start=(page - 1) * page_size,
# 		page_length=page_size,
# 	)

# 	for task in scheduled_tasks:
# 		assignee_details = get_cg_user(task.get("assigned_to"), allow_none=True)
# 		user_details["tasks"]["scheduled_tasks"].append(
# 			{
# 				"task_name": task.get("task_name"),
# 				"due_date": task.get("due_date"),
# 				"status": task.get("status"),
# 				"assignee": task.get("assigned_to"),
# 				"priority": task.get("priority"),
# 				"assignee_details": assignee_details,
# 			}
# 		)
# 	help_ticket_tasks = frappe.get_all(
# 		"CG Single Task",
# 		filters={"assigned_to": user_email, "is_help_ticket": 1},
# 		fields=["task_name", "due_date", "status", "assigned_to", "priority"],
# 		start=(page - 1) * page_size,
# 		page_length=page_size,
# 	)

# 	for task in help_ticket_tasks:
# 		assignee_details = get_cg_user(task.get("assigned_to"), allow_none=True)
# 		user_details["tasks"]["help_ticket_tasks"].append(
# 			{
# 				"task_name": task.get("task_name"),
# 				"due_date": task.get("due_date"),
# 				"status": task.get("status"),
# 				"assignee": task.get("assigned_to"),
# 				"priority": task.get("priority"),
# 				"assignee_details": assignee_details,
# 			}
# 		)

# 	# Count total tasks
# 	user_details["task_counts"]["single_tasks"] = frappe.db.count(
# 		"CG Single Task", {"assigned_to": user_email}
# 	)
# 	user_details["task_counts"]["scheduled_tasks"] = frappe.db.count(
# 		"CG Scheduled Task Instance", {"assigned_to": user_email}
# 	)
# 	user_details["task_counts"]["help_ticket_tasks"] = frappe.db.count(
# 		"CG Single Task", {"assigned_to": user_email, "is_help_ticket": 1}
# 	)

# 	return standard_response(
# 		success=True,
# 		message="Tasks fetched successfully.",
# 		data={
# 			"user_details": user_details,
# 			"page": page,
# 			"page_size": page_size,
# 		},
# 	)


# def get_task_status_counts(
# 	assigned_to: str, start_date: datetime.date, end_date: datetime.date, today: datetime.date
# ) -> dict[str, int]:
# 	"""
# 	Fetches task status counts for a given user in the specified date range.

# 	Parameters:
# 	- assigned_to (str): Email of the assigned user.
# 	- start_date (date): Start date of the range.
# 	- end_date (date): End date of the range.
# 	- today (date): Today's date for comparison.

# 	Returns:
# 	- dict[str, int]: Task counts categorized as Due Today, Upcoming, Completed, and Overdue.
# 	"""
# 	tasks_for_single_task = frappe.get_all(
# 		"CG Single Task",
# 		filters={"assigned_to": assigned_to, "due_date": ["between", (start_date, end_date)]},
# 		fields=["due_date", "completed_on", "status"],
# 	)
# 	tasks_for_scheduled_task = frappe.get_all(
# 		"CG Scheduled Task Instance",
# 		filters={"assigned_to": assigned_to, "due_date": ["between", (start_date, end_date)]},
# 		fields=["due_date", "completed_on", "status"],
# 	)
# 	tasks = tasks_for_single_task + tasks_for_scheduled_task

# 	status_counts = {"Due Today": 0, "Upcoming": 0, "Completed": 0, "Overdue": 0}
# 	total_tasks = len(tasks)
# 	completed_tasks = 0

# 	for task in tasks:
# 		due_date = getdate(task["due_date"])
# 		completed_on = getdate(task["completed_on"]) if task["completed_on"] else None
# 		task_status = task["status"]

# 		if task_status == "Completed" or completed_on:
# 			status_counts["Completed"] += 1
# 			completed_tasks += 1
# 		elif due_date == today:
# 			status_counts["Due Today"] += 1
# 		elif due_date > today:
# 			status_counts["Upcoming"] += 1
# 		elif due_date < today and task_status != "Completed":
# 			status_counts["Overdue"] += 1

# 		completion_percentage = (completed_tasks / total_tasks) * 100 if total_tasks > 0 else 0
# 		status_counts["Total_tasks"] = total_tasks
# 		status_counts["Completion_percentage"] = round(completion_percentage, 2)

# 	return status_counts


# @frappe.whitelist(allow_guest=False)
# def user_task_statistics(
# 	trend: str = "Weekly", day: str = "Saturday", user_email: str = None
# ) -> dict[str, Any]:
# 	"""
# 	Generates both task completion statistics and task status counts for a single user.

# 	Parameters:
# 	- trend (str): Either 'Weekly' (default) for 7 days or 'last_30_days' for 30 days.
# 	- day (str): Used to calculate date ranges.
# 	- user_email (str, required): The email of the user whose stats need to be fetched.

# 	Returns:
# 	- dict[str, Any]: Contains task statistics for the user.
# 	"""
# 	try:
# 		if not user_email:
# 			return standard_response(success=False, message="User email is required.", status_code=400)

# 		if trend not in ["Weekly", "last_30_days"]:
# 			return standard_response(
# 				success=False, message="Invalid trend value. Use 'Weekly' or 'last_30_days'.", status_code=400
# 			)
# 		user = frappe.db.get_value("CG User", {"email": user_email}, "email")
# 		if not user:
# 			return standard_response(
# 				success=False, message=f"No data found for {user_email}.", status_code=404
# 			)

# 		start_date, end_date = get_date_range(trend, day)
# 		today = getdate()

# 		daily_task_counts = fetch_task_counts_by_date(user_email, start_date, end_date)
# 		completion_stats = {
# 			"completed_tasks": [
# 				daily_task_counts.get(date, {}).get("completed_tasks", 0)
# 				for date in date_range(start_date, end_date)
# 			],
# 			"on_time_tasks": [
# 				daily_task_counts.get(date, {}).get("completed_on_time_tasks", 0)
# 				for date in date_range(start_date, end_date)
# 			],
# 		}

# 		status_counts = get_task_status_counts(user_email, start_date, end_date, today)
# 		return standard_response(
# 			success=True,
# 			message="User task statistics generated successfully.",
# 			data={
# 				"completion_stats": completion_stats,
# 				"task_status_counts": status_counts,
# 				"start_date": start_date,
# 				"end_date": end_date,
# 			},
# 		)

# 	except Exception as e:
# 		logger.error(f"Error in user_task_statistics: {str(e)}")
# 		return standard_response(success=False, message=str(e), status_code=500)

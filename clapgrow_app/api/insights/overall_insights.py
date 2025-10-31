from typing import Any

import frappe
from frappe import _
from frappe.utils import getdate, now

from clapgrow_app.api.error_classes import standard_response
from clapgrow_app.api.insights.member_insights import (
	completed_task_insights,
	fetch_user_insights_data,
	get_date_range,
)
from clapgrow_app.api.tasks.task_utils import round_off


@frappe.whitelist(allow_guest=False)
def get_task_statistics(trend: str = "Weekly", day: str = "Saturday", users=None) -> dict[str, Any]:
	try:
		start_date, end_date = get_date_range("Weekly" if trend == "Weekly" else "last_30_days", day)
		company_id = frappe.get_cached_value("CG User", frappe.session.user, "company_id")
		total_tags = frappe.db.count("CG Tags", {"company_id": company_id})

		if isinstance(users, str):
			users = frappe.parse_json(users)

		if not users:
			users = [frappe.session.user]

		total_tasks = 0
		done_tasks = 0
		done_on_time_tasks = 0
		overdue_count = 0

		for user in users:
			insights = fetch_user_insights_data(
				user_id=user, task_type=None, start_date=start_date, end_date=end_date
			)

			total_tasks += insights.get("total_tasks", 0)
			done_tasks += insights.get("done_tasks", 0)
			done_on_time_tasks += insights.get("done_on_time_tasks", 0)
			overdue_count += insights.get("not_done_on_time_tasks", 0)

		not_completed_tasks = total_tasks - done_tasks

		task_statistics = {
			"total_task": total_tasks,
			"completed": done_tasks,
			"not_completed": not_completed_tasks,
			"on_time": done_on_time_tasks,
			"delayed": overdue_count,
		}

		performance_of_completed_tasks = {
			"on_time_performance": {
				"increase_%": 0,
				"performance_%": round(
					(done_on_time_tasks / total_tasks * 100) if total_tasks > 0 else 100, 2
				),
				"total": total_tasks,
				"complete_tasks": done_tasks,
				"remaining_tasks": not_completed_tasks,
			},
			"including_delay_performance": {
				"increase_%": 0,
				"performance_%": round(
					((overdue_count + done_on_time_tasks) / total_tasks * 100) if total_tasks > 0 else 10, 2
				),
				"total": total_tasks,
				"complete_tasks": done_tasks,
				"remaining_tasks": not_completed_tasks,
			},
			"tags_performance": {
				"increase": 0,
				"performance": 0,
				"total": total_tags,
				"done": done_tasks,
				"remaining_task": not_completed_tasks,
			},
		}

		completed_insights_response = completed_task_insights(trend=trend, day=day)
		completed_insights = completed_insights_response[0]
		task_completed_graph = {}
		if completed_insights.get("status") == "success":
			task_completed_graph = {
				"completed_tasks": completed_insights["data"].get("completed", []),
				"on_time_tasks": completed_insights["data"].get("on_time", []),
			}

		return {
			"task_statistics": task_statistics,
			"performance_of_completed_tasks": performance_of_completed_tasks,
			"task_completed_graph": task_completed_graph,
			"start_date": start_date,
			"end_date": end_date,
		}

	except Exception as e:
		return {"error": str(e)}


@frappe.whitelist(allow_guest=False)
def fetch_tasks_by_department(page: int = 1, page_size: int = 4, users=None) -> dict[str, Any]:
	try:
		# Fetch all users and their department
		user_filters = {"email": ["in", users]} if users else {}
		user_departments = frappe.get_all("CG User", filters=user_filters, fields=["email", "department_id"])
		all_departments = frappe.get_all("CG Department", fields=["name"])
		department_ids = [dept["name"] for dept in all_departments]
		department_users_map = {dept: [] for dept in department_ids}
		for user in user_departments:
			dept = user["department_id"]
			if dept in department_users_map:
				department_users_map[dept].append(user["email"])

		# Fetch task counts for all departments
		department_task_counts = {}
		total_single_tasks = 0
		total_scheduled_tasks = 0
		total_help_tickets = 0

		for department_name in department_ids:
			department_user_emails = department_users_map.get(department_name, [])

			if department_user_emails:
				single_tasks = frappe.db.count(
					"CG Task Instance",
					{
						"assigned_to": ["in", department_user_emails],
						"is_help_ticket": 0,
						"task_type": "Onetime",
					},
				)
				help_tickets = frappe.db.count(
					"CG Task Instance", {"assigned_to": ["in", department_user_emails], "is_help_ticket": 1}
				)
				scheduled_tasks = frappe.db.count(
					"CG Task Instance",
					{"assigned_to": ["in", department_user_emails], "task_type": "Recurring"},
				)
			else:
				single_tasks = help_tickets = scheduled_tasks = 0

			total_single_tasks += single_tasks
			total_scheduled_tasks += scheduled_tasks
			total_help_tickets += help_tickets

			# Fetch completed task stats
			completed_single_tasks = (
				frappe.get_all(
					"CG Task Instance",
					filters={"assigned_to": ["in", department_user_emails], "is_completed": 1},
					fields=["completed_on", "due_date"],
				)
				if department_user_emails
				else []
			)

			completed_scheduled_tasks = (
				frappe.get_all(
					"CG Scheduled Task Instance",
					filters={"assigned_to": ["in", department_user_emails], "is_completed": 1},
					fields=["completed_on", "due_date"],
				)
				if department_user_emails
				else []
			)

			# Calculate on-time and overdue tasks
			on_time_single_tasks = overdue_single_tasks = 0
			on_time_scheduled_tasks = overdue_scheduled_tasks = 0

			for task in completed_scheduled_tasks + completed_single_tasks:
				completed_on = task.get("completed_on")
				due_date = task.get("due_date")

				if completed_on and due_date:
					try:
						completed_on_date = getdate(completed_on)
						due_date_date = getdate(due_date)

						if completed_on_date <= due_date_date:
							if task in completed_single_tasks:
								on_time_single_tasks += 1
							else:
								on_time_scheduled_tasks += 1
						else:
							if task in completed_single_tasks:
								overdue_single_tasks += 1
							else:
								overdue_scheduled_tasks += 1
					except Exception as e:
						frappe.log_error(f"Error processing task: {task} - {str(e)}")

			department_task_counts[department_name] = {
				"name": department_name,
				"tasks": {
					"completed_tasks": len(completed_single_tasks) + len(completed_scheduled_tasks),
					"total_tasks": single_tasks + scheduled_tasks,
					"on_time_tasks": on_time_single_tasks + on_time_scheduled_tasks,
					"overdue_tasks": overdue_single_tasks + overdue_scheduled_tasks,
				},
				"performance": 0,
			}

		total_departments = len(department_task_counts)
		total_pages = (total_departments + page_size - 1) // page_size
		page = max(1, min(page, total_pages))
		start_index = (page - 1) * page_size
		end_index = start_index + page_size

		paginated_departments = list(department_task_counts.values())[start_index:end_index]

		# Task breakdown counts
		task_breakdown_counts = {
			"onetime_tasks": total_single_tasks,
			"recurring_tasks": total_scheduled_tasks,
			"help_tickets": total_help_tickets,
			"process": 0,
		}

		return {
			"data": {
				"department_data_counts": paginated_departments,
				"current_page": page,
				"page_size": page_size,
				"total_count": total_departments,
				"total_pages": total_pages,
			},
			"task_breakdown_counts": task_breakdown_counts,
		}

	except Exception as e:
		frappe.log_error(f"Error fetching tasks by department: {str(e)}")
		return {"error": str(e)}


@frappe.whitelist(allow_guest=False)
def overall_insights(
	trend: str = "Weekly", day: str = "Saturday", branch: str = None, page: int = 1, page_size: int = 4
) -> dict:
	"""
	Fetches overall insights based on the provided parameters.

	Args:
	    trend (str): The trend type for insights. Default is "Weekly".
	    day (str): The day of the week for insights. Default is "Saturday".
	    branch (str | None): The branch name to filter users and tasks. Default is None.
	    page (int): The page number for pagination. Default is 1.
	    page_size (int): The number of items per page. Default is 10.

	Returns:
	    dict: A dictionary containing the overall insights data or an error message.
	"""
	try:
		if trend not in ["Weekly", "last_30_days"]:
			return standard_response(
				success=False,
				message="Invalid trend value. Allowed values are 'Weekly' and 'last_30_days'.",
				status_code=400,
			)

		if day not in ["Saturday", "Sunday"]:
			return standard_response(
				success=False,
				message="Invalid day value. Allowed values are 'Saturday' and 'Sunday'.",
				status_code=400,
			)

		filters = {"branch_id": branch} if branch else {}
		users = frappe.get_all("CG User", filters=filters, fields=["email"])

		if not users:
			empty_stats = {
				"task_statistics": {
					"total_task": 0,
					"completed": 0,
					"not_completed": 0,
					"on_time": 0,
					"delayed": 0,
				},
				"performance_of_completed_tasks": {
					"on_time_performance": {"increase": 0, "performance": 0, "total": 0},
					"including_delay_performance": {"increase": 0, "performance": 0, "total": 0},
					"tags_performance": {"increase": 0, "performance": 0, "total": 0},
				},
				"task_completed_graph": {
					"completed_tasks": [0, 0, 0, 0, 0, 0],
					"on_time_tasks": [0, 0, 0, 0, 0, 0],
				},
				"start_date": "2025-02-24",
				"end_date": "2025-03-01",
				"department_data_counts": [],
				"current_page": page,
				"page_size": page_size,
				"total_count": 0,
				"total_pages": 0,
				"task_breakdown_counts": {
					"onetime_tasks": 0,
					"recurring_tasks": 0,
					"help_tickets": 0,
					"process": 0,
				},
			}
			return standard_response(
				success=True,
				message="No users found, returning empty statistics.",
				data=empty_stats,
				status_code=200,
			)

		user_emails = [user["email"] for user in users]
		start_date, end_date = get_date_range("Weekly" if trend == "Weekly" else "last_30_days", day)

		task_statistics_response = get_task_statistics(trend=trend, day=day, users=user_emails)

		if not isinstance(task_statistics_response, dict):
			return standard_response(
				success=False,
				message="Unexpected response format from get_task_statistics",
				errors={"response": task_statistics_response},
				status_code=500,
			)

		if task_statistics_response.get("status", "success") != "success":
			return task_statistics_response

		task_statistics = task_statistics_response

		department_task_counts = fetch_tasks_by_department(users=user_emails, page=page, page_size=page_size)

		if "error" in department_task_counts:
			return standard_response(
				success=False,
				message="Error fetching department task counts",
				errors=department_task_counts,
				status_code=500,
			)
		return standard_response(
			success=True,
			message="Overall insights fetched successfully.",
			data={**task_statistics, **department_task_counts},
			status_code=200,
		)

	except Exception as e:
		frappe.log_error(
			title="Error in Overall Insights",
			message=f"""An error occurred while fetching overall insights:
            - Exception: {str(e)}
            - Time: {now()}
            - Parameters: trend={trend}, day={day}, branch={branch}, page={page}, page_size={page_size}
            """,
		)

		return standard_response(
			success=False,
			message="Error in fetching overall insights",
			errors={"exception": str(e)},
			status_code=500,
		)

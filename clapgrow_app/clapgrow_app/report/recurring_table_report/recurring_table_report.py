# Copyright (c) 2025, Clapgrow and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import flt, getdate


def execute(filters: dict | None = None):
	"""Return columns and data for the report."""
	filters = filters or {}
	company_id = filters.get("company_id")

	if not company_id:
		frappe.throw(_("Please select a company to view the report."))

	columns = get_columns()
	data = get_data(filters)
	disable_prepared_report_being_checked("Recurring Table Report")
	return columns, data


def disable_prepared_report_being_checked(report_name):
	"""
	Uncheck the prepared_report checkbox and remove `Prepared Report` entity (if any)
	"""
	frappe.db.set_value("Report", report_name, "prepared_report", 0)
	frappe.db.delete("Prepared Report", {"report_name": report_name})
	frappe.db.commit()


def get_columns() -> list[dict]:
	"""Return columns for the report."""
	return [
		{
			"label": _("Recurring Task ID"),
			"fieldname": "recurring_task_id",
			"fieldtype": "Link",
			"options": "CG Task Definition",
			"width": 200,
		},
		{
			"label": _("Recurring Tasks"),
			"fieldname": "recurring_tasks",
			"fieldtype": "Link",
			"options": "CG Task Definition",
			"width": 200,
		},
		{
			"label": _("Frequency"),
			"fieldname": "frequency",
			"fieldtype": "Data",
			"width": 120,
		},
		# Assigned To details
		{
			"label": _("Assigned To Email"),
			"fieldname": "assigned_to_email",
			"fieldtype": "Data",
			"width": 200,
		},
		{
			"label": _("Assigned To Full Name"),
			"fieldname": "assigned_to_full_name",
			"fieldtype": "Data",
			"width": 200,
		},
		{
			"label": _("Assigned To First Name"),
			"fieldname": "assigned_to_first_name",
			"fieldtype": "Data",
			"width": 150,
		},
		{
			"label": _("Assigned To Last Name"),
			"fieldname": "assigned_to_last_name",
			"fieldtype": "Data",
			"width": 150,
		},
		{
			"label": _("Assigned To User Image"),
			"fieldname": "assigned_to_user_image",
			"fieldtype": "Data",
			"width": 250,
		},
		# Assignee details
		{
			"label": _("Assignee Email"),
			"fieldname": "assignee_email",
			"fieldtype": "Data",
			"width": 200,
		},
		{
			"label": _("Assignee Full Name"),
			"fieldname": "assignee_full_name",
			"fieldtype": "Data",
			"width": 200,
		},
		{
			"label": _("Assignee First Name"),
			"fieldname": "assignee_first_name",
			"fieldtype": "Data",
			"width": 150,
		},
		{
			"label": _("Assignee Last Name"),
			"fieldname": "assignee_last_name",
			"fieldtype": "Data",
			"width": 150,
		},
		{
			"label": _("Assignee User Image"),
			"fieldname": "assignee_user_image",
			"fieldtype": "Data",
			"width": 250,
		},
		{
			"label": _("On Time %"),
			"fieldname": "on_time_percent",
			"fieldtype": "Percent",
			"width": 100,
		},
		{
			"label": _("Completion Score %"),
			"fieldname": "completion_score",
			"fieldtype": "Percent",
			"width": 120,
		},
		{
			"label": _("Priority"),
			"fieldname": "priority",
			"fieldtype": "Data",
			"width": 100,
		},
		{
			"label": _("Task Status"),
			"fieldname": "task_status",
			"fieldtype": "Data",
			"width": 100,
		},
	]


def get_data(filters: dict) -> list[dict]:
	"""Return data for the report."""
	conditions = get_conditions(filters)
	company_id = filters.get("company_id")

	# Get users from the specified company
	company_users = frappe.get_all("CG User", filters={"company_id": company_id}, fields=["email"])
	user_emails = [user["email"] for user in company_users]

	if not user_emails:
		return []  # Return empty list if no users found for the company

	# Add company user filter to conditions if not already filtered by assigned_to/assignee
	if "assigned_to" not in conditions and "assignee" not in conditions:
		conditions["assigned_to"] = ["in", user_emails]

	# Get CG Task Definition records for company users
	task_definitions = frappe.get_all(
		"CG Task Definition",
		filters=conditions,
		fields=["name", "task_name", "assigned_to", "assignee", "priority", "enabled"],
	)

	data = []
	for task in task_definitions:
		# Get the frequency
		task_doc = frappe.get_doc("CG Task Definition", task.name)
		frequency = task_doc.recurrence_type_id[0].frequency if task_doc.recurrence_type_id else ""

		# Fetch user details for assigned_to
		user = frappe.get_doc("User", task.assigned_to) if task.assigned_to else None

		# Fetch user details for assignee
		assignee_user = frappe.get_doc("User", task.assignee) if task.assignee else None

		# Get task instances
		instance_filters = {"task_definition_id": task.name}
		if filters.get("status"):
			instance_filters["status"] = filters["status"]
		if filters.get("audit_status"):
			instance_filters["audit_status"] = filters["audit_status"]

		instances = frappe.db.get_all(
			"CG Task Instance",
			filters=instance_filters,
			fields=["completed_on", "due_date", "status"],
		)

		# Calculate metrics
		total_instances = len(instances)
		on_time_count = 0
		completed_count = 0

		if total_instances > 0:
			for instance in instances:
				if instance.completed_on and instance.due_date:
					if getdate(instance.completed_on) <= getdate(instance.due_date):
						on_time_count += 1
				if instance.status == "Completed":
					completed_count += 1

			on_time_percent = flt((on_time_count / total_instances) * 100, 2)
			completion_score = flt((completed_count / total_instances) * 100, 2)
		else:
			on_time_percent = 0.0
			completion_score = 0.0

		# Determine task status based on enabled field
		task_status = "Active" if task.enabled == 1 else "Inactive"

		data.append(
			{
				"recurring_task_id": task.name,
				"recurring_tasks": task.task_name,
				"frequency": frequency,
				# Assigned To details
				"assigned_to_email": user.name if user else "",
				"assigned_to_full_name": user.full_name if user else "",
				"assigned_to_first_name": user.first_name if user else "",
				"assigned_to_last_name": user.last_name if user else "",
				"assigned_to_user_image": user.user_image if user else "",
				# Assignee details
				"assignee_email": assignee_user.name if assignee_user else "",
				"assignee_full_name": assignee_user.full_name if assignee_user else "",
				"assignee_first_name": (assignee_user.first_name if assignee_user else ""),
				"assignee_last_name": assignee_user.last_name if assignee_user else "",
				"assignee_user_image": (assignee_user.user_image if assignee_user else ""),
				# Metrics
				"on_time_percent": on_time_percent,
				"completion_score": completion_score,
				"priority": task.priority,
				"task_status": task_status,
			}
		)

	return data


def resolve_user_emails(values):
	"""Helper function to resolve user values to emails."""
	emails = []
	if not isinstance(values, list):
		values = [values]

	for val in values:
		# Try to resolve against CG User (autoname=email)
		if frappe.db.exists("CG User", val):
			emails.append(val)
		else:
			# If val is not a CG User name, try resolving by full_name
			email = frappe.db.get_value("CG User", {"full_name": val}, "email")
			if email:
				emails.append(email)
			else:
				# fallback — assume the provided value is an email
				emails.append(val)

	return emails


def get_conditions(filters: dict) -> dict:
	"""Generate conditions dictionary for frappe.get_all."""
	conditions = {}

	# Date range filter
	if filters.get("from_date") and filters.get("to_date"):
		conditions["creation"] = ["between", [filters["from_date"], filters["to_date"]]]

	# Handle assigned_to filter separately
	if filters.get("assigned_to"):
		assigned_to_emails = resolve_user_emails(filters["assigned_to"])
		if len(assigned_to_emails) == 1:
			conditions["assigned_to"] = assigned_to_emails[0]
		else:
			conditions["assigned_to"] = ["in", assigned_to_emails]

	# Handle assignee filter separately
	if filters.get("assignee"):
		assignee_emails = resolve_user_emails(filters["assignee"])
		if len(assignee_emails) == 1:
			conditions["assignee"] = assignee_emails[0]
		else:
			conditions["assignee"] = ["in", assignee_emails]

	# Tags filter
	if filters.get("tags"):
		tags_filter = filters["tags"]
		if isinstance(tags_filter, list):
			conditions["tag"] = ["in", tags_filter]
		else:
			conditions["tag"] = ["like", f"%{tags_filter}%"]

	# Priority filter
	if filters.get("priority"):
		conditions["priority"] = filters["priority"]

	# Improved task_status filter handling
	if filters.get("task_status"):
		task_status_filter = filters["task_status"]

		# Ensure it's a list
		if isinstance(task_status_filter, str):
			task_status_filter = [task_status_filter]
		elif not isinstance(task_status_filter, list):
			task_status_filter = ["Active"]  # Default fallback

		# Filter out empty strings and None values
		task_status_filter = [status for status in task_status_filter if status and status.strip()]

		# If no valid statuses after filtering, default to Active
		if not task_status_filter:
			task_status_filter = ["Active"]

		enabled_values = []
		if "Active" in task_status_filter:
			enabled_values.append(1)
		if "Inactive" in task_status_filter:
			enabled_values.append(0)

		# Set the condition based on enabled values
		if len(enabled_values) == 1:
			conditions["enabled"] = enabled_values[0]
		elif len(enabled_values) > 1:
			conditions["enabled"] = ["in", enabled_values]
		else:
			conditions["enabled"] = 1
	else:
		conditions["enabled"] = 1

	return conditions

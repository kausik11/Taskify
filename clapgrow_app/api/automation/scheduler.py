from datetime import datetime, timedelta

import frappe
from dateutil.rrule import (
	DAILY,
	FR,
	MO,
	MONTHLY,
	SA,
	SU,
	TH,
	TU,
	WE,
	WEEKLY,
	YEARLY,
	rrule,
)
from frappe.utils import add_days, get_datetime, now_datetime


def generate_recurring_task_instances():
	# Fetch all recurring task definitions
	task_defs = frappe.get_all(
		"CG Task Definition",
		filters={"task_type": "Recurring", "enabled": 1},
		fields=[
			"name",
			"due_date",
			"generated_till_date",
			"recurrence_type_id",
			"assignee",
			"status",
			"priority",
			"company_id",
			"branch",
			"department",
		],
	)

	for task_def in task_defs:
		recurrence_name = task_def.recurrence_type_id
		if not recurrence_name:
			continue

		recurrence = frappe.get_doc("CG Recurrence Type", recurrence_name)
		original_due = get_datetime(task_def.due_date)
		last_generated = get_datetime(task_def.generated_till_date) if task_def.generated_till_date else None

		# Determine end datetime
		end_date = recurrence.end_date or now_datetime()
		if recurrence.end_date:
			end_date = min(get_datetime(end_date), now_datetime())
		else:
			end_date = now_datetime()

		# Configure rrule parameters
		freq_map = {
			"Daily": DAILY,
			"Weekly": WEEKLY,
			"Monthly": MONTHLY,
			"Yearly": YEARLY,
		}
		freq = freq_map.get(recurrence.frequency)
		if not freq:
			continue

		interval = recurrence.interval or 1
		rrule_args = {"dtstart": original_due, "until": end_date, "interval": interval}

		# Handle Weekly and Monthly rules
		if recurrence.frequency == "Weekly":
			weekdays = parse_weekdays(recurrence.week_days)
			if weekdays:
				rrule_args["byweekday"] = weekdays
		elif recurrence.frequency == "Monthly":
			if recurrence.month_days:
				month_days = [int(d) for d in str(recurrence.month_days).split(",")]
				rrule_args["bymonthday"] = month_days
			elif recurrence.nth_week and recurrence.week_days:
				weekdays = parse_weekdays(recurrence.week_days)
				nth_week = recurrence.nth_week
				rrule_args["byweekday"] = [day(nth_week) for day in weekdays]

		# Generate recurring dates
		rr = rrule(freq, **rrule_args)
		current_time = now_datetime()

		# Ensure we don't start from a date before current time
		if last_generated:
			start_dt = last_generated + timedelta(seconds=1)
		else:
			start_dt = max(original_due, current_time)

		dates = list(rr.after(start_dt, inc=False)) if last_generated else list(rr)

		# Filter dates up to end_date
		dates = [dt for dt in dates if dt <= end_date]

		# Get exception date
		exception_date = get_exception_date(recurrence.exception_date) if recurrence.exception_date else None

		# Remove exceptions
		valid_dates = [dt for dt in dates if not is_exception(dt, exception_date)]

		# Create task instances
		create_instances(task_def, valid_dates)

		# Update generated_till_date
		if valid_dates:
			last_date = max(valid_dates)
			frappe.db.set_value("CG Task Definition", task_def.name, "generated_till_date", last_date)


def parse_weekdays(week_days_str):
	weekday_map = {
		"Monday": MO,
		"Tuesday": TU,
		"Wednesday": WE,
		"Thursday": TH,
		"Friday": FR,
		"Saturday": SA,
		"Sunday": SU,
	}
	if not week_days_str:
		return []
	days = week_days_str.split(",")
	return [weekday_map[d.strip()] for d in days if d.strip() in weekday_map]


def get_exception_date(holiday_name):
	holiday_date = frappe.db.get_value("CG Holiday", holiday_name, "date")
	return get_datetime(holiday_date).date() if holiday_date else None


def is_exception(dt, exception_date):
	return dt.date() == exception_date if exception_date else False


def create_instances(task_def, dates):
	for dt in dates:
		instance = frappe.new_doc("CG Task Instance")
		instance.update(
			{
				"task_definition": task_def.name,
				"due_date": dt,
				"assignee": task_def.assignee,
				"status": "Upcoming",
				"priority": task_def.priority,
				"company_id": task_def.company_id,
				"branch": task_def.branch,
				"department": task_def.department,
			}
		)
		instance.insert(ignore_permissions=True)
		frappe.db.commit()  # Commit is necessary here to save changes after database operations // nosemgrep


def refresh_all_holiday_lists():
	"""
	Scheduled job to refresh all employee holiday lists.
	Run this daily or weekly via scheduler.
	"""
	try:
		# Get all active holiday lists
		current_date = datetime.now().date()

		holiday_lists = frappe.get_all(
			"CG Employee Holiday List",
			filters={"auto_refresh": 1, "to_date": [">=", current_date]},
			pluck="name",
		)

		updated_count = 0
		error_count = 0

		for list_name in holiday_lists:
			try:
				holiday_list = frappe.get_doc("CG Employee Holiday List", list_name)
				holiday_list.generate_consolidated_holidays()
				holiday_list.last_refreshed = datetime.now()
				holiday_list.flags.ignore_permissions = True
				holiday_list.save()
				updated_count += 1

				# Commit every 50 records to avoid long transactions
				if updated_count % 50 == 0:
					frappe.db.commit()

			except Exception as e:
				error_count += 1
				frappe.log_error(
					f"Error refreshing list {list_name}: {str(e)}",
					"Holiday List Refresh",
				)

		frappe.db.commit()

		# Log summary
		frappe.log_error(
			f"Holiday List Refresh Complete: Updated {updated_count}, Errors: {error_count}",
			"Scheduled Job",
		)

	except Exception as e:
		frappe.log_error(f"Error in scheduled holiday refresh: {str(e)}", "Scheduled Job")


def generate_next_year_holidays():
	"""
	Generate holiday lists for the next year for all active employees.
	Run this in December to prepare for the next year.
	"""

	try:
		next_year = datetime.now().year + 1
		from_date = datetime(next_year, 1, 1).date()
		to_date = datetime(next_year, 12, 31).date()

		# Get all active employees
		employees = frappe.get_all("CG User", filters={"enabled": 1}, pluck="name")

		created_count = 0
		skipped_count = 0

		for employee in employees:
			# Check if list already exists
			existing = frappe.db.exists(
				"CG Employee Holiday List",
				{"employee": employee, "from_date": from_date, "to_date": to_date},
			)

			if not existing:
				try:
					holiday_list = frappe.new_doc("CG Employee Holiday List")
					holiday_list.employee = employee
					holiday_list.from_date = from_date
					holiday_list.to_date = to_date
					holiday_list.auto_refresh = 1
					holiday_list.flags.ignore_permissions = True
					holiday_list.insert()
					created_count += 1

					# Commit every 50 records
					if created_count % 50 == 0:
						frappe.db.commit()

				except Exception as e:
					frappe.log_error(
						f"Error creating holiday list for {employee}: {str(e)}",
						"Year-End Holiday Generation",
					)
			else:
				skipped_count += 1

		frappe.db.commit()

		message = f"Year-End Holiday Generation Complete: Created {created_count}, Skipped {skipped_count}"
		frappe.log_error(message, "Year-End Process")

		return {"success": True, "created": created_count, "skipped": skipped_count}

	except Exception as e:
		frappe.log_error(f"Error in year-end holiday generation: {str(e)}", "Year-End Process")
		return {"success": False, "error": str(e)}

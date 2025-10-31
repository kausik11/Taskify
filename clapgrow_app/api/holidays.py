# holidays.py - Fixed API with consistent data format and proper endpoint mapping

from datetime import datetime, timedelta

import frappe
from frappe import _
from frappe.utils import add_days, getdate


def _get_employee_by_id_or_current(employee_id=None):
	"""Helper function to get employee record by ID or current user.

	Args:
		employee_id: Optional employee email/ID to lookup

	Returns:
		dict: CG User record with name, branch_id, full_name, department_id or None
	"""
	if employee_id:
		# If employee_id is provided, get CG User by email
		cg_user = frappe.db.get_value(
			"CG User",
			{"email": employee_id, "enabled": 1},
			["name", "branch_id", "full_name", "department_id"],
			as_dict=True,
		)
	else:
		# Get current user
		user_email = frappe.session.user
		cg_user = frappe.db.get_value(
			"CG User",
			{"email": user_email, "enabled": 1},
			["name", "branch_id", "full_name", "department_id"],
			as_dict=True,
		)
	return cg_user


@frappe.whitelist(allow_guest=False)
def get_employee_holidays():
	"""Enhanced API endpoint with proper recurring holiday support."""
	try:
		# Get parameters
		from_date = frappe.form_dict.get("from_date")
		to_date = frappe.form_dict.get("to_date")
		employee_id = frappe.form_dict.get("employee_id")

		# Set defaults
		if not from_date:
			from_date = datetime.now().date()
		else:
			from_date = getdate(from_date)

		if not to_date:
			to_date = add_days(from_date, 365)
		else:
			to_date = getdate(to_date)

		if to_date < from_date:
			return {
				"success": False,
				"message": "To Date cannot be before From Date",
				"holidays": [],
			}

		# Get target employee (provided employee_id or current user)
		cg_user = _get_employee_by_id_or_current(employee_id)

		if not cg_user:
			return {
				"success": False,
				"message": "User record not found or user is disabled",
				"holidays": [],
			}

		if not cg_user.branch_id:
			return {
				"success": False,
				"message": "No branch assigned to the user",
				"holidays": [],
			}

		# Get holidays with enhanced caching
		from clapgrow_app.clapgrow_app.doctype.cg_employee_holiday_list.cg_employee_holiday_list import (
			get_employee_holidays,
		)

		holidays = get_employee_holidays(cg_user.name, from_date, to_date, create_if_missing=True)

		# Transform holidays to consistent format for frontend
		transformed_holidays = []
		for holiday in holidays:
			transformed_holidays.append(
				{
					"date": str(holiday["date"]),
					"name": holiday["holiday_name"],
					"holiday_name": holiday["holiday_name"],
					"type": holiday["holiday_type"],
					"holiday_type": holiday["holiday_type"],
					"color": holiday.get("color", "#EF4444"),
					"source": holiday.get("source", "Branch"),
					"is_optional": holiday.get("is_optional", False),
					"day": holiday.get("day_name", ""),
					"day_name": holiday.get("day_name", ""),
				}
			)

		# Calculate summary statistics
		total_holidays = len(transformed_holidays)
		mandatory_holidays = len([h for h in transformed_holidays if not h.get("is_optional", False)])
		optional_holidays = len([h for h in transformed_holidays if h.get("is_optional", False)])

		# Group by source
		by_source = {}
		for holiday in transformed_holidays:
			source = holiday.get("source", "Unknown")
			by_source[source] = by_source.get(source, 0) + 1

		# Group by type
		by_type = {}
		for holiday in transformed_holidays:
			holiday_type = holiday.get("type", "Unknown")
			by_type[holiday_type] = by_type.get(holiday_type, 0) + 1

		return {
			"success": True,
			"employee": {
				"id": cg_user.name,
				"name": cg_user.full_name,
				"branch": cg_user.branch_id,
				"department": cg_user.department_id or "",
			},
			"holidays": transformed_holidays,
			"summary": {
				"total_holidays": total_holidays,
				"mandatory_holidays": mandatory_holidays,
				"optional_holidays": optional_holidays,
				"by_source": by_source,
				"by_type": by_type,
			},
			"from_date": str(from_date),
			"to_date": str(to_date),
		}

	except Exception as e:
		return {"success": False, "message": str(e), "holidays": []}


@frappe.whitelist(allow_guest=False)
def get_employee_holidays_by_month():
	"""Enhanced monthly holiday API with proper recurring date handling."""
	try:
		month = int(frappe.form_dict.get("month", datetime.now().month))
		year = int(frappe.form_dict.get("year", datetime.now().year))
		employee_id = frappe.form_dict.get("employee_id")

		# Validate month and year
		if not (1 <= month <= 12):
			return {
				"success": False,
				"message": "Invalid month specified",
				"holidays": [],
			}

		if not (2020 <= year <= 2030):
			return {
				"success": False,
				"message": "Invalid year specified",
				"holidays": [],
			}

		# Calculate month boundaries
		from_date = datetime(year, month, 1).date()
		if month == 12:
			to_date = datetime(year, 12, 31).date()
		else:
			to_date = datetime(year, month + 1, 1).date() - timedelta(days=1)

		# Get target employee (provided employee_id or current user)
		cg_user = _get_employee_by_id_or_current(employee_id)

		if not cg_user:
			return {
				"success": False,
				"message": "User record not found or user is disabled",
				"holidays": [],
			}

		if not cg_user.branch_id:
			return {
				"success": False,
				"message": "No branch assigned to the user",
				"holidays": [],
			}

		# Get holidays with enhanced caching
		from clapgrow_app.clapgrow_app.doctype.cg_employee_holiday_list.cg_employee_holiday_list import (
			get_employee_holidays,
		)

		holidays = get_employee_holidays(cg_user.name, from_date, to_date, create_if_missing=True)

		# Filter holidays strictly within the month range and transform format
		filtered_holidays = []
		for holiday in holidays:
			if from_date <= getdate(holiday["date"]) <= to_date:
				filtered_holidays.append(
					{
						"date": str(holiday["date"]),
						"name": holiday["holiday_name"],
						"holiday_name": holiday["holiday_name"],
						"type": holiday["holiday_type"],
						"holiday_type": holiday["holiday_type"],
						"color": holiday.get("color", "#EF4444"),
						"source": holiday.get("source", "Branch"),
						"is_optional": holiday.get("is_optional", False),
						"day": holiday.get("day_name", ""),
						"day_name": holiday.get("day_name", ""),
					}
				)

		return {
			"success": True,
			"holidays": filtered_holidays,
			"employee": {
				"id": cg_user.name,
				"name": cg_user.full_name,
				"branch": cg_user.branch_id,
				"department": cg_user.department_id or "",
			},
			"month": month,
			"year": year,
			"total_count": len(filtered_holidays),
			"from_date": str(from_date),
			"to_date": str(to_date),
		}

	except Exception as e:
		return {"success": False, "message": str(e), "holidays": []}


@frappe.whitelist(allow_guest=False)
def refresh_employee_holidays():
	"""Enhanced refresh with immediate sync capability."""
	try:
		employee_id = frappe.form_dict.get("employee_id")

		# Get target employee (provided employee_id or current user)
		cg_user = _get_employee_by_id_or_current(employee_id)

		if not cg_user:
			return {
				"success": False,
				"message": "User record not found or user is disabled",
			}

		if not cg_user.branch_id:
			return {"success": False, "message": "No branch assigned to the user"}

		# Clear user's holiday cache immediately
		frappe.cache().delete_keys(f"employee_holidays_{cg_user.name}_*")

		# Get current year boundaries
		current_year = datetime.now().year
		from_date = datetime(current_year, 1, 1).date()
		to_date = datetime(current_year, 12, 31).date()

		# Find existing lists (check for duplicates)
		existing_lists = frappe.db.sql(
			"""
			SELECT name, creation
			FROM `tabCG Employee Holiday List`
			WHERE employee = %s
			AND from_date <= %s
			AND to_date >= %s
			ORDER BY creation DESC
			""",
			(cg_user.name, from_date, to_date),
			as_dict=True,
		)

		# Handle duplicates: keep the most recent, delete others
		if existing_lists:
			if len(existing_lists) > 1:
				# Multiple entries found - keep the first (most recent), delete others
				for duplicate in existing_lists[1:]:
					try:
						frappe.delete_doc(
							"CG Employee Holiday List", duplicate["name"], ignore_permissions=True, force=True
						)
						frappe.log_error(
							f"Deleted duplicate holiday list {duplicate['name']} for employee {cg_user.name}",
							"Duplicate Cleanup",
						)
					except Exception as del_error:
						frappe.log_error(
							f"Could not delete duplicate {duplicate['name']}: {str(del_error)}",
							"Duplicate Cleanup Failed",
						)

			# Update the remaining (most recent) list, only if changed
			holiday_list = frappe.get_doc("CG Employee Holiday List", existing_lists[0]["name"])
			_ = holiday_list.update_holidays_if_changed()
		else:
			# Create new list
			holiday_list = frappe.new_doc("CG Employee Holiday List")
			holiday_list.employee = cg_user.name
			holiday_list.from_date = from_date
			holiday_list.to_date = to_date
			holiday_list.flags.ignore_permissions = True
			holiday_list.insert()

		return {
			"success": True,
			"message": "Holiday list refreshed successfully",
			"total_holidays": holiday_list.total_holidays,
			"mandatory_holidays": holiday_list.mandatory_holidays,
			"optional_holidays": holiday_list.optional_holidays,
			"last_refreshed": str(holiday_list.last_refreshed),
		}

	except Exception as e:
		return {"success": False, "message": str(e)}


@frappe.whitelist(allow_guest=False)
def refresh_branch_holidays(branch_id):
	"""Enhanced branch-wide refresh with immediate sync."""
	try:
		if not branch_id:
			return {"success": False, "message": "Branch ID is required"}

		if not frappe.db.exists("CG Branch", branch_id):
			return {"success": False, "message": "Branch not found"}

		# Clear branch-related caches immediately
		frappe.cache().delete_keys(f"branch_holidays_{branch_id}_*")

		# Get employees in branch
		employees = frappe.get_all("CG User", filters={"branch_id": branch_id, "enabled": 1}, pluck="name")

		if not employees:
			return {
				"success": True,
				"message": "No employees found in the branch",
				"total_updated": 0,
			}

		# Use bulk refresh function
		from clapgrow_app.clapgrow_app.doctype.cg_employee_holiday_list.cg_employee_holiday_list import (
			bulk_refresh_employee_holidays,
		)

		result = bulk_refresh_employee_holidays(employees=employees)

		return result

	except Exception as e:
		return {"success": False, "message": str(e)}


@frappe.whitelist(allow_guest=False)
def force_sync_holiday_changes(holiday_name=None):
	"""Force immediate sync of holiday changes to all affected employees."""
	try:
		if holiday_name:
			# Sync specific holiday
			if not frappe.db.exists("CG Holiday", holiday_name):
				return {"success": False, "message": "Holiday not found"}

			holiday_doc = frappe.get_doc("CG Holiday", holiday_name)

			# Clear caches
			holiday_doc.invalidate_holiday_caches()

			# Force immediate employee sync
			holiday_doc.queue_immediate_employee_sync()

			return {
				"success": True,
				"message": f"Forced sync initiated for holiday: {holiday_doc.holiday_name}",
			}
		else:
			# Sync all active holidays
			active_holidays = frappe.get_all("CG Holiday", filters={"is_active": 1}, pluck="name")

			if not active_holidays:
				return {"success": True, "message": "No active holidays found"}

			sync_count = 0
			for holiday_name in active_holidays:
				try:
					holiday_doc = frappe.get_doc("CG Holiday", holiday_name)
					holiday_doc.invalidate_holiday_caches()
					holiday_doc.queue_immediate_employee_sync()
					sync_count += 1
				except Exception:
					continue

			return {
				"success": True,
				"message": f"Forced sync initiated for {sync_count} holidays",
			}

	except Exception as e:
		return {"success": False, "message": str(e)}


@frappe.whitelist(allow_guest=False)
def invalidate_holiday_caches(holiday_name=None, branch_id=None, employee=None):
	"""Enhanced cache invalidation with pattern matching."""
	try:
		cache_patterns = []
		cleared_count = 0

		if holiday_name:
			cache_patterns.extend([f"holiday_{holiday_name}_dates_*", f"holiday_{holiday_name}_*"])

		if branch_id:
			cache_patterns.append(f"branch_holidays_{branch_id}_*")
			# Also clear employee caches for this branch
			employees = frappe.get_all("CG User", filters={"branch_id": branch_id}, pluck="name")
			for emp in employees:
				cache_patterns.append(f"employee_holidays_{emp}_*")

		if employee:
			cache_patterns.append(f"employee_holidays_{employee}_*")

		if not cache_patterns:
			# Clear all holiday-related caches
			cache_patterns = [
				"employee_holidays_*",
				"holiday_*",
				"branch_holidays_*",
				"holiday_calendar_*",
			]

		# Clear caches with pattern matching
		for pattern in cache_patterns:
			cleared_count += len(frappe.cache().delete_keys(pattern))

		return {
			"success": True,
			"message": f"Cleared {cleared_count} cache entries",
			"patterns_cleared": cache_patterns,
			"cleared_count": cleared_count,
		}

	except Exception as e:
		return {"success": False, "message": str(e)}


@frappe.whitelist(allow_guest=False)
def get_holiday_summary(employee=None):
	"""Get comprehensive holiday summary for an employee."""
	try:
		employee_id = frappe.form_dict.get("employee_id")

		if not employee and not employee_id:
			user_email = frappe.session.user
			employee = frappe.db.get_value("CG User", {"email": user_email}, "name")
		elif employee_id:
			employee = frappe.db.get_value("CG User", {"email": employee_id}, "name")

		if not employee:
			return {"success": False, "message": "Employee not found"}

		current_year = datetime.now().year
		from_date = datetime(current_year, 1, 1).date()
		to_date = datetime(current_year, 12, 31).date()

		# Get holidays
		from clapgrow_app.clapgrow_app.doctype.cg_employee_holiday_list.cg_employee_holiday_list import (
			get_employee_holidays,
		)

		holidays = get_employee_holidays(employee, from_date, to_date)

		# Calculate summary statistics
		total_holidays = len(holidays)
		mandatory_holidays = len([h for h in holidays if not h.get("is_optional", False)])
		optional_holidays = len([h for h in holidays if h.get("is_optional", False)])

		# Group by source
		by_source = {}
		for holiday in holidays:
			source = holiday.get("source", "Unknown")
			by_source[source] = by_source.get(source, 0) + 1

		# Group by type
		by_type = {}
		for holiday in holidays:
			holiday_type = holiday.get("type", "Unknown")
			by_type[holiday_type] = by_type.get(holiday_type, 0) + 1

		# Upcoming holidays (next 30 days)
		today = datetime.now().date()
		next_month = today + timedelta(days=30)
		upcoming = [h for h in holidays if today <= getdate(h["date"]) <= next_month]

		return {
			"success": True,
			"employee": employee,
			"year": current_year,
			"summary": {
				"total_holidays": total_holidays,
				"mandatory_holidays": mandatory_holidays,
				"optional_holidays": optional_holidays,
				"by_source": by_source,
				"by_type": by_type,
				"upcoming_count": len(upcoming),
			},
			"upcoming_holidays": upcoming[:5],  # Next 5 upcoming holidays
			"last_updated": str(datetime.now()),
		}

	except Exception as e:
		return {"success": False, "message": str(e)}


# Enhanced scheduler function for automatic refresh
@frappe.whitelist()
def refresh_all_holiday_lists():
	"""Enhanced scheduled function with optimized processing."""
	try:
		# Only refresh lists that need updating (older than 2 hours or auto_refresh enabled)
		two_hours_ago = datetime.now() - timedelta(hours=2)

		# Process in smaller batches to avoid timeouts
		batch_size = 50
		total_processed = 0
		total_updated = 0
		total_errors = 0

		# Import here to avoid circular dependency
		from clapgrow_app.clapgrow_app.doctype.cg_employee_holiday_list.cg_employee_holiday_list import (
			bulk_refresh_employee_holidays,
		)

		while True:
			stale_lists = frappe.get_all(
				"CG Employee Holiday List",
				filters=[["last_refreshed", "<", two_hours_ago], ["auto_refresh", "=", 1]],
				fields=["name", "employee"],
				limit=batch_size,
			)

			if not stale_lists:
				break

			employees = [item["employee"] for item in stale_lists]
			result = bulk_refresh_employee_holidays(employees=employees)

			if result.get("success"):
				total_updated += result.get("total_processed", 0)
				total_errors += result.get("errors", 0)

			total_processed += len(employees)

			# Break if we got less than batch size (no more records)
			if len(stale_lists) < batch_size:
				break

		if total_processed == 0:
			return {"success": True, "message": "No lists require refresh"}

		return {
			"success": True,
			"message": f"Processed {total_processed} employee lists",
			"total_processed": total_processed,
			"updated": total_updated,
			"errors": total_errors,
		}

	except Exception as e:
		frappe.log_error(f"Error in refresh_all_holiday_lists: {str(e)}")
		return {"success": False, "message": str(e)}

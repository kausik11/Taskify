# cg_holiday_api.py
# Copyright (c) 2025, Clapgrow and contributors
# For license information, please see license.txt

from datetime import datetime
from typing import Optional, Union

import frappe
from frappe import _
from frappe.utils import add_days, getdate


class CGHolidayAPI:
	"""
	Consolidated Holiday API for efficient holiday management and calendar rendering.
	"""

	@staticmethod
	@frappe.whitelist()
	def get_employee_holidays(
		employee_id: str,
		start_date: str | None = None,
		end_date: str | None = None,
		include_optional: bool = True,
		include_inactive: bool = False,
	) -> dict:
		"""
		Get consolidated holidays for a specific employee from all sources.
		"""
		try:
			# Validate and set default dates
			start_date = getdate(start_date) if start_date else datetime.now().date()
			end_date = getdate(end_date) if end_date else add_days(start_date, 365)

			# Validate date range
			if end_date < start_date:
				frappe.throw(_("End date cannot be before start date"))

			# Get employee details
			employee_data = CGHolidayAPI._get_employee_details(employee_id)
			if not employee_data:
				return {
					"success": False,
					"error": "Employee not found",
					"holidays": [],
					"summary": {},
				}

			# Get holidays from branch & employee-specific
			branch_holidays = CGHolidayAPI._get_branch_holidays(
				employee_data["branch_id"],
				start_date,
				end_date,
				include_optional,
				include_inactive,
			)

			employee_holidays = CGHolidayAPI._get_specific_employee_holidays(
				employee_id,
				employee_data["branch_id"],
				start_date,
				end_date,
				include_optional,
				include_inactive,
			)

			# Consolidate and deduplicate
			consolidated_holidays = CGHolidayAPI._consolidate_holidays([*branch_holidays, *employee_holidays])

			# Summary
			summary = CGHolidayAPI._generate_holiday_summary(consolidated_holidays, start_date, end_date)

			return {
				"success": True,
				"employee": {
					"id": employee_id,
					"name": employee_data["employee_name"],
					"branch": employee_data["branch_name"],
					"department": employee_data.get("department_name", "No Department"),
				},
				"date_range": {
					"start_date": start_date.isoformat(),
					"end_date": end_date.isoformat(),
				},
				"holidays": consolidated_holidays,
				"summary": summary,
			}

		except Exception as e:
			frappe.log_error(f"Error in get_employee_holidays: {str(e)}")
			return {"success": False, "error": str(e), "holidays": [], "summary": {}}

	@staticmethod
	def _get_employee_details(employee_id: str) -> dict | None:
		"""Get employee details including branch and department."""
		employee = frappe.db.get_value(
			"CG User",
			employee_id,
			["name", "employee_name", "branch_id", "department_id"],
			as_dict=True,
		)
		if not employee:
			return None

		branch_name = frappe.db.get_value("CG Branch", employee["branch_id"], "branch_name")
		department_name = (
			frappe.db.get_value("CG Department", employee["department_id"], "department_name")
			if employee.get("department_id")
			else "No Department"
		)

		return {
			**employee,
			"branch_name": branch_name,
			"department_name": department_name,
		}

	@staticmethod
	def _get_branch_holidays(
		branch_id: str,
		start_date,
		end_date,
		include_optional: bool,
		include_inactive: bool,
	) -> list[dict]:
		"""Get holidays applicable to entire branch."""
		# Check if branch has holidays enabled (with cache)
		enable_holidays = frappe.db.get_value("CG Branch", branch_id, "enable_holidays")
		if not enable_holidays:
			return []

		filters = {"branch_id": branch_id, "applicable_for": "All Employees"}
		if not include_inactive:
			filters["is_active"] = 1

		holidays = frappe.get_all(
			"CG Holiday",
			filters=filters,
			fields=[
				"name",
				"holiday_name",
				"holiday_type",
				"is_recurring",
				"holiday_date",
				"color",
				"is_optional",
				"description",
				"start_date",
				"end_date",
				"auto_generated",
			],
		)

		holiday_dates = []
		for holiday in holidays:
			if not include_optional and holiday["is_optional"]:
				continue

			try:
				holiday_doc = frappe.get_doc("CG Holiday", holiday["name"])
				dates = holiday_doc.get_holiday_dates_for_range(start_date, end_date)
			except Exception as e:
				frappe.log_error(f"Error loading holiday {holiday['name']}: {str(e)}")
				continue

			for date_info in dates:
				holiday_dates.append(
					{
						**date_info,
						"source": "Branch",
						"source_id": branch_id,
						"holiday_id": holiday["name"],
						"description": holiday.get("description"),
						"auto_generated": holiday.get("auto_generated"),
						"priority": 1,
						"holiday_type": holiday.get("holiday_type"),
						"holiday_name": holiday.get("holiday_name"),
						"is_optional": holiday.get("is_optional"),
					}
				)
		return holiday_dates

	@staticmethod
	def _get_specific_employee_holidays(
		employee_id: str,
		branch_id: str,
		start_date,
		end_date,
		include_optional: bool,
		include_inactive: bool,
	) -> list[dict]:
		"""Get holidays specific to individual employee."""
		employee_holidays = frappe.db.sql(
			"""
            SELECT DISTINCT h.name, h.holiday_name, h.holiday_type, h.is_recurring,
                   h.holiday_date, h.color, h.is_optional, h.description,
                   h.start_date, h.end_date, h.auto_generated
            FROM `tabCG Holiday` h
            INNER JOIN `tabCG Holiday Employee` he ON he.parent = h.name
            WHERE h.branch_id = %(branch_id)s
                AND h.applicable_for = 'Specific Employees'
                AND he.employee = %(employee_id)s
                {active_filter}
        """.format(active_filter="AND h.is_active = 1" if not include_inactive else ""),
			{"branch_id": branch_id, "employee_id": employee_id},
			as_dict=True,
		)

		holiday_dates = []
		for holiday in employee_holidays:
			if not include_optional and holiday["is_optional"]:
				continue

			try:
				holiday_doc = frappe.get_doc("CG Holiday", holiday["name"])
				dates = holiday_doc.get_holiday_dates_for_range(start_date, end_date)
			except Exception as e:
				frappe.log_error(f"Error loading employee holiday {holiday['name']}: {str(e)}")
				continue

			for date_info in dates:
				holiday_dates.append(
					{
						**date_info,
						"source": "Employee",
						"source_id": employee_id,
						"holiday_id": holiday["name"],
						"description": holiday.get("description"),
						"auto_generated": holiday.get("auto_generated"),
						"priority": 3,
						"holiday_type": holiday.get("holiday_type"),
						"holiday_name": holiday.get("holiday_name"),
						"is_optional": holiday.get("is_optional"),
					}
				)
		return holiday_dates

	@staticmethod
	def _consolidate_holidays(all_holidays: list[dict]) -> list[dict]:
		"""Consolidate and deduplicate holidays based on date."""
		holiday_by_date = {}
		for holiday in all_holidays:
			date_key = (
				holiday["date"].isoformat() if hasattr(holiday["date"], "isoformat") else str(holiday["date"])
			)
			if date_key not in holiday_by_date:
				holiday_by_date[date_key] = holiday
			else:
				existing_priority = holiday_by_date[date_key]["priority"]
				current_priority = holiday["priority"]
				if current_priority > existing_priority:
					holiday_by_date[date_key] = holiday
				elif current_priority == existing_priority:
					existing_name = holiday_by_date[date_key].get("holiday_name", "")
					current_name = holiday.get("holiday_name", "")
					if existing_name and current_name and existing_name != current_name:
						holiday_by_date[date_key]["holiday_name"] = f"{existing_name}, {current_name}"

		consolidated = list(holiday_by_date.values())
		consolidated.sort(key=lambda x: x["date"])
		return consolidated

	@staticmethod
	def _generate_holiday_summary(holidays: list[dict], start_date, end_date) -> dict:
		"""Generate summary statistics for holidays."""
		total_holidays = len(holidays)
		optional_holidays = sum(1 for h in holidays if h.get("is_optional"))
		mandatory_holidays = total_holidays - optional_holidays

		type_counts = {}
		source_counts = {"Branch": 0, "Employee": 0}

		for holiday in holidays:
			holiday_type = holiday.get("holiday_type", "Unknown")
			type_counts[holiday_type] = type_counts.get(holiday_type, 0) + 1

			source = holiday.get("source", "Unknown")
			if source in source_counts:
				source_counts[source] += 1

		return {
			"total_holidays": total_holidays,
			"mandatory_holidays": mandatory_holidays,
			"optional_holidays": optional_holidays,
			"date_range_days": (end_date - start_date).days + 1,
			"holiday_percentage": round((total_holidays / ((end_date - start_date).days + 1)) * 100, 2),
			"by_type": type_counts,
			"by_source": source_counts,
		}

	@staticmethod
	@frappe.whitelist()
	def get_team_holidays(
		team_members: str | list[str],
		start_date: str | None = None,
		end_date: str | None = None,
		include_optional: bool = True,
	) -> dict:
		"""Get consolidated holidays for a team of employees."""
		try:
			if isinstance(team_members, str):
				team_members = frappe.parse_json(team_members)

			team_holidays = {}
			common_holidays = []

			for employee_id in team_members:
				employee_data = CGHolidayAPI.get_employee_holidays(
					employee_id, start_date, end_date, include_optional
				)
				if employee_data.get("success"):
					team_holidays[employee_id] = employee_data

			if team_holidays:
				first_member = list(team_holidays.values())[0]
				common_holiday_dates = {h["date"] for h in first_member["holidays"]}

				for member_data in list(team_holidays.values())[1:]:
					member_dates = {h["date"] for h in member_data["holidays"]}
					common_holiday_dates &= member_dates

				for date in common_holiday_dates:
					holiday_info = next(h for h in first_member["holidays"] if h["date"] == date)
					common_holidays.append(holiday_info)

			return {
				"success": True,
				"team_holidays": team_holidays,
				"common_holidays": sorted(common_holidays, key=lambda x: x["date"]),
				"team_size": len(team_members),
			}

		except Exception as e:
			frappe.log_error(f"Error in get_team_holidays: {str(e)}")
			return {"success": False, "error": str(e)}

	@staticmethod
	@frappe.whitelist()
	def get_branch_calendar_data(
		branch_id: str, start_date: str | None = None, end_date: str | None = None
	) -> dict:
		"""Get calendar data optimized for branch-level holiday calendar rendering."""
		try:
			start_date = getdate(start_date) if start_date else datetime.now().date()
			end_date = getdate(end_date) if end_date else add_days(start_date, 365)

			branch = frappe.get_doc("CG Branch", branch_id)
			holidays = branch.get_branch_holidays(start_date, end_date)

			calendar_events = []
			for holiday in holidays:
				calendar_events.append(
					{
						"id": f"holiday_{holiday['date']}",
						"title": holiday.get("holiday_name", holiday.get("name", "")),
						"date": holiday["date"],
						"backgroundColor": holiday.get("color", "#3B82F6"),
						"borderColor": holiday.get("color", "#3B82F6"),
						"textColor": "#FFFFFF",
						"allDay": True,
						"extendedProps": {
							"type": holiday.get("holiday_type"),
							"isOptional": holiday.get("is_optional", False),
							"description": holiday.get("description", ""),
							"day": holiday.get("day"),
						},
					}
				)

			return {
				"success": True,
				"branch": {
					"id": branch_id,
					"name": branch.branch_name,
					"timeline": getattr(branch, "timeline", None),
					"work_duration": getattr(branch, "work_duration", None),
				},
				"events": calendar_events,
				"summary": {
					"total_holidays": len(calendar_events),
					"date_range": {
						"start": start_date.isoformat(),
						"end": end_date.isoformat(),
					},
				},
			}

		except Exception as e:
			return {"success": False, "error": str(e)}

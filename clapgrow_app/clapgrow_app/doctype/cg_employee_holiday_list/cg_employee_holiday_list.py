# cg_employee_holiday_list.py - Fixed version with smart duplicate handling

from datetime import datetime, timedelta

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import add_days, getdate


class CGEmployeeHolidayList(Document):
	def validate(self):
		"""Enhanced validation with improved duplicate prevention and API operation handling."""
		if getdate(self.to_date) < getdate(self.from_date):
			frappe.throw(_("To Date cannot be before From Date"))

		if not self.employee:
			frappe.throw(_("Employee is required"))

		# Check if this is an API operation that should skip duplicate validation
		skip_validation = (
			getattr(frappe.local, "skip_duplicate_validation", False)
			or self.flags.get("ignore_duplicate_validation", False)
			or getattr(self, "_skip_duplicate_validation", False)
		)

		# Only validate duplicates for manual creation, not API operations
		if not skip_validation:
			self.validate_no_duplicates()

		# Set employee details
		self.set_employee_details()

		# Only auto-generate holidays on creation, not on every update
		# to avoid unnecessary Version documents when there are no changes.
		if self.is_new():
			self.generate_consolidated_holidays()

	def validate_no_duplicates(self):
		"""Enhanced duplicate validation with better error handling."""
		# Skip validation during bulk operations or if explicitly requested
		if getattr(self.flags, "bulk_operation", False) or getattr(
			frappe.local, "skip_duplicate_validation", False
		):
			return
		# More specific duplicate check
		filters = {
			"employee": self.employee,
			"from_date": self.from_date,
			"to_date": self.to_date,
		}

		if not self.is_new():
			filters["name"] = ["!=", self.name]

		existing = frappe.get_all(
			"CG Employee Holiday List",
			filters=filters,
			fields=["name", "from_date", "to_date"],
			limit=1,
		)

		if existing:
			existing_doc = existing[0]

			# Check if this is exactly the same document being updated
			if self.name and existing_doc["name"] == self.name:
				return

			# During bulk operations, try to clean up the conflict automatically
			if getattr(self.flags, "bulk_operation", False):
				try:
					frappe.delete_doc(
						"CG Employee Holiday List", existing_doc["name"], ignore_permissions=True, force=True
					)
					frappe.db.commit()
					frappe.log_error(
						f"Auto-deleted conflicting document {existing_doc['name']} during bulk operation",
						"Duplicate Resolution",
					)
					return
				except Exception as e:
					frappe.log_error(
						f"Could not auto-delete conflicting document {existing_doc['name']}: {str(e)}",
						"Duplicate Resolution Failed",
					)

			# Provide more informative error message
			error_msg = _(
				"Holiday list already exists for employee {0} covering period {1} to {2}. "
				"Document: {3}. Please use the existing document or modify the date range."
			).format(
				self.employee,
				existing_doc["from_date"],
				existing_doc["to_date"],
				existing_doc["name"],
			)

			frappe.throw(error_msg, title=_("Duplicate Holiday List"))

	def set_employee_details(self):
		"""Set employee name, branch, and department from CG User."""
		if self.employee:
			employee_doc = frappe.get_doc("CG User", self.employee)
			self.employee_name = employee_doc.full_name
			self.branch_id = employee_doc.branch_id
			self.department_id = employee_doc.department_id
			self.company_id = employee_doc.company_id

	def generate_consolidated_holidays(self):
		"""Enhanced holiday generation including recurring holiday dates."""
		# Clear existing holidays
		self.holidays = []

		# Get date range
		start_date = getdate(self.from_date) if self.from_date else datetime.now().date()
		end_date = getdate(self.to_date) if self.to_date else add_days(start_date, 365)

		# Dictionary to store unique holidays (using date as key to avoid duplicates)
		holiday_dict = {}

		# 1. Get branch holidays (including both regular and recurring)
		if self.branch_id:
			branch_holidays = self.get_enhanced_branch_holidays(start_date, end_date)
			for holiday in branch_holidays:
				date_key = str(holiday["date"])
				if date_key not in holiday_dict:
					holiday_dict[date_key] = holiday

		# 2. Get employee-specific holidays (including recurring)
		employee_holidays = self.get_enhanced_employee_holidays(start_date, end_date)
		for holiday in employee_holidays:
			date_key = str(holiday["date"])
			if date_key not in holiday_dict:
				holiday_dict[date_key] = holiday

		# Convert dictionary back to list and sort by date
		all_holidays = list(holiday_dict.values())
		all_holidays.sort(key=lambda x: x["date"])

		# Add holidays to child table
		for holiday_info in all_holidays:
			# Truncate fields to prevent character limit issues
			holiday_name = holiday_info["name"]
			if len(holiday_name) > 140:
				holiday_name = holiday_name[:140]

			holiday_type = holiday_info["type"]
			if len(holiday_type) > 140:
				holiday_type = holiday_type[:140]

			source = holiday_info.get("source", "Branch")
			if len(source) > 140:
				source = source[:140]

			day_name = getdate(holiday_info["date"]).strftime("%A")
			if len(day_name) > 140:
				day_name = day_name[:140]

			self.append(
				"holidays",
				{
					"holiday_date": holiday_info["date"],
					"holiday_name": holiday_name,
					"holiday_type": holiday_type,
					"source": source,
					"is_optional": holiday_info.get("is_optional", 0),
					"color": holiday_info.get("color", "#EF4444"),
					"day_name": day_name,
				},
			)

		# Update statistics
		self.total_holidays = len(self.holidays)
		self.mandatory_holidays = len([h for h in self.holidays if not h.is_optional])
		self.optional_holidays = len([h for h in self.holidays if h.is_optional])

		# Update last refreshed timestamp
		self.last_refreshed = datetime.now()

	def _normalize_holiday_rows(self, rows):
		"""Return a normalized, sorted list of holiday dicts for stable comparison."""
		normalized = []
		for r in rows:
			normalized.append(
				{
					"holiday_date": str(getdate(r.get("holiday_date"))),
					"holiday_name": (r.get("holiday_name") or "")[:140],
					"holiday_type": (r.get("holiday_type") or "")[:140],
					"source": (r.get("source") or "")[:140],
					"is_optional": 1 if r.get("is_optional") else 0,
					"color": r.get("color") or "#EF4444",
					"day_name": (r.get("day_name") or "")[:140],
				}
			)
		# Sort by date then name for deterministic ordering
		return sorted(normalized, key=lambda x: (x["holiday_date"], x["holiday_name"]))

	def _current_holiday_rows(self):
		rows = []
		for h in self.holidays or []:
			rows.append(
				{
					"holiday_date": str(getdate(h.holiday_date)) if h.holiday_date else None,
					"holiday_name": h.holiday_name,
					"holiday_type": h.holiday_type,
					"source": h.source,
					"is_optional": 1 if h.is_optional else 0,
					"color": h.color,
					"day_name": h.day_name,
				}
			)
		return self._normalize_holiday_rows(rows)

	def compute_consolidated_holidays(self):
		"""Compute consolidated holidays (without mutating the document)."""
		# Build the same list as generate_consolidated_holidays but return rows
		start_date = getdate(self.from_date) if self.from_date else datetime.now().date()
		end_date = getdate(self.to_date) if self.to_date else add_days(start_date, 365)

		holiday_dict = {}

		if self.branch_id:
			for holiday in self.get_enhanced_branch_holidays(start_date, end_date):
				date_key = str(holiday["date"])
				if date_key not in holiday_dict:
					holiday_dict[date_key] = holiday

		for holiday in self.get_enhanced_employee_holidays(start_date, end_date):
			date_key = str(holiday["date"])
			if date_key not in holiday_dict:
				holiday_dict[date_key] = holiday

		all_holidays = list(holiday_dict.values())
		all_holidays.sort(key=lambda x: x["date"])

		rows = []
		for holiday_info in all_holidays:
			holiday_name = holiday_info["name"]
			if len(holiday_name) > 140:
				holiday_name = holiday_name[:140]
			holiday_type = holiday_info["type"]
			if len(holiday_type) > 140:
				holiday_type = holiday_type[:140]
			source = holiday_info.get("source", "Branch")
			if len(source) > 140:
				source = source[:140]
			day_name = getdate(holiday_info["date"]).strftime("%A")
			if len(day_name) > 140:
				day_name = day_name[:140]
			rows.append(
				{
					"holiday_date": str(holiday_info["date"]),
					"holiday_name": holiday_name,
					"holiday_type": holiday_type,
					"source": source,
					"is_optional": 1 if holiday_info.get("is_optional", 0) else 0,
					"color": holiday_info.get("color", "#EF4444"),
					"day_name": day_name,
				}
			)

		return self._normalize_holiday_rows(rows)

	def update_holidays_if_changed(self):
		"""Regenerate holidays and save only if there is any actual add/remove/change.

		Returns True if a save was performed; False if no changes detected.
		"""
		new_rows = self.compute_consolidated_holidays()
		old_rows = self._current_holiday_rows()

		if (
			new_rows == old_rows
			and self.total_holidays == len(old_rows)
			and self.mandatory_holidays == len([r for r in old_rows if not r.get("is_optional")])
			and self.optional_holidays == len([r for r in old_rows if r.get("is_optional")])
		):
			# No change in data; do not save to avoid creating Version entries
			return False

		# Replace child table
		self.holidays = []
		for r in new_rows:
			self.append("holidays", r)

		# Update stats and timestamp
		self.total_holidays = len(new_rows)
		self.mandatory_holidays = len([r for r in new_rows if not r.get("is_optional")])
		self.optional_holidays = len([r for r in new_rows if r.get("is_optional")])
		self.last_refreshed = datetime.now()

		self.flags.ignore_permissions = True
		self.save()
		return True

	def get_enhanced_branch_holidays(self, start_date, end_date):
		"""Get all holidays from branch including properly generated recurring dates."""
		if not self.branch_id:
			return []

		holidays = []

		# Get all active holidays for this branch
		branch_holidays = frappe.get_all(
			"CG Holiday",
			filters={
				"branch_id": self.branch_id,
				"is_active": 1,
				"applicable_for": ["in", ["All Employees"]],
			},
			fields=[
				"name",
				"holiday_name",
				"holiday_type",
				"is_recurring",
				"color",
				"is_optional",
			],
		)

		for holiday_record in branch_holidays:
			try:
				holiday_doc = frappe.get_doc("CG Holiday", holiday_record.name)
				holiday_dates = holiday_doc.get_holiday_dates_for_range(start_date, end_date)

				for date_info in holiday_dates:
					date_info["source"] = "Branch"
					holidays.append(date_info)

			except Exception as e:
				frappe.log_error(f"Error processing branch holiday {holiday_record.name}: {str(e)}")
				continue

		return holidays

	def get_enhanced_employee_holidays(self, start_date, end_date):
		"""Get holidays specific to this employee including recurring ones."""
		holidays = []

		# Get holidays where this employee is specifically mentioned
		emp_holidays = frappe.get_all(
			"CG Holiday",
			filters={"is_active": 1, "applicable_for": "Specific Employees"},
			fields=["name"],
		)

		for holiday_record in emp_holidays:
			try:
				holiday_doc = frappe.get_doc("CG Holiday", holiday_record.name)

				# Check if this employee is in the holiday's employee list
				emp_found = False
				for emp in holiday_doc.employees:
					if emp.employee == self.employee:
						emp_found = True
						break

				if emp_found:
					# Get holiday dates for the range (works for both recurring and single)
					holiday_dates = holiday_doc.get_holiday_dates_for_range(start_date, end_date)
					for date_info in holiday_dates:
						date_info["source"] = "Personal"
						holidays.append(date_info)

			except Exception as e:
				frappe.log_error(f"Error processing employee holiday {holiday_record.name}: {str(e)}")
				continue

		return holidays

	@frappe.whitelist()
	def refresh_holidays(self):
		"""Manually refresh the holiday list with cache clearing."""
		# Clear relevant caches
		frappe.cache().delete_keys(f"employee_holidays_{self.employee}_*")

		changed = self.update_holidays_if_changed()

		return {
			"message": "Holiday list refreshed successfully" if changed else "No changes in holidays",
			"total_holidays": self.total_holidays,
			"mandatory_holidays": self.mandatory_holidays,
			"optional_holidays": self.optional_holidays,
		}


@frappe.whitelist()
def get_employee_holidays(employee, from_date=None, to_date=None, create_if_missing=True):
	"""Enhanced function with improved duplicate handling and existing list detection."""
	# Normalize dates for consistent caching
	if not from_date:
		from_date = datetime.now().date()
	if not to_date:
		to_date = add_days(from_date, 365)

	# Convert to date objects if strings for consistent cache keys
	from_date = getdate(from_date)
	to_date = getdate(to_date)

	cache_key = f"employee_holidays_{employee}_{from_date}_{to_date}"
	cached = frappe.cache().get_value(cache_key)
	if cached:
		return cached

	# First, try to find an existing list that covers the requested date range
	# Updated query to handle exact matches better
	existing_list = frappe.db.sql(
		"""
		SELECT name, from_date, to_date
		FROM `tabCG Employee Holiday List`
		WHERE employee = %s
		AND (
			(from_date <= %s AND to_date >= %s)
			OR (from_date = %s AND to_date = %s)
		)
		ORDER BY
			CASE
				WHEN from_date = %s AND to_date = %s THEN 1
				ELSE 2
			END,
			(to_date - from_date) ASC
		LIMIT 1
		""",
		(employee, from_date, to_date, from_date, to_date, from_date, to_date),
		as_dict=True,
	)

	if existing_list:
		# Use existing list that covers the requested range
		holiday_list = frappe.get_doc("CG Employee Holiday List", existing_list[0].name)

		# Check if list needs refresh (older than 1 hour or auto_refresh enabled)
		needs_refresh = (
			not holiday_list.last_refreshed
			or holiday_list.last_refreshed < datetime.now() - timedelta(hours=1)
			or holiday_list.auto_refresh
		)

		if needs_refresh:
			holiday_list.update_holidays_if_changed()

	elif create_if_missing:
		# Check one more time before creating to prevent race conditions
		final_check = frappe.db.get_value(
			"CG Employee Holiday List",
			{"employee": employee, "from_date": from_date, "to_date": to_date},
			"name",
		)

		if final_check:
			# Document was created by another process, use it
			holiday_list = frappe.get_doc("CG Employee Holiday List", final_check)
		else:
			# Create new list only if no existing list covers the range
			try:
				# Set flag to skip duplicate validation for API operations
				frappe.local.skip_duplicate_validation = True

				holiday_list = frappe.new_doc("CG Employee Holiday List")
				holiday_list.employee = employee
				holiday_list.from_date = from_date
				holiday_list.to_date = to_date
				holiday_list.flags.ignore_permissions = True
				holiday_list.flags.ignore_validate = False  # We still want other validations

				# Use db transaction to ensure atomicity
				frappe.db.begin()
				try:
					holiday_list.insert()
					frappe.db.commit()
				except frappe.DuplicateEntryError:
					frappe.db.rollback()
					# If duplicate entry error, fetch the existing document
					existing_name = frappe.db.get_value(
						"CG Employee Holiday List",
						{
							"employee": employee,
							"from_date": from_date,
							"to_date": to_date,
						},
						"name",
					)
					if existing_name:
						holiday_list = frappe.get_doc("CG Employee Holiday List", existing_name)
					else:
						raise
				except Exception:
					frappe.db.rollback()
					raise

			finally:
				# Always reset the flag
				if hasattr(frappe.local, "skip_duplicate_validation"):
					delattr(frappe.local, "skip_duplicate_validation")
	else:
		return []

	# Filter holidays to the requested date range and return
	holidays = []
	for holiday in holiday_list.holidays:
		holiday_date = getdate(holiday.holiday_date)
		if from_date <= holiday_date <= to_date:
			holidays.append(
				{
					"date": str(holiday.holiday_date),
					"holiday_name": holiday.holiday_name,
					"name": holiday.holiday_name,  # For calendar compatibility
					"holiday_type": holiday.holiday_type,
					"type": holiday.holiday_type,  # For calendar compatibility
					"source": holiday.source,
					"is_optional": holiday.is_optional,
					"color": holiday.color,
					"day_name": holiday.day_name,
					"day": holiday.day_name,  # For calendar compatibility
				}
			)

	# Cache for 30 minutes
	frappe.cache().set_value(cache_key, holidays, expires_in_sec=1800)
	return holidays


@frappe.whitelist()
def bulk_refresh_employee_holidays(employees=None, branch_id=None):
	"""Bulk refresh employee holiday lists.

	Note: This function clears realtime event logs before each commit to prevent
	Redis publish timeouts during bulk operations. Realtime UI updates are not
	necessary for background bulk jobs.
	"""
	try:
		if not employees and branch_id:
			employees = frappe.get_all(
				"CG User", filters={"branch_id": branch_id, "enabled": 1}, pluck="name"
			)

		if not employees:
			return {"success": False, "message": "No employees specified"}

		current_year = datetime.now().year
		from_date = datetime(current_year, 1, 1).date()
		to_date = datetime(current_year, 12, 31).date()

		updated_count = 0
		created_count = 0
		error_count = 0

		# Process in smaller batches to avoid timeouts
		batch_size = 10
		for i in range(0, len(employees), batch_size):
			batch = employees[i : i + batch_size]

			# Get existing lists for this batch that cover the current year
			existing_lists = frappe.db.sql(
				"""
                SELECT name, employee, from_date, to_date, creation
                FROM `tabCG Employee Holiday List`
                WHERE employee IN ({})
                AND from_date <= %s
                AND to_date >= %s
                ORDER BY employee, creation DESC
            """.format(",".join(["%s"] * len(batch))),
				batch + [from_date, to_date],
				as_dict=True,
			)

			# Group by employee and detect duplicates
			employee_lists = {}
			for item in existing_lists:
				emp = item["employee"]
				if emp not in employee_lists:
					employee_lists[emp] = []
				employee_lists[emp].append(item)

			# Clean up duplicates: keep the most recent one, delete others
			existing_dict = {}
			deleted_docs = []
			for emp, lists in employee_lists.items():
				if len(lists) > 1:
					# Multiple entries found - keep the first (most recent due to ORDER BY creation DESC)
					existing_dict[emp] = lists[0]["name"]
					# Delete the duplicates
					for duplicate in lists[1:]:
						try:
							frappe.delete_doc(
								"CG Employee Holiday List",
								duplicate["name"],
								ignore_permissions=True,
								force=True,
							)
							deleted_docs.append(duplicate["name"])
							frappe.log_error(
								f"Deleted duplicate holiday list {duplicate['name']} for employee {emp}",
								"Duplicate Cleanup",
							)
						except Exception as del_error:
							frappe.log_error(
								f"Could not delete duplicate {duplicate['name']}: {str(del_error)}",
								"Duplicate Cleanup Failed",
							)
				elif len(lists) == 1:
					existing_dict[emp] = lists[0]["name"]
			# Commit the deletions to database immediately
			if deleted_docs:
				frappe.db.commit()
				frappe.log_error(
					f"Committed deletion of {len(deleted_docs)} duplicate documents", "Bulk Cleanup"
				)

			for employee in batch:
				try:
					if employee in existing_dict:
						# Update existing only if there are changes
						holiday_list = frappe.get_doc("CG Employee Holiday List", existing_dict[employee])
						holiday_list.flags.bulk_operation = True  # Flag to indicate bulk operation
						_ = holiday_list.update_holidays_if_changed()
						updated_count += 1
					else:
						# Create new
						frappe.local.skip_duplicate_validation = True
						holiday_list = frappe.new_doc("CG Employee Holiday List")
						holiday_list.employee = employee
						holiday_list.from_date = from_date
						holiday_list.to_date = to_date
						holiday_list.flags.ignore_permissions = True
						holiday_list.flags.bulk_operation = True  # Flag to indicate bulk operation
						holiday_list.insert()
						created_count += 1
						frappe.local.skip_duplicate_validation = False

					# Clear employee cache
					frappe.cache().delete_keys(f"employee_holidays_{employee}_*")

				except Exception as e:
					error_count += 1
					frappe.log_error(f"Error processing employee {employee}: {str(e)}")
					continue

			# Clear realtime log to prevent Redis timeout during bulk operations
			# Realtime UI updates are not needed for background bulk jobs
			if hasattr(frappe.local, "_realtime_log"):
				frappe.local._realtime_log = []

			# Commit each batch
			frappe.db.commit()

		return {
			"success": True,
			"message": f"Processed {len(employees)} employees",
			"updated": updated_count,
			"created": created_count,
			"errors": error_count,
			"total_processed": updated_count + created_count,
		}

	except Exception as e:
		frappe.log_error(f"Error in bulk refresh: {str(e)}")
		frappe.db.rollback()
		return {"success": False, "message": str(e)}


@frappe.whitelist()
def get_current_user_holidays(from_date=None, to_date=None):
	"""Get holidays for the currently logged-in user with enhanced caching."""
	# Get current user's email
	user_email = frappe.session.user

	# Get CG User record for current user
	cg_user = frappe.db.get_value("CG User", {"email": user_email}, "name")

	if not cg_user:
		return []

	return get_employee_holidays(cg_user, from_date, to_date)

import calendar
from datetime import datetime, timedelta

import frappe
from dateutil.relativedelta import relativedelta
from frappe import _
from frappe.model.document import Document
from frappe.utils import add_days, cint, getdate, nowdate
from frappe.utils.background_jobs import enqueue


class CGHoliday(Document):
	def validate(self):
		self.validate_basic_fields()
		self.validate_recurring_pattern()
		self.validate_date_range()
		self.set_employee_names()

		# Convert recurrence_interval to integer and validate
		if self.recurrence_interval:
			try:
				self.recurrence_interval = cint(self.recurrence_interval)
				if self.recurrence_interval < 1:
					frappe.throw(_("Recurrence interval must be at least 1"))
			except (ValueError, TypeError):
				frappe.throw(_("Recurrence interval must be a valid number"))

		# Generate recurring dates during validation to ensure they are saved
		if self.is_recurring:
			self.generate_recurring_dates_for_years()

	def validate_basic_fields(self):
		"""Validate basic holiday information."""
		if not self.holiday_name:
			frappe.throw(_("Holiday name is required"))

		# Validate character limits
		if len(self.holiday_name) > 140:
			frappe.throw(_("Holiday name cannot exceed 140 characters"))

		if self.description and len(self.description) > 1000:
			frappe.throw(_("Description cannot exceed 1000 characters"))

		if not self.is_recurring and not self.holiday_date:
			frappe.throw(_("Holiday date is required for non-recurring holidays"))
		if not self.start_date:
			frappe.throw(_("Start date is required"))

	def validate_recurring_pattern(self):
		"""Validate recurring holiday patterns."""
		if not self.is_recurring:
			return

		if not self.recurrence_type:
			frappe.throw(_("Recurrence type is required for recurring holidays"))

		if self.recurrence_type in ["Weekly", "Monthly"] and self.days_of_week:
			self.validate_days_of_week()

		if self.recurrence_type == "Monthly":
			if not self.days_of_week or not self.week_occurrence:
				frappe.throw(_("Monthly recurring holidays require both days of week and week occurrence"))

	def validate_days_of_week(self):
		"""Validate days of week format and values."""
		if not self.days_of_week:
			return
		valid_days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
		days = [day.strip() for day in self.days_of_week.split(",")]
		for day in days:
			if day not in valid_days:
				frappe.throw(_("Invalid day '{0}'. Valid days are: {1}").format(day, ", ".join(valid_days)))

	def validate_date_range(self):
		"""Validate date ranges."""
		if self.end_date and self.start_date:
			if getdate(self.end_date) < getdate(self.start_date):
				frappe.throw(_("End date cannot be before start date"))
		if not self.is_recurring and self.holiday_date:
			if getdate(self.holiday_date) < getdate(nowdate()):
				frappe.throw(_("Holiday date cannot be before today"))
			if self.end_date and getdate(self.holiday_date) > getdate(self.end_date):
				frappe.throw(_("Holiday date cannot be after end date"))

	def set_employee_names(self):
		"""Set employee names in child table."""
		if self.applicable_for == "Specific Employees" and self.employees:
			for emp in self.employees:
				if emp.employee and not emp.employee_name:
					employee_name = frappe.db.get_value("CG User", emp.employee, "full_name")
					# Truncate employee name if too long
					if employee_name and len(employee_name) > 140:
						employee_name = employee_name[:140]
					emp.employee_name = employee_name

	def on_update(self):
		"""Enhanced update handler with immediate cache clearing and employee sync."""
		# Clear relevant caches immediately
		self.invalidate_holiday_caches()

		# Queue immediate employee list updates with high priority
		self.queue_immediate_employee_sync()

	def on_trash(self):
		"""Handle holiday deletion with comprehensive cleanup."""
		self.invalidate_holiday_caches()
		self.queue_immediate_employee_sync()

	def generate_recurring_dates_for_years(self):
		"""Generate recurring holiday dates from start_date to +1 year (rolling 365 days)."""
		if not self.is_recurring:
			return

		# Clear existing generated dates
		self.generated_dates = []

		# Use rolling 12-month window from holiday start_date, not today
		# Always start from the holiday's start_date, regardless of today's date
		range_start = getdate(self.start_date)

		# End at the earlier of: start_date + 365 days or holiday end_date
		range_end = range_start + timedelta(days=365)
		if self.end_date:
			range_end = min(range_end, getdate(self.end_date))

		# Generate dates for the rolling period
		if range_start <= range_end:
			dates = self._generate_dates_for_year(range_start, range_end)

			# Add generated dates to child table
			for date_obj in dates:
				# Avoid duplicates
				existing = [d for d in self.generated_dates if d.holiday_date == date_obj]
				if not existing:
					day_name = date_obj.strftime("%A")
					# Ensure day_name doesn't exceed character limit
					if len(day_name) > 140:
						day_name = day_name[:140]

					self.append(
						"generated_dates",
						{
							"holiday_date": date_obj,
							"day_name": day_name,
							"is_generated": 1,
						},
					)

		frappe.logger().info(
			f"Generated {len(self.generated_dates)} recurring dates for holiday '{self.name}' "
			f"(from {range_start} to {range_end}) - starting from holiday start_date"
		)

	def _generate_dates_for_year(self, start_date, end_date):
		"""Generate dates for a specific year based on recurrence pattern."""
		interval = cint(self.recurrence_interval) or 1
		dates = []

		if self.recurrence_type == "Weekly":
			dates = self.generate_weekly_dates_optimized(start_date, end_date, interval)
		elif self.recurrence_type == "Monthly":
			dates = self.generate_monthly_dates_optimized(start_date, end_date, interval)
		elif self.recurrence_type == "Quarterly":
			dates = self.generate_quarterly_dates_optimized(start_date, end_date, interval)
		elif self.recurrence_type == "Yearly":
			dates = self.generate_yearly_dates_optimized(start_date, end_date, interval)

		return sorted(set(dates))

	def generate_weekly_dates_optimized(self, start_date, end_date, interval):
		"""Optimized weekly date generation."""
		dates = []
		if not self.days_of_week:
			return dates

		day_mapping = {
			"Mon": 0,
			"Tue": 1,
			"Wed": 2,
			"Thu": 3,
			"Fri": 4,
			"Sat": 5,
			"Sun": 6,
		}

		target_weekdays = [
			day_mapping[day.strip()] for day in self.days_of_week.split(",") if day.strip() in day_mapping
		]

		if not target_weekdays:
			return dates

		current_date = start_date
		week_start = start_date - timedelta(days=start_date.weekday())

		while current_date <= end_date:
			# Calculate weeks from start
			current_week_start = current_date - timedelta(days=current_date.weekday())
			weeks_from_start = (current_week_start - week_start).days // 7

			# Check if we're in a week that matches our interval
			if weeks_from_start % interval == 0:
				if current_date.weekday() in target_weekdays and current_date >= start_date:
					dates.append(current_date)

			current_date += timedelta(days=1)

		return sorted(set(dates))

	def generate_monthly_dates_optimized(self, start_date, end_date, interval):
		"""Optimized monthly date generation."""
		dates = []
		if not self.days_of_week or not self.week_occurrence:
			return dates

		day_mapping = {
			"Mon": 0,
			"Tue": 1,
			"Wed": 2,
			"Thu": 3,
			"Fri": 4,
			"Sat": 5,
			"Sun": 6,
		}

		target_weekdays = [
			day_mapping[day.strip()] for day in self.days_of_week.split(",") if day.strip() in day_mapping
		]

		if not target_weekdays:
			return dates

		current_month = start_date.month
		current_year = start_date.year
		months_passed = 0

		while datetime(current_year, current_month, 1).date() <= end_date:
			if months_passed % interval == 0:
				for weekday in target_weekdays:
					holiday_date = self.get_nth_weekday_of_month(
						current_year, current_month, weekday, self.week_occurrence
					)
					if holiday_date and start_date <= holiday_date <= end_date:
						dates.append(holiday_date)

			# Move to next month
			if current_month == 12:
				current_month = 1
				current_year += 1
			else:
				current_month += 1
			months_passed += 1

		return sorted(set(dates))

	def generate_quarterly_dates_optimized(self, start_date, end_date, interval):
		"""Generate quarterly dates."""
		dates = []
		current_year = start_date.year
		quarter_months = [1, 4, 7, 10]  # Q1, Q2, Q3, Q4 start months
		quarters_passed = 0

		while current_year <= end_date.year:
			for month in quarter_months:
				if quarters_passed % interval == 0:
					try:
						quarter_date = datetime(current_year, month, start_date.day).date()
						if start_date <= quarter_date <= end_date:
							dates.append(quarter_date)
					except ValueError:
						# Handle invalid dates (e.g., Feb 30)
						pass
				quarters_passed += 1
			current_year += 1

		return sorted(dates)

	def generate_yearly_dates_optimized(self, start_date, end_date, interval):
		"""Generate yearly dates."""
		dates = []
		current_year = start_date.year
		years_passed = 0

		while current_year <= end_date.year:
			if years_passed % interval == 0:
				try:
					yearly_date = datetime(current_year, start_date.month, start_date.day).date()
					if start_date <= yearly_date <= end_date:
						dates.append(yearly_date)
				except ValueError:
					# Handle invalid dates (e.g., Feb 29 in non-leap year)
					pass
			years_passed += 1
			current_year += 1

		return dates

	def get_nth_weekday_of_month(self, year, month, weekday, week_occurrence):
		"""Get the nth occurrence of a weekday in a month."""
		if week_occurrence == "Last":
			last_day = calendar.monthrange(year, month)[1]
			for day in range(last_day, 0, -1):
				if datetime(year, month, day).date().weekday() == weekday:
					return datetime(year, month, day).date()
		else:
			# Extract number from "1st", "2nd", etc.
			week_num = int(week_occurrence[0])
			first_day = datetime(year, month, 1).date()
			first_weekday = first_day.weekday()
			days_to_add = (weekday - first_weekday + 7) % 7
			first_occurrence = first_day + timedelta(days=days_to_add)
			target_date = first_occurrence + timedelta(weeks=week_num - 1)

			if target_date.month == month:
				return target_date
		return None

	def invalidate_holiday_caches(self):
		"""Clear all holiday-related caches immediately."""
		try:
			# Primary cache patterns for this specific holiday
			cache_patterns = [
				f"holiday_{self.name}_dates_*",
				f"branch_holidays_{self.branch_id}_*",
				"holiday_calendar_*",
			]

			# Clear specific employee caches based on applicability
			if self.applicable_for == "Specific Employees" and self.employees:
				# Only clear caches for affected employees
				for emp in self.employees:
					cache_patterns.append(f"employee_holidays_{emp.employee}_*")
			elif self.applicable_for == "All Employees" and self.branch_id:
				# For all employees, clear branch-level cache and let individual caches expire naturally
				# This is more efficient than clearing all employee caches
				cache_patterns.append(f"branch_holidays_{self.branch_id}_*")

				# Only clear employee caches in batches to avoid performance issues
				employees = frappe.get_all(
					"CG User",
					filters={"branch_id": self.branch_id},
					pluck="name",
					limit=100,  # Limit to prevent excessive cache operations
				)
				for emp in employees:
					cache_patterns.append(f"employee_holidays_{emp}_*")

			# Clear caches with collected patterns
			for pattern in cache_patterns:
				frappe.cache().delete_keys(pattern)

		except Exception as e:
			frappe.log_error(f"Error clearing holiday caches: {str(e)}", "Holiday Cache Clear")

	def queue_immediate_employee_sync(self):
		"""Queue immediate employee holiday list updates with high priority."""
		try:
			affected_employees = self.get_affected_employees()

			if not affected_employees:
				return

			# Ensure the holiday document and child tables are committed to database
			# before background job runs
			frappe.db.commit()

			# For immediate sync, use short queue with high priority
			enqueue(
				update_employee_holiday_lists_immediate,
				employees=affected_employees,
				holiday_doc=self.name,
				queue="short",
				timeout=600,  # Increased timeout to 10 minutes
				job_name=f"holiday_sync_{self.name[:50]}_{len(affected_employees)}",  # Truncated job name
				now=True,  # Execute immediately
			)

		except Exception as e:
			frappe.log_error(f"Error queuing immediate employee sync: {str(e)}", "Holiday Sync Error")

	def get_affected_employees(self):
		"""Get list of employees affected by this holiday."""
		affected_employees = []

		if self.applicable_for == "All Employees" and self.branch_id:
			affected_employees = frappe.get_all(
				"CG User",
				filters={"branch_id": self.branch_id, "enabled": 1},
				pluck="name",
			)
		elif self.applicable_for == "Specific Employees":
			affected_employees = [e.employee for e in self.employees if e.employee]

		return affected_employees

	@frappe.whitelist()
	def get_holiday_dates_for_range(self, start_date, end_date):
		"""Get all holiday dates within a date range with enhanced caching."""
		cache_key = f"holiday_{self.name}_dates_{start_date}_{end_date}"
		cached = frappe.cache().get_value(cache_key)
		if cached:
			return cached

		dates = []

		if self.is_recurring:
			# Validate that generated_dates exists and has entries
			if not self.generated_dates:
				frappe.log_error(
					f"Holiday '{self.name}' is recurring but has no generated_dates. "
					f"This may indicate a sync issue. Regenerating dates now.",
					"Holiday Sync Warning",
				)
				# Try to regenerate dates
				self.generate_recurring_dates_for_years()
				if not self.generated_dates:
					frappe.log_error(
						f"Failed to generate dates for holiday '{self.name}'", "Holiday Generation Error"
					)
					return []
				# Persist the regenerated dates
				try:
					self.flags.ignore_permissions = True
					self.save()
					frappe.db.commit()
				except Exception as e:
					frappe.log_error(f"Error saving regenerated dates for '{self.name}': {str(e)}")

			# Include all generated dates within range
			for gen_date in self.generated_dates:
				if getdate(start_date) <= getdate(gen_date.holiday_date) <= getdate(end_date):
					dates.append(
						{
							"date": gen_date.holiday_date,
							"day": gen_date.day_name,
							"name": self.holiday_name,
							"type": self.holiday_type,
							"color": self.color,
							"is_optional": self.is_optional,
						}
					)
		else:
			# Single date holiday
			if self.holiday_date and getdate(start_date) <= getdate(self.holiday_date) <= getdate(end_date):
				dates.append(
					{
						"date": self.holiday_date,
						"day": getdate(self.holiday_date).strftime("%A"),
						"name": self.holiday_name,
						"type": self.holiday_type,
						"color": self.color,
						"is_optional": self.is_optional,
					}
				)

		# Cache for 30 minutes
		frappe.cache().set_value(cache_key, dates, expires_in_sec=1800)
		return dates

	@frappe.whitelist()
	def regenerate_dates(self):
		"""Manual method to regenerate dates - useful for debugging."""
		if not self.is_recurring:
			return {"success": False, "message": "This is not a recurring holiday"}

		self.generate_recurring_dates_for_years()
		self.save()

		return {
			"success": True,
			"message": f"Generated {len(self.generated_dates)} recurring dates",
			"dates_count": len(self.generated_dates),
		}


def update_employee_holiday_lists_immediate(employees, holiday_doc):
	"""Immediate update of employee holiday lists with optimized processing."""
	if not employees:
		return

	try:
		# Log sync start for debugging
		frappe.logger().info(f"Starting holiday sync for {len(employees)} employees (holiday: {holiday_doc})")

		current_year = datetime.now().year
		from_date = datetime(current_year, 1, 1).date()
		to_date = datetime(current_year, 12, 31).date()

		# Process employees in smaller batches for immediate processing
		batch_size = 20
		successful_count = 0
		failed_count = 0

		for i in range(0, len(employees), batch_size):
			batch = employees[i : i + batch_size]

			# Get existing holiday lists for batch
			existing_lists = frappe.get_all(
				"CG Employee Holiday List",
				filters={
					"employee": ["in", batch],
					"from_date": ["<=", from_date],
					"to_date": [">=", to_date],
				},
				fields=["name", "employee"],
			)

			existing_dict = {item["employee"]: item["name"] for item in existing_lists}

			for employee in batch:
				try:
					if employee in existing_dict:
						# Update existing list only if there are actual changes
						holiday_list = frappe.get_doc("CG Employee Holiday List", existing_dict[employee])
						_ = holiday_list.update_holidays_if_changed()
					else:
						# Create new list
						holiday_list = frappe.new_doc("CG Employee Holiday List")
						holiday_list.employee = employee
						holiday_list.from_date = from_date
						holiday_list.to_date = to_date
						holiday_list.flags.ignore_permissions = True
						holiday_list.insert()

					# Clear employee-specific caches
					frappe.cache().delete_keys(f"employee_holidays_{employee}_*")
					successful_count += 1

				except Exception as e:
					failed_count += 1
					frappe.log_error(
						f"Error updating holiday list for employee {employee}: {str(e)}\n"
						f"Holiday: {holiday_doc}",
						"Holiday Sync Error",
					)
					continue

			# Commit each batch immediately
			frappe.db.commit()

		# Log completion
		frappe.logger().info(
			f"Holiday sync completed: {successful_count} successful, {failed_count} failed "
			f"(holiday: {holiday_doc})"
		)

	except Exception as e:
		frappe.log_error(f"Error in immediate holiday list update: {str(e)}")
		frappe.db.rollback()


@frappe.whitelist()
def force_regenerate_all_holidays():
	"""Force regenerate all recurring holidays for maintenance purposes.
	Use this to fix existing holidays after changing the date generation logic.
	"""
	try:
		recurring_holidays = frappe.get_all(
			"CG Holiday", filters={"is_recurring": 1, "is_active": 1}, fields=["name", "holiday_name"]
		)

		updated_count = 0
		errors = []

		for holiday_record in recurring_holidays:
			try:
				holiday_doc = frappe.get_doc("CG Holiday", holiday_record.name)

				# Clear existing generated dates
				before_count = len(holiday_doc.generated_dates)

				# Regenerate with new logic (rolling 365 days from today)
				holiday_doc.generate_recurring_dates_for_years()

				after_count = len(holiday_doc.generated_dates)

				holiday_doc.flags.ignore_permissions = True
				holiday_doc.save()

				frappe.logger().info(
					f"Regenerated '{holiday_record.holiday_name}': {before_count} -> {after_count} dates"
				)

				updated_count += 1

				# Commit every 10 records to avoid timeout
				if updated_count % 10 == 0:
					frappe.db.commit()

			except Exception as e:
				error_msg = f"Error regenerating holiday {holiday_record.name}: {str(e)}"
				frappe.log_error(error_msg, "Holiday Regeneration Error")
				errors.append(error_msg)
				continue

		# Final commit
		frappe.db.commit()

		# Clear all holiday caches
		frappe.cache().delete_keys("holiday_*")
		frappe.cache().delete_keys("employee_holidays_*")
		frappe.cache().delete_keys("branch_holidays_*")

		# Trigger employee holiday list refresh
		frappe.enqueue(
			"clapgrow_app.api.holidays.refresh_all_holiday_lists",
			queue="long",
			timeout=3600,
		)

		result = {
			"success": True,
			"message": f"Regenerated {updated_count} of {len(recurring_holidays)} recurring holidays",
			"updated_count": updated_count,
			"total_count": len(recurring_holidays),
			"errors": errors if errors else None,
		}

		frappe.logger().info(f"Holiday regeneration complete: {result}")

		return result

	except Exception as e:
		error_msg = f"Error in force regenerate: {str(e)}"
		frappe.log_error(error_msg, "Holiday Regeneration Error")
		frappe.db.rollback()
		return {"success": False, "message": error_msg}

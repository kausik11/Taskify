# Copyright (c) 2025, Clapgrow and contributors
# For license information, please see license.txt

from datetime import datetime, time, timedelta

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import add_days, getdate


class CGBranch(Document):
	def validate(self):
		if self.start_time:
			self.start_time = self.convert_to_24_hour(self.start_time)
		if self.end_time:
			self.end_time = self.convert_to_24_hour(self.end_time)

		start_time = datetime.strptime(self.start_time, "%H:%M:%S")
		end_time = datetime.strptime(self.end_time, "%H:%M:%S")

		# Adjust end_time for night shifts crossing midnight
		if end_time < start_time:
			end_time += timedelta(days=1)

		start_time_12hr = start_time.strftime("%I:%M %p")
		end_time_12hr = end_time.strftime("%I:%M %p")

		duration_seconds = (end_time - start_time).total_seconds()
		hours = int(duration_seconds // 3600)
		minutes = int((duration_seconds % 3600) // 60)

		self.work_duration = f"{hours} hours {minutes} minutes"
		self.timeline = f"{start_time_12hr} - {end_time_12hr} IST"

		self.validate_time_format()
		self.calculate_work_schedule()
		self.calculate_holiday_statistics()

	def on_update(self):
		if self.auto_generate_weekly_offs and self.default_weekly_off_days:
			self.create_weekly_off_holidays()

	def validate_time_format(self):
		"""Convert and validate time formats for start and end times."""
		try:
			if self.start_time:
				self.start_time = self.convert_to_24_hour(self.start_time)
			if self.end_time:
				self.end_time = self.convert_to_24_hour(self.end_time)
		except Exception as e:
			frappe.throw(_("Error in time format validation: {0}").format(str(e)))

	def calculate_work_schedule(self):
		"""Calculate work duration and timeline display."""
		try:
			if not self.start_time or not self.end_time:
				return

			# Ensure times are in string format
			start_time_str = str(self.start_time) if self.start_time else "00:00:00"
			end_time_str = str(self.end_time) if self.end_time else "00:00:00"

			# Parse times
			start_time = datetime.strptime(
				start_time_str.split()[0] if " " in start_time_str else start_time_str,
				"%H:%M:%S",
			)
			end_time = datetime.strptime(
				end_time_str.split()[0] if " " in end_time_str else end_time_str,
				"%H:%M:%S",
			)

			# Adjust end_time for night shifts crossing midnight
			if end_time < start_time:
				end_time += timedelta(days=1)

			start_time_12hr = start_time.strftime("%I:%M %p")
			end_time_12hr = end_time.strftime("%I:%M %p")

			duration_seconds = (end_time - start_time).total_seconds()
			hours = int(duration_seconds // 3600)
			minutes = int((duration_seconds % 3600) // 60)

			self.work_duration = f"{hours} hours {minutes} minutes"
			self.timeline = f"{start_time_12hr} - {end_time_12hr} IST"

		except Exception as e:
			frappe.log_error(f"Error calculating work schedule: {str(e)}")
			self.work_duration = "Invalid time format"
			self.timeline = "Invalid time format"

	def calculate_holiday_statistics(self):
		"""Calculate and update holiday statistics."""
		if not self.enable_holidays:
			self.total_holidays = 0
			self.active_holidays = 0
			return

		# Get holidays for this branch
		holidays = frappe.get_all(
			"CG Holiday", filters={"branch_id": self.name}, fields=["name", "is_active"]
		)

		self.total_holidays = len(holidays)
		self.active_holidays = len([h for h in holidays if h.is_active])

	def create_weekly_off_holidays(self):
		"""Create or update weekly off holidays for this branch."""
		if not self.default_weekly_off_days:
			return

		# Check if weekly off holiday already exists
		existing_holiday = frappe.db.exists(
			"CG Holiday",
			{
				"branch_id": self.name,
				"holiday_type": "Weekly Off",
				"is_recurring": 1,
				"auto_generated": 1,
			},
		)

		if existing_holiday:
			# Update existing weekly off holiday
			holiday_doc = frappe.get_doc("CG Holiday", existing_holiday)
			holiday_doc.days_of_week = self.default_weekly_off_days
			holiday_doc.save()
		else:
			# Create new weekly off holiday
			holiday_doc = frappe.new_doc("CG Holiday")
			holiday_doc.update(
				{
					"holiday_name": f"{self.branch_name} - Weekly Off",
					"holiday_type": "Weekly Off",
					"branch_id": self.name,
					"is_recurring": 1,
					"recurrence_type": "Weekly",
					"days_of_week": self.default_weekly_off_days,
					"start_date": datetime.now().date(),
					"is_active": 1,
					"auto_generated": 1,
					"color": "#F97316",  # Orange color for weekly offs
					"description": f"Auto-generated weekly off for {self.branch_name}",
				}
			)
			holiday_doc.insert()

	def convert_to_24_hour(self, time_input):
		"""Converts time input to 24-hour format (HH:MM:SS) for database storage."""
		if isinstance(time_input, str):
			for fmt in ("%I:%M %p", "%H:%M"):
				try:
					return datetime.strptime(time_input, fmt).strftime("%H:%M:%S")
				except ValueError:
					continue
			return time_input  # return as-is if no format matched
		elif isinstance(time_input, time):
			return time_input.strftime("%H:%M:%S")
		elif isinstance(time_input, timedelta):
			total_seconds = int(time_input.total_seconds())
			hours = total_seconds // 3600
			minutes = (total_seconds % 3600) // 60
			seconds = total_seconds % 60
			return f"{hours:02}:{minutes:02}:{seconds:02}"
		else:
			return str(time_input)

	@frappe.whitelist()
	def get_branch_holidays(self, start_date=None, end_date=None):
		"""Get all holidays for this branch within a date range."""
		if not self.enable_holidays:
			return []

		if not start_date:
			start_date = datetime.now().date()
		if not end_date:
			end_date = add_days(start_date, 365)

		# Get all holidays for this branch
		holidays = frappe.get_all(
			"CG Holiday",
			filters={"branch_id": self.name, "is_active": 1},
			fields=[
				"name",
				"holiday_name",
				"holiday_type",
				"is_recurring",
				"holiday_date",
				"color",
				"is_optional",
			],
		)

		all_holiday_dates = []

		for holiday in holidays:
			holiday_doc = frappe.get_doc("CG Holiday", holiday.name)
			holiday_dates = holiday_doc.get_holiday_dates_for_range(start_date, end_date)
			all_holiday_dates.extend(holiday_dates)

		# Sort by date
		all_holiday_dates.sort(key=lambda x: x["date"])
		return all_holiday_dates

# Copyright (c) 2024, Clapgrow and contributors
# For license information, please see license.txt

import logging
import re
from calendar import monthrange
from datetime import date, datetime, time, timedelta

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import get_datetime, now_datetime

from clapgrow_app.api.tasks.task_utils import parse_date, parse_datetime
from clapgrow_app.api.whatsapp.notification_utils import (
	get_notification_settings,
	send_email_notification_with_settings,
	send_whatsapp_notification_with_settings,
	should_send_notification,
)
from clapgrow_app.api.whatsapp.notify import (
	handle_task_completion,
	notify_users_for_created_tasks,
)
from clapgrow_app.clapgrow_app.doctype import (
	decrement_tag_count,
	handle_task_status,
	increment_tag_count,
)

logger = logging.getLogger(__name__)
WEEKDAYS = [
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
	"Sunday",
]


class CGTaskDefinition(Document):
	def after_insert(self):
		if self.task_type == "Recurring":
			self.create_recurring_instances()

	def on_trash(self):
		"""
		Handle deletion of task definition.

		NOTE: The custom API (delete_task_definitions_bulk) handles the logic of checking
		for completed instances and disabling instead of deleting. This method is only
		called when it's safe to delete (i.e., no completed instances exist).

		This method will:
		1. Update tag count
		2. Delete all associated task instances (both completed and non-completed)
		"""
		# Update tag count
		self.update_tag_count(-1)

		# Delete all associated task instances
		# Note: This will delete ALL instances, not just non-completed ones,
		# because this method should only be called when it's safe to do so
		delete_non_completed_associated_tasks(self)

	def on_update(self):
		previous_tag = self.get_doc_before_save().tag if self.get_doc_before_save() else None
		if previous_tag != self.tag:
			self.update_tag_count(-1, previous_tag)
			self.update_tag_count(1, self.tag)

	def validate(self):
		self.validate_user_permissions()
		self.validate_recurring_task_permission()
		self.validate_due_date()

		# Validate pause dates if paused
		if self.is_paused:
			self.validate_pause_dates()

		self.status = handle_task_status(
			due_date=self.due_date,
			status=self.status,
			is_completed=bool(self.is_completed),
		)

		if self.attach_file and self.subtask:
			for sub in self.subtask:
				sub.submit_file = self.attach_file

	def validate_user_permissions(self):
		user_roles = frappe.get_roles(frappe.session.user)
		assigned_to_user = frappe.get_cached_doc("CG User", self.assigned_to) if self.assigned_to else None

		if "CG-ROLE-MEMBER" in user_roles:
			if self.assigned_to != frappe.session.user:
				frappe.throw(_("You can only assign tasks to yourself."))

		elif "CG-ROLE-TEAM-LEAD" in user_roles and assigned_to_user:
			user_department = frappe.get_value("CG User", frappe.session.user, "department_id")
			user_branch = frappe.get_value("CG User", frappe.session.user, "branch_id")

			if assigned_to_user.department_id != user_department or assigned_to_user.branch_id != user_branch:
				frappe.throw(_("You can only assign tasks within your department and branch."))

	def validate_recurring_task_permission(self):
		if self.task_type == "Recurring" and self.assigned_to:
			user_role = frappe.get_value("CG User", self.assignee, ["role"])
			if user_role:
				role_docs = frappe.get_all(
					"CG Role",
					filters={"name": user_role},
					fields=["create_recurring_task"],
				)
				if not role_docs:
					frappe.throw(
						_("Role {0} is not associated with company {1}. Contact your administrator.").format(
							user_role
						)
					)
				if role_docs[0].create_recurring_task != 1:
					frappe.throw(
						_("You do not have permission to create recurring tasks. Contact your administrator.")
					)

	def validate_due_date(self):
		"""Validate due date for recurring tasks to ensure it's not in the past."""
		if self.task_type == "Recurring" and self.due_date:
			due_date = get_datetime(self.due_date)
			current_time = now_datetime()

			# For recurring tasks, due_date should not be in the past
			# Allow same day but not previous days
			if due_date.date() < current_time.date():
				frappe.throw(
					_(
						"Due date cannot be in the past for recurring tasks. Please set the due date to today or a future date."
					)
				)

	def validate_pause_dates(self):
		"""Validate pause start and end dates."""
		if self.is_paused:
			if not self.pause_start_date:
				frappe.throw(_("Pause Start Date is required when task is paused"))

			pause_start = parse_datetime(self.pause_start_date)
			current_time = datetime.now()

			# Allow pausing from past dates to handle retroactive pauses
			if pause_start > current_time + timedelta(days=7):
				frappe.throw(_("Cannot pause task more than 7 days in the future"))

			# If end date is provided, validate it
			if self.pause_end_date:
				pause_end = parse_datetime(self.pause_end_date)

				if pause_end <= pause_start:
					frappe.throw(_("Pause End Date must be after Pause Start Date"))

	def update_tag_count(self, increment, tag=None):
		tag = tag or self.tag
		if not tag:
			return

		if increment > 0:
			increment_tag_count(tag)
		else:
			decrement_tag_count(tag)

	def create_recurring_instances(self):
		"""Create recurring task instances based on recurrence type"""
		if not self.due_date:
			frappe.throw(_("Due date is required for recurring tasks"))

		base_date = parse_date(self.due_date)
		if not self.recurrence_type_id:
			frappe.throw(_("Recurrence Type is required for recurring tasks"))

		recurrence_doc = self.recurrence_type_id[0]
		frequency = recurrence_doc.frequency

		# FIXED: Calculate week range for manual task definition creation
		# get_week_range is defined at bottom of this file
		week_range = get_week_range(datetime.now(), mode="current_week")
		week_start = week_range["start"]
		week_end = week_range["end"]

		logger.info(
			f"Manual task definition creation for {self.name} - generating for week {week_start} to {week_end}"
		)

		# FIXED: Pass week_start and week_end to generator methods (except Custom)
		# Ensure base_date is datetime for comparison
		if isinstance(base_date, date) and not isinstance(base_date, datetime):
			base_date = datetime.combine(base_date, datetime.min.time())

		if frequency == "Daily":
			tasks = self.generate_daily_instances(base_date, week_start, week_end)
		elif frequency == "Weekly":
			tasks = self.generate_weekly_instances(base_date, week_start, week_end)
		elif frequency == "Monthly":
			tasks = self.generate_monthly_instances(base_date, week_start, week_end)
		elif frequency == "Yearly":
			tasks = self.generate_yearly_instances(base_date, week_start, week_end)
		elif frequency == "Custom":
			tasks = self.generate_custom_instances(base_date)
		else:
			frappe.throw(_("Unsupported recurrence type: {0}").format(frequency))

		if tasks:
			if isinstance(tasks, list) and tasks:
				self.update_generation_date(tasks[-1].due_date)

	def update_generation_date(self, last_date):
		"""Update the generated_till_date field in the task definition"""
		self.db_set("generated_till_date", last_date)

	def get_holiday_dates(self, start_date, end_date, use_cache=True):
		"""Retrieve holiday dates for the assigned user within the given date range using the new holiday system.

		Args:
			start_date: Start date for holiday lookup
			end_date: End date for holiday lookup
			use_cache: Whether to use caching (default: True)

		Returns:
			set: Set of holiday dates
		"""
		if not self.assigned_to:
			return set()

		# Use cache for repeated calls
		if use_cache:
			cache_key = f"task_def_holidays_{self.name}_{start_date}_{end_date}"
			cached = frappe.cache().get_value(cache_key)
			if cached:
				return cached

		try:
			from clapgrow_app.clapgrow_app.doctype.cg_employee_holiday_list.cg_employee_holiday_list import (
				get_employee_holidays,
			)

			cg_user = frappe.get_value("CG User", {"email": self.assigned_to}, "name")
			if not cg_user:
				logger.warning(f"No CG User found for email {self.assigned_to}")
				return set()

			holidays = get_employee_holidays(cg_user, start_date, end_date, create_if_missing=True)

			holiday_dates = set()
			for holiday in holidays:
				try:
					if holiday.get("date"):
						holiday_date = parse_date(holiday["date"]).date()
						holiday_dates.add(holiday_date)
						logger.debug(f"Added holiday {holiday.get('holiday_name')} on {holiday_date}")
				except Exception as e:
					logger.warning(f"Skipping invalid holiday date: {str(e)}")
					continue

			logger.debug(f"Holiday dates between {start_date} and {end_date}: {sorted(holiday_dates)}")

			# Cache for 30 minutes
			if use_cache:
				frappe.cache().set_value(cache_key, holiday_dates, expires_in_sec=1800)

			return holiday_dates

		except Exception as e:
			logger.error(f"Error getting holiday dates for user {self.assigned_to}: {str(e)}")
			return set()

	def has_task_instance_on_date(self, check_date, existing_dates_cache=None):
		"""Check if a task instance exists for this task definition on the given date.

		Args:
			check_date: Date to check
			existing_dates_cache: Optional pre-loaded set of existing dates (for batch operations)

		Returns:
			bool: True if instance exists
		"""
		try:
			if isinstance(check_date, date) and not isinstance(check_date, datetime):
				check_date = datetime.combine(check_date, time(0, 0))
			elif isinstance(check_date, str):
				check_date = parse_date(check_date)
			elif not isinstance(check_date, datetime):
				logger.error(f"Invalid check_date type: {type(check_date)} for task {self.name}")
				return False

			check_date_date = check_date.date()

			# Use pre-loaded cache if provided (batch optimization)
			if existing_dates_cache is not None:
				return check_date_date in existing_dates_cache

			# Fallback to database query (for individual checks)
			start_of_day = datetime.combine(check_date_date, time(0, 0))
			start_of_next_day = datetime.combine(check_date_date + timedelta(days=1), time(0, 0))

			# Check for instances on the same date (regardless of time)
			existing_instances = frappe.get_all(
				"CG Task Instance",
				filters={
					"task_definition_id": self.name,
					"due_date": ["between", [start_of_day, start_of_next_day]],
				},
				fields=["name", "due_date"],
			)

			if existing_instances:
				logger.debug(
					f"Found existing instance(s) for {self.name} on {check_date_date}: {[i.name for i in existing_instances]}"
				)
				return True
			return False

		except Exception as e:
			logger.error(f"Error checking task instance on {check_date} for task {self.name}: {str(e)}")
			return False

	def adjust_due_date_for_holidays(self, due_date, holiday_dates_cache=None, existing_dates_cache=None):
		"""Adjust due date based on holiday_behaviour, ensuring no duplicate task instances.

		Args:
			due_date: Original due date
			holiday_dates_cache: Optional pre-loaded set of holiday dates (for batch operations)
			existing_dates_cache: Optional pre-loaded set of existing task dates (for batch operations)

		Returns:
			datetime: Adjusted due date or None if should skip
		"""
		if not self.holiday_behaviour or self.holiday_behaviour == "Ignore Holiday":
			logger.debug(
				f"No holiday adjustment for task {self.name} on {due_date.date()} (holiday_behaviour: {self.holiday_behaviour})"
			)
			return due_date

		# Use pre-loaded cache if provided, otherwise load holidays (with smaller window)
		if holiday_dates_cache is not None:
			holiday_dates = holiday_dates_cache
		else:
			# Optimized: Only load ±14 days instead of ±60 days
			start_date = due_date - timedelta(days=14)
			end_date = due_date + timedelta(days=14)
			holiday_dates = self.get_holiday_dates(start_date.date(), end_date.date())

		due_date_date = parse_date(due_date).date()
		if due_date_date not in holiday_dates:
			logger.debug(f"No holiday on {due_date_date} for task {self.name}")
			return due_date

		logger.debug(
			f"Holiday detected on {due_date_date} for task {self.name}, adjusting per {self.holiday_behaviour}"
		)

		if self.holiday_behaviour == "Previous Working Date":
			adjusted_date = due_date_date - timedelta(days=1)
			days_checked = 0
			while adjusted_date in holiday_dates and days_checked < 30:
				adjusted_date -= timedelta(days=1)
				days_checked += 1

			if days_checked >= 30:
				logger.warning(f"Could not find working day within 30 days before {due_date_date}")
				return None

			if self.has_task_instance_on_date(adjusted_date, existing_dates_cache):
				logger.info(
					f"Skipping task {self.name} for {due_date_date} due to existing instance on {adjusted_date}"
				)
				return None
			logger.debug(f"Adjusted to previous working date: {adjusted_date}")
			return datetime.combine(adjusted_date, parse_date(due_date).time())

		elif self.holiday_behaviour == "Next Working Date":
			adjusted_date = due_date_date + timedelta(days=1)
			days_checked = 0
			while adjusted_date in holiday_dates and days_checked < 30:
				adjusted_date += timedelta(days=1)
				days_checked += 1

			if days_checked >= 30:
				logger.warning(f"Could not find working day within 30 days after {due_date_date}")
				return None

			if self.has_task_instance_on_date(adjusted_date, existing_dates_cache):
				logger.info(
					f"Skipping task {self.name} for {due_date_date} due to existing instance on {adjusted_date}"
				)
				return None
			logger.debug(f"Adjusted to next working date: {adjusted_date}")
			return datetime.combine(adjusted_date, parse_date(due_date).time())

		return due_date

	def check_temporary_reallocation(self, due_date):
		"""Check for active temporary reallocation for the task on the given due date."""
		due_date_date = parse_date(due_date).date()
		reallocations = frappe.get_all(
			"CG Task Reallocation",
			filters={
				"task_definition_id": self.name,
				"reallocation_type": "Temporary",
				"reallocation_status": "Completed",
				"enabled": 1,
				"temporary_from": ["<=", due_date_date],
				"temporary_until": [">=", due_date_date],
			},
			fields=["new_assigned_to"],
		)
		if reallocations:
			return reallocations[0].new_assigned_to
		return self.assigned_to

	def should_generate_instance(self, due_date):
		"""Check if an instance should be generated for the given due date."""
		if not self.is_paused:
			return True

		if not self.pause_start_date:
			return True

		pause_start = parse_datetime(self.pause_start_date).date()
		check_date = parse_date(due_date).date()

		# If no end date, don't generate anything from pause start onwards
		if not self.pause_end_date:
			return check_date < pause_start

		pause_end = parse_datetime(self.pause_end_date).date()
		# Don't generate if date falls within pause period
		return not (pause_start <= check_date <= pause_end)

	def generate_daily_instances(self, base_date, week_start, week_end):
		"""
		Generate daily instances with pause period checking and improved logic.
		OPTIMIZED: Pre-loads data to eliminate N+1 queries.

		Args:
			base_date: Starting date for generation
			week_start: Start of target week (Monday)
			week_end: End of target week (Sunday)
		"""
		from datetime import timedelta

		from clapgrow_app.api.tasks.task_utils import parse_date

		tasks = []

		# Use the passed week_start and week_end
		start_date = max(base_date, week_start)
		end_date = week_end

		if start_date.date() > end_date.date():
			logger.info(
				f"No daily generation needed for {self.name}: start_date {start_date.date()} > end_date {end_date.date()}"
			)
			return tasks

		logger.info(
			f"Generating daily instances for {self.name} from {start_date.date()} to {end_date.date()}"
		)

		# OPTIMIZATION: Pre-load all data in 2 queries instead of N queries
		preloaded_data = self._preload_task_data_for_range(start_date, end_date)
		existing_dates = preloaded_data["existing_dates"]
		holiday_dates = preloaded_data["holiday_dates"]

		# Collect dates to create instances for (batch creation)
		instances_to_create = []

		current_date = start_date
		while current_date.date() <= end_date.date():
			# Check if this date should be generated (not in pause period)
			if not self.should_generate_instance(current_date):
				logger.debug(f"Skipping task {self.name} for {current_date.date()} due to pause period")
				current_date += timedelta(days=1)
				continue

			# Check if instance already exists (using pre-loaded cache)
			if current_date.date() in existing_dates:
				logger.debug(f"Skipping task {self.name} for {current_date.date()} - instance already exists")
				current_date += timedelta(days=1)
				continue

			# Adjust for holidays (using pre-loaded cache)
			adjusted_date = self.adjust_due_date_for_holidays(current_date, holiday_dates, existing_dates)
			if adjusted_date is None:
				logger.debug(f"Skipping task {self.name} for {current_date.date()} due to holiday adjustment")
				current_date += timedelta(days=1)
				continue

			adjusted_date = parse_date(adjusted_date)

			# Final check with cache
			if adjusted_date.date() not in existing_dates:
				instances_to_create.append(adjusted_date)
				# Add to cache to prevent duplicates in this batch
				existing_dates.add(adjusted_date.date())
				logger.debug(f"Scheduled task instance for {self.name} on {adjusted_date.date()}")

			current_date += timedelta(days=1)

		# Create all instances
		if instances_to_create:
			logger.info(f"Creating {len(instances_to_create)} daily instances for {self.name}")
			tasks = self._batch_create_task_instances(instances_to_create)
			logger.info(f"Successfully created {len(tasks)} daily instances for {self.name}")

		return tasks

	# ============================================================================
	# FUNCTION 5: generate_weekly_instances() - Line ~445
	# ============================================================================

	def generate_weekly_instances(self, base_date, week_start, week_end):
		"""
		Generate weekly instances for all selected weekdays within the target week.
		OPTIMIZED: Pre-loads data to eliminate N+1 queries.

		Args:
			base_date: A reference datetime (provides the time component)
			week_start: Start of target week (Monday, 00:00:00)
			week_end: End of target week (Sunday, 23:59:59)
		"""
		from clapgrow_app.api.tasks.task_utils import parse_date

		tasks = []

		# Preload existing instances and holidays for the entire week
		preloaded_data = self._preload_task_data_for_range(week_start, week_end)
		existing_dates = preloaded_data["existing_dates"]
		holiday_dates = preloaded_data["holiday_dates"]

		# Determine which weekdays to generate
		recurrence_doc = self.recurrence_type_id[0]
		week_days_field = getattr(recurrence_doc, "week_days", None) or ""

		# Time component should come from original due_date/base_date
		original_due_dt = parse_date(self.due_date) if self.due_date else base_date
		base_time = original_due_dt.time()

		# Build list of target dates within the current week
		day_names = (
			[d.strip() for d in re.split(", |,", week_days_field.strip(",")) if d.strip()]
			if week_days_field
			else []
		)
		if not day_names:
			# Fallback to the weekday of the original due date
			day_names = [WEEKDAYS[original_due_dt.weekday()]]

		target_dates = []
		for day_name in day_names:
			if day_name not in WEEKDAYS:
				logger.error(f"Invalid weekday name in recurrence for {self.name}: {day_name}")
				continue
			day_index = WEEKDAYS.index(day_name)
			# Compute the date in the current target week matching this weekday
			date_in_week = week_start + timedelta(days=day_index)
			target_datetime = datetime.combine(date_in_week.date(), base_time)
			# Only consider dates inside the week boundaries
			if week_start.date() <= target_datetime.date() <= week_end.date():
				target_dates.append(target_datetime)

		# Collect due dates to create (avoid duplicates during this batch)
		instances_to_create = []
		for due_dt in target_dates:
			# Respect pause periods
			if not self.should_generate_instance(due_dt):
				logger.debug(f"Skipping {self.name} on {due_dt.date()} due to pause period")
				continue

			# Skip if already exists
			if due_dt.date() in existing_dates:
				logger.debug(f"Skipping {self.name} on {due_dt.date()} - instance already exists")
				continue

			# Adjust for holidays
			adjusted_dt = self.adjust_due_date_for_holidays(due_dt, holiday_dates, existing_dates)
			if adjusted_dt is None:
				logger.debug(f"Skipping {self.name} on {due_dt.date()} due to holiday adjustment")
				continue

			adjusted_dt = parse_date(adjusted_dt)
			if adjusted_dt.date() not in existing_dates:
				instances_to_create.append(adjusted_dt)
				# add to cache to prevent duplicates within this run
				existing_dates.add(adjusted_dt.date())

		# Create all instances in batch
		if instances_to_create:
			logger.info(f"Creating {len(instances_to_create)} weekly instances for {self.name}")
			tasks = self._batch_create_task_instances(instances_to_create)
			logger.info(f"Successfully created {len(tasks)} weekly instances for {self.name}")

		return tasks

	# ============================================================================
	# FUNCTION 6: generate_monthly_instances() - Line ~515
	# ============================================================================
	# REPLACE THIS METHOD IN THE CGTaskDefinition CLASS:

	def generate_monthly_instances(self, base_date, week_start, week_end):
		"""
		Generate monthly instances with pause period checking.
		OPTIMIZED: Pre-loads data to eliminate N+1 queries.

		Args:
			base_date: The specific date to generate the task
			week_start: Start of target week
			week_end: End of target week
		"""
		from clapgrow_app.api.tasks.task_utils import parse_date

		tasks = []

		# For monthly tasks, base_date is already calculated to be the correct day of month
		if not (week_start.date() <= base_date.date() <= week_end.date()):
			logger.info(
				f"Monthly task {self.name} base_date {base_date.date()} not in target week "
				f"{week_start.date()} to {week_end.date()}"
			)
			return tasks

		logger.info(f"Generating monthly instance for {self.name} on {base_date.date()}")

		# OPTIMIZATION: Pre-load data
		preloaded_data = self._preload_task_data_for_range(week_start, week_end)
		existing_dates = preloaded_data["existing_dates"]
		holiday_dates = preloaded_data["holiday_dates"]

		# Check if this date should be generated (not in pause period)
		if not self.should_generate_instance(base_date):
			logger.info(f"Skipping monthly task {self.name} for {base_date.date()} due to pause period")
			return tasks

		# Check if instance already exists (using pre-loaded cache)
		if base_date.date() in existing_dates:
			logger.info(f"Skipping monthly task {self.name} for {base_date.date()} - instance already exists")
			return tasks

		# Adjust for holidays (using pre-loaded cache)
		adjusted_date = self.adjust_due_date_for_holidays(base_date, holiday_dates, existing_dates)
		if adjusted_date is None:
			logger.info(f"Skipping monthly task {self.name} for {base_date.date()} due to holiday adjustment")
			return tasks

		adjusted_date = parse_date(adjusted_date)

		# Final check with cache
		if adjusted_date.date() not in existing_dates:
			task = create_task_instance(self, adjusted_date)
			if task:
				tasks.append(task)
				logger.info(f"Monthly task instance created for {self.name} on {adjusted_date.date()}")

		return tasks

	# ============================================================================
	# FUNCTION 7: generate_yearly_instances() - Line ~594
	# ============================================================================
	# REPLACE THIS METHOD IN THE CGTaskDefinition CLASS:

	def generate_yearly_instances(self, base_date, week_start, week_end):
		"""
		Generate yearly instances with pause period checking.
		OPTIMIZED: Pre-loads data to eliminate N+1 queries.

		Args:
			base_date: The specific date to generate the task
			week_start: Start of target week
			week_end: End of target week
		"""
		from clapgrow_app.api.tasks.task_utils import parse_date

		tasks = []

		# For yearly tasks, base_date is already calculated to be the anniversary date
		if not (week_start.date() <= base_date.date() <= week_end.date()):
			logger.info(
				f"Yearly task {self.name} base_date {base_date.date()} not in target week "
				f"{week_start.date()} to {week_end.date()}"
			)
			return tasks

		logger.info(f"Generating yearly instance for {self.name} on {base_date.date()}")

		# OPTIMIZATION: Pre-load data
		preloaded_data = self._preload_task_data_for_range(week_start, week_end)
		existing_dates = preloaded_data["existing_dates"]
		holiday_dates = preloaded_data["holiday_dates"]

		# Check if this date should be generated (not in pause period)
		if not self.should_generate_instance(base_date):
			logger.info(f"Skipping yearly task {self.name} for {base_date.date()} due to pause period")
			return tasks

		# Check if instance already exists (using pre-loaded cache)
		if base_date.date() in existing_dates:
			logger.info(f"Skipping yearly task {self.name} for {base_date.date()} - instance already exists")
			return tasks

		# Adjust for holidays (using pre-loaded cache)
		adjusted_date = self.adjust_due_date_for_holidays(base_date, holiday_dates, existing_dates)
		if adjusted_date is None:
			logger.info(f"Skipping yearly task {self.name} for {base_date.date()} due to holiday adjustment")
			return tasks

		adjusted_date = parse_date(adjusted_date)

		# Final check with cache
		if adjusted_date.date() not in existing_dates:
			task = create_task_instance(self, adjusted_date)
			if task:
				tasks.append(task)
				logger.info(f"Yearly task instance created for {self.name} on {adjusted_date.date()}")

		return tasks

	# ============================================================================
	# FUNCTION 8: generate_custom_instances() - Line ~624
	# ============================================================================
	# REPLACE THIS METHOD IN THE CGTaskDefinition CLASS:

	def generate_custom_instances(self, base_date, week_start, week_end):
		"""
		Generate custom recurrence instances.
		OPTIMIZED: Pre-loads data to eliminate N+1 queries.

		Args:
			base_date: Starting date for generation
			week_start: Start of target week
			week_end: End of target week
		"""
		from datetime import timedelta

		from clapgrow_app.api.tasks.task_utils import parse_date

		tasks = []

		# Use the passed week boundaries
		start_date = max(base_date, week_start)
		end_date = week_end

		if start_date.date() > end_date.date():
			logger.info(
				f"No custom generation needed for {self.name}: start_date {start_date.date()} > end_date {end_date.date()}"
			)
			return tasks

		logger.info(
			f"Generating custom instances for {self.name} from {start_date.date()} to {end_date.date()}"
		)

		# OPTIMIZATION: Pre-load data
		preloaded_data = self._preload_task_data_for_range(start_date, end_date)
		existing_dates = preloaded_data["existing_dates"]
		holiday_dates = preloaded_data["holiday_dates"]

		# Get custom recurrence parameters
		recurrence_doc = self.recurrence_type_id[0]
		interval = getattr(recurrence_doc, "interval", 1)
		unit = getattr(recurrence_doc, "unit", "Days")

		# Collect dates to create instances for
		instances_to_create = []

		current_date = start_date
		while current_date.date() <= end_date.date():
			# Check if this date should be generated
			if not self.should_generate_instance(current_date):
				logger.debug(
					f"Skipping custom task {self.name} for {current_date.date()} due to pause period"
				)
				if unit == "Days":
					current_date += timedelta(days=interval)
				elif unit == "Hours":
					current_date += timedelta(hours=interval)
				continue

			# Check if instance already exists (using pre-loaded cache)
			if current_date.date() in existing_dates:
				logger.debug(
					f"Skipping custom task {self.name} for {current_date.date()} - instance already exists"
				)
				if unit == "Days":
					current_date += timedelta(days=interval)
				elif unit == "Hours":
					current_date += timedelta(hours=interval)
				continue

			# Adjust for holidays (using pre-loaded cache)
			adjusted_date = self.adjust_due_date_for_holidays(current_date, holiday_dates, existing_dates)
			if adjusted_date is None:
				logger.debug(
					f"Skipping custom task {self.name} for {current_date.date()} due to holiday adjustment"
				)
				if unit == "Days":
					current_date += timedelta(days=interval)
				elif unit == "Hours":
					current_date += timedelta(hours=interval)
				continue

			adjusted_date = parse_date(adjusted_date)

			# Final check with cache
			if adjusted_date.date() not in existing_dates:
				instances_to_create.append(adjusted_date)
				# Add to cache to prevent duplicates in this batch
				existing_dates.add(adjusted_date.date())
				logger.debug(f"Scheduled custom task instance for {self.name} on {adjusted_date.date()}")

			# Move to next interval
			if unit == "Days":
				current_date += timedelta(days=interval)
			elif unit == "Hours":
				current_date += timedelta(hours=interval)
			else:
				# Unknown unit, default to 1 day
				current_date += timedelta(days=1)

		# Create all instances
		if instances_to_create:
			logger.info(f"Creating {len(instances_to_create)} custom instances for {self.name}")
			tasks = self._batch_create_task_instances(instances_to_create)
			logger.info(f"Successfully created {len(tasks)} custom instances for {self.name}")

		return tasks

	def _generate_custom_daily_instances(self, start_date, end_date, interval):
		"""Generate custom daily instances."""
		tasks = []
		current_date = start_date

		while current_date <= end_date:
			# Check if this date should be generated (not in pause period)
			if not self.should_generate_instance(current_date):
				logger.info(f"Skipping task {self.name} for {current_date.date()} due to pause period")
				current_date += timedelta(days=interval)
				continue

			adjusted_date = self.adjust_due_date_for_holidays(current_date)
			if adjusted_date is None:
				logger.info(f"Skipping task {self.name} for {current_date.date()} due to holiday adjustment")
				current_date += timedelta(days=interval)
				continue

			adjusted_date = parse_date(adjusted_date)
			if not self.has_task_instance_on_date(adjusted_date):
				task = create_task_instance(self, adjusted_date)
				if task:
					tasks.append(task)
					logger.debug(
						f"Custom daily task instance created for {self.name} on {adjusted_date.date()}"
					)

			current_date += timedelta(days=interval)

		return tasks

	def _generate_custom_weekly_instances(self, start_date, end_date, interval, recurrence_type):
		"""Generate custom weekly instances."""
		tasks = []
		week_days = recurrence_type.get("week_days", "")

		if not week_days:
			logger.warning(f"No week_days specified for custom weekly task {self.name}")
			return tasks

		days_to_generate = [day.strip() for day in re.split(", |,", week_days.strip(","))]

		# Generate for multiple weeks based on interval
		week_offset = 0
		while True:
			week_start = start_date + timedelta(weeks=week_offset)
			# week_end = week_start + timedelta(days=6)

			if week_start > end_date:
				break

			for day in days_to_generate:
				if day not in WEEKDAYS:
					logger.error(f"Invalid weekday name: {day}")
					continue

				day_index = WEEKDAYS.index(day)
				task_date = week_start + timedelta(days=(day_index - week_start.weekday()) % 7)

				if start_date <= task_date <= end_date:
					# Check if this date should be generated (not in pause period)
					if not self.should_generate_instance(task_date):
						logger.info(f"Skipping task {self.name} for {task_date.date()} due to pause period")
						continue

					adjusted_date = self.adjust_due_date_for_holidays(task_date)
					if adjusted_date is None:
						logger.info(
							f"Skipping task {self.name} for {task_date.date()} due to holiday adjustment"
						)
						continue

					adjusted_date = parse_date(adjusted_date)
					if not self.has_task_instance_on_date(adjusted_date):
						task = create_task_instance(self, adjusted_date)
						if task:
							tasks.append(task)
							logger.debug(
								f"Custom weekly task instance created for {self.name} on {adjusted_date.date()}"
							)

			week_offset += interval

		return tasks

	def _generate_custom_monthly_instances(self, start_date, end_date, interval, recurrence_type):
		"""Generate custom monthly instances."""
		tasks = []
		month_days = recurrence_type.get("month_days", 0)
		nth_week = recurrence_type.get("nth_week", "")
		week_days = recurrence_type.get("week_days", "")

		# Calculate how many months to generate based on the date range
		month_offset = 0
		while True:
			# Calculate target month and year
			target_month = start_date.month + (month_offset * interval)
			target_year = start_date.year + ((target_month - 1) // 12)
			target_month = ((target_month - 1) % 12) + 1

			# Stop if we've gone beyond our generation window
			month_start = datetime(target_year, target_month, 1)
			if month_start.date() > end_date.date():
				break

			task_date = None

			# Handle "nth week day" pattern (e.g., "2nd Monday")
			if nth_week and week_days:
				try:
					recur_weekday = week_days.split(",")[0].strip()
					if recur_weekday in WEEKDAYS:
						first_day_of_month = date(target_year, target_month, 1)
						days_in_month = monthrange(target_year, target_month)[1]
						first_weekday = first_day_of_month.weekday()
						target_weekday_index = WEEKDAYS.index(recur_weekday)
						days_diff = (target_weekday_index - first_weekday + 7) % 7
						first_occurrence = first_day_of_month + timedelta(days=days_diff)

						if nth_week == "Last":
							last_day_of_month = date(target_year, target_month, days_in_month)
							last_weekday = last_day_of_month.weekday()
							days_to_subtract = (last_weekday - target_weekday_index + 7) % 7
							task_date = last_day_of_month - timedelta(days=days_to_subtract)
						else:
							try:
								week_num = int(nth_week[:-2]) - 1
								if 0 <= week_num <= 3:
									task_date = first_occurrence + timedelta(weeks=week_num)
									if task_date.month != target_month:
										task_date = None  # Skip if week doesn't exist in this month
							except (ValueError, TypeError):
								logger.error(f"Invalid nth_week value: {nth_week}")
								task_date = None
				except Exception as e:
					logger.error(f"Error processing nth week pattern: {str(e)}")
					task_date = None

			# Handle "day of month" pattern (e.g., "15th of every month")
			elif month_days != 0:
				try:
					last_day = monthrange(target_year, target_month)[1]
					actual_day = min(month_days, last_day)
					task_date = date(target_year, target_month, actual_day)
				except ValueError:
					logger.warning(f"Invalid day {month_days} for month {target_month}/{target_year}")
					task_date = None

			if task_date and start_date.date() <= task_date <= end_date.date():
				task_datetime = datetime.combine(task_date, start_date.time())

				# Check if this date should be generated (not in pause period)
				if not self.should_generate_instance(task_datetime):
					logger.info(f"Skipping task {self.name} for {task_date} due to pause period")
				else:
					adjusted_date = self.adjust_due_date_for_holidays(task_datetime)
					if adjusted_date is None:
						logger.info(f"Skipping task {self.name} for {task_date} due to holiday adjustment")
					else:
						adjusted_date = parse_date(adjusted_date)
						if not self.has_task_instance_on_date(adjusted_date):
							task = create_task_instance(self, adjusted_date)
							if task:
								tasks.append(task)
								logger.debug(
									f"Custom monthly task instance created for {self.name} on {adjusted_date.date()}"
								)

			month_offset += 1

		return tasks

	def _generate_custom_yearly_instances(self, start_date, end_date, interval):
		"""Generate custom yearly instances."""
		tasks = []

		# Generate yearly custom recurrence
		year_offset = 0
		while True:
			target_year = start_date.year + (year_offset * interval)
			try:
				task_date = start_date.replace(year=target_year)

				if task_date > end_date:
					break

				if start_date <= task_date <= end_date:
					# Check if this date should be generated (not in pause period)
					if not self.should_generate_instance(task_date):
						logger.info(f"Skipping task {self.name} for {task_date.date()} due to pause period")
					else:
						adjusted_date = self.adjust_due_date_for_holidays(task_date)
						if adjusted_date is None:
							logger.info(
								f"Skipping task {self.name} for {task_date.date()} due to holiday adjustment"
							)
						else:
							adjusted_date = parse_date(adjusted_date)
							if not self.has_task_instance_on_date(adjusted_date):
								task = create_task_instance(self, adjusted_date)
								if task:
									tasks.append(task)
									logger.debug(
										f"Custom yearly task instance created for {self.name} on {adjusted_date.date()}"
									)

			except ValueError:
				# Handle leap year issues
				logger.warning(f"Could not create yearly recurrence for {target_year}")

			year_offset += 1

		return tasks

	def is_currently_paused(self):
		"""Check if task is currently in an active pause period."""
		if not self.is_paused or not self.pause_start_date:
			return False

		current_time = datetime.now()
		pause_start = parse_datetime(self.pause_start_date)

		# If no end date, consider it indefinitely paused
		if not self.pause_end_date:
			return current_time >= pause_start

		pause_end = parse_datetime(self.pause_end_date)
		return pause_start <= current_time <= pause_end

	@frappe.whitelist()
	def pause_recurring_task(task_definition_id, pause_start_date, pause_end_date=None, reason=None):
		try:
			# Get the task definition
			task_doc = frappe.get_doc("CG Task Definition", task_definition_id)

			# Validate task type
			if task_doc.task_type != "Recurring":
				frappe.throw(_("Only recurring tasks can be paused"))

			# Parse and validate dates
			try:
				start_date = parse_datetime(pause_start_date)
				current_time = datetime.now()
				# Prevent pausing too far in the past (e.g., more than 7 days)
				if start_date < current_time - timedelta(days=7):
					frappe.throw(_("Cannot pause task more than 7 days in the past"))
				# Ensure start_date is not too far in the future
				if start_date > current_time + timedelta(days=7):
					frappe.throw(_("Cannot pause task more than 7 days in the future"))
			except ValueError:
				frappe.throw(_("Invalid pause start date format. Use ISO format (YYYY-MM-DD)."))

			end_date = None
			if pause_end_date:
				try:
					end_date = parse_datetime(pause_end_date)
					if end_date <= start_date:
						frappe.throw(_("Pause end date must be after start date"))
				except ValueError:
					frappe.throw(_("Invalid pause end date format. Use ISO format (YYYY-MM-DD)."))

			# Validate user permissions
			if not _can_user_pause_task(task_doc):
				frappe.throw(_("You don't have permission to pause this task"))

			# Pause the task
			deleted_count = task_doc.pause_recurring_task(start_date, end_date, reason)

			result = {
				"success": True,
				"message": f"Task paused successfully. {deleted_count} future instances deleted.",
				"deleted_instances": deleted_count,
				"pause_start_date": start_date.isoformat(),
				"is_indefinite": end_date is None,
			}

			if end_date:
				result["pause_end_date"] = end_date.isoformat()
			else:
				result["message"] = f"Task paused indefinitely. {deleted_count} future instances deleted."

			# Commit changes
			frappe.db.commit()

			# Send notification to assigned user
			try:
				# send_pause_notification(task_doc, start_date, end_date, reason)
				pass
			except Exception as e:
				frappe.log_error(
					f"Failed to send pause notification: {str(e)}",
					"Pause Notification Error",
				)

			return result

		except Exception as e:
			frappe.log_error(f"Error pausing task {task_definition_id}: {str(e)}", "Task Pause Error")
			frappe.db.rollback()
			return {"success": False, "message": str(e), "error": True}

	def resume_recurring_task(self, generate_missed_instances=True):
		"""
		Resume a paused recurring task.

		Args:
		        generate_missed_instances (bool): Whether to generate missed instances
		"""
		if not self.is_paused:
			frappe.throw(_("Task is not currently paused"))

		# Validate permissions
		self.validate_resume_permissions()

		created_count = 0
		if generate_missed_instances and self.pause_end_date:
			created_count = self.generate_missed_instances()

		# Clear pause fields
		self.is_paused = 0
		self.pause_start_date = None
		self.pause_end_date = None
		self.pause_reason = None
		self.paused_by = None

		# Create history record
		self.create_pause_history_record("Resume", 0, created_count, "Task resumed")

		# Save the task definition
		self.save()

		return created_count

	def manually_generate_instances(self, start_date, end_date):
		"""
		Manually generate task instances for a specific date range during pause period.

		Args:
		        start_date (datetime): Start date for generation
		        end_date (datetime, optional): End date for generation
		"""
		if not self.is_paused:
			frappe.throw(_("Manual generation is only allowed for paused tasks"))

		# Validate permissions
		self.validate_manual_generation_permissions()

		# For indefinitely paused tasks, allow generation from pause start onwards
		if not self.pause_end_date:
			if not end_date:
				end_date = start_date + timedelta(days=6)  # Default to 1 week
		else:
			# For pauses with end dates, ensure dates are within pause period
			pause_end = parse_datetime(self.pause_end_date)

			# Allow generation within or after pause period
			if end_date and end_date > pause_end:
				end_date = pause_end

		# Generate instances for the specified range
		created_count = self.generate_instances_for_range(start_date, end_date)

		# Create history record
		reason = f"Manual generation from {start_date.date()} to {end_date.date()}"
		self.create_pause_history_record("Manual Generate", 0, created_count, reason)

		return created_count

	def send_pause_notification(task_doc, start_date, end_date, reason):
		"""Send notification when task is paused."""
		if not task_doc.assigned_to:
			return

		# Check if notifications are enabled for this company
		if not should_send_notification(task_doc.company_id, "task_update", "whatsapp"):
			logger.info(f"Pause notifications disabled for company {task_doc.company_id}")
			return

		try:
			assigned_user = frappe.get_doc("CG User", task_doc.assigned_to)
			if not assigned_user.phone or not getattr(assigned_user, "enable_whatsapp_notifications", True):
				logger.info(f"No WhatsApp notifications for user {assigned_user.name}")
				return

			pause_period = "indefinitely" if not end_date else f"until {end_date.strftime('%d-%m-%Y')}"

			message = (
				f"Hello {assigned_user.full_name}, \n\n"
				f"Your recurring task '{task_doc.task_name}' has been paused {pause_period}. \n\n"
				f"Start Date: {start_date.strftime('%d-%m-%Y')} \n"
			)

			if reason:
				message += f"Reason: {reason} \n"

			message += "\nYou will be notified when the task resumes."

			send_whatsapp_notification_with_settings(
				assigned_user.phone, message, task_doc.company_id, "task_update"
			)

		except Exception as e:
			frappe.log_error(
				f"Failed to send pause notification for task {task_doc.name}: {str(e)}",
				"Notification Error",
			)

	def validate_pause_permissions(self):
		"""Validate if user can pause the task."""
		user_role = frappe.get_value("CG User", frappe.session.user, "role")

		# Admin can always pause
		if user_role == "CG-ROLE-ADMIN":
			return

		# Check if user is superior of the assigned user
		if self.is_user_superior(frappe.session.user):
			return

		frappe.throw(_("You don't have permission to pause this task"))

	def validate_resume_permissions(self):
		"""Validate if user can resume the task."""
		user_role = frappe.get_value("CG User", frappe.session.user, "role")

		# Admin can always resume
		if user_role == "CG-ROLE-ADMIN":
			return

		# Check if user is superior of the assigned user
		if self.is_user_superior(frappe.session.user):
			return

		# Assigned user can resume their own task if allowed
		if frappe.session.user == self.assigned_to and self.can_resume_manually:
			return

		frappe.throw(_("You don't have permission to resume this task"))

	def validate_manual_generation_permissions(self):
		"""Validate if user can manually generate instances."""
		user_role = frappe.get_value("CG User", frappe.session.user, "role")

		# Admin can always generate
		if user_role == "ROLE-Admin":
			return

		# Check if user is superior of the assigned user
		if self.is_user_superior(frappe.session.user):
			return

		frappe.throw(_("You don't have permission to manually generate instances"))

	def is_user_superior(self, user_email):
		"""Check if user is a superior of the assigned user."""
		if not self.assigned_to:
			return False

		assigned_user = frappe.get_doc("CG User", self.assigned_to)
		if not assigned_user.report_to:
			return False

		# Check if user_email is in the report_to list
		for superior in assigned_user.report_to:
			if superior.get("superior") == user_email:
				return True
		return False

	def _preload_task_data_for_range(self, start_date, end_date):
		"""Pre-load existing task instances and holidays for batch operations.

		Args:
			start_date: Start date for range
			end_date: End date for range

		Returns:
			dict: Contains 'existing_dates' and 'holiday_dates' sets
		"""
		# Expand range slightly to handle holiday adjustments
		extended_start = start_date - timedelta(days=30)
		extended_end = end_date + timedelta(days=30)

		# Pre-load existing task instances (SINGLE QUERY)
		existing_instances = frappe.get_all(
			"CG Task Instance",
			filters={
				"task_definition_id": self.name,
				"due_date": ["between", [extended_start, extended_end]],
			},
			fields=["due_date"],
			pluck="due_date",
		)

		existing_dates = {parse_date(inst).date() for inst in existing_instances}

		# Pre-load holidays (SINGLE QUERY)
		holiday_dates = self.get_holiday_dates(
			extended_start.date() if isinstance(extended_start, datetime) else extended_start,
			extended_end.date() if isinstance(extended_end, datetime) else extended_end,
			use_cache=True,
		)

		logger.info(
			f"Pre-loaded data for {self.name}: {len(existing_dates)} existing dates, "
			f"{len(holiday_dates)} holidays"
		)

		return {"existing_dates": existing_dates, "holiday_dates": holiday_dates}

	def _batch_create_task_instances(self, due_dates):
		"""Create multiple task instances efficiently.

		OPTIMIZATION: Creates multiple instances with minimal overhead while maintaining
		notification scheduling and proper event handling.

		Args:
			due_dates: List of datetime objects for task due dates

		Returns:
			list: List of created task instances
		"""
		from clapgrow_app.api.tasks.task_utils import parse_date

		if not due_dates:
			return []

		created_tasks = []
		current_datetime = datetime.now()

		logger.info(f"Batch creating {len(due_dates)} task instances for {self.name}")

		for due_date in due_dates:
			try:
				# CRITICAL: Skip tasks with due dates in the past for recurring tasks
				if self.task_type == "Recurring" and due_date < current_datetime:
					logger.info(
						f"Skipping task instance for {self.name} on {parse_date(due_date).date()} "
						f"as due date is before current datetime {current_datetime}"
					)
					continue

				# Check for temporary reallocation
				assigned_to = self.check_temporary_reallocation(due_date)

				# Prepare task data
				task_data = {
					"doctype": "CG Task Instance",
					"task_definition_id": self.name,
					"due_date": due_date,
					"recurrence_type_id": self.recurrence_type_id,
					"assigned_to": assigned_to,
					**get_task_fields(self),
					"checklist": [],
					"subtask": [],
				}

				# Copy checklist
				if self.checklist:
					for checklist_item in self.checklist:
						task_data["checklist"].append(
							{
								"doctype": "CG Task Checklist Item",
								"checklist_item": checklist_item.checklist_item,
								"is_checked": 0,
								"description": getattr(checklist_item, "description", None),
							}
						)

				# Copy subtask definitions
				if self.has_subtask and self.subtask:
					task_data["has_subtask"] = 1
					task_data["subtask"] = []

					for subtask_def in self.subtask:
						subtask_instance = {
							"doctype": "CG Subtask Instance",
							"subtask_name": subtask_def.subtask_name,
							"assigned_to": subtask_def.assigned_to,
							"due_date": (subtask_def.due_date if subtask_def.due_date else due_date),
							"is_completed": 0,
							"submit_file": subtask_def.submit_file or "[]",
							"subtask_id": getattr(subtask_def, "name", None),
							"company_id": (
								subtask_def.company_id
								if hasattr(subtask_def, "company_id") and subtask_def.company_id
								else self.company_id
							),
						}
						task_data["subtask"].append(subtask_instance)
				else:
					task_data["has_subtask"] = 0

				# Create task instance
				task = frappe.get_doc(task_data)

				# Set flags for efficient bulk creation
				task.flags.ignore_permissions = True

				# Insert task (triggers after_insert which schedules notifications)
				task.insert()

				created_tasks.append(task)
				logger.debug(f"Created task instance {task.name} for {due_date.date()}")

			except Exception as e:
				logger.error(f"Error creating task instance for {due_date.date()}: {str(e)}")
				frappe.log_error(
					message=f"Batch creation error for task {self.name} on {due_date}: {str(e)}",
					title="Task Instance Batch Creation Error",
				)
				continue

		# Commit all instances at once
		if created_tasks:
			frappe.db.commit()
			logger.info(f"Batch committed {len(created_tasks)} task instances for {self.name}")

		return created_tasks

	def delete_instances_in_pause_range(self, start_date, end_date):
		"""Delete task instances within the pause date range."""
		start_dt = parse_datetime(start_date) if isinstance(start_date, str) else start_date
		end_dt = parse_datetime(end_date) if end_date and isinstance(end_date, str) else end_date

		filters = {
			"task_definition_id": self.name,
			"due_date": [">=", start_dt],
			"is_completed": 0,
			"status": ["not in", ["Completed", "Cancelled"]],
		}

		if end_dt:
			filters["due_date"] = ["between", [start_dt, end_dt]]

		instances_to_delete = frappe.get_all(
			"CG Task Instance",
			filters=filters,
			fields=["name", "due_date", "status"],
		)

		deleted_count = 0
		for instance in instances_to_delete:
			try:
				frappe.delete_doc("CG Task Instance", instance.name, ignore_permissions=True)
				deleted_count += 1
				logger.info(f"Deleted task instance {instance.name} for {self.name} on {instance.due_date}")
			except Exception as e:
				logger.error(f"Failed to delete task instance {instance.name}: {str(e)}")
				continue

		return deleted_count

	def generate_instances_for_range(self, start_date, end_date):
		"""Generate task instances for a specific date range."""
		created_count = 0

		# Use the appropriate generation method based on frequency
		if self.recurrence_type_id and len(self.recurrence_type_id) > 0:
			frequency = self.recurrence_type_id[0].frequency

			# Temporarily clear pause to allow generation
			original_is_paused = self.is_paused
			original_pause_start = self.pause_start_date
			original_pause_end = self.pause_end_date

			self.is_paused = 0
			self.pause_start_date = None
			self.pause_end_date = None

			try:
				if frequency == "Daily":
					# Generate daily tasks for the range
					current_date = start_date
					while current_date <= end_date:
						if not self.has_task_instance_on_date(current_date):
							adjusted_date = self.adjust_due_date_for_holidays(current_date)
							if adjusted_date:
								task = create_task_instance(self, adjusted_date)
								if task:
									created_count += 1
						current_date += timedelta(days=1)

				elif frequency == "Weekly":
					# Generate weekly tasks
					tasks = self.generate_weekly_instances(start_date)
					created_count = len(
						[t for t in tasks if parse_date(t.due_date).date() <= end_date.date()]
					)

				else:
					# For monthly, yearly, custom - generate if due date falls in range
					tasks = []
					if frequency == "Monthly":
						tasks = self.generate_monthly_instances(start_date)
					elif frequency == "Yearly":
						tasks = self.generate_yearly_instances(start_date)
					elif frequency == "Custom":
						tasks = self.generate_custom_instances(start_date)

					created_count = len(
						[
							t
							for t in tasks
							if start_date.date() <= parse_date(t.due_date).date() <= end_date.date()
						]
					)

			finally:
				# Restore original pause state
				self.is_paused = original_is_paused
				self.pause_start_date = original_pause_start
				self.pause_end_date = original_pause_end

		return created_count

	def generate_missed_instances(self):
		"""Generate instances that were missed during pause period."""
		if not self.pause_start_date or not self.pause_end_date:
			return 0

		current_time = datetime.now()
		pause_end = parse_datetime(self.pause_end_date)

		# Only generate if pause period has ended
		if current_time < pause_end:
			return 0

		# Generate from end of pause until current week
		week_range = get_week_range(current_time)
		end_date = min(week_range["end"], current_time)

		return self.generate_instances_for_range(
			pause_end + timedelta(days=1),
			datetime.combine(end_date.date(), pause_end.time()),
		)

	def create_pause_history_record(self, action_type, instances_deleted, instances_created, reason):
		"""Create a pause history record for audit trail."""
		try:
			history = frappe.get_doc(
				{
					"doctype": "CG Task Pause History",
					"task_definition_id": self.name,
					"action_type": action_type,
					"pause_start_date": self.pause_start_date,
					"pause_end_date": self.pause_end_date,
					"reason": reason,
					"performed_by": frappe.session.user,
					"performed_on": datetime.now(),
					"instances_deleted": instances_deleted,
					"instances_created": instances_created,
				}
			)
			history.insert(ignore_permissions=True)
			logger.info(f"Created pause history record for task {self.name}: {action_type}")
		except Exception as e:
			logger.error(f"Failed to create pause history record for task {self.name}: {str(e)}")
			raise


def get_week_range(base_date, mode="next_week"):
	"""
	Get the week range for task generation.

	Args:
		base_date: Current datetime when function is called
		mode: "next_week" (default, for Sunday cron) or "current_week" (for manual generation)

	Returns:
		dict with 'start' and 'end' datetime objects
	"""
	from datetime import timedelta

	current_weekday = base_date.weekday()  # 0=Monday, 6=Sunday

	if mode == "current_week":
		# For manual generation: Get the current week (Monday to Sunday)
		# Calculate this week's Monday
		start = base_date - timedelta(days=current_weekday)
	elif mode == "next_week":
		# For scheduled cron (Sunday): Get next week (upcoming Monday to Sunday)
		if current_weekday == 6:  # Sunday
			# Generate for the week starting tomorrow (Monday)
			start = base_date + timedelta(days=1)
		else:
			# Generate for the week starting from next Monday
			days_until_monday = 7 - current_weekday
			start = base_date + timedelta(days=days_until_monday)
	else:
		raise ValueError(f"Invalid mode: {mode}. Use 'next_week' or 'current_week'")

	# Set start to beginning of day
	start = start.replace(hour=0, minute=0, second=0, microsecond=0)

	# End is 6 days after start (Sunday)
	end = start + timedelta(days=6, hours=23, minutes=59, seconds=59)

	logger.info(f"Week range calculated ({mode}): {start.date()} to {end.date()}")
	return {"start": start, "end": end}


# ============================================================================
# FUNCTION 2: determine_base_date_for_generation() - Line ~1325
# ============================================================================
def determine_base_date_for_generation(task_doc, week_start, week_end, frequency):
	"""
	Determine the correct base_date for task generation based on frequency and generated_till_date.
	FIXED: Better logic for weekly task generation

	Returns None if no generation is needed for the current week.
	"""
	from datetime import datetime, timedelta

	from clapgrow_app.api.tasks.task_utils import parse_date

	original_due_date = parse_date(task_doc.due_date)

	logger.info(f"Task {task_doc.name}: Determining base date for {frequency} task")
	logger.info(f"  - Week range: {week_start.date()} to {week_end.date()}")
	logger.info(f"  - Original due date: {original_due_date.date()}")

	# If task has never been generated, start from original due date
	if not task_doc.generated_till_date:
		logger.info(f"Task {task_doc.name}: No generated_till_date, starting from original due_date")
		# Start generating from week_start if original due date is in the past
		if original_due_date.date() < week_start.date():
			return week_start
		# Or from original due date if it falls in the target week
		elif week_start.date() <= original_due_date.date() <= week_end.date():
			return original_due_date
		else:
			logger.info(f"Task {task_doc.name}: Original due date not in target week")
			return None

	last_generated = parse_date(task_doc.generated_till_date)
	logger.info(f"Task {task_doc.name}: Last generated till {last_generated.date()}")

	# CRITICAL FIX: Check if we've already generated for this specific week
	# by checking if last_generated is within or after the target week
	if last_generated.date() >= week_start.date():
		logger.info(
			f"Task {task_doc.name}: Already generated for week starting {week_start.date()} "
			f"(last generated: {last_generated.date()})"
		)
		return None

	# We need to generate - determine the starting point based on frequency
	if frequency == "Daily":
		# For daily tasks, generate from week_start
		logger.info(f"Task {task_doc.name}: Daily task - starting from {week_start.date()}")
		return week_start

	elif frequency == "Weekly":
		# CRITICAL FIX: For weekly tasks, generate for the target week
		# Get the day of week from original task
		original_weekday = original_due_date.weekday()  # 0=Monday, 6=Sunday

		# Calculate the date with same weekday in target week
		target_date = week_start + timedelta(days=original_weekday)

		# Set the time from original due date
		target_datetime = datetime.combine(target_date.date(), original_due_date.time())

		WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
		logger.info(
			f"Task {task_doc.name}: Weekly task on {WEEKDAYS[original_weekday]} "
			f"- generating for {target_datetime.date()}"
		)
		return target_datetime

	elif frequency == "Monthly":
		# For monthly tasks, check if the task's day of month falls in target week
		day_of_month = original_due_date.day

		# Check each day in the target week
		current_date = week_start
		while current_date <= week_end:
			if current_date.day == day_of_month and current_date.date() > last_generated.date():
				target_datetime = datetime.combine(current_date.date(), original_due_date.time())
				logger.info(
					f"Task {task_doc.name}: Monthly task (day {day_of_month}) "
					f"- generating for {target_datetime.date()}"
				)
				return target_datetime
			current_date += timedelta(days=1)

		logger.info(f"Task {task_doc.name}: Monthly task day {day_of_month} not in target week")
		return None

	elif frequency == "Yearly":
		# For yearly tasks, check if the anniversary date falls in target week
		try:
			yearly_task_date = original_due_date.replace(year=week_start.year)
		except ValueError:
			# Handle Feb 29 on non-leap years
			yearly_task_date = original_due_date.replace(year=week_start.year, day=28)

		if week_start.date() <= yearly_task_date.date() <= week_end.date():
			if yearly_task_date.date() > last_generated.date():
				logger.info(f"Task {task_doc.name}: Yearly task - generating for {yearly_task_date.date()}")
				return yearly_task_date

		logger.info(f"Task {task_doc.name}: Yearly task not due in target week")
		return None

	elif frequency == "Custom":
		# For custom frequency, generate from week_start if needed
		logger.info(f"Task {task_doc.name}: Custom frequency - starting from {week_start.date()}")
		return week_start

	# Default fallback
	logger.warning(f"Task {task_doc.name}: Unknown frequency {frequency}, using week_start")
	return week_start


def create_task_instance(self, due_date):
	"""Create a task instance from task definition with proper subtask handling."""
	if not due_date and self.task_type == "Recurring":
		due_date = parse_date(self.due_date)

	adjusted_due_date = self.adjust_due_date_for_holidays(due_date)
	if adjusted_due_date is None:
		logger.info(
			f"Skipping task instance creation for {self.name} on {parse_date(due_date).date()} due to holiday adjustment or existing instance"
		)
		return None

	current_datetime = datetime.now()
	if adjusted_due_date < current_datetime:
		if self.task_type == "Recurring":
			logger.info(
				f"Skipping task instance creation for {self.name} on {parse_date(adjusted_due_date).date()} as due date is before current datetime {current_datetime}"
			)
			return None
		else:
			logger.error(
				f"Skipping task instance creation for {self.name} on {parse_date(adjusted_due_date).date()} as due date is before current datetime {current_datetime}"
			)
			frappe.throw(_("Due Date and time cannot be before current datetime"))

	if self.has_task_instance_on_date(adjusted_due_date):
		logger.info(
			f"Skipping task instance creation for {self.name} on {parse_date(adjusted_due_date).date()} due to existing instance"
		)
		return None

	assigned_to = self.check_temporary_reallocation(adjusted_due_date)

	# Prepare task data including subtask data if exists
	task_data = {
		"doctype": "CG Task Instance",
		"task_definition_id": self.name,
		"due_date": adjusted_due_date,
		"recurrence_type_id": self.recurrence_type_id,
		"assigned_to": assigned_to,
		**get_task_fields(self),
		"checklist": [],
		"subtask": [],
	}

	if self.checklist:
		for checklist_item in self.checklist:
			task_data["checklist"].append(
				{
					"doctype": "CG Task Checklist Item",
					"checklist_item": checklist_item.checklist_item,
					"is_checked": 0,
					"description": getattr(checklist_item, "description", None),
				}
			)
		logger.info(f"Replicated {len(task_data['checklist'])} checklist items for {self.name}")

	# Copy subtask definitions to subtask instances if they exist
	if self.has_subtask and self.subtask:
		task_data["has_subtask"] = 1
		task_data["subtask"] = []

		for subtask_def in self.subtask:
			subtask_instance = {
				"doctype": "CG Subtask Instance",
				"subtask_name": subtask_def.subtask_name,
				"assigned_to": subtask_def.assigned_to,
				"due_date": (subtask_def.due_date if subtask_def.due_date else adjusted_due_date),
				"is_completed": 0,
				"submit_file": subtask_def.submit_file or "[]",
				"subtask_id": getattr(subtask_def, "name", None),
				"company_id": (
					subtask_def.company_id
					if hasattr(subtask_def, "company_id") and subtask_def.company_id
					else self.company_id
				),
			}
			task_data["subtask"].append(subtask_instance)
	else:
		task_data["has_subtask"] = 0

	task = frappe.get_doc(task_data)
	task.insert()
	return task


def _can_user_pause_task(task_doc):
	"""Check if current user can pause the task."""
	user_role = frappe.get_value("CG User", frappe.session.user, "role")

	# Admin can always pause
	if user_role == "CG-ROLE-ADMIN":
		return True

	# Check if user is superior of the assigned user
	try:
		if task_doc.is_user_superior(frappe.session.user):
			return True
	except Exception:
		pass

	# Assigned user can pause their own task if allowed
	if frappe.session.user == task_doc.assigned_to and getattr(task_doc, "can_pause_manually", True):
		return True

	return False


def get_task_fields(self):
	return {
		fieldname: self.get(fieldname)
		for fieldname in frappe.get_meta("CG Task Definition").get_fieldnames_with_value()
		if fieldname not in ["name", "creation", "modified", "due_date", "assigned_to"]
	}


def delete_non_completed_associated_tasks(self):
	"""
	Delete only non-completed task instances associated with this task definition.
	This prevents deletion of completed tasks while allowing cleanup of pending tasks.
	"""
	non_completed_tasks = frappe.get_all(
		"CG Task Instance",
		filters={
			"task_definition_id": self.name,
			"is_completed": 0,
		},
		fields=["name", "status"],
	)

	deleted_count = 0
	for task in non_completed_tasks:
		try:
			frappe.delete_doc("CG Task Instance", task.name)
			deleted_count += 1
			logger.info(f"Deleted non-completed task instance {task.name} for task definition {self.name}")
		except Exception as e:
			logger.error(f"Failed to delete task instance {task.name}: {str(e)}")
			continue

	if deleted_count > 0:
		logger.info(f"Deleted {deleted_count} non-completed task instances for task definition {self.name}")


def get_task_definitions(self):
	user_roles = frappe.get_roles(frappe.session.user)
	filters = []

	if "CG-ROLE-Team Member" in user_roles:
		filters.append(["assigned_to", "=", frappe.session.user])

	elif "CG-ROLE-Team Lead" in user_roles:
		department_id = frappe.get_value("CG User", frappe.session.user, "department_id")
		filters.append(["department_id", "=", department_id])

	elif "CG-ROLE-Manager" in user_roles:
		branch_id = frappe.get_value("CG User", frappe.session.user, "branch_id")
		filters.append(["branch_id", "=", branch_id])

	return frappe.get_list("CG Task Definition", filters=filters)


def generate_recurring_task_instances(mode="next_week"):
	"""
	Cron job to generate task instances for all recurring task definitions.
	Runs every Sunday at 3:00 AM.

	OPTIMIZED: Batch processing with minimal database queries.
	Enhanced to respect pause periods and handle resume logic.

	Args:
		mode: "next_week" (default, for Sunday cron) or "current_week" (for manual generation)
	"""
	from datetime import datetime

	import frappe

	from clapgrow_app.api.tasks.task_utils import parse_date

	try:
		logger.info("=" * 80)
		logger.info(f"TASK GENERATION JOB STARTED (Mode: {mode})")
		logger.info(f"Server time: {datetime.now()}")
		logger.info("=" * 80)

		# V2: Set bulk creation flag for async notifications
		frappe.local.bulk_task_creation = True
		logger.info("Bulk task creation flag set - notifications will be scheduled for 8 AM")

		# OPTIMIZATION: Get only essential fields, not full documents
		# Note: recurrence_type_id is a child table, fetched later
		task_definitions = frappe.get_all(
			"CG Task Definition",
			filters={
				"task_type": "Recurring",
				"enabled": 1,
				"is_paused": 0,
			},
			fields=[
				"name",
				"due_date",
				"generated_till_date",
				"task_name",
				"assigned_to",
			],
		)

		current_date = datetime.now()

		# Get the week range based on mode
		week_range = get_week_range(current_date, mode=mode)
		week_start = week_range["start"]
		week_end = week_range["end"]

		logger.info(f"Generating task instances for upcoming week: {week_start.date()} to {week_end.date()}")
		logger.info(f"Found {len(task_definitions)} active recurring task definitions")

		active_count = 0
		total_instances_created = 0
		skipped_count = 0
		error_count = 0

		# OPTIMIZATION: Process in batches to manage memory
		batch_size = 50
		for batch_idx in range(0, len(task_definitions), batch_size):
			batch = task_definitions[batch_idx : batch_idx + batch_size]
			logger.info(f"\nProcessing batch {batch_idx // batch_size + 1}: {len(batch)} task definitions")

			for task_def in batch:
				try:
					logger.info(f"\n{'=' * 60}")
					logger.info(f"Processing: {task_def.name} - {task_def.task_name}")

					if not task_def.due_date:
						logger.warning("  ✗ Skipping: Missing due_date")
						skipped_count += 1
						continue

					# Load full document only when we need to generate
					task_doc = frappe.get_doc("CG Task Definition", task_def.name)

					# Task is active
					active_count += 1

					if not task_doc.recurrence_type_id or len(task_doc.recurrence_type_id) == 0:
						logger.warning("  ✗ Skipping: Missing recurrence_type_id")
						skipped_count += 1
						continue

					recurrence_doc = task_doc.recurrence_type_id[0]
					frequency = recurrence_doc.frequency
					logger.info(f"  - Frequency: {frequency}")

					# Determine correct base_date
					base_date = determine_base_date_for_generation(task_doc, week_start, week_end, frequency)

					if base_date is None:
						logger.info("  ○ No generation needed for this week")
						skipped_count += 1
						continue

					logger.info(f"  - Base date for generation: {base_date.date()}")

					# OPTIMIZED: Pass week_start and week_end to generation methods
					generator_map = {
						"Daily": lambda: task_doc.generate_daily_instances(base_date, week_start, week_end),
						"Weekly": lambda: task_doc.generate_weekly_instances(base_date, week_start, week_end),
						"Monthly": lambda: task_doc.generate_monthly_instances(
							base_date, week_start, week_end
						),
						"Yearly": lambda: task_doc.generate_yearly_instances(base_date, week_start, week_end),
						"Custom": lambda: task_doc.generate_custom_instances(base_date, week_start, week_end),
					}

					if frequency not in generator_map:
						logger.warning(f"  ✗ Unsupported recurrence type: {frequency}")
						skipped_count += 1
						continue

					# Generate tasks (now optimized with batch queries)
					tasks = generator_map[frequency]()

					if tasks:
						# Filter tasks for target week only
						filtered_tasks = [
							task
							for task in tasks
							if week_start.date() <= parse_date(task.due_date).date() <= week_end.date()
						]

						logger.info(
							f"  - Generated {len(tasks)} total tasks, {len(filtered_tasks)} within target week"
						)

						if filtered_tasks:
							# Update generated_till_date to week_end
							task_doc.update_generation_date(week_end)

							# Update tag count for current week tasks only
							task_doc.update_tag_count(len(filtered_tasks))
							total_instances_created += len(filtered_tasks)

							logger.info(f"  ✓ Successfully created {len(filtered_tasks)} instances")
						else:
							logger.info("  ○ No tasks fall within target week")
							skipped_count += 1
					else:
						logger.info("  ○ No tasks generated")
						skipped_count += 1

				except Exception as e:
					error_count += 1
					logger.error(f"  ✗ Error processing {task_def.name}: {str(e)}")
					frappe.log_error(
						message=f"Error processing task {task_def.name}: {str(e)}\n{frappe.get_traceback()}",
						title="Task Generation Error",
					)
					continue

			# Commit after each batch to prevent memory issues
			frappe.db.commit()
			logger.info(f"Batch {batch_idx // batch_size + 1} committed")

		# Final commit
		frappe.db.commit()

		# Log summary
		logger.info("\n" + "=" * 80)
		logger.info("TASK GENERATION COMPLETED")
		logger.info("Summary:")
		logger.info(f"  - Active tasks processed: {active_count}")
		logger.info(f"  - Tasks skipped (no generation needed): {skipped_count}")
		logger.info(f"  - Errors: {error_count}")
		logger.info(f"  - Total instances created: {total_instances_created}")
		logger.info("=" * 80)

		# Return summary for monitoring
		return {
			"status": "success",
			"active_count": active_count,
			"skipped_count": skipped_count,
			"error_count": error_count,
			"total_created": total_instances_created,
			"week_start": week_start.strftime("%Y-%m-%d"),
			"week_end": week_end.strftime("%Y-%m-%d"),
		}

	except Exception as e:
		logger.error(f"FATAL ERROR in task generation: {str(e)}")
		import frappe

		frappe.log_error(
			message=f"Fatal error in task generation: {str(e)}\n{frappe.get_traceback()}",
			title="Task Generation Fatal Error",
		)
		return {"status": "error", "error": str(e)}

	finally:
		# V2: Clear the bulk creation flag
		if hasattr(frappe.local, "bulk_task_creation"):
			delattr(frappe.local, "bulk_task_creation")
			logger.info("Bulk task creation flag cleared")


def send_auto_resume_notification(task_doc, instances_created):
	"""Send notification when task is auto-resumed after pause period ends."""
	if not task_doc.assigned_to:
		return

	# Check if notifications are enabled for this company
	if not should_send_notification(task_doc.company_id, "task_update", "whatsapp"):
		logger.info(f"Auto-resume notifications disabled for company {task_doc.company_id}")
		return

	try:
		assigned_user = frappe.get_doc("CG User", task_doc.assigned_to)
		if not assigned_user.phone or not getattr(assigned_user, "enable_whatsapp_notifications", True):
			return

		message = (
			f"Hello {assigned_user.full_name}, \n\n"
			f"Your recurring task '{task_doc.task_name}' has been automatically resumed as the pause period has ended. \n\n"
			f"{instances_created} missed task instances have been generated. \n\n"
			f"Please check your task list for the updated schedule."
		)

		send_whatsapp_notification_with_settings(
			assigned_user.phone, message, task_doc.company_id, "task_update"
		)

	except Exception as e:
		frappe.log_error(
			f"Failed to send auto-resume notification: {str(e)}",
			"Auto Resume Notification Error",
		)


# Additional helper method to add to CGTaskDefinition class
def check_and_auto_resume(self):
	"""Check if this paused task should be auto-resumed and do so if needed."""
	if not self.is_paused or not self.pause_end_date:
		return False

	current_time = datetime.now()
	pause_end = parse_datetime(self.pause_end_date)

	if current_time >= pause_end:
		logger.info(f"Auto-resuming task {self.name} - pause period ended")

		# Generate missed instances
		created_count = self.generate_missed_instances()

		# Clear pause flags
		self.is_paused = 0
		self.pause_start_date = None
		self.pause_end_date = None
		self.pause_reason = None
		self.paused_by = None

		# Create history record
		self.create_pause_history_record(
			"Auto Resume",
			0,
			created_count,
			"Automatically resumed after pause period ended",
		)

		# Save
		self.save()

		return True

	return False

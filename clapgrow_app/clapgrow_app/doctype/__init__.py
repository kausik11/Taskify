from datetime import datetime

import frappe
import pytz
from dateutil import parser
from frappe import _


def increment_tag_count(tag):
	"""Increase the tag count when a tag is linked"""
	# print(doc.tag)
	if tag:
		frappe.db.set_value("CG Tags", tag, "count", frappe.db.get_value("CG Tags", tag, "count") + 1)


def decrement_tag_count(tag):
	"""Decrease the tag count when a tag is unlinked or document is deleted"""
	if tag:
		current_count = frappe.db.get_value("CG Tags", tag, "count") or 0
		new_count = max(0, current_count - 1)
		frappe.db.set_value("CG Tags", tag, "count", new_count)


def handle_task_status(
	due_date: str | datetime,
	current_date: datetime = None,
	is_subtask: bool = False,
	is_completed: bool = False,
	is_creating_task: bool = False,
	status: str = None,
	restrict: int = 0,
) -> str:
	ist = pytz.timezone("Asia/Kolkata")
	due_date = parse_date(due_date)
	due_date = ist.localize(due_date)
	current_date = current_date or datetime.now(ist)

	if not current_date.tzinfo:
		current_date = ist.localize(current_date)

	if is_completed == 1:
		return "Completed"

	if due_date < current_date:
		return "Overdue"

	if due_date.date() > current_date.date():
		return "Upcoming"

	if due_date.date() == current_date.date():
		return "Due Today"


def parse_date(date_str: str | datetime) -> datetime:
	"""Parses date string or returns datetime object."""

	if isinstance(date_str, str):
		try:
			return parser.parse(date_str)
		except (ValueError, TypeError):
			frappe.throw(_("Invalid date format: '{date_str}'. Expected format is YYYY-MM-DD."))
	if isinstance(date_str, datetime):
		return date_str
	raise frappe.throw(_("Date must be a string or a datetime object."))

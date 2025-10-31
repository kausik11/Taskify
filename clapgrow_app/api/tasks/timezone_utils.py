# Copyright (c) 2024, Clapgrow and contributors
# For license information, please see license.txt

from datetime import datetime, timedelta

import frappe
import pytz
from frappe.utils import now_datetime

# IST timezone constant
IST = pytz.timezone("Asia/Kolkata")


def get_ist_now():
	"""Get current datetime in IST timezone as naive datetime."""
	return now_datetime().astimezone(IST).replace(tzinfo=None)


def get_ist_now_aware():
	"""Get current datetime in IST timezone as timezone-aware datetime."""
	return now_datetime().astimezone(IST)


def parse_date_ist(date_str):
	"""Parse date string and ensure it's in IST timezone as naive datetime."""
	if isinstance(date_str, datetime):
		if date_str.tzinfo is None:
			# Assume it's already in IST if naive
			return date_str
		else:
			# Convert to IST and make naive
			return date_str.astimezone(IST).replace(tzinfo=None)

	if isinstance(date_str, str):
		try:
			# Parse the date string
			parsed_date = datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
			# Assume it's in IST and return as naive
			return parsed_date
		except ValueError:
			try:
				# Try with microseconds
				parsed_date = datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S.%f")
				return parsed_date
			except ValueError:
				# Fallback to dateutil parser but assume IST
				from dateutil import parser

				parsed_date = parser.parse(date_str)
				if parsed_date.tzinfo is not None:
					parsed_date = parsed_date.astimezone(IST).replace(tzinfo=None)
				return parsed_date

	raise ValueError(f"Invalid date format: {date_str}")


def ensure_ist_naive(dt):
	"""Ensure datetime is in IST timezone and naive."""
	if dt is None:
		return None

	if isinstance(dt, datetime):
		if dt.tzinfo is None:
			# Assume it's already in IST if naive
			return dt
		else:
			# Convert to IST and make naive
			return dt.astimezone(IST).replace(tzinfo=None)

	return parse_date_ist(dt)


def get_week_range_ist(base_date=None):
	"""Get week range in IST timezone."""
	if base_date is None:
		base_date = get_ist_now()

	base_date = ensure_ist_naive(base_date)
	start = base_date - timedelta(days=base_date.weekday())
	end = start + timedelta(days=6)
	return {"start": start, "end": end}

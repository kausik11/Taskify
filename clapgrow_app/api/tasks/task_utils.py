import json
import logging
import os
import re
from datetime import datetime, timedelta

import frappe
from dateutil import parser
from frappe import _
from frappe.utils.file_manager import save_file
from werkzeug.utils import secure_filename

from clapgrow_app.api.common.utils import org_name
from clapgrow_app.api.error_classes import (
	CompanyNotFoundError,
	FileUploadError,
	InvalidDataFormatError,
	InvalidDateError,
	TagAdditionError,
	UserNotFoundError,
	log_and_raise_error,
)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
ALLOWED_EXTENSIONS = {
	"pdf",
	"doc",
	"docx",
	"log",
	"mp3",
	"mp4",
	"json",
	"xls",
	"xlsx",
	"txt",
	"gz",
	"csv",
	"png",
	"jpeg",
	"jpg",
	"img",
	"sql",
	"word",
	"odt",
	"rtf",
	"ods",
	"ppt",
	"pptx",
	"odp",
	"key",
	"epub",
	"mobi",
	"azw",
	"ibooks",
	"html",
	"htm",
	"md",
	"xml",
	"yml",
}
MAX_FILE_SIZE_MB = 5


def handle_task_status(
	due_date: str | datetime,
	current_date: datetime = None,
	is_subtask: bool = False,
	is_completed: bool = False,
	is_creating_task: bool = False,
	status: str = None,
) -> str:
	current_date = datetime.now()
	due_date = parse_date(due_date)

	if is_completed or status == "Completed":
		return "Completed"

	if due_date < current_date:
		return "Overdue"

	if due_date.date() > current_date.date():
		return "Upcoming"

	if due_date.date() == current_date.date():
		return "Due Today"


def count_task_status(tasks: list[dict]) -> dict[str, int]:
	"""Counts the number of tasks in different status categories."""

	counts = {
		"completed_percentage": 0,
		"upcoming": 0,
		"completed": 0,
		"due_today": 0,
		"overdue": 0,
	}

	total_tasks = 0
	today_datetime = datetime.now()

	for task in tasks:
		due_date = task.get("due_date")
		is_completed = task.get("is_completed", False)
		status = handle_task_status(due_date=due_date, is_completed=is_completed, status=task.get("status"))

		if isinstance(due_date, str):
			due_date = parser.parse(due_date)
		elif isinstance(due_date, datetime):
			due_date = due_date

		total_tasks += 1

		if status == "Completed":
			counts["completed"] += 1
		elif is_completed == 1 or due_date < today_datetime:
			counts["overdue"] += 1
		elif due_date.date() > today_datetime.date():
			counts["upcoming"] += 1
		elif due_date.date() == today_datetime.date():
			counts["due_today"] += 1

	if total_tasks > 0:
		counts["completed_percentage"] = format_float((counts["completed"] / total_tasks) * 100)
	return counts


def parse_date(date_str: str | datetime) -> datetime:
	"""Parses date string or returns datetime object."""

	if isinstance(date_str, str):
		try:
			return parser.parse(date_str)
		except (ValueError, TypeError):
			raise InvalidDateError(f"Invalid date format: '{date_str}'. Expected format is YYYY-MM-DD.")
	if isinstance(date_str, datetime):
		return date_str
	raise InvalidDateError("Date must be a string or a datetime object.")


def get_cg_user(user_id: str, allow_none: bool = False) -> dict | None:
	"""Fetches the CG User document ID."""
	if user_id is None:
		if allow_none:
			return None
		raise UserNotFoundError(_("User  ID is required but not provided."))

	user_doc = frappe.get_doc("CG User", user_id)
	if not user_doc:
		if allow_none:
			return None
		raise UserNotFoundError(_("CG User with ID {0} not found.").format(user_id))

	return {
		"email": user_doc.name,
		"first_name": user_doc.first_name,
		"last_name": user_doc.last_name,
		"user_name": format_name(user_doc.first_name, user_doc.middle_name, user_doc.last_name),
		"user_image": user_doc.user_image,
	}


def get_company_id():
	"""Retrieve the company ID for the current user."""
	try:
		user_details = frappe.db.get_value("CG User", {"email": frappe.session.user}, "company_id")
		if not user_details:
			raise CompanyNotFoundError("Company ID is not available.")

		return user_details

	except Exception as e:
		frappe.log_error(
			f"Error fetching company ID for user {frappe.session.user}: {str(e)}",
			"Get Company ID Error",
		)
		raise CompanyNotFoundError(f"Failed to fetch company ID: {str(e)}")


def get_user_email(user_data, allow_none=False):
	"""Fetches the email of a user based on user data."""
	if user_data:
		return get_cg_user(user_data)["email"]
	return None if allow_none else ""


def format_name(first_name: str, middle_name: str | None = None, last_name: str | None = None) -> str:
	"""Formats the user's name based on the provided first, middle, and last names."""
	name_parts = [first_name]
	if middle_name:
		name_parts.append(middle_name)
	if last_name:
		name_parts.append(last_name)
	return " ".join(name_parts)


def validate_json(data: str) -> dict:
	"""Validates and parses JSON input."""
	if not data:
		raise ValueError("No data provided.")
	try:
		return frappe.parse_json(data)
	except ValueError as e:
		raise ValueError(f"Invalid data format: {str(e)}")


def format_float(value):
	return format_float(f"{value:.2f}".rstrip("0").rstrip("."))


def validate_task_name(task_name):
	"""Validates if task_name is provided."""
	if not task_name:
		raise frappe.exceptions.ValidationError("Task name is required for update.")


def validate_input_data(data, http_request: str):
	"""Validates input data and parses JSON."""
	if not data:
		raise InvalidDataFormatError(
			f"No data provided for task {http_request}."
		)  # Use f-string for formatting

	try:
		parsed_data = frappe.parse_json(data)

		if "tags" in parsed_data:
			if parsed_data["tags"] is None:
				parsed_data["tags"] = []
			elif isinstance(parsed_data["tags"], str):
				parsed_data["tags"] = [parsed_data["tags"]]
			elif isinstance(parsed_data["tags"], list) and not all(
				isinstance(tag, str) for tag in parsed_data["tags"]
			):
				raise InvalidDataFormatError(_("Invalid format for 'tags'. Expected a list of strings."))

		if http_request == "updation" and "is_completed" not in parsed_data:
			raise InvalidDataFormatError(_("Required field 'is_completed' not provided"))

		if http_request == "creation":
			if isinstance(parsed_data, dict):
				return [parsed_data]
			if not isinstance(parsed_data, list):
				raise InvalidDataFormatError(_("Invalid data format: Expected a list of tasks."))

		if "due_date" in parsed_data:
			try:
				due_date = datetime.strptime(parsed_data.get("due_date"), "%Y-%m-%d %H:%M:%S.%f")
			except ValueError:
				due_date = datetime.strptime(parsed_data.get("due_date"), "%Y-%m-%d %H:%M:%S")

			due_date = due_date.replace(microsecond=0)
			parsed_data["due_date"] = due_date

		return parsed_data

	except ValueError as e:
		raise InvalidDataFormatError(f"Invalid data format: {str(e)}")

	except Exception as e:
		raise InvalidDataFormatError(f"Unexpected error occurred: {str(e)}")


def get_task_doc(task_type, task_name):
	"""Fetches the task document."""
	task_doc = frappe.get_doc(task_type, task_name)
	if not task_doc:
		raise frappe.exceptions.ValidationError(f"{task_type} with name {task_name} not found.")
	return task_doc


def get_task_type(task_name):
	"""Determine the task type based on the task name prefix."""
	return "CG Task Instance" if task_name.startswith("CGO") else "CG Scheduled Task Instance"


def add_tags_to_task(doc, tags):
	"""Add tags to a task document."""
	if tags:
		for tag in tags:
			try:
				doc.add_tag(tag)
			except frappe.exceptions.ValidationError as e:
				log_and_raise_error(f"Validation error adding tag '{tag}': {str(e)}", TagAdditionError)
			except Exception as e:
				log_and_raise_error(f"Failed to add tag '{tag}': {str(e)}", TagAdditionError)


# @redis_cache(ttl=300)
def get_users_by_branch(branch_id: str) -> list[str]:
	"""
	Fetches a list of user IDs who belong to the given branch.
	Cached results are returned if available; otherwise, the data is fetched and cached.

	:param branch_id: The branch ID to filter users by.
	:return: List of user IDs belonging to the specified branch.
	"""

	users = frappe.get_all("CG User", filters={"branch_id": branch_id}, fields=["name"])
	user_ids = [user["name"] for user in users]
	return user_ids


# @redis_cache(ttl=300)
def get_users_by_department(department_id: str) -> list[str]:
	"""
	Fetches a list of user IDs who belong to the given department.
	Cached results are returned if available; otherwise, the data is fetched and cached.

	:param department_id: The department ID to filter users by.
	:return: List of user IDs belonging to the specified department.
	"""

	users = frappe.get_all("CG User", filters={"department_id": department_id}, fields=["name"])
	user_ids = [user["name"] for user in users]
	return user_ids


def get_date_range(interval: str, day: str | None = None) -> tuple[datetime.date, datetime.date]:
	today = datetime.today().date()
	intervals = {
		"Weekly": lambda: (
			today - timedelta(days=today.weekday()),
			today - timedelta(days=today.weekday()) + timedelta(days=4 if day == "Friday" else 5),
		),
		"Monthly": lambda: (
			today.replace(day=1),
			(today.replace(day=1) + timedelta(days=32)).replace(day=1) - timedelta(days=1),
		),
		"Yearly": lambda: (
			datetime.date(today.year, 1, 1),
			datetime.date(today.year, 12, 31),
		),
		"last_30_days": lambda: (today - timedelta(days=30), today),
	}
	try:
		return intervals[interval]()
	except KeyError:
		logger.error("Invalid interval specified: %s", interval)
		raise ValueError("Invalid interval specified. Use 'Weekly', 'Monthly', 'Yearly', or 'last_30_days'.")


def validate_file(filename, content_length):
	"""Validates the uploaded file."""
	if not filename:
		raise FileUploadError(_("No filename detected. Please provide a valid file."))
	if not allowed_file(filename):
		raise FileUploadError(
			_("Unsupported file type. Allowed file types: {}").format(", ".join(ALLOWED_EXTENSIONS))
		)
	if content_length > MAX_FILE_SIZE_MB * 1024 * 1024:
		raise FileUploadError(_("File size exceeds the allowed limit of {0} MB").format(MAX_FILE_SIZE_MB))


def allowed_file(filename: str) -> bool:
	"""Checks if the file type is allowed."""
	return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def generate_task_filename(filename, task_id):
	name, ext = os.path.splitext(filename)
	name = secure_filename(name)
	existing_files = frappe.get_all("File", filters={"attached_to_name": task_id}, fields=["file_name"])

	existing_filenames = [f["file_name"] for f in existing_files]
	pattern = re.compile(rf"^{re.escape(name)}\((\d+)\){task_id}\..+$")

	highest_index = 0
	for existing_file in existing_filenames:
		match = pattern.match(existing_file)
		if match:
			highest_index = max(highest_index, int(match.group(1)))
	new_index = highest_index + 1
	return f"{name}({new_index}){task_id}{ext}"


def handle_file_upload(task_doc, file_data):
	"""Handles file upload and attaches the file to the task document."""
	if not file_data:
		return

	filename = file_data["filename"]
	task_id = task_doc.name
	subtask_entry = frappe.get_value("CG Subtask", {"subtask_id": task_doc.name}, "parent_task_id")
	if subtask_entry:
		task_id = subtask_entry
	else:
		task_id = task_doc.name

	content_length = file_data["content_length"]
	file_content = file_data["content"]
	validate_file(filename, content_length)
	formatted_filename = generate_task_filename(filename, task_id)
	file_url = f"/files/{formatted_filename}"
	try:
		file_doc = frappe.get_doc(
			{
				"doctype": "File",
				"file_name": formatted_filename,
				"file_url": file_url,
				"content": file_content,
				"folder": "Home",
				"attached_to_doctype": task_doc.doctype,
				"attached_to_name": task_doc.name,
				"is_private": 1,
			}
		)
		file_doc.insert()
		frappe.db.commit()

		return file_doc
	except Exception as e:
		log_and_raise_error(f"File upload failed for file '{filename}': {str(e)}", FileUploadError)


def handle_file_uploads(tasks_data):
	"""Handles file uploads for tasks."""
	files_data = []
	for key, file in frappe.request.files.items():
		files = frappe.request.files.getlist(key)
		for file in files:
			if file:
				file_data = {
					"filename": secure_filename(file.filename),
					"content": file.read(),
					"content_length": len("content"),
				}
				files_data.append(file_data)

	return files_data


def handle_file_operation(task_doc, files_data, field_name, index):
	"""Attaches files dynamically to the specified field and updates JSON fields."""
	if not files_data or not field_name:
		return
		# frappe.throw("No file data to upload")

	def ensure_file_field(doc, field_name):
		"""Ensures the given field is a valid JSON structure and initializes if necessary."""
		field_value = doc.get(field_name)

		if isinstance(field_value, str):
			try:
				field_value = json.loads(field_value)
			except json.JSONDecodeError:
				field_value = {"files": []}

		if not isinstance(field_value, dict):
			field_value = {"files": []}

		if "files" not in field_value:
			field_value["files"] = []

		return field_value

	task_json_field = ensure_file_field(task_doc, field_name)
	parent_task = frappe.get_doc("CG Task Definition", task_doc.task_definition_id)
	parent_json_field = ensure_file_field(parent_task, field_name)
	subtasks = frappe.get_all(
		"CG Subtask",
		filters={"parent_task_id": task_doc.name},
		fields=["parent_task_id", "subtask_id"],
	)

	updated_files = []

	for file_data in files_data:
		try:
			if not isinstance(file_data, dict):
				raise TypeError(f"Expected dict for file_data, got {type(file_data)}")

			file_metadata = handle_file_upload(task_doc, file_data)
			if file_metadata:
				file_metadata_dict = {
					"filename": file_data["filename"],
					"file_url": file_metadata.file_url,
					"size": file_metadata.file_size,
					"type": file_metadata.file_type,
				}
				updated_files.append(file_metadata_dict)
				parent_file_doc = frappe.get_doc(
					{
						"doctype": "File",
						"file_name": file_data["filename"],
						"file_url": file_metadata.file_url,
						"attached_to_doctype": parent_task.doctype,
						"attached_to_name": parent_task.name,
						"is_private": 1,
					}
				)  # If it's not a subtask, use its own ID
				parent_file_doc.insert()
				frappe.db.commit()

				for subtask in subtasks:
					subtask_doc = frappe.get_doc("CG Task Instance", subtask["subtask_id"])
					subtask_json_field = ensure_file_field(subtask_doc, field_name)
					subtask_json_field["files"].append(file_metadata_dict)
					subtask_doc.set(field_name, json.dumps(subtask_json_field))
					subtask_doc.save()

					subtask_file_doc = frappe.get_doc(
						{
							"doctype": "File",
							"file_name": file_data["filename"],
							"file_url": file_metadata.file_url,
							"attached_to_doctype": subtask_doc.doctype,
							"attached_to_name": subtask_doc.name,
							"is_private": 1,
						}
					)
					subtask_file_doc.insert()
					frappe.db.commit()
		except Exception as e:
			file_name = file_data.get("filename", "unknown")
			print(file_name)
			frappe.log_error(f"File attachment failed for file '{file_name}': {str(e)}")
			raise FileUploadError(f"File attachment failed for file '{file_name}': {str(e)}")
	task_json_field["files"].extend(updated_files)
	parent_json_field["files"].extend(updated_files)
	task_doc.set(field_name, json.dumps(task_json_field))
	parent_task.set(field_name, json.dumps(parent_json_field))
	task_doc.save()
	parent_task.save()


def parse_datetime(value):
	"""Ensure the value is a datetime object. If it's a string, parse it."""
	if isinstance(value, datetime):
		return value
	if isinstance(value, str):
		return datetime.strptime(value, "%Y-%m-%d %H:%M:%S")
	return None


def round_off(value: float) -> str:
	"""Rounds the value to 2 decimal places and removes trailing zeroes."""
	return f"{round(value, 2):.2f}".rstrip("0").rstrip(".")


def round_off_int(value: float) -> int:
	"""Rounds the value to the nearest integer after rounding to 2 decimal places."""
	return int(round(value, 0))

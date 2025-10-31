import logging
from datetime import datetime

import frappe
from frappe import _
from frappe.exceptions import ValidationError

# from .tasks.task_utils import standard_response
from clapgrow_app.api.tasks.custom_exceptions import (  # Import from the new module
	CompanyNotFoundError,
	CustomError,
	DeletionError,
	FileUploadError,
	InvalidDataFormatError,
	InvalidDateError,
	InvalidTaskTypeError,
	PermissionError,
	RecurringTaskError,
	SubtaskCreationError,
	TagAdditionError,
	UserNotFoundError,
)

# Set up logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Mapping of exception classes to their messages and status codes
EXCEPTION_HANDLERS = {
	InvalidDataFormatError: ("Invalid data format.", 400),
	InvalidDateError: ("Invalid date provided.", 400),
	InvalidTaskTypeError: ("Invalid task type.", 400),
	FileUploadError: ("File upload error.", 500),
	TagAdditionError: ("Error adding tags.", 500),
	SubtaskCreationError: ("Subtask creation error.", 500),
	UserNotFoundError: ("User not found.", 404),
	CompanyNotFoundError: ("Company not found.", 404),
	RecurringTaskError: ("Recurring task error.", 500),
	PermissionError: ("Permission denied.", 403),
	CustomError: ("Unexpected error occurred", 500),
	ValidationError: ("Validation error occurred.", 422),
}


def handle_exception(e: Exception) -> dict:
	exception_type = type(e)
	message, status_code = EXCEPTION_HANDLERS.get(exception_type, (str(e), 500))

	logger.error("Error: %s, Code: %d", message, status_code)
	return standard_response(success=False, message=message, status_code=status_code)


# Logging and Raising Errors
def log_and_raise_error(message: str, error_class: CustomError | None = None, details: dict | None = None):
	log_message = f"{message}. Details: {details}" if details else message
	logger.error(log_message)
	frappe.log_error(log_message, _("Error"))
	if error_class:
		raise error_class(message)


# Standard API Response Functions
def standard_response(
	success: bool,
	message: str,
	data: dict | list | None = None,
	tasks: dict | list | None = None,
	errors: dict | None = None,
	metadata: dict | None = None,
	status_code: int = 200,
) -> dict:
	"""
	Generates a standardized API response with optional metadata.

	Args:
	    success (bool): Indicates if the request was successful.
	    message (str): A descriptive message.
	    data (Optional[Union[Dict, list]]): Data for the response.
	    errors (Optional[Dict]): Errors for the response.
	    metadata (Optional[Dict]): Additional information.
	    status_code (int): HTTP status code.

	Returns:
	    dict: Structured API response.
	"""
	frappe.local.response["http_status_code"] = status_code
	response = {
		"status": "success" if success else "error",
		"message": message,
		"timestamp": datetime.now().isoformat(),
	}
	if data:
		response["data"] = data
	if tasks:
		response["tasks"] = tasks
	if errors:
		response["errors"] = errors
	if metadata:
		response["metadata"] = metadata

	return response, status_code


def error_response(message: str, error_code: int, error: dict | None = None) -> dict:
	"""Generates a standard error response.

	Args:
	    message (str): The error message.
	    error_code (int): The HTTP error code.

	Returns:
	    dict[str, Any]: A dictionary containing the error response.
	"""
	frappe.local.response["http_status_code"] = error_code
	return standard_response(
		success=False,
		message=message,
		data={
			"status": "error",
			"code": error_code,
			"message": message,
			"errors": error if error else [message],
		},
		status_code=error_code,
	)


def success_response(
	message: str,
	status_code: int = 200,
	task_name: str | None = None,
	total_docs: dict | None = None,
) -> dict:
	"""Generates a success response for a created task.

	Args:
	    task_name (str): The name of the task.
	    message (str): A success message.
	    status_code (int): HTTP status code for the response.

	Returns:
	    dict: The structured success response.
	"""
	data = {}
	frappe.local.response["http_status_code"] = status_code
	if not (not task_name):
		data["task_name"] = task_name
	if not (not total_docs):
		data["total_docs"] = total_docs

	# Call standard_response with the updated data dictionary
	return standard_response(
		success=True,
		message=message,
		data=data,
		status_code=status_code,
	)

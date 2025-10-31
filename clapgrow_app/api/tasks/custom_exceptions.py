class CustomError(Exception):
	"""Base class for all custom exceptions."""

	pass


class InvalidDataFormatError(CustomError):
	"""Raised when the data format is invalid."""

	pass


class InvalidDateError(CustomError):
	"""Raised for invalid dates."""

	pass


class InvalidTaskTypeError(CustomError):
	"""Raised when an invalid task type is encountered."""

	pass


class FileUploadError(CustomError):
	"""Raised during file upload errors."""

	pass


class TagAdditionError(CustomError):
	"""Raised when there's an error adding tags."""

	pass


class SubtaskCreationError(CustomError):
	"""Raised when a subtask creation fails."""

	pass


class UserNotFoundError(CustomError):
	"""Raised when the user is not found."""

	pass


class CompanyNotFoundError(CustomError):
	"""Raised when the company is not found."""

	pass


class RecurringTaskError(CustomError):
	"""Raised for recurring task-related issues."""

	pass


class PermissionError(CustomError):
	"""Raised for permission errors."""

	pass


class DeletionError(CustomError):
	"""Raised for deletion-related errors."""

	pass


class DatabaseError(CustomError):
	"""Raised for database-related issues."""

	pass


class ValidationError(CustomError):
	"""Raised for validation errors."""

	pass


class ExternalServiceError(CustomError):
	"""Raised for errors while interacting with external services."""

	pass

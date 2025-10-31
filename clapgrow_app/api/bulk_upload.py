import json
import re
import time
from typing import Any

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now, validate_email_address


def process_bulk_users(users_data: list[dict], company_id: str) -> dict[str, Any]:
	"""
	Process bulk user creation with optimized throttling bypass and batch processing.
	Args:
	    users_data (list): list of user objects.
	    company_id (str): Company ID of the current user.
	Returns:
	    dict: Result with created users, skipped users, and errors.
	"""
	created_users = []
	skipped_users = []
	errors = []

	# Get job_id from RQ context
	job_id = None
	try:
		from rq import get_current_job

		current_job = get_current_job()
		if current_job:
			job_id = current_job.id
	except (ImportError, AttributeError):
		# RQ not available or not in job context, fallback
		job_id = "unknown"

	# Set context flags
	frappe.local.bulk_upload = True
	frappe.local.skip_user_throttle = True
	frappe.local.skip_cg_user_triggers = False
	frappe.flags.ignore_permissions = True
	frappe.local.current_job_id = job_id

	# Initialize progress
	if job_id and job_id != "unknown":
		_update_job_progress(job_id, 5, 0, 0, status="initializing")

	# Cache validation data
	validation_cache = _prepare_validation_cache()

	if job_id and job_id != "unknown":
		_update_job_progress(job_id, 10, 0, 0, status="validating")

	try:
		batch_size = 10
		total_batches = len(users_data) // batch_size + (1 if len(users_data) % batch_size else 0)

		for batch_idx in range(total_batches):
			batch_start = batch_idx * batch_size
			batch_end = min(batch_start + batch_size, len(users_data))
			batch = users_data[batch_start:batch_end]

			batch_results = _process_user_batch(batch, company_id, validation_cache, batch_start + 1)
			created_users.extend(batch_results["created"])
			skipped_users.extend(batch_results["skipped"])
			errors.extend(batch_results["errors"])

			# Update progress with correct calculation (10% to 95%)
			if job_id and job_id != "unknown":
				base_progress = 10
				processing_range = 85  # 95 - 10
				progress = base_progress + (batch_idx + 1) / total_batches * processing_range
				_update_job_progress(
					job_id,
					progress,
					len(created_users),
					len(errors),
					status="processing",
				)

			# Small delay between batches
			if batch_idx < total_batches - 1:
				time.sleep(0.1)

		frappe.db.commit()  # manual commit

	except Exception as e:
		frappe.db.rollback()
		errors.append(f"Bulk upload failed: {str(e)}")
		frappe.log_error(message=str(e), title="Bulk User Upload Error")

	finally:
		frappe.local.bulk_upload = False
		frappe.local.skip_user_throttle = False
		frappe.local.skip_cg_user_triggers = False
		frappe.flags.ignore_permissions = False

	# Determine final status
	status = (
		"success"
		if created_users and not errors
		else "failed"
		if errors and not created_users
		else "partial_success"
	)

	result = {
		"status": status,
		"created_users": created_users,
		"skipped_users": skipped_users,
		"errors": errors,
		"total_processed": len(users_data),
		"completed_at": now(),
	}

	# Store final result and mark as completed
	if job_id and job_id != "unknown":
		frappe.cache().set_value(f"bulk_upload_job:{job_id}", result, expires_in_sec=7200)
		_update_job_progress(
			job_id,
			100,
			len(created_users),
			len(errors),
			status="completed",
			completed=True,
		)

	return result


def _prepare_validation_cache() -> dict[str, dict]:
	"""Prepare cached validation data for performance optimization."""
	return {
		"branches": {
			doc.branch_name: doc.name for doc in frappe.get_all("CG Branch", fields=["name", "branch_name"])
		},
		"departments": {
			doc.department_name: doc.name
			for doc in frappe.get_all("CG Department", fields=["name", "department_name"])
		},
		"roles": {doc.role_name: doc.name for doc in frappe.get_all("CG Role", fields=["name", "role_name"])},
		"existing_emails": set(
			email[0] for email in frappe.db.sql("SELECT email FROM `tabCG User`", as_list=True)
		),
	}


def _process_user_batch(
	batch: list[dict], company_id: str, validation_cache: dict, start_index: int
) -> dict[str, list]:
	"""Process a batch of users with enhanced error handling and type safety."""
	created = []
	skipped = []
	errors = []

	for index, user_data in enumerate(batch, start=start_index):
		try:
			# Ensure user_data is a dictionary and contains valid data
			if not isinstance(user_data, dict):
				errors.append(
					f"Row {index}: Invalid data format - expected dictionary, got {type(user_data)}"
				)
				continue

			# Quick validation check
			validation_result = _validate_user_data(user_data, index, validation_cache)
			if not validation_result["valid"]:
				if validation_result["skip"]:
					skipped.append(validation_result["email"])
				errors.extend(validation_result["errors"])
				continue

			# Create user with bypass flags
			user_doc = _create_user_document(validation_result["data"], company_id)
			created.append(user_doc.email)

		except Exception as e:
			error_msg = f"Row {index}: Failed to create user - {str(e)}"
			errors.append(error_msg)
			frappe.log_error(
				message=f"{error_msg}\nUser data: {user_data}",
				title="Bulk User Upload Error",
			)

	return {"created": created, "skipped": skipped, "errors": errors}


def _validate_user_data(user_data: dict, index: int, cache: dict) -> dict[str, Any]:
	"""Optimized user data validation with caching."""
	# Check required fields
	if not user_data.get("first_name") or not user_data.get("email"):
		return {
			"valid": False,
			"skip": True,
			"errors": [f"Row {index}: Skipped - Missing first_name or email"],
			"email": user_data.get("email", "unknown"),
		}

	# Validate and clean email
	email = _clean_email(user_data.get("email"))
	if not validate_email_address(email, throw=False):
		return {
			"valid": False,
			"skip": False,
			"errors": [f"Row {index}: Invalid email format for {email}"],
			"email": email,
		}

	# Check for existing CG User (using cache)
	if email in cache["existing_emails"]:
		return {
			"valid": False,
			"skip": True,
			"errors": [f"Row {index}: Skipped - User with email {email} already exists"],
			"email": email,
		}

	# Check for existing core User
	if frappe.db.exists("User", email):
		return {
			"valid": False,
			"skip": True,
			"errors": [f"Row {index}: Skipped - Core User with email {email} already exists"],
			"email": email,
		}

	# Validate other fields
	validation_errors = _validate_user_fields(user_data, index, cache)
	if validation_errors:
		return {
			"valid": False,
			"skip": False,
			"errors": validation_errors,
			"email": email,
		}

	# Prepare cleaned data
	cleaned_data = _prepare_user_data(user_data, cache, email)

	return {"valid": True, "data": cleaned_data, "email": email, "errors": []}


def _clean_email(email: str) -> str:
	"""Clean and normalize email address."""
	email = email.strip().lower()
	return re.sub(
		r"@clapgrow\.com.*?(yahoo\.com|hotmail\.com|gmail\.com|.*?\.org|.*?\.net|.*?\.biz|.*?\.info|.*?\.com)",
		r"@\1",
		email,
	)


def _validate_user_fields(user_data: dict, index: int, cache: dict) -> list[str]:
	"""Validate individual user fields with enhanced type checking."""
	errors = []

	# Required fields validation with type conversion
	required_fields = [
		"first_name",
		"email",
		"phone",
		"branch_id",
		"department_id",
		"role",
	]
	for field in required_fields:
		field_value = user_data.get(field)
		if not field_value or not str(field_value).strip():
			errors.append(f"Row {index}: Missing required field {field}")

	if errors:  # Skip further validation if required fields are missing
		return errors

	# Phone validation with type conversion
	phone = str(user_data.get("phone", "")).strip()
	if not re.match(r"^\+?[1-9]\d{9,14}$", phone):
		errors.append(f"Row {index}: Invalid phone number format for {phone}")

	# Name validation with type conversion
	name_regex = r"^[a-zA-Z\s]+$"
	first_name = str(user_data.get("first_name", "")).strip()
	last_name = str(user_data.get("last_name", "")).strip()

	if not re.match(name_regex, first_name):
		errors.append(f"Row {index}: Invalid first name {first_name}")
	if last_name and not re.match(name_regex, last_name):
		errors.append(f"Row {index}: Invalid last name {last_name}")

	# Numeric field validation with proper type conversion
	try:
		ctc = float(user_data.get("ctc", 0))
		cost_per_hour = float(user_data.get("cost_per_hour", 0))

		if ctc < 0 or ctc > 100000000:
			errors.append(f"Row {index}: CTC must be between 0 and 100,000,000")
		if cost_per_hour < 0 or cost_per_hour > 10000:
			errors.append(f"Row {index}: Cost per hour must be between 0 and 10,000")
		if ctc < cost_per_hour:
			errors.append(f"Row {index}: CTC must be greater than or equal to cost per hour")
	except (ValueError, TypeError) as e:
		errors.append(f"Row {index}: Invalid numeric values for CTC or cost per hour: {str(e)}")

	# Linked field validation with type conversion
	branch_id = cache["branches"].get(
		str(user_data.get("branch_id", "")), str(user_data.get("branch_id", ""))
	)
	department_id = cache["departments"].get(
		str(user_data.get("department_id", "")), str(user_data.get("department_id", ""))
	)
	role = cache["roles"].get(str(user_data.get("role", "")), str(user_data.get("role", "")))

	if not frappe.db.exists("CG Branch", branch_id):
		errors.append(f"Row {index}: Invalid branch_id {user_data.get('branch_id')}")
	if not frappe.db.exists("CG Department", department_id):
		errors.append(f"Row {index}: Invalid department_id {user_data.get('department_id')}")
	if not frappe.db.exists("CG Role", role):
		errors.append(f"Row {index}: Invalid role {user_data.get('role')}")

	# Report to validation with type conversion
	report_to = user_data.get("report_to")
	if report_to:
		report_to_email = str(report_to).strip()
		if report_to_email and not frappe.db.exists("CG User", {"email": report_to_email}):
			errors.append(f"Row {index}: Invalid report_to email {report_to_email}")

	return errors


def _prepare_user_data(user_data: dict, cache: dict, email: str) -> dict[str, Any]:
	"""Prepare cleaned user data for document creation with proper type handling."""
	phone = str(user_data.get("phone", "")).strip()
	if not phone.startswith("+"):
		phone = f"+91-{phone}"

	branch_id = cache["branches"].get(user_data.get("branch_id"), user_data.get("branch_id"))
	department_id = cache["departments"].get(user_data.get("department_id"), user_data.get("department_id"))
	role = cache["roles"].get(user_data.get("role"), user_data.get("role"))

	# Ensure all string fields are properly converted and cleaned
	return {
		"first_name": str(user_data.get("first_name", "")).strip(),
		"last_name": str(user_data.get("last_name", "")).strip(),
		"email": str(email).strip().lower(),
		"phone": phone,
		"designation": str(user_data.get("designation", "")).strip(),
		"branch_id": str(branch_id).strip(),
		"department_id": str(department_id).strip(),
		"role": str(role).strip(),
		"ctc": float(user_data.get("ctc", 0)),
		"cost_per_hour": float(user_data.get("cost_per_hour", 0)),
		"report_to": (str(user_data.get("report_to", "")).strip() if user_data.get("report_to") else ""),
	}


def _create_user_document(user_data: dict, company_id: str) -> Document:
	"""Create user document with proper data structure handling."""
	try:
		# Prepare report_to list
		report_to_list = []
		if user_data.get("report_to") and str(user_data["report_to"]).strip():
			report_to_email = str(user_data["report_to"]).strip()
			if frappe.db.exists("CG User", {"email": report_to_email}):
				report_to_list.append({"superior": report_to_email})

		# Prepare payload
		payload = {
			"doctype": "CG User",
			"first_name": str(user_data.get("first_name", "")).strip(),
			"last_name": str(user_data.get("last_name", "")).strip(),
			"email": str(user_data.get("email", "")).strip().lower(),
			"phone": str(user_data.get("phone", "")).strip(),
			"designation": str(user_data.get("designation", "")).strip(),
			"branch_id": str(user_data.get("branch_id", "")).strip(),
			"department_id": str(user_data.get("department_id", "")).strip(),
			"role": str(user_data.get("role", "")).strip(),
			"company_id": str(company_id).strip(),
			"ctc": float(user_data.get("ctc", 0)),
			"cost_per_hour": float(user_data.get("cost_per_hour", 0)),
			"enabled": 1,
			"is_super_admin": 0,
			"report_to": report_to_list,
		}

		# Handle phone number formatting
		if not payload["phone"].startswith("+"):
			payload["phone"] = f"+91-{payload['phone']}"

		# Create and insert document
		doc = frappe.get_doc(payload)
		doc.flags.ignore_permissions = True
		doc.flags.ignore_links = False
		doc.flags.ignore_mandatory = False

		if getattr(frappe.local, "bulk_upload", False):
			doc.flags.ignore_validate = False

		doc.insert()
		return doc

	except Exception as e:
		frappe.log_error(
			message=f"Error creating user document for {user_data.get('email', 'unknown')}: {str(e)}",
			title="Bulk Upload User Creation Error",
		)
		raise


def _update_job_progress(
	job_id: str,
	progress: float,
	created_count: int,
	error_count: int,
	status: str = "processing",
	completed: bool = False,
):
	"""Update job progress in cache."""
	progress_data = {
		"progress": round(min(progress, 100), 2),  # Ensure progress doesn't exceed 100
		"created_count": created_count,
		"error_count": error_count,
		"status": status,
		"completed": completed,
		"updated_at": now(),
	}

	# Store both progress and job status
	frappe.cache().set_value(f"bulk_upload_progress:{job_id}", progress_data, expires_in_sec=7200)

	# Log progress for debugging
	frappe.logger().info(
		f"Job {job_id}: {progress:.1f}% complete, {created_count} created, {error_count} errors"
	)


@frappe.whitelist(allow_guest=False)
def bulk_upload_users(users_data: str) -> dict[str, Any]:
	"""
	API to enqueue bulk upload of CG User records with enhanced throttling bypass.
	"""
	try:
		users = json.loads(users_data)
		if not isinstance(users, list):
			frappe.throw(_("Invalid input format. Expected an array of users."))

		if len(users) > 1000:  # Reasonable limit
			frappe.throw(_("Maximum 1000 users allowed per batch."))

		# Get current user's company_id
		current_user = frappe.get_doc("CG User", {"email": frappe.session.user})
		company_id = current_user.company_id

		# Enqueue with higher timeout and long queue
		job = frappe.enqueue(
			"clapgrow_app.api.bulk_upload.process_bulk_users",
			users_data=users,
			company_id=company_id,
			queue="long",
			timeout=14400,  # 4 hours
			job_name=f"Bulk User Upload - {len(users)} users",
		)

		# Initialize progress tracking
		_update_job_progress(job.id, 0, 0, 0, status="enqueued")

		return {
			"status": "enqueued",
			"job_id": job.id,
			"user_count": len(users),
			"message": f"Bulk upload of {len(users)} users has been enqueued. Processing will complete shortly.",
		}

	except Exception as e:
		frappe.db.rollback()
		frappe.log_error(message=str(e), title="Bulk User Upload Enqueue Error")
		frappe.throw(_("Failed to enqueue bulk upload: {0}").format(str(e)))


@frappe.whitelist(allow_guest=False)
def get_upload_status(job_id: str) -> dict[str, Any]:
	"""API to check the status of a bulk upload job with progress information."""
	try:
		# Check for completed results first
		result = frappe.cache().get_value(f"bulk_upload_job:{job_id}")
		if result:
			return result

		# Check for progress information
		progress = frappe.cache().get_value(f"bulk_upload_progress:{job_id}")
		if progress:
			return {
				"status": progress.get("status", "processing"),
				"progress": progress.get("progress", 0),
				"created_count": progress.get("created_count", 0),
				"error_count": progress.get("error_count", 0),
				"completed": progress.get("completed", False),
				"message": f"Processing... {progress.get('progress', 0):.1f}% complete",
			}

		return {
			"status": "pending",
			"created_users": [],
			"skipped_users": [],
			"errors": ["Job is still initializing or has expired."],
			"message": "Job is pending or not found.",
		}

	except Exception as e:
		frappe.log_error(message=str(e), title="Bulk Upload Status Error")
		frappe.throw(_("Failed to fetch job status: {0}").format(str(e)))


@frappe.whitelist(allow_guest=False)
def get_upload_progress(job_id: str) -> dict[str, Any]:
	"""API to get real-time progress of bulk upload job."""
	try:
		# Check for progress information first
		progress = frappe.cache().get_value(f"bulk_upload_progress:{job_id}")
		if progress:
			return {
				"progress": progress.get("progress", 0),
				"created_count": progress.get("created_count", 0),
				"error_count": progress.get("error_count", 0),
				"status": progress.get("status", "processing"),
				"completed": progress.get("completed", False),
				"updated_at": progress.get("updated_at"),
			}

		# Check if job is completed
		result = frappe.cache().get_value(f"bulk_upload_job:{job_id}")
		if result:
			return {
				"progress": 100,
				"created_count": len(result.get("created_users", [])),
				"error_count": len(result.get("errors", [])),
				"status": result.get("status"),
				"completed": True,
			}

		return {
			"progress": 0,
			"created_count": 0,
			"error_count": 0,
			"status": "not_found",
			"completed": False,
			"message": "Job not found or expired",
		}

	except Exception as e:
		frappe.log_error(message=str(e), title="Bulk Upload Progress Error")
		return {
			"error": str(e),
			"progress": 0,
			"created_count": 0,
			"error_count": 0,
			"status": "error",
			"completed": False,
		}

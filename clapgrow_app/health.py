import frappe


@frappe.whitelist(allow_guest=True)
def check():
	"""
	Health check endpoint to verify the application and database status.
	Returns a JSON response with status and details.
	"""
	try:
		# Check database connectivity
		frappe.db.sql("SELECT 1")
		db_status = "ok"
	except Exception as e:
		db_status = f"error: {str(e)}"
		frappe.log_error(f"Health check failed: {str(e)}", "Health Check")

	# Prepare response
	health_status = {
		"status": "healthy" if db_status == "ok" else "unhealthy",
		"details": {"server": "ok", "database": db_status},
	}

	return health_status

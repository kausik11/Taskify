import frappe
from frappe.utils import now


def notify_on_user_creation_safe(doc, method):
	"""
	Safe wrapper for WhatsApp notification that handles bulk uploads gracefully.
	Replace your hook to use this function instead of the direct notification.
	"""
	try:
		# Skip WhatsApp notifications during bulk upload to improve performance
		if getattr(frappe.local, "bulk_upload", False):
			# Queue notifications for later processing
			if not hasattr(frappe.local, "_queued_whatsapp_notifications"):
				frappe.local._queued_whatsapp_notifications = []

			frappe.local._queued_whatsapp_notifications.append(
				{"user_email": doc.email, "user_name": doc.full_name, "created_at": now()}
			)
			return

		# Call the original notification function for normal operations
		try:
			from clapgrow_app.api.whatsapp.notify import notify_on_user_creation

			return notify_on_user_creation(doc, method)
		except ImportError as e:
			frappe.log_error(f"WhatsApp notify module not found: {str(e)}")

	except Exception as e:
		# Log error but don't fail the user creation process
		frappe.log_error(
			message=f"WhatsApp notification failed for user {doc.email}: {str(e)}",
			title="WhatsApp Notification Error",
		)


def process_queued_whatsapp_notifications():
	"""
	Process any queued WhatsApp notifications after bulk upload completes.
	"""
	try:
		if not hasattr(frappe.local, "_queued_whatsapp_notifications"):
			return

		notifications = frappe.local._queued_whatsapp_notifications
		frappe.local._queued_whatsapp_notifications = []

		if not notifications:
			return

		frappe.logger().info(f"Processing {len(notifications)} queued WhatsApp notifications")

		# Import the original notification function
		try:
			from clapgrow_app.api.whatsapp.notify import notify_on_user_creation
		except ImportError:
			frappe.log_error("WhatsApp notify module not available for queued notifications")
			return

		# Process notifications in smaller batches to avoid overwhelming the system
		batch_size = 5
		for i in range(0, len(notifications), batch_size):
			batch = notifications[i : i + batch_size]

			for notification in batch:
				try:
					# Create a minimal doc-like object for the notification
					class MockDoc:
						def __init__(self, email, full_name):
							self.email = email
							self.full_name = full_name

					mock_doc = MockDoc(notification["user_email"], notification["user_name"])
					notify_on_user_creation(mock_doc, None)

				except Exception as e:
					frappe.log_error(
						message=f"Failed to send queued WhatsApp notification for {notification['user_email']}: {str(e)}",
						title="Queued WhatsApp Notification Error",
					)

			# Small delay between batches
			import time

			time.sleep(0.5)

	except Exception as e:
		frappe.log_error(
			message=f"Error processing queued WhatsApp notifications: {str(e)}",
			title="WhatsApp Notification Queue Error",
		)

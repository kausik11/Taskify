import frappe
from frappe import _


@frappe.whitelist(methods=["POST"])
def create_form(data):
	"""
	API to create a Custom Doctype in Frappe, and add a row in Clapgrow Routing Configuration
	:param data: JSON object containing the form data
	"""
	try:
		if isinstance(data, str):
			data = frappe.parse_json(data)

		# Check if DocType already exists
		doctype_name = data.get("name")
		if frappe.db.exists("DocType", doctype_name):
			frappe.throw(
				_("DocType '{0}' already exists. Please use a different name.").format(doctype_name),
				frappe.DuplicateEntryError,
			)

		# Create the DocType
		doc = frappe.get_doc({"doctype": "DocType", "custom": 1, **data})
		doc.insert()
		frappe.db.commit()  # Commit DocType creation before updating routing

		url = "_".join(doc.name.split(" ")).lower()

		# Add a row in Clapgrow Routing Configuration
		routing_config = frappe.get_single("Clapgrow Routing Configuration")

		# Check if routing entry already exists
		routing_exists = any(row.doctype_name == doc.name for row in routing_config.routing)

		if not routing_exists:
			routing_config.append(
				"routing",
				{
					"type": "Link",
					"label": doc.name,
					"doctype_name": doc.name,
					"column": 1,
					"url": url,
				},
			)

			routing_config.save()
			frappe.db.commit()

		return doc.as_dict()

	except frappe.DuplicateEntryError:
		frappe.db.rollback()
		frappe.log_error(frappe.get_traceback(), "create_form - Duplicate DocType")
		raise
	except Exception as e:
		frappe.db.rollback()
		frappe.log_error(frappe.get_traceback(), "create_form failed")
		raise e


@frappe.whitelist(methods=["GET"])
def get_doctype_routing_map():
	"""
	API to get the routing map of all custom doctypes whose type is 'Link' and hide is false in the Clapgrow Routing Configuration.
	"""
	routing_config = frappe.get_single("Clapgrow Routing Configuration")
	routing_map = {}

	for row in routing_config.routing:
		if not row.hide:
			routing_map[row.doctype_name] = {
				"label": row.label,
				"doctype": row.doctype_name,
				"url": row.url,
				"list_props": row.list_props,
			}

	return routing_map


@frappe.whitelist(methods=["POST"])
def delete_form(docname):
	"""
	Delete a DocType of name `docname`
	Update the Clapgrow Routing Configuration to remove the corresponding row
	Check if any workflows are using this DocType and delete them if necessary
	"""
	try:
		workflows = frappe.get_all(
			"Clapgrow Workflow",
			filters={"event_doctype": docname},
		)

		if workflows:
			for workflow in workflows:
				frappe.db.delete("Clapgrow Workflow", workflow.name)

		# update routing configuration
		routing_config = frappe.get_single("Clapgrow Routing Configuration")
		for row in routing_config.routing:
			if row.doctype_name == docname:
				routing_config.routing.remove(row)
				break
		routing_config.save()

		# delete the DocType
		frappe.db.delete("DocType", docname)

	except Exception as e:
		frappe.log_error(f"Error in delete_form: {str(e)}")
		frappe.db.rollback()
		raise e


@frappe.whitelist(methods=["POST"])
def update_title(doctype, docname, name, merge=0):
	"""
	API to update the title of a DocType and optionally merge it with an existing one.
	"""
	from frappe.model.rename_doc import update_document_title

	update_document_title(
		doctype=doctype,
		docname=docname,
		name=name,
		merge=merge,
	)

	if doctype == "DocType":
		# If the DocType is being renamed, update the routing configuration
		routing_config = frappe.get_single("Clapgrow Routing Configuration")
		for row in routing_config.routing:
			if row.doctype_name == docname:
				row.doctype_name = name
				row.label = name
				row.url = "_".join(name.split(" ")).lower()
				break
		routing_config.save()


@frappe.whitelist(methods=["GET"])
def check_user_permission_for_form(doctype):
	"""
	Check if the current user is System Manager or CG-Admin
	"""

	user = frappe.session.user
	have_permission = (
		user == "Administrator"
		or "System Manager" in frappe.get_roles(user)
		or "CG-Admin" in frappe.get_roles(user)
	)

	if have_permission:
		return True
	else:
		# check if the doctype is associated with any workflow
		workflows = frappe.get_all("Clapgrow Workflow", filters={"event_doctype": doctype}, pluck="name")

		doers = set()
		for workflow in workflows:
			doc = frappe.get_doc("Clapgrow Workflow", workflow)
			for doer in doc.workflow_doers:
				doers.add(doer.doer)

		if user not in doers:
			frappe.throw(_("You don't have permission to access this form", frappe.PermissionError))


@frappe.whitelist(methods=["POST"])
def cleanup_invalid_routing_entries():
	"""
	Utility function to clean up routing entries that reference non-existent DocTypes.
	This helps fix link validation errors.
	"""
	try:
		routing_config = frappe.get_single("Clapgrow Routing Configuration")
		invalid_entries = []

		# Find all routing entries with invalid DocType references
		for idx, row in enumerate(routing_config.routing):
			if row.doctype_name and not frappe.db.exists("DocType", row.doctype_name):
				invalid_entries.append({"idx": idx, "doctype_name": row.doctype_name, "label": row.label})

		# Remove invalid entries (in reverse order to maintain indices)
		for entry in reversed(invalid_entries):
			routing_config.routing.pop(entry["idx"])

		if invalid_entries:
			routing_config.save()
			frappe.db.commit()

			return {
				"success": True,
				"message": _("Cleaned up {0} invalid routing entries").format(len(invalid_entries)),
				"removed_entries": invalid_entries,
			}
		else:
			return {"success": True, "message": _("No invalid routing entries found"), "removed_entries": []}

	except Exception as e:
		frappe.db.rollback()
		frappe.log_error(frappe.get_traceback(), "cleanup_invalid_routing_entries failed")
		raise e

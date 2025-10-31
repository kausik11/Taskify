import frappe
from frappe import _


@frappe.whitelist()
def get_workflow_process_data(task_name):
	"""
	Get complete workflow process data for a given task
	Returns the original document, execution log, and all related tasks
	"""
	try:
		# Get task mapping
		task_mapping = frappe.db.get_value(
			"Clapgrow Workflow Task Mapping",
			{"task_name": task_name},
			["execution_log", "workflow", "node", "node_index"],
			as_dict=True,
		)

		if not task_mapping:
			return {"error": "Task mapping not found"}

		# Get execution log
		execution_log = frappe.get_doc("Clapgrow Workflow Execution Log", task_mapping.execution_log)

		# Get all task mappings for the same execution log
		all_task_mappings = frappe.get_all(
			"Clapgrow Workflow Task Mapping",
			filters={"execution_log": task_mapping.execution_log},
			fields=["task_name", "workflow", "node", "node_index"],
			order_by="node_index asc",
		)

		# Get all related tasks
		task_names = [mapping.task_name for mapping in all_task_mappings]
		related_tasks = frappe.get_all("CG Task Instance", filters={"name": ["in", task_names]}, fields=["*"])

		# Combine tasks with mapping data
		workflow_tasks = []
		for task in related_tasks:
			mapping = next((m for m in all_task_mappings if m.task_name == task.name), None)
			if mapping:
				task.update({"node_name": mapping.node, "node_index": mapping.node_index})
			workflow_tasks.append(task)

		# Sort by node index
		workflow_tasks.sort(key=lambda x: x.get("node_index", 0))

		# Get original document
		original_doc = None
		if execution_log.event_doctype and execution_log.docname:
			try:
				original_doc = frappe.get_doc(execution_log.event_doctype, execution_log.docname).as_dict()
			except Exception as e:
				frappe.log_error(f"Error fetching original document: {str(e)}")

		# Get workflow details
		workflow = frappe.get_doc("Clapgrow Workflow", task_mapping.workflow)

		return {
			"success": True,
			"data": {
				"execution_log": execution_log.as_dict(),
				"workflow_tasks": workflow_tasks,
				"original_document": original_doc,
				"workflow": workflow.as_dict(),
				"current_task_mapping": task_mapping,
			},
		}

	except Exception as e:
		frappe.log_error(f"Error in get_workflow_process_data: {str(e)}")
		return {"error": str(e)}


@frappe.whitelist()
def get_workflow_node_details(workflow_name):
	"""
	Get all node details for a workflow
	"""
	try:
		workflow = frappe.get_doc("Clapgrow Workflow", workflow_name)

		node_details = []
		for node in workflow.nodes:
			node_type = frappe.get_doc("Clapgrow Node Type", node.node)
			node_details.append(
				{
					"idx": node.idx,
					"node_name": node.node,
					"node_type": node_type.as_dict(),
					"condition": node.condition if hasattr(node, "condition") else None,
					"next_node": node.next_node if hasattr(node, "next_node") else None,
				}
			)

		return {"success": True, "data": {"workflow": workflow.as_dict(), "nodes": node_details}}

	except Exception as e:
		frappe.log_error(f"Error in get_workflow_node_details: {str(e)}")
		return {"error": str(e)}


@frappe.whitelist()
def get_document_formatted_data(doctype, docname):
	"""
	Get formatted document data excluding system fields
	"""
	try:
		doc = frappe.get_doc(doctype, docname)
		doc_dict = doc.as_dict()

		# System fields to exclude
		system_fields = [
			"name",
			"creation",
			"modified",
			"modified_by",
			"owner",
			"docstatus",
			"doctype",
			"idx",
			"_user_tags",
			"_comments",
			"_assign",
			"_liked_by",
		]

		# Get meta to understand field types and labels
		meta = frappe.get_meta(doctype)
		field_map = {field.fieldname: field.label for field in meta.fields}

		formatted_data = []
		for key, value in doc_dict.items():
			if key not in system_fields and value is not None and value != "" and not key.startswith("_"):
				formatted_data.append(
					{
						"fieldname": key,
						"label": field_map.get(key, key.replace("_", " ").title()),
						"value": value,
						"formatted_value": format_field_value(value, key, meta),
					}
				)

		return {
			"success": True,
			"data": {"document": doc_dict, "formatted_fields": formatted_data, "doctype_label": meta.name},
		}

	except Exception as e:
		frappe.log_error(f"Error in get_document_formatted_data: {str(e)}")
		return {"error": str(e)}


def format_field_value(value, fieldname, meta):
	"""
	Format field value based on field type
	"""
	try:
		field = next((f for f in meta.fields if f.fieldname == fieldname), None)
		if not field:
			return str(value)

		if field.fieldtype == "Date":
			return frappe.utils.formatdate(value)
		elif field.fieldtype == "Datetime":
			return frappe.utils.format_datetime(value)
		elif field.fieldtype == "Currency":
			return frappe.utils.fmt_money(value)
		elif field.fieldtype == "Percent":
			return f"{value}%"
		elif field.fieldtype == "Link":
			return str(value)
		elif field.fieldtype in ["Text", "Small Text", "Long Text"]:
			return str(value)[:200] + "..." if len(str(value)) > 200 else str(value)
		else:
			return str(value)

	except Exception:
		return str(value)

import json

import frappe
from frappe import _
from frappe.utils import get_fullname

from clapgrow_app.api.timeline.get_docinfo import get_docinfo


@frappe.whitelist()
def get_timeline_data(doctype, docname):
	user_info = {}
	comments = []
	assignments_logs = []
	assignments = []
	attachment_logs = []
	info_logs = []
	like_logs = []
	workflow_logs = []
	communications = []
	automated_messages = []
	versions = []
	views = []
	creation_data = []
	modified_data = []

	# Get the primary document
	primary_doc = frappe.get_doc(doctype, docname)

	creation_data = get_content_for_creation(primary_doc, docname)

	modified_data = get_content_for_modified(primary_doc, docname)

	get_docinfo(doctype=doctype, name=docname)
	docinfo = frappe.response.get("docinfo", {})

	if docinfo:
		comments += [{**i, "type": "Comment"} for i in docinfo.get("comments", [])]
		assignments_logs += [{**i, "type": "Assignment"} for i in docinfo.get("assignment_logs", [])]
		assignments += [{**i, "type": "Task"} for i in docinfo.get("assignments", [])]
		attachment_logs += [{**i, "type": "Attachment"} for i in docinfo.get("attachment_logs", [])]
		info_logs += [{**i, "type": "Info"} for i in docinfo.get("info_logs", [])]
		like_logs += [{**i, "type": "Like"} for i in docinfo.get("like_logs", [])]
		workflow_logs += [{**i, "type": "Workflow"} for i in docinfo.get("workflow_logs", [])]
		communications += [{**i, "type": "Communication"} for i in docinfo.get("communications", [])]
		automated_messages += [
			{**i, "type": "Automated Message"} for i in docinfo.get("automated_messages", [])
		]
		versions += [
			{
				**i,
				"type": "Version",
				"content": get_content_for_version(doctype, i.get("data", None), i.get("owner")),
			}
			for i in docinfo.get("versions", [])
		]
		views += [{**i, "type": "View"} for i in docinfo.get("views", [])]
		user_info = {**user_info, **docinfo.get("user_info", {})}

	merge_list = (
		comments
		+ assignments_logs
		+ attachment_logs
		+ info_logs
		+ like_logs
		+ workflow_logs
		+ communications
		+ automated_messages
		+ versions
		+ views
		+ assignments
		+ creation_data
		+ modified_data
	)
	merge_list.sort(key=lambda x: x["creation"], reverse=True)

	frappe.response["docinfo"] = {
		"user_info": user_info,
		"comments": comments,
		"assignments_logs": assignments_logs,
		"attachment_logs": attachment_logs,
		"info_logs": info_logs,
		"like_logs": like_logs,
		"workflow_logs": workflow_logs,
		"communications": communications,
		"automated_messages": automated_messages,
		"versions": versions,
		"views": views,
		"creation_data": creation_data,
		"modified_data": modified_data,
		"merge_list": merge_list,
	}


def get_content_for_creation(doctype, docname):
	creation_data = []

	creation_data = [
		{
			"name": docname,
			"creation": doctype.creation,
			"content": (
				_("{0} created this document").format(frappe.bold("You"))
				if doctype.owner == frappe.session.user
				else _("{0} created this document").format(frappe.bold(get_fullname(doctype.owner)))
			),
			"type": "Creation",
		}
	]
	return creation_data


def get_content_for_modified(doctype, docname):
	modified_data = []
	modified_data = [
		{
			"name": docname,
			"creation": doctype.modified,
			"content": (
				_("{0} last edited this document").format(frappe.bold("You"))
				if doctype.modified_by == frappe.session.user
				else _("{0} last edited this document").format(frappe.bold(get_fullname(doctype.modified_by)))
			),
			"type": "Modified",
		}
	]
	return modified_data


def get_content_for_version(doctype, data, owner):
	if data:
		meta = frappe.get_meta(doctype)
		fields = meta.get("fields")
		data = json.loads(data)
		content = ""
		added = data.get("added", [])
		changed = data.get("changed", [])
		removed = data.get("removed", [])
		row_changed = data.get("row_changed", [])
		added_string = ""
		changed_string = ""
		removed_string = ""
		row_changed_string = ""
		for item in added:
			meta_item = next((x for x in fields if len(item) > 0 and x.get("fieldname") == item[0]), None)
			if meta_item and meta_item.get("label") and not meta_item.get("hidden"):
				if (
					meta.get("fieldtype") == "Image"
					or meta.get("fieldtype") == "Attach"
					or meta.get("fieldtype") == "Attach Image"
				):
					continue
				else:
					added_string += "rows for <b>{}</b>{}".format(
						meta_item.get("label"), "," if item != added[-1] else "."
					)

		for item in changed:
			meta_item = next((x for x in fields if len(item) > 0 and x.get("fieldname") == item[0]), None)
			if (
				meta_item
				and meta_item.get("label")
				and not meta_item.get("hidden")
				and len(item) > 2
				and item[0] != ""
				and item[1] != ""
				and item[2] != ""
			):
				if (
					meta_item.get("fieldtype") == "Image"
					or meta_item.get("fieldtype") == "Attach"
					or meta_item.get("fieldtype") == "Attach Image"
				):
					continue
				else:
					changed_string += " <b>{}</b> from <b>{}</b> to <b>{}</b>{}".format(
						meta_item.get("label"), item[1], item[2], "," if item != changed[-1] else "."
					)
			elif (
				meta_item
				and meta_item.get("label")
				and not meta_item.get("hidden")
				and len(item) > 2
				and item[0] != ""
			):
				if (
					meta_item.get("fieldtype") == "Image"
					or meta_item.get("fieldtype") == "Attach"
					or meta_item.get("fieldtype") == "Attach Image"
				):
					continue
				else:
					changed_string += "<b>{}</b> from <b>{}</b> to <b>{}</b>{}".format(
						meta_item.get("label"),
						item[1] if item[1] else '" "',
						item[2] if item[2] else '" "',
						"," if item != changed[-1] else ".",
					)

		for item in removed:
			meta_item = next((x for x in fields if len(item) > 0 and x.get("fieldname") == item[0]), None)
			if meta_item and meta_item.get("label") and not meta_item.get("hidden") and item[0] != "":
				if (
					meta_item.get("fieldtype") == "Image"
					or meta_item.get("fieldtype") == "Attach"
					or meta_item.get("fieldtype") == "Attach Image"
				):
					continue
				else:
					removed_string += " <b>{}</b>{}".format(
						meta_item.get("label"), "," if item != removed[-1] else "."
					)

		for item in row_changed:
			if len(item) > 0 and item[0] != "":
				table_name = item[0]
				row = item[1]
				table_fields = next((x for x in fields if x.get("fieldname") == table_name), None)
				table_options = table_fields.get("options")
				table_meta = frappe.get_meta(table_options)
				table_fields = table_meta.get("fields")

				last_item = item[-1]
				if last_item and type(last_item) is list and len(last_item) > 0 and table_meta:
					for list_item in last_item:
						meta_item = next(
							(x for x in table_fields if x.get("fieldname") == list_item[0]), None
						)
						if (
							meta_item
							and meta_item.get("label")
							and not meta_item.get("hidden")
							and len(list_item) > 2
							and list_item[0] != ""
							and list_item[1] != ""
							and list_item[2] != ""
						):
							row_changed_string += (
								" <b>{}</b> from <b>{}</b> to <b>{}</b> in row #{}{}".format(
									meta_item.get("label"),
									list_item[1],
									list_item[2],
									row,
									(
										" of " + table_meta.get("name") + "."
										if (item == row_changed[-1] and list_item == last_item[-1])
										else ","
									),
								)
							)
						elif (
							meta_item
							and meta_item.get("label")
							and len(list_item) > 2
							and last_item[0] != ""
							and list_item[1] == ""
							and list_item[2] != ""
						):
							row_changed_string += " <b>{}</b> to <b>{}</b> in row #{}{}".format(
								meta_item.get("label"),
								list_item[2],
								row,
								(
									" of " + table_meta.get("name") + "."
									if (item == row_changed[-1] and list_item == last_item[-1])
									else ","
								),
							)

		user_string = ""
		if owner:
			user_string = (
				_("{0}").format(frappe.bold("You"))
				if owner == frappe.session.user
				else _("{0}").format(frappe.bold(get_fullname(owner)))
			)
		added_string = f"added {added_string}" if added_string != "" else ""
		changed_string = f"changed {changed_string}" if changed_string != "" else ""
		removed_string = f"removed {removed_string}" if removed_string != "" else ""
		row_changed_string = f"changed for {row_changed_string}" if row_changed_string != "" else ""

		if (
			len(added_string.split(","))
			+ len(changed_string.split(","))
			+ len(removed_string.split(","))
			+ len(row_changed_string.split(","))
			> 5
		):
			# show only 5 items and show `count more items`
			added_string = (
				", ".join(added_string.split(",")[:5])
				+ ", and added for {} more.".format(len(added_string.split(",")) - 5)
				if len(added_string.split(",")) > 5
				else added_string
			)
			changed_string = (
				", ".join(changed_string.split(",")[:5])
				+ ", and changed for {} more.".format(len(changed_string.split(",")) - 5)
				if len(changed_string.split(",")) > 5
				else changed_string
			)
			removed_string = (
				", ".join(removed_string.split(",")[:5])
				+ ", and {} and removed for more.".format(len(removed_string.split(",")) - 5)
				if len(removed_string.split(",")) > 5
				else removed_string
			)
			row_changed_string = (
				", ".join(row_changed_string.split(",")[:5])
				+ ", and changed for {} more.".format(len(row_changed_string.split(",")) - 5)
				if len(row_changed_string.split(",")) > 5
				else row_changed_string
			)

			content = f"{added_string} {changed_string} {row_changed_string} {removed_string}"
		else:
			content = f"{added_string} {changed_string} {row_changed_string} {removed_string}"

		return f"{user_string} {content.strip()}" if content.strip() != "" else ""

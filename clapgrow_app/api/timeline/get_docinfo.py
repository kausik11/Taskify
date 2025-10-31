import json
from datetime import datetime

import frappe
from frappe import _
from frappe.utils import get_fullname
from frappe.utils.data import get_timespan_date_range
from pypika import Case, Order


def get_docinfo(doc=None, doctype=None, name=None):
	# from frappe.share import _get_users as get_docshares

	if not doc:
		doc = frappe.get_doc(doctype, name)
		if not doc.has_permission("read"):
			raise frappe.PermissionError

	all_communications = _get_communications(doc.doctype, doc.name)

	automated_messages = [
		msg for msg in all_communications if msg["communication_type"] == "Automated Message"
	]
	communications_except_auto_messages = [
		msg for msg in all_communications if msg["communication_type"] != "Automated Message"
	]

	docinfo = frappe._dict(user_info={})

	add_comments(doc, docinfo)

	docinfo.update(
		{
			"doctype": doc.doctype,
			"name": doc.name,
			"attachments": get_attachments(doc.doctype, doc.name),
			"communications": communications_except_auto_messages,
			"automated_messages": automated_messages,
			"total_comments": len(json.loads(doc.get("_comments") or "[]")),
			"versions": get_versions(doc),
			"assignments": get_assignments(doc.doctype, doc.name),
			"views": get_view_logs(doc),
		}
	)

	update_user_info(docinfo)

	frappe.response["docinfo"] = docinfo


def get_view_logs(doc):
	"""get and return the latest view logs if available"""

	if not doc.meta.track_views:
		return []

	return frappe.get_all(
		"View Log",
		filters={
			"reference_doctype": doc.doctype,
			"reference_name": doc.name,
		},
		fields=["name", "creation", "owner"],
		order_by="creation desc",
	)

	return []


def get_attachments(dt, dn):
	return frappe.get_all(
		"File",
		fields=["name", "file_name", "file_url", "is_private"],
		filters={"attached_to_name": dn, "attached_to_doctype": dt},
	)


def add_comments(doc, docinfo):
	# divide comments into separate lists
	docinfo.comments = []
	docinfo.shared = []
	docinfo.assignment_logs = []
	docinfo.attachment_logs = []
	docinfo.info_logs = []
	docinfo.like_logs = []
	docinfo.workflow_logs = []

	comments = frappe.get_all(
		"Comment",
		fields=["name", "creation", "content", "owner", "comment_type"],
		filters={"reference_doctype": doc.doctype, "reference_name": doc.name},
	)

	for c in comments:
		match c.comment_type:
			case "Comment":
				c.content = frappe.utils.markdown(c.content)
				docinfo.comments.append(c)
			case "Shared" | "Unshared":
				docinfo.shared.append(c)
			case "Assignment Completed" | "Assigned":
				docinfo.assignment_logs.append(c)
			case "Attachment" | "Attachment Removed":
				docinfo.attachment_logs.append(c)
			case "Info" | "Edit" | "Label":
				docinfo.info_logs.append(c)
			case "Like":
				docinfo.like_logs.append(c)
			case "Workflow":
				docinfo.workflow_logs.append(c)

	return comments


def get_versions(doc):
	if not doc.meta.track_changes:
		return []

	return frappe.get_all(
		"Version",
		filters=dict(ref_doctype=doc.doctype, docname=doc.name),
		fields=["name", "owner", "creation", "data"],
		order_by="creation desc",
	)


def _get_communications(doctype, name):
	communications = get_communication_data(doctype, name)
	for c in communications:
		if c.communication_type == "Communication":
			c.attachments = json.dumps(
				frappe.get_all(
					"File",
					fields=["file_url", "is_private"],
					filters={"attached_to_doctype": "Communication", "attached_to_name": c.name},
				)
			)

	return communications


def get_communication_data(doctype, name, fields=None, group_by=None, as_dict=True):
	"""Returns list of communications for a given document"""
	if not fields:
		fields = """
            C.name, C.communication_type, C.communication_medium,
            C.communication_date, C.content,
            C.sender, C.sender_full_name, C.cc, C.bcc,
            C.creation AS creation, C.subject, C.delivery_status,
            C._liked_by, C.reference_doctype, C.reference_name,
            C.read_by_recipient, C.recipients
        """

	conditions = ""

	if doctype == "User":
		conditions += """
            AND NOT (C.reference_doctype='User' AND C.communication_type='Communication')
        """

	# communications linked to reference_doctype

	part1 = f"""
        SELECT {fields}
        FROM `tabCommunication` as C
        WHERE C.communication_type IN ('Communication', 'Feedback', 'Automated Message')
        AND (C.reference_doctype = %(doctype)s AND C.reference_name = %(name)s)
        {conditions}
    """

	# communications linked in Timeline Links
	part2 = f"""
        SELECT {fields}
        FROM `tabCommunication` as C
        INNER JOIN `tabCommunication Link` ON C.name=`tabCommunication Link`.parent
        WHERE C.communication_type IN ('Communication', 'Feedback', 'Automated Message')
        AND `tabCommunication Link`.link_doctype = %(doctype)s AND `tabCommunication Link`.link_name = %(name)s
        {conditions}
    """

	communications = frappe.db.sql(
		"""
        SELECT *
        FROM (({part1}) UNION ({part2})) AS combined
        {group_by}
        ORDER BY creation DESC
    """.format(part1=part1, part2=part2, group_by=(group_by or "")),
		dict(doctype=doctype, name=name),
		as_dict=as_dict,
	)

	return communications


def update_user_info(docinfo):
	users = set()
	users.update(d.sender for d in docinfo.communications)
	users.update(d.user for d in docinfo.shared)
	users.update(d.owner for d in docinfo.assignments)
	users.update(d.owner for d in docinfo.views)
	users.update(d.owner for d in docinfo.workflow_logs)
	users.update(d.owner for d in docinfo.like_logs)
	users.update(d.owner for d in docinfo.info_logs)
	users.update(d.owner for d in docinfo.attachment_logs)
	users.update(d.owner for d in docinfo.assignment_logs)
	users.update(d.owner for d in docinfo.comments)
	# caller or call_receiver will be the user that actually owns the call log
	frappe.utils.add_user_info(users, docinfo.user_info)


def get_assignments(dt, dn):
	return frappe.get_all(
		"ToDo",
		fields=["name", "owner", "description", "status", "creation"],
		filters={
			"reference_type": dt,
			"reference_name": dn,
			"status": ("!=", "Cancelled"),
		},
	)

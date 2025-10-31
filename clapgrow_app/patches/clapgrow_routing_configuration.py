import frappe


def execute():
	"""
	Patch to add all Custom Doctype which have module as 'Clapgrow App' to the Clapgrow Routing Configuration
	"""
	custom_doctype = frappe.get_all("DocType", filters={"custom": 1, "module": "Clapgrow App"}, pluck="name")

	routing_config = frappe.get_single("Clapgrow Routing Configuration")

	for doctype in custom_doctype:
		# check if any doctype_name in routing_config.routing where doctype_name is same as doctype
		if not any(row.doctype_name == doctype for row in routing_config.routing):
			url = "-".join(doctype.split(" ")).lower()
			routing_config.append(
				"routing",
				{
					"type": "Link",
					"label": doctype,
					"doctype_name": doctype,
					"column": 1,
					"url": url,
				},
			)

	routing_config.save()
	frappe.db.commit()

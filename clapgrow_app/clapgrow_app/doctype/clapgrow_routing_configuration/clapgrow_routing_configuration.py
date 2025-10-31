# Copyright (c) 2025, Clapgrow and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class ClapgrowRoutingConfiguration(Document):
	def validate(self):
		"""
		Validate the routing configuration to ensure that the URL is unique and doctype names are valid and unique.
		"""
		# find out duplicate URL or doctype names
		urls = {}
		doctypes = {}
		for route in self.routing:
			urls[route.url] = urls.get(route.url, 0) + 1
			doctypes[route.doctype_name] = doctypes.get(route.doctype_name, 0) + 1

		duplicate_urls = [url for url, count in urls.items() if count > 1]

		if duplicate_urls:
			frappe.throw(
				_("Duplicate URL(s) found in routing configuration: {0}").format(", ".join(duplicate_urls))
			)

		duplicate_doctypes = [doctype for doctype, count in doctypes.items() if count > 1]
		if duplicate_doctypes:
			frappe.throw(
				_("Duplicate Doctype(s) found in routing configuration: {0}").format(
					", ".join(duplicate_doctypes)
				)
			)

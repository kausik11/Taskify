// Copyright (c) 2025, Clapgrow and contributors
// For license information, please see license.txt

frappe.query_reports["Performance Report"] = {
	filters: [
		{
			fieldname: "trend",
			label: __("Trend"),
			fieldtype: "Select",
			options: ["This Week", "Last 30 Days"],
			default: "This Week",
			reqd: 1,
		},
		{
			fieldname: "company_id",
			label: __("Company"),
			fieldtype: "Link",
			options: "CG Company",
			default: frappe.boot.sysdefaults.company,
			reqd: 0,
		},
	],
};

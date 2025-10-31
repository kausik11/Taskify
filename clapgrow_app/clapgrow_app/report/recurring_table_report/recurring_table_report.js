// Copyright (c) 2025, Clapgrow and contributors
// For license information, please see license.txt

frappe.query_reports["Recurring Table Report"] = {
	filters: [
		{
			fieldname: "company_id",
			label: __("Company"),
			fieldtype: "Link",
			options: "CG Company",
			default: frappe.boot.sysdefaults.company,
			reqd: 1,
		},
		{
			fieldname: "from_date",
			label: __("From Date"),
			fieldtype: "Date",
			default: frappe.datetime.add_months(frappe.datetime.get_today(), -1),
			reqd: 0,
		},
		{
			fieldname: "to_date",
			label: __("To Date"),
			fieldtype: "Date",
			default: frappe.datetime.get_today(),
			reqd: 0,
		},
		{
			fieldname: "assigned_to",
			label: __("Assigned To"),
			fieldtype: "Link",
			options: "CG User",
			reqd: 0,
		},
		{
			fieldname: "assignee",
			label: __("Assignee"),
			fieldtype: "Link",
			options: "CG User",
			reqd: 0,
		},
		{
			fieldname: "audit_status",
			label: __("Audit Status"),
			fieldtype: "Select",
			options: ["", "Approved", "Not Approved"],
			reqd: 0,
		},
		{
			fieldname: "priority",
			label: __("Priority"),
			fieldtype: "Select",
			options: ["", "Low", "Medium", "Critical"],
			reqd: 0,
		},
		{
			fieldname: "tags",
			label: __("Tags"),
			fieldtype: "Data",
			reqd: 0,
		},
		{
			fieldname: "task_status",
			label: __("Task Status"),
			fieldtype: "MultiSelectList",
			options: [
				{ value: "Active", description: "Active Tasks" },
				{ value: "Inactive", description: "Inactive Tasks" },
			],
			default: ["Active"],
			reqd: 0,
		},
	],
};

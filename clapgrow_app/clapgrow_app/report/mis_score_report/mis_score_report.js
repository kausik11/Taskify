// Copyright (c) 2025, Clapgrow and contributors
// For license information, please see license.txt

frappe.query_reports["MIS Score Report"] = {
	filters: [
		{
			fieldname: "last_week_report",
			label: __("Last Week Report"),
			fieldtype: "Check",
			default: 0,
			reqd: 0,
		},
		{
			fieldname: "from_date",
			label: __("From Date"),
			fieldtype: "Date",
			default: frappe.datetime.week_start(),
			reqd: 1,
		},
		{
			fieldname: "to_date",
			label: __("To Date"),
			fieldtype: "Date",
			default: frappe.datetime.week_end(),
			reqd: 1,
		},
		{
			fieldname: "task_type",
			label: __("Task Type"),
			fieldtype: "Select",
			options: ["All", "Onetime", "Recurring", "Help"],
			default: "All",
			reqd: 0,
		},
		{
			fieldname: "priority",
			label: __("Priority"),
			fieldtype: "Select",
			options: ["All", "Critical", "Medium", "Low"],
			default: "All",
			reqd: 0,
		},
		{
			fieldname: "company_id",
			label: __("Company"),
			fieldtype: "Link",
			options: "CG Company",
			default: frappe.boot.sysdefaults.company,
			reqd: 0,
		},
		{
			fieldname: "department_id",
			label: __("Department"),
			fieldtype: "Link",
			options: "CG Department",
			reqd: 0,
		},
		{
			fieldname: "branch_id",
			label: __("Branch"),
			fieldtype: "Link",
			options: "CG Branch",
			reqd: 0,
		},
		{
			fieldname: "team_member",
			label: __("Team Member"),
			fieldtype: "Link",
			options: "CG User",
			reqd: 0,
		},
		{
			fieldname: "score_tab",
			label: __("Score Tab"),
			fieldtype: "Select",
			options: ["All", "75-100", "74-50", "49-25", "<25"],
			default: "All",
			reqd: 0,
		},
	],
};

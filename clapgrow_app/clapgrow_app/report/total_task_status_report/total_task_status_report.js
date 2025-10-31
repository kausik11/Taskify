// Copyright (c) 2025, Clapgrow and contributors
// For license information, please see license.txt

frappe.query_reports["Total Task Status Report"] = {
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
			fieldname: "company",
			label: __("Company"),
			fieldtype: "Link",
			options: "CG Company",
			reqd: 0,
			default: frappe.defaults.get_user_default("Company"),
			get_query: function () {
				return {
					filters: {
						enabled: 1, // Only fetch enabled companies
					},
				};
			},
		},
		{
			fieldname: "user",
			label: __("User"),
			fieldtype: "Link",
			options: "CG User",
			reqd: 0,
			default: frappe.session.user,
			get_query: function () {
				// Restrict users based on the selected company
				let company = frappe.query_report.get_filter_value("company");
				let filters = { enabled: 1 };
				if (company) {
					filters.company_id = company;
				}
				return {
					filters: filters,
				};
			},
			onchange: function () {
				// Refresh the report when user changes
				frappe.query_report.refresh();
			},
		},
		{
			fieldname: "task_scope",
			label: __("Task Scope"),
			fieldtype: "Select",
			options: ["My Task", "Team Tasks"],
			default: "My Task",
			reqd: 1,
			onchange: function () {
				// Refresh the report when task scope changes
				frappe.query_report.refresh();
			},
		},
	],
	onload: function (report) {
		// Ensure report refreshes when loaded with default filters
		report.refresh();
	},
};

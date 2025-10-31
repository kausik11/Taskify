// Copyright (c) 2025, Clapgrow and contributors
// For license information, please see license.txt

frappe.query_reports["Member Insights Table"] = {
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
			fieldname: "company_id",
			label: __("Company"),
			fieldtype: "Link",
			options: "CG Company",
			default: frappe.boot.sysdefaults.company,
			reqd: 0,
		},
		{
			fieldname: "department",
			label: __("Department"),
			fieldtype: "Link",
			options: "CG Department",
			reqd: 0,
			get_query: function () {
				let company = frappe.query_report.get_filter_value("company_id");
				return {
					filters: {
						company_id: company || null,
					},
				};
			},
		},
		{
			fieldname: "branch",
			label: __("Branch"),
			fieldtype: "Link",
			options: "CG Branch",
			reqd: 0,
			get_query: function () {
				let company = frappe.query_report.get_filter_value("company_id");
				return {
					filters: {
						company_id: company || null,
					},
				};
			},
		},
		{
			fieldname: "score_range",
			label: __("Score Range"),
			fieldtype: "Select",
			options: ["", "75-100", "50-74", "25-49", "<25"],
			default: "",
			reqd: 0,
		},
	],
};

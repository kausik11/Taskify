frappe.ui.form.on("CG Task Generation Log", {
	refresh: function (frm) {
		// Add custom buttons or actions if needed
		if (frm.doc.generation_status === "Failed" && frm.doc.error_details) {
			frm.add_custom_button(__("View Error Details"), function () {
				frappe.msgprint({
					title: __("Error Details"),
					message: frm.doc.error_details,
					indicator: "red",
				});
			});
		}

		// Add button to view generation summary
		if (frm.doc.generation_summary) {
			frm.add_custom_button(__("View Summary"), function () {
				frappe.msgprint({
					title: __("Generation Summary"),
					message: frm.doc.generation_summary,
					indicator: "blue",
				});
			});
		}
	},
});

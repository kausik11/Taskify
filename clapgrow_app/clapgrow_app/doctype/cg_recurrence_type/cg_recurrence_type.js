// Copyright (c) 2024, Clapgrow and contributors
// For license information, please see license.txt

// frappe.ui.form.on("CG RecurrenceType", {
// 	refresh(frm) {

// 	},
// });

frappe.ui.form.on("CG Recurrence Type", {
	refresh: function (frm) {
		let days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
		let options = days
			.map((day) => `<input type='checkbox' class='day-checkbox' value='${day}'> ${day}`)
			.join("<br>");

		let dialog = new frappe.ui.Dialog({
			title: "Week Days",
			fields: [{ fieldname: "week_days", fieldtype: "HTML", options: options }],
		});

		dialog.set_primary_action("Save", function () {
			let selected_days = [];
			$(".day-checkbox:checked").each(function () {
				selected_days.push($(this).val());
			});
			frm.set_value("week_days", selected_days.join(", "));
			dialog.hide();
		});

		frm.add_custom_button(__("Select Days"), function () {
			dialog.show();
		});
	},
});

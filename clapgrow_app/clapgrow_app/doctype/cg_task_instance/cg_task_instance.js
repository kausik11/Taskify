// Copyright (c) 2025, Clapgrow and contributors
// For license information, please see license.txt

// frappe.ui.form.on("CG Task Instance", {
// 	refresh(frm) {

// 	},
// is_completed: function (frm) {
// 	if (
// 		frm.doc.upload_required == 1 &&
// 		frm.doc.is_completed == 1 &&
// 		!frm.doc.submit_file
// 	) {
// 		frappe.msgprint({
// 			title: __("Validation Error"),
// 			indicator: "red",
// 			message: __(
// 				"File Upload is mandatory for this task to mark it Completed."
// 			),
// 		});
// 		frm.set_value("is_completed", 0);
// 	}
// },
// });

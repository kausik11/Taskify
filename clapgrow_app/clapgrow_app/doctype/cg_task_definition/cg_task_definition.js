// // Copyright (c) 2024, Clapgrow and contributors
// // For license information, please see license.txt

// frappe.ui.form.on("CG TaskDefinition", {
// 	refresh: function (frm) {
// 		setup_linked_field_fetching(frm);
// 	},
// 	validate: function (frm) {
// 		if (frm.doc.due_date < frappe.datetime.get_today()) {
// 			// Ensuring the message is translated using _() function
// 			frappe.msgprint(__("You cannot select a past date in From Date"));
// 			frappe.validated = false;
// 		}
// 	},
// 	assignee: function (frm) {
// 		fetch_linked_fields(frm, "assignee", "assignee_name", "full_name");
// 		fetch_linked_fields(frm, "assignee", "assignee_image", "user_image");
// 	},
// 	assigned_to: function (frm) {
// 		fetch_linked_fields(frm, "assigned_to", "assigned_to_name", "full_name");
// 		fetch_linked_fields(frm, "assigned_to", "assigned_to_image", "user_image");
// 	},
// 	checker: function (frm) {
// 		fetch_linked_fields(frm, "checker", "checker_name", "full_name");
// 	},
// });

// function setup_linked_field_fetching(frm) {
// 	if (frm && frm.fields_dict) {
// 		frm.fields_dict["assignee"].df.onchange = () => {
// 			fetch_linked_fields(frm, "assignee", "assignee_name", "full_name");
// 			fetch_linked_fields(frm, "assignee", "assignee_image", "user_image");
// 		};

// 		frm.fields_dict["assigned_to"].df.onchange = () => {
// 			fetch_linked_fields(frm, "assigned_to", "assigned_to_name", "full_name");
// 			fetch_linked_fields(frm, "assigned_to", "assigned_to_image", "user_image");
// 		};

// 		frm.fields_dict["checker"].df.onchange = () => {
// 			fetch_linked_fields(frm, "checker", "checker_name", "full_name");
// 		};
// 	}
// }

// function fetch_linked_fields(frm, source_field, target_field, fetch_field) {
// 	const linked_doc = frm.doc[source_field];
// 	if (linked_doc) {
// 		frappe.db.get_value("CG User", linked_doc, fetch_field).then((r) => {
// 			if (r.message) {
// 				frm.set_value(target_field, r.message[fetch_field]);
// 			}
// 		});
// 	} else {
// 		frm.set_value(target_field, "");
// 	}
// }

// // Copyright (c) 2024, Clapgrow and contributors
// // For license information, please see license.txt

// frappe.ui.form.on("CG User", {
// 	validate(frm) {
// 		// Function to check if a string contains spaces
// 		function containsSpace(value) {
// 			return /\s/.test(value);
// 		}

// 		// Check for spaces in the first name
// 		if (containsSpace(frm.doc.first_name)) {
// 			frappe.msgprint(__("Please enter a valid First Name."));
// 			frappe.validated = false;
// 		}

// 		// Check for spaces in the middle name
// 		if (frm.doc.middle_name && containsSpace(frm.doc.middle_name)) {
// 			frappe.msgprint(__("Please enter a valid Middle Name."));
// 			frappe.validated = false;
// 		}

// 		// Check for spaces in the last name
// 		if (containsSpace(frm.doc.last_name)) {
// 			frappe.msgprint(__("Please enter a valid Last Name."));
// 			frappe.validated = false;
// 		}

// 		// validate email using a valid regex
// 		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 		if (!emailRegex.test(frm.doc.email)) {
// 			frappe.msgprint(__("Please enter a valid email address."));
// 			frappe.validated = false;
// 		}
// 	},
// });

// frappe.call({
// 	method: "clapgrow_app.clapgrow_app.doctype.cg_user.cg_user.get_users",
// 	callback: function (r) {
// 		if (r.message) {
// 			;
// 		}
// 	},
// });

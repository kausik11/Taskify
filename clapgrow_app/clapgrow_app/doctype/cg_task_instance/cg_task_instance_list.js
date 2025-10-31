frappe.listview_settings["CG Task Instance"] = {
	onload: function (listview) {
		// Update task statuses when the list loads
		frappe.call({
			method: "clapgrow_app.api.login.update_task_status",
			callback: function (response) {
				if (response.message && response.message.status === "success") {
					console.log("Task statuses updated on load:", response.message.message);
					// Refresh the list to show updated statuses
					listview.refresh();
				}
			},
		});
	},

	refresh: function (listview) {
		// Prevent recursive calls during status update
		if (listview._updating_status) {
			return;
		}

		listview._updating_status = true;

		// Update statuses when manually refreshing the list
		frappe.call({
			method: "clapgrow_app.api.login.update_task_status",
			callback: function (response) {
				listview._updating_status = false;

				if (response.message && response.message.status === "success") {
					console.log("Task statuses updated on refresh:", response.message.message);
					// Force reload the list data to show updated statuses
					listview.data = [];
					listview.start = 0;
					listview.page_length = 20;
					listview.load();
				}
			},
			error: function () {
				listview._updating_status = false;
			},
		});
	},
};

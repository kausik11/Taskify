frappe.listview_settings["CG Task Definition"] = {
	add_fields: ["priority", "status"],

	formatters: {
		priority(val) {
			let backgroundColor, textColor;
			switch (val) {
				case "Low":
					backgroundColor = "rgba(0, 128, 0, 0.07)"; // Lighter green with more transparency
					textColor = "#004d00"; // Darker green for better contrast
					break;
				case "Medium":
					backgroundColor = "rgba(0, 0, 252, 0.07)"; // Lighter blue with more transparency
					textColor = "#000066"; // Darker blue for better contrast
					break;
				case "Critical":
					backgroundColor = "rgba(252, 0, 0, 0.07)"; // Lighter red with more transparency
					textColor = "#660000"; // Darker red for better contrast
					break;
			}
			return `<span class="badge" style="background-color:${backgroundColor}; color:${textColor}; font-size:12px; padding:5px 10px; letter-spacing: 0.05em; vertical-align: middle; font-weight: normal; border-radius:12px; margin:2px 4px; display:inline-block;">${val}</span>`;
		},
	},

	get_indicator(doc) {
		const status_color_map = {
			Upcoming: ["Upcoming", "blue", "status,=,Upcoming"],
			Completed: ["Completed", "green", "status,=,Completed"],
			"Due Today": ["Due Today", "yellow", "status,=,Due Today"],
			Overdue: ["Overdue", "red", "status,=,Overdue"],
		};

		const priority_color_map = {
			Low: ["Low", "green", "priority,=,Low"],
			Medium: ["Medium", "blue", "priority,=,Medium"],
			Critical: ["Critical", "red", "priority,=,Critical"],
		};

		if (doc.status && status_color_map[doc.status]) {
			return status_color_map[doc.status];
		}

		if (doc.priority && priority_color_map[doc.priority]) {
			return priority_color_map[doc.priority];
		}
	},

	sort_fields: [
		{
			fieldname: "priority",
			label: __("Priority"),
			fieldtype: "Select",
			options: {
				Low: 1,
				Medium: 2,
				Critical: 3,
			},
		},
		{
			fieldname: "status",
			label: __("Status"),
			fieldtype: "Select",
			options: {
				Upcoming: 1,
				"Due Today": 2,
				Overdue: 3,
				Completed: 4,
			},
		},
	],
};

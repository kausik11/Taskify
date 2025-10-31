// Copyright (c) 2025, Clapgrow and contributors
// For license information, please see license.txt

frappe.listview_settings["Whatsapp Instance"] = {
	onload: function (listview) {
		let company_id = null;

		async function getCompanyId() {
			const response = await frappe.call({
				method: "frappe.client.get",
				args: {
					doctype: "CG User",
					filters: { name: frappe.session.user },
					fields: ["name", "company_id"],
				},
			});
			if (response.message) {
				return response.message.company_id;
			} else {
				frappe.msgprint(__("CG User record not found for the current user."));
				return null;
			}
		}

		// Button to create WhatsApp Instance
		listview.page.add_inner_button(__("Create Whatsapp Instance"), async function () {
			company_id = await getCompanyId();
			if (!company_id) return;

			const response = await frappe.call({
				method: "frappe.client.get",
				args: {
					doctype: "Whatsapp Setting",
					filters: { company_id: company_id },
					fields: ["wa_api_url", "wa_api_token"],
				},
			});

			if (response.message) {
				const { wa_api_url: api_url, wa_api_token: token } = response.message;

				const headers = {
					accept: "application/json",
					authorization: "Bearer " + token,
				};

				try {
					const res = await fetch(api_url, { method: "POST", headers });
					const data = await res.json();

					if (data.status === "success" && data.instance) {
						const instanceId = data.instance.id;
						const instanceOwner = data.instance.owner;
						const webhookUrl = data.instance.webhook_url;
						const webhookEvents = data.instance.webhook_events.join(", ");
						const isTrial = data.instance.is_trial;
						const status = data.status;

						const doc = frappe.model.get_new_doc("Whatsapp Instance");
						Object.assign(doc, {
							instance_id: instanceId,
							instance_owner: instanceOwner,
							webhook_url: webhookUrl,
							webhook_events: webhookEvents,
							is_trial: isTrial,
							status: status,
							company_id: company_id,
						});

						const insertResponse = await frappe.call({
							method: "frappe.client.insert",
							args: { doc: doc },
						});

						if (insertResponse.message) {
							frappe.msgprint(__("WhatsApp Instance created successfully."));
							frappe.set_route("List", "Whatsapp Instance");
						}
					} else {
						frappe.msgprint(__("Failed to create WhatsApp instance."));
					}
				} catch (err) {
					frappe.msgprint(__("Error occurred while creating WhatsApp instance: " + err.message));
				}
			} else {
				frappe.msgprint(__("Whatsapp Setting not found for the given company."));
			}
		});

		// Button to delete WhatsApp Instance
		listview.page.add_inner_button(__("Delete Whatsapp Instance"), async function () {
			let selectedDocs = listview.get_checked_items();

			if (selectedDocs.length > 0) {
				for (const doc of selectedDocs) {
					const docName = doc.name;

					company_id = await getCompanyId();
					if (!company_id) {
						frappe.msgprint(__("Company ID is not available."));
						return;
					}

					const settingResponse = await frappe.call({
						method: "frappe.client.get",
						args: {
							doctype: "Whatsapp Setting",
							filters: { company_id: company_id },
							fields: ["wa_api_token", "instance_id"],
						},
					});

					if (settingResponse.message) {
						const token = settingResponse.message.wa_api_token;
						const instanceId = settingResponse.message.instance_id;

						// Check if the instance_id matches the selected WhatsApp Instance
						if (instanceId !== docName) {
							frappe.msgprint(__("This WhatsApp Instance is not linked to the selected company."));
							return;
						}

						// Clear the instance_id field in WhatsApp Setting
						const updateResponse = await frappe.call({
							method: "frappe.client.set_value",
							args: {
								doctype: "Whatsapp Setting",
								name: settingResponse.message.name,
								fieldname: "instance_id",
								value: null,
							},
						});

						if (updateResponse) {
							// Proceed to delete the WhatsApp instance from the API
							const deleteUrl = `https://waapi.app/api/v1/instances/${docName}`;
							try {
								const deleteResponse = await fetch(deleteUrl, {
									method: "DELETE",
									headers: {
										Authorization: "Bearer " + token,
										Accept: "application/json",
									},
								});

								if (deleteResponse.status === 204) {
									// Delete the WhatsApp Instance from Frappe
									const deleteResult = await frappe.call({
										method: "frappe.client.delete",
										args: {
											doctype: "Whatsapp Instance",
											name: docName,
										},
									});

									if (deleteResult) {
										frappe.msgprint(__("WhatsApp Instance deleted successfully."));
										listview.refresh();
									} else {
										frappe.msgprint(__("Failed to delete WhatsApp Instance from Frappe."));
									}
								} else {
									frappe.msgprint(
										__("Failed to delete WhatsApp instance from WA API. Status: " + deleteResponse.status),
									);
								}
							} catch (err) {
								frappe.msgprint(
									__("Error occurred while deleting WhatsApp instance from WA API: " + err.message),
								);
							}
						} else {
							frappe.msgprint(__("Failed to clear the linked instance ID from WhatsApp Setting."));
						}
					} else {
						frappe.msgprint(__("Failed to fetch the token from WhatsApp Setting."));
					}
				}
			} else {
				frappe.msgprint(__("Please select a WhatsApp instance to delete."));
			}
		});
	},
};

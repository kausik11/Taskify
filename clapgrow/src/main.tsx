import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./utils/namespace";

if (import.meta.env.DEV) {
	fetch(
		"/api/method/clapgrow_workflow.www.clapgrow_workflow.get_context_for_dev",
		{
			method: "POST",
		},
	)
		.then((response) => response.json())
		.then((values) => {
			const v = JSON.parse(values.message);
			// @ts-expect-error: frappe is not defined on the window object in TypeScript
			if (!window.frappe) window.frappe = {};
			// @ts-expect-error: frappe is not defined on the window object in TypeScript
			frappe.boot = v;
			//@ts-expect-error: frappe is not defined on the window object in TypeScript
			frappe._messages = frappe.boot["__messages"];
			//@ts-expect-error: frappe is not defined on the window object in TypeScript
			frappe.model.sync(frappe.boot.docs);
		});
}

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<App />
	</StrictMode>,
);

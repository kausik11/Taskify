<p>Task Details:</p>
<ul>
    <li>Task Name: {{ frappe.db.get_value("CG Task Instance", doc.reference_name, "task_name") }}</li>
    <li>Assignee: {{ frappe.db.get_value("CG Task Instance", doc.reference_name, "assignee") }}</li>
    <li>Due Date: {{ frappe.db.get_value("CG Task Instance", doc.reference_name, "due_date") }}</li>
</ul>

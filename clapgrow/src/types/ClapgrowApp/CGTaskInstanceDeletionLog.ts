
export interface CGTaskInstanceDeletionLog{
	name: string
	creation: string
	modified: string
	owner: string
	modified_by: string
	docstatus: 0 | 1 | 2
	parent?: string
	parentfield?: string
	parenttype?: string
	idx?: number
	/**	Task Instance ID : Data	*/
	task_instance_id: string
	/**	Task Name : Small Text	*/
	task_name: string
	/**	Task Type : Select	*/
	task_type?: "Onetime" | "Recurring" | "Process" | "Project"
	/**	Status : Select	*/
	status?: "Upcoming" | "Completed" | "Due Today" | "Overdue" | "Rejected" | "Paused"
	/**	Priority : Select	*/
	priority?: "Low" | "Medium" | "Critical"
	/**	Due Date : Datetime	*/
	due_date?: string
	/**	Assigned To : Data	*/
	assigned_to?: string
	/**	Assignee : Data	*/
	assignee?: string
	/**	Checker : Data	*/
	checker?: string
	/**	Branch : Data	*/
	branch?: string
	/**	Department : Data	*/
	department?: string
	/**	Company ID : Data	*/
	company_id: string
	/**	Deleted By : Link - User	*/
	deleted_by: string
	/**	Deleted On : Datetime	*/
	deleted_on: string
	/**	Was Completed : Check	*/
	is_completed?: 0 | 1
	/**	Completed On : Datetime	*/
	completed_on?: string
	/**	Completed By : Data	*/
	completed_by?: string
	/**	Description : Long Text	*/
	description?: string
	/**	Tag : Data	*/
	tag?: string
	/**	Task Definition ID : Data	*/
	task_definition_id?: string
	/**	Was Subtask : Check	*/
	is_subtask?: 0 | 1
	/**	Parent Task Instance : Data	*/
	parent_task_instance?: string
	/**	Full Document JSON : Long Text - Complete JSON representation of the deleted document	*/
	full_document_json?: string
}
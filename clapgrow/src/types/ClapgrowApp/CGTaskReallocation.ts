
export interface CGTaskReallocation{
	name: number
	creation: string
	modified: string
	owner: string
	modified_by: string
	docstatus: 0 | 1 | 2
	parent?: string
	parentfield?: string
	parenttype?: string
	idx?: number
	/**	Recurring Task : Check	*/
	recurring_task?: 0 | 1
	/**	Onetime Task : Check	*/
	onetime_task?: 0 | 1
	/**	Due Today : Check	*/
	due_today?: 0 | 1
	/**	Upcoming : Check	*/
	upcoming?: 0 | 1
	/**	Overdue : Check	*/
	overdue?: 0 | 1
	/**	Task Definition ID : Link - CG Task Definition	*/
	task_definition_id?: string
	/**	Instance ID : Link - CG Task Instance	*/
	instance_id?: string
	/**	Current Assigned To : Link - CG User	*/
	current_assigned_to?: string
	/**	New Assigned To : Link - CG User	*/
	new_assigned_to: string
	/**	Reallocation Type : Select	*/
	reallocation_type: "Permanent" | "Temporary"
	/**	Reallocation Reason : Small Text	*/
	reallocation_reason?: string
	/**	Temporary From : Date	*/
	temporary_from?: string
	/**	Temporary Until : Date	*/
	temporary_until?: string
	/**	Reallocation Status : Select	*/
	reallocation_status: "" | "Pending" | "Completed" | "Approved" | "Rejected"
	/**	Enabled : Check	*/
	enabled?: 0 | 1
	/**	Company ID : Link - CG Company	*/
	company_id?: string
}
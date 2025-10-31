
export interface CGSubtaskDefinition{
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
	/**	Subtask Name : Data	*/
	subtask_name: string
	/**	Assigned To : Link - CG User	*/
	assigned_to: string
	/**	Submit File : JSON	*/
	submit_file?: any
	/**	Due Date : Datetime	*/
	due_date: string
	/**	Is Completed : Check	*/
	is_completed?: 0 | 1
	/**	Company ID : Link - CG Company	*/
	company_id: string
}
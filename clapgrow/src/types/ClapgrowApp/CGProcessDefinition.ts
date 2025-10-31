
export interface CGProcessDefinition{
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
	/**	Process Name : Data	*/
	process_name: string
	/**	Company ID : Link - CG Company	*/
	company_id: string
}
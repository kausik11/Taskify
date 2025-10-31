
export interface CGTaskChecklistItem{
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
	/**	Checklist Item : Small Text	*/
	checklist_item?: string
	/**	Is Checked : Check	*/
	is_checked?: 0 | 1
}
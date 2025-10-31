
export interface CGHolidayEmployee{
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
	/**	Employee : Link - CG User	*/
	employee: string
	/**	Employee Name : Data	*/
	employee_name?: string
}
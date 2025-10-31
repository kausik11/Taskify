
export interface CGCompany{
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
	/**	Company Name : Data	*/
	company_name?: string
	/**	Company Logo : Attach Image	*/
	company_logo?: string
	/**	Is Trial : Check	*/
	is_trial?: 0 | 1
}

export interface CGHolidayGeneratedDate{
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
	/**	Holiday Date : Date	*/
	holiday_date: string
	/**	Day : Data	*/
	day_name?: string
	/**	Is Generated : Check	*/
	is_generated?: 0 | 1
}
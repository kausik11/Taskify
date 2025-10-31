
export interface CGEmployeeHolidayDetail{
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
	/**	Holiday Name : Data	*/
	holiday_name: string
	/**	Holiday Type : Select	*/
	holiday_type: "National Holiday" | "Public Holiday" | "Company Holiday" | "Weekly Off" | "Regional Holiday" | "Custom"
	/**	Source : Select	*/
	source?: "Branch" | "Department" | "Personal"
	/**	Is Optional : Check	*/
	is_optional?: 0 | 1
	/**	Color : Color	*/
	color?: string
}
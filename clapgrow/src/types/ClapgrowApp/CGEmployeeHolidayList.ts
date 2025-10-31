import { CGEmployeeHolidayDetail } from './CGEmployeeHolidayDetail'

export interface CGEmployeeHolidayList{
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
	/**	Branch : Link - CG Branch	*/
	branch_id?: string
	/**	Department : Link - CG Department	*/
	department_id?: string
	/**	Company : Link - CG Company	*/
	company_id?: string
	/**	From Date : Date	*/
	from_date: string
	/**	To Date : Date	*/
	to_date: string
	/**	Last Refreshed : Datetime	*/
	last_refreshed?: string
	/**	Auto Refresh : Check - Automatically refresh holidays when accessed	*/
	auto_refresh?: 0 | 1
	/**	Total Holidays : Int	*/
	total_holidays?: number
	/**	Mandatory Holidays : Int	*/
	mandatory_holidays?: number
	/**	Optional Holidays : Int	*/
	optional_holidays?: number
	/**	Holidays : Table - CG Employee Holiday Detail	*/
	holidays?: CGEmployeeHolidayDetail[]
}
import { CGHolidayEmployee } from './CGHolidayEmployee'
import { CGHolidayGeneratedDate } from './CGHolidayGeneratedDate'

export interface CGHoliday{
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
	/**	Holiday Name : Data	*/
	holiday_name: string
	/**	Holiday Type : Select	*/
	holiday_type: "National Holiday" | "Public Holiday" | "Company Holiday" | "Weekly Off" | "Regional Holiday" | "Custom"
	/**	Branch : Link - CG Branch	*/
	branch_id: string
	/**	Is Active : Check	*/
	is_active?: 0 | 1
	/**	Is Recurring Holiday : Check	*/
	is_recurring?: 0 | 1
	/**	Holiday Date : Date	*/
	holiday_date?: string
	/**	Is Optional Holiday : Check	*/
	is_optional?: 0 | 1
	/**	Color : Color	*/
	color?: string
	/**	Recurrence Type : Select	*/
	recurrence_type?: "Weekly" | "Monthly" | "Quarterly" | "Yearly"
	/**	Days of Week : Data - Comma-separated (e.g., Mon,Tue,Sat,Sun)	*/
	days_of_week?: string
	/**	Week Occurrence : Select	*/
	week_occurrence?: "Every" | "1st" | "2nd" | "3rd" | "4th" | "Last"
	/**	Interval : Int - Repeat every N periods (weeks/months/quarters/years)	*/
	recurrence_interval?: number
	/**	Valid From : Date	*/
	start_date: string
	/**	Valid To : Date - Leave blank for indefinite	*/
	end_date?: string
	/**	Applicable For : Select	*/
	applicable_for?: "All Employees" | "Specific Employees"
	/**	Description : Text	*/
	description?: string
	/**	Auto Generated : Check - System generated recurring holiday	*/
	auto_generated?: 0 | 1
	/**	Employees : Table - CG Holiday Employee	*/
	employees?: CGHolidayEmployee[]
	/**	Generated Dates : Table - CG Holiday Generated Date	*/
	generated_dates?: CGHolidayGeneratedDate[]
}
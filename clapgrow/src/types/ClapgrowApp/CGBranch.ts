
export interface CGBranch{
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
	/**	Branch Name : Data	*/
	branch_name: string
	/**	Company : Link - CG Company	*/
	company_id: string
	/**	Start Time : Time	*/
	start_time: string
	/**	End Time : Time	*/
	end_time: string
	/**	Work Timeline : Data	*/
	timeline?: string
	/**	Work Duration : Data	*/
	work_duration?: string
	/**	Total Holidays : Int - Total holidays configured for this branch	*/
	total_holidays?: number
	/**	Active Holidays : Int - Currently active holidays	*/
	active_holidays?: number
	/**	Enable Holiday Management : Check - Enable holiday management for this branch	*/
	enable_holidays?: 0 | 1
	/**	Auto Generate Weekly Offs : Check - Automatically create weekly off holidays	*/
	auto_generate_weekly_offs?: 0 | 1
	/**	Default Weekly Off Days : Data - Comma-separated days (e.g., Sat,Sun)	*/
	default_weekly_off_days?: string
	/**	Holiday Color Scheme : Select - Color scheme for holiday calendar display	*/
	holiday_color_scheme?: "Default" | "Colorful" | "Minimal" | "Professional"
}
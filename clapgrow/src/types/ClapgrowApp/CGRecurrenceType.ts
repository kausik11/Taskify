
export interface CGRecurrenceType{
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
	/**	Frequency : Select	*/
	frequency: "" | "Daily" | "Weekly" | "Monthly" | "Yearly" | "Custom"
	/**	Interval : Int	*/
	interval?: number
	/**	Week Days : Data - Comma-separated days (e.g., Mon,Tue,Sun)	*/
	week_days?: string
	/**	Month Days : Int - Integer value	*/
	month_days?: number
	/**	Nth Week : Select	*/
	nth_week?: "1st" | "2nd" | "3rd" | "4th" | "Last"
	/**	End Date : Date	*/
	end_date?: string
	/**	Exception Date : Link - CG Holiday	*/
	exception_date?: string
	/**	Amended From : Link - CG Recurrence Type	*/
	amended_from?: string
}
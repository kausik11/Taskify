
export interface CGTaskPauseHistory{
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
	/**	Naming Series : Select	*/
	naming_series: "TPH-.YYYY.-.#####"
	/**	Task Definition : Link - CG Task Definition	*/
	task_definition_id: string
	/**	Action Type : Select	*/
	action_type: "" | "Pause" | "Resume" | "Manual Generate"
	/**	Pause Start Date : Datetime	*/
	pause_start_date?: string
	/**	Pause End Date : Datetime	*/
	pause_end_date?: string
	/**	Reason : Text	*/
	reason?: string
	/**	Performed By : Link - CG User	*/
	performed_by?: string
	/**	Performed On : Datetime	*/
	performed_on?: string
	/**	Instances Deleted : Int	*/
	instances_deleted?: number
	/**	Instances Created : Int	*/
	instances_created?: number
}
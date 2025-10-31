import { CGTaskChecklistItem } from './CGTaskChecklistItem'
import { CGSubtaskDefinition } from './CGSubtaskDefinition'
import { CGRecurrenceType } from './CGRecurrenceType'

export interface CGTaskDefinition{
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
	/**	Task Name : Small Text	*/
	task_name: string
	/**	Description : Text Editor	*/
	description?: string
	/**	Predecessor Tasks : Data	*/
	predecessor_tasks?: string
	/**	Successor Tasks : Data	*/
	successor_tasks?: string
	/**	Regex for transition : Data	*/
	regex_for_transition?: string
	/**	Assigned To : Link - CG User	*/
	assigned_to: string
	/**	Assignee : Link - CG User	*/
	assignee: string
	/**	Task Type : Select	*/
	task_type?: "Onetime" | "Recurring"
	/**	Tag : Link - CG Tags	*/
	tag?: string
	/**	Submit File : JSON	*/
	submit_file?: any
	/**	Attach File : JSON	*/
	attach_file?: any
	/**	Task Checklist : Table - CG Task Checklist Item	*/
	checklist?: CGTaskChecklistItem[]
	/**	Subtask : Table - CG Subtask Definition	*/
	subtask?: CGSubtaskDefinition[]
	/**	Due Date : Datetime	*/
	due_date?: string
	/**	Holiday Behaviour : Select	*/
	holiday_behaviour: "" | "Previous Working Date" | "Ignore Holiday" | "Next Working Date"
	/**	Status : Select	*/
	status: "Upcoming" | "Completed" | "Due Today" | "Overdue"
	/**	Priority : Select	*/
	priority: "Low" | "Medium" | "Critical"
	/**	Checker : Link - CG User	*/
	checker?: string
	/**	Generated Till Date : Datetime	*/
	generated_till_date?: string
	/**	Upload Required : Check	*/
	upload_required?: 0 | 1
	/**	Is Completed : Check	*/
	is_completed?: 0 | 1
	/**	Restrict Before or After Due Date : Check	*/
	restrict?: 0 | 1
	/**	Company ID : Link - CG Company	*/
	company_id: string
	/**	Recurrence Type ID : Table - CG Recurrence Type	*/
	recurrence_type_id?: CGRecurrenceType[]
	/**	Enabled : Check	*/
	enabled?: 0 | 1
	/**	Has Subtask : Check	*/
	has_subtask?: 0 | 1
	/**	Branch : Link - CG Branch	*/
	branch?: string
	/**	Department : Link - CG Department	*/
	department?: string
	/**	Reopened : Int	*/
	reopened?: number
	/**	Is Paused : Check	*/
	is_paused?: 0 | 1
	/**	Pause Start Date : Datetime	*/
	pause_start_date?: string
	/**	Pause End Date : Datetime	*/
	pause_end_date?: string
	/**	Pause Reason : Text	*/
	pause_reason?: string
	/**	Paused By : Link - CG User	*/
	paused_by?: string
	/**	Allow Manual Resume : Check	*/
	can_resume_manually?: 0 | 1
}
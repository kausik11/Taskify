import { CGSubtaskInstance } from './CGSubtaskInstance'
import { CGTaskChecklistItem } from './CGTaskChecklistItem'
import { CGRecurrenceType } from './CGRecurrenceType'

export interface CGTaskInstance{
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
	/**	Task Definition ID : Link - CG Task Definition	*/
	task_definition_id?: string
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
	assignee?: string
	/**	Task Type : Select	*/
	task_type?: "Onetime" | "Recurring" | "Process" | "Project"
	/**	Tag : Link - CG Tags	*/
	tag?: string
	/**	Subtask : Table - CG Subtask Instance	*/
	subtask?: CGSubtaskInstance[]
	/**	Status Map : Int	*/
	status_map?: number
	/**	Priority Map : Int	*/
	priority_map?: number
	/**	Status Priority Map : Data	*/
	status_priority_map?: string
	/**	Reminder Enabled : Check	*/
	reminder_enabled?: 0 | 1
	/**	Reminder Frequency : Select	*/
	reminder_frequency?: "" | "Daily" | "Weekly" | "Custom"
	/**	Starting On : Datetime	*/
	starting_on?: string
	/**	Reminder Interval : Int	*/
	reminder_interval?: number
	/**	Reminder Unit : Select	*/
	reminder_unit?: "" | "Days" | "Hours"
	/**	Total Reminders : Int	*/
	reminder_total_times?: number
	/**	Reminders Remaining : Int	*/
	reminder_times_remaining?: number
	/**	Next Remind At : Datetime	*/
	next_remind_at?: string
	/**	Branch : Link - CG Branch	*/
	branch?: string
	/**	Department : Link - CG Department	*/
	department?: string
	/**	Task Checklist : Table - CG Task Checklist Item	*/
	checklist?: CGTaskChecklistItem[]
	/**	Attach File : JSON	*/
	attach_file?: any
	/**	Submit File : JSON	*/
	submit_file?: any
	/**	Due Date : Datetime	*/
	due_date?: string
	/**	Status : Select	*/
	status: "Upcoming" | "Completed" | "Due Today" | "Overdue" | "Rejected" | "Paused"
	/**	Priority : Select	*/
	priority: "Low" | "Medium" | "Critical"
	/**	Checker : Link - CG User	*/
	checker?: string
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
	/**	Completed On : Datetime	*/
	completed_on?: string
	/**	Completed By : Link - CG User	*/
	completed_by?: string
	/**	Completion Platform : Select	*/
	completion_platform?: "" | "Mobile" | "Web"
	/**	Is Help Ticket : Check	*/
	is_help_ticket?: 0 | 1
	/**	Reopened : Int	*/
	reopened?: number
	/**	Reopened By : Link - CG User	*/
	reopened_by?: string
	/**	Approved : Check	*/
	approved?: 0 | 1
	/**	Approved On : Datetime	*/
	approved_on?: string
	/**	Last Comment : Small Text	*/
	last_comment?: string
	/**	Delayed Time : Data	*/
	delayed_time?: string
	/**	Is Delayed : Check	*/
	is_delayed?: 0 | 1
	/**	Holiday Behaviour : Data	*/
	holiday_behaviour?: string
	/**	Attached Form : Link - DocType	*/
	attached_form?: string
	/**	Attached Docname : Dynamic Link	*/
	attached_docname?: string
	/**	Select Next Task Doer : Check	*/
	select_next_task_doer?: 0 | 1
	/**	Next Task Assigned To : Link - CG User	*/
	next_task_assigned_to?: string
	/**	Is Subtask : Check	*/
	is_subtask?: 0 | 1
	/**	Parent Task Instance : Link - CG Task Instance	*/
	parent_task_instance?: string
	/**	Notification Type : Select - Type of notification to send	*/
	notification_type?: "" | "Created" | "Updated" | "Completed" | "Reopened" | "Deleted" | "Assigned" | "Rejected" | "Paused" | "Resumed"
	/**	Notification Status : Select	*/
	notification_status?: "Pending" | "Sent" | "Skipped" | "Failed"
	/**	Notification Scheduled For : Datetime - Date and time when notification should be sent	*/
	notification_scheduled_for?: string
	/**	Notification Sent On : Datetime	*/
	notification_sent_on?: string
	/**	Skip Notification : Check	*/
	skip_notification?: 0 | 1
}
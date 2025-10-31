
export interface CGRole{
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
	/**	Role Name : Data	*/
	role_name: string
	/**	Company ID : Link - CG Company	*/
	company_id?: string
	/**	Assign Team Member : Check	*/
	assign_team_member?: 0 | 1
	/**	Assign Team Lead : Check	*/
	assign_team_lead?: 0 | 1
	/**	Assign Admin : Check	*/
	assign_admin?: 0 | 1
	/**	Assign Self : Check	*/
	assign_self?: 0 | 1
	/**	Create Onetime Task : Check	*/
	create_onetime_task?: 0 | 1
	/**	Create Recurring Task : Check	*/
	create_recurring_task?: 0 | 1
	/**	Create FMS : Check	*/
	create_fms?: 0 | 1
	/**	Create Help Ticket : Check	*/
	create_help_ticket?: 0 | 1
	/**	Branches Create : Check	*/
	branches_create?: 0 | 1
	/**	Branches Delete : Check	*/
	branches_delete?: 0 | 1
	/**	Branches Read : Check	*/
	branches_read?: 0 | 1
	/**	Branches Write : Check	*/
	branches_write?: 0 | 1
	/**	Department Create : Check	*/
	department_create?: 0 | 1
	/**	Department Delete : Check	*/
	department_delete?: 0 | 1
	/**	Department Read : Check	*/
	department_read?: 0 | 1
	/**	Department Write : Check	*/
	department_write?: 0 | 1
	/**	Holiday Create : Check	*/
	holiday_create?: 0 | 1
	/**	Holiday Delete : Check	*/
	holiday_delete?: 0 | 1
	/**	Holiday Read : Check	*/
	holiday_read?: 0 | 1
	/**	Holiday Write : Check	*/
	holiday_write?: 0 | 1
	/**	Team Members Create : Check	*/
	team_members_create?: 0 | 1
	/**	Team Members Delete : Check	*/
	team_members_delete?: 0 | 1
	/**	Team Members Read : Check	*/
	team_members_read?: 0 | 1
	/**	Team Members Write : Check	*/
	team_members_write?: 0 | 1
	/**	Notifications Create : Check	*/
	notifications_create?: 0 | 1
	/**	Notifications Delete : Check	*/
	notifications_delete?: 0 | 1
	/**	Notifications Read : Check	*/
	notifications_read?: 0 | 1
	/**	Notifications Write : Check	*/
	notifications_write?: 0 | 1
	/**	Tags Create : Check	*/
	tags_create?: 0 | 1
	/**	Tags Delete : Check	*/
	tags_delete?: 0 | 1
	/**	Tags Read : Check	*/
	tags_read?: 0 | 1
	/**	Tags Write : Check	*/
	tags_write?: 0 | 1
	/**	Roles Create : Check	*/
	roles_create?: 0 | 1
	/**	Roles Delete : Check	*/
	roles_delete?: 0 | 1
	/**	Roles Read : Check	*/
	roles_read?: 0 | 1
	/**	Roles Write : Check	*/
	roles_write?: 0 | 1
	/**	MIS : Check	*/
	mis?: 0 | 1
	/**	Smart Insights : Check	*/
	smart_insights?: 0 | 1
}
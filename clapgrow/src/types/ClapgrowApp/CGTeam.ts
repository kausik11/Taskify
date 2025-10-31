import { CGTeamMember } from './CGTeamMember'

export interface CGTeam{
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
	/**	Company ID : Link - CG Company	*/
	company_id: string
	/**	Branch ID : Link - CG Branch	*/
	branch_id: string
	/**	Department : Link - CG Department	*/
	department?: string
	/**	Leader : Link - CG User	*/
	team_lead: string
	/**	Members : Table - CG Team Member	*/
	members?: CGTeamMember[]
}
export interface CGRolePermission {
  name: number;
  creation: string;
  modified: string;
  owner: string;
  modified_by: string;
  docstatus: 0 | 1 | 2;
  parent?: string;
  parentfield?: string;
  parenttype?: string;
  idx?: number;
  /**	Assign Team Member : Check	*/
  assign_team_member?: 0 | 1;
  /**	Assign Team Lead : Check	*/
  assign_team_lead?: 0 | 1;
  /**	Assign Admin : Check	*/
  assign_admin?: 0 | 1;
  /**	Assign Self : Check	*/
  assign_self?: 0 | 1;
  /**	Create Onetime Task : Check	*/
  create_onetime_task?: 0 | 1;
  /**	Create Recurring Task : Check	*/
  create_recurring_task?: 0 | 1;
  /**	Create FMS : Check	*/
  create_fms?: 0 | 1;
  /**	Create Help Ticket : Check	*/
  create_help_ticket?: 0 | 1;
  /**	Branches : Check	*/
  branches?: 0 | 1;
  /**	Holiday : Check	*/
  holiday?: 0 | 1;
  /**	Team Members : Check	*/
  team_members?: 0 | 1;
  /**	Notifications : Check	*/
  notifications?: 0 | 1;
  /**	Tags : Check	*/
  tags?: 0 | 1;
  /**	Roles : Check	*/
  roles?: 0 | 1;
  /**	MIS : Check	*/
  mis?: 0 | 1;
  /**	Smart Insights : Check	*/
  smart_insights?: 0 | 1;
}

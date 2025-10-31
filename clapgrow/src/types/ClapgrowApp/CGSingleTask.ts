export interface CGSingleTask {
  name: string;
  creation: string;
  modified: string;
  owner: string;
  modified_by: string;
  docstatus: 0 | 1 | 2;
  parent?: string;
  parentfield?: string;
  parenttype?: string;
  idx?: number;
  /**	Task Definition ID : Link - CG Task Definition	*/
  task_definition_id: string;
  /**	Task Name : Data	*/
  task_name: string;
  /**	Predecessor Tasks : Data	*/
  predecessor_id?: string;
  /**	Successor Tasks : Data	*/
  successor_id?: string;
  /**	Assignee : Link - CG User	*/
  assignee: string;
  /**	Assigned To : Link - CG User	*/
  assigned_to: string;
  /**	Checker : Link - CG User	*/
  checker?: string;
  /**	Description : Long Text	*/
  description?: string;
  /**	Submit File : JSON	*/
  submit_file?: any;
  /**	Attach File : JSON	*/
  attach_file?: any;
  /**	Status : Select	*/
  status?: "Upcoming" | "Due Today" | "Overdue" | "Completed";
  /**	Due Date : Datetime	*/
  due_date?: string;
  /**	Regex For Transition : Data	*/
  regex_for_transition?: string;
  /**	Priority : Select	*/
  priority: "Low" | "Medium" | "Critical";
  /**	Company ID : Link - CG Company	*/
  company_id: string;
  /**	Is Completed : Check	*/
  is_completed?: 0 | 1;
  /**	Upload Required : Check	*/
  upload_required?: 0 | 1;
  /**	Is Help Ticket : Check	*/
  is_help_ticket?: 0 | 1;
  /**	Restrict Upload Before Or After Due Date : Check	*/
  restrict?: 0 | 1;
  /**	Task Type : Data	*/
  task_type: string;
  /**	Approved On : Datetime	*/
  approved_on?: string;
  /**	Completed On : Datetime	*/
  completed_on?: string;
  /**	Approved : Data	*/
  approved?: string;
}

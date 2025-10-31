export interface CGScheduledTaskInstance {
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
  task_name?: string;
  /**	Predecessor ID : Data	*/
  predecessor_id?: string;
  /**	Successor ID : Data	*/
  successor_id?: string;
  /**	Regex For Transition : Data	*/
  regex_for_transition?: string;
  /**	Assignee : Link - CG User	*/
  assignee: string;
  /**	Assigned To : Link - CG User	*/
  assigned_to: string;
  /**	Description : Long Text	*/
  description?: string;
  /**	Submit File : JSON	*/
  submit_file?: any;
  /**	Checker : Link - CG User	*/
  checker?: string;
  /**	Priority : Select	*/
  priority?: "Low" | "Medium" | "Critical";
  /**	Due Date : Datetime	*/
  due_date: string;
  /**	Upload Required : Check	*/
  upload_required?: 0 | 1;
  /**	Restrict : Check	*/
  restrict?: 0 | 1;
  /**	Is Completed : Check	*/
  is_completed?: 0 | 1;
  /**	Status : Select	*/
  status?: "Upcoming" | "Due Today" | "Overdue" | "Completed";
  /**	Company ID : Link - CG Company	*/
  company_id: string;
  /**	Task Type : Data	*/
  task_type: string;
  /**	Attach File : JSON	*/
  attach_file?: any;
  /**	Completed On : Datetime	*/
  completed_on?: string;
  /**	Approved : Check	*/
  approved?: 0 | 1;
  /**	Approved On : Datetime	*/
  approved_on?: string;
}

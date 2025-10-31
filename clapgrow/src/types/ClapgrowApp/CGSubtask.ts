export interface CGSubtask {
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
  /**	Parent Task Type : Link - DocType	*/
  parent_task_type: string;
  /**	Parent Task ID : Dynamic Link	*/
  parent_task_id: string;
  /**	Subtask ID : Link - CG Single Task	*/
  subtask_id: string;
  /**	Company ID : Link - CG Company	*/
  company_id: string;
}

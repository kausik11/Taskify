export interface CGNotification {
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
  /**	Types : Select	*/
  types:
    | ""
    | "Everytime a task is assigned to you"
    | "Receive updates as an observer"
    | "Reminder for upcoming tasks"
    | "Task Overdue"
    | "Summary/ Digest"
    | "Attendance Report"
    | "Weekly Score"
    | "MIS Score"
    | "Default Reminder";
  /**	Switch : Check	*/
  switch?: 0 | 1;
  /**	Whatsapp : Check	*/
  whatsapp?: 0 | 1;
  /**	Email : Check	*/
  email?: 0 | 1;
  /**	TAT : Select	*/
  tat?: "" | "Daily" | "Weekly" | "Monthly";
  /**	Time : Time	*/
  time?: string;
  /**	Company ID : Link - CG Company	*/
  company_id: string;
}

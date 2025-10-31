export interface CGRecurringHoliday {
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
  /**	Repeat Every : Select	*/
  repeat_every?: "" | "Weekly" | "Monthly";
  /**	Repeat Unit : Int - e.g., 1 for every week/month, 2 for every 2nd week/month, and so on	*/
  repeat_unit?: number;
  /**	Week Number : Select	*/
  week_number?: "" | "1st" | "2nd" | "3rd" | "4th" | "Last";
  /**	Days of Week : Data - Select multiple days if applicable.

Comma-separated days (e.g., Mon,Tue,Sun)	*/
  days_of_week?: string;
}

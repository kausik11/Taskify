export interface GoogleCalendar {
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
  /**	Enable : Check	*/
  enable?: 0 | 1;
  /**	Calendar Name : Data - The name that will appear in Google Calendar	*/
  calendar_name: string;
  /**	User : Link - User	*/
  user: string;
  /**	Pull from Google Calendar : Check	*/
  pull_from_google_calendar?: 0 | 1;
  /**	Push to Google Calendar : Check	*/
  push_to_google_calendar?: 0 | 1;
  /**	Google Calendar ID : Data	*/
  google_calendar_id?: string;
  /**	Refresh Token : Password	*/
  refresh_token?: string;
  /**	Authorization Code : Password	*/
  authorization_code?: string;
  /**	Next Sync Token : Password	*/
  next_sync_token?: string;
}

export interface PushNotificationSettings {
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
  /**	Enable Push Notification Relay : Check	*/
  enable_push_notification_relay?: 0 | 1;
  /**	API Key : Data	*/
  api_key?: string;
  /**	API Secret : Password	*/
  api_secret?: string;
}

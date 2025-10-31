export interface WebhookRequestLog {
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
  /**	Webhook : Link - Webhook	*/
  webhook?: string;
  /**	Reference Document : Data	*/
  reference_document?: string;
  /**	Headers : Code	*/
  headers?: string;
  /**	Data : Code	*/
  data?: string;
  /**	User : Link - User	*/
  user?: string;
  /**	URL : Data	*/
  url?: string;
  /**	Response : Code	*/
  response?: string;
  /**	Error : Text	*/
  error?: string;
}

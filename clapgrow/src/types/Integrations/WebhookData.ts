export interface WebhookData {
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
  /**	Fieldname : Select	*/
  fieldname: string;
  /**	Key : Data	*/
  key: string;
}

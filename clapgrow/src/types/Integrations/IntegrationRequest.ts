export interface IntegrationRequest {
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
  /**	Request ID : Data	*/
  request_id?: string;
  /**	Service : Data	*/
  integration_request_service?: string;
  /**	Is Remote Request? : Check	*/
  is_remote_request?: 0 | 1;
  /**	Request Description : Data	*/
  request_description?: string;
  /**	Status : Select	*/
  status?: "" | "Queued" | "Authorized" | "Completed" | "Cancelled" | "Failed";
  /**	URL : Small Text	*/
  url?: string;
  /**	Request Headers : Code	*/
  request_headers?: string;
  /**	Request Data : Code	*/
  data?: string;
  /**	Output : Code	*/
  output?: string;
  /**	Error : Code	*/
  error?: string;
  /**	Reference Document Type : Link - DocType	*/
  reference_doctype?: string;
  /**	Reference Document Name : Dynamic Link	*/
  reference_docname?: string;
}

import { WebhookHeader } from "./WebhookHeader";
import { WebhookData } from "./WebhookData";

export interface Webhook {
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
  /**	DocType : Link - DocType	*/
  webhook_doctype: string;
  /**	Doc Event : Select	*/
  webhook_docevent?:
    | "after_insert"
    | "on_update"
    | "on_submit"
    | "on_cancel"
    | "on_trash"
    | "on_update_after_submit"
    | "on_change";
  /**	Enabled : Check	*/
  enabled?: 0 | 1;
  /**	Condition : Small Text - The webhook will be triggered if this expression is true	*/
  condition?: string;
  /**	Request URL : Small Text	*/
  request_url: string;
  /**	Is Dynamic URL? : Check - On checking this option, URL will be treated like a jinja template string	*/
  is_dynamic_url?: 0 | 1;
  /**	Request Timeout : Int - The number of seconds until the request expires	*/
  timeout?: number;
  /**	Background Jobs Queue : Autocomplete	*/
  background_jobs_queue?: any;
  /**	Request Method : Select	*/
  request_method: "POST" | "PUT" | "DELETE";
  /**	Request Structure : Select	*/
  request_structure?: "" | "Form URL-Encoded" | "JSON";
  /**	Enable Security : Check	*/
  enable_security?: 0 | 1;
  /**	Webhook Secret : Password	*/
  webhook_secret?: string;
  /**	Headers : Table - Webhook Header	*/
  webhook_headers?: WebhookHeader[];
  /**	Data : Table - Webhook Data	*/
  webhook_data?: WebhookData[];
  /**	JSON Request Body : Code - To add dynamic values from the document, use jinja tags like

<div>
<pre><code>{ "id": "{{ doc.name }}" }</code>
</pre>
</div>	*/
  webhook_json?: string;
}

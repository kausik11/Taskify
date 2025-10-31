import { OAuthClientRole } from "./OAuthClientRole";

export interface OAuthClient {
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
  /**	App Client ID : Data	*/
  client_id?: string;
  /**	App Name : Data	*/
  app_name: string;
  /**	User : Link - User	*/
  user?: string;
  /**	Allowed Roles : Table MultiSelect - OAuth Client Role	*/
  allowed_roles?: OAuthClientRole[];
  /**	App Client Secret : Data	*/
  client_secret?: string;
  /**	Skip Authorization : Check - If checked, users will not see the Confirm Access dialog.	*/
  skip_authorization?: 0 | 1;
  /**	Scopes : Text - A list of resources which the Client App will have access to after the user allows it.<br> e.g. project	*/
  scopes: string;
  /**	Redirect URIs : Text - URIs for receiving authorization code once the user allows access, as well as failure responses. Typically a REST endpoint exposed by the Client App.
<br>e.g. http://hostname/api/method/frappe.integrations.oauth2_logins.login_via_facebook	*/
  redirect_uris?: string;
  /**	Default Redirect URI : Data	*/
  default_redirect_uri: string;
  /**	Grant Type : Select	*/
  grant_type?: "Authorization Code" | "Implicit";
  /**	Response Type : Select	*/
  response_type?: "Code" | "Token";
}

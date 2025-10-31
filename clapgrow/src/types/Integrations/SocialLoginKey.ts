export interface SocialLoginKey {
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
  /**	Enable Social Login : Check	*/
  enable_social_login?: 0 | 1;
  /**	Social Login Provider : Select	*/
  social_login_provider?:
    | "Custom"
    | "Facebook"
    | "Frappe"
    | "GitHub"
    | "Google"
    | "Office 365"
    | "Salesforce"
    | "fairlogin";
  /**	Client ID : Data	*/
  client_id?: string;
  /**	Provider Name : Data	*/
  provider_name: string;
  /**	Client Secret : Password	*/
  client_secret?: string;
  /**	Icon : Data	*/
  icon?: string;
  /**	Base URL : Data	*/
  base_url?: string;
  /**	Sign ups : Select - Controls whether new users can sign up using this Social Login Key. If unset, Website Settings is respected.	*/
  sign_ups?: "" | "Allow" | "Deny";
  /**	Authorize URL : Data	*/
  authorize_url?: string;
  /**	Access Token URL : Data	*/
  access_token_url?: string;
  /**	Redirect URL : Data	*/
  redirect_url?: string;
  /**	API Endpoint : Data	*/
  api_endpoint?: string;
  /**	Custom Base URL : Check	*/
  custom_base_url?: 0 | 1;
  /**	API Endpoint Args : Code	*/
  api_endpoint_args?: string;
  /**	Auth URL Data : Code	*/
  auth_url_data?: string;
  /**	User ID Property : Data	*/
  user_id_property?: string;
}

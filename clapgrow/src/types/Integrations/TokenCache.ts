import { OAuthScope } from "./OAuthScope";

export interface TokenCache {
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
  /**	User : Link - User	*/
  user?: string;
  /**	Connected App : Link - Connected App	*/
  connected_app?: string;
  /**	Provider Name : Data	*/
  provider_name?: string;
  /**	Access Token : Password	*/
  access_token?: string;
  /**	Refresh Token : Password	*/
  refresh_token?: string;
  /**	Expires In : Int	*/
  expires_in?: number;
  /**	State : Data	*/
  state?: string;
  /**	Scopes : Table - OAuth Scope	*/
  scopes?: OAuthScope[];
  /**	Success URI : Data	*/
  success_uri?: string;
  /**	Token Type : Data	*/
  token_type?: string;
}

import { OAuthScope } from "./OAuthScope";
import { QueryParameters } from "./QueryParameters";

export interface ConnectedApp {
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
  /**	Provider Name : Data	*/
  provider_name: string;
  /**	OpenID Configuration : Data	*/
  openid_configuration?: string;
  /**	Client Id : Data	*/
  client_id?: string;
  /**	Redirect URI : Data	*/
  redirect_uri?: string;
  /**	Client Secret : Password	*/
  client_secret?: string;
  /**	Scopes : Table - OAuth Scope	*/
  scopes?: OAuthScope[];
  /**	Authorization URI : Small Text	*/
  authorization_uri?: string;
  /**	Token URI : Data	*/
  token_uri?: string;
  /**	Revocation URI : Data	*/
  revocation_uri?: string;
  /**	Userinfo URI : Data	*/
  userinfo_uri?: string;
  /**	Introspection URI : Data	*/
  introspection_uri?: string;
  /**	Query Parameters : Table - Query Parameters	*/
  query_parameters?: QueryParameters[];
}

export interface OAuthAuthorizationCode {
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
  /**	Client : Link - OAuth Client	*/
  client?: string;
  /**	User : Link - User	*/
  user?: string;
  /**	Scopes : Text	*/
  scopes?: string;
  /**	Authorization Code : Data	*/
  authorization_code?: string;
  /**	Expiration time : Datetime	*/
  expiration_time?: string;
  /**	Redirect URI Bound To Auth Code : Data	*/
  redirect_uri_bound_to_authorization_code?: string;
  /**	Validity : Select	*/
  validity?: "Valid" | "Invalid";
  /**	nonce : Data	*/
  nonce?: string;
  /**	Code Challenge : Data	*/
  code_challenge?: string;
  /**	Code challenge method : Select	*/
  code_challenge_method?: "" | "s256" | "plain";
}

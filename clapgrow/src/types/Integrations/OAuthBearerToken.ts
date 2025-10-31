export interface OAuthBearerToken {
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
  /**	Access Token : Data	*/
  access_token?: string;
  /**	Refresh Token : Data	*/
  refresh_token?: string;
  /**	Expiration time : Datetime	*/
  expiration_time?: string;
  /**	Expires In : Int	*/
  expires_in?: number;
  /**	Status : Select	*/
  status?: "Active" | "Revoked";
}

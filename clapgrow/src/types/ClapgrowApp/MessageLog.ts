
export interface MessageLog{
	name: string
	creation: string
	modified: string
	owner: string
	modified_by: string
	docstatus: 0 | 1 | 2
	parent?: string
	parentfield?: string
	parenttype?: string
	idx?: number
	/**	Instance : Link - Whatsapp Instance	*/
	instance?: string
	/**	Company ID : Link - CG Company	*/
	company_id?: string
	/**	Chat ID : Data	*/
	chat_id?: string
	/**	Message  : Long Text	*/
	message?: string
	/**	Message Type : Select	*/
	message_type?: "Sent" | "Received"
	/**	Acknowledgement Status : Select	*/
	acknowledgement_status?: "Sent" | "Delivered" | "Read"
	/**	Serialized ID : Data	*/
	serialized_id?: string
	/**	Media URL : Data	*/
	media_url?: string
	/**	Media Base64 : Long Text	*/
	media_base64?: string
	/**	Media Caption : Long Text	*/
	media_caption?: string
	/**	Media Name : Data	*/
	media_name?: string
	/**	As Document : Check	*/
	as_document?: 0 | 1
	/**	Has Media : Check	*/
	has_media?: 0 | 1
	/**	Media Type  : Data	*/
	media_type?: string
}
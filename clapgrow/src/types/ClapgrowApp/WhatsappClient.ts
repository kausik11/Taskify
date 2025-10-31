
export interface WhatsappClient{
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
	/**	Status : Data	*/
	status?: string
	/**	Display Name : Data	*/
	display_name?: string
	/**	Contact ID : Data	*/
	contact_id?: string
	/**	Formatted Number : Phone	*/
	formatted_number?: string
	/**	Profile Pic URL : Attach Image	*/
	profile_pic_url?: string
	/**	Self Link : Data	*/
	self_link?: string
	/**	QR Code : Attach Image	*/
	qr_code?: string
}
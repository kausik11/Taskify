
export interface QRCode{
	name: number
	creation: string
	modified: string
	owner: string
	modified_by: string
	docstatus: 0 | 1 | 2
	parent?: string
	parentfield?: string
	parenttype?: string
	idx?: number
	/**	Instance ID : Link - Whatsapp Instance	*/
	instance_id?: string
	/**	Company ID : Link - CG Company	*/
	company_id?: string
	/**	QR Code Data : Text	*/
	qr_code_data?: string
	/**	Generated On : Datetime	*/
	generated_on?: string
	/**	Image : Attach Image	*/
	image?: string
}
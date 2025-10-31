
export interface WhatsappSetting{
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
	/**	WA API URL : Data	*/
	wa_api_url: string
	/**	WA API TOKEN : Data	*/
	wa_api_token: string
	/**	Instance ID : Link - Whatsapp Instance	*/
	instance_id?: string
	/**	Company ID : Link - CG Company	*/
	company_id: string
}
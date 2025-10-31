
export interface WhatsappInstance{
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
	/**	Instance ID : Data	*/
	instance_id?: string
	/**	Instance Owner : Data	*/
	instance_owner?: string
	/**	Webhook Events : Text	*/
	webhook_events?: string
	/**	Is Trial : Check	*/
	is_trial?: 0 | 1
	/**	Status : Select	*/
	status?: "success" | "error"
	/**	Instance Status : Select	*/
	instance_status?: "booting" | "loading_screen" | "qr" | "authenticated" | "auth_failure" | "ready" | "disconnected"
	/**	Company ID : Link - CG Company	*/
	company_id: string
}
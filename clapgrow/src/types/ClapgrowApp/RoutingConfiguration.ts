
export interface RoutingConfiguration{
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
	/**	Label : Data	*/
	label: string
	/**	Doctype Name : Link - DocType	*/
	doctype_name?: string
	/**	URL : Data	*/
	url?: string
	/**	Hide : Check	*/
	hide?: 0 | 1
	/**	List Props : JSON	*/
	list_props?: any
}
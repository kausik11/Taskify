import { RoutingConfiguration } from './RoutingConfiguration'

export interface ClapgrowRoutingConfiguration{
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
	/**	Routing : Table - Routing Configuration	*/
	routing?: RoutingConfiguration[]
}
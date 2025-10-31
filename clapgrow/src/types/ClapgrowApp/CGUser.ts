import { CGUserTeam } from './CGUserTeam'

export interface CGUser{
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
	/**	Enabled : Check	*/
	enabled?: 0 | 1
	/**	First Name : Data	*/
	first_name: string
	/**	Middle Name : Data	*/
	middle_name?: string
	/**	Last Name : Data	*/
	last_name?: string
	/**	User Image : Attach Image	*/
	user_image?: string
	/**	Country : Link - Country	*/
	country?: string
	/**	Full Name : Data	*/
	full_name?: string
	/**	Email : Data	*/
	email: string
	/**	Birthday : Date	*/
	birthday?: string
	/**	Gender : Select	*/
	gender?: "Male" | "Female" | "Transgender" | "Prefer Not To Say"
	/**	Phone : Phone	*/
	phone: string
	/**	Company ID : Link - CG Company	*/
	company_id: string
	/**	Department ID : Link - CG Department	*/
	department_id: string
	/**	Branch ID : Link - CG Branch	*/
	branch_id: string
	/**	Role : Link - CG Role	*/
	role: string
	/**	Report To : Table - CG User Team	*/
	report_to?: CGUserTeam[]
	/**	Reporter : Link - CG User	*/
	reporter?: string
	/**	Is Super Admin : Check	*/
	is_super_admin?: 0 | 1
	/**	CTC (Annually) : Currency	*/
	ctc?: number
	/**	Designation : Data	*/
	designation?: string
	/**	Cost Per Hour : Currency	*/
	cost_per_hour?: number
	email?: string
}
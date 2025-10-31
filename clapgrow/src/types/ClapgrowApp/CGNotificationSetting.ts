
export interface CGNotificationSetting{
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
	/**	Company : Link - CG Company	*/
	company_id?: string
	/**	Task Assigned : Check	*/
	ta_on?: 0 | 1
	/**	Task WhatsApp : Check	*/
	ta_wa?: 0 | 1
	/**	Task Email : Check	*/
	ta_email?: 0 | 1
	/**	Upcoming Task : Check	*/
	ut_on?: 0 | 1
	/**	Upcoming WhatsApp : Check	*/
	ut_wa?: 0 | 1
	/**	Upcoming Email : Check	*/
	ut_email?: 0 | 1
	/**	Upcoming Time : Select	*/
	ut_time?: "08:00" | "12:00" | "16:00" | "20:00"
	/**	Overdue Task : Check	*/
	ot_on?: 0 | 1
	/**	Overdue WhatsApp : Check	*/
	ot_wa?: 0 | 1
	/**	Overdue Email : Check	*/
	ot_email?: 0 | 1
	/**	Summary Digest : Check	*/
	sd_on?: 0 | 1
	/**	Digest WhatsApp : Check	*/
	sd_wa?: 0 | 1
	/**	Digest Email : Check	*/
	sd_email?: 0 | 1
	/**	Digest Frequency : Select	*/
	sd_freq?: "Daily" | "Weekly" | "Monthly"
	/**	Weekly Score : Check	*/
	ws_on?: 0 | 1
	/**	Score WhatsApp : Check	*/
	ws_wa?: 0 | 1
	/**	Score Email : Check	*/
	ws_email?: 0 | 1
	/**	MIS Score : Check	*/
	ms_on?: 0 | 1
	/**	MIS WhatsApp : Check	*/
	ms_wa?: 0 | 1
	/**	MIS Email : Check	*/
	ms_email?: 0 | 1
	/**	Default Reminder : Check	*/
	dr_on?: 0 | 1
	/**	Reminder WhatsApp : Check	*/
	dr_wa?: 0 | 1
	/**	Reminder Email : Check	*/
	dr_email?: 0 | 1
	/**	Reminder Frequency : Select	*/
	dr_freq?: "Daily" | "Weekly" | "Monthly"
	/**	Recurring Task Completion : Check	*/
	rtc_on?: 0 | 1
	/**	Recurring Task Completion Email : Check	*/
	rtc_email?: 0 | 1
	/**	Recurring Task Completion Whatsapp : Check	*/
	rtc_wa?: 0 | 1
	/**	Onetime Task Completion : Check	*/
	otc_on?: 0 | 1
	/**	Onetime Task Completion Email : Check	*/
	otc_email?: 0 | 1
	/**	Onetime Task Completion Whatsapp : Check	*/
	otc_wa?: 0 | 1
	/**	Task Deletion : Check	*/
	td_on?: 0 | 1
	/**	Task Deletion Email : Check	*/
	td_email?: 0 | 1
	/**	Task Deletion Whatsapp : Check	*/
	td_wa?: 0 | 1
}
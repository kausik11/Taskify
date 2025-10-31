import { Checkbox } from "@/components/ui/checkbox";
import AGComponent from "../AGComponent";
import { useContext, useMemo } from "react";
import { UserContext } from "@/utils/auth/UserProvider";
import { useFrappeGetDoc, useFrappeUpdateDoc } from "frappe-react-sdk";

const NOTIFICATION_MAP = {
	"Everytime a task is assigned to you": {
		base: "ta",
		fields: {
			enabled: "ta_on",
			whatsapp: "ta_wa",
			email: "ta_email",
		},
	},
	"Reminder for upcoming tasks": {
		base: "ut",
		fields: {
			enabled: "ut_on",
			whatsapp: "ut_wa",
			email: "ut_email",
			interval: "ut_time",
		},
	},
	"Task Overdue": {
		base: "ot",
		fields: {
			enabled: "ot_on",
			whatsapp: "ot_wa",
			email: "ot_email",
		},
	},
	"Summary/ Digest": {
		base: "sd",
		fields: {
			enabled: "sd_on",
			whatsapp: "sd_wa",
			email: "sd_email",
			frequency: "sd_freq",
		},
	},
	"Weekly Score": {
		base: "ws",
		fields: {
			enabled: "ws_on",
			whatsapp: "ws_wa",
			email: "ws_email",
		},
	},
	"MIS Score": {
		base: "ms",
		fields: {
			enabled: "ms_on",
			whatsapp: "ms_wa",
			email: "ms_email",
		},
	},
	"Default Reminder": {
		base: "dr",
		fields: {
			enabled: "dr_on",
			whatsapp: "dr_wa",
			email: "dr_email",
			frequency: "dr_freq",
		},
	},
	"Recurring Task Completion": {
		base: "rtc",
		fields: {
			enabled: "rtc_on",
			whatsapp: "rtc_wa",
			email: "rtc_email",
		},
	},
	"Onetime Task Completion": {
		base: "otc",
		fields: {
			enabled: "otc_on",
			whatsapp: "otc_wa",
			email: "otc_email",
		},
	},
	"Task Deletion": {
		base: "td",
		fields: {
			enabled: "td_on",
			whatsapp: "td_wa",
			email: "td_email"
		}
	},
	"Process Notification": {
		base: "pn",
		fields: {
			enabled: "pn_on",
			whatsapp: "pn_wa",
			email: "pn_email"
		}
	}
};

const NotificationComponent = () => {
	const { companyDetails } = useContext(UserContext);
	const companyName = companyDetails?.[0]?.name || "";
	const { updateDoc } = useFrappeUpdateDoc();

	const { data: notificationDoc, mutate } = useFrappeGetDoc(
		"CG Notification Setting",
		companyName,
		{
			fields: [
				"company_id",
				"ta_on",
				"ta_wa",
				"ta_email",
				"ut_on",
				"ut_wa",
				"ut_email",
				"ut_time",
				"ot_on",
				"ot_wa",
				"ot_email",
				"sd_on",
				"sd_wa",
				"sd_email",
				"sd_freq",
				"ws_on",
				"ws_wa",
				"ws_email",
				"ms_on",
				"ms_wa",
				"ms_email",
				"dr_on",
				"dr_wa",
				"dr_email",
				"dr_freq",
				"rtc_on",
				"rtc_email",
				"rtc_wa",
				"otc_on",
				"otc_email",
				"otc_wa",
				"td_on",
				"td_email",
				"td_wa",
				"pn_on",
				"pn_email",
				"pn_wa"
			],
		},
	);

	const notificationItems = useMemo(() => {
		if (!notificationDoc) return [];
		return Object.entries(NOTIFICATION_MAP).map(([label, config]) => ({
			type: label,
			enabled: notificationDoc[config.fields.enabled],
			channels: {
				email: notificationDoc[config.fields.email],
				whatsapp: notificationDoc[config.fields.whatsapp],
			},
			frequency: config.fields.frequency
				? notificationDoc[config.fields.frequency]
				: undefined,
			interval: config.fields.interval
				? notificationDoc[config.fields.interval]
				: undefined,
			docname: notificationDoc.name,
		}));
	}, [notificationDoc]);

	const columnDefsMemo = useMemo(
		() => [
			{
				headerName: "Types",
				field: "type",
				width: 270,
				filter: true,
				cellRenderer: (params: any) => (
					<p className="truncate text-[14px] font-[400] text-gray-700">
						{params.data?.type}
					</p>
				),
			},
			{
				headerName: "On/Off",
				field: "enabled",
				width: 150,
				filter: true,
				cellRenderer: (params: any) => {
					const notificationType = params.data?.type;
					const config =
            NOTIFICATION_MAP[notificationType as keyof typeof NOTIFICATION_MAP];
					return (
						<div className="p-2 flex">
							<label className="inline-flex items-center cursor-pointer">
								<input
									type="checkbox"
									className="sr-only peer"
									checked={params.data?.enabled === 1}
									onChange={(e) => {
										updateDoc("CG Notification Setting", params.data.docname, {
											[config.fields.enabled]: e.target.checked ? 1 : 0,
										}).then(() => mutate());
									}}
								/>
								<div
									className="relative w-11 h-6 bg-gray-200 rounded-full peer
                  peer-checked:bg-[#D4EFFF] peer-checked:after:bg-[#038EE2]
                  after:content-[''] after:absolute after:top-[2px] after:start-[2px]
                  after:bg-[#ACABB2] after:rounded-full after:h-5 after:w-5
                  after:transition-all peer-checked:after:translate-x-full"
								/>
							</label>
							{(notificationType === "Summary/ Digest" ||
                notificationType === "Default Reminder") && (
								<select
									value={params.data.frequency}
									onChange={(e) => {
										updateDoc("CG Notification Setting", params.data.docname, {
											[config.fields.frequency]: e.target.value,
										}).then(() => mutate());
									}}
									className="ms-3 text-sm text-[#0076BD] bg-transparent border-none"
								>
									<option value="Daily">Daily</option>
									<option value="Weekly">Weekly</option>
								</select>
							)}
							{notificationType === "Reminder for upcoming tasks" && (
								<select
									value={params.data.interval}
									onChange={(e) => {
										updateDoc("CG Notification Setting", params.data.docname, {
											[config.fields.interval]: e.target.value,
										}).then(() => mutate());
									}}
									className="ms-3 text-sm text-[#0076BD] bg-transparent border-none"
								>
									<option value="08:00">08:00</option>
									<option value="12:00">12:00</option>
									<option value="16:00">16:00</option>
									<option value="20:00">20:00</option>
								</select>
							)}
						</div>
					);
				},
			},
			{
				headerName: "Channels",
				field: "channels",
				width: 200,
				filter: true,
				cellRenderer: (params: any) => {
					const channels = params.data?.channels;
					const notificationType = params.data?.type;
					const config =
            NOTIFICATION_MAP[notificationType as keyof typeof NOTIFICATION_MAP];
					return (
						<div className="p-2 flex items-center gap-4">
							<div className="flex items-center gap-2">
								<Checkbox
									id={`email-${params.node.id}`}
									checked={channels.email === 1}
									onCheckedChange={(checked) => {
										updateDoc("CG Notification Setting", params.data.docname, {
											[config.fields.email]: checked ? 1 : 0,
										}).then(() => mutate());
									}}
									className="data-[state=checked]:bg-[#0076BD] data-[state=checked]:border-[#0076BD]"
								/>
								<label htmlFor={`email-${params.node.id}`} className="text-sm">
                  Email
								</label>
							</div>
							<div className="flex items-center gap-2">
								<Checkbox
									id={`whatsapp-${params.node.id}`}
									checked={channels.whatsapp === 1}
									onCheckedChange={(checked) => {
										updateDoc("CG Notification Setting", params.data.docname, {
											[config.fields.whatsapp]: checked ? 1 : 0,
										}).then(() => mutate());
									}}
									className="data-[state=checked]:bg-[#0076BD] data-[state=checked]:border-[#0076BD]"
								/>
								<label
									htmlFor={`whatsapp-${params.node.id}`}
									className="text-sm"
								>
                  Whatsapp
								</label>
							</div>
						</div>
					);
				},
			},
		],
		[updateDoc, mutate],
	);

	return (
		<section className="mt-5 mx-5 rounded-[8px] space-y-0 border-[#F0F1F2] border-[1px]">
			<AGComponent
				tableData={notificationItems}
				columnDefsMemo={columnDefsMemo}
				setIsOpen={() => {}}
				onRowClicked={() => {}}
				tableType={null}
				TableHeight="500px"
			/>
		</section>
	);
};

export default NotificationComponent;

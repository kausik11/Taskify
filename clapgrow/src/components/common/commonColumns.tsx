import upDownIcon from "@/assets/icons/upDownIcon.svg";
import demoProfileImg from "@/assets/images/demo-profile-img.svg";
import { CGBranch } from "@/types/ClapgrowApp/CGBranch";
import { CGDepartment } from "@/types/ClapgrowApp/CGDepartment";
import { Table, Table2, WorkflowIcon } from "lucide-react";
import { Column, TaskInsight } from "./CommonTypes";
import {
	DashboardIcon,
	SettingsIcon,
	SmartInsightIcon,
} from "./SideBarsIcons";
import { UserContext } from "@/utils/auth/UserProvider";
import { useContext, useMemo } from "react";

// export const SIDEBAR_DATA = [
//   {
//     href: "/dashboard",
//     label: "Tasks",
//     Icon: DashboardIcon,
//     subItems: [],
//     beta: false,
//   },
//   {
//     href: "",
//     label: "Process",
//     Icon: ProcessIcon,
//     subItems: [
//       {
//         href: "/process/create",
//         label: "Create a Process",
//         Icon: Plus,
//       },
//       {
//         href: "/process/1",
//         label: "Process 1",
//       },
//       {
//         href: "/process/2",
//         label: "Process 2",
//       },
//     ],
//     beta: false,
//   },
//   {
//     href: "",
//     label: "Smart Insights",
//     Icon: SmartInsightIcon,
//     subItems: [
//       {
//         href: "/member-insights",
//         label: "Member Insights",
//       },
//       {
//         href: "/recurring-task",
//         label: "Recurring Task",
//       },
//       {
//         href: "/mis-score",
//         label: "MIS Score",
//       },
//       {
//         href: "/details",
//         label: "Overall Insights",
//       },
//     ],
//     beta: false,
//   },
//   {
//     href: "/projectsDashoard",
//     label: "Projects",
//     Icon: ProjectIcons,
//     subItems: [],
//     beta: true,
//   },
//   {
//     href: "/settings",
//     label: "Settings",
//     Icon: SettingsIcon,
//     subItems: [],
//     beta: false,
//   },
//   {
//     href: "#",
//     label: "Support",
//     Icon: SuportIcon,
//     subItems: [],
//     beta: false,
//   },
// ];


export const useSidebarData = () => {
	const { roleBaseName, rolePermissions } = useContext(UserContext);

	const sidebarData = useMemo(() => {
		const isMemberRole = roleBaseName === "ROLE-Member";

		const data = [
			{
				href: "/dashboard",
				label: "Tasks",
				Icon: DashboardIcon,
				subItems: [],
				beta: false,
				disabled: false,
			},
			{
				href: "/form",
				label: "Form",
				Icon: Table2,
				subItems: [],
				beta: false,
				disabled: false,
			},
			{
				href: "/clapgrow-workflow",
				label: "Process",
				Icon: WorkflowIcon,
				subItems: [],
				beta: false,
				external: true,
				disabled: false,
			},
			{
				href: "/workflow-grid",
				label: "Workflow Grid",
				Icon: Table,
				subItems: [],
				beta: false,
				disabled: false,
			},
			{
				href: "",
				label: "Smart Insights",
				Icon: SmartInsightIcon,
				subItems: [
					{ 
						href: "/member-insights", 
						label: "Member Insights",
						disabled: isMemberRole // Disable for Member role
					},
					{ 
						href: "/mis-score", 
						label: "MIS Score",
						disabled: false
					},
					{ 
						href: "/recurring-task", 
						label: "Recurring Task",
						disabled: isMemberRole // Disable for Member role
					},
				],
				beta: false,
				disabled: false,
			},
		];

		// Check if the user has read access to any settings-related doctypes
		const hasSettingsReadAccess =
			rolePermissions?.branches_read === 1 ||
			rolePermissions?.department_read === 1 ||
			rolePermissions?.team_members_read === 1 ||
			rolePermissions?.holiday_read === 1;

		// Add Settings menu items if the user is ROLE-Admin or has any settings read access
		if (roleBaseName === "ROLE-Admin" || hasSettingsReadAccess) {
			data.push({
				href: "/settings",
				label: "Settings",
				Icon: SettingsIcon,
				subItems: [],
				beta: false,
				disabled: false,
			});
		}

		return data;
	}, [roleBaseName, rolePermissions]);

	return sidebarData;
};

// export const Taskcolumns: Column<any>[] = [
//   { key: "select", header: "", width: "col-span-1", icon: "" },
//   { key: "id", header: "Id", width: "col-span-2", icon: upDownIcon },
//   { key: "task_name", header: "Tasks", width: "col-span-2", icon: upDownIcon },
//   {
//     key: "task_type",
//     header: "Task Type",
//     width: "col-span-1",
//     icon: upDownIcon,
//   },
//   { key: "status", header: "Status", width: "col-span-1", icon: upDownIcon },
//   {
//     key: "priority",
//     header: "Priority",
//     width: "col-span-1",
//     icon: upDownIcon,
//   },
//   {
//     key: "due_date",
//     header: "Due Date",
//     width: "col-span-1",
//     icon: upDownIcon,
//   },
//   { key: "assignee", header: "Assignee", width: "col-span-1", icon: "" },
//   { key: "assigned_to", header: "Assigned To", width: "col-span-1", icon: "" },
//   { key: "actions", header: "Actions", width: "col-span-1", icon: "" },
// ];

// export const MIScolumns: Column<TaskInsight>[] = [
//   { key: "team_member", header: "Team Member", width: "2", icon: upDownIcon },
//   { key: "department", header: "Department", width: "2", icon: upDownIcon },
//   { key: "KRA", header: "KRA", width: "2", icon: upDownIcon },
//   { key: "KPI", header: "KPI", width: "2", icon: upDownIcon },
//   {
//     key: "current_planned",
//     header: "Current week Planned",
//     width: "1",
//     icon: upDownIcon,
//   },
//   {
//     key: "current_actual",
//     header: "Current Week Actual",
//     width: "1",
//     icon: upDownIcon,
//   },
//   {
//     key: "team_member_projected",
//     header: "Team Member Projected",
//     width: "1",
//     icon: upDownIcon,
//   },
//   {
//     key: "current_actual_percentage",
//     header: "Current Week Actual %",
//     width: "1",
//     icon: upDownIcon,
//   },
// ];

export const Taskcolumns = (
	roleBaseName: string,
	selectedTask: string,
): Column<any>[] => {
	const baseColumns: Column<any>[] = [
		{ key: "select", header: "", width: "col-span-1", icon: "" },
		{ key: "id", header: "Id", width: "col-span-2", icon: upDownIcon },
		{
			key: "task_name",
			header: "Tasks",
			width: "col-span-2",
			icon: upDownIcon,
		},
		{
			key: "task_type",
			header: "Task Type",
			width: "col-span-1",
			icon: upDownIcon,
		},
		{ key: "status", header: "Status", width: "col-span-1", icon: upDownIcon },
		{
			key: "priority",
			header: "Priority",
			width: "col-span-1",
			icon: upDownIcon,
		},
		{
			key: "due_date",
			header: "Due Date",
			width: "col-span-1",
			icon: upDownIcon,
		},
		{ key: "assignee", header: "Assignee", width: "col-span-1", icon: "" },
		{
			key: "assigned_to",
			header: "Assigned To",
			width: "col-span-1",
			icon: "",
		},
	];

	if (roleBaseName === "ROLE-Admin" || selectedTask == "myTask") {
		baseColumns.push({
			key: "actions",
			header: "Actions",
			width: "col-span-1",
			icon: "",
		});
	}

	return baseColumns;
};

const defaultColumnProps = {
	width: "2",
	icon: upDownIcon,
};

export const MIScolumns: Column<TaskInsight>[] = [
	{ ...defaultColumnProps, key: "team_member", header: "Team Member" },
	{ ...defaultColumnProps, key: "department", header: "Department" },
	{ ...defaultColumnProps, key: "KRA", header: "KRA" },
	{ ...defaultColumnProps, key: "KPI", header: "KPI" },
	{
		...defaultColumnProps,
		key: "current_planned",
		header: "Current Week Planned",
		width: "1", // Custom width
	},
	{
		...defaultColumnProps,
		key: "current_actual",
		header: "Current Week Actual",
		width: "1", // Custom width
	},

	// {
	//   ...defaultColumnProps,
	//   key: "team_member_projected",
	//   header: "Team Member Projected",
	//   width: "1", // Custom width
	// },
	{
		...defaultColumnProps,
		key: "current_actual_percentage",
		header: "Current Week Actual %",
		width: "1", // Custom width
	},
];

export const Branchcolumns = [
	{
		key: "branch_name" as keyof CGBranch,
		header: "Branch / Location",
		width: 1,
	},
	{
		key: "working_hours" as keyof CGBranch,
		header: "Working Hours",
		width: 5,
	},
];
export const Departmentcolumns = [
	{
		key: "department_name" as keyof CGDepartment,
		header: "Departments",
		width: 7,
	},
	{
		key: "member" as keyof CGDepartment,
		header: "Member",
		width: 7,
	},
];
export const TeamMembercolumns = [
	{ label: "Name", key: "name", width: "col-span-2" },
	{ label: "Email", key: "email", width: "col-span-2" },
	{ label: "Phone Number", key: "phone" },
	{ label: "Designation" },
	{ label: "Branch", key: "branch_id" },
	{ label: "Department", key: "department_id" },
	{ label: "₹ CTC (p.a)", key: "ctc" },
	{ label: "User Role", key: "role" },
];
export const TaskFields = [
	{
		label: "Assigned To",
		idField: "assigned_to",
		datatype: "isEmployeeData",
		nameField: "assigned_to",
		required: true,
		fieldType: "dropdown",
	},
	{
		label: "Checker",
		idField: "checker",
		datatype: "isEmployeeData",
		nameField: "checker",
		required: true,
		fieldType: "dropdown",
		disabled: true,
		condition: (recurringType: string, helpTicketType: boolean) =>
			helpTicketType === true, // Show only when helpTicketType is true
	},
	// {
	//   label: "Frequency",
	//   idField: "frequency",
	//   datatype: "isFrequencyData",
	//   nameField: "frequency",
	//   required: true,
	//   fieldType: "dropdown",
	//   condition: (recurringType: string, helpTicketType: boolean) =>
	//     !helpTicketType && recurringType !== "Onetime",
	// },
	{
		label: "Due Date & Time",
		idField: "Date",
		name: "due_date",
		type: "text",
		required: false,
		fieldType: "date",
		nameField: "due_date",
	},
	{
		label: "Priority",
		idField: "Priority_id",
		datatype: "isPriorityData",
		nameField: "priority",
		required: true,
		fieldType: "dropdown",
	},
	{
		label: "Tags",
		idField: "tags",
		datatype: "isTagsData",
		nameField: "tags",
		required: false,
		fieldType: "dropdown",
	},
	{
		label: "Description",
		name: "description",
		type: "text",
		required: false,
		fieldType: "textarea",
		width: "219%",
		nameField: "description",
	},
];

export const TeamMemberFields = [
	{
		label: "Email",
		name: "email",
		type: "text",
		required: true,
	},
	{
		label: "Phone number",
		name: "phone",
		type: "number",
		required: true,
	},
	{
		label: "Designation",
		name: "designation",
		type: "text",
		required: false,
	},
	{
		label: "Branch",
		idField: "branch_id",
		datatype: "isBranchData",
		selectFieldName: "Select Branch",
		nameField: "branch_id",
		required: true,
	},
	{
		label: "Department",
		idField: "department_id",
		datatype: "isDepartmentData",
		selectFieldName: "Select Department",
		nameField: "department_id",
		required: true,
	},
	{
		label: "CTC",
		name: "ctc",
		type: "text",
		required: false,
	},
	{
		label: "Cost Per Hour",
		name: "cost_per_hour",
		type: "text",
		required: false,
	},

	{
		label: "User Role",
		idField: "role",
		datatype: "isRoleData",
		nameField: "role_name",
		selectFieldName: "Select Role",
		required: true,
	},
	{
		label: "Report To",
		idField: "report_to",
		datatype: "isEmployeeData",
		nameField: "report_to",
		selectFieldName: "Select Report To",
		required: true,
	},
	// {
	//   label: "Reportee",
	//   idField: "reporter",
	//   datatype: "isEmployeeData",
	//   nameField: "reporter_name",
	//   selectFieldName: "Add Member",
	//   required: false,
	// },
];

// *****************Dummy Data*******************//

export const EMPLOYEE_DATA = [
	{ name: "Dan Lawrance", image: demoProfileImg },
	{ name: "Gautam Shah", image: demoProfileImg },
	{ name: "John Doe", image: demoProfileImg },
	{ name: "Rohit Sharma", image: demoProfileImg },
	{ name: "Rohan Sharma", image: demoProfileImg },
];

export const DEMO_ONE_TIME_TASK = new Array(20).fill({
	task: "Inventory statement check (COGS)",
	status: Math.random() > 0.5 ? "Overdue" : "Upcoming",
	assignee: "Employee 1",
	dueDate: new Date(),
});

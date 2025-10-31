import Critical from "@/assets/icons/criticalpriority.svg";
import Low from "@/assets/icons/lowpriority.svg";
import Medium from "@/assets/icons/mediumpriority.svg";
import listIcon from "@/assets/icons/list-view-icon.svg";
// import { getDaysInMonth } from "date-fns";

// const now = new Date();
// const totalDays = getDaysInMonth(now);
const totalDays = 30;
export const CurrentDAYS_DATA = [
	...Array.from({ length: totalDays }, (_, i) => ({ name: `${i + 1}` })),
	{ name: "Last" },
];

export const FREQUENCY_DATA = [
	{ name: "Daily" },
	{ name: "Weekly" },
	// {  name: "Fortnightly" },
	{ name: "Monthly" },
	{ name: "Yearly" },

	// {  name: "Quarterly" },
	// {  name: "Half Yearly" },
	// {  name: "Annually" },
	{ name: "Custom" },
	// {  name: "Periodically" },
];

export const weeks_data = [
	{ name: "1st" },
	{ name: "2nd" },
	{ name: "3rd" },
	{ name: "4th" },
	{ name: "Last" },
];

export const days_data = [
	{ name: "Sunday" },
	{ name: "Monday" },
	{ name: "Tuesday" },
	{ name: "Wednesday" },
	{ name: "Thursday" },
	{ name: "Friday" },
	{ name: "Saturday" },
];

type PriorityItem = {
  value: string;
  name: string;
  color: string;
  image: string; // Assuming `Critical`, `Medium`, and `Low` are URLs or imported image paths
  iconProps: { className: string };
};
export const PRIORITY_DATA: PriorityItem[] = [
	{
		value: "Critical",
		name: "Critical",
		color: "#D72727",
		image: Critical,
		iconProps: { className: "scale-90 rotate-180" },
	},
	{
		value: "Medium",
		name: "Medium",
		color: "#D8940E",
		image: Medium,
		iconProps: { className: "scale-90" },
	},
	{
		value: "Low",
		name: "Low",
		color: "#2D2C37",
		image: Low,
		iconProps: { className: "scale-90" },
	},
];
export const Working_DATA = [
	{ id: 1, name: "Next Working Date" },
	{ id: 2, name: "Previous Dorking Date" },
];
export const timeOptions = [
	"12:00 AM",
	"1:00 AM",
	"2:00 AM",
	"3:00 AM",
	"4:00 AM",
	"5:00 AM",
	"6:00 AM",
	"7:00 AM",
	"8:00 AM",
	"9:00 AM",
	"10:00 AM",
	"11:00 AM",
	"12:00 PM",
	"1:00 PM",
	"2:00 PM",
	"3:00 PM",
	"4:00 PM",
	"5:00 PM",
	"6:00 PM",
	"7:00 PM",
	"8:00 PM",
	"9:00 PM",
	"10:00 PM",
	"11:00 PM",
];
export const AllTaskTypeData = [
	{
		label: "Team Tasks",
		value: "teamTask",
		width: "w-[95px]",
		borderRadius: "rounded-l-[8px]",
	},
	{
		label: "My Tasks",
		value: "myTask",
		width: "w-[79px]",
		borderRadius: "rounded-r-[8px]",
	},
];
export const TaskViewData = [
	{ label: "List View", value: "list", icon: listIcon },
	{ label: "Calendar View", value: "calendar", icon: listIcon },
];
export const TeamMemberviews = [
	{ type: "personal", label: "Personal" },
	{ type: "tasks", label: "Tasks" },
	{ type: "team", label: "Team Members" },
];
export const StatusStyles: Record<
  "Completed" | "Overdue" | "Due Today" | "Upcoming" | "Paused" | "Rejected",
  string
> = {
	Completed: "text-[#0CA866] bg-[#EEFDF1]",
	Overdue: "text-[#A72C2C] bg-[#FFF4F4]",
	"Due Today": "text-[#BC8908] bg-[#FCF8E4]",
	Upcoming: "text-[#494EC8] bg-[#F3F3FE]",
	Paused: "text-[#7E3FF2] bg-[#F2EBFF]",
	Rejected: "text-[#52525B] bg-[#E5E7EB]",
};
export const Week_Trend = [
	{ value: "This Week", name: "This Week's Trend" },
	{ value: "Last 30 Days", name: "Last 30 Days Trend" },
];

//dummy project data
export const ProjectTableData = [
	{
		fullName: "Jhon Doe",
		Nop: 10,
		NoTask: 5,
		img: "https://www.svgrepo.com/show/382107/male-avatar-boy-face-man-user-6.svg",
	},
	{
		fullName: "Smith Doe",
		Nop: 5,
		NoTask: 20,
		img: "https://www.svgrepo.com/show/382107/male-avatar-boy-face-man-user-6.svg",
	},
	{
		fullName: "kausik saha",
		Nop: 15,
		NoTask: 10,
		img: "https://www.svgrepo.com/show/382107/male-avatar-boy-face-man-user-6.svg",
	},
	{
		fullName: "Rahul Das",
		Nop: 9,
		NoTask: 19,
		img: "https://www.svgrepo.com/show/382107/male-avatar-boy-face-man-user-6.svg",
	},
	{
		fullName: "Pritam saha",
		Nop: 11,
		NoTask: 18,
		img: "https://www.svgrepo.com/show/382107/male-avatar-boy-face-man-user-6.svg",
	},
	{
		fullName: "Rohit jain",
		Nop: 5,
		NoTask: 2,
		img: "https://www.svgrepo.com/show/382107/male-avatar-boy-face-man-user-6.svg",
	},
];

export const projectList = [
	{ name: "Project 1", value: "project_1" },
	{ name: "Project 2", value: "project_2" },
];

export const AllProjectTableData = [
	{
		projectname: "Project1",
		NoTask: 5,
		img: [
			"https://www.svgrepo.com/show/382107/male-avatar-boy-face-man-user-6.svg",
			"https://www.svgrepo.com/show/382107/male-avatar-boy-face-man-user-6.svg",
		],
	},
	{
		projectname: "Project2",
		NoTask: 15,
		img: [
			"https://www.svgrepo.com/show/382107/male-avatar-boy-face-man-user-6.svg",
			"https://github.com/shadcn.png",
		],
	},
	{
		projectname: "Project3",
		NoTask: 5,
		img: [
			"https://www.svgrepo.com/show/382107/male-avatar-boy-face-man-user-6.svg",
			"https://www.svgrepo.com/show/382107/male-avatar-boy-face-man-user-6.svg",
		],
	},
	{
		projectname: "Project4",
		NoTask: 15,
		img: [
			"https://www.svgrepo.com/show/382107/male-avatar-boy-face-man-user-6.svg",
			"https://github.com/shadcn.png",
		],
	},
	{
		projectname: "Project5",
		NoTask: 5,
		img: [
			"https://www.svgrepo.com/show/382107/male-avatar-boy-face-man-user-6.svg",
			"https://www.svgrepo.com/show/382107/male-avatar-boy-face-man-user-6.svg",
		],
	},
	{
		projectname: "Project6",
		NoTask: 15,
		img: [
			"https://www.svgrepo.com/show/382107/male-avatar-boy-face-man-user-6.svg",
			"https://github.com/shadcn.png",
		],
	},
];

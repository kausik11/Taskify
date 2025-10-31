// this based on the selected project dashboard
import { useState } from "react";
import TrendSelector from "../common/TrendSelector";
import filterIcon from "@/assets/icons/filter-icon.svg";
import { Archive } from "lucide-react";
import { Copy } from "lucide-react";
import { Trash2 } from "lucide-react";
import TaskStatusCard from "../dashboard/TaskStatusCard";
import ProjectBarChart from "./ProjectBarChart";
import ProjectChampionCard from "./ProjectChampionCard";
import AGComponent from "../AGComponent";
import { ProjectTableData } from "../../data/common";
import { useMemo } from "react";
import { Avatar, AvatarImage } from "../ui/avatar";

import { Button } from "react-day-picker";
import CombinedDropDown from "../dashboard/CombinedDropDown";
import { Controller } from "react-hook-form";
import { Label } from "recharts";
import Navbar from "../common/Navbar";
import CommonHeader from "../common/CommonHeader";

const DisplayProjectsDahboard = () => {
	const [isTableOpen, setTableOpen] = useState(false);
	const [trendsGraph, setTrendsGraph] = useState<string>("This Week");

	const [currentPage, setCurrentPage] = useState(1);
	const recordsPerPage = 4;
	//state for the sort button
	const [projectName, setProjectName] = useState<string | null>(null);
	const [isProjectOpen, setIsProjectOpen] = useState(false);

	const dummyData = ProjectTableData;
	const FinalData = Array.isArray(dummyData) ? dummyData : [];

	//Fetch api
	const columnDefsMemo = useMemo(
		() => [
			{
				headerName: "Member Name",
				field: "project_name",
				width: 300,
				filter: true,
				cellRenderer: (params: any) => (
					<p className="truncate text-[14px] text-[#5B5967] font-[400] flex justify-start items-center gap-2">
						<Avatar className="w-[24px] h-[24px]">
							<AvatarImage src={"https://github.com/shadcn.png"} />
						</Avatar>
						{params.data?.fullName}
					</p>
				),
			},
			{
				headerName: "Tasks Count",
				field: "tasks_count",
				width: 300,
				filter: true,
				cellRenderer: (params: any) => (
					<p className="truncate text-[14px] text-[#5B5967] font-[400]">
						{params.data?.NoTask}
					</p>
				),
			},
			{
				headerName: "No Of Projects",
				field: "members",
				width: 300,
				filter: true,
				cellRenderer: (params: any) => (
					<p className="truncate text-[14px] text-[#5B5967] font-[400]">
						{params.data?.Nop}
					</p>
				),
			},
		],
		[],
	);

	const state = [
		{
			label: "Total Tasks",
			count: 30,
			bgColor: "#EFF9FF",
			textColor: "#2D2C37",
		},
		{
			label: "Overdue Tasks",
			count: 0,
			bgColor: "#FFEAEA",
			textColor: "#A72C2C",
		},
		{
			label: "Completed Tasks",
			count: 8,
			bgColor: "#EEFDF1",
			textColor: "#0CA866",
		},
	];

	const listData = [
		{ label: "Filter By Projects", type: "text", key: "" },
		// {label: 'Last Name', type: 'text', key: 'last_name'},
		// {label: 'Email ID', type: 'email', key: 'email', disabled: true},
		// {label: 'Phone', type: 'text', key: 'phone'},
		// {label: 'Designation', type: 'text', key: 'designation', disabled: false},
		// {label: 'Role', type: 'text', key: 'role', disabled: false, isDropdown: true},
		// {label: 'Department', type: 'text', key: 'department_id', disabled: false, isDropdown: true},
		// {label: 'Branch', type: 'text', key: 'branch_id', disabled: false, isDropdown: true}
	];

	const renderList = [
		{ key: "branch", name: "branch_id", value: "IT", label: "first" },
		{ key: "2nd", name: "branch_name", value: "commerce", Label: "second" },
	];

	return (
		<section className="w-full h-full">
			<CommonHeader TableName="Overview" />

			<div className="my-2">
				<ProjectChampionCard />
			</div>

			<div className="flex flex-col sm:flex-row sm:items-center items-center justify-between gap-3 mb-3">
				{state.map((stat, index) => (
					<div
						key={index}
						className="flex-1 min-w-[150px] h-[80px] items-center text-center p-2 flex justify-start gap-4 rounded-lg border-gray-200 border  bg-[#FFFFFF]"
					>
						<span
							className={`bg-[${
								stat.count > 0 ? stat.bgColor : "#F0F1F2"
							}] h-[56px] w-[55px] flex flex-col justify-center items-center rounded-md p-5 font-bold text-[${
								stat.count > 0 ? stat.textColor : "#2D2C37"
							}]`}
						>
							{stat.count}
						</span>
						<span className="text-[#5B5967] font-normal text-[16px] leading-[100%] tracking-[0] font-inter">
							{stat.label}
						</span>
					</div>
				))}
			</div>

			<section className="w-full rounded-lg grid grid-cols-1 max-md:grid-rows-2 md:grid-cols-2 items-center justify-center place-items-center gap-3 transition-all ease-out duration-150">
				{/* <TaskStatus isTableOpen={isTableOpen}/> */}
				<div className="w-full h-full">
					<ProjectBarChart />
				</div>

				<div className="w-full h-full">
					<TaskStatusCard isTableOpen={isTableOpen} sendfromProject={true} />
				</div>
			</section>

			<section className="w-full my-2 rounded-lg grid grid-cols-1 max-md:grid-rows-2 md:grid-cols">
				<h3 className="font-[16px]  mt-3 mb-3">
          Top 5 Members with highest number of Projects and Tasks
				</h3>

				<AGComponent
					tableData={dummyData}
					columnDefsMemo={columnDefsMemo}
					onRowClicked={() => {}}
					tableType="TaskTable"
					TableHeight="300px"
				/>
			</section>
		</section>
	);
};

export default DisplayProjectsDahboard;

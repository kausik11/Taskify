import { useState } from "react";
import TrendSelector from "@/components/common/TrendSelector";
// import filterIcon from "@/assets/icons/filter-icon.svg";
import { Archive } from "lucide-react";
import { Copy } from "lucide-react";
import { Trash2 } from "lucide-react";
import TaskStatusCard from "@/components/dashboard/TaskStatusCard";
import ProjectBarChart from "../ProjectBarChart";
import AGComponent from "@/components/AGComponent";
import { ProjectTableData } from "../../../data/common";
import { AllProjectTableData } from "../../../data/common";
import { useMemo } from "react";
import { Avatar, AvatarImage } from "../../ui/avatar";

import { Button } from "react-day-picker";
import CombinedDropDown from "../../dashboard/CombinedDropDown";
import { Controller } from "react-hook-form";
import { Label } from "recharts";
import { ListFilter } from "lucide-react";
import CombinedUserAvtar from "@/components/dashboard/CombinedUserAvtar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import FilterComponent from "@/components/common/FilterComponent";
import CommonHeader from "@/components/common/CommonHeader";

const AllProjDashboard = () => {
	const [isTableOpen, setTableOpen] = useState(false);
	const [trendsGraph, setTrendsGraph] = useState<string>("This Week");

	const [currentPage, setCurrentPage] = useState(1);
	const recordsPerPage = 4;
	//state for the sort button
	const [projectName, setProjectName] = useState<string | null>(null);
	const [isProjectOpen, setIsProjectOpen] = useState(false);

	const [selectedTask, setSelectedTask] = useState("Active");
	// const [viewType, setViewType] = useState<string>("list");
	const [status, setStatus] = useState<string>("");
	const [task, setTask] = useState<string[]>([]);
	const [audit, setAudit] = useState<string>("");
	const [assignedTo, setAssignedTo] = useState<any[]>([]);
	const [assignee, setAssignee] = useState<any[]>([]);
	const [priority, setPriority] = useState<string>("");
	const [tags, setTags] = useState<string[]>([]);
	const [branch, setBranch] = useState<{ branch_name: string } | null>(null);
	const [department, setDepartment] = useState<{
    department_name: string;
  } | null>(null);
	const [fromDate, setFromDate] = useState<Date | null>(null);
	const [toDate, setToDate] = useState<Date | null>(null);
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [selected, setSelected] = useState<any[]>([]);
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [modalOpen, setModalOpen] = useState<boolean>(false);
	const [mutation, setMutation] = useState<boolean>(false);
	const [loading, setLoading] = useState<boolean>(false);

	const dummyData = ProjectTableData;
	const dummyDataAll = AllProjectTableData;
	const FinalData = Array.isArray(dummyData) ? dummyData : [];

  type priorityItem = {
    color: string;
    label: string;
    value: number;
  };

  //Fetch api
  const columnDefsMemo = useMemo(
  	() => [
  		{
  			headerName: "Member Name",
  			field: "project_name",
  			width: 200,
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
  			width: 100,
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
  			width: 100,
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

  const AllProjectcolumnDefsMemo = useMemo(
  	() => [
  		{
  			headerName: "Project Name",
  			field: "projectname",
  			width: 300,
  			filter: true,
  			cellRenderer: (params: any) => (
  				<p className="truncate text-[14px] text-[#5B5967] font-[400]">
  					{params.data?.projectname}
  				</p>
  			),
  		},
  		{
  			headerName: "No. of task",
  			field: "NoTask",
  			width: 300,
  			filter: true,
  			cellRenderer: (params: any) => (
  				<p className="truncate text-[14px] text-[#5B5967] font-[400]">
  					{params.data?.NoTask}
  				</p>
  			),
  		},
  		{
  			headerName: "External Dependency",
  			field: "project_name",
  			width: 400,
  			filter: true,
  			cellRenderer: (params: any) => (
  				<p className="truncate text-[14px] text-[#5B5967] font-[400] flex justify-start items-center gap-2">
  					{/* {params.data?.img.map((ele:string)=>(
            <p className="truncate text-[14px] text-[#5B5967] font-[400] flex justify-start items-center gap-2">
            <Avatar className="w-[24px] h-[24px]">
              <AvatarImage src={ele} />
            </Avatar>
            {params.data?.fullName}
          </p>
           ))} */}
  					<p className="truncate text-[14px] text-[#5B5967] text-center font-[400]flex justify-start items-center gap-2">
  						<CombinedUserAvtar imageData={params.data?.img} />
  					</p>
  				</p>
  			),
  		},
  	],
  	[],
  );

  const state = [
  	{
  		label: "Total Projects",
  		count: 30,
  		bgColor: "#EFF9FF",
  		textColor: "#2D2C37",
  	},
  	{
  		label: "Overdue Projects",
  		count: 0,
  		bgColor: "#FFEAEA",
  		textColor: "#A72C2C",
  	},
  	{
  		label: "Completed Projects",
  		count: 8,
  		bgColor: "#EEFDF1",
  		textColor: "#0CA866",
  	},
  ];

  const listData = [{ label: "Filter By Projects", type: "text", key: "" }];

  const renderList = [
  	{ key: "branch", name: "branch_id", value: "IT", label: "first" },
  	{ key: "2nd", name: "branch_name", value: "commerce", Label: "second" },
  ];

  const [priorityWise, setpriorityWise] = useState<priorityItem[]>([
  	{ color: "bg-[#ACABB2]", label: "Low Priority wise", value: 1 },
  	{ color: "bg-[#D8940E]", label: "Medium Priority wise", value: 2 },
  	{ color: "bg-[#D72727]", label: "High Priority wise", value: 4 },
  ]);

  const FilterPart: JSX.Element = (
  	<FilterComponent
  		selectedTask={selectedTask}
  		status={status}
  		setStatus={setStatus}
  		task={task}
  		setTask={setTask}
  		audit={audit}
  		setAudit={setAudit}
  		assignedTo={assignedTo}
  		setAssignedTo={setAssignedTo}
  		assignee={assignee}
  		setAssignee={setAssignee}
  		priority={priority}
  		setPriority={setPriority}
  		tags={tags}
  		setTags={setTags}
  		branch={branch}
  		setBranch={setBranch}
  		dept={department}
  		setDept={setDepartment}
  		fromDate={fromDate}
  		setFromDate={setFromDate}
  		toDate={toDate}
  		setToDate={setToDate}
  		teamMember={[]}
  		setTeamMember={() => {}}
  		scoreTab={""}
  		setScoreTab={() => {}}
  		scoreInterval={""}
  		setScoreInterval={() => {}}
  		FilterName={"Tasks"}
  		excludeCompleted={false}
  		setExcludeCompleted={() => {}}
  		includeAllWork={false}
  		setIncludeAllWork={() => {}}
  		// TableAPI={{ doctype: "CG Task Instance", mutate }}
  		TableAPI={{ doctype: "CG Task Instance" }}
  	/>
  );

  return (
  	<section className="space-y-4 h-full mt-[10px] w-full">
  		<div className=" flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
  			{/* <div className="flex flex-col sm:flex-row sm:items-center justify-left gap-3 mb-3">
          <h1 className="text-[14px] font-[600]">All Projects Overview</h1>
          <TrendSelector
            value={trendsGraph}
            onChange={setTrendsGraph}
            pageName=""
          />
        </div> */}

  			{/* <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger>
              <button
              className="bg-white border border-[#ACABB2] h-[36px] w-[36px] rounded-[8px] p-[7px] flex items-center justify-center"
              onClick={() => setIsProjectOpen(!isProjectOpen)}
            >
              <ListFilter className="w-[18px] h-[18px]" />
            </button>
              </SheetTrigger>
              <SheetContent>
               <FilterComponent
               selectedTask={selectedTask}
               status={status}
               setStatus={setStatus}
               task={task}
               setTask={setTask}
               audit={audit}
               setAudit={setAudit}
               assignedTo={assignedTo}
               setAssignedTo={setAssignedTo}
               assignee={assignee}
               setAssignee={setAssignee}
               priority={priority}
               setPriority={setPriority}
               tags={tags}
               setTags={setTags}
               branch={branch}
               setBranch={setBranch}
               dept={department}
               setDept={setDepartment}
               fromDate={fromDate}
               setFromDate={setFromDate}
               toDate={toDate}
               setToDate={setToDate}
               teamMember={[]}
               setTeamMember={() => {}}
               scoreTab={""}
               setScoreTab={() => {}}
               scoreInterval={""}
               setScoreInterval={() => {}}
               FilterName={"Tasks"}
               excludeCompleted={false}
               setExcludeCompleted={() => {}}
               includeAllWork={false}
               setIncludeAllWork={() => {}}
               TableAPI={{ doctype: "CG Task Instance" }}
               />
              </SheetContent>
            </Sheet>
          </div>
        </div> */}
  			<CommonHeader
  				TableName="All Projects Overview"
  				setTableOpen={setTableOpen}
  				isTableOpen={isTableOpen}
  				FilterPart={FilterPart}
  				setSelectedTask={setSelectedTask}
  				selectedTask={selectedTask}
  				// setViewType={setViewType}
  				// viewType={viewType}
  				setIsOpen={setIsOpen}
  				modalOpen={modalOpen}
  				setModalOpen={setModalOpen}
  				onBranchAdded={() => {}}
  				selectedBranch={null}
  				isSheetOpen={false}
  				setIsSheetOpen={() => {}}
  				selected={selected}
  				setSelected={setSelected}
  			/>
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
  				<TaskStatusCard
  					isTableOpen={isTableOpen}
  					sendfromProject={true}
  					title={"All Project Status"}
  					allproject="true"
  				/>
  			</div>
  		</section>

  		<section className="w-full my-2 rounded-lg grid grid-cols-2 max-md:grid-rows-2 md:grid-cols gap-2">
  			<div className="border-[1px] border-gray-300 rounded-2xl">
  				<h3 className="font-[16px] mt-3 m-3">
            Members with highest number of Projects and Tasks
  				</h3>

  				<AGComponent
  					tableData={dummyData}
  					columnDefsMemo={columnDefsMemo}
  					onRowClicked={() => {}}
  					tableType="TaskTable"
  					TableHeight="300px"
  				/>
  			</div>
  			<div>
  				<TaskStatusCard
  					isTableOpen={isTableOpen}
  					sendfromProject={true}
  					title={"Overdue Tasks-Priority wise"}
  					allproject="true"
  					priorityWise={priorityWise}
  				/>
  			</div>
  		</section>
  		<section></section>
  		<h3 className="font-[16px] mt-3 m-3">
        Project running overdue due to external dependency
  		</h3>

  		<AGComponent
  			tableData={dummyDataAll}
  			columnDefsMemo={AllProjectcolumnDefsMemo}
  			onRowClicked={() => {}}
  			tableType="TaskTable"
  			TableHeight="300px"
  		/>
  	</section>
  );
};

export default AllProjDashboard;

import AGComponent from "@/components/AGComponent";
import { useUserDetailsByEmails } from "@/components/common/CommonFunction";
import TaskTable from "@/components/dashboard/TaskTable";
import UserAssignees from "@/components/dashboard/UserAssignees";
import { StatusStyles } from "@/data/common";
import { Check, Clock } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import CommonHeader from "@/components/common/CommonHeader";
import { FaClock } from "react-icons/fa"; // FontAwesome clock
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import CombinedUserAvtar from "@/components/dashboard/CombinedUserAvtar";
import FilterComponent from "@/components/common/FilterComponent";
import { Navigate, useNavigate } from "react-router-dom";
import StatusBadge from "../StatusBadge";

export const rowData = [
	{
		name: "TASK-001",
		task_name: "Design Landing Page",
		status: "Upcoming",
		start_date: "2025-02-01",
		due_date: "2025-04-20",
		No_of_task: { Goals: 5, Tasks: 20 },
		Mis_score: 20,
		projectchampion: "https://github.com/shadcn.png",
		collaborators: [
			"https://github.com/shadcn.png",
			"https://github.com/shadcn.png",
		],
		assignee: "alex@example.com",
		is_completed: 0,
	},
	{
		name: "TASK-002",
		task_name: "Fix Login Bug",
		status: "Completed",
		due_date: "2025-04-10",
		start_date: "2025-02-01",
		No_of_task: { Goals: 5, Tasks: 20 },
		Mis_score: 20,
		projectchampion: "https://github.com/shadcn.png",
		collaborators: [
			"https://github.com/shadcn.png",
			"https://github.com/shadcn.png",
		],
		assignee: "",
		is_completed: 1,
	},
	{
		name: "TASK-003",
		task_name: "Prepare Report",
		status: "Due Today",
		due_date: "2025-04-14",
		start_date: "2025-02-01",
		No_of_task: { Goals: 5, Tasks: 20 },
		Mis_score: 20,
		projectchampion: "https://github.com/shadcn.png",
		collaborators: [
			"https://github.com/shadcn.png",
			"https://github.com/shadcn.png",
		],
		assignee: "maria@example.com",
		is_completed: 0,
	},
];

const AllProjectList = () => {
	const [isTableOpen, setTableOpen] = useState(false);
	const [selectedTask, setSelectedTask] = useState("Active");
	const [viewType, setViewType] = useState<string>("list");
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
	const [currentPage, setCurrentPage] = useState<number>(1);
	const [selected, setSelected] = useState<any[]>([]);
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [modalOpen, setModalOpen] = useState<boolean>(false);
	const [mutation, setMutation] = useState<boolean>(false);
	const [loading, setLoading] = useState<boolean>(false);
	const navigate = useNavigate();

	const OverdueBadge = () => {
		return (
			<div className="flex items-center gap-1 bg-red-50 text-red-600 text-xs font-medium px-2 py-1 rounded-full w-fit">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="currentColor"
					viewBox="0 0 24 24"
					className="w-4 h-4 text-red-600"
				>
					<path
						d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm1 10H7a5 5 0 0 1 5-5Z"
						fill="currentColor"
					/>
				</svg>
        Overdue
			</div>
		);
	};

	// === Column Definitions ===
	const columns = useMemo(
		() => [
			{
				headerComponentFramework: () => (
					<input
						type="checkbox"
						onClick={(e) => e.stopPropagation()}
						style={{ cursor: "pointer" }}
					/>
				),
				field: "",
				width: 50,
				filter: false,
				suppressMenu: true,
				cellStyle: { padding: "0px" }, // 👈 remove space inside the checkbox cell
				cellRenderer: (params: any) => (
					<input
						type="checkbox"
						// checked={selected.some((task) => task.name === params.data?.name)}
						onClick={(e) => e.stopPropagation()}
						onChange={() => {
							if (params.data?.is_completed === 1) {
								toast.warning(
									"This task is already completed. You cannot delete it.",
								);
								return;
							}
							//   if (params.data?.assigned_to == currentUser) {
							//     toast.warning("You are not authorized to delete this task.");
							//     return;
							//   }
						}}
						style={{ cursor: "pointer" }}
					/>
				),
			},
			{
				headerName: "ID",
				field: "id",
				width: selectedTask === "myTask" ? 140 : 120,
				filter: true,
				hide: true,
				cellRenderer: (params: any) => (
					<p className="truncate text-[14px] text-[#5B5967] font-[400] text-center">
            #{params.data?.name}
					</p>
				),
			},
			{
				headerName: "Project Name",
				field: "task_name",
				flex: 1,
				minWidth: 100,
				filter: true,
				cellRenderer: (params: any) => (
					<p className="truncate text-[14px] text-[#5B5967] font-[400] text-left">
						{params.data?.task_name}
					</p>
				),
			},
			{
				headerName: "Status",
				field: "status",
				width: 100,
				filter: true,
				cellRenderer: (params: any) => {
					const statusStyle =
            StatusStyles[params.data?.status as keyof typeof StatusStyles] ||
            "";
					return (
						<div
							className={`text-[12px] font-[400] rounded-[20px] mt-2 mb-2 text-center flex items-center justify-center ${statusStyle}`}
							style={{ height: "calc(100% - 15px)", lineHeight: "1" }}
						>
							{/* <div className="flex items-center gap-1 bg-red-50 text-red-600 text-xs font-medium px-1 py-1 rounded-full w-fit">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  className="w-6 h-6 text-red-600"
                >
                  <path
                    d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm1 10H7a5 5 0 0 1 5-5Z"
                    fill="currentColor"
                  />
                </svg>
                Overdue
              </div> */}
							<StatusBadge status="Due Today" />
						</div>
					);
				},
			},
			{
				headerName: "Start Date",
				field: "start_date",
				width: selectedTask === "myTask" ? 150 : 120,
				filter: true,
				cellRenderer: (params: any) => (
					<p className="truncate text-[14px] text-[#5B5967] text-center font-[400]">
						{new Date(params.data?.start_date).toDateString()}
					</p>
				),
			},
			{
				headerName: "Due Date",
				field: "due_date",
				width: selectedTask === "myTask" ? 150 : 120,
				filter: true,
				cellRenderer: (params: any) => {
					const due = new Date(params.data?.due_date);
					const formattedDate = due.toLocaleDateString("en-US", {
						day: "2-digit",
						month: "short",
					});
					const formattedTime = due.toLocaleTimeString("en-US", {
						hour: "2-digit",
						minute: "2-digit",
						hour12: true,
					});

					return (
						<div>
							<p className="truncate text-[14px] text-[#5B5967] text-center font-[400]">
								{formattedDate} {formattedTime}
							</p>
							<p className="truncate text-[14px] text-[#5B5967]"></p>
						</div>
					);
				},
			},
			{
				headerName: "No. of tasks",
				field: "No_of_task",
				width: selectedTask === "myTask" ? 150 : 120,
				filter: true,
				cellRenderer: (params: any) => {
					return (
						<p className="truncate text-[14px] text-[#5B5967] text-center font-[400]">
							{`Goals:${params.value.Goals} , Tasks:${params.value.Tasks}`}
						</p>
					);
				},
			},
			{
				headerName: "MIS Score",
				field: "Mis_score",
				width: selectedTask === "myTask" ? 100 : 70,
				filter: true,
				cellRenderer: (params: any) => {
					return (
						<p className="truncate text-[14px] text-[#5B5967] text-center font-[400]">
							{params.value}
						</p>
					);
				},
			},

			{
				headerName: "Project Champion",
				field: "projectchampion",
				width: selectedTask === "myTask" ? 120 : 100,
				// filter: true,
				cellRenderer: (params: any) => {
					return (
						<p className="truncate text-[14px] text-[#5B5967] text-center font-[400]">
							<Avatar className="w-[24px] h-[24px]">
								<AvatarImage src={`${params.value}`} />
							</Avatar>
						</p>
					);
				},
			},
			{
				headerName: "Collaborators",
				field: "collaborators",
				width: selectedTask === "myTask" ? 120 : 100,
				// filter: true,
				cellRenderer: (params: any) => {
					return (
						<p className="truncate text-[14px] text-[#5B5967] text-center font-[400]">
							<CombinedUserAvtar imageData={params.value} />
						</p>
					);
				},
			},
		],
		[],
	);

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

	function handleRowClick(data: any): void {
		//setbtnclicked(0);
		// Navigate(`/projects/${data.id}`);
		navigate("/selectedprojectsDashoard");
	}

	return (
		<section className="space-y-4 h-full mt-[10px] w-full">
			<CommonHeader
				TableName="All Projects"
				setTableOpen={setTableOpen}
				isTableOpen={isTableOpen}
				FilterPart={FilterPart}
				setSelectedTask={setSelectedTask}
				selectedTask={selectedTask}
				setViewType={setViewType}
				viewType={viewType}
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
			<div className="p-[10px] bg-white rounded-[15px] w-full">
				<AGComponent
					tableData={rowData || []}
					columnDefsMemo={columns}
					onRowClicked={handleRowClick}
					tableType="TaskTable"
					TableHeight="500px"
				/>
			</div>
		</section>
	);
};

export default AllProjectList;

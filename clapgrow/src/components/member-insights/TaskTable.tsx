import AGComponent from "../AGComponent";
import Pagination from "../common/Pagination";
import { useState } from "react";
import { ColDef } from "ag-grid-community";
import { PRIORITY_DATA, StatusStyles } from "@/data/common";
import UserAssignees from "../dashboard/UserAssignees";
import { useUserDetailsByEmails } from "../common/CommonFunction";

interface Task {
  task_name: string;
  status: string;
  assignee: string;
  due_date: string;
  priority: string;
}

interface TaskTableProps {
  tasks: Task[];
  isLoading: boolean;
  error?: Error; // Use the Frappe-specific error type
}
export default function TaskTable({ tasks }: TaskTableProps) {
	const [currentPage, setCurrentPage] = useState<number>(1);
	const recordsPerPage = 10;

	const columns: ColDef[] = [
		{
			headerName: "Task Name",
			field: "task_name",
			cellStyle: { fontSize: "14px", color: "#5B5967", fontWeight: 400 },
		},
		{
			headerName: "Status",
			field: "status",
			width: 150,
			filter: true,
			cellRenderer: (params: any) => {
				const statusStyle =
          StatusStyles[params.data?.status as keyof typeof StatusStyles] || "";
				return (
					<div
						className={`text-[12px] font-[400] rounded-[20px] mt-2 mb-2 text-center flex items-center justify-center ${statusStyle}`}
						style={{ height: "calc(100% - 15px)", lineHeight: "1" }}
					>
						{params.data?.status}
					</div>
				);
			},
		},
		{
			headerName: "Assignee",
			field: "assignee",
			width: 180,
			filter: true,
			cellRenderer: (params: any) => {
				const { data: usersData } = useUserDetailsByEmails(
					params.data.assignee,
				);
				return !params.data.assignee ? (
					<div className="text-center text-[#5B5967] mt-2">No Assignee</div>
				) : (
					<div className="flex justify-left gap-2 ">
						<UserAssignees users={usersData || []} className="" />
						<span className="text-[14px] text-[#5B5967] font-[400]">
							{params.data.assigneeFullName || "N/A"}
						</span>
					</div>
				);
			},
		},

		{
			headerName: "Due Date",
			field: "due_date",
			cellRenderer: (params: any) => (
				<p className="text-[14px] text-[#5B5967] font-[400]">
					{new Date(params.value).toLocaleDateString()}
				</p>
			),
		},
		{
			headerName: "Priority",
			field: "priority",
			width: 100,
			filter: true,
			cellRenderer: (params: any) => {
				const priority = PRIORITY_DATA.find(
					(p) => p.name === params.data?.priority,
				);
				return priority ? (
					<img
						src={priority.image}
						alt={priority.name}
						className="mt-4 mx-auto"
					/>
				) : null;
			},
		},
	];

	return (
		<section className="space-y-4 h-[calc(100vh-120px)] mt-[12px] w-full">
			<div className="bg-white rounded-[15px] w-full">
				<AGComponent
					tableData={tasks}
					columnDefsMemo={columns}
					onRowClicked={() => {}}
					tableType={null}
					TableHeight="450px"
				/>
				<Pagination
					setCurrentPage={setCurrentPage}
					totalRecords={tasks.length || 0}
					recordsPerPage={recordsPerPage}
					currentPage={currentPage}
				/>
			</div>
		</section>
	);
}

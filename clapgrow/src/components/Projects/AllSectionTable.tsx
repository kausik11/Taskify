import { Dispatch, SetStateAction, useMemo, useState } from "react";
import AGComponent from "../AGComponent";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { toast } from "sonner";
import { PRIORITY_DATA, StatusStyles } from "@/data/common";
import { useUserDetailsByEmails } from "../common/CommonFunction";
import UserAssignees from "../dashboard/UserAssignees";
import { PencilLine } from "lucide-react";
import { Copy } from "lucide-react";
import { Trash2 } from "lucide-react";
import { FilePreviewDialog } from "../layout/AlertBanner/CommonDesign";
import StatusBadge from "./StatusBadge";
import CircularProgress from "./CircularProgress";

interface ProjectTask {
  ID: string;
  task_name: string;
  status: "Upcoming" | "Completed" | "Overdue" | "Due Today";
  priority: "Critical" | "Medium" | "Low";
  due_date: string; // ISO or formatted string
  assigned_to: string; // initials or avatar URL
  attachments: {
    file_name: string;
    file_url: string;
  };
  progress: number; // percent
  setSelectedTask?: Dispatch<SetStateAction<string>>;
  selectedTask?: string;
}

const mockTasks: ProjectTask[] = [
	{
		ID: "1",
		task_name: "Veedol ERP Integration",
		status: "Upcoming",
		priority: "Critical",
		due_date: "2024-03-25T12:00:00",
		assigned_to: "kausik.saha@clapgrow.com",
		attachments: {
			file_name: "File1.png",
			file_url:
        "https://images.pexels.com/photos/736230/pexels-photo-736230.jpeg?cs=srgb&dl=pexels-jonaskakaroto-736230.jpg&fm=jpg",
		},
		progress: 42,
	},
	{
		ID: "2",
		task_name: "Integrate with Shopify",
		status: "Due Today",
		priority: "Critical",
		due_date: "2024-03-25T12:00:00",
		assigned_to: "kausik.saha@clapgrow.com",
		attachments: {
			file_name: "Company.png",
			file_url:
        "https://play-lh.googleusercontent.com/Gc3n9YjuXOf1vqOpE6Lti0KFrCHkBDAuFIIM1pd4DUyZzNngV3tk7iz4Q3HXWxOsRQ=w240-h480-rw",
		},
		progress: 80,
	},
];

const AllSectionTable = ({ setSelectedTask, selectedTask }) => {
	const [selected, setSelected] = useState<any[]>([]);
	const [open, setOpen] = useState(true);

	const handleFileRemove = (
		indexToRemove: any,
		fileType: "attach_file" | "submit_file",
	) => {
		// if (fileType === "attach_file") {
		//   return (prevFiles) =>
		//     prevFiles.filter((_, index) => index !== indexToRemove);
		// } else if (fileType === "submit_file") {
		//   setExistingSubmitFiles((prevFiles) =>
		//     prevFiles.filter((_, index) => index !== indexToRemove)
		//   );
		// }
	};

	const columns = useMemo(
		() => [
			{
				headerComponentFramework: () => (
					<input
						type="checkbox"
						onClick={(e) => e.stopPropagation()}
						onChange={() => setSelected([])}
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
						checked={selected.some((task) => task.name === params.data?.name)}
						onClick={(e) => e.stopPropagation()}
						onChange={() => {
							if (params.data?.is_completed === 1) {
								toast.warning(
									"This task is already completed. You cannot delete it.",
								);
								return;
							}

							const taskName = params.data?.name;
							setSelected((prev) =>
								prev.some((task) => task.name === taskName)
									? prev.filter((task) => task.name !== taskName)
									: [...prev, params.data],
							);
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
				headerName: "Task Name",
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
							{params.data?.status}
							{/* <StatusBadge status={params.data?.status}/> */}
						</div>
					);
				},
			},

			{
				headerName: "Due Date",
				field: "due_date",
				width: selectedTask === "myTask" ? 150 : 120,
				filter: true,
				cellRenderer: (params: any) => (
					<p className="truncate text-[14px] text-[#5B5967] text-center font-[400]">
						{new Date(params.data?.due_date).toDateString()}
					</p>
				),
			},
			{
				headerName: "Priority",
				field: "priority",
				width: selectedTask === "myTask" ? 100 : 90,
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

			{
				headerName: "Assigned To",
				field: "assigned_to",
				width: selectedTask === "myTask" ? 0 : 120,
				filter: true,
				hide: selectedTask === "myTask",
				cellRenderer: (params: any) => {
					const { data: usersData } = useUserDetailsByEmails(
						params.data.assigned_to,
					);
					return !params.data.assigned_to ? (
						<div className="text-center text-[#5B5967] mt-2">No Assignee</div>
					) : (
						<div className="flex justify-center mt-2 mx-auto">
							<UserAssignees users={usersData || []} className="" />
						</div>
					);
				},
			},
			{
				headerName: "Attachments",
				field: "attachments",
				flex: 1,
				minWidth: 100,
				filter: true,
				cellRenderer: (params: any) => {
					// <p className="truncate text-[14px] text-[#5B5967] font-[400] text-left">
					//   {params.data?.attachments}
					// </p>
					return (
						<div className="flex gap-1 items-center justify-center min-w-[200px] mr-2 mb-1">
							{/* <FilePreviewDialog key={0} file={params.data?.attachments} /> */}
							<p className="flex w-fit bg-gray-100 hover:bg-white rounded-md">
								{params.data?.attachments.file_name}
								<button
									onClick={() => handleFileRemove(0, "submit_file")}
									className="text-[#2D2C37] flex items-center mt-1 ml-1"
								>
									{<X className="text-[#2D2C37] w-[14px] h-[15px]" />}
								</button>
							</p>
						</div>
					);
				},
			},
			{
				headerName: "Mark Progress",
				field: "progress",
				cellRenderer: (params: any) => {
					const value = params.data?.progress;
					return <CircularProgress progress={value} />;
				},
				width: 120,
			},
		],
		[],
	);

	return (
		<div className="space-y-4 mt-4">
			<div className="border rounded-lg overflow-hidden bg-gray-50 hover:bg-gray-100">
				<div className="p-1 flex justify-betweenx items-center">
					<button
						className="w-full flex items-center justify-start p-4"
						onClick={() => setOpen(!open)}
					>
						<div className="flex items-center gap-2">
							{open ? (
								<ChevronDown className="h-5 w-5 text-gray-800" />
							) : (
								<ChevronUp className="h-5 w-5 text-gray-800" />
							)}
						</div>
						<span className="font-medium text-gray-900">Section 1</span>
					</button>

					<div className="flex items-center gap-2 p-4 text-[#2D2C37] w-[98px] h-[18px]">
						<PencilLine />
						<Copy />
						<Trash2 />
					</div>
				</div>
				<div className="px-5 pb-2">
					<p className="text-[#5B5967]">Description will come here...</p>
				</div>

				{open && (
					<AGComponent
						tableType="TaskTable"
						tableData={mockTasks || []}
						columnDefsMemo={columns}
						TableHeight="500px"
					/>
				)}
			</div>
		</div>
	);
};

export default AllSectionTable;

import { Archive, Copy, Trash2 } from "lucide-react";
import AddNotesSheet from "./AddNotesSheet";
import AGComponent from "../AGComponent";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { formatDate } from "date-fns";

interface NotesData {
  Notename: string;
  createBy: {
    name: string;
    initials: string;
    color: string;
  };
  createOn: string;
}

const notesData: NotesData[] = [
	{
		Notename: "Meeting Notes - Project Alpha",
		createBy: {
			name: "John Doe",
			initials: "JD",
			color: "#FF6347", // Tomato color
		},
		createOn: "2025-04-28T10:30:00",
	},
	{
		Notename: "Research Notes - React v18",
		createBy: {
			name: "Jane Smith",
			initials: "JS",
			color: "#4682B4", // SteelBlue color
		},
		createOn: "2025-04-27T15:45:00",
	},
	{
		Notename: "Client Feedback - Website Redesign",
		createBy: {
			name: "Alice Johnson",
			initials: "AJ",
			color: "#32CD32", // LimeGreen color
		},
		createOn: "2025-04-26T09:00:00",
	},
	{
		Notename: "Task Management Ideas",
		createBy: {
			name: "Bob Lee",
			initials: "BL",
			color: "#FFD700", // Gold color
		},
		createOn: "2025-04-25T14:10:00",
	},
	{
		Notename: "Sprint Retrospective Notes",
		createBy: {
			name: "Charlie Brown",
			initials: "CB",
			color: "#8A2BE2", // BlueViolet color
		},
		createOn: "2025-04-24T11:20:00",
	},
];

// const NotesDummyData :
const ProjectNotes = () => {
	const [selected, setSelected] = useState<any[]>([]);

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
				headerName: "Note name",
				field: "Notename",
				flex: 1,
				cellRenderer: (params: any) => (
					<span className="text-[14px] text-[#5B5967]">{params.value}</span>
				),
			},
			{
				headerName: "Create By",
				field: "createBy",
				flex: 1,
				cellRenderer: (params: any) => {
					const { name, initials, color } = params.value;
					return (
						<div className="flex items-center gap-2">
							<div
								className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-semibold text-white"
								style={{ backgroundColor: color }}
							>
								{initials}
							</div>
							<span className="text-[14px] text-[#5B5967]">{name}</span>
						</div>
					);
				},
			},
			{
				headerName: "Created On",
				field: "createOn",
				flex: 1,
				cellRenderer: (params: any) => {
					const dateString = params.value;
					const formatDate = (dateString: string) => {
						const date = new Date(dateString);

						// Get the day, month, and year
						const day = date.getDate();
						const month = date.toLocaleString("default", { month: "short" }); // "Apr"
						const year = date.getFullYear();

						// Format the date as "28, Apr, 2025"
						return `${day}, ${month}, ${year}`;
					};
					return (
						<span className="text-[14px] text-[#5B5967]">
							{formatDate(params.value)}
						</span>
					);
				},
			},
		],
		[],
	);

	return (
		<section className="w-full h-full">
			<div className=" flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
				<div className="flex flex-col sm:flex-row sm:items-center justify-left gap-3 mb-3">
					<h1 className="text-[14px] font-[600]">Notes</h1>
				</div>
				<div className="flex gap-2">
					<div className="flex items-center gap-5 max-md:justify-end">
						<AddNotesSheet />

						<button className="bg-white border border-[#ACABB2] h-[36px] w-[36] rounded-[8px] px-[10px] py-[7px]">
							<Copy className="w-[18px] h-[18px]" />
						</button>

						<button className="bg-white border border-[#ACABB2] h-[36px] w-[36] rounded-[8px] px-[10px] py-[7px]">
							<Trash2 className="w-[18px] h-[18px]" />
						</button>
					</div>
				</div>
			</div>
			<AGComponent
				tableType="TaskTable"
				tableData={notesData || []}
				columnDefsMemo={columns}
				TableHeight="500px"
			/>
		</section>
	);
};

export default ProjectNotes;

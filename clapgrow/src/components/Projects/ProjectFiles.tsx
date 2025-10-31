import React, { useMemo } from "react";
import AGComponent from "../AGComponent";
import { Copy, Trash2 } from "lucide-react";

interface FileData {
  fileName: string;
  fileSize: string;
  uploadedBy: {
    name: string;
    initials: string;
    color: string;
  };
  uploadedOn: string;
  taskName: string;
}

const fileData: FileData[] = [
	{
		fileName: "File_name.jpg",
		fileSize: "2.3mb",
		uploadedBy: { name: "Parul Khanna", initials: "PK", color: "#FFD700" },
		uploadedOn: "25 Mar 12:00 PM",
		taskName: "Task name will appear here",
	},
	{
		fileName: "File_name.pdf",
		fileSize: "2.3mb",
		uploadedBy: { name: "Yashraj Soni", initials: "YS", color: "#E57373" },
		uploadedOn: "27 Mar,2024",
		taskName: "Task name will appear here",
	},
	{
		fileName: "File_name.pdf",
		fileSize: "2.3mb",
		uploadedBy: { name: "Sonal Shah", initials: "SS", color: "#FFB6C1" },
		uploadedOn: "25 Mar 12:00 PM",
		taskName: "Task name will appear here",
	},
	{
		fileName: "File_name.pdf",
		fileSize: "2.3mb",
		uploadedBy: { name: "Mandeep Negi", initials: "MN", color: "#A3D8F4" },
		uploadedOn: "24 Mar,2024 12:00 PM",
		taskName: "Task name will appear here",
	},
];
const ProjectFiles = () => {
	const fileColumns = useMemo(
		() => [
			{
				headerName: "",
				checkboxSelection: true,
				width: 40,
			},
			{
				headerName: "File name",
				field: "fileName",
				flex: 1,
				cellRenderer: (params: any) => (
					<span className="text-[14px] text-[#5B5967]">{params.value}</span>
				),
			},
			{
				headerName: "File size",
				field: "fileSize",
				flex: 1,
				cellRenderer: (params: any) => (
					<span className="text-[14px] text-[#5B5967]">{params.value}</span>
				),
			},
			{
				headerName: "Uploaded By",
				field: "uploadedBy",
				flex: 1.5,
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
				headerName: "Uploaded On",
				field: "uploadedOn",
				flex: 1,
				cellRenderer: (params: any) => (
					<span className="text-[14px] text-[#5B5967]">{params.value}</span>
				),
			},
			{
				headerName: "Task name",
				field: "taskName",
				flex: 2,
				cellRenderer: (params: any) => (
					<span className="text-[14px] text-[#5B5967]">{params.value}</span>
				),
			},
		],
		[],
	);

	return (
		<section className="w-full h-full">
			<div className=" flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
				<div className="flex flex-col sm:flex-row sm:items-center justify-left gap-3 mb-3">
					<h1 className="text-[14px] font-[600]">All Files</h1>
				</div>

				<div className="flex gap-2">
					<div className="flex items-center gap-2">
						<button className="bg-white border border-[#ACABB2] h-[36px] w-[36] rounded-[8px] px-[10px] py-[7px]">
							<Copy className="w-[18px] h-[18px]" />
						</button>

						<button className="bg-white border border-[#ACABB2] h-[36px] w-[36] rounded-[8px] px-[10px] py-[7px]">
							<Trash2 className="w-[18px] h-[18px]" />
						</button>
					</div>
				</div>
			</div>
			<div>
				<AGComponent
					tableType="TaskTable"
					tableData={fileData}
					columnDefsMemo={fileColumns}
					TableHeight="500px"
				/>
			</div>
		</section>
	);
};

export default ProjectFiles;

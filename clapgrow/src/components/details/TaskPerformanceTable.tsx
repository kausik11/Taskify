import Pagination from "../common/Pagination";
import AGComponent from "../AGComponent";
import { ColDef } from "ag-grid-community";
interface DepartmentDataCountsProps {
  department_data_counts: any[];
  totalRecords: number;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  recordsPerPage: number;
}

const DepartmentPerformanceTable: React.FC<DepartmentDataCountsProps> = ({
	department_data_counts,
	totalRecords,
	currentPage,
	setCurrentPage,
	recordsPerPage,
}) => {
	const getProgressColor = (completed: number, total: number) => {
		const percentage = (completed / total) * 100;
		if (percentage > 66) return "bg-green-500";
		if (percentage > 33) return "bg-yellow-500";
		return "bg-red-500";
	};
	const columns: ColDef[] = [
		{
			headerName: "Department",
			field: "name",
			cellStyle: { fontSize: "14px", color: "#5B5967", fontWeight: 400 },
		},
		{
			headerName: "Tasks",
			field: "tasks",
			cellRenderer: (params: any) => {
				const { completed_tasks, total_tasks } = params.value;
				const percentage = (completed_tasks / total_tasks) * 100;
				return (
					<div className="flex items-center justify-between space-x-2">
						<div className="w-32 bg-gray-200 rounded-full h-2.5">
							<div
								className={`h-2.5 rounded-full ${getProgressColor(
									completed_tasks,
									total_tasks,
								)}`}
								style={{ width: `${percentage}%` }}
							></div>
						</div>
						<span className="text-[14px] text-[#5B5967] font-[400]">
							{completed_tasks}/{total_tasks}
						</span>
					</div>
				);
			},
		},
		{
			headerName: "Performance",
			field: "performance",
			cellRenderer: (params: any) => (
				<div className="flex items-center justify-end gap-4">
					<p className="text-[14px] text-[#5B5967] font-[400]">
						{params.value}%
					</p>
				</div>
			),
		},
	];

	return (
		<div className="p-[10px] bg-white rounded-[15px] min-w-[65%] max-w-full mt-6 w-full">
			<div className="rounded-[15px] overflow-x-auto border-[1px] border-[#F0F1F2]">
				<AGComponent
					tableData={department_data_counts}
					columnDefsMemo={columns}
					setIsOpen={() => {}}
					onRowClicked={() => {}}
					tableType={null}
					TableHeight="220px"
				/>
			</div>
			<Pagination
				setCurrentPage={setCurrentPage}
				totalRecords={totalRecords || 0}
				recordsPerPage={recordsPerPage}
				currentPage={currentPage}
			/>
		</div>
	);
};

export default DepartmentPerformanceTable;

import { Column, SortConfig } from "./CommonTypes";

interface ColumnsProps<T> {
  columns: Column<T>[];
  sortConfig: SortConfig;
  roleBaseName: string;
  selectedTask: string;
}
export const TableColumns: React.FC<ColumnsProps<any>> = ({
	columns,
	roleBaseName,
	selectedTask,
}) => (
	<div
		className={`max-md:min-w-[1200px] md:w-full grid ${roleBaseName == "ROLE-Admin" || selectedTask == "myTask" ? "grid-cols-12" : "grid-cols-11"} w-full bg-[#F5F8FB] border-[1px] border-[#E6EBF7] px-[22px] py-[12px]`}
	>
		{columns.map((column) => (
			<p
				key={column.key as string}
				className={`text-[12px] flex items-center gap-2 text-[#2D2C37] font-[400] ${
					column.width
				} ${column.key === "task_name" || column.key === "id" ? "" : "justify-center"}`}
				onClick={() => column.key !== "select"}
			>
				{column.header}
				{column.icon && <img src={column.icon} />}
			</p>
		))}
	</div>
);

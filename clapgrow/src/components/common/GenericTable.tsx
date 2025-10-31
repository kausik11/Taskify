import upDownIcon from "@/assets/icons/upDownIcon.svg";
import { ChevronLeft, ChevronRight } from "lucide-react";
interface Column<T> {
  key: keyof T;
  header: string;
  width?: number;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  totalItems?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  showPage?: boolean;
  onRowClick?: (data: T) => void;
  totalColumns?: number;
}

const GenericTable = <T extends Record<string, any>>({
	data,
	columns,
	showPage = true,
	totalItems = 0,
	totalColumns = 7,
	currentPage = 1,
	onPageChange,
	onRowClick = () => ({}),
}: TableProps<T> & { onRowClick?: (data: T) => void }) => {
	const itemsPerPage = 20;
	const startItem = (currentPage - 1) * itemsPerPage + 1;
	const endItem = Math.min(
		currentPage * itemsPerPage,
		totalItems || data.length,
	);

	return (
		<div className={`bg-white w-full ${showPage ? "rounded-[15px]" : ""}`}>
			<div
				className={`overflow-x-auto border-[1px] border-[#F0F1F2] ${
					showPage ? "rounded-[15px]" : ""
				}`}
			>
				<div className="max-md:min-w-[1200px] md:w-full grid grid-cols-7 w-full bg-[#F5F8FB] border-b border-[#E6EBF7] px-[22px] py-[12px]">
					{columns.map((column, index) => (
						<p
							key={String(column.key)}
							className={`${
								column.width ? `col-span-${column.width}` : ""
							} text-[12px] flex items-center gap-x-2 text-[#2D2C37] font-[400]`}
						>
							{column.header}
							{index !== 0 && <img src={upDownIcon} alt="sort" />}
						</p>
					))}
				</div>

				{data.map((item, rowIndex) => (
					<div
						key={`row-${rowIndex}`}
						onClick={() => onRowClick?.(item)}
						className={`max-md:min-w-[1200px] md:w-full grid grid-cols-7 w-full bg-[#FFFFFF] cursor-pointer hover:bg-gray-50 ${
							rowIndex < data.length - 1 ? "border-b border-[#F0F1F2] " : ""
						}px-[22px] py-[12px]`}
					>
						{columns.map((column) => (
							<p
								key={`cell-${rowIndex}-${String(column.key)}`}
								className={`${
									column.width ? `col-span-${column.width}` : ""
								} text-[14px] my-auto text-[#5B5967] font-[400]`}
							>
								{item[column.key]}
							</p>
						))}
					</div>
				))}
			</div>

			{showPage && (
				<div className="flex items-center justify-between w-full px-4 text-[14px] text-zinc-600 mt-2">
					<p>{`${startItem}-${endItem} of ${totalItems || data.length}`}</p>
					<div className="flex items-center justify-center gap-6">
						<ChevronLeft
							width={20}
							height={20}
							className="text-muted-foreground cursor-not-allowed"
						/>
						<p className="bg-[#D4EFFF] py-1 px-3 rounded-lg">{currentPage}</p>
						<ChevronRight
							width={20}
							height={20}
							className="text-muted-foreground cursor-not-allowed"
						/>
					</div>
				</div>
			)}
		</div>
	);
};

export default GenericTable;

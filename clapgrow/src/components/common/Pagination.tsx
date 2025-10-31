import React from "react";
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
} from "lucide-react";

interface PaginationProps {
  setCurrentPage: (page: number) => void;
  totalRecords: number;
  recordsPerPage: number;
  currentPage: number;
}

const Pagination: React.FC<PaginationProps> = ({
	setCurrentPage,
	totalRecords,
	recordsPerPage,
	currentPage,
}) => {
	const totalPages =
    totalRecords > 0 ? Math.ceil(totalRecords / recordsPerPage) : 0;
	const maxVisiblePages = 4;

	const validCurrentPage =
    totalRecords > 0 ? Math.min(Math.max(1, currentPage), totalPages) : 1;

	const startPage =
    totalPages > 0
    	? Math.max(
    		1,
    		Math.min(
    			validCurrentPage - Math.floor(maxVisiblePages / 2),
    			totalPages - maxVisiblePages + 1,
    		),
    	)
    	: 1;
	const endPage =
    totalPages > 0 ? Math.min(totalPages, startPage + maxVisiblePages - 1) : 1;

	const pageNumbers: number[] = [];
	if (totalPages > 0) {
		for (let i = startPage; i <= endPage; i++) {
			pageNumbers.push(i);
		}
	}

	const handlePageChange = (page: number) => {
		if (page >= 1 && page <= totalPages) {
			setCurrentPage(page);
		}
	};

	// Generate the pagination range
	const getPaginationRange = () => {
		if (totalPages === 0) return [];
		const delta = 0; // number of pages around current page
		const range: (number | string)[] = [];
		const left = Math.max(2, validCurrentPage - delta);
		const right = Math.min(totalPages - 1, validCurrentPage + delta);
		range.push(1); // First page

		if (left > 2) {
			range.push("...");
		}

		for (let i = left; i <= right; i++) {
			range.push(i);
		}

		if (right < totalPages - 1) {
			range.push("...");
		}

		if (totalPages > 1) {
			range.push(totalPages); // Last page
		}

		return range;
	};

	const paginationRange = getPaginationRange();

	return (
		<div className="flex items-center justify-between w-full px-4 text-[14px] text-zinc-600 mt-2">
			<p>
				{totalRecords === 0
					? "0 - 0 of 0"
					: `${(validCurrentPage - 1) * recordsPerPage + 1} - ${Math.min(
						validCurrentPage * recordsPerPage,
						totalRecords,
					)} of ${totalRecords}`}
			</p>

			{/* Hide pagination controls if no records */}
			{totalRecords > 0 && (
				<div className="flex items-center gap-2">
					{/* First Button */}
					<button
						onClick={() => handlePageChange(1)}
						disabled={validCurrentPage === 1}
						className="p-2 border rounded disabled:opacity-50"
					>
						<ChevronsLeft size={18} />
					</button>

					{/* Prev Button */}
					<button
						onClick={() => handlePageChange(validCurrentPage - 1)}
						disabled={validCurrentPage === 1}
						className="p-2 border rounded disabled:opacity-50"
					>
						<ChevronLeft size={18} />
					</button>

					{/* Page Numbers */}
					{paginationRange.map((item, index) =>
						item === "..." ? (
							<span key={index} className="px-2 text-gray-400">
                ...
							</span>
						) : (
							<button
								key={index}
								onClick={() => handlePageChange(item as number)}
								className={`px-3 py-1 rounded ${
									validCurrentPage === item
										? "bg-[#3B82F6] text-white"
										: "hover:bg-gray-100"
								}`}
							>
								{item}
							</button>
						),
					)}

					{/* Next Button */}
					<button
						onClick={() => handlePageChange(validCurrentPage + 1)}
						disabled={validCurrentPage === totalPages}
						className="p-2 border rounded disabled:opacity-50"
					>
						<ChevronRight size={18} />
					</button>

					{/* Last Button */}
					<button
						onClick={() => handlePageChange(totalPages)}
						disabled={validCurrentPage === totalPages}
						className="p-2 border rounded disabled:opacity-50"
					>
						<ChevronsRight size={18} />
					</button>
				</div>
			)}
		</div>
	);
};

export default Pagination;

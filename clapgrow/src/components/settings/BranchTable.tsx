import React, { useContext, useEffect, useMemo, useState } from "react";
import { CGBranch } from "@/types/ClapgrowApp/CGBranch";
import Pagination from "../common/Pagination";
import {
	convertTo12HourFormat,
	showErrorToast,
} from "../common/CommonFunction";
import AGComponent from "../AGComponent";
import AddBranchSheet from "./AddBranchSheet";
import { Trash2 } from "lucide-react";
import { UserContext } from "@/utils/auth/UserProvider";
import { useFrappeDeleteDoc, useFrappeGetDocCount } from "frappe-react-sdk";
import { toast } from "sonner";

interface BranchTableProps {
  onBranchAdded: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  totalRecords: number;
  recordsPerPage: number;
  currentPage: number;
  branchData: CGBranch[] | undefined;
}
const BranchTable: React.FC<BranchTableProps> = ({
	setCurrentPage,
	totalRecords,
	recordsPerPage,
	currentPage,
	branchData,
	onBranchAdded,
}) => {
	const { roleBaseName } = useContext(UserContext);
	const { deleteDoc } = useFrappeDeleteDoc();
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [selectedBranch, setSelectedBranch] = useState<CGBranch | null>(null);
	const [branchToDelete, setBranchToDelete] = useState<string | null>(null);
	const safeBranchData = Array.isArray(branchData) ? branchData : [];

	// ;
	// Fetch user count for the branch being deleted
	const {
		data: userCount,
		isLoading: isCountLoading,
		error: countError,
	} = useFrappeGetDocCount(
		"CG User",
		branchToDelete ? [["branch_id", "=", branchToDelete]] : [],
		!!branchToDelete, // Only fetch when branchToDelete is set
	);

	// Handle delete confirmation when user count is fetched
	useEffect(() => {
		if (branchToDelete && !isCountLoading && userCount !== undefined) {
			if (userCount >= 0) {
				setBranchToDelete(null); // Reset after showing error
				handleDelete(branchToDelete);
			}
		}
		if (countError) {
			// ;
			showErrorToast(countError.message || "Error fetching user count");
			setBranchToDelete(null); // Reset on error
		}
	}, [
		branchToDelete,
		userCount,
		isCountLoading,
		countError,
		deleteDoc,
		onBranchAdded,
	]);

	// Working Hour for columns
	const transformedData = React.useMemo(() => {
		return safeBranchData.map((branch) => ({
			...branch,
			working_hours:
        branch.start_time && branch.end_time
        	? `${convertTo12HourFormat(
        		branch.start_time,
        	)} - ${convertTo12HourFormat(branch.end_time)} IST`
        	: "Time not available",
		}));
	}, [branchData]);

	// Delete API
	const handleDelete = (data: any) => {
		// 
		if (!branchData) return;
		deleteDoc("CG Branch", data)
			.then(() => {
				toast.success("Branch deleted successfully");
				onBranchAdded(true);
				setIsSheetOpen(false);
			})
			.catch((err: any) => {
				let serverMessage = "";
				try {
					if (err._server_messages) {
						const parsedMessages = JSON.parse(err._server_messages);
						serverMessage = parsedMessages[0] || "";
						// ;
					}
				} catch (e) {
					// console.error("Error parsing server messages:", e);
					serverMessage =
            err.message ||
            "An unexpected error occurred while deleting the branch.";
				}

				// Check for LinkExistsError
				if (
					err.exception === "frappe.exceptions.LinkExistsError" ||
          serverMessage.includes("is linked with")
				) {
					// ;
					const count = userCount || 0; // Use fetched user count or fallback to 0
					toast.error(
						`You cannot delete this branch, it has ${count} user${count > 1 ? "s" : ""} in it. Kindly delete users first.`,
					);
				} else {
					// Handle other errors
					showErrorToast(
						serverMessage ||
              err.message ||
              "An unexpected error occurred while deleting the branch.",
					);
				}
			});
	};

	// Fetch API
	const columnDefsMemo = useMemo(() => {
		const columns = [
			{
				headerName: "Branch name",
				field: "branch_name",
				width: 270,
				flex: 1,
				filter: true,
				cellRenderer: (params: any) => (
					<p
						className="truncate text-[14px] text-[#5B5967] font-[400]"
						onClick={(e) => {
							e.stopPropagation();
							handleRowClick(params.data);
						}}
					>
						{params.data?.branch_name}
					</p>
				),
			},
			{
				headerName: "Working Hours",
				field: "working_hours",
				width: 150,
				filter: true,
				cellRenderer: (params: any) => (
					<p
						className="truncate text-[14px] text-[#5B5967] font-[400]"
						onClick={(e) => {
							e.stopPropagation();
							handleRowClick(params.data);
						}}
					>
						{params.data?.working_hours}
					</p>
				),
			},
		];

		if (roleBaseName === "ROLE-Admin") {
			columns.push({
				headerName: "Action",
				field: "delete",
				maxWidth: 100,
				filter: false,
				cellRenderer: (params: any) => (
					<div className="flex justify-left items-left w-full h-full">
						<button
							onClick={(e) => {
								e.stopPropagation();
								// handleDelete(params.data?.name);
								setBranchToDelete(params.data?.name);
							}}
							className="flex justify-center items-center p-1 hover:bg-gray-100 rounded"
						>
							<Trash2 className="h-7 w-7 text-[#304156] rounded-full p-1" />
						</button>
					</div>
				),
			});
		}

		return columns;
	}, []);

	// Function to handle row click and open the AddBranchSheet
	const handleRowClick = (event: any) => {
		setSelectedBranch(event);
		setIsSheetOpen(true);
	};

	return (
		<div className="bg-white rounded-[15px] w-full">
			<AGComponent
				tableData={transformedData.length ? transformedData : []}
				columnDefsMemo={columnDefsMemo}
				onRowClicked={() => {}} // Use the function here
				tableType={"BranchSheet"}
				TableHeight="500px"
			/>
			<Pagination
				setCurrentPage={setCurrentPage}
				totalRecords={totalRecords || 0}
				recordsPerPage={recordsPerPage}
				currentPage={currentPage}
			/>
			{roleBaseName === "ROLE-Admin" && isSheetOpen && (
				<AddBranchSheet
					onBranchAdded={onBranchAdded}
					isSheetOpen={isSheetOpen}
					setIsSheetOpen={setIsSheetOpen}
					branchData={selectedBranch || undefined} // Pass object directly
				/>
			)}
		</div>
	);
};

export default BranchTable;

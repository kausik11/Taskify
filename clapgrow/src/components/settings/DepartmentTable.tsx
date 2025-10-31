import React, { useContext, useEffect, useMemo, useState } from "react";
import { CGDepartment } from "@/types/ClapgrowApp/CGDepartment";
import Pagination from "../common/Pagination";
import { showErrorToast } from "../common/CommonFunction";
import AGComponent from "../AGComponent";
import { useFrappeDeleteDoc, useFrappeGetDocCount } from "frappe-react-sdk";
import { UserContext } from "@/utils/auth/UserProvider";
import AddDepartmentSheet from "./AddDepartmentSheet";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface DepartmentTableProps {
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  totalRecords: number;
  recordsPerPage: number;
  currentPage: number;
  departmentData: CGDepartment[];
  onDepartmentAdded: React.Dispatch<React.SetStateAction<boolean>>;
}

const DepartmentTable: React.FC<DepartmentTableProps> = ({
	setCurrentPage,
	totalRecords,
	recordsPerPage,
	currentPage,
	departmentData,
	onDepartmentAdded,
}) => {
	const { roleBaseName } = useContext(UserContext);
	const { deleteDoc } = useFrappeDeleteDoc();
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [selectedDept, setSelectedDept] = useState<CGDepartment | null>(null);
	const [deptToDelete, setDeptToDelete] = useState<string | null>(null);
	const safeDepartmentData = Array.isArray(departmentData)
		? departmentData
		: [];

	// Fetch user count for the branch being deleted
	const {
		data: userCount,
		isLoading: isCountLoading,
		error: countError,
	} = useFrappeGetDocCount(
		"CG User",

		deptToDelete ? [["department_id", "=", deptToDelete]] : [],
		!!deptToDelete, // Only fetch when branchToDelete is set
	);

	// Handle delete confirmation when user count is fetched
	useEffect(() => {
		if (deptToDelete && !isCountLoading && userCount !== undefined) {
			if (userCount >= 0) {
				setDeptToDelete(null); // Reset after showing error
				handleDelete(deptToDelete);
			}
		}
		if (countError) {
			showErrorToast(countError.message || "Error fetching user count");
			setDeptToDelete(null); // Reset on error
		}
	}, [deptToDelete, isCountLoading, countError, deleteDoc, onDepartmentAdded]);

	const transformedData = React.useMemo(() => {
		return safeDepartmentData.map((dept) => ({
			...dept,
			working_hours: dept.department_name ? `` : "Time not available",
		}));
	}, [departmentData]);

	const columnDefsMemo = useMemo(() => {
		const columns = [
			{
				headerName: "Departments",
				field: "department_name",
				width: 270,
				filter: true,
				cellRenderer: (params: any) => (
					<p
						className="truncate text-[14px] text-[#5B5967] font-[400] cursor-pointer"
						onClick={(e) => {
							e.stopPropagation(); // Prevents accidental triggers
							handleRowClick(params.data);
						}}
					>
						{params.data?.department_name}
					</p>
				),
			},
		];
		if (roleBaseName === "ROLE-Admin") {
			columns.push({
				headerName: "Action",
				field: "delete",
				filter: false,
				maxWidth: 80,
				cellRenderer: (params: any) => {
					return (
						<div className="flex justify-center items-center w-full h-full">
							<button
								onClick={(e) => {
									// e.preventDefault();
									e.stopPropagation(); // Prevents row click from triggering
									// handleDelete(params.data?.name);
									setDeptToDelete(params.data?.name);
								}}
								className="flex justify-center items-center p-1 hover:bg-gray-100 rounded"
							>
								<Trash2 className="h-7 w-7 text-[#304156] rounded-full p-1" />
							</button>
						</div>
					);
				},
			});
		}

		return columns;
	}, [roleBaseName]);

	const handleDelete = (data: any) => {
		if (!departmentData) return;
		if (!data) {
			toast.error("Invalid department ID.");
			return;
		}
		deleteDoc("CG Department", data?.name || data)
			.then(() => {
				toast.success("Department deleted successfully");
				onDepartmentAdded(true);
			})
			.catch((err: any) => {
				// console.error("Delete error:", err);
				// showErrorToast(err._server_messages);
				let serverMessage = "";
				try {
					if (err._server_messages) {
						const parsedMessages = JSON.parse(err._server_messages);
						serverMessage = parsedMessages[0] || "";
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

	const handleRowClick = (event: CGDepartment) => {
		setSelectedDept(event);
		setIsSheetOpen(true);
	};

	return (
		<div className="bg-white rounded-[15px] w-full">
			<AGComponent
				tableData={transformedData.length ? transformedData : []}
				columnDefsMemo={columnDefsMemo}
				tableType={"DeptSheet"}
				TableHeight="500px"
				onRowClicked={() => {}}
			/>
			<Pagination
				setCurrentPage={setCurrentPage}
				totalRecords={totalRecords || 0}
				recordsPerPage={recordsPerPage}
				currentPage={currentPage}
			/>
			{roleBaseName === "ROLE-Admin" && isSheetOpen && (
				<AddDepartmentSheet
					onDepartmentAdded={onDepartmentAdded}
					isSheetOpen={isSheetOpen}
					setIsSheetOpen={setIsSheetOpen}
					deptData={selectedDept || undefined} // Pass object directly
				/>
			)}
		</div>
	);
};

export default DepartmentTable;

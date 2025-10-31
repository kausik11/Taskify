// import searchIcon from "@/assets/icons/search-icon.svg";
import AddDepartmentSheet from "./AddDepartmentSheet";
import DepartmentTable from "./DepartmentTable";
import { useContext, useEffect, useMemo, useState } from "react";
import { useFrappeDeleteDoc, useFrappeGetDocCount, useFrappeGetDocList } from "frappe-react-sdk";
import { CGDepartment } from "@/types/ClapgrowApp/CGDepartment";
import { UserContext } from "@/utils/auth/UserProvider";
import DoctypeList from "../common/DataGrid/DataGridWithMeta";
import { ColumnProps } from "../common/DataGrid/DataGridComponent";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Tooltip, TooltipProvider, TooltipTrigger,TooltipContent } from "../ui/tooltip";
import { Portal } from "@radix-ui/react-tooltip";
import { showErrorToast } from "../common/CommonFunction";
import EditDepartmentSheet from "./EditDepartmentSheet";


const DepartmentsComponent = () => {
	const { roleBaseName } = useContext(UserContext);
	const [currentPage, setCurrentPage] = useState<number>(1);
	const [isSheetOpen, setIsSheetOpen] = useState(false);
     const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
	 const [deptToDelete, setDeptToDelete] = useState<string | null>(null);
    //  console.log("deptToDelete", deptToDelete);
    const [selectedDept, setSelectedDept] = useState<CGDepartment | null>(null);
    const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const { deleteDoc } = useFrappeDeleteDoc();
	const recordsPerPage = 20;

	let filters: any[] = [];
	const { userDetails, companyDetails } = useContext(UserContext);

	const companyId = useMemo(() => {
		return companyDetails && companyDetails.length > 0
			? companyDetails[0].name
			: null;
	}, [companyDetails]);
	const { data: totalRecords } = useFrappeGetDocCount("CG Department", [
		["company_id", "=", companyId],
	]);
	const { data: departmentData, mutate,error } = useFrappeGetDocList<CGDepartment>(
		"CG Department",
		{
			fields: ["name", "department_name", "creation"],
			filters: [
				...filters, // ✅ Spread existing filters if `filters` is an array
				...(userDetails?.[0]?.company_id
					? [["company_id", "=", companyId]]
					: []), // ✅ Conditionally add company_id filter
			],
			limit: recordsPerPage,
			limit_start: (currentPage - 1) * recordsPerPage,
		},
		{ deps: [currentPage, filters] },
	);

	// Fetch user count for the department being deleted
    const {
        data: userCount,
        isLoading: isCountLoading,
        error: countError,
    } = useFrappeGetDocCount(
        "CG User",
        deptToDelete ? [["department_id", "=", deptToDelete]] : [],
        !!deptToDelete,
    );
	// Handle delete confirmation when user count is fetched
    useEffect(() => {
        console.log("deptToDelete and usercount", deptToDelete, userCount);
        if (deptToDelete && !isCountLoading) {
            
            if (userCount === undefined) {
                toast.error("Unable to fetch user count for the department. Please try again.");
                setDeptToDelete(null);
                setIsDeleting(false);
                return;
            }
            if (userCount > 0) {
                toast.error(
                    `You cannot delete this department, it has ${userCount} user${userCount > 1 ? "s" : ""} in it. Kindly delete users first.`,
                );
                setDeptToDelete(null);
            } else {
                 deleteDoc("CG Department", deptToDelete)
                                    .then(() => {
                                        toast.success("Branch deleted successfully");
                                        mutate();
                                    })
                                    .catch((err: any) => {
                                        let serverMessage = "";
                                        try {
                                            if (err._server_messages) {
                                                const parsedMessages = JSON.stringify(err._server_messages);
                                                serverMessage = parsedMessages[0] || "";
                                            }
                                        } catch (e) {
                                            serverMessage =
                                                err.message ||
                                                "an unexpected error occurred while deleting the branch.";
                                        }
                                        showErrorToast(
                                            serverMessage ||
                                                "an unexpected error occurred while deleting the branch.",
                                        );
                                    })
                                    .finally(() => {
                                        setDeptToDelete(null);
                                        setIsDeleting(false);
                                    });
            }
        }
        if (countError) {
            console.error("Error fetching user count:", countError);
            toast.error(countError.message || "Error fetching user count");
            setDeptToDelete(null);
            setIsDeleting(false);
        }
    }, [deptToDelete, userCount, isCountLoading, countError,deleteDoc,mutate]);


	 // Delete API
    // const handleDelete = (deptId: string) => {
    //     deleteDoc("CG Department", deptId)
    //         .then(() => {
    //             toast.success("Department deleted successfully");
    //             mutate();
    //             setIsSheetOpen(false);
    //         })
    //         .catch((err: any) => {
    //             let serverMessage = "";
    //             try {
    //                 if (err._server_messages) {
    //                     serverMessage = JSON.parse(err._server_messages)[0] || "";
    //                 }
    //             } catch (e) {
    //                 serverMessage = err.message || "An unexpected error occurred while deleting the department.";
    //             }
    //             toast.error(serverMessage || "Failed to delete department.");
    //         })
    //         .finally(() => {
    //             setDeptToDelete(null);
    //         });
    // };


	 // Handle row click to open sheet for editing
    const handleRowClick = (dept: CGDepartment) => {
        setSelectedDept(dept);
        setIsEditSheetOpen(true);
    };

	 // Check screen size for responsive column hiding
    useEffect(() => {
        const checkScreenSize = () => {
            const isBelowThreshold = window.innerWidth < 500;
            setIsSmallScreen(isBelowThreshold);
        };

        checkScreenSize();
        window.addEventListener("resize", checkScreenSize);
        return () => window.removeEventListener("resize", checkScreenSize);
    }, []);

	 // Define columnDefs similar to DepartmentTable
    const columnDefs: ColumnProps[] = useMemo(() => {
        const columns: ColumnProps[] = [
            {
                fieldname: "department_name",
                label: "Department Name",
                fieldtype: "Data",
                hidden: false,
                overrideProps: {
                    filter: "agTextColumnFilter",
                    minWidth: isSmallScreen ? 100 : 270,
                    flex: 1,
                    filterParams: {
                        debounceMs: 200,
                        suppressMiniFilter: true,
                    },
                    onCellClicked: ({ data }: { data: CGDepartment }) => {
                        handleRowClick(data);
                    },
                    cellRenderer: ({ data }: { data: CGDepartment }) => (
                        <p
                            className="truncate text-[14px] text-[#5B5967] font-[400] cursor-pointer"
                            onClick={() => handleRowClick(data)}
                        >
                            {data?.department_name || "No Department Name"}
                        </p>
                    ),
                },
            },
            // {
            //     fieldname: "name",
            //     label:"User Count",
            //     fieldtype: "Int",
            //     hidden: isSmallScreen,
            //     overrideProps: {
            //         filter: "agNumberColumnFilter",
            //         minWidth: 150,
            //         flex: 1,
            //         cellRenderer: ({ data }: { data: CGDepartment }) => (
            //             <p className="text-[14px] text-[#5B5967] font-[400]">
            //                 {/* Assuming userCount is fetched and available in data */}
            //                 {userCount !== undefined ? userCount : "0"}
            //             </p>
            //         ),
            //     },
            // }
        ];

        if (roleBaseName === "ROLE-Admin") {
            columns.push({
                fieldname: undefined,
                label: "Action",
                hidden: false,
                overrideProps: {
                    maxWidth: 160,
                    filter: false,
                    headerClass: "my-header-center",
                    cellRenderer: ({ data }: { data: CGDepartment }) => {
                        // const canDelete = userCount === 0 && roleBaseName === "ROLE-Admin";
                        const tooltipMessage = "Delete department";
                            // ? "Delete department"
                            // : userCount > 0
                            // ? `Cannot delete: Department has ${userCount} user${userCount > 1 ? "s" : ""}`
                            // : "You don't have permission to delete this department";

                        return (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div
                                            className={"flex justify-center items-center w-full h-full pl-3"}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                    setDeptToDelete(data?.name);
                                                
                                            }}
                                        >
                                            <Trash2
                                                className={`h-7 w-7 rounded-full p-1`}
                                            />
                                        </div>
                                    </TooltipTrigger>
                                    <Portal>
                                        <TooltipContent
                                            side="top"
                                            className="text-white text-sm rounded-md"
                                        >
                                            <p>{tooltipMessage}</p>
                                        </TooltipContent>
                                    </Portal>
                                </Tooltip>
                            </TooltipProvider>
                        );
                    },
                },
            });
        }

        return columns;
    }, [roleBaseName, isSmallScreen, userCount]);

	  useEffect(() => {
        mutate();
    }, []);

	if (error) {
        console.error("Failed to fetch department data:", error);
    }

	return (
		<section className="mt-5 mx-5 space-y-5">
			<div className="flex items-center mx-1 justify-between">
				<h1 className="font-[600] text-[18px] text-[#2D2C37]">Departments</h1>
				<div className="flex items-center gap-x-2">
					{roleBaseName === "ROLE-Admin" &&  (
                        <>
						<AddDepartmentSheet
							onDepartmentAdded={mutate}
							selectedBranch={null}
							isSheetOpen={isSheetOpen}
							setIsSheetOpen={setIsSheetOpen}
						/>
                        </>
					)}
				</div>
			</div>

			{/* <DepartmentTable
				onDepartmentAdded={mutate}
				setCurrentPage={setCurrentPage}
				totalRecords={totalRecords || 0}
				recordsPerPage={recordsPerPage}
				currentPage={currentPage}
				departmentData={departmentData || []}
			/> */}
			<div className="h-[90vh] flex flex-row">
                <DoctypeList
                    doctype="CG Department"
                    key={"CG Department"}
                    columnDefs={columnDefs}
                    showCheckboxColumn={false}
                    showModifiedColumn={false}
                />
            </div>
            {roleBaseName === "ROLE-Admin" && selectedDept && (
               <EditDepartmentSheet
                        isSheetOpen={isEditSheetOpen && !!selectedDept}
                setIsSheetOpen={setIsEditSheetOpen}
                selectedDept={selectedDept}
                onDepartmentUpdated={() => {
                  mutate();
                  setSelectedDept(null);
                  setIsEditSheetOpen(false);
                }}
                        />
            )}
		</section>
	);
};

export default DepartmentsComponent;

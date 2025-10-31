import BranchTable from "./BranchTable";
import AddBranchSheet from "./AddBranchSheet";
import { useFrappeDeleteDoc, useFrappeGetDocCount, useFrappeGetDocList } from "frappe-react-sdk";
import { CGBranch } from "@/types/ClapgrowApp/CGBranch";
import { useContext, useEffect, useMemo, useState } from "react";
import { UserContext } from "@/utils/auth/UserProvider";
import DoctypeList from "../common/DataGrid/DataGridWithMeta";
import { ColumnProps } from "../common/DataGrid/DataGridComponent";
import { convertTo12HourFormat, showErrorToast } from "../common/CommonFunction";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { Portal } from "@radix-ui/react-tooltip";
import EditBranchSheet from "./EditBranchSheet";
const BranchesComponent = () => {
	const { userDetails, companyDetails } = useContext(UserContext);
	const { roleBaseName } = useContext(UserContext);
	// console.log("roleBaseName", roleBaseName);
	const [currentPage, setCurrentPage] = useState<number>(1);
	const recordsPerPage = 20;
	const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false); // New state for edit sheet
	const [branchToDelete, setBranchToDelete] = useState<string | null>(null);
    // console.log("branchToDelete", branchToDelete);
	const [selectedBranch, setSelectedBranch] = useState<CGBranch | null>(null);
	 const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false);
	const { deleteDoc } = useFrappeDeleteDoc();
	
	let filters: any[] = [];
	const companyId = useMemo(() => {
		return companyDetails && companyDetails.length > 0
			? companyDetails[0].name
			: null;
	}, [companyDetails]);

	const { data: totalRecords } = useFrappeGetDocCount("CG Branch", [
		["company_id", "=", companyId],
	]);

	const {
		data: branchData,
		mutate,
		error,
	} = useFrappeGetDocList<CGBranch>(
		"CG Branch",
		{
			fields: ["name", "branch_name", "start_time", "end_time", "creation"],
			filters: [
				...filters, // ✅ Spread existing filters if `filters` is an array
				...(userDetails?.[0]?.company_id
					? [["company_id", "=", userDetails[0].company_id]]
					: []), // ✅ Conditionally add company_id filter
			],
			limit: recordsPerPage,
			limit_start: (currentPage - 1) * recordsPerPage,
		},
		{ deps: [currentPage] },
	);

	

	// Transform data to include working hours
    // const transformedData = useMemo(() => {
    //     return (branchData || []).map((branch) => ({
    //         ...branch,
    //         working_hours:
    //             branch.start_time && branch.end_time
    //                 ? `${convertTo12HourFormat(branch.start_time)} - ${convertTo12HourFormat(branch.end_time)} IST`
    //                 : "Time not available",
    //     }));
    // }, [branchData]);


	// Fetch user count for the branch being deleted
    const {
        data: userCount,
        isLoading: isCountLoading,
        error: countError,
    } = useFrappeGetDocCount(
        "CG User",
        branchToDelete ? [["branch_id", "=", branchToDelete]] : [],
        !!branchToDelete,
    );

	// Handle delete confirmation when user count is fetched
    useEffect(() => {
        if (branchToDelete && !isCountLoading && userCount !== undefined) {
            if (userCount > 0) {
                toast.error(
                    `You cannot delete this branch, it has ${userCount} user${userCount > 1 ? "s" : ""} in it. Kindly delete users first.`,
                );
                setBranchToDelete(null);
            } else {
                deleteDoc("CG Branch", branchToDelete)
                    .then(() => {
                        toast.success("Branch deleted successfully");
                        mutate();
                    })
                    .catch((err: any) => {
                        let serverMessage = "";
                        try {
                            if (err._server_messages) {
                                const parsedMessages = JSON.parse(err._server_messages);
                                serverMessage = parsedMessages || "";
                                
                            }
                             showErrorToast(
                            serverMessage ||
                                "An unexpected error occurred while deleting the branch.",
                        );
                        } catch (e) {
                            serverMessage =
                                err.message ||
                                "An unexpected error occurred while deleting the branch.";
                        }
                    })
                    .finally(() => {
                        setBranchToDelete(null);
                    });
            }
        }
        if (countError) {
            toast.error(countError.message || "Error fetching user count");
            setBranchToDelete(null);
        }
    }, [branchToDelete, userCount, isCountLoading, countError,deleteDoc,mutate]);

	// Delete API
    // const handleDelete = (branchId: string) => {
    //     deleteDoc("CG Branch", branchId)
    //         .then(() => {
    //             toast.success("Branch deleted successfully");
    //             mutate();
    //             setIsSheetOpen(false);
    //         })
    //         .catch((err: any) => {
    //                         let serverMessage = "";
    //                         try {
    //                             if (err._server_messages) {
    //                                 const parsedMessages = JSON.parse(err._server_messages);
    //                                 serverMessage = parsedMessages[0] || "";
    //                                 // ;
    //                             }
    //                         } catch (e) {
    //                             // console.error("Error parsing server messages:", e);
    //                             serverMessage =
    //                     err.message ||
    //                     "An unexpected error occurred while deleting the branch.";
    //                         }
            
    //                         // Check for LinkExistsError
    //                         if (
    //                             err.exception === "frappe.exceptions.LinkExistsError" ||
    //                   serverMessage.includes("is linked with")
    //                         ) {
    //                             // ;
    //                             const count = userCount || 0; // Use fetched user count or fallback to 0
    //                             toast.error(
    //                                 `You cannot delete this branch, it has ${count} user${count > 1 ? "s" : ""} in it. Kindly delete users first.`,
    //                             );
    //                         } else {
    //                             // Handle other errors
    //                             showErrorToast(
    //                                 serverMessage ||
    //                       err.message ||
    //                       "An unexpected error occurred while deleting the branch.",
    //                             );
    //                         }
    //                     })
    //         .finally(() => {
    //             setBranchToDelete(null);
    //         });
    // };

	// Handle row click to open sheet for editing
    const handleRowClick = (branch: CGBranch) => {
        // console.log("Selected branch for edit:", branch); // Debug
        setSelectedBranch(branch);
        setIsEditSheetOpen(true); // Open edit sheet instead of add sheet
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

	// Define columnDefs similar to columnDefsMemo in BranchTable
    const columnDefs: ColumnProps[] = useMemo(() => {
        const columns: ColumnProps[] = [
            {
                fieldname: "branch_name",
                label: "Branch Name",
                fieldtype: "Data",
                hidden: false,
                overrideProps: {
                    filter: "agTextColumnFilter",
                    minWidth: isSmallScreen ? 100 : 200,
                    flex: 1,
                    filterParams: {
                        debounceMs: 200,
                        suppressMiniFilter: true,
                    },
                    onCellClicked: ({ data }: { data: CGBranch }) => {
                        // console.log("onclick branch",data);
                        handleRowClick(data);
                    },
                    cellRenderer: ({ data }: { data: CGBranch }) => (
                        <p
                            className="truncate text-[14px] text-[#5B5967] font-[400] cursor-pointer"
                            onClick={() => handleRowClick(data)}
                        >
                            {data?.branch_name || "No Branch Name"}
                        </p>
                    ),
                },
            },
            {
                fieldname: "timeline",
                label: "Working Hours",
                fieldtype: "Data",
                hidden: isSmallScreen,
                overrideProps: {
                    maxWidth: 250,
                    filter: true,
                    filterParams: {
                        debounceMs: 200,
                        suppressMiniFilter: true,
                    },
                    headerClass:"my-header-center",
                    cellRenderer: ({ data }: { data: CGBranch }) => {
                        // console.log("data in timeline renderer",data);
                //        <p
                //             className="truncate text-[14px] text-[#5B5967] font-[400] cursor-pointer"
                //             onClick={() => handleRowClick(data)}
                //         >
                //             {data?.start_time && data?.end_time
                // ? `${convertTo12HourFormat(data.start_time)} - ${convertTo12HourFormat(data.end_time)} IST`
                // : "Time not available"}
                //         </p>
               return(  <p className="flex justify-center items-center w-full h-full ml-7">
                    {data?.timeline
                        ? `${data.timeline.split(" - ")[0].toString()} - ${data.timeline.split(" - ")[1].replace(" IST", "").toString()} IST`
                        : "Time not available"}
                </p>
               )
                    },
                },
            },
			
        ];

        if (roleBaseName === "ROLE-Admin") {
            columns.push({
                fieldname: undefined,
                label: "Action",
                hidden: false,
                overrideProps: {
                    maxWidth: 160,
                    filter: false,
                     headerClass:"my-header-center",
                    cellRenderer: ({ data }: { data: CGBranch }) => {
                        // const canDelete = userCount === 0 && roleBaseName === "ROLE-Admin";
                        
                        // const tooltipMessage = canDelete
                        //     ? "Delete branch"
                        //     : userCount > 0
                        //     ? `Cannot delete: Branch has ${userCount} user${userCount > 1 ? "s" : ""}`
                        //     : "You don't have permission to delete this branch";
                        const tooltipMessage = "Delete branch";

                        return (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div
                                            className={"flex justify-center items-center w-full h-full"}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // if (canDelete) {
                                                //     // setBranchToDelete(data?.name);
                                                //     handleDelete(data?.name);
                                                // }
                                                 setBranchToDelete(data?.name);
                                                // handleDelete(data?.name);
                                               
                                            }}
                                        >
                                            <Trash2
                                                className={"h-7 w-7 text-[#304156] rounded-full p-1" }
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

	// useEffect(() => {
	//   ;
	// },[branchData])
	useEffect(() => {
		mutate();
	}, []);

	if (error) {
		console.error("Failed to fetch branch data:", error);
	}

	return (
		<section className="mt-5 mx-5 space-y-5">
			<div className="flex items-center mx-1 justify-between">
				<h1 className="font-[600] text-[18px] text-[#2D2C37]">Branches</h1>
				<div className="flex items-center gap-x-2">
					{roleBaseName === "ROLE-Admin" && (
						<AddBranchSheet
							onBranchAdded={mutate}
							selectedBranch={null}
							isSheetOpen={isSheetOpen}
							setIsSheetOpen={setIsSheetOpen}
						/>
					)}
				</div>
			</div>
			<div className="h-[90vh] flex flex-row">
				<DoctypeList
				doctype="CG Branch"
				key={"CG Branch"}
				columnDefs={columnDefs}
				showCheckboxColumn={false}
                showModifiedColumn={false}
				
				/>
			</div>
			{/* <BranchTable
				onBranchAdded={mutate}
				setCurrentPage={setCurrentPage}
				totalRecords={totalRecords || 0}
				recordsPerPage={recordsPerPage}
				currentPage={currentPage}
				branchData={branchData || []}
			/> */}
            {roleBaseName === "ROLE-Admin" && (
        <EditBranchSheet
          selectedBranch={selectedBranch}
          isSheetOpen={isEditSheetOpen}
          setIsSheetOpen={setIsEditSheetOpen}
          onBranchUpdated={mutate}
        />
      )}
		</section>
	);
};

export default BranchesComponent;

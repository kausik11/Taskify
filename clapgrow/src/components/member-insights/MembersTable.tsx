// src/components/MembersTable.tsx
import React, {
	Dispatch,
	SetStateAction,
	useContext,
	useMemo,
	useState,
	useCallback,
} from "react";
import PropTypes from "prop-types";
import FilterComponent from "../common/FilterComponent";
import CommonHeader from "../common/CommonHeader";
import MembersTableDetails from "./MembersTableDetails";
import FrappeReportGrid from "../common/DataGrid/FrappeReportGrid";
import { UserContext } from "@/utils/auth/UserProvider";
import { useFrappeGetDocList } from "frappe-react-sdk";
import { useUserDetailsByEmails } from "../common/CommonFunction";
import UserAssignees from "../dashboard/UserAssignees";
import { Avatar, AvatarImage } from "@radix-ui/react-avatar";

interface MembersTableProps {
  setTableOpen: Dispatch<SetStateAction<boolean>>;
  isTableOpen: boolean;
}

interface BranchOption {
  name: string;
  branch_name: string;
}

interface DepartmentOption {
  name: string;
  department_name: string;
}

interface SelectedUser {
  email?: string;
  full_name?: string;
  department?: string;
  branch?: string;
  display_score?: number;
  weekly_score?: number;
  [key: string]: any;
}

const DEFAULT_PAGE_SIZE = 20;
const REPORT_NAME = "Member Insights Table";

// Utility functions for date calculations
const getWeekStart = (): Date => {
	const date = new Date();
	const day = date.getDay();
	const diff = date.getDate() - day + (day === 0 ? -6 : 1);
	const weekStart = new Date(date.setDate(diff));
	weekStart.setHours(0, 0, 0, 0);
	return weekStart;
};

const getWeekEnd = (): Date => {
	const weekStart = getWeekStart();
	const weekEnd = new Date(weekStart);
	weekEnd.setDate(weekStart.getDate() + 6);
	weekEnd.setHours(23, 59, 59, 999);
	return weekEnd;
};

const getLastWeekStart = (): Date => {
	const weekStart = getWeekStart();
	const lastWeekStart = new Date(weekStart);
	lastWeekStart.setDate(weekStart.getDate() - 7);
	return lastWeekStart;
};

const getLastWeekEnd = (): Date => {
	const lastWeekStart = getLastWeekStart();
	const lastWeekEnd = new Date(lastWeekStart);
	lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
	lastWeekEnd.setHours(23, 59, 59, 999);
	return lastWeekEnd;
};

const formatDateForAPI = (date: Date): string => {
	return date.toISOString().split('T')[0];
};

export default function MembersTable({
	setTableOpen,
	isTableOpen,
}: MembersTableProps) {
	const { companyDetails } = useContext(UserContext);

	// State to store the selected user ID for fetching email
	//const [selectedUserId, setSelectedUserId] = useState<"kausik saha" | null>(null);

	//   // Fetch user email using useFrappeGetDocList
	const { data: userDocs, error } = useFrappeGetDocList("CG User", {
		fields: ["full_name", "email"],
		// filters: selectedUserId ? [["full_name", "==", selectedUserId]] : undefined,
		// enabled: !!selectedUserId, // Only fetch when selectedUserId is set
	    //limit all
		limit:0,
	});
//    console.log("First user document:", userDocs);
	// Filter states
	const [branch, setBranch] = useState<BranchOption | null>(null);
	const [dept, setDept] = useState<DepartmentOption | null>(null);
	const [scoreTab, setScoreTab] = useState<string>("All");
	const [scoreInterval, setScoreInterval] = useState<string>("");
	const [lastWeekReport, setLastWeekReport] = useState<boolean>(false);

	// Date states
	const [fromDate, setFromDate] = useState<Date>(getLastWeekStart());
	const [toDate, setToDate] = useState<Date>(getLastWeekEnd());


	// UI states
	const [selectedTask, setSelectedTask] = useState<string>("Onetime");
	const [isDetailsOpen, setIsDetailsOpen] = useState(false);
	const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);

	// FilterComponent compatibility states
	const [status, setStatus] = useState<string>("");
	const [task, setTask] = useState<string[]>([]);
	const [audit, setAudit] = useState<string>("");
	const [assignedTo, setAssignedTo] = useState<any[]>([]);
	const [assignee, setAssignee] = useState<any[]>([]);
	const [priority, setPriority] = useState<string>("All");
	const [tags, setTags] = useState<string[]>([]);
	const [teamMember, setTeamMember] = useState<any | null>(null);
	const [excludeCompleted, setExcludeCompleted] = useState<boolean>(false);
	const [includeAllWork, setIncludeAllWork] = useState<boolean>(false);

	// Force refresh state to trigger report re-fetch when filters change
	const [refreshKey, setRefreshKey] = useState<number>(0);

	const getRandomColor = (identifier: string) => {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-indigo-500",
    "bg-teal-500",
  ];
  const index =
    identifier.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    colors.length;
  return colors[index];
};
	// const columnDefs = useMemo(() => [
	// 	{ label: "Full Name", fieldname: "full_name", sortable: true, filter: true, flex: 1,
	// 		overrideProps: {
	// 			cellRenderer: (params: any) => {
	// 				return (
	// 					<span className="relative left-2">
	// 						{params.value}
	// 					</span>
	// 				);
	// 			},
	// 		},
	// 	},
	// 	  {
	// 		  fieldname: "user_image",
	// 		  label: "User Image",
	// 		  fieldtype: "Link",
	// 		  overrideProps: {
	// 			cellRenderer: (params: any) => {
	// 			  return (
	// 				<img src={params.value} className="w-6 h-6 object-cover rounded absolute mr-100"></img>
	// 			  );
	// 			},
	// 		  },
	// 		},
	// ], []);
	const columnDefs = useMemo(() => [
  {
    label: "Full Name",
    fieldname: "full_name",
    sortable: true,
    filter: true,
    flex: 1,
    overrideProps: {
		width: 600,
      cellRenderer: (params: any) => {
		const user = {
            full_name: params.data.full_name,
            user_image: params.data.user_image,
            first_name: params.data.full_name.split(" ")[0] || "",
            last_name: params.data.full_name.split(" ")[1] || "",
          };
		  const hasImage = !!user?.user_image;
		  const bgColor = getRandomColor( user?.full_name || "default");
        return (
          <div className="flex items-center gap-2">
           {hasImage ? <img
              src={params.data.user_image}
              className="w-7 h-7 object-cover rounded-full"
            //   alt="User"
            /> :
			<div className="pl-1">
			<div className={`${bgColor} w-6 h-6 rounded-full flex items-center justify-center text-white font-medium`}>
				{(user.first_name.charAt(0) || "").toUpperCase()}
				{(user.last_name.charAt(0) || "").toUpperCase()}
			</div>
			</div>
			}
            <span className="text-[#2D2C37] truncate font-inter text-[14px]">{params.value}</span>
          </div>
        );
      },
    },
  },
  {
	label: "Task Over Due",
	fieldname: "overdue_tasks",
	sortable: true,
	filter: true,
	flex: 1,
	overrideProps: {
		minWidth: 100,
		maxWidth: 130,
		cellRenderer: (params: any) => {
			return (
				<p className="relative left-9 text-[#2D2C37]">
					{params.value}
				</p>
			);
		},
	},
  },
  {
	label:"Weekly Score",
	fieldname:"display_score",
	sortable:true,
	filter:true,
	flex:1,
	overrideProps: {
		cellRenderer: (params: any) => {
			return (
				<p className="relative left-4 text-[#2D2C37]">
					{params.value}%
				</p>
			);
		},
	},
  },
  {
	label:"Department",
	fieldname:"department",
	sortable:true,
	filter:true,
	flex:1,
	overrideProps: {
		maxWidth: 200,
		minWidth: 200,
		 cellRenderer: (params: any) => {
      const displayValue = params.value ? params.value.split('-').slice(0, -1).join('-') : '';
      return (
        <p className="relative left-2 text-[#2D2C37]">
          {displayValue}
        </p>
      );
    },
	},
  },
  {	label:"Branch",
	fieldname:"branch",
	sortable:true,
	filter:true,
	flex:1,
	 overrideProps: {
		maxWidth: 200,
    cellRenderer: (params: any) => {
      const displayValue = params.value ? params.value.split('-').slice(0, -1).join('-') : '';
      return (
        <p className="relative text-[#2D2C37]">
          {displayValue}
        </p>
      );
    },
  }
},
{
	label:"Completed Tasks",
	fieldname:"completed_tasks",
	sortable:true,
	filter:true,
	flex:1,
	overrideProps: {
		maxWidth: 150,
		minWidth: 150,
		cellRenderer: (params: any) => {
			return (
				<p className="relative left-9 text-[#2D2C37]">
					{params.value}
				</p>
			);
		},
	},
  },
  {
	label:"Total Tasks",
	fieldname:"total_tasks",
	sortable:true,
	filter:true,
	flex:1,
	overrideProps: {
		cellRenderer: (params: any) => {
			return (
				<p className="relative left-9 text-[#2D2C37]">
					{params.value}
				</p>
			);
		},
	},
  },
  {
	label:"One Time Tasks",
	fieldname:"on_time_tasks",
	sortable:true,
	filter:true,
	flex:1,
	overrideProps: {
		cellRenderer: (params: any) => {
			return (
				<p className="relative left-9 text-[#2D2C37]">
					{params.value}
				</p>
			);
		},
	},
  },
  {
	label:"On Time%",
	fieldname:"on_time_percentage",
	sortable:true,
	filter:true,
	flex:1,
	overrideProps: {
		cellRenderer: (params: any) => {
			return (
				<p className="relative left-9 text-[#2D2C37]">
					{params.value}
				</p>
			);
		},
	},
  }
], []);

	const companyId = useMemo(() => {
		return companyDetails && companyDetails.length > 0
			? companyDetails[0].name
			: undefined;
	}, [companyDetails]);

	// Calculate effective date range based on lastWeekReport toggle
	const effectiveDateRange = useMemo(() => {
		if (lastWeekReport) {
			return {
				from: formatDateForAPI(getLastWeekStart()),
				to: formatDateForAPI(getLastWeekEnd()),
			};
		}
		return {
			from: formatDateForAPI(fromDate),
			to: formatDateForAPI(toDate),
		};
	}, [fromDate, toDate, lastWeekReport]);


	// Function to fetch user email and update state
	//   const fetchUserEmail = useCallback(
	//     (userId: string, rowData: any) => {
	//       setSelectedUserId(userId); // Trigger useFrappeGetDocList
	//       // Since useFrappeGetDocList is async, we rely on the effect of userDocs updating
	//       const userEmail = userDocs?.[0]?.email || "N/A"; // Use email from userDocs or fallback
	//       const selectedUser: SelectedUser = {
	//         ...rowData,
	//         email: userEmail,
	//       };
	//       setSelectedUser(selectedUser);
	//       setIsDetailsOpen(true);
	//     },
	//     [userDocs, setSelectedUser, setIsDetailsOpen]
	//   );

	const handleRowClick = useCallback((params: any) => {

		if (params.data?.full_name) {
			// const userId = params.data.full_name;
			// fetchUserEmail(userId, params.data);
			const matchedUser = userDocs?.find(
				(user: { full_name: string; email: string }) =>
					user.full_name.toLowerCase() === params.data.full_name.toLowerCase()
			);

			setSelectedUser({
				...params.data,
				email: matchedUser ? matchedUser.email : "N/A",
			})
			setIsDetailsOpen(true);
		}
	}, [userDocs]);


	const handleLastWeekToggle = useCallback((enabled: boolean) => {
		setLastWeekReport(enabled);
		// Force refresh when toggling last week report
		setRefreshKey(prev => prev + 1);
	}, []);

	const handleFromDateChange = useCallback((date: Date | null) => {
		if (date) {
			setFromDate(date);
			setLastWeekReport(false); // Disable last week when manually selecting dates
			setRefreshKey(prev => prev + 1);
		}
	}, []);

	const handleToDateChange = useCallback((date: Date | null) => {
		if (date) {
			setToDate(date);
			setLastWeekReport(false); // Disable last week when manually selecting dates
			setRefreshKey(prev => prev + 1);
		}
	}, []);

	// Enhanced branch change handler that triggers refresh
	const handleBranchChange = useCallback((branchValue: BranchOption | null) => {
		setBranch(branchValue);
		setRefreshKey(prev => prev + 1);
	}, []);

	// Enhanced department change handler that triggers refresh
	const handleDeptChange = useCallback((deptValue: DepartmentOption | null) => {
		setDept(deptValue);
		setRefreshKey(prev => prev + 1);
	}, []);

	// Enhanced score tab change handler that triggers refresh
	const handleScoreTabChange = useCallback((scoreValue: string) => {
		setScoreTab(scoreValue);
		setRefreshKey(prev => prev + 1);
	}, []);

	const handleExport = useCallback(() => {
		// Export functionality implementation
		;
	}, []);

	const handleCloseDetails = useCallback(() => {
		setIsDetailsOpen(false);
		setSelectedUser(null);
	}, []);

	const handleBranchAdded = useCallback(() => {
		// Refresh logic if needed
		setRefreshKey(prev => prev + 1);
	}, []);

	// Critical fix: Updated handleFiltersChanged to actually trigger report refresh
	const handleFiltersChanged = useCallback(() => {
		// ;
		setRefreshKey(prev => prev + 1);
	}, []);

	// Filter component with corrected prop handling
	const FilterPart: JSX.Element = useMemo(() => (
		<FilterComponent
			status={status}
			setStatus={setStatus}
			task={task}
			setTask={setTask}
			audit={audit}
			setAudit={setAudit}
			assignedTo={assignedTo}
			setAssignedTo={setAssignedTo}
			assignee={assignee}
			setAssignee={setAssignee}
			priority={priority}
			setPriority={setPriority}
			tags={tags}
			setTags={setTags}
			fromDate={fromDate}
			setFromDate={handleFromDateChange}
			toDate={toDate}
			setToDate={handleToDateChange}
			teamMember={teamMember}
			setTeamMember={setTeamMember}
			selectedTask={selectedTask}
			branch={branch}
			setBranch={handleBranchChange}
			dept={dept}
			setDept={handleDeptChange}
			scoreTab={scoreTab}
			setScoreTab={handleScoreTabChange}
			scoreInterval={scoreInterval}
			setScoreInterval={setScoreInterval}
			FilterName="MemberInsights"
			excludeCompleted={excludeCompleted}
			setExcludeCompleted={setExcludeCompleted}
			includeAllWork={includeAllWork}
			setIncludeAllWork={setIncludeAllWork}
			lastWeekReport={lastWeekReport}
			setLastWeekReport={handleLastWeekToggle}
			onFiltersChanged={handleFiltersChanged}
		/>
	), [
		status, task, audit, assignedTo, assignee, priority, tags, fromDate, toDate,
		teamMember, selectedTask, branch, dept, scoreTab, scoreInterval,
		excludeCompleted, includeAllWork, lastWeekReport, handleFromDateChange,
		handleToDateChange, handleLastWeekToggle, handleFiltersChanged,
		handleBranchChange, handleDeptChange, handleScoreTabChange
	]);

	const agGridProps = useMemo(() => ({
		suppressRowClickSelection: true,
		animateRows: true,
		pagination: true,
		paginationPageSize: DEFAULT_PAGE_SIZE,
		paginationPageSizeSelector: [10, 20, 50, 100],
	}), []);

	return (
		<section className="space-y-4 h-full mt-[24px] w-full">
			<CommonHeader
				TableName="Member Insights"
				setTableOpen={setTableOpen}
				isTableOpen={isTableOpen}
				FilterPart={FilterPart}
				setSelectedTask={setSelectedTask}
				selectedTask={selectedTask}
				setViewType={() => { }}
				viewType=""
				handleExport={handleExport}
				setIsOpen={setIsDetailsOpen}
				onBranchAdded={handleBranchAdded}
				selectedBranch={null}
				isSheetOpen={false}
				setIsSheetOpen={() => { }}
			/>

			<div className="p-4 bg-white rounded-[15px] w-full">
				<div className="h-[80vh]">
					<FrappeReportGrid
						key={refreshKey} // Critical: Force re-render when filters change
						reportName={REPORT_NAME}
						columnDefs={columnDefs}
						companyId={companyId}
						dept={dept?.name}
						branch={branch?.name}
						scoreRange={scoreTab !== "All" ? scoreTab : undefined}
						fromDate={effectiveDateRange.from}
						toDate={effectiveDateRange.to}
						lastWeekReport={lastWeekReport}
						onRowClicked={handleRowClick}
						agGridProps={agGridProps}
						className="h-full"
						height="100%"
						filterFields={['department', 'branch']}
						excludeFields={['user_image']}
					/>
				</div>

				<MembersTableDetails
					isOpen={isDetailsOpen}
					setIsOpen={setIsDetailsOpen}
					selectedUser={selectedUser}
					onClose={handleCloseDetails}
				/>
			</div>
		</section>
	);
}

MembersTable.propTypes = {
	setTableOpen: PropTypes.func.isRequired,
	isTableOpen: PropTypes.bool.isRequired,
};
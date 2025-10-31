import { ScrollArea } from "@radix-ui/react-scroll-area";
import { Sheet, SheetContent } from "../ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import TrendSelector from "../common/TrendSelector";
import TaskStatusChart from "./task-status-chart";
import NotApprovedChart from "./NotApprovedChart";
import TaskCompletionGraphCard from "./TaskCompletionGraphCard";
import TaskTable from "./TaskTable";
import BossIcon from "@/assets/icons/Boss2.svg";
import WorkIcon from "@/assets/icons/Work.svg";

import LocationIcon from "@/assets/icons/Location.svg";
import Boss2 from "@/assets/icons/Boss2.svg";
import { useSmartInsightGrapghContext } from "@/utils/graphapi/SmartInsightApiProvider";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Filter, useFrappeGetCall, useFrappeGetDocList } from "frappe-react-sdk";
import { useUserDetailsByEmails } from "../common/CommonFunction";
import UserAssignees from "../dashboard/UserAssignees";
import { UserContext } from "@/utils/auth/UserProvider";
import DoctypeList from "../common/DataGrid/DataGridWithMeta";
import { ColumnProps } from "../common/DataGrid/DataGridComponent";
import { StatusStyles } from "@/data/common";
import { PRIORITY_DATA } from "@/data/common";


interface selectedUser {
  user_image: "";
  full_name: "";
  user_name: "";
  email: "";
  role: "";
  designation?: "";
  branch: "";
}

interface MembersTableDetailsProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  selectedUser: selectedUser;
}

const MembersTableDetails: React.FC<MembersTableDetailsProps> = ({
	isOpen,
	setIsOpen,
	selectedUser,
}) => {
	const { userDetails, companyDetails } = useContext(UserContext);
	const [userId, setUserId] = useState<string>("");
	const { fetchMemberInsightGraph } = useSmartInsightGrapghContext();
	const [TaskCompletePercentGraphValue, setTaskCompletePercentGraphValue] =
    useState({
    	completed_tasks: [],
    	on_time_tasks: [],
    	dates: "",
    });
	const [TaskCompleteGraphValue, setTaskCompleteGraphValue] = useState([
		{ color: "bg-[#9397F6]", label: "Upcoming", value: 0 },
		{ color: "bg-[#0CA866]", label: "Completed", value: 0 },
		{ color: "bg-[#E0BF10]", label: "Due today", value: "0" },
		{ color: "bg-[#D72727]", label: "Overdue", value: 0 },
	]);
	const [completedPercentage, setCompletedPercentage] = useState({
		completed_percentage: 0,
		total_Task: 0,
	});

	// console.log("completedPercentage in table",completedPercentage)
	// console.log("TaskCompleteGraphValue in table",TaskCompleteGraphValue)


	const [selectedTask, setSelectedTask] = useState<string>("Onetime");
	const [selectedTrend, setSelectedTrend] = useState<string>("This Week");
	const gridRef = useRef<any>(null); // Define gridRef using useRef
	

	const companyId = userDetails?.[0]?.company_id;


  const { data, isLoading, error } = useFrappeGetCall(
    "frappe.desk.query_report.run",
    {
      report_name: "User Task Completion",
      filters: {
        from_date: '2023-01-01',
        to_date: '2025-12-31',
        assigned_to: selectedUser?.email || undefined,
      },
    },
	{
    enabled: !!selectedUser?.email, // Only fetch when selectedUser.email exists
    // Optionally, add a cache key to force re-fetch on email change
    key: `user-task-completion-${selectedUser?.email}`,
  }
  );

//   const rows = data?.message?.result || [];
//   const columns = data?.message?.columns || [];

// Process report data and update graph values
useEffect(() => {
  if (data && data.message.result) {
    const userRow = data.message.result.find(
      (row: any) => row.email === selectedUser?.email
    );

    if (userRow) {
      const totalTasks = userRow.total_tasks || 0;
      const completedTasks = userRow.completed_tasks || 0;
      const dueTodayTasks = userRow.due_today_tasks || 0;
      const overdueTasks = userRow.overdue_tasks || 0;
      const upcomingTasks = userRow.upcoming_tasks || 0;
      const completionPercentage = userRow.completion_percentage || 0;


      setTaskCompleteGraphValue([
        { color: "bg-[#9397F6]", label: "Upcoming", value: upcomingTasks },
        { color: "bg-[#0CA866]", label: "Completed", value: completedTasks },
        { color: "bg-[#E0BF10]", label: "Due today", value: dueTodayTasks },
        { color: "bg-[#D72727]", label: "Overdue", value: overdueTasks },
      ]);

      setCompletedPercentage({
        completed_percentage: parseFloat(completionPercentage || 0),
        total_Task: totalTasks,
      });

// 	  setTaskCompletePercentGraphValue({
// 		  						// ...TaskCompletePercentGraphValue,
// 		  						completed_tasks: userRow.completedd_tasks ?? [
//     6.25,
//     6.25,
//     6.25,
//     6.25,
//     6.25,
//     6.25
// ],
// 		  						on_time_tasks: userRow.on_time_tasks ?? [
//     6.25,
//     6.25,
//     6.25,
//     6.25,
//     6.25,
//     6.25
// ],
// 		  						dates: userRow.dates || [
//     "2025-10-06",
//     "2025-10-07",
//     "2025-10-08",
//     "2025-10-09",
//     "2025-10-10",
//     "2025-10-11"
// ],
// 	  })
    }else{
		setTaskCompleteGraphValue([
			{ color: "bg-[#9397F6]", label: "Upcoming", value: 0 },
			{ color: "bg-[#0CA866]", label: "Completed", value: 0 },	
			{ color: "bg-[#E0BF10]", label: "Due today", value: 0 },
			{ color: "bg-[#D72727]", label: "Overdue", value: 0 },
		]);
		setCompletedPercentage({
			completed_percentage: 0,
			total_Task: 0,
		});
	}
  }
}, [data, selectedUser?.email]);
	// Set userId immediately when selectedUser.email changes
	useEffect(() => {
		if (selectedUser?.email) {
			setUserId(selectedUser.email);
		} else {
			setUserId("");
		}
	}, [selectedUser?.email]);

	// ;

	// const TaskDetailsFunc = async (userName: string, selectedTrend: string) => {
	// 	if (!userName) {
	// 		console.error("Invalid userName provided to TaskDetailsFunc.");
	// 		return;
	// 	}

	// 	try {
	// 		const response = await fetchMemberInsightGraph(userName, selectedTrend);
	// 		if (response) {
	// 			setTaskCompletePercentGraphValue({
	// 				...TaskCompletePercentGraphValue,
	// 				completed_tasks: response.completionStatus?.completed_tasks ?? [],
	// 				on_time_tasks: response.completionStatus?.on_time_tasks ?? [],
	// 				dates: response.dates,
	// 			});
	// 			setTaskCompleteGraphValue([
	// 				{
	// 					color: "bg-[#9397F6]",
	// 					label: "Upcoming",
	// 					value: response.taskStatusCounts.Upcoming,
	// 				},
	// 				{
	// 					color: "bg-[#0CA866]",
	// 					label: "Completed",
	// 					value: response.taskStatusCounts.Completed,
	// 				},
	// 				{
	// 					color: "bg-[#E0BF10]",
	// 					label: "Due Today",
	// 					value: response.taskStatusCounts?.["Due Today"],
	// 				},
	// 				{
	// 					color: "bg-[#D72727]",
	// 					label: "Overdue",
	// 					value: response.taskStatusCounts.Overdue,
	// 				},
	// 			]);
	// 			setCompletedPercentage({
	// 				...completedPercentage,
	// 				completed_percentage:
    //         response.taskStatusCounts.Completion_percentage || 0,
	// 				total_Task: response.taskStatusCounts.Total_tasks || 0,
	// 			});
	// 		} else {
	// 			console.error("Failed to fetch filtered tasks");
	// 		}
	// 	} catch (error) {
	// 		console.error("Error fetching insights:", error);
	// 	}
	// };

	// useEffect(() => {
	// 	if (selectedUser?.email && selectedTrend) {
	// 		// ✅ Ensures both values exist
	// 		TaskDetailsFunc(selectedUser?.email, selectedTrend);
	// 		setUserId(selectedUser?.email);
	// 	}
	// }, [selectedUser?.email, selectedTrend]); 

	const taskTypes = [
		{ name: "Onetime", doctype: "CG Task Instance" },
		{ name: "Recurring", doctype: "CG Task Instance" },
		// { name: "process", doctype: "CG Process Task" },
		// { name: "help-ticket", doctype: "CG Help Ticket" },
	];

	// Define default filters for CG Task Instance based on selected user and company
	// const defaultFilters = useMemo<Filter[]>(() => {
	//   const filters: Filter[] = [];
	//   // // Always filter by selected user
	//   // if (selectedUser?.email) {
	//   //   filters.push(["assigned_to", "=", selectedUser.email]);
	//   // }
	//   // if (userId) {
	//   //   filters.push(["assigned_to", "=", userId]);
	//   // }
	//   // if (userDetails?.[0]?.company_id) {
	//   //   filters.push(["company_id", "=", userDetails[0].company_id]);
	//   // }

	//   // Filter by company if available
	//   // if (companyId) {
	//   //   filters.push(["company_id", "=", companyId]);
	//   // }

	//   if (selectedTask === "Onetime") {
	//     filters.push(["task_type", "=", "Onetime"]);
	//   } else if (selectedTask === "Recurring") {
	//     filters.push(["task_type", "=", "Recurring"]);
	//   }
	//   return filters;
	// }, [userId, companyDetails, selectedTask]);

	const mandatoryFilters = useMemo<Filter[]>(() => {
		const filters: Filter[] = [];


		// Always filter by selected user (hidden from user)
		if (selectedUser?.email) {
			filters.push(["assigned_to", "=", selectedUser.email],				     
			);
		}

		// filters.push(["task_type", "=", 'R']);
		// if (userId) {
		//   filters.push(["assigned_to", "=", userId]);
		// }

		// Filter by company if available (hidden from user)
		if (companyId) {
			filters.push(["company_id", "=", companyId]);
		}
		if (selectedTask === "Onetime") {
		  filters.push(["task_type", "=", "Onetime"]);
		} else if (selectedTask === "Recurring") {
		  filters.push(["task_type", "=", "Recurring"]);

		}
		;
		return filters;
	}, [selectedUser?.email, companyId,selectedTask]);


	// Refresh grid when filters change
	useEffect(() => {
		if (gridRef.current) {
			gridRef.current.api.refreshServerSide({ purge: true });
		}
	}, [mandatoryFilters]);

	// Fetch task counts for tabs
	// const tasksDataCounts = taskTypes.reduce((acc, taskType) => {
	//   const { data } = useFrappeGetDocList(
	//     taskType.doctype,
	//     {
	//       filters:
	//         userId && userDetails?.[0]?.company_id
	//           ? [
	//               ["assigned_to", "=", userId],
	//               ["company_id", "=", userDetails[0].company_id],
	//               ["is_recurring", "=", taskType.name === "Onetime" ? 0 : 1],
	//             ]
	//           : [],
	//       fields: ["name"], // Minimal field to get count
	//     },
	//     {
	//       enabled: !!userId && !!companyDetails?.[0]?.name,
	//     }
	//   );
	//   acc[taskType.name] = { count: data?.length || 0 };
	//   return acc;
	// }, {} as Record<string, { count: number }>);

	// ;

	const tasksData = taskTypes.reduce(
		(acc, taskType) => {
			const { data, error, isValidating } = useFrappeGetDocList(
				taskType.doctype,
				{
					filters: userId
						? [
							["assigned_to", "=", userId],
							["company_id", "=", `${userDetails?.[0]?.company_id}`],
							["task_type", "=", taskType.name],
						]
						: [],
					fields: [
						"task_name",
						"status",
						"assignee",
						"due_date",
						"priority",
						"task_type",
					],
				},
			);
			acc[taskType.name] = { data, error, isValidating };
			return acc;
		},
    {} as Record<string, { data?: any[]; error?: any; isValidating: boolean }>,
	);

	// useEffect(() => {
	//   ;
	// },[tasksData])

	// ;
	// Define columns for the task table
	const taskColumns: ColumnProps[] = [
		{
			fieldname: "task_name",
			label: "Task Name",
			fieldtype: "Data",
			hidden: false,
			overrideProps: {
				filter: "agTextColumnFilter",
				sortable: true,
				minWidth: 300,
			},
		},
		// {
		// 	fieldname: "status",
		// 	label: "Status",
		// 	fieldtype: "Select",
		// 	hidden: false,
		// 	overrideProps: {
		// 		filter: "agSetColumnFilter",
		// 		sortable: true,
		// 		width: 150,
		// 	},
		// },
		{
      fieldname: "status",
      label: "Status",
      fieldtype: "Select",
      overrideProps: {
        maxWidth: 100,
        filter: true,
        floatingFilter: false,
        filterParams: {
          values: [
            "Due Today",
            "Overdue",
            "Upcoming",
            "Paused",
            "Completed",
            "Rejected",
          ],
          debounceMs: 200,
          suppressMiniFilter: true,
        },
        cellRenderer: (params: any) => {
          const statusStyle =
            StatusStyles[params.data?.status as keyof typeof StatusStyles] ||
            "";
            // console.log("statusStyle",statusStyle)
          return (
            <div
              className={`text-[12px] font-[400] rounded-[20px] mt-2 mb-1 text-center flex items-center justify-around ${statusStyle} max-w-20`}
              style={{ height: "calc(100% - 15px)", lineHeight: "1" }}
            >
              {params.data?.status}
            </div>
          );
        },
      },
      colorMaps: {
        Overdue: "red",
        Upcoming: "green",
        "Due Today": "yellow",
        Completed: "cyan",
      },
    },
		{
			fieldname: "assignee",
			label: "Assignee",
			fieldtype: "Link",
			hidden: false,
			overrideProps: {
				filter: "agTextColumnFilter",
				sortable: true,
				minWidth: 200,
				cellRenderer: (params: any) => {
					const { data: usersData } = useUserDetailsByEmails(
						params.data.assignee,
					);
					return !params.data.assignee ? (
						<div className="text-[#5B5967] mt-2">No Assignee</div>
					) : (
						<div className="flex gap-2">
							<UserAssignees users={usersData || []} className="" />
							<span className="text-[14px] text-[#5B5967] font-[400]">
								{usersData?.[0]?.full_name || "N/A"}
							</span>
						</div>
					);
				},
			},
		},
		{
			fieldname: "due_date",
			label: "Due Date",
			fieldtype: "Date",
			hidden: false,
			overrideProps: {
				filter: "agDateColumnFilter",
				sortable: true,
				// maxWidth: 150,
			// 	cellRenderer: (params: any) => {	
			// 		const dueDate = params.data?.due_date;
			// 		if (!dueDate) {
			// 			return <div className="text-[#5B5967] mt-2">No Due Date</div>;
			// 		}
			// 		return (
			// 			<span className="text-[#5B5967]">{dueDate}</span>
			// 		)
			// },
			cellRenderer: (params: any) => {
  const dueDate = params.data?.due_date;
  if (!dueDate) {
    return <div className="text-[#5B5967] mt-2">No Due Date</div>;
  }

  const dateObj = new Date(dueDate);
  const formattedDate = dateObj.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return <span className="text-[#5B5967]">{formattedDate}</span>;
},

		},
	},
		// {
		// 	fieldname: "priority",
		// 	label: "Priority",
		// 	fieldtype: "Select",
		// 	hidden: false,
		// 	overrideProps: {
		// 		filter: "agSetColumnFilter",
		// 		sortable: true,
		// 		width: 150,
		// 	},
		// },
		{
      fieldname: "priority",
      label: "Priority",
      fieldtype: "Select",
      overrideProps: {
        maxWidth: 120,
        filter: "agSetColumnFilter",
        filterParams: {
          values: ["High", "Low", "Medium"],
          debounceMs: 200,
          suppressMiniFilter: true,
        },
        filterValueGetter: (params: any) => {
          return params.data?.priority;
        },
        suppressColumnsToolPanel: false, // Allow toggling in column panel
        cellRenderer: (params: any) => {
          const priority = PRIORITY_DATA.find(
            (p) => p.name === params.data?.priority,
          );
          return priority ? (
            <img
              src={priority.image}
              alt={priority.name}
              className="mt-4 mx-auto w-[12px] h-[12px]"
            />
          ) : null;
        },
      },
    },
	];

	// Transform tasksData into reportData format for DoctypeList
	// const reportData = useMemo(() => {
	//   if (!tasksData[selectedTask]?.data) {
	//     return undefined;
	//   }
	//   return {
	//     result: tasksData[selectedTask].data,
	//     columns: taskColumns.map((col) => ({
	//       fieldname: col.fieldname,
	//       label: col.label,
	//       fieldtype: col.fieldtype,
	//       width: col.overrideProps?.width || 150,
	//     })),
	//   };
	// }, [tasksData, selectedTask, taskColumns]);

	// Fetch CG User details
	const {
		data: cgUsers,
		error: cgUsersError,
		isValidating: cgUsersLoading,
	} = useFrappeGetDocList("CG User", {
		filters: [["company_id", "=", `${userDetails?.[0]?.company_id}`]],
		fields: ["name", "user_image", "full_name"],
	});

	// Enhance tasks with assignee details
	const enrichTasks = (tasks?: any[]) =>
		tasks?.map((task) => {
			const assigneeData = cgUsers?.find((user) => user.name === task.assignee);
			// ;
			return {
				...task,
				assigneeImage: assigneeData?.user_image || "",
				assigneeFullName: assigneeData?.full_name || "",
			};
		}) || [];

	// const selectedTasks = enrichTasks(tasksData[selectedTask]?.data || []);
	// ;

	// const isLoading =
	//   Object.values(tasksData).some((task) => task.isValidating) ||
	//   cgUsersLoading;
	// const error =
	//   Object.values(tasksData).find((task) => task.error)?.error || cgUsersError;

	// Generate dynamic task tab counts
	const tasksTab = taskTypes.map((task) => ({
		name: task.name,
		label: task.name.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
		count: tasksData[task.name]?.data?.length || 0,
		// count: tasksDataCounts[task.name]?.count || 0,
	}));

	const handleClick = (taskName: string) => {
		if (["Onetime", "Recurring", "process", "help-ticket"].includes(taskName)) {
			handleMemberClick(taskName, selectedUser?.email);
		} else {
			setSelectedTask(taskName);
		}
	};

	const handleMemberClick = (taskType: string, userId: string) => {
		setSelectedTask(taskType);
		setUserId(userId);
	};
	const { data: usersData } = useUserDetailsByEmails(
		selectedUser?.email,
		companyDetails?.[0]?.name,
	);

	// Add this effect to force refresh when selected user changes
	// useEffect(() => {
	//   if (gridRef.current) {
	//     gridRef.current.api.refreshServerSideStore();
	//   }
	// }, [selectedUser?.email]);

	// const overrideColumns: Record<string, Omit<ColumnProps, "fieldname">> = {
	// 	name: {

	// 		hidden: true,
	// 		overrideProps: {
	// 			suppressColumnsToolPanel: true,
	// 			suppressFiltersToolPanel: true,
	// 		},
	// 	},
	// 	task_name: {
	// 		label:"Tasks",
	// 		hidden: false,
	// 		overrideProps: {
	// 			minWidth: 300,
	// 			 cellRenderer: (params: any) => (
    //       <p className="truncate text-[15px] text-[#5B5967] font-[400] line-height-[18px]">
    //         {params.data?.task_name || "No Task Name"}
    //       </p>
    //     ),
	// 		},
	// 	},
	// 	status: {
	// 		label: "Status",
	// 		hidden: false,
	// 		colorMaps: {
	// 			Overdue: "red",
	// 			Upcoming: "green",
	// 			"Due Today": "yellow",
	// 			Completed: "cyan",
	// 		},
	// 		overrideProps:{
	// 			filter: true,
	// 					maxWidth: 150,
	// 					filterParams: {
	// 					  values: [
	// 						"Due Today",
	// 						"Overdue",
	// 						"Upcoming",
	// 						"Paused",
	// 						"Completed",
	// 						"Rejected",
	// 					  ],
	// 					  debounceMs: 200,
	// 					  suppressMiniFilter: true,
	// 					},
	// 					headerClass: "my-header-center",
	// 					cellRenderer: (params: any) => {
	// 					  const statusStyle =
	// 						StatusStyles[params.data?.status as keyof typeof StatusStyles] ||
	// 						"";
	// 						// console.log("statusStyle",statusStyle)
	// 					  return (
	// 						<div
	// 						  className={`text-[12px] font-[400] rounded-[20px] mt-2 mb-1 ml-7 text-center flex items-center justify-around ${statusStyle} max-w-20`}
	// 						  style={{ height: "calc(100% - 15px)", lineHeight: "1" }}
	// 						>
	// 						  {params.data?.status}
	// 						</div>
	// 					  );
	// 					},
	// 		}
	// 	},
	// 	assignee: {
	// 		overrideProps: {
	// 			maxWidth: 120,
	// 			cellRenderer: (params: any) => {
	// 				const { data: usersData } = useUserDetailsByEmails(
	// 					params.data.assignee,
	// 				);
	// 				return !params.data.assignee ? (
	// 					<div className="text-center text-[#5B5967] mt-2">No Assignee</div>
	// 				) : (
	// 					<div className="flex justify-center mt-2 ">
	// 						<UserAssignees users={usersData || []} className="" />
	// 					</div>
	// 				);
	// 			},
	// 		},
	// 	},
	// 	due_date:{
	// 		label: "Due Date",
	// 		overrideProps: {
	// 			maxWidth: 150,
    //             filter:"agDateColumnFilter",
	// 			cellRenderer: (params: any) => {
	// 				const dueDate = params.data?.due_date;
	// 				if (!dueDate) {
	// 					return <span className="text-[#5B5967]">No Due Date</span>;
	// 				}
	// 				 const dateObj = new Date(dueDate);
    //   const day = dateObj.getDate();
    //   const month = dateObj.toLocaleString("en-US", { month: "short" });
    //   const year = dateObj.getFullYear();

    //   // Format as: 3 Oct, 2025
    //   const formattedDate = `${day} ${month}, ${year}`;

    //   return <span className="text-[#5B5967]">{formattedDate}</span>;
	// 			},
	// 		},
	// 	},
	// 	priority: {
	// 		overrideProps: {
	// 			 headerClass: "my-header-center",
	// 			maxWidth: 150,
	// 		cellRenderer: (params: any) => {
	// 				  const priority = PRIORITY_DATA.find(
	// 					(p) => p.name === params.data?.priority,
	// 				  );
	// 				  return priority ? (
	// 					<img
	// 					  src={priority.image}
	// 					  alt={priority.name}
	// 					  className="mt-4 mx-auto w-[12px] h-[12px] ml-11"
	// 					/>
	// 				  ) : null;
	// 				},
	// 		},
	// 	},
		
		
	// };

	return (
		<Sheet open={isOpen} onOpenChange={setIsOpen}>
			<SheetContent className=" sheet-close-thick min-w-[1000px] h-[100vh] flex flex-col [&>button]:pt-[15px]">
				<ScrollArea className="h-full overflow-y-auto text-[#2D2C37] flex flex-col">
					<section className="flex flex-col gap-y-[20px]">
						<p className="font-[600] text-[22px]">Member Insights</p>
						<div className="grid grid-cols-9 gap-[16px]">
							<div className="col-span-5 flex items-center gap-[16px]">
								<UserAssignees
									users={usersData || []}
									className="h-[72px] w-[72px]"
								/>
								<div className="flex flex-col w-full space-y-[5px]">
									<p className="font-[600] text-[18px]">
										{usersData?.[0]?.full_name}
									</p>
									<div className="flex items-center justify-between text-[16px] text-[#5B5967] w-[60%]">
										<div
											className="flex items-center space-x-1"
											style={{
												// width: "400px",
												// marginLeft: "10px",
												padding: "2px",
											}}
										>
											<img
												src={Boss2}
												alt="Work Icon"
												className="w-[15px] h-[15px]"
											/>

											<p className="min-w-[80px] font-inter font-normal text-[14px] leading-[100%] tracking-[0]">
												{usersData?.[0]?.role?.replace(/^ROLE-/, "")}
											</p>
										</div>
										{usersData?.[0]?.designation && (
											<div
												className="flex items-center space-x-1"
												style={{
													// width: "400px",
													marginLeft: "10px",
													padding: "2px",
												}}
											>
												<img
													src={WorkIcon}
													alt="Work Icon"
													className="w-[15px] h-[15px]"
												/>
												<p className="min-w-[90px] font-inter font-normal text-[14px] leading-[100%] tracking-[0]">
													{usersData?.[0]?.designation || "Designation"}
												</p>
											</div>
										)}
										<div className="flex items-center space-x-1 ml-5">
											<img
												src={LocationIcon}
												alt="Location Icon"
												className="w-[15px] h-[15px]"
											/>
											<p className="font-inter font-normal text-[14px] leading-[100%] tracking-[0]">{selectedUser?.branch.split("-")[0]}</p>
										</div>
									</div>
								</div>
							</div>
							<div className="col-span-4 flex items-center justify-end mr-2">
								<TrendSelector
									value={selectedTrend}
									onChange={setSelectedTrend}
									pageName=""
								/>
							</div>
						</div>
						<div className="flex space-x-[16px]">
							<div className="w-[25%]">
								<TaskStatusChart
									graphValue={TaskCompleteGraphValue}
									completedPercentage={completedPercentage}
								/>
							</div>
							<div className="w-[25%]">
								<NotApprovedChart />
							</div>
							<div className="w-[50%]">
								<TaskCompletionGraphCard
									graphValue={TaskCompletePercentGraphValue}
								/>
							</div>
						</div>
						<div>
							<div className="flex items-center rounded-[8px] text-[14px] cursor-pointer">
								{tasksTab.map((task, index) => (
									<p
										key={task.name}
										onClick={() => handleClick(task.name)}
										className={`py-[5px] px-[6px] text-[12px] font-[400] border ${
											selectedTask === task.name
												? "bg-[#038EE2] border-[#038EE2] text-white"
												: "bg-white border-[#D0D3D9]"
										} ${index === 0 ? "rounded-l-[8px]" : ""} ${
											index === tasksTab.length - 1 ? "rounded-r-[8px]" : ""
										}`}
									>
										{task.label} ({task.count})
									</p>
								))}
							</div>
							{/* <TaskTable
                tasks={selectedTasks}
                isLoading={isLoading}
                error={error as Error | undefined}
              /> */}
							{/* <div className="h-[80vh]">
                  <DoctypeList
                    doctype="CG Task Instance"
                    defaultFilters={defaultFilters}
                    columnDefs={taskColumns}
                    agGridProps={{
                      suppressRowClickSelection: true,
                      animateRows: true,
                    }}
                  />
                </div> */}
							<div className="h-[80vh]">
								<DoctypeList
								    key={selectedTask.length} // Ensure the component re-renders when selectedTask changes
									doctype="CG Task Instance"
									// defaultFilters={defaultFilters}
									mandatoryFilters={mandatoryFilters}
									columnDefs={taskColumns}
									// overrideColumns={overrideColumns}
									agGridProps={{
										suppressRowClickSelection: true,
										animateRows: true,
										rowSelection: "multiple",
										suppressCellFocus: true,
									}}
									showCheckboxColumn={false}
                                    showModifiedColumn={false}
								/>
							</div>
						</div>
					</section>
				</ScrollArea>
			</SheetContent>
		</Sheet>
	);
};

export default MembersTableDetails;

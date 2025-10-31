import collapseIcon from "@/assets/icons/collapse-white-icon.svg";
import downloadIcon from "@/assets/icons/downloand-icon.svg";
import expandIcon from "@/assets/icons/expand-icon.svg";
import listIcon from "@/assets/icons/list-view-icon.svg";
import { cn } from "@/lib/utils";
import { ChevronDown, CircleX, ListFilter, Trash2 } from "lucide-react";
import React, { useCallback, useContext, useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import ImportDialog from "./ImportDialog";
import { UserContext } from "@/utils/auth/UserProvider";
import { CGBranch } from "@/types/ClapgrowApp/CGBranch";
import AddBranchSheet from "../settings/AddBranchSheet";
import { DeleteFunction } from "./DeleteFunction";
import TrendSelector from "./TrendSelector";
import {
	Tooltip,
	TooltipProvider,
	TooltipTrigger,
	TooltipContent,
} from "../ui/tooltip";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { toast } from "sonner";

interface CommonHeaderProps<T> {
	TableName?: string;
	setTableOpen?: React.Dispatch<React.SetStateAction<boolean>>;
	isTableOpen?: boolean;
	FilterPart?: JSX.Element;
	setSelectedTask?: React.Dispatch<React.SetStateAction<string>>;
	selectedTask?: string;
	setViewType?: React.Dispatch<React.SetStateAction<string>>;
	viewType?: string;
	handleExportCSV?: () => void;
	handleExportPDF?: () => void;
	isExporting?: boolean;
	setIsOpen?: React.Dispatch<React.SetStateAction<boolean>>;
	modalOpen?: boolean;
	setModalOpen?: React.Dispatch<React.SetStateAction<boolean>>;
	onBranchAdded?: React.Dispatch<React.SetStateAction<boolean>>;
	selectedBranch?: CGBranch | null;
	isSheetOpen?: boolean;
	setIsSheetOpen?: React.Dispatch<React.SetStateAction<boolean>>;
	selected?: any[];
	setSelected?: React.Dispatch<React.SetStateAction<any[]>>;
	rolePermission?: any[] | null;
	listSize?: number;
	setListSize: React.Dispatch<React.SetStateAction<number>>;
	setrefreshKey: React.Dispatch<React.SetStateAction<number>>;
}

function CommonHeader<T>({
	TableName,
	setTableOpen,
	isTableOpen,
	FilterPart,
	setSelectedTask,
	selectedTask,
	setViewType,
	viewType,
	handleExportCSV,
	handleExportPDF,
	isExporting = false,
	setSelected,
	selected,
	modalOpen,
	setModalOpen,
	onBranchAdded,
	selectedBranch,
	isSheetOpen,
	setIsSheetOpen,
	listSize,
	setListSize,
	setrefreshKey,
}: CommonHeaderProps<T>) {
	const { rolePermissions, companyDetails, userDetails } = useContext(UserContext);
	const [trendsGraph, setTrendsGraph] = useState<string>("This Week");

	// Get user company - same logic as in ImportDialog
	const userCompanyId = userDetails?.[0]?.company_id || companyDetails?.[0]?.name || companyDetails?.[1]?.name;

	// Permission checks for task visibility
	const showTeamTasks = useMemo(() => {
		if (!rolePermissions) return true; // Fallback to show if permissions not loaded
		const { assign_self, assign_admin, assign_team_lead, assign_team_member } =
			rolePermissions;
		return !(
			assign_self === 1 &&
			assign_admin === 0 &&
			assign_team_lead === 0 &&
			assign_team_member === 0
		);
	}, [rolePermissions]);

	// Permission checks for access control
	const canIhaveAccess = rolePermissions?.assign_self === 1;
	const othersHaveAccess =
		rolePermissions?.assign_team_member === 1 ||
		rolePermissions?.assign_team_lead === 1 ||
		rolePermissions?.assign_admin === 1;
	const canCreateBranches = rolePermissions?.branches_create === 1;

	// function to download existing recurring tasks data
	const downloadRecurringTasksData = useCallback(async () => {
		try {
			// First fetch all users to map emails to full names
			const usersResponse = await fetch("/api/method/frappe.client.get_list", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					doctype: "CG User",
					fields: ["email", "full_name", "first_name", "last_name"],
					filters: userCompanyId ? [["company_id", "=", userCompanyId]] : undefined,
					limit_page_length: 1000
				}),
			});

			let usersMap = new Map();
			if (usersResponse.ok) {
				const usersResult = await usersResponse.json();
				const users = usersResult.message || [];
				users.forEach((user: any) => {
					const fullName = user.full_name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email;
					usersMap.set(user.email, fullName);
				});
			}

			// First, get the list of recurring task definitions (just names)
			const listResponse = await fetch("/api/method/frappe.client.get_list", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					doctype: "CG Task Definition",
					fields: ["name"],
					filters: [
						["task_type", "=", "Recurring"],
						...(userCompanyId ? [["company_id", "=", userCompanyId]] : [])
					],
					limit_page_length: 1000
				}),
			});

			if (!listResponse.ok) {
				throw new Error("Failed to fetch recurring tasks list");
			}

			const listResult = await listResponse.json();
			const taskNames = listResult.message || [];

			if (!taskNames || taskNames.length === 0) {
				toast.info("No recurring tasks found to export.");
				return;
			}

			// Now fetch full data for each task definition including child tables
			const recurringTasks = [];

			for (const taskItem of taskNames) {
				try {
					const docResponse = await fetch("/api/method/frappe.client.get", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							doctype: "CG Task Definition",
							name: taskItem.name
						}),
					});

					if (docResponse.ok) {
						const docResult = await docResponse.json();
						if (docResult.message) {
							recurringTasks.push(docResult.message);
						}
					}
				} catch (error) {
					console.error(`Error fetching task ${taskItem.name}:`, error);
				}
			}

			if (recurringTasks.length === 0) {
				toast.info("No recurring tasks data could be retrieved.");
				return;
			}

			// Transform the data to match the import template format
			const exportData = recurringTasks.map((task: any) => {
				// Get the first recurrence type if available
				const recurrence = task.recurrence_type_id?.[0] || {};

				// Parse due date and time
				let dueDate = "";
				let dueTime = "00:00:00";

				if (task.due_date) {
					const date = new Date(task.due_date);
					dueDate = format(date, "yyyy-MM-dd");
					dueTime = format(date, "HH:mm:ss");
				}

				// Handle recurrence data
				let weekDays = "";
				if (recurrence.week_days) {
					// Clean up the week_days string - remove extra spaces and format consistently
					const days = recurrence.week_days.split(/[,\s]+/).filter(Boolean);
					weekDays = days.join(",");
				}

				// Handle nth week formatting
				let nthWeek = "";
				if (recurrence.nth_week) {
					nthWeek = recurrence.nth_week;
				}

				// Handle interval (frequency multiplier)
				let interval = "";
				if (recurrence.interval !== undefined && recurrence.interval !== null) {
					interval = recurrence.interval.toString();
				}

				// Handle month days (for monthly specific day recurrence)
				let monthDays = "";
				if (recurrence.month_days !== undefined && recurrence.month_days !== null) {
					monthDays = recurrence.month_days.toString();
				}

				// Clean description by removing HTML tags
				let cleanDescription = "";
				if (task.description && task.description !== "<p><br></p>") {
					cleanDescription = task.description.replace(/<[^>]*>/g, "").trim();
				}

				// Get full names from email mapping
				const assigneeName = usersMap.get(task.assignee) || task.assignee || "";
				const assignedToName = usersMap.get(task.assigned_to) || task.assigned_to || "";

				return {
					"Task Name": task.task_name || "",
					"Task Type": task.task_type || "Recurring",
					"Priority": task.priority || "Medium",
					"Start Date": dueDate,
					"Time": dueTime,
					"Assignee": assigneeName,
					"Assigned To": assignedToName,
					"Description": cleanDescription,
					"Holiday Behaviour": task.holiday_behaviour || "Ignore Holiday",
					"Upload Required": task.upload_required ? "Yes" : "No",
					"Tag": task.tag || "",
					"Restrict Before or After Due Date": task.restrict ? "Yes" : "No",
					"Frequency": recurrence.frequency || "",
					"Week Days": weekDays,
					"Nth Week": nthWeek,
					"Interval": interval,
					"Month Days": monthDays,
					"Created Date": task.creation ? format(new Date(task.creation), "yyyy-MM-dd") : ""
				};
			});

			// Create Excel workbook
			const wb = XLSX.utils.book_new();

			// Convert data to worksheet
			const ws = XLSX.utils.json_to_sheet(exportData);

			// Set column widths for better readability
			const colWidths = [
				{ wch: 30 }, // Task Name
				{ wch: 12 }, // Task Type
				{ wch: 10 }, // Priority
				{ wch: 12 }, // Due Date
				{ wch: 10 }, // Due Time
				{ wch: 25 }, // Assignee
				{ wch: 25 }, // Assigned To
				{ wch: 40 }, // Description
				{ wch: 20 }, // Holiday Behaviour
				{ wch: 15 }, // Upload Required
				{ wch: 15 }, // Tag
				{ wch: 25 }, // Restrict
				{ wch: 12 }, // Frequency
				{ wch: 20 }, // Week Days
				{ wch: 12 }, // Nth Week
				{ wch: 10 }, // Interval
				{ wch: 12 }, // Month Days
				{ wch: 12 }  // Created Date
			];
			ws["!cols"] = colWidths;

			// Add the data sheet
			XLSX.utils.book_append_sheet(wb, ws, "Recurring Tasks");

			// Create instructions sheet with simplified explanations
			const instructions = [
				["Recurring Tasks Export - Instructions"],
				[],
				["This file contains all recurring tasks from your company."],
				[],
				["Column Descriptions:"],
				["Task Name", "The name/title of the recurring task"],
				["Task Type", "Always 'Recurring' for this export"],
				["Priority", "Task priority level (Low, Medium, Critical)"],
				["Start Date", "The base due date for the recurring schedule"],
				["Due Time", "The time when the task is due"],
				["Assignee", "Person who created/owns the task"],
				["Assigned To", "Person responsible for completing the task"],
				["Description", "Detailed description of the task"],
				["Holiday Behaviour", "What to do when due date falls on holiday"],
				["Upload Required", "Whether file upload is required for task completion"],
				["Tag", "Category or label assigned to the task"],
				["Restrict Before or After Due Date", "Whether task completion is time-restricted"],
				["Frequency", "How often the task repeats (Daily, Weekly, Monthly, Yearly)"],
				["Week Days", "Which days of the week (for Weekly or Monthly tasks)"],
				["Nth Week", "Which week of the month (1st, 2nd, 3rd, 4th, Last)"],
				["Interval", "Every how many periods (1=every time, 2=every other time, etc.)"],
				["Month Days", "Which day of the month (1-31 for Monthly tasks)"],
				["Created Date", "When the task definition was originally created"],
				[],
				["Simplified Recurrence Examples:"],
				["Every Day:", "Frequency='Daily', Interval='1', other fields empty"],
				["Every Monday:", "Frequency='Weekly', Week Days='Monday', Interval='1'"],
				["Every 2 weeks on Monday:", "Frequency='Weekly', Week Days='Monday', Interval='2'"],
				["15th of every month:", "Frequency='Monthly', Month Days='15', Interval='1'"],
				["Every 2nd Friday of month:", "Frequency='Monthly', Week Days='Friday', Nth Week='2nd', Interval='1'"],
				["Every 3 months on 1st:", "Frequency='Monthly', Month Days='1', Interval='3'"],
				[],
				["Quick Reference:"],
				["- Interval = How often (1=every time, 2=skip one, 3=skip two, etc.)"],
				["- For specific weekdays: use Week Days"],
				["- For specific month dates: use Month Days"],
				["- For 'nth weekday of month': use both Week Days and Nth Week"],
				[],
				["Export Details:"],
				[`Total Tasks: ${exportData.length}`],
				[`Export Date: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`],
				[`Company: ${userCompanyId || "All Companies"}`]
			];

			const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
			wsInstructions["!cols"] = [{ wch: 30 }, { wch: 60 }];
			XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");

			// Generate filename with timestamp
			const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
			const filename = `recurring-tasks-export_${timestamp}.xlsx`;

			// Download the file
			XLSX.writeFile(wb, filename);

			toast.success(`Successfully exported ${exportData.length} recurring tasks!`);

		} catch (error) {
			console.error("Error exporting recurring tasks:", error);
			toast.error("Failed to export recurring tasks. Please try again.");
		}
	}, [userCompanyId]);

	return (
		<TooltipProvider>
			<header className="flex flex-col md:flex-row items-center justify-between w-full max-md:gap-2">
				<div className="flex items-center gap-2 md:gap-3">
					<h1 className="hidden md:block font-[600] text-[18px] text-[#2D2C37]">{TableName}</h1>
					{TableName === "Tasks" && (
						<>
							{(canIhaveAccess || othersHaveAccess) && (
								<div className="flex items-center rounded-[8px] text-[14px] cursor-pointer">
									{othersHaveAccess && (
										<p
											onClick={() => setSelectedTask?.("teamTask")}
											className={`rounded-l-[8px] w-[95px] h-[28px] py-[5px] px-[6px] text-[12px] font-[400] flex justify-center items-center ${selectedTask === "teamTask"
												? "bg-[#038EE2] border border-[#038EE2] text-white"
												: "bg-white border border-[#D0D3D9]"
												}`}
										>
											Team Tasks
										</p>
									)}
									<p
										onClick={() => setSelectedTask?.("myTask")}
										className={`${showTeamTasks && othersHaveAccess
											? "rounded-r-[8px]"
											: "rounded-[8px]"
											} w-[79px] h-[28px] py-[5px] px-[6px] text-[12px] font-[400] flex justify-center items-center ${selectedTask === "myTask"
												? "bg-[#038EE2] border border-[#038EE2] text-white"
												: "bg-white border border-[#D0D3D9]"
											}`}
									>
										My Tasks
									</p>
								</div>
							)}
							<Popover>
								<PopoverTrigger>
									<div className="hidden md:flex items-center gap-[8px] border border-[#D0D3D9] rounded-[8px] bg-white py-[6px] px-[6px] h-[28px]">
										<img
											src={listIcon}
											alt="List view icon"
											className="w-[12px] h-[12px]"
										/>
										<p className="text-[12px] text-nowrap font-[400]">
											{viewType === "list" ? "List View" : "Calendar View"}
										</p>
										<ChevronDown className="w-[15px] h-[15px]" />
									</div>
								</PopoverTrigger>
								<PopoverContent className="max-w-[160px]">
									<div className="flex flex-col gap-2">
										<div
											className="text-[12px] font-[400] cursor-pointer flex flex-row items-center gap-x-2"
											onClick={() => setViewType?.("list")}
										>
											<img
												src={listIcon}
												alt="List view icon"
												className="w-[12px] h-[12px]"
											/>
											List View
										</div>
										<div
											className="text-[12px] font-[400] cursor-pointer flex flex-row items-center gap-x-2"
											onClick={() => setViewType?.("calender")}
										>
											<img
												src={listIcon}
												alt="List view icon"
												className="w-[12px] h-[12px]"
											/>
											Calendar View
										</div>
									</div>
								</PopoverContent>
							</Popover>
						</>
					)}
					{TableName === "All Projects" && (
						<>
							<div className="flex items-center rounded-[8px] text-[14px] cursor-pointer">
								<p
									onClick={() => setSelectedTask?.("Active")}
									className={`rounded-l-[8px] w-[95px] h-[28px] py-[5px] px-[6px] text-[12px] font-[400] flex justify-center items-center ${selectedTask === "Active"
										? "bg-[#038EE2] border border-[#038EE2] text-white"
										: "bg-white border border-[#D0D3D9]"
										}`}
								>
									Active
								</p>
								<p
									onClick={() => setSelectedTask?.("Completed")}
									className={`w-[79px] h-[28px] py-[5px] px-[6px] text-[12px] font-[400] flex justify-center items-center ${selectedTask === "Completed"
										? "bg-[#038EE2] border border-[#038EE2] text-white"
										: "bg-white border border-[#D0D3D9]"
										}`}
								>
									Completed
								</p>
								<p
									onClick={() => setSelectedTask?.("Archived")}
									className={`rounded-r-[8px] w-[79px] h-[28px] py-[5px] px-[6px] text-[12px] font-[400] flex justify-center items-center ${selectedTask === "Archived"
										? "bg-[#038EE2] border border-[#038EE2] text-white"
										: "bg-white border border-[#D0D3D9]"
										}`}
								>
									Archived
								</p>
							</div>
							<Popover>
								<PopoverTrigger>
									<div className="flex items-center gap-[8px] border border-[#D0D3D9] rounded-[8px] bg-white py-[6px] px-[6px] h-[28px]">
										<img
											src={listIcon}
											alt="List view icon"
											className="w-[12px] h-[12px]"
										/>
										<p className="text-[12px] text-nowrap font-[400]">
											{viewType === "list" ? "List View" : "Calendar View"}
										</p>
										<ChevronDown className="w-[15px] h-[15px]" />
									</div>
								</PopoverTrigger>
								<PopoverContent className="max-w-[160px]">
									<div className="flex flex-col gap-2">
										<div
											className="text-[12px] font-[400] cursor-pointer flex flex-row items-center gap-x-2"
											onClick={() => setViewType?.("list")}
										>
											<img
												src={listIcon}
												alt="List view icon"
												className="w-[12px] h-[12px]"
											/>
											List View
										</div>
										<div
											className="text-[12px] font-[400] cursor-pointer flex flex-row items-center gap-x-2"
											onClick={() => setViewType?.("calender")}
										>
											<img
												src={listIcon}
												alt="List view icon"
												className="w-[12px] h-[12px]"
											/>
											Calendar View
										</div>
									</div>
								</PopoverContent>
							</Popover>
						</>
					)}
				</div>

				<div className="flex items-center justify-center gap-4 md:gap-2 px-[8px] py-[4px] rounded-[8px]">
					{/* <div className="flex items-center gap-4 w-full md:w-[20vw] px-[8px] py-[4px] bg-white rounded-[8px] border  border-[#D0D3D9]">
          <img
            src={searchIcon}
            alt="Search icon"
            className="opacity-50 w-[15px] h-[15px]"
          />
          <input
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 py-[3.5px] w-full outline-none placeholder:text-[#ACABB2]"
          />
          {searchQuery && (
            <CircleX
              className="cursor-pointer opacity-50 w-[15px] h-[15px]"
              onClick={handleClearSearch}
            />
          )}
        </div> */}
					{selected?.length > 0 && (
						<button
							className="hidden md:flex bg-white border border-[#ACABB2] h-[36px] w-[48px] rounded-[8px] items-center justify-center"
							onClick={() => setModalOpen?.(true)}
						>
							<Trash2 color="#5B5967" className="w-[18px] h-[18px]" />
						</button>
					)}
					{modalOpen && (
						<DeleteFunction
							selected={selected}
							isOpen={modalOpen}
							setIsOpen={setModalOpen}
							setSelected={setSelected}
							setrefreshKey={setrefreshKey} // Pass down the setRefreshKey function

						/>
					)}

					{TableName === "Tasks" && <ImportDialog name={TableName} />}

					{TableName === "Branches" && canCreateBranches && (
						<AddBranchSheet
							onBranchAdded={onBranchAdded}
							selectedBranch={selectedBranch}
							isSheetOpen={isSheetOpen}
							setIsSheetOpen={setIsSheetOpen}
						/>
					)}

					{/* Download dropdown for general tables */}
					{[
						"Tasks",
						"MIS Score",
						"Member Insights",
						"All Projects",
					].includes(TableName) &&
						(handleExportCSV || handleExportPDF) && (
							<div className="hidden md:block">
								<Popover>
									<Tooltip>
										<TooltipTrigger asChild>
											<PopoverTrigger disabled={isExporting}>
												<div className={`bg-white border border-[#ACABB2] rounded-[8px] px-[10px] py-[7px] flex justify-center items-center ${isExporting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'
													}`}>
													<img
														src={downloadIcon}
														alt="Download icon"
														className="w-[18px] h-[20px]"
													/>
												</div>
											</PopoverTrigger>
										</TooltipTrigger>
										<TooltipContent className="font-medium text-sm">
											{isExporting ? "Exporting" : "Download"}
										</TooltipContent>
									</Tooltip>
									<PopoverContent className="max-w-[160px] p-0">
										<div className="flex flex-col">
											{handleExportCSV && (
												<button
													className={`text-[12px] font-[400] cursor-pointer py-2 px-4 hover:bg-gray-100 text-left ${isExporting ? 'opacity-50 cursor-not-allowed' : ''
														}`}
													onClick={handleExportCSV}
													disabled={isExporting}
												>
													{isExporting ? 'Exporting' : 'Download as CSV'}
												</button>
											)}
											{handleExportPDF && (
												<button
													className={`text-[12px] font-[400] cursor-pointer py-2 px-4 hover:bg-gray-100 text-left ${isExporting ? 'opacity-50 cursor-not-allowed' : ''
														}`}
													onClick={handleExportPDF}
													disabled={isExporting}
												>
													{isExporting ? 'Exporting PDF' : 'Download as PDF'}
												</button>
											)}
										</div>
									</PopoverContent>
								</Popover>
							</div>
						)}

					{/* Specific download dropdown for Recurring Tasks */}
					{TableName === "Recurring Tasks" && (
						<div className="hidden md:block">
							<Tooltip>
								<TooltipTrigger asChild>
									<button
										onClick={downloadRecurringTasksData}
										className="bg-white border border-[#ACABB2] rounded-[8px] px-[10px] py-[7px] flex justify-center items-center hover:bg-gray-50 transition-colors"
									>
										<img
											src={downloadIcon}
											alt="Download icon"
											className="w-[20px] h-[20px]"
										/>
									</button>
								</TooltipTrigger>
								<TooltipContent className="font-medium text-sm">
									Download
								</TooltipContent>
							</Tooltip>
						</div>
					)}

					{TableName === "All Projects Overview" && (
						<div className="lg:w-[750px]">
							<TrendSelector
								value={trendsGraph}
								onChange={setTrendsGraph}
								pageName="OverAll"
							/>
						</div>
					)}

					<div className="hidden md:block">{FilterPart}</div>

					{["Tasks", "Member Insights", "Recurring Tasks"].includes(TableName) &&
						setTableOpen &&
						isTableOpen !== undefined && (
							<div>
								<Tooltip>
									<TooltipTrigger asChild>
										<button
											onClick={() => {
												setTableOpen(!isTableOpen);
												setListSize(listSize == 20 ? 50 : 20);
											}}
											className={cn(
												"bg-white border border-[#ACABB2] w-[38px] h-[35px] flex items-center justify-center rounded-[8px] px-[10px] py-[7px]",
												isTableOpen && "bg-black text-white hover:bg-zinc-700",
											)}
										>
											<img
												src={isTableOpen ? collapseIcon : expandIcon}
												alt="Expand/collapse icon"
												className="w-[18px] h-[18px]"
											/>
										</button>
									</TooltipTrigger>
									<TooltipContent className="font-medium text-sm">
										{isTableOpen ? "Collapse" : "Expand"}
									</TooltipContent>
								</Tooltip>
							</div>
						)}
				</div>
			</header>
		</TooltipProvider>
	);
}

export default CommonHeader;
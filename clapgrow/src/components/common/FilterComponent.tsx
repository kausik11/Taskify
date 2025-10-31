import filterIcon from "@/assets/icons/filter-icon.svg";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetOverlay,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Dispatch, SetStateAction, useContext, useState, useCallback, useMemo } from "react";
import { getInitials } from "../common/CommonFunction";
import CombinedDropDown from "../dashboard/CombinedDropDown";
import { Checkbox } from "../ui/checkbox";
import CustomCalenderFilter from "./AllFilterCalender";
import { UserContext } from "@/utils/auth/UserProvider";
import { format } from "date-fns";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "../ui/tooltip";

interface FilterComponentProps {
	selectedTask: string;
	status: string;
	task: string[];
	audit: string;
	assignedTo: any[];
	assignee: any[];
	priority: string;
	tags: string[];
	branch: { name: string; branch_name?: string } | null;
	dept: { name: string; department_name?: string } | null;
	teamMember: any | null;
	setTask: Dispatch<SetStateAction<string[]>>;
	setStatus: Dispatch<SetStateAction<string>>;
	setAudit: Dispatch<SetStateAction<string>>;
	setAssignedTo: Dispatch<SetStateAction<any>>;
	setAssignee: Dispatch<SetStateAction<any>>;
	setTeamMember: Dispatch<SetStateAction<any | null>>;
	setPriority: Dispatch<SetStateAction<string>>;
	setTags: Dispatch<SetStateAction<string[]>>;
	setBranch: Dispatch<SetStateAction<{ name: string; branch_name?: string } | null>>;
	setDept: Dispatch<SetStateAction<{ name: string; department_name?: string } | null>>;
	fromDate: Date | null;
	toDate: Date | null;
	setFromDate: Dispatch<SetStateAction<Date | null>>;
	setToDate: Dispatch<SetStateAction<Date | null>>;
	scoreTab: string;
	setScoreTab: Dispatch<SetStateAction<string>>;
	scoreInterval: string;
	setScoreInterval: Dispatch<SetStateAction<string>>;
	FilterName: string;
	excludeCompleted: boolean;
	setExcludeCompleted: React.Dispatch<React.SetStateAction<boolean>>;
	includeAllWork: boolean;
	setIncludeAllWork: React.Dispatch<React.SetStateAction<boolean>>;
	lastWeekReport?: boolean;
	setLastWeekReport?: (enabled: boolean) => void;
	onFiltersChanged?: () => void;
	TableAPI?: {
		doctype: string;
		mutate?: () => void;
		filters?: any[];
		limit?: number;
		orderBy?: { field: string; order: "asc" | "desc" };
	};
	taskStatus?: string[];
	setTaskStatus?: Dispatch<SetStateAction<string[]>>;
	delayStatus?: string[]; //for on-time and delay
	setDelayStatus?: Dispatch<SetStateAction<string[]>>; //set for on-time and delay
}

export default function FilterComponent({
	selectedTask,
	status,
	task,
	audit,
	assignedTo,
	assignee,
	priority,
	tags,
	branch,
	dept,
	teamMember,
	setTask,
	setStatus,
	setAudit,
	setAssignedTo,
	setAssignee,
	setTeamMember,
	setPriority,
	setTags,
	setBranch,
	setDept,
	fromDate,
	toDate,
	setFromDate,
	setToDate,
	scoreTab,
	setScoreTab,
	scoreInterval,
	setScoreInterval,
	FilterName,
	excludeCompleted,
	setExcludeCompleted,
	includeAllWork,
	setIncludeAllWork,
	lastWeekReport = false,
	setLastWeekReport,
	onFiltersChanged,
	TableAPI,
	taskStatus = ["Active"],
	setTaskStatus,
	delayStatus = [], //for on-time and delay
	setDelayStatus, //set for on-time and delay
}: FilterComponentProps) {
	const { userDetails } = useContext(UserContext);
	const [filters, setFilters] = useState<any[]>([]);

	const handleReset = useCallback(() => {
		setTask([]);
		setStatus("");
		setAudit("");
		setAssignedTo([]);
		setAssignee([]);
		setPriority("");
		setTags([]);
		setBranch(null);
		setDept(null);
		setTeamMember(null);
		setFromDate(null);
		setToDate(null);
		setScoreTab("All");
		setScoreInterval("");
		setExcludeCompleted(false);
		setIncludeAllWork(false);
		if (setLastWeekReport) {
			setLastWeekReport(false);
		}
		if (setTaskStatus) {
			setTaskStatus(["Active"]);
		}
		setFilters([]);
		// Trigger parent component refresh after reset
		setTimeout(() => {
			onFiltersChanged?.();
		}, 100);
	}, [
		setTask, setStatus, setAudit, setAssignedTo, setAssignee, setPriority,
		setTags, setBranch, setDept, setTeamMember, setFromDate, setToDate,
		setScoreTab, setScoreInterval, setExcludeCompleted, setIncludeAllWork,
		setLastWeekReport, setTaskStatus,setDelayStatus, onFiltersChanged
	]);

	const handleSubmit = useCallback(() => {
		const updatedFilters = [];

		if (FilterName === "MIS Score") {
			if (fromDate) updatedFilters.push(["due_date", ">=", format(fromDate, "yyyy-MM-dd")]);
			if (toDate) updatedFilters.push(["due_date", "<=", format(toDate, "yyyy-MM-dd")]);
			if (task.length > 0) {
				if (task.includes("Help")) {
					updatedFilters.push(["task_type", "=", "Onetime"]);
					updatedFilters.push(["is_help_ticket", "=", 1]);
				} else {
					updatedFilters.push(["task_type", "in", task]);
				}
			}
			if (priority && priority !== "All" && priority !== "") updatedFilters.push(["priority", "=", priority]);
			if (branch?.name) updatedFilters.push(["branch_id", "=", branch.name]);
			if (dept?.name) updatedFilters.push(["department_id", "=", dept.name]);
			if (teamMember?.email) updatedFilters.push(["assigned_to", "=", teamMember.email]);
			if (lastWeekReport) updatedFilters.push(["last_week_report", "=", 1]);
		} else if (FilterName === "MemberInsights") {
			// For Member Insights, the filters are handled by state changes in parent component
			console.log("Member Insights filters applied:", {
				fromDate: fromDate ? format(fromDate, "yyyy-MM-dd") : null,
				toDate: toDate ? format(toDate, "yyyy-MM-dd") : null,
				branch: branch?.branch_name || branch?.name,
				dept: dept?.department_name || dept?.name,
				scoreTab: scoreTab !== "All" ? scoreTab : null,
				lastWeekReport
			});
		} else if (FilterName === "Recurring Tasks") {
			// Specific logic for Recurring Tasks - no filters array needed
			console.log("Recurring Tasks filters applied:", {
				fromDate: fromDate ? format(fromDate, "yyyy-MM-dd") : null,
				toDate: toDate ? format(toDate, "yyyy-MM-dd") : null,
				status,
				audit,
				assignedTo: assignedTo.map((user: any) => user.email || user.name),
				assignee: assignee.map((user: any) => user.email || user.name),
				priority: priority && priority !== "All" ? priority : null,
				tags,
				taskStatus: taskStatus && taskStatus.length > 0 ? taskStatus : ["Active"]
			});
		} else {
			// Default filter logic for Tasks, etc.
			if (fromDate) updatedFilters.push(["due_date", ">=", format(fromDate, "yyyy-MM-dd")]);
			if (toDate) updatedFilters.push(["due_date", "<=", format(toDate, "yyyy-MM-dd")]);
			if (task.length > 0) {
				if (task.includes("Help") && !(task.includes("Onetime"))) {
					updatedFilters.push(["is_help_ticket", "=", 1]);
				} else {
					updatedFilters.push(["task_type", "in", task]);
				}
			}
			// Fixed priority filter - only add if priority is set and not empty/All
			if (priority && priority !== "All" && priority !== "") {
				updatedFilters.push(["priority", "=", priority]);
			}
			if (status) updatedFilters.push(["status", "=", status]);
			if (audit) updatedFilters.push(["audit_status", "=", audit]);
			if (assignedTo.length > 0) {
				const assignedEmails = assignedTo.map((a) => a.email || a.name);
				updatedFilters.push(["assigned_to", "in", assignedEmails]);
			}
			if (assignee.length > 0) {
				const assigneeEmails = assignee.map((a) => a.email || a.name);
				updatedFilters.push(["assignee", "in", assigneeEmails]);
			}
			if (tags.length > 0) updatedFilters.push(["tags", "in", tags]);
			if (branch?.name) updatedFilters.push(["branch_id", "=", branch.name]);
			if (dept?.name) updatedFilters.push(["department_id", "=", dept.name]);

			// Add delay status filter
			if (delayStatus && delayStatus.length > 0) {
				const delayValues = delayStatus.map(status => 
					status === "Delayed" ? 1 : status === "On Time" ? 0 : status
				);
				updatedFilters.push(["is_delayed", "in", delayValues]);
			}
		}

		// Only set filters for non-recurring tasks filters
		if (FilterName !== "Recurring Tasks" && FilterName !== "MemberInsights") {
			setFilters(updatedFilters);
		}

		// Always trigger parent component refresh when filters are submitted
		onFiltersChanged?.();

		// Also trigger TableAPI mutation if available
		if (TableAPI?.mutate) {
			TableAPI.mutate();
		}
	}, [
		FilterName, fromDate, toDate, task, priority, branch, dept, teamMember,
		lastWeekReport, status, audit, assignedTo, assignee, tags, scoreTab,
		taskStatus, delayStatus ,onFiltersChanged, TableAPI
	]);

	// Enhanced date change handlers that automatically trigger filter updates for Member Insights
	const handleFromDateChange = useCallback((date: Date | null) => {
		setFromDate(date);
		if (FilterName === "MemberInsights") {
			// For Member Insights, trigger immediate update
			setTimeout(() => {
				onFiltersChanged?.();
			}, 100);
		}
	}, [setFromDate, FilterName, onFiltersChanged]);

	const handleToDateChange = useCallback((date: Date | null) => {
		setToDate(date);
		if (FilterName === "MemberInsights") {
			// For Member Insights, trigger immediate update
			setTimeout(() => {
				onFiltersChanged?.();
			}, 100);
		}
	}, [setToDate, FilterName, onFiltersChanged]);

	// Enhanced last week report toggle with immediate update
	const handleLastWeekToggle = useCallback((checked: boolean) => {
		if (setLastWeekReport) {
			setLastWeekReport(checked);
			if (FilterName === "MemberInsights") {
				// Trigger immediate update for Member Insights
				setTimeout(() => {
					onFiltersChanged?.();
				}, 100);
			}
		}
	}, [setLastWeekReport, FilterName, onFiltersChanged]);

	const handleTeamMemberChange = useCallback((value: any) => {
		setTeamMember(value);
	}, [setTeamMember]);

	// Enhanced priority handler to ensure proper state management
	const handlePriorityChange = useCallback((priorityType: string) => {
		if (priority === priorityType) {
			setPriority(""); // Reset to empty string instead of "All"
		} else {
			setPriority(priorityType);
		}
	}, [priority, setPriority]);

	// Task status handler for recurring tasks
	const handleTaskStatusChange = useCallback((statusType: string) => {
		if (!setTaskStatus) return;

		if (taskStatus.includes(statusType)) {
			// Remove from selection
			const newStatus = taskStatus.filter((s) => s !== statusType);
			// If removing would result in empty array, keep at least one item
			if (newStatus.length === 0) {
				setTaskStatus([statusType === "Active" ? "Inactive" : "Active"]);
			} else {
				setTaskStatus(newStatus);
			}
		} else {
			// Add to selection
			setTaskStatus([...taskStatus, statusType]);
		}
	}, [taskStatus, setTaskStatus]);

		// Delay status handler
	const handleDelayStatusChange = useCallback((statusType: string) => {
		if (!setDelayStatus) return;

		if (delayStatus.includes(statusType)) {
			// Remove from selection
			const newStatus = delayStatus.filter((s) => s !== statusType);
			setDelayStatus(newStatus);
		} else {
			// Add to selection
			setDelayStatus([...delayStatus, statusType]);
		}
	}, [delayStatus, setDelayStatus]);

	return (
		<Sheet>
			<SheetTrigger>
				<TooltipProvider>
					<Tooltip defaultOpen={false}>
						<TooltipTrigger asChild>
							<button className="bg-white border border-[#ACABB2] h-9 w-10 rounded-[8px] flex items-center justify-center">
								<img
									src={filterIcon}
									alt="Filter button"
									className="w-[18px] h-[18px]"
								/>
							</button>
						</TooltipTrigger>
						<TooltipContent className="font-medium text-sm">
							<p>Filter</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</SheetTrigger>

			<SheetOverlay className="bg-black/10 backdrop-grayscale-0" />

			<SheetContent className="w-[80vw] md:min-w-[30vw] px-0">
				<div className="px-4">
					<SheetHeader>
						<SheetTitle className="text-[22px] font-[600]">Filters</SheetTitle>
					</SheetHeader>
					<div className="relative w-full h-full">
						<div className="pt-5 space-y-4 mb-12 max-h-[80vh] overflow-y-scroll pb-4">
							{(FilterName === "MIS Score" || FilterName === "MemberInsights") && setLastWeekReport && (
								<div className="space-y-1">
									<div className="flex items-center space-x-2">
										<Checkbox
											id="last-week-report"
											checked={lastWeekReport}
											onCheckedChange={handleLastWeekToggle}
										/>
										<label
											htmlFor="last-week-report"
											className="text-[#2D2C37] text-[14px] font-[500] cursor-pointer"
										>
											Last Week Report
										</label>
									</div>
									<p className="text-[#5B5967] text-[12px] ml-6">
										Show data from the previous week
									</p>
								</div>
							)}

							{["Tasks", "Recurring Tasks", "MIS Score", "MemberInsights"].includes(FilterName) && (
								<div className="space-y-1">
									<p className="font-[600] text-[#5B5967] text-[12px]">
										Date Range
									</p>
									<div className="flex items-center gap-3">
										<CustomCalenderFilter
											date={fromDate}
											onChange={handleFromDateChange}
											text="From"
											disabled={lastWeekReport}
										/>
										<CustomCalenderFilter
											date={toDate}
											onChange={handleToDateChange}
											text="To"
											disabled={lastWeekReport}
										/>
									</div>
									{lastWeekReport && (
										<p className="text-[#5B5967] text-[11px] italic ml-1">
											Date range is automatically set for last week
										</p>
									)}
								</div>
							)}

							{["Tasks", "MIS Score"].includes(FilterName) && (
								<div className="space-y-1">
									<p className="font-[600] text-[#5B5967] text-[12px]">
										Type of Task
									</p>
									<div className="flex items-center flex-wrap gap-2">
										{["Onetime", "Recurring", "Help", "Process"].map((type) => (
											<p
												key={type}
												onClick={() => {
													if (task.includes(type)) {
														setTask(task.filter((t) => t !== type));
													} else {
														setTask([...task, type]);
													}
												}}
												className={cn(
													"flex items-center gap-2 py-1.5 px-3 rounded-[8px] border-[1px] border-[#D0D3D9] cursor-pointer text-[#2D2C37] text-[12px] font-[400]",
													task.includes(type) &&
													"bg-[#D4EFFF] border-[#75CBFF]",
												)}
											>
												{type}
												{task.includes(type) && (
													<X
														size={12}
														className="cursor-pointer"
														onClick={(e) => {
															e.stopPropagation();
															setTask(task.filter((t) => t !== type));
														}}
													/>
												)}
											</p>
										))}
									</div>
								</div>
							)}

							{['Tasks'].includes(FilterName) && setDelayStatus &&(
								<>
								<div className="space-y-1">
                                 <p className="font-[600] text-[#5B5967] text-[12px]">	Delay Status</p>
								 <div className="flex items-center flex-wrap gap-2">
									{["Delayed","On Time"].map((time) => (
										<div className="flex items-center gap-2">
											<p 
											key={time}
											onClick={()=>handleDelayStatusChange(time)}
											className={cn(
																"flex items-center gap-2 py-1.5 px-3 rounded-[8px] border-[1px] border-[#D0D3D9] cursor-pointer text-[#2D2C37] text-[12px] font-[400]",
																delayStatus.includes(time) &&
																"bg-[#D4EFFF] border-[#75CBFF]",
															)}
															>
																{time}
																{delayStatus.includes(time) && (
													<X
														size={12}
														className="cursor-pointer"
														onClick={(e) => {
															e.stopPropagation();
															setTask(task.filter((t) => t !== time));
														}}
													/>
												)}
															</p>
											</div>
))}
								 </div>
								</div>
								</>
							)}

							{["Tasks", "Recurring Tasks"].includes(FilterName) && (
								<>
									<div className="space-y-1">
										<p className="font-[600] text-[#5B5967] text-[12px]">
											Status
										</p>
										<div className="flex items-center flex-wrap gap-2">
											{["Overdue", "Due Today", "Upcoming", "Completed"].map(
												(statusType) => (
													<div
														key={statusType}
														className="flex items-center gap-2"
													>
														<p
															onClick={() => {
																if (status === statusType) {
																	setStatus("");
																} else {
																	setStatus(statusType);
																}
															}}
															className={cn(
																"flex items-center gap-2 py-1.5 px-3 rounded-[8px] border-[1px] border-[#D0D3D9] cursor-pointer text-[#2D2C37] text-[12px] font-[400]",
																status === statusType &&
																"bg-[#D4EFFF] border-[#75CBFF]",
															)}
														>
															{statusType}
															{status === statusType && (
																<X
																	onClick={() => setStatus("")}
																	className="w-[12px] h-[12px] cursor-pointer"
																/>
															)}
														</p>
													</div>
												),
											)}
										</div>
									</div>

									{selectedTask !== "myTask" && (
										<div className="space-y-1">
											<CombinedDropDown
												value={[]}
												handleSelect={(value) => setAssignedTo(value)}
												placeholder="Select Assigned To"
												DataType="isEmployeeData"
												label="Assigned To"
												multiple={true}
												className="p-[8px] border-[1px] border-[#D0D3D9] rounded-[8px]"
											/>

											{assignedTo?.length > 0 && (
												<div className="mt-3 flex flex-wrap flex-1 flex-grow gap-2 items-center">
													{assignedTo?.map((assign, idx) => (
														<div
															key={idx}
															className="flex items-center gap-2 px-[8px] py-[3px] bg-[#F0F1F2] rounded-[8px] border-[1px] border-[#D0D3D9]"
														>
															<Avatar className="w-[20px] h-[20px]">
																<AvatarImage src={assign.user_image} />
																<AvatarFallback>
																	{getInitials(
																		assign?.first_name,
																		assign?.last_name,
																	)}
																</AvatarFallback>
															</Avatar>
															<p className="text-[#2D2C37] font-[400] text-[12px]">
																{assign.full_name}
															</p>
															<X
																onClick={() => {
																	const temp = assignedTo.filter(
																		(data) => data !== assign,
																	);
																	setAssignedTo(temp);
																}}
																className="w-[12px] h-[12px] cursor-pointer"
															/>
														</div>
													))}
												</div>
											)}
										</div>
									)}
									<div className="space-y-1">
										<CombinedDropDown
											DataType="isEmployeeData"
											label="Assignee"
											value={[]}
											handleSelect={(value) => setAssignee(value)}
											multiple={true}
											placeholder="Select Assignee"
											className="p-[8px] border-[1px] border-[#D0D3D9] rounded-[8px]"
										/>
										{assignee?.length > 0 && (
											<div className="mt-3 flex flex-wrap flex-1 flex-grow gap-2 items-center">
												{assignee?.map((assign, idx) => (
													<div
														key={idx}
														className="flex items-center gap-2 px-2 py-1 bg-[#F0F1F2] rounded-[8px] border-[1px] border-[#D0D3D9]"
													>
														<Avatar className="w-[20px] h-[20px]">
															<AvatarImage src={assign.user_image} />
															<AvatarFallback>
																{getInitials(
																	assign?.first_name,
																	assign?.last_name,
																)}
															</AvatarFallback>
														</Avatar>
														<p className="text-[#2D2C37] font-[400] text-[12px]">
															{assign.full_name}
														</p>
														<X
															onClick={() => {
																const temp = assignee.filter(
																	(data) => data !== assign,
																);
																setAssignee(temp);
															}}
															className="w-[12px] h-[12px] cursor-pointer"
														/>
													</div>
												))}
											</div>
										)}
									</div>
									<div className="space-y-1">
										<CombinedDropDown
											value={tags}
											handleSelect={(value) => {
												if (value?.tag_name && !tags.includes(value.tag_name)) {
													setTags([...tags, value.tag_name]);
												}
											}}
											label="Tags"
											placeholder="Select"
											DataType="isTagsData"
											getKey={(item: any) => item.tag_name}
											renderItem={(item: any) => item.tag_name}
											className="p-[8px] border-[1px] border-[#D0D3D9] rounded-[8px]"
										/>
										{tags?.length > 0 && (
											<div className="mt-3 flex flex-wrap flex-1 flex-grow gap-2 items-center">
												{tags.map((tag, idx) => (
													<div
														key={idx}
														className="flex items-center gap-2 px-[8px] py-[3px] bg-[#F0F1F2] rounded-[8px] border-[1px] border-[#D0D3D9]"
													>
														<p className="text-[#2D2C37] font-[400] text-[12px]">
															{tag}
														</p>
														<X
															onClick={() => {
																const temp = tags.filter(
																	(data) => data !== tag,
																);
																setTags(temp);
															}}
															className="w-[12px] h-[12px] cursor-pointer"
														/>
													</div>
												))}
											</div>
										)}
									</div>
								</>
							)}

							{["Tasks", "MIS Score", "Recurring Tasks"].includes(FilterName) && (
								<div className="space-y-1">
									<p className="font-[600] text-[#5B5967] text-[12px]">
										Priority
									</p>
									<div className="flex items-center flex-wrap gap-3">
										{["Low", "Medium", "Critical"].map((PriorityType) => (
											<div
												key={PriorityType}
												className="flex items-center gap-2"
											>
												<p
													onClick={() => handlePriorityChange(PriorityType)}
													className={cn(
														"flex items-center gap-2 py-1.5 px-3 rounded-[8px] border-[1px] border-[#D0D3D9] cursor-pointer text-[#2D2C37] text-[12px] font-[400]",
														priority === PriorityType &&
														"bg-[#D4EFFF] border-[#75CBFF]",
													)}
												>
													{PriorityType}
													{priority === PriorityType && (
														<X
															onClick={(e) => {
																e.stopPropagation();
																setPriority("");
															}}
															className="w-[12px] h-[12px] cursor-pointer"
														/>
													)}
												</p>
											</div>
										))}
									</div>
								</div>
							)}

							{/* Task Status Filter - Only for Recurring Tasks */}
							{FilterName === "Recurring Tasks" && setTaskStatus && (
								<div className="space-y-1">
									<p className="font-[600] text-[#5B5967] text-[12px]">
										Task Status
									</p>
									<div className="flex items-center flex-wrap gap-2">
										{["Active", "Inactive"].map((statusType) => (
											<p
												key={statusType}
												onClick={() => handleTaskStatusChange(statusType)}
												className={cn(
													"flex items-center gap-2 py-1.5 px-3 rounded-[8px] border-[1px] border-[#D0D3D9] cursor-pointer text-[#2D2C37] text-[12px] font-[400]",
													taskStatus.includes(statusType) &&
													"bg-[#D4EFFF] border-[#75CBFF]",
												)}
											>
												{statusType}
												{taskStatus.includes(statusType) && (
													<X
														size={12}
														className="cursor-pointer"
														onClick={(e) => {
															e.stopPropagation();
															handleTaskStatusChange(statusType);
														}}
													/>
												)}
											</p>
										))}
									</div>
								</div>
							)}

							{["Tasks", "MIS Score", "MemberInsights"].includes(FilterName) && (
								<>
									{selectedTask !== "myTask" && (
										<>
											<CombinedDropDown
												label="Department"
												value={dept}
												handleSelect={(value) => setDept(value)}
												placeholder="Select Department"
												DataType="isDepartmentData"
												getKey={(item: any) => item.name}
												renderItem={(item: any) => item.department_name || item.name}
												className="p-[8px] border-[1px] border-[#D0D3D9] rounded-[8px]"
											/>
											<CombinedDropDown
												label="Branch"
												DataType="isBranchData"
												value={branch}
												handleSelect={(value) => setBranch(value)}
												placeholder="Select Branch"
												getKey={(item) => item.name}
												renderItem={(item) => item?.branch_name || item?.name}
												className="p-[8px] border-[1px] border-[#D0D3D9] rounded-[8px]"
											/>
										</>
									)}
								</>
							)}

							{FilterName === "MIS Score" && (
								<div className="space-y-1">
									<CombinedDropDown
										DataType="isEmployeeData"
										label="Team Member"
										value={teamMember}
										handleSelect={handleTeamMemberChange}
										placeholder="Select Team Member"
										renderItem={(item: any) => item.full_name}
										className="p-[8px] border-[1px] border-[#D0D3D9] rounded-[8px]"
									/>
									{teamMember && (
										<div className="mt-3 flex flex-wrap flex-1 flex-grow gap-2 items-center">
											<div className="flex items-center gap-2 px-[8px] py-[3px] bg-[#F0F1F2] rounded-[8px] border-[1px] border-[#D0D3D9]">
												<Avatar className="w-[20px] h-[20px]">
													<AvatarImage src={teamMember.user_image} />
													<AvatarFallback>
														{getInitials(
															teamMember?.first_name,
															teamMember?.last_name
														)}
													</AvatarFallback>
												</Avatar>
												<p className="text-[#2D2C37] font-[400] text-[12px]">
													{teamMember.full_name}
												</p>
												<X
													onClick={() => {
														handleTeamMemberChange(null)
													}}
													className="w-[12px] h-[12px] cursor-pointer"
												/>
											</div>
										</div>
									)}
								</div>
							)}

							{["MIS Score", "MemberInsights"].includes(FilterName) && (
								<div className="space-y-1">
									<p className="font-[600] text-[#5B5967] text-[12px]">
										Score Range %
									</p>
									<div className="flex items-center flex-wrap gap-2">
										{["75-100", "50-74", "25-49", "<25"].map((range) => (
											<div key={range} className="flex items-center gap-2">
												<p
													onClick={() => {
														if (scoreTab === range) {
															setScoreTab("All");
														} else {
															setScoreTab(range);
														}
													}}
													className={cn(
														"flex items-center gap-2 py-1.5 px-3 rounded-[8px] border-[1px] border-[#D0D3D9] cursor-pointer text-[#2D2C37] text-[12px] font-[400]",
														scoreTab === range &&
														"bg-[#D4EFFF] border-[#75CBFF]",
													)}
												>
													{range}
													{scoreTab === range && (
														<X
															onClick={() => setScoreTab("All")}
															className="w-[12px] h-[12px] cursor-pointer"
														/>
													)}
												</p>
											</div>
										))}
									</div>
								</div>
							)}

							{FilterName === "MIS Score" && (
								<>
									<div className="flex items-center space-x-2 opacity-50 cursor-not-allowed">
										<Checkbox id="exclude-completed" checked={false} disabled />
										<label
											htmlFor="exclude-completed"
											className="flex gap-2 text-[#2D2C37] text-[14px] font-[400] cursor-not-allowed"
										>
											Exclude tasks completed on review day
											<span className="text-xs text-red-500 font-semibold">
												(Coming Soon)
											</span>
										</label>
									</div>
									<div className="flex items-center space-x-2 opacity-50 cursor-not-allowed">
										<Checkbox
											id="include-all-work"
											checked={includeAllWork}
											onCheckedChange={(checked) =>
												setIncludeAllWork(checked === true)
											}
											disabled
										/>
										<label
											htmlFor="include-all-work"
											className="flex gap-2 cursor-pointer text-[#2D2C37] text-[14px] font-[400]"
										>
											Include All Work
											<span className="text-xs text-red-500 font-semibold">
												(Coming Soon)
											</span>
										</label>
									</div>
									<div className="flex items-center space-x-2 opacity-50 cursor-not-allowed">
										<Checkbox
											id="filter-based-on-member"
											checked={includeAllWork}
											onCheckedChange={(checked) =>
												setIncludeAllWork(checked === true)
											}
											disabled
										/>
										<label
											htmlFor="filter-based-on-member"
											className="flex gap-2 cursor-pointer text-[#2D2C37] text-[14px] font-[400]"
										>
											Filter based on selected members
											<span className="text-xs text-red-500 font-semibold">
												(Coming Soon)
											</span>
										</label>
									</div>
								</>
							)}
						</div>
					</div>
					<div className="absolute bottom-4 px-4 left-0 flex w-full justify-end gap-4 border-t-[2px] border-[#F0F1F2]">
						<button
							className="bg-white mt-4 px-6 py-1.5 w-fit rounded-[8px] text-[#2D2C37] font-[600] text-[14px] border border-[#ACABB2]"
							onClick={handleReset}
						>
							Reset
						</button>
						<SheetClose asChild>
							<button
								className="bg-[#038EE2] mt-4 ml-2 px-6 py-1.5 w-fit rounded-[8px] text-white font-[600] text-[14px]"
								onClick={handleSubmit}
							>
								Submit
							</button>
						</SheetClose>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
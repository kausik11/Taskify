import { useContext, useEffect, useMemo, useState, useCallback } from "react";
import TableComponent from "../TableComponent";
import { TaskInsight } from "../common/CommonTypes";
import FilterComponent from "../common/FilterComponent";
import { useFrappePostCall } from "frappe-react-sdk";
import UserAssignees from "../dashboard/UserAssignees";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { UserContext } from "@/utils/auth/UserProvider";

interface TeamMember {
	first_name: string;
	last_name: string;
	full_name: string;
	user_image: string | null;
	name: string;
}

interface FilterOption {
	name: string;
}

export default function MISTable() {
	const { userDetails } = useContext(UserContext);
	const [taskInsights, setTaskInsights] = useState<TaskInsight[]>([]);
	const [totalRecords, setTotalRecords] = useState<number>(0);
	const [currentPage, setCurrentPage] = useState<number>(1);
	const [isTableOpen, setIsTableOpen] = useState(false);
	const [fromDate, setFromDate] = useState<Date>(
		startOfWeek(new Date(), { weekStartsOn: 1 }),
	);
	console.log('fromDate',fromDate);
	const [toDate, setToDate] = useState<Date>(
		endOfWeek(new Date(), { weekStartsOn: 1 }),
	);
	console.log('toDate',toDate);
	const [taskType, setTaskType] = useState<string>("All");
	const [priority, setPriority] = useState<string>("All");
	const [company, setCompany] = useState<FilterOption | null>(null);
	const [department, setDepartment] = useState<FilterOption | null>(null);
	const [branch, setBranch] = useState<FilterOption | null>(null);
	const [teamMember, setTeamMember] = useState<TeamMember | null>(null);
	const [scoreTab, setScoreTab] = useState<string>("All");
	const [lastWeekReport, setLastWeekReport] = useState<boolean>(false);
	const recordsPerPage = 10;

	const { call: fetchReportData } = useFrappePostCall(
		"frappe.desk.query_report.run",
	);

	// Handle last week report toggle
	const handleLastWeekReport = (enabled: boolean) => {
		setLastWeekReport(enabled);
		if (enabled) {
			const lastWeekStart = startOfWeek(subWeeks(new Date(), 1), {
				weekStartsOn: 1,
			});
			const lastWeekEnd = endOfWeek(subWeeks(new Date(), 1), {
				weekStartsOn: 1,
			});
			setFromDate(lastWeekStart);
			setToDate(lastWeekEnd);
		} else {
			// Reset to current week
			setFromDate(startOfWeek(new Date(), { weekStartsOn: 1 }));
			setToDate(endOfWeek(new Date(), { weekStartsOn: 1 }));
		}
	};

	const columns = useMemo(
		() => [
			{
				headerName: "Team Member",
				field: "full_name",
				minWidth: 150,
				flex: 1,
				filter: true,
				cellRenderer: (params: any) => {
					const team_member = {
						first_name: params.data?.first_name || "",
						last_name: params.data?.last_name || "",
						full_name: params.data?.full_name || "",
						user_image: params.data?.user_image || null,
					};
					return (
						<div className="flex gap-2 items-center">
							<UserAssignees users={[team_member]} className="" />
							<span className="truncate text-[#2D2C37]">
								{team_member.full_name || "No name available"}
							</span>
						</div>
					);
				},
			},
			{
				headerName: "Email",
				field: "email",
				minWidth: 150,
				filter: true,
				cellRenderer: (params: any) => (
					<p className="truncate text-[14px] text-[#2D2C37] font-[400] text-center">
						{params.data?.email || ""}
					</p>
				),
			},
			{
				headerName: "Department",
				field: "department",
				minWidth: 120,
				filter: true,
				// valueGetter: (params: any) =>
				// 	params.data?.department.split("-")[0] || "",
				 cellRenderer: (params: any) => {
      const displayValue = params.value ? params.value.split('-').slice(0, -1).join('-') : '';
      return (
        <p className="relative left-2 text-[#2D2C37]">
          {displayValue}
        </p>
      );
    },
			},
			{
				headerName: "Branch",
				field: "branch",
				minWidth: 120,
				filter: true,
				 cellRenderer: (params: any) => {
      const displayValue = params.value ? params.value.split('-').slice(0, -1).join('-') : '';
      return (
        <p className="relative text-[#2D2C37]">
          {displayValue}
        </p>
      );
    },
			},
			{
				headerName: "KRA",
				field: "kra",
				minWidth: 150,
				filter: true,
				cellRenderer: (params: any) => (
					<p className="truncate text-[14px] text-[#2D2C37] font-[400] text-center">
						{params.data?.kra || ""}
					</p>
				),
			},
			{
				headerName: "KPI",
				field: "kpi",
				minWidth: 150,
				filter: true,
				cellRenderer: (params: any) => (
					<p className="truncate text-[14px] text-[#2D2C37] font-[400] text-center">
						{params.data?.kpi || ""}
					</p>
				),
			},
			{
				headerName: "Current Period Planned",
				field: "current_week_planned",
				minWidth: 100,
				filter: true,
				cellRenderer: (params: any) => (
					<p className="truncate text-[14px] text-[#2D2C37] font-[400] text-center">
						{params.data?.current_week_planned || 0}
					</p>
				),
			},
			{
				headerName: "Current Period Actual",
				field: "current_week_actual",
				minWidth: 100,
				filter: true,
				cellRenderer: (params: any) => (
					<p className="truncate text-[14px] text-[#2D2C37] font-[400] text-center">
						{params.data?.current_week_actual || 0}
					</p>
				),
			},
			{
				headerName: "Current Period Actual %",
				field: "current_week_actual_percentage",
				minWidth: 100,
				filter: true,
				cellRenderer: (params: any) => (
					<p className="truncate text-[14px] text-[#2D2C37] font-[400] text-center">
						{params.data?.current_week_actual_percentage || 0}%
					</p>
				),
			},
		],
		[],
	);

	const filters = useMemo(() => ({
		from_date: fromDate ? format(fromDate, "yyyy-MM-dd") : null,
		to_date: toDate ? format(toDate, "yyyy-MM-dd") : null,
		task_type: taskType,
		priority: priority,
		company_id: company?.name || null,
		department_id: department?.name || null,
		branch_id: branch?.name || null,
		team_member: teamMember?.email || null,
		score_tab: scoreTab,
		last_week_report: lastWeekReport,
	}), [fromDate, toDate, taskType, priority, company, department, branch, teamMember, scoreTab, lastWeekReport]);

	const fetchReport = useCallback(async () => {
		try {
			// Only include non-null/non-"All"/non-false filters
			const activeFilters = Object.fromEntries(
				Object.entries(filters).filter(
					([key, value]) =>
						value !== null &&
						value !== "All" &&
						value !== false &&
						value !== "",
				),
			);

			const response = await fetchReportData({
				report_name: "MIS Score Report",
				filters: activeFilters,
			});

			if (response.message) {
				const reportData = response.message.result || [];
				setTaskInsights(reportData);
				setTotalRecords(reportData.length);
			} else {
				console.error("Failed to fetch report data");
			}
		} catch (error) {
			console.error("Error fetching report:", error);
		}
	}, [filters, fetchReportData, setTaskInsights, setTotalRecords]);

	useEffect(() => {
		if (filters.from_date && filters.to_date) {
			fetchReport();
		}
	}, [
		filters.from_date,
		filters.to_date,
		filters.task_type,
		filters.priority,
		filters.company_id,
		filters.department_id,
		filters.branch_id,
		filters.team_member,
		filters.score_tab,
		filters.last_week_report,
		fetchReport,
	]);

	const FilterPart: JSX.Element = (
		<FilterComponent
			status={""}
			setStatus={() => { }}
			task={taskType === "All" ? [] : [taskType]}
			setTask={(tasks) => setTaskType(tasks.length > 0 ? tasks[0] : "All")}
			audit={""}
			setAudit={() => { }}
			assignedTo={[]}
			setAssignedTo={() => { }}
			assignee={[]}
			setAssignee={() => { }}
			priority={priority}
			setPriority={setPriority}
			teamMember={teamMember}
			setTeamMember={setTeamMember}
			branch={branch}
			setBranch={setBranch}
			dept={department}
			setDept={setDepartment}
			fromDate={fromDate}
			setFromDate={setFromDate}
			toDate={toDate}
			setToDate={setToDate}
			scoreTab={scoreTab}
			setScoreTab={setScoreTab}
			scoreInterval={""}
			setScoreInterval={() => { }}
			tags={[]}
			setTags={() => { }}
			excludeCompleted={false}
			setExcludeCompleted={() => { }}
			includeAllWork={false}
			setIncludeAllWork={() => { }}
			selectedTask={""}
			lastWeekReport={lastWeekReport}
			setLastWeekReport={handleLastWeekReport}
			FilterName="MIS Score"
			TableAPI={{
				doctype: "CG Task Instance",
				filters: [],
				limit: recordsPerPage,
			}}
			onFiltersChanged={() => {
				if (filters.from_date && filters.to_date) {
					fetchReport();
				}
			}}
		/>
	);

	return (
		<section className="space-y-4 h-full mt-[24px] w-full overflow-x-auto">
			<TableComponent<TaskInsight>
				columnDefsMemo={columns}
				data={taskInsights}
				setCurrentPage={setCurrentPage}
				totalRecords={totalRecords}
				currentPage={currentPage}
				TableName="MIS Score"
				setTableOpen={setIsTableOpen}
				isTableOpen={isTableOpen}
				showPage={false}
				FilterPart={FilterPart}
				isLoading={false}
				fromDate={fromDate}
				toDate={toDate}
			/>
		</section>
	);
}

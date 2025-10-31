import { useContext, useEffect, useState, useCallback, useMemo, useRef } from "react";
import TableComponent from "../TableComponent";
import Pagination from "../common/Pagination";
import FilterComponent from "../common/FilterComponent";
import { useSmartInsightContext } from "@/utils/api/SmartInsightProvider";
import UserAssignees from "../dashboard/UserAssignees";
import { PRIORITY_DATA } from "@/data/common";
import { Sheet } from "../ui/sheet";
import TaskDefinitionSheet from "./TaskDefintionSheet";
import ReportList from "./ReportList";
import { ColumnProps } from "../common/DataGrid/DataGridComponent";
import { AgGridReactProps } from "ag-grid-react";
import FrappeReportGrid from "../common/DataGrid/FrappeReportGrid";
import CommonHeader from "../common/CommonHeader";
import { UserContext } from "@/utils/auth/UserProvider";
import exportToCSV from "../common/ExportToCSV";
import exportToPDF from "../common/ExportToPDF";

interface RecurringTaskTableProps {
	setTableOpen: React.Dispatch<React.SetStateAction<boolean>>;
	isTableOpen: boolean;
}

interface TaskInsight {
	recurring_task_id: string;
	recurring_tasks: string;
	frequency: string;
	assigned_to: {
		email: string;
		full_name: string;
		first_name: string;
		last_name: string;
		user_image: string | null;
	};
	assignee_email: string;
	assignee_full_name: string;
	assignee_first_name: string;
	assignee_last_name: string;
	assignee_user_image: string | null;
	on_time_percent: number | { source: string; parsedValue: number };
	completion_score: number | { source: string; parsedValue: number };
	priority: string;
	task_status: string;
}

export default function RecurringTaskTable({
	setTableOpen,
	isTableOpen,
}: RecurringTaskTableProps) {
	const { fetchRecurringTask } = useSmartInsightContext();
	const [taskInsights, setRecurringTaskInsights] = useState<TaskInsight[]>([]);
	const [isLoading, setLoading] = useState(false);
	const [currentPage, setCurrentPage] = useState<number>(1);
	const [totalRecords, setTotalRecords] = useState<number>(0);
	const [status, setStatus] = useState<string>("");
	const [audit, setAudit] = useState<string>("");
	const [assignedTo, setAssignedTo] = useState<any>([]);
	const [assignee, setAssignee] = useState<any>([]);
	const [priority, setPriority] = useState<string>("");
	const [tags, setTags] = useState<string[]>([]);
	const [fromDate, setFromDate] = useState<Date | null>(null);
	const [toDate, setToDate] = useState<Date | null>(null);
	const [isOpen, setIsOpen] = useState(false);
	const [listSize, setListSize] = useState<number>(isTableOpen ? 50 : 20);

	// New task status filter state - default to Active only
	const [taskStatus, setTaskStatus] = useState<string[]>(["Active"]);

	// Sheet state
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [selectedTaskDefinitionId, setSelectedTaskDefinitionId] = useState<string>("");
	const [selectedTasks, setSelectedTasks] = useState<TaskInsight[]>([]);
	const [modalOpen, setModalOpen] = useState(false);

	const [exportData, setExportData] = useState<any[]>([]);
	const [refreshKey, setRefreshKey] = useState<number>(0);

	// Add ref to track filter update timeout
	const filterUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const { companyDetails } = useContext(UserContext);

	const companyId = useMemo(() => {
		return companyDetails && companyDetails.length > 0
			? companyDetails[0].name
			: undefined;
	}, [companyDetails]);

	// Reset to page 1 when table state changes to avoid pagination issues
	useEffect(() => {
		setCurrentPage(1);
		setRefreshKey(prev => prev + 1);
	}, [isTableOpen]);

	// Handle row click to open sheet
	const handleTaskClick = (taskId: string) => {
		setSelectedTaskDefinitionId(taskId);
		setIsSheetOpen(true);
	};

	// Handle task update callback
	const handleTaskUpdated = useCallback(() => {
		setRefreshKey(prev => prev + 1);
	}, []);

	// Improved filter change handler with debouncing and stale state prevention
	const handleFiltersChanged = useCallback(() => {
		// Clear any existing timeout
		if (filterUpdateTimeoutRef.current) {
			clearTimeout(filterUpdateTimeoutRef.current);
		}

		// Set new timeout
		filterUpdateTimeoutRef.current = setTimeout(() => {
			setRefreshKey(prev => prev + 1);
			filterUpdateTimeoutRef.current = null;
		}, 100); // Slightly longer debounce for better stability
	}, []);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (filterUpdateTimeoutRef.current) {
				clearTimeout(filterUpdateTimeoutRef.current);
			}
		};
	}, []);

	// Consolidated effect for all filter changes
	useEffect(() => {
		handleFiltersChanged();
	}, [
		taskStatus, 
		status, 
		audit, 
		priority, 
		assignedTo, 
		assignee, 
		tags, 
		fromDate, 
		toDate, 
		handleFiltersChanged
	]);

	// Export functionality
	const handleExportCSV = useCallback(() => {
		const flattenedData = exportData.map((row: any) => ({
			recurring_task_id: row.recurring_task_id || "",
			recurring_tasks: row.recurring_tasks || "",
			frequency: row.frequency || "",
			assigned_to_full_name: row.assigned_to_full_name || "",
			assignee_full_name: row.assignee_full_name || "",
			on_time_percent: row.on_time_percent || 0,
			completion_score: row.completion_score || 0,
			priority: row.priority || "",
			task_status: row.task_status || "",
		}));
		exportToCSV(flattenedData, "recurring_tasks");
	}, [exportData]);

	const handleExportPDF = useCallback(() => {
		const flattenedData = exportData.map((row: any) => ({
			"Task Name": row.recurring_tasks || "",
			"Frequency": row.frequency || "",
			"Assigned To": row.assigned_to_full_name || "",
			"On Time %": `${row.on_time_percent || 0}%`,
			"Completion Score": `${row.completion_score || 0}%`,
			"Priority": row.priority || "",
			"Status": row.task_status || "",
		}));
		exportToPDF(flattenedData, "recurring_tasks");
	}, [exportData]);

	const handleSelectionChanged = useCallback((selectedRows: TaskInsight[]) => {
		const mappedRows = selectedRows.map((row) => ({
			...row,
			name: row.recurring_task_id,
			task_name: row.recurring_tasks,
			task_type: "Recurring",
			task_definition_id: row.recurring_task_id,
		}));
		setSelectedTasks(mappedRows);
	}, []);

	// Improved filters object with better task_status handling
	const filters = useMemo(() => {
		const reportFilters: Record<string, any> = {
			company_id: companyId,
		};

		if (fromDate) {
			reportFilters.from_date = fromDate.toISOString().split("T")[0];
		}
		if (toDate) {
			reportFilters.to_date = toDate.toISOString().split("T")[0];
		}

		if (status && status.trim() !== "") {
			reportFilters.status = status;
		}
		if (audit && audit.trim() !== "") {
			reportFilters.audit_status = audit;
		}

		if (priority && priority.trim() !== "" && priority !== "All") {
			reportFilters.priority = priority;
		}

		if (assignedTo && assignedTo.length > 0) {
			reportFilters.assigned_to = assignedTo.map((user: any) => user.email || user.name);
		}
		if (assignee && assignee.length > 0) {
			reportFilters.assignee = assignee.map((user: any) => user.email || user.name);
		}

		if (tags && tags.length > 0) {
			reportFilters.tags = tags.join(",");
		}

		// Ensure task_status is always an array and handle empty array case
		const taskStatusArray = Array.isArray(taskStatus) ? taskStatus : [taskStatus].filter(Boolean);
		reportFilters.task_status = taskStatusArray.length > 0 ? taskStatusArray : ["Active"];

		console.log("Filter object being sent:", reportFilters); // Debug log

		return reportFilters;
	}, [
		companyId,
		fromDate,
		toDate,
		status,
		audit,
		priority,
		assignedTo,
		assignee,
		tags,
		taskStatus
	]);

	const columnDefs = useMemo(() => [
		{
			fieldname: "recurring_task_id",
			label: "Recurring Task ID",
			fieldtype: "Data",
			hidden: true,
			overrideProps: {
				filter: "agTextColumnFilter",
				width: 400,
				onCellClicked: (params: any) => {
					handleTaskClick(params.data?.recurring_task_id);
				},
			},
		},
		{
			fieldname: "recurring_tasks",
			label: "Recurring Tasks",
			fieldtype: "Data",
			hidden: false,
			overrideProps: {
				filter: "agTextColumnFilter",
				minWidth: 500,
				onCellClicked: (params: any) => {
					handleTaskClick(params.data?.recurring_task_id);
				},
				cellRenderer: (params: any) => (
					<p
						className="truncate text-[14px] text-[#2D2C37] font-[400] cursor-pointer hover:text-[#0076BE]"
						title={params.data?.recurring_tasks}
					>
						{params.data?.recurring_tasks}
					</p>
				),
			},
		},
		{
			fieldname: "frequency",
			label: "Frequency",
			fieldtype: "Data",
			hidden: false,
			overrideProps: {
				filter: "agSetColumnFilter",
				maxWidth: 150,
				minWidth: 150,
				cellRenderer: (params: any) => (
					<span className="text-[14px] text-[#2D2C37] font-[400] pl-2">
						{params.data?.frequency}
					</span>
				),
			},
		},
		{
			fieldname: "assigned_to_full_name",
			label: "Assigned To",
			fieldtype: "Data",
			hidden: false,
			overrideProps: {
				filter: "agTextColumnFilter",
				maxWidth:200,
				cellRenderer: (params: any) => {
					const assignedTo = params.data || {};
					const team_member = {
						first_name: assignedTo.assigned_to_first_name || "",
						user_name: assignedTo.assigned_to_email || "",
						user_image: assignedTo.assigned_to_user_image || null,
						last_name: assignedTo.assigned_to_last_name || "",
					};
					const displayName = `${team_member.first_name} ${team_member.last_name}`.trim();
					return (
						<div className="flex gap-3 items-center py-1">
							<UserAssignees users={[team_member]} className="h-8 w-8" />
							<span className="text-[14px] text-[#2D2C37] font-[400]">
								{displayName || team_member.user_name}
							</span>
						</div>
					);
				},
			},
		},
		{
			fieldname: "on_time_percent",
			label: "On Time %",
			fieldtype: "Percent",
			hidden: false,
			overrideProps: {
				filter: "agNumberColumnFilter",
				maxWidth: 120,
				cellRenderer: (params: any) => {
					const value = typeof params.data?.on_time_percent === "object"
						? params.data.on_time_percent.parsedValue
						: params.data?.on_time_percent;
					return (
						<div className="flex justify-center items-center h-full mr-14">
							<span className="text-[14px] text-[#2D2C37] font-[500]">
								{value !== undefined ? `${Math.round(value)}%` : "0%"}
							</span>
						</div>
					);
				},
			},
		},
		{
			fieldname: "completion_score",
			label: "Completion Score",
			fieldtype: "Percent",
			hidden: false,
			overrideProps: {
				filter: "agNumberColumnFilter",
				minWidth: 150,
				maxWidth:150,
				cellRenderer: (params: any) => {
					const value = typeof params.data?.completion_score === "object"
						? params.data.completion_score.parsedValue
						: params.data?.completion_score;
					return (
						<div className="flex justify-center items-center h-full">
							<span className="text-[14px] text-[#2D2C37] font-[500]">
								{value !== undefined ? `${Math.round(value)}%` : "0%"}
							</span>
						</div>
					);
				},
			},
		},
		{
			fieldname: "priority",
			label: "Priority",
			fieldtype: "Select",
			options: PRIORITY_DATA.map(p => p.name),
			hidden: false,
			overrideProps: {
				filter: "agSetColumnFilter",
				maxWidth: 120,
				cellRenderer: (params: any) => {
					const priority = PRIORITY_DATA.find(p => p.name === params.data?.priority);
					return (
						<div className="flex justify-center items-center h-full">
							{priority ? (
								<img
									src={priority.image}
									alt={priority.name}
									title={priority.name}
								/>
							) : (
								<span className="text-[12px] text-[#2D2C37] text-[400]">-</span>
							)}
						</div>
					);
				},
			},
		},
	], [handleTaskClick]);

	// AG Grid configuration
	const agGridProps: AgGridReactProps = useMemo(() => ({
		suppressRowClickSelection: true,
		animateRows: true,
		pagination: true,
		paginationPageSize: isTableOpen ? 50 : 20,
		paginationPageSizeSelector: [20, 50, 100, 200],
		context: { handleTaskClick },
		rowHeight: 45,
		headerHeight: 45,
	}), [isTableOpen, handleTaskClick]);

	const Filterpart: JSX.Element = (
		<FilterComponent
			status={status}
			setStatus={setStatus}
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
			setFromDate={setFromDate}
			toDate={toDate}
			setToDate={setToDate}
			teamMember={[]}
			setTeamMember={() => { }}
			task={[]}
			setTask={() => { }}
			branch={null}
			setBranch={() => { }}
			dept={null}
			setDept={() => { }}
			selectedTask={""}
			scoreTab={""}
			setScoreTab={() => { }}
			scoreInterval={""}
			setScoreInterval={() => { }}
			FilterName={"Recurring Tasks"}
			excludeCompleted={false}
			setExcludeCompleted={() => { }}
			includeAllWork={false}
			setIncludeAllWork={() => { }}
			taskStatus={taskStatus}
			setTaskStatus={setTaskStatus}
			onFiltersChanged={handleFiltersChanged}
		/>
	);

	return (
		<section className=" h-full mt-[24px] w-full">
			<CommonHeader
				TableName="Recurring Tasks"
				setTableOpen={setTableOpen}
				isTableOpen={isTableOpen}
				FilterPart={Filterpart}
				setSelectedTask={() => { }}
				selectedTask=""
				setViewType={() => { }}
				viewType=""
				handleExportCSV={handleExportCSV}
				handleExportPDF={handleExportPDF}
				setIsOpen={setIsOpen}
				onBranchAdded={() => { }}
				selectedBranch={null}
				isSheetOpen={isSheetOpen}
				setIsSheetOpen={setIsSheetOpen}
				listSize={listSize}
				setListSize={setListSize}
				selected={selectedTasks}
				setSelected={setSelectedTasks}
				modalOpen={modalOpen}
				setModalOpen={setModalOpen}
				setrefreshKey={setRefreshKey}
			/>

			<FrappeReportGrid
				tablname="Recurring Tasks"
				key={`recurring-tasks-${refreshKey}`}
				reportName="Recurring Table Report"
				filters={filters}
				columnDefs={columnDefs}
				companyId={companyId}
				agGridProps={agGridProps}
				onRowClicked={handleTaskClick}
				filterFields={[
					"status",
					"audit_status",
					"priority",
					"assigned_to",
					"assignee",
					"tags",
					"task_status"
				]}
				excludeFields={[
					"assigned_to_user_image",
					"assigned_to_first_name",
					"assigned_to_last_name",
					"assignee_user_image",
					"assignee_first_name",
					"assignee_last_name",
					"assigned_to_email",
					"assignee_email",
				]}
				onDataReady={setExportData}
				showCheckbox={true}
				onSelectionChanged={handleSelectionChanged}
				height="calc(100vh - 280px)"
			/>

			{/* Task Definition Sheet */}
			<Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
				<TaskDefinitionSheet
					taskDefinitionId={selectedTaskDefinitionId}
					isOpen={isSheetOpen}
					setIsOpen={setIsSheetOpen}
					onTaskUpdated={handleTaskUpdated}
				/>
			</Sheet>
		</section>
	);
}
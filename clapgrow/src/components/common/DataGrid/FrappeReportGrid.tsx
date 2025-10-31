import React, {
	useRef,
	useState,
	useCallback,
	useEffect,
} from "react";
import { AgGridReact } from "ag-grid-react";
import { CellStyleModule, ClientSideRowModelModule, ColDef, GetRowIdParams, HighlightChangesModule, ModuleRegistry, NumberFilterModule, PaginationModule, RowSelectionModule, TextFilterModule, themeQuartz } from "ag-grid-community";
import { SideBarModule, RowGroupingModule } from "ag-grid-enterprise";
import { ColumnAutoSizeModule } from "ag-grid-community";
import {
	GridReadyEvent,
	FilterChangedEvent,
} from "ag-grid-community";
import { FilterCount, FilterCountRef } from "./CustomComponent/FilterCount";
import { FrappeReportFilters, useAGGridColumns, useAGGridConfig, useFrappeReport, useReportFilterOptions } from "@/hooks/useFrappeReport";
import { ColumnProps } from "./DataGridComponent";
import { useFrappeGetDoc } from "frappe-react-sdk";

// Register AG Grid modules
ModuleRegistry.registerModules([
	ClientSideRowModelModule,
	SideBarModule,
	ColumnAutoSizeModule,
	RowGroupingModule,
	CellStyleModule,
	NumberFilterModule,
	TextFilterModule,
	HighlightChangesModule,
	RowSelectionModule,
	PaginationModule,
]);

// Types
interface FrappeReportGridProps {
	tablname?: string,
	reportName: string;
	filters?: FrappeReportFilters;
	companyId?: string;
	dept?: string;
	branch?: string;
	scoreRange?: string;
	fromDate?: string;
	toDate?: string;
	lastWeekReport?: boolean;
	status?: string;
	audit?: string;
	priority?: string;
	assignedTo?: string[];
	assignee?: string[];
	tags?: string;
	onRowClicked?: (params: any) => void;
	agGridProps?: any;
	className?: string;
	height?: string;
	filterFields?: string[];
	excludeFields?: string[];
	columnDefs?: ColumnProps[];
	onDataReady?: (data: any[]) => void;
	// columnDefs?: {};
	// caller?: string; // Add caller prop to identify the calling component 
	showCheckbox?: boolean; // New prop to control checkbox visibility
	onSelectionChanged?: (selectedRows: any[]) => void; // New callback for selection
}

interface CGTaskDefinition {
	enabled: number;
	// Add other fields as needed
}

// Component to fetch a single task definition
const TaskDefinitionFetcher: React.FC<{
	taskId: string;
	onDataFetched: (taskId: string, data: CGTaskDefinition) => void;
}> = ({ taskId, onDataFetched }) => {
	const { data } = useFrappeGetDoc<CGTaskDefinition>(
		"CG Task Definition",
		taskId,
		taskId ? undefined : null
	);

	useEffect(() => {
		if (data) {
			onDataFetched(taskId, data);
		}
	}, [data, taskId, onDataFetched]);

	return null; // This component renders nothing
};

const FrappeReportGrid: React.FC<FrappeReportGridProps> = ({
	reportName,
	tablname,
	filters = {},
	companyId,
	dept,
	branch,
	scoreRange,
	fromDate,
	toDate,
	lastWeekReport = false,
	status,
	audit,
	priority,
	assignedTo,
	assignee,
	tags,
	onRowClicked,
	agGridProps = {},
	className = "",
	height = "60vh",
	filterFields = ["department", "branch", "status", "audit_status", "priority", "assigned_to", "assignee", "tags"],
	// excludeFields = ['user_image'],
	excludeFields = [],
	columnDefs,
	onDataReady,
	showCheckbox = false,
	onSelectionChanged,
}) => {
	// Refs and state
	const gridRef = useRef<AgGridReact>(null);
	const filterCountRef = useRef<FilterCountRef>(null);
	const [filterCount, setFilterCount] = useState(0);
	const [selectedRows, setSelectedRows] = useState<any[]>([]);
	const [taskDefinitions, setTaskDefinitions] = useState<{ [key: string]: CGTaskDefinition }>({});


	// Prepare filters with consistent naming
	// const filters:  FrappeReportFilters = {
	// 	company_id: companyId,
	// 	department: dept,
	// 	branch: branch,
	// 	score_range: scoreRange,
	// 	from_date: fromDate,
	// 	to_date: toDate,
	// 	last_week_report: lastWeekReport,
	// };

	// const myTheme = themeQuartz.withParams({
	// 		selectedRowBackgroundColor: "#EFF9FF",
	// 		rowHoverColor: "#F0F1F2",
	// 		rowHeight: 80,
	// 		// columnBorder: {
	// 		// 	width: 1,
	// 		// 	color: "rgba(0, 0, 0, 0.12)",
	// 		// },
	// 		// headerColumnBorder: {
	// 		// 	width: 1,
	// 		// 	color: "rgba(0, 0, 0, 0.12)",
	// 		// }
	// 		columnBorder: false,
	// 	headerColumnBorder: false,
	// 	headerColumnResizeHandleWidth: {
	// 		color: "rgba(0, 0, 0, 0.12)",
	// 	},
	// 		// paginationButtonBorder: {
	// 		// 	height: 1,
	// 		// 	color: "rgba(0, 0, 0, 0.12)",
	// 		// }
	// 	// 	 wrapperBorder: false,
	// 	// headerRowBorder: false,
	
	// 	});

	// Construct filters object, merging individual props with provided filters object
	const combinedFilters: FrappeReportFilters = {
		company_id: companyId || filters.company_id,
		department: dept || filters.department,
		branch: branch || filters.branch,
		score_range: scoreRange || filters.score_range,
		from_date: fromDate || filters.from_date,
		to_date: toDate || filters.to_date,
		last_week_report: lastWeekReport || filters.last_week_report || false,
		status: status || filters.status,
		audit_status: audit || filters.audit_status,
		priority: priority || filters.priority,
		assigned_to: assignedTo || filters.assigned_to,
		assignee: assignee || filters.assignee,
		tags: tags || filters.tags,
		task_status: filters.task_status,
	};

	// Fetch report data using custom hook
	const { columns, result, error, isLoading } = useFrappeReport({
		reportName,
		filters: combinedFilters,
	});

	// Handle task definition data fetching
	const handleDataFetched = useCallback((taskId: string, data: CGTaskDefinition) => {
		setTaskDefinitions((prev) => ({
			...prev,
			[taskId]: data,
		}));
	}, []);

	// Extract unique task IDs
	const taskIds = result && showCheckbox
		? Array.from(new Set(result
			.map((row: any) => row.recurring_task_id)
			.filter((taskId: string | undefined) => taskId && !taskDefinitions[taskId])))
		: [];

	

//   taskIds.forEach((taskId: string) => {
//     console.log("fetching task definition for", taskId);
// },[taskDefinitions]);

//     useEffect(() => {
//       if (data) {
// 		console.log("fetched task definition data", data);
//         setTaskDefinitions((prev) => ({
//           ...prev,
//           [taskId]: data,
//         }));
//       }
//     }, [data, taskId]);
//   });

	// Expose data via callback when it changes
	useEffect(() => {
		if (onDataReady && result) {
			onDataReady(result);
		}
	}, [result, onDataReady]);

	// Extract filter options using custom hook
	const filterOptions = useReportFilterOptions(result, filterFields);

	const checkboxColumn: ColDef = {
		colId: "checkbox",
		headerName: "",
		checkboxSelection: (params) => {
			const taskId = params.data?.recurring_task_id;
			// Checkbox is clickable only if enabled === 1
			return taskDefinitions[taskId]?.enabled === 1;
		},
		headerCheckboxSelection: false,
		suppressMovable: true,
		lockPosition: true,
		lockPinned: true,
		lockVisible: true,
		field: "checkbox",
		filter: false,
		resizable: false,
		cellRenderer: () => null,
		suppressHeaderMenuButton: true,
		editable: false,
		sortable: false,
		maxWidth: 50,
		initialPinned: "left",
	};

	// Use provided columnDefs if available, otherwise generate using hook
	const finalColumnDefs = columnDefs && columnDefs.length > 0
		? columnDefs.map((col) => ({
			...col.overrideProps,
			headerName: col.label,
			field: col.fieldname,
			hide: col.hidden,
			maxWidth: col.overrideProps?.maxWidth, // Explicitly map maxWidth
			minWidth: col.overrideProps?.minWidth, // Explicitly map minWidth
		}))
		: useAGGridColumns(columns, filterOptions, excludeFields);

	if (showCheckbox) {
		finalColumnDefs.unshift(checkboxColumn);
	}

	// Define getRowId to ensure unique row identification
	const getRowId = useCallback((params: GetRowIdParams) => {
		return params.data.recurring_task_id || Object.values(params.data ?? {}).join("_");
	}, []);

	// Get AG Grid configuration using custom hook
	const { defaultColDef, sideBar, gridOptions } = useAGGridConfig();

	// Event handlers
	const updateFilterCount = useCallback((count: number) => {
		setFilterCount(count);
		filterCountRef.current?.updateFilterCount(count);
	}, []);

	const updateActiveFilters = useCallback(() => {
		if (!gridRef.current?.api) return;

		const filterModel = gridRef.current.api.getFilterModel();
		const count = Object.values(filterModel).reduce((acc, filter: any) => {
			if ((filter.filterType === "text" && filter.filter) ||
				(filter.filterType === "set" && filter.values?.length) ||
				(filter.filterType === "number" && (filter.filter !== null && filter.filter !== undefined)) ||
				(filter.filterType === "date" && filter.dateFrom)) {
				return acc + 1;
			}
			return acc;
		}, 0);

		updateFilterCount(count);
	}, [updateFilterCount]);

	const resetFilters = useCallback(() => {
		gridRef.current?.api?.setFilterModel(null);
		updateFilterCount(0);
	}, [updateFilterCount]);

	const onGridReady = useCallback((params: GridReadyEvent) => {
		params.api.sizeColumnsToFit();
		updateActiveFilters();
	}, [updateActiveFilters]);

	const onFilterChanged = useCallback((params: FilterChangedEvent) => {
		updateActiveFilters();
	}, [updateActiveFilters]);

	// Handle row selection
	const handleSelectionChanged = useCallback(() => {
		if (gridRef.current?.api) {
			const selected = gridRef.current.api.getSelectedRows();
			setSelectedRows(selected);
			onSelectionChanged?.(selected);
		}
	}, [onSelectionChanged]);

	// Loading state
	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
				<div className="flex flex-col items-center space-y-2">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<div className="text-gray-600 text-sm">Loading report data...</div>
				</div>
			</div>
		);
	}

	// Error state
	if (error) {
		return (
			<div className="flex items-center justify-center h-64 bg-red-50 rounded-lg border border-red-200">
				<div className="text-center">
					<div className="text-red-600 font-medium mb-1">Error loading report</div>
					<div className="text-red-500 text-sm">Please try again later</div>
				</div>
			</div>
		);
	}

	// No data state
	if (!result?.length) {
		return (
			<div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
				<div className="text-center">
					<div className="text-gray-600 font-medium mb-1">No data available</div>
					<div className="text-gray-500 text-sm">Try adjusting your filters</div>
				</div>
			</div>
		);
	}

	return (
		<div className={`flex flex-col gap-4 w-full ${className}`}>
			{/* Header with filter controls */}
			<div className="flex justify-start items-center space-x-2">
				<FilterCount
					ref={filterCountRef}
					clearFilters={resetFilters}
				/>
			</div>

			{/* Render TaskDefinitionFetcher for each taskId */}
			{taskIds.map((taskId) => (
				<TaskDefinitionFetcher
					key={taskId}
					taskId={taskId}
					onDataFetched={handleDataFetched}
				/>
			))}

			{/* AG Grid */}
			<div
				className="w-full border border-gray-200 rounded-lg overflow-hidden shadow-sm bg-white"
				style={{ height }}
			>
				<AgGridReact
				    // theme={myTheme}
					ref={gridRef}
					columnDefs={finalColumnDefs}
					rowData={result}
					defaultColDef={defaultColDef}
					onRowClicked={onRowClicked}
					onGridReady={onGridReady}
					onFilterChanged={onFilterChanged}
					sideBar={sideBar}
					className="ag-theme-alpine"
					rowSelection={showCheckbox ? "multiple" : undefined}
					onSelectionChanged={showCheckbox ? handleSelectionChanged : undefined}
					getRowId={getRowId}
					suppressRowClickSelection={showCheckbox}
					cellSelection={true}
					statusBar={{
						statusPanels: [
							{
								statusPanel: "agAggregationComponent",
								align: "left",
								statusPanelParams: {
									aggFuncs: ["sum", "avg", "count"],
								},
							},
						],
					}}
					{...gridOptions}
					{...agGridProps}
				/>
			</div>
		</div>
	);
};

export default FrappeReportGrid;
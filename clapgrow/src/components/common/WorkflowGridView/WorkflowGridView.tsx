import { useParams } from "react-router-dom"
import PageNotFound from "../PageNotFound/PageNotFound"
import { Filter, FrappeConfig, FrappeContext, FrappeError, useFrappeGetCall } from "frappe-react-sdk"
import { FullPageLoader } from "../FullPageLoader/FullPageLoader"
import { ErrorBanner } from "@/components/layout/AlertBanner/ErrorBanner"
import { CellStyleModule, ColDef, ColumnApiModule, ColumnVO, CustomFilterModule, GetRowIdFunc, GridReadyEvent, HighlightChangesModule, IServerSideGetRowsParams, ModuleRegistry, NumberFilterModule, PaginationModule, SelectionChangedEvent, SortModelItem, TextFilterModule, themeQuartz } from "ag-grid-community"
import { AgGridReact } from "ag-grid-react"
import { ForwardedRef, forwardRef, useCallback, useContext, useMemo, useRef, useState } from "react"
import { addFilters, checkGroupBy, getOrderBy, getAggregate, getType, getValueFormatter, getFilterParamsFromFieldType, getFilterTypeFromFieldType } from "../DataGrid/utils"
import { ServerSideRowModelApiModule, StatusBarModule, CellSelectionModule, RowGroupingPanelModule, ServerSideRowModelModule, LicenseManager, RowNumbersModule } from "ag-grid-enterprise"
import { getCellRenderer } from "../DataGrid/CellRenderers/CellRenderers"
import { getDoctype } from "../DataGrid/getColumnDefs"
import { LinkFilters, DateFilters, CheckFilters } from "../DataGrid/CustomFilters"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ActionsMenuRef } from "../DataGrid/DataGridComponent"
import React from "react"
import { DeleteLogRow } from "./DeleteLogRow"
import * as XLSX from 'xlsx'
import { flatten } from 'flat';
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { SpinnerLoader } from "../FullPageLoader/SpinnerLoader"

ModuleRegistry.registerModules([
	CellStyleModule,
	NumberFilterModule,
	ServerSideRowModelApiModule,
	ColumnApiModule,
	TextFilterModule,
	HighlightChangesModule,
	StatusBarModule,
	CellSelectionModule,
	PaginationModule,
	RowGroupingPanelModule,
	ServerSideRowModelModule,
	CustomFilterModule,
	RowNumbersModule
]);

LicenseManager.setLicenseKey(
	"Using_this_{AG_Grid}_Enterprise_key_{AG-089484}_in_excess_of_the_licence_granted_is_not_permitted___Please_report_misuse_to_legal@ag-grid.com___For_help_with_changing_this_key_please_contact_info@ag-grid.com___{Clapgrow_Technology_Pvt_Ltd}_is_granted_a_{Single_Application}_Developer_License_for_the_application_{Clapgrow}_only_for_{1}_Front-End_JavaScript_developer___All_Front-End_JavaScript_developers_working_on_{Clapgrow}_need_to_be_licensed___{Clapgrow}_has_not_been_granted_a_Deployment_License_Add-on___This_key_works_with_{AG_Grid}_Enterprise_versions_released_before_{4_July_2026}____[v3]_[01]_MTc4MzExOTYwMDAwMA==34685daf1fe3376f9b97796bb98a21c0",
);

export const WorkflowGridView = () => {

	const { ID } = useParams<{ ID: string }>()


	if (ID) {
		return <WorkflowColDefWith workflow={ID} />
	}

	return <PageNotFound />
}

const WorkflowColDefWith = ({ workflow }: { workflow: string }) => {
	const { data, error, isLoading } = useFrappeGetCall('clapgrow_workflow.clapgrow_workflow.api.workflow_logs.get_aggrid_coldef', {
		workflow_name: workflow,
	}, workflow ? undefined : null, {
		revalidateIfStale: false,
		revalidateOnFocus: false,
		revalidateOnReconnect: false,
	})

	// ref for ag-grid passed to TestGridComponent
	const ref = useRef<AgGridReact>(null);

	// console.log("data", data)

	const firstColDef: ColDef = {
		colId: 'checkbox',
		hide: false,
		checkboxSelection: true,
		suppressMovable: true,
		lockPosition: true,
		lockPinned: true,
		lockVisible: true,
		field: 'checkbox',
		filter: false,
		resizable: false,
		cellRenderer: () => null,
		headerName: '',
		suppressHeaderMenuButton: true,
		editable: false,
		sortable: false,
		maxWidth: 50,
		headerCheckboxSelection: true,
		initialPinned: 'left',
	}

	const colDefs = useMemo(() => {
		if (data && data.message) {
			// return data.message.map((column: any) => getColumnDefs(column, workflow));
			// here we need to keep in mind that columns can have children, so we need to handle that
			return data.message.map((column: any) => {
				const colDef = getColumnDefs(column, workflow);
				if (column.children && column.children.length > 0) {
					// @ts-expect-error 
					colDef.children = column.children.map((child: any) => getColumnDefs(child, workflow));
				}
				return colDef;
			});
		}
		return [];
	}, [data]);

	// add first column definition for checkbox selection
	// TODO: Add Later
	// colDefs.unshift(firstColDef);

	return (
		<div className="h-full flex justify-center overflow-hidden">
			{isLoading && <FullPageLoader />}
			<ErrorBanner error={error} />
			{/* {data && data.message && } */}
			{data && data.message && colDefs.length > 0 && (
				<LogDataGrid
					ref={ref}
					workflow={workflow}
					colDefs={colDefs}
				/>
			)}
		</div>
	)
}

interface GridProps {
	workflow: string;
	colDefs: any;
}


const WorkflowDataGrid = ({ workflow, colDefs }: GridProps, ref: ForwardedRef<AgGridReact>) => {

	const gridRef = useRef<AgGridReact | null>(null);

	/** default column def for grid */
	const defaultColDef = useMemo<ColDef>(() => {
		return {
			flex: 1,
			minWidth: 140,
			sortable: false,
			enableCellChangeFlash: true,
			resizable: true,
			floatingFilter: true,
			// initialHide: true,
			enableValue: true,
			// cellDataType to false for setting filter model sychronously for default filters
			cellDataType: false,
			// allowedAggFuncs: ["sum", "avg"],
			// menuTabs: ['filterMenuTab'],
		};
	}, []);

	const getChildCount = useCallback((data: any) => {
		return data ? data.childCount : undefined;
	}, []);

	/** method to get row id */
	const getRowId = useMemo<GetRowIdFunc>(() => {
		return (params) => {
			return params.data?.clapgrow_customer?.name || JSON.stringify(params.data);
		};
	}, []);

	const downloadFile = (data: any[], fileType: 'CSV' | 'Excel', colDefs: any[]) => {
		if (data.length === 0) return;

		// Flatten each row
		const flatData = data.map(row => flatten(row, { safe: true }));

		const workbook = XLSX.utils.book_new();
		const worksheet = XLSX.utils.json_to_sheet(flatData);
		XLSX.utils.book_append_sheet(workbook, worksheet, 'Export Data');

		const extension = fileType === 'CSV' ? 'csv' : 'xlsx';
		const filename = `${workflow}.${extension}`;

		XLSX.writeFile(workbook, filename, { bookType: fileType === 'CSV' ? 'csv' : 'xlsx' });
	};

	const [file, setFile] = useState<'CSV' | 'Excel'>('CSV')
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<FrappeError | null>(null)

	const fetchExportData = async () => {
		setIsLoading(true)

		const filterModel = gridRef.current?.api.getFilterModel() || {};
		const filters = addFilters(filterModel);
		const count = await getCount(filters);
		call.post("clapgrow_workflow.clapgrow_workflow.api.workflow_logs.get_workflow_logs", {
			workflow_name: workflow,
			filters: filters,
			start: 0,
			page_length: count
		}).then((response) => {
			if (response && response.message) {
				const data = response.message
				downloadFile(data, file, colDefs)
			}
		}).catch((err) => {
			setError(err)
		}).finally(() => {
			setIsLoading(false)
		})
	}


	const onRequestChanged = (
		filterModel: any,
		rowGroupCols: ColumnVO[],
		groupKeys: string[],
		sortModel: SortModelItem[],
		valueCols: ColumnVO[],
	) => {
		// 1. Get parsed filters
		// 2. Check if grouping
		// 3. If grouping, update groupBy and filters

		let filters = addFilters(filterModel);
		let groupBy = checkGroupBy(rowGroupCols, groupKeys, filters);
		let orderBy = getOrderBy(sortModel);
		let aggregate = getAggregate(valueCols);
		return { filters, groupBy, orderBy, aggregate };
	};

	const handleParams = (params: IServerSideGetRowsParams) => {
		// 1. Get visible columns
		// 2. Get parsed filters
		// 3. Check if grouping
		// 4. If grouping, update groupBy and filters
		// 5. Get count if grouping else get data
		const visibleColumns = params.api
			.getAllDisplayedColumns()
			?.map((column) => {
				return column.getColDef().field;
			});

		const {
			startRow,
			filterModel,
			sortModel,
			rowGroupCols,
			groupKeys,
			valueCols,
		} = params.request;

		const { filters, groupBy, orderBy, aggregate } = onRequestChanged(
			filterModel,
			rowGroupCols,
			groupKeys,
			sortModel,
			valueCols,
		);

		// columnAPI is used to get the value columns
		const columnApi = gridRef?.current?.api;

		// if there are more than one aggregate column then remove all except the last one
		if (columnApi && valueCols.length > 1) {
			const previousAggregate = columnApi.getValueColumns();
			const last = previousAggregate?.[previousAggregate.length - 1];
			columnApi.setValueColumns([last]);
		}
		return {
			visibleColumns: visibleColumns?.filter((column) => column !== undefined && column !== ""),
			startRow,
			filters,
			groupBy,
			orderBy,
			aggregate,
		};
	};

	const { call } = useContext(FrappeContext) as FrappeConfig

	const getRowData = async (
		filters: Filter[],
		pageSize: number,
		startRow: number,

	): Promise<any> => {
		// Call the API to get the row data
		const response = await call.post("clapgrow_workflow.clapgrow_workflow.api.workflow_logs.get_workflow_logs", {
			workflow_name: workflow,
			start: startRow,
			page_length: pageSize,
			filters: filters,
		});
		return response?.message ?? [];
	};

	const getCount = async (filters: Filter[]): Promise<number> => {
		// Call the API to get the count
		const response = await call.post("clapgrow_workflow.clapgrow_workflow.api.workflow_logs.get_workflow_log_count", {
			workflow_name: workflow,
			filters: filters,
		});
		return response?.message ?? 0;
	};

	// getRowDataAndCount by combining getCount and getRowData
	const getRowDataAndCount = async (filters: Filter[], pageSize: number, startRow: number): Promise<{
		count: number;
		rowData: any;
	}> => {

		const count = await getCount(filters)
		const rowData = await getRowData(filters, pageSize, startRow)

		return {
			count,
			rowData
		}
	}

	/** methods to call when grid is ready */
	const onGridReady = useCallback(
		(params: GridReadyEvent) => {
			// this event get called when grid is ready
			// when grid is ready we need to set defaultFilters to grid in filterModel

			params.api.setGridOption("serverSideDatasource", {
				getRows: (params) => {
					const {
						filters,
						startRow,
					} = handleParams(params);

					getRowDataAndCount(filters, params.api.paginationGetPageSize(), startRow ?? 0)
						.then(({ count, rowData }) => {
							params.success({
								rowData: rowData ?? [],
								rowCount: count ?? 0,
							});
						}).catch((e) => {
							console.error(e);
							params.fail();
						});
				},
			});

		},
		[workflow, colDefs],
	);

	/** components for filters in datagrid */
	const components = useMemo(() => {
		return {
			linkFilters: LinkFilters,
			dateFilters: DateFilters,
			checkFilters: CheckFilters,
		};
	}, []);

	const sideBar = useMemo(() => {
		return {
			toolPanels: [
				{
					id: "columns",
					labelDefault: "Columns",
					labelKey: "columns",
					iconKey: "columns",
					toolPanel: "agColumnsToolPanel",
					toolPanelParams: {
						suppressRowGroups: true,
						suppressValues: true,
						suppressPivotMode: true,
					},
				},
				{
					id: "filters",
					labelDefault: "Filters",
					labelKey: "filters",
					iconKey: "filter",
					toolPanel: "agFiltersToolPanel",
				},
			],
		};
	}, []);

	const getSelectedRows = useCallback(() => {
		const serverSideSelection = gridRef.current?.api.getServerSideSelectionState()

		if (serverSideSelection) {
			const displayedRowsID: string[] = [];
			const toggledNodes = serverSideSelection?.toggledNodes

			// @ts-ignore
			if (serverSideSelection.selectAll === true) {
				gridRef.current?.api?.forEachNode((node) => {
					displayedRowsID.push(node.id as string);
				});
				if (toggledNodes && toggledNodes.length) {
					// get all the displayed rows ID from the grid and filters out the toggled nodes
					// then get the data from the grid for the remaining rows
					return displayedRowsID.filter((id) => {
						return !toggledNodes.includes(id);
					}).map((id) => {
						return gridRef.current?.api?.getRowNode(id)?.data;
					})

				} else {
					return displayedRowsID.map((id) => {
						return gridRef.current?.api?.getRowNode(id)?.data;
					})

				}
			} else {
				if (toggledNodes && toggledNodes.length) {
					return toggledNodes.map((id) => {
						return gridRef.current?.api?.getRowNode(id as string)?.data;
					})

				} else {
					return []
				}
			}
		} else {
			return []
		}
	}, [])

	const actionsMenuRef = React.useRef<ActionsMenuRef | null>(null);


	const onRowSelectionChanged = useCallback((event: SelectionChangedEvent) => {

		const selectedRows = getSelectedRows()

		const isRowSelected = selectedRows.length > 0

		actionsMenuRef?.current?.updateState(isRowSelected);

	}, [getSelectedRows])

	/** Trigerred when the "Clear all" button is clicked */
	const onRowSelectionCleared = useCallback(() => {
		gridRef.current?.api.deselectAll()

	}, [])

	// Define theme outside the component to avoid re-creation
	const myTheme = themeQuartz.withParams({
		selectedRowBackgroundColor: "rgba(202, 247, 237, 0.15)",
		columnBorder: {
			width: 1,
			color: "rgba(0, 0, 0, 0.12)",
		},
		headerColumnBorder: {
			width: 1,
			color: "rgba(0, 0, 0, 0.12)",
		}
	});
	/** method to refresh the grid */
	const refreshPage = useCallback(() => {
		gridRef?.current?.api?.refreshServerSide({
			purge: false,
		});
	}, []);

	return (
		<Card className="p-4 h-[90vh] w-full overflow-hidden">
			<CardHeader className="flex w-full flex-row justify-between p-2 px-6">
				<CardTitle className="flex w-full pb-2">
					<h1 className="text-2xl font-bold">{workflow}</h1>

				</CardTitle>
				<div className="flex flex-row gap-2">
					<Button size={'icon'} variant="outline" onClick={fetchExportData} className="h-8 w-8" disabled={isLoading}>
						{isLoading ? <SpinnerLoader /> : <Download className="h-6 w-6" />}
					</Button>
					<DeleteLogRow
						ref={actionsMenuRef}
						gridApi={gridRef.current?.api}
						doctype={workflow}
						refreshPage={refreshPage}
						onRowSelectionCleared={onRowSelectionCleared}
						getSelectedRows={getSelectedRows}
					/>
				</div>
			</CardHeader>
			<ErrorBanner error={error} />
			<CardContent className="flex h-[78vh] overflow-hidden">
				<div
					style={{ height: "100%", width: "100%" }}
					className="border w-full border-gray-200 rounded-xl overflow-hidden"
				>
					<AgGridReact
						theme={myTheme}
						ref={(node) => {
							if (ref) {
								if (typeof ref === "function") {
									ref(node);
								} else {
									ref.current = node;
								}
							}
							gridRef.current = node;
						}}
						columnDefs={colDefs}
						pagination={true}
						components={components}
						sideBar={sideBar}
						groupAggFiltering
						rowModelType="serverSide"
						paginationPageSize={20}
						paginationPageSizeSelector={[20, 50, 250, 500, 2500]}
						cacheBlockSize={20}
						defaultColDef={defaultColDef}
						animateRows={true}
						onSelectionChanged={onRowSelectionChanged}
						getChildCount={getChildCount}
						onGridReady={onGridReady}
						getRowId={getRowId}
						cellSelection={true}
						suppressAggFilteredOnly
						headerHeight={40}
						rowHeight={48}
						rowNumbers={true}
						rowSelection="multiple"
					/>
				</div>
			</CardContent>
		</Card>
	);

}

export const getColumnDefs = (
	column: any,
	doctype?: string,
): ColDef => {
	return {
		colId: column.colIs,
		field: column.field,
		headerName: column.headerName,
		filter: column.filter === false ? false : getFilterTypeFromFieldType(
			column.fieldtype ?? "Data"),
		filterParams: {
			...getFilterParamsFromFieldType(
				(column.fieldtype ?? "Data"),
				column.fieldname,
				typeof column.options === "string" ? column.options : undefined,
				column.type === "Select" || column.fieldtype === "Select"
					? (column.options as string[])
					: undefined,
			),
			...column.filterParams,
		},
		type: getType(column.type ?? column.fieldtype ?? "Data"),
		valueFormatter: getValueFormatter(
			column.type ?? column.fieldtype ?? "Data",
			undefined,
			true
		),
		cellRenderer: getCellRenderer(
			column.fieldtype ?? "Data",
		),
		cellRendererParams: {
			disabled: column.fieldtype === "Check" ? true : false,
			doctype:
				column.fieldtype === "Link"
					? getDoctype(column.options as string, doctype ?? "")
					: doctype,
			cellType: column.type ? column.type : (column.fieldtype ?? "Data"),
			...column.cellRendererParams,
			...column,
		},
		minWidth: column.fieldtype === "timeago" ? 200 : 140,
		headerStyle: column.headerStyle,
		...column.overrideProps,
	} as ColDef;
};

const LogDataGrid = forwardRef(WorkflowDataGrid)
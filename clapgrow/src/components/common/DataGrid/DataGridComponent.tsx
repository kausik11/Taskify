import { AgGridReact, AgGridReactProps } from "ag-grid-react";
import "ag-grid-enterprise";
import {
	ForwardedRef,
	ReactNode,
	forwardRef,
	useCallback,
	useEffect,
	useMemo,
	useRef,
} from "react";
import { Filter, useFrappeDocTypeEventListener } from "frappe-react-sdk";
import {
	ColDef,
	ColumnState,
	ColumnVO,
	ColumnVisibleEvent,
	CustomFilterModule,
	GetRowIdFunc,
	GetRowIdParams,
	GridApi,
	GridReadyEvent,
	IServerSideGetRowsParams,
	RowApiModule,
	SelectionChangedEvent,
	SortModelItem,
	themeQuartz,
} from "ag-grid-community";
import { addFilters, checkGroupBy, clearSelectedRowFromSessionStorage, getAggregate, getOrderBy, setSelectedRowToSessionStorage } from "./utils";
import { LinkFilters, DateFilters, CheckFilters } from "./CustomFilters";
import { getColumnDefs, getModifiedColDefs } from "./getColumnDefs";
import { DoctypeProps, aggregateProps } from "./DataGridWithMeta";
import React from "react";
import {
	ChildTableFilterCount,
	ChildTableFilterCountRef,
} from "./CustomComponent/ChildTableFilterCount";
import { FilterCount, FilterCountRef } from "./CustomComponent/FilterCount";
import { NavigateOptions, URLSearchParamsInit } from "react-router-dom";
import { ModuleRegistry } from "ag-grid-community";
import {
	CellSelectionModule,
	LicenseManager,
	ServerSideRowModelModule,
} from "ag-grid-enterprise";
import { RowGroupingPanelModule } from "ag-grid-enterprise";
import { PaginationModule } from "ag-grid-community";
import { StatusBarModule } from "ag-grid-enterprise";
import { HighlightChangesModule } from "ag-grid-community";
import { TextFilterModule } from "ag-grid-community";
import { ColumnApiModule } from "ag-grid-community";
import { ServerSideRowModelApiModule } from "ag-grid-enterprise";
import { NumberFilterModule } from "ag-grid-community";
import { CellStyleModule } from "ag-grid-community";
import { useGetRouting } from "@/hooks/useGetRouting";

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
	RowApiModule
]);

LicenseManager.setLicenseKey(
	"Using_this_{AG_Grid}_Enterprise_key_{AG-089484}_in_excess_of_the_licence_granted_is_not_permitted___Please_report_misuse_to_legal@ag-grid.com___For_help_with_changing_this_key_please_contact_info@ag-grid.com___{Clapgrow_Technology_Pvt_Ltd}_is_granted_a_{Single_Application}_Developer_License_for_the_application_{Clapgrow}_only_for_{1}_Front-End_JavaScript_developer___All_Front-End_JavaScript_developers_working_on_{Clapgrow}_need_to_be_licensed___{Clapgrow}_has_not_been_granted_a_Deployment_License_Add-on___This_key_works_with_{AG_Grid}_Enterprise_versions_released_before_{4_July_2026}____[v3]_[01]_MTc4MzExOTYwMDAwMA==34685daf1fe3376f9b97796bb98a21c0",
);

export interface ColumnProps {
	/** fieldname of column */
	fieldname?: string;
	/** fieldtype of column */
	fieldtype?: string;
	/** label of column */
	label?: string;
	/** type of column eg:user-avatar, tag, assignment */
	type?:
	| "Int"
	| "Float"
	| "Currency"
	| "Date"
	| "Time"
	| "Data"
	| "HTML"
	| "Check"
	| "Image"
	| "Link"
	| "Dynamic Link"
	| "URL"
	| "Datetime"
	| "timeago"
	| "Email"
	| "Phone"
	| "badge"
	| "tag"
	| "user-avatar"
	| "assignment"
	| "docstatus"
	| "custom"
	| "custom-link"
	| "Select"
	| "Percent"
	| "user-tag";
	/** color scheme for badge or tag */
	colorMaps?: Record<string, string>;
	/** options for column */
	options?: string | string[];
	/** hide column */
	hidden?: boolean;
	/** filter params for column */
	filterParams?: any;
	/** cell renderer style props, this props will be passed to cell renderer and can be used to style custom cell renderer */
	cellRendererComponentProps?: any;
	/** cell renderer params, this props for override cell renderer params
	 * @example if fieldtype is link you can pass doctype in cellRendererParams doctype: 'User'
	 * @example if fieldtype is user-avatar you can pass image field name in cellRendererParams image: 'image'
	 * cellRendererParams:{
	 *      doctype: 'User',
	 *      image: 'image'
	 * }
	 */
	cellRendererParams?: any;
	/** override props for column */
	overrideProps?: Partial<Omit<ColDef, "field" | "headerName">>;
}

export interface TableGridProps {
	/** columns for ag-grid */
	columns: ColumnProps[];
	/** doctype for which grid is created */
	doctype: string;
	/** mandatory filters for grid which are not visible to user */
	mandatoryFilters?: Filter[];
	/** method to set table state in local storage */
	setTableState?: (columnState: ColumnState[], filterModel: any) => void;
	/** method to get table state from local storage */
	getTableState?: (params: GridReadyEvent | AgGridReact) => {
		columnState: ColumnState[];
		filterModel: any;
	};
	/** other fields which are not visible in grid as separate column but required to fetch */
	otherFields?: string[];
	/** box props for grid */
	children?: ReactNode;
	/** method to get Row Data and Count */
	getRowDataAndCount: (
		filters: Filter[],
		groupBy: string | undefined,
		pageSize: number,
		startRow: number,
		otherFields: string[],
		visibleColumns: (string | undefined)[],
		orderBy: string,
		aggregate: aggregateProps,
		childTableFilters?: any,
	) => Promise<{
		count?: number;
		rowData: any;
	}>;
	/** left child for grid */
	leftChild?: (props: DoctypeProps) => JSX.Element;
	/** right child for grid */
	rightChild?: (props: DoctypeProps) => JSX.Element | null;
	agGridProps?: AgGridReactProps;
	customComponents?: (props: AgGridActionProps) => ReactNode,
	/** method to get Selected Rows */
	onRowSelectionChanged?: (indexes: any[]) => void,
	customComponentChildren?: ReactNode
	showModifiedColumn?: boolean;
	showCheckboxColumn?: boolean;
}

export interface AgGridActionProps {
	gridApi: GridApi<any> | undefined
	doctype: string
	refreshPage: () => void
	onRowSelectionCleared: () => void
	getSelectedRows: () => any[]
	children?: ReactNode
}

export interface ActionsMenuRef {
	updateState: (value: boolean) => void
}


export const DataGridComponent = (
	{
		columns,
		doctype,
		mandatoryFilters,
		setTableState,
		getTableState,
		otherFields = [],
		getRowDataAndCount,
		children,
		leftChild,
		rightChild,
		agGridProps,
		customComponents,
		onRowSelectionChanged: onRowSelectionChangedCallback,
		customComponentChildren,
		showModifiedColumn = true,
		showCheckboxColumn = true
	}: TableGridProps,
	ref: ForwardedRef<AgGridReact>,
) => {
	const gridRef = useRef<AgGridReact | null>(null);

	// Define theme outside the component to avoid re-creation
	const myTheme = themeQuartz.withParams({
		selectedRowBackgroundColor: "#EFF9FF",
		rowHoverColor: "#F0F1F2",
		rowHeight: 80,
		// columnBorder: {
		// 	width: 1,
		// 	color: "rgba(0, 0, 0, 0.12)",
		// },
		// headerColumnBorder: {
		// 	width: 1,
		// 	color: "rgba(0, 0, 0, 0.12)",
		// }
		columnBorder: false,
	headerColumnBorder: false,
	headerColumnResizeHandleWidth: {
		color: "rgba(0, 0, 0, 0.12)",
	},
		// paginationButtonBorder: {
		// 	height: 1,
		// 	color: "rgba(0, 0, 0, 0.12)",
		// }
	// 	 wrapperBorder: false,
    // headerRowBorder: false,

	});

	/** components for filters in datagrid */
	const components = useMemo(() => {
		return {
			linkFilters: LinkFilters,
			dateFilters: DateFilters,
			checkFilters: CheckFilters,
		};
	}, []);

	/** method to refresh the grid */
	const refreshPage = useCallback(() => {
		gridRef?.current?.api?.refreshServerSide({
			purge: false,
		});
	}, []);

	useFrappeDocTypeEventListener(doctype, () => {
		refreshPage();
	});

	const { navigateToRecord } = useGetRouting();

	const navigateToDoc = useCallback(
		(
			doctype: string,
			docname?: string,
			title?: string,
			options?: NavigateOptions,
			sendSearchParamsInLocationState?: boolean,
			searchParams?: URLSearchParamsInit,
			autoFillFields?: any,
		) => {
			navigateToRecord(doctype as never, docname ?? "", title, {
				...options,
				state: {
					title: title,
					doctype: doctype,
					sendSearchParamsInLocationState: sendSearchParamsInLocationState,
					searchParams: searchParams,
					autoFillFields: autoFillFields,
				},
			});
		},
		[navigateToRecord],
	);

	/** columnDefs for grid */
	const colDefs: ColDef[] = useMemo(() => {
		// 1. Get visible columns
		// 2. get mandatory columns
		// 3. check if like field is visible
		// 4. if like field is visible then add starCell to columns

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
			cellClass: 'checkbox-cell',
	headerClass: 'checkbox-header',
			// columnBorder: { style: 'dashed', color: '#9696C8' },
		}
		

		const cols: ColDef[] = columns.map((column) => {
			return getColumnDefs(column, navigateToDoc, doctype);
		});

		// console.log("cols",cols)
		if (showModifiedColumn) {

			cols.push(getModifiedColDefs());
		}

		// if first column is not present then add it
		// if (!cols.some((col) => col.colId === 'checkbox')) {
		// 	cols.unshift(firstColDef);
		// }

		// Conditionally include the checkbox column based on showCheckboxColumn
    if (showCheckboxColumn && !cols.some((col) => col.colId === 'checkbox')) {
      cols.unshift(firstColDef);
    }
		return cols;
	}, [columns, doctype, getColumnDefs, navigateToDoc, getModifiedColDefs,showCheckboxColumn, showModifiedColumn]);

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
			visibleColumns: visibleColumns?.filter((column) => column !== undefined && column !== 'checkbox'),
			startRow,
			filters,
			groupBy,
			orderBy,
			aggregate,
		};
	};

	const filterCountRef = React.useRef<FilterCountRef | null>(null);

	const childTableFilterCountRef =
		React.useRef<ChildTableFilterCountRef | null>(null);

	/**
   * method to set table state in local storage
   * @param event
   * @returns void
   */
	const onGridStateChanged = useCallback(
		(event: any) => {
			const eventTypes = [
				"columnPinned",
				"columnMoved",
				"columnGroupOpened",
				"columnResized",
				"filterChanged",
				"columnVisible",
				"sortChanged",
				"columnRowGroupChanged",
			];
			if (event.finished || eventTypes.includes(event.type)) {
				const columnState = gridRef?.current?.api?.getColumnState() ?? [];

				// loop over visible columns and add index according to their position in columnState column

				gridRef?.current?.api
					?.getAllDisplayedColumns()
					?.forEach((column, index) => {
						const colDef = column.getColDef();
						if (colDef.field) {
							const colState = columnState.find(
								(col) => col.colId === colDef.field,
							);
							if (colState) {
								// @ts-ignore
								colState.index = index;
							}
						}
					});

				const filterModel = gridRef?.current?.api?.getFilterModel();

				if (filterModel) {
					const filterCount = Object.keys(filterModel).length;
					filterCountRef.current?.updateFilterCount(filterCount);
				}

				setTableState && setTableState(columnState, filterModel);
			}
		},
		[setTableState],
	);

	/**
   * function to clear filters
   */

	const clearFilters = useCallback(() => {
		gridRef?.current?.api?.setFilterModel(null);
	}, []);

	/** methods to call when grid is ready */
	const onGridReady = useCallback(
		(params: GridReadyEvent) => {
			// this event get called when grid is ready
			// when grid is ready we need to set defaultFilters to grid in filterModel

			// get table state from local storage
			if (getTableState) {
				const { columnState, filterModel } = getTableState(params);

				if (columnState.length) {
					params.api.applyColumnState({
						state: columnState,
						applyOrder: true,
						// applyOrder: true,
						defaultState: { sort: null },
					});
				}

				if (Object.keys(filterModel).length) {
					params.api.setFilterModel(filterModel);
				}
			}

			params.api.setGridOption("serverSideDatasource", {
				getRows: (params) => {
					const {
						filters,
						groupBy,
						orderBy,
						aggregate,
						visibleColumns,
						startRow,
					} = handleParams(params);

					const childTableFilters = JSON.parse(
						window.sessionStorage.getItem(`${doctype}-child-table-filters`) ??
						"[]",
					);

					getRowDataAndCount(
						filters,
						groupBy,
						params.api.paginationGetPageSize(),
						startRow ?? 0,
						otherFields,
						visibleColumns,
						orderBy,
						aggregate,
						childTableFilters,
					)
						.then(({ count, rowData }) => {
							childTableFilterCountRef.current?.updateFilterCount(
								childTableFilters,
							);
							params.success({
								rowData,
								rowCount: groupBy ? undefined : count,
							});
						})
						.catch((e) => {
							console.error(e);
							params.fail();
						});
				},
			});
		},
		[
			doctype,
			mandatoryFilters,
			otherFields,
			getTableState,
			getRowDataAndCount,
			setTableState,
		],
	);

	/** default column def for grid */
	const defaultColDef = useMemo<ColDef>(() => {
		return {
			flex: 1,
			minWidth: 140,
			sortable: true,
			enableCellChangeFlash: true,
			resizable: true,
			// Disable floating filters to avoid an extra row under headers.
			// Users can open the standard column menu/filter via the header icon.
			floatingFilter: false,
			initialHide: true,
			enableValue: true,
			// cellDataType to false for setting filter model sychronously for default filters
			cellDataType: false,
			allowedAggFuncs: ["sum", "avg"],
			// menuTabs: ['filterMenuTab'],
		// 	cellStyle: { 
		// 	textAlign: 'left',
		// 	display: 'flex',
		// 	alignItems: 'left',
		// 	justifyContent: 'left'
		// },
		// headerClass: 'center-header',
		};
	}, []);


	/** default auto group column def for grid */
	const autoGroupColumnDef = useMemo<ColDef>(() => {
		return {
			minWidth: 200,
		};
	}, []);

	/** method to refresh the grid when column visibility is changed to true for any column */
	const onColumnVisible = useCallback(
		(event: ColumnVisibleEvent) => {
			// this event get called when column visibility is changed
			// we need to refresh the grid when column visibility is changed to true for any column
			let shouldRefresh = false;
			event.columns?.forEach((column) => {
				const visible = column.isVisible();
				if (visible) {
					shouldRefresh = true;
				}
			});
			if (shouldRefresh) {
				gridRef?.current?.api?.refreshServerSide();
			}

			onGridStateChanged(event);
		},
		[onGridStateChanged],
	);

	/** method to get row id */
	const getRowId = useMemo<GetRowIdFunc>(() => {
		return (params: GetRowIdParams) => {
			return Object.values(params.data ?? {}).join("_");
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

	const getChildCount = useCallback((data: any) => {
		return data ? data.childCount : undefined;
	}, []);

	useEffect(() => {
		if (gridRef?.current && getTableState) {
			const { columnState } = getTableState(gridRef.current);
			if (columnState.length) {
				// set columnState and filterModel to grid
				gridRef.current.api?.applyColumnState({
					state: columnState,
					applyOrder: true,
					// applyOrder: true,
					defaultState: { sort: null },
				});
			}
		}
	});

	const refreshGrid = useCallback(() => {
		gridRef?.current?.api?.refreshServerSide({
			purge: false,
		});
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

		if (selectedRows.length > 0) {
			setSelectedRowToSessionStorage(doctype, selectedRows)
		} else {
			clearSelectedRowFromSessionStorage(doctype)
		}

		actionsMenuRef?.current?.updateState(isRowSelected);

	}, [getSelectedRows])

	/** Trigerred when the "Clear all" button is clicked */
	const onRowSelectionCleared = useCallback(() => {
		gridRef.current?.api.deselectAll()
		onRowSelectionChangedCallback?.([])
	}, [onRowSelectionChangedCallback])

	return (
		<div className="h-full w-full flex flex-col gap-1 py-2 px-1 overflow-hidden">
			<div className="flex items-center justify-between w-full">
				<div>
					{leftChild &&
						React.createElement(leftChild, {
							doctype: doctype,
						} as DoctypeProps)}
				</div>
				<div className="flex items-center gap-2">
					<FilterCount ref={filterCountRef} clearFilters={clearFilters} />
					<ChildTableFilterCount
						ref={childTableFilterCountRef}
						refreshGrid={refreshGrid}
						doctype={doctype}
					/>
					{customComponents && React.createElement(customComponents, { ref: actionsMenuRef, gridApi: gridRef?.current?.api, onRowSelectionCleared: onRowSelectionCleared, getSelectedRows: getSelectedRows, doctype: doctype, refreshPage: refreshPage, children: customComponentChildren } as AgGridActionProps)}

					{rightChild &&
						React.createElement(rightChild, {
							doctype: doctype,
						} as DoctypeProps)}
					{children}
				</div>
			</div>
			<div
				style={{ height: "100%", width: "100%" }}
				className="border w-full border-gray-200 rounded-md overflow-hidden"
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
					components={components}
					columnDefs={colDefs}
					pagination={true}
					groupAggFiltering
					rowModelType="serverSide"
					paginationPageSize={20}
					// paginationPageSize={500}
					// paginationPageSizeSelector={[20, 50, 250, 500, 2500]}
					// suppressPaginationPanel={true}
					// suppressScrollOnNewData={true}
					paginationPageSizeSelector={[20, 50, 250, 500, 2500]}
					cacheBlockSize={20}
					onColumnVisible={onColumnVisible}
					autoGroupColumnDef={autoGroupColumnDef}
					defaultColDef={defaultColDef}
					animateRows={true}
					getChildCount={getChildCount}
					onColumnPinned={onGridStateChanged}
					onColumnMoved={onGridStateChanged}
					onColumnGroupOpened={onGridStateChanged}
					onColumnResized={onGridStateChanged}
					onFilterChanged={onGridStateChanged}
					onDisplayedColumnsChanged={onGridStateChanged}
					onColumnRowGroupChanged={onGridStateChanged}
					onGridReady={onGridReady}
					sideBar={sideBar}
					getRowId={getRowId}
					onSelectionChanged={onRowSelectionChanged}
					onSortChanged={onGridStateChanged}
					cellSelection={true}
					rowGroupPanelShow={"always"}
					rowSelection="multiple"
					suppressRowClickSelection
					suppressAggFilteredOnly
					headerHeight={39}
					rowHeight={45}
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
					 suppressPaginationPanel={false} // Keep pagination but make it compact
  paginationAutoPageSize={false}
					{...agGridProps}
				/>
			</div>
		</div>
	);
};

export const DataGrid = forwardRef(DataGridComponent);

import { AgGridReact, AgGridReactProps } from "ag-grid-react";
import "ag-grid-enterprise";
import { ReactNode, useCallback, useRef } from "react";
import { DataGrid, ColumnProps, AgGridActionProps } from "./DataGridComponent";
import { ColumnState, GridReadyEvent, IAggFunc } from "ag-grid-community";
import {
	createFilterStateFromFilterModel,
	getFilterModel,
	getTableLayoutAndState,
} from "./utils";
import { Filter } from "frappe-react-sdk";
import { DoctypeProps, aggregateProps } from "./DataGridWithMeta";

export interface DataGridStateManagerProps {
	/**doctype name */
	doctype: string;
	/**default filters */
	defaultFilters?: Filter[];
	/**columns */
	columns: ColumnProps[];
	/**mandatory filters */
	mandatoryFilters?: Filter[];
	otherFields?: string[];
	/**menu action button */
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
	/**left child */
	leftChild?: (props: DoctypeProps) => JSX.Element;
	/**right child */
	rightChild?: (props: DoctypeProps) => JSX.Element | null;
	/**save load layout boolean */
	saveLoadLayout?: boolean;
	/**ag grid props */
	agGridProps?: AgGridReactProps;
	/**box props */
	/**custom components */
	customComponents?: (props: AgGridActionProps) => ReactNode
	customComponentChildren?: ReactNode,
	showModifiedColumn?: boolean;
	showCheckboxColumn?: boolean;
}

export const DataGridStateManager = ({
	doctype,
	defaultFilters,
	columns,
	mandatoryFilters = [],
	getRowDataAndCount,
	otherFields,
	leftChild,
	rightChild,
	saveLoadLayout = true,
	agGridProps,
	customComponents,
	customComponentChildren,
	showModifiedColumn,
	showCheckboxColumn
}: DataGridStateManagerProps) => {
	// ref for ag-grid passed to TestGridComponent
	const ref = useRef<AgGridReact>(null);

	/**
   *  method to set table state in local storage
   * @param columnState
   * @param filterModel
   * @returns void
   * sets the column state in local storage and filterModel in session storage
   */
	const setTableState = useCallback(
		(columnState: ColumnState[], filterModel: any) => {
			// step 1 : get column state and filter model
			// step 2 : parse column state and filter model to get required data and set sortModel, groupState, aggregate
			// step 3 : set column state, sortModel, filterModel, groupState, aggregate in local storage and session storage if column state is not empty

			const sortModel: { colId: string; sort: string; sortIndex: number }[] =
				[];

			const groupState: { colId: string; rowGroupIndex: number }[] = [];

			const aggregate: {
				colId: string;
				aggFunc: string | IAggFunc<any, any>;
			}[] = [];

			const filters: Filter[] = [];

			Object.keys(filterModel).forEach((key) => {
				const find =
					columns.find((col) => col.fieldname === key) ||
					key === "_liked_by" ||
					key === "_assign" ||
					key === "modified" ||
					key === "docstatus" ||
					key === "title";
				if (find) {
					const filter: Filter = createFilterStateFromFilterModel(
						key,
						filterModel,
					);
					filters.push(filter);
				}
			});

			columnState?.forEach((column) => {
				if (column.sort) {
					sortModel.push({
						colId: column.colId,
						sort: column.sort,
						sortIndex: column.sortIndex ?? 0,
					});
				}
				if (column.rowGroup) {
					groupState.push({
						colId: column.colId,
						rowGroupIndex: column.rowGroupIndex ?? 0,
					});
				}
				if (column.aggFunc) {
					aggregate.push({
						colId: column.colId,
						aggFunc: column.aggFunc,
					});
				}
			});

			if (columnState) {
				const localTableState = {
					column_state: columnState,
					sort_model: sortModel,
				};
				const sessionTableState = {
					filters: filters,
					group_state: groupState,
					aggregate: groupState.length ? aggregate : [],
				};
				window.localStorage.setItem(
					`${doctype}-layout`,
					JSON.stringify(localTableState),
				);
				window.sessionStorage.setItem(
					`${doctype}-state`,
					JSON.stringify(sessionTableState),
				);
			}
		},
		[doctype],
	);

	/**
   * method to get table state from local storage
   * @returns { columnState: ColumnState[], filterModel: any }
   */
	const getTableState = useCallback(
		(params: GridReadyEvent | AgGridReact) => {
			// step 1 : get column state and filter model from local storage
			// step 2 : parse column state and filter model to get required data and set sortModel, groupState, aggregate
			// step 3 : return column state, sortModel, filterModel, groupState, aggregate if column state is not empty else return columns and empty filterModel

			if (ref.current) {
				const {
					localColumnState,
					localSortModel,
					sessionAggregate,
					sessionFilters,
					sessionGroupState,
				} = getTableLayoutAndState(doctype);

				let columnState: ColumnState[] = localColumnState;
				let sortModel = localSortModel;
				let filters = sessionFilters;
				let groupState = sessionGroupState;
				let aggregate = sessionAggregate;

				columnState = columnState
					.filter((column: ColumnState) => {
						const find =
							columns.find(
								(col) =>
									col.fieldname === column.colId || col.label === column.colId,
							) ||
							column.colId === "_liked_by" ||
							column.colId === "_assign" ||
							column.colId === "modified" ||
							column.colId === "docstatus" ||
							column.colId === "title";
						if (find) {
							return true;
						}
						return false;
					})
					.map((column: ColumnState) => {
						return {
							...column,
							aggFunc: groupState.length
								? aggregate.find((agg: any) => agg.colId === column.colId)
									?.aggFunc
								: null,
							sort: sortModel.find((sort: any) => sort.colId === column.colId)
								?.sort,
							sortIndex: sortModel.find(
								(sort: any) => sort.colId === column.colId,
							)?.sortIndex,
							rowGroup: groupState.find(
								(group: any) => group.colId === column.colId,
							)
								? true
								: false,
							hide: groupState.length
								? groupState.find((group: any) => group.colId === column.colId)
									? true
									: false
								: column.hide,
							rowGroupIndex: groupState.find(
								(group: any) => group.colId === column.colId,
							)?.rowGroupIndex,
						};
					});

				if (defaultFilters?.length) {
					let filterModels = {};
					defaultFilters.forEach((filter: Filter) => {
						const find =
							columns.find((col) => col.fieldname === filter[0]) ||
							filter[0] === "_liked_by";
						if (find) {
							const colDef = params?.api?.getColumn(filter[0]);
							if (colDef) {
								const filterModel = getFilterModel(
									filter,
									colDef.getUserProvidedColDef()?.filter,
								);
								filterModels = {
									...filterModels,
									...filterModel,
								};
							}
						}
					});
					const sessionState = {
						filters: defaultFilters,
						group_state: [],
						aggregate: [],
					};
					window.sessionStorage.setItem(
						`${doctype}-state`,
						JSON.stringify(sessionState),
					);
					return {
						columnState: columnState.length
							? columnState
							: (columns.map((column) => {
								return {
									colId: column.fieldname,
									...column,
								};
							}) as ColumnState[]),
						filterModel: filterModels,
					};
				} else {
					let filterModels = {};
					filters.forEach((filter: Filter) => {
						const find =
							columns.findIndex((col) => col.fieldname === filter[0]) > -1 ||
							filter[0] === "_liked_by" ||
							filter[0] === "_assign" ||
							filter[0] === "modified" ||
							filter[0] === "docstatus" ||
							filter[0] === "title";
						if (find) {
							// check if that column hide property is true if true then make it false
							const colDef = params?.api?.getColumn(filter[0]);
							if (colDef) {
								const filterModel = getFilterModel(
									filter,
									colDef.getUserProvidedColDef()?.filter,
								);
								filterModels = {
									...filterModels,
									...filterModel,
								};
								// get find column from columns
								const findColumn = columnState.find(
									(column) => column.colId === filter[0],
								);
								const findColumnIndex = columnState.findIndex(
									(column) => column.colId === filter[0],
								);
								if (findColumn?.hide) {
									findColumn.hide = false;
									columnState[findColumnIndex] = findColumn;
								}
							}
						}
					});

					return {
						columnState: columnState.length ? columnState : [],
						// filterModel: filterModels ? Object.assign({}, ...filterModels) : {}
						filterModel: filterModels,
					};
				}
			}

			return {
				columnState: [] as ColumnState[],
				filterModel: {},
			};
		},
		[doctype],
	);

	return (
		<DataGrid
			ref={ref}
			columns={columns}
			doctype={doctype}
			setTableState={saveLoadLayout ? setTableState : undefined}
			getTableState={saveLoadLayout ? getTableState : undefined}
			otherFields={otherFields}
			mandatoryFilters={mandatoryFilters}
			getRowDataAndCount={getRowDataAndCount}
			leftChild={leftChild}
			rightChild={rightChild}
			agGridProps={agGridProps}
			customComponentChildren={customComponentChildren}
			customComponents={customComponents}
			showModifiedColumn={showModifiedColumn}
			showCheckboxColumn={showCheckboxColumn}
		>
			{/* {customComponents} */}
		</DataGrid>
	);
};

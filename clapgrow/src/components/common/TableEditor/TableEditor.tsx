import {
	ForwardedRef,
	ReactNode,
	createElement,
	forwardRef,
	useCallback,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	ArrayPath,
	FieldArray,
	FieldErrors,
	FieldValues,
	Path,
	useFieldArray,
	useFormContext,
	useWatch,
} from "react-hook-form";
import { AgGridReact } from "ag-grid-react";
import {
	CellEditRequestEvent,
	CellStyleModule,
	CheckboxEditorModule,
	ColDef,
	ColumnApiModule,
	CustomEditorModule,
	CustomFilterModule,
	GetRowIdFunc,
	GridApi,
	HighlightChangesModule,
	ICellRendererParams,
	ModuleRegistry,
	NumberEditorModule,
	NumberFilterModule,
	PaginationModule,
	RowApiModule,
	RowDragEvent,
	RowDragModule,
	RowSelectionModule,
	SelectionChangedEvent,
	TextEditorModule,
	TextFilterModule,
} from "ag-grid-community";
import { useHotkeys } from "react-hotkeys-hook";
import { MdCancel, MdInfoOutline } from "react-icons/md";
import { makeid } from "@/hooks/useCopyDocument";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	ServerSideRowModelApiModule,
	StatusBarModule,
	CellSelectionModule,
	RowGroupingPanelModule,
	ServerSideRowModelModule,
	LicenseManager,
	RichSelectModule,
} from "ag-grid-enterprise";

ModuleRegistry.registerModules([
	CellStyleModule,
	RowSelectionModule,
	RowApiModule,
	RowDragModule,
	CustomEditorModule,
	NumberEditorModule,
	CheckboxEditorModule,
	TextEditorModule,
	RichSelectModule,
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
]);

LicenseManager.setLicenseKey(
	"Using_this_{AG_Grid}_Enterprise_key_{AG-089484}_in_excess_of_the_licence_granted_is_not_permitted___Please_report_misuse_to_legal@ag-grid.com___For_help_with_changing_this_key_please_contact_info@ag-grid.com___{Clapgrow_Technology_Pvt_Ltd}_is_granted_a_{Single_Application}_Developer_License_for_the_application_{Clapgrow}_only_for_{1}_Front-End_JavaScript_developer___All_Front-End_JavaScript_developers_working_on_{Clapgrow}_need_to_be_licensed___{Clapgrow}_has_not_been_granted_a_Deployment_License_Add-on___This_key_works_with_{AG_Grid}_Enterprise_versions_released_before_{4_July_2026}____[v3]_[01]_MTc4MzExOTYwMDAwMA==34685daf1fe3376f9b97796bb98a21c0",
);

export interface CustomComponentRef {
  /** Update the state of the component */
  updateState: (value: boolean) => void;
}

export interface AgGridCustomComponentsProps {
  /** Reference to the custom component */
  gridApi: GridApi<any> | undefined;
  /** Children of the component */
  children?: ReactNode;
  customComponentProps?: {
    doctype: string;
    docname: string;
    refreshPage: () => void;
    callback: (params?: any) => ReturnType<any>;
  };
}

interface TableEditorProps<T extends FieldValues> {
  /** Name of the form field */
  name: ArrayPath<T>;
  /** Name of the Child Doctype */
  doctype: string;
  label?: string;
  /** Default values of a record when a new row is added */
  defaultInitialValues: any;
  /** Callback trigerred when a row is added */
  onAddRow?: () => void;
  /**
   * Callback trigerred before a row is added
   * Return false to prevent the row from being added.
   * Return true to add the row, or a FieldArray to add the row with custom values
   */
  beforeAddRow?: () => boolean | FieldArray<T, ArrayPath<T>>;
  /** Whether to show the add row button */
  canAddRow?: boolean;
  /** Callback trigerred when a row is deleted */
  onDeleteRow?: (index: number[]) => void;
  /**
   * Callback trigerred before a row is deleted
   * Return false to prevent the rows from being deleted
   */
  beforeDeleteRow?: (index: number[]) => boolean;
  /** Whether to show the delete rows button */
  canDeleteRows?: boolean;
  /**
   * Callback trigerred when the edit button is clicked on a row.
   * Set to undefined to not show the edit button
   */
  onEditButtonClicked?: (index: number) => void;
  /** Array of Column definitions to be rendered. Use `getEditor` utility to generate common editor col defs
   * Set width, visibility, pinning etc using ColDef properties
   */
  colDefs: ColDef<T>[];
  /** Allow the data to be edited.
   * Defaults to true
   * Set to false in cases like submitted/cancelled documents.
   */
  allowEdit?: boolean;
  onRowSelectionChanged?: (indexes: any[]) => void;
  /**
   * On Row expansion render a component
   */
  detailCellRenderer?: AgGridReact["props"]["detailCellRenderer"];
  tooltip?: React.ReactNode;
  /** Hides the "Use Ctrl + Enter to add a row" text */
  hideAddRowHelpText?: boolean;
  /** custom components for grid like Action Button*/
  customComponents?: (props: AgGridCustomComponentsProps) => ReactNode;
  customComponentProps?: {
    doctype: string;
    docname: string;
    refreshPage: () => void;
    callback: (params?: any) => ReturnType<any>;
  };
  /**
   * Set to true to show the pagination at the bottom of the table
   * Defaults to false
   */
  showPagination?: boolean;
  /**
   * Set to true to show the side bar
   * Defaults to false
   */
  showSideBar?: boolean;
}

/**
 * Component to render a Editor table for a child table
 * @param props
 * @returns
 */
export const TableEditorComponent = <T extends FieldValues>(
	props: TableEditorProps<T>,
	ref: ForwardedRef<AgGridReact>,
) => {
	const {
		name,
		doctype,
		tooltip,
		defaultInitialValues,
		onAddRow,
		label,
		hideAddRowHelpText = false,
		beforeAddRow,
		beforeDeleteRow,
		onRowSelectionChanged: onRowSelectionChangedCallback,
		onDeleteRow,
		canAddRow = true,
		colDefs,
		canDeleteRows = true,
		allowEdit = true,
		onEditButtonClicked,
		detailCellRenderer,
		customComponents,
		customComponentProps,
		showPagination = false,
		showSideBar = false,
	} = props;
	const {
		control,
		setValue,
		getValues,
		formState: { errors },
		clearErrors,
	} = useFormContext<T>();

	const { fields, append, remove } = useFieldArray<T>({
		control,
		name,
	});

	const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);
	const gridRef = useRef<AgGridReact | null>(null);

	const customComponentRef = useRef<CustomComponentRef | null>(null);

	/** Trigerred when the Add Row button is clicked */
	const addRow = useCallback(() => {
		const canAddRow = beforeAddRow?.() ?? true;
		if (canAddRow) {
			if (canAddRow === true) {
				append({
					...defaultInitialValues,
					id: makeid(10),
				});
			} else {
				append({
					...defaultInitialValues,
					id: makeid(10),
					...canAddRow,
				});
			}
			onAddRow?.();

			clearErrors(`${name}` as Path<T>);

			setTimeout(() => {
				const rows = gridRef.current?.api?.getDisplayedRowCount() ?? 0;

				const visibleColumns: ColDef[] | undefined = gridRef.current?.api
					?.getColumnDefs()
					?.filter((colDef: ColDef) => !colDef.hide);

				if (rows && visibleColumns && visibleColumns.length > 1) {
					gridRef.current?.api.ensureIndexVisible(rows - 1, "middle");
					gridRef.current?.api.ensureColumnVisible(
						visibleColumns?.[1]?.field ?? "id",
						"middle",
					);
					gridRef.current?.api.setFocusedCell(
						rows - 1,
						visibleColumns?.[1]?.field ?? "id",
					);
					gridRef.current?.api.startEditingCell({
						rowIndex: rows - 1,
						colKey: visibleColumns?.[1]?.field ?? "id",
						key: visibleColumns?.[1]?.field ?? "id",
					});
				}
			}, 50);
		}
	}, [append, defaultInitialValues, doctype, onAddRow, beforeAddRow, name]);

	const defaultColDef: ColDef = useMemo(() => {
		return {
			// flex: 1,
			resizable: true,
			sortable: true,
			filter: false,
			cellEditorPopup: true,
			cellEditorPopupPosition: "over",
			editable: allowEdit,
			filterParams: {
				buttons: ["clear"],
			},
		};
	}, [allowEdit]);

	const statusBar = useMemo(() => {
		return {
			statusPanels: [{ statusPanel: "agAggregationComponent" }],
		};
	}, []);

	const [selectedRows, setSelectedRows] = useState<any[]>([]);

	const onRowSelectionChanged = useCallback(
		(event: SelectionChangedEvent) => {
			const selectedRows = event.api.getSelectedRows();
			setSelectedRows(selectedRows);
			onRowSelectionChangedCallback?.(selectedRows as T[]);
		},
		[onRowSelectionChangedCallback],
	);

	/** Trigerred when the "Clear all" button is clicked */
	const onRowSelectionCleared = useCallback(() => {
		gridRef.current?.api.deselectAll();
		onRowSelectionChangedCallback?.([]);
	}, [onRowSelectionChangedCallback]);

	const isRowSelected = useMemo(() => {
		const selected = selectedRows.length > 0;
		customComponentRef.current?.updateState(selected);
		return selected;
	}, [selectedRows]);

	const getSelectedRows = useCallback(() => {
		const selectedRows = gridRef.current?.api.getSelectedRows() ?? [];
		const allData = getValues(name as Path<T>);
		return selectedRows.map((row) =>
			allData.findIndex((field: any) => {
				if (field.name) {
					return field.name === row.name;
				}
				if (field.idx) {
					return field.idx === row.idx;
				}
				return field.id === row.id;
			}),
		);
	}, [name, getValues]);

	/** Trigerred when the Delete Rows button is clicked */
	const deleteRows = useCallback(() => {
		const selectedRowsIndexes = getSelectedRows();

		const canDeleteRows = beforeDeleteRow?.(selectedRowsIndexes) ?? true;
		if (canDeleteRows) {
			const selected = getSelectedRows();
			remove(selected);
			onDeleteRow?.(selected);
			onRowSelectionCleared();
		}
	}, [
		remove,
		beforeDeleteRow,
		onDeleteRow,
		onRowSelectionCleared,
		name,
		getValues,
	]);

	const getRowID: GetRowIdFunc = useMemo(() => {
		// Row ID can be either the name or the idx (both provided by Frappe) or the id
		return (params) =>
			params.data.name
				? params.data.name
				: params.data.idx
					? params.data.idx
					: params.data.id;
	}, []);

	const onCellEditRequested = useCallback(
		async (event: CellEditRequestEvent) => {
			const field = event.colDef.field;
			// Row Index can be wrong if the user has expanded master rows
			const rowIndex = event.node.childIndex ?? event.rowIndex;
			if (field) {
				// Manually clear errors when the user starts editing a cell
				if (event.value) {
					clearErrors(`${name}.${rowIndex}` as Path<T>);
				}
				setValue(`${name}.${rowIndex}.${field}` as Path<T>, event.value, {
					shouldValidate: true,
					shouldDirty: true,
					shouldTouch: true,
				});
				// Perform side effects here
				const colDef = event.column.getColDef();
				if (colDef?.cellEditorParams) {
					if (typeof colDef.cellEditorParams === "function") {
						const cellEditorParams = colDef.cellEditorParams(event);
						if (cellEditorParams?.onChange) {
							await cellEditorParams.onChange?.(event);
						}
					} else {
						if (colDef.cellEditorParams?.onChange) {
							await colDef.cellEditorParams?.onChange?.(event);
						}
					}
				}
				event.api.applyTransaction({
					update: [
						{
							id: event.data.id,
							...getValues(`${name}.${rowIndex}` as Path<T>),
						},
					],
				});
			}
		},
		[setValue, name, getValues],
	);

	const gridColDefs = useMemo(() => {
		const firstColDef: ColDef = {
			hide: false,
			// checkboxSelection: true,
			suppressMovable: true,
			lockPosition: true,
			lockPinned: true,
			lockVisible: true,
			field: "id",
			filter: false,
			resizable: false,
			// REMOVE cellRenderer: () => null,
			headerName: "",
			suppressHeaderMenuButton: true,
			editable: false,
			cellStyle: {
				paddingLeft: 4,
				paddingRight: 0,
				display: "flex",
				justifyContent: "right",
			},
			// headerClass: 'checkbox-header',
			rowDrag: allowEdit,
			rowDragText: () => "",
			sortable: false,
			width: 50,
			headerCheckboxSelection: true,
			initialPinned: "left",
		};

		const lastColDef: ColDef = {
			hide: false,
			field: "",
			filter: false,
			resizable: false,
			cellRenderer: detailCellRenderer
				? "agGroupCellRenderer"
				: (params: ICellRendererParams) => {
					return (
						<Button
							variant={"link"}
							onClick={() =>
								onEditButtonClicked?.(
									params.node.childIndex ?? params.node?.rowIndex,
								)
							}
						>
                Edit
						</Button>
					);
				},
			headerName: "",
			suppressHeaderMenuButton: true,
			editable: false,
			sortable: false,
			suppressMovable: true,
			width: detailCellRenderer ? 45 : 80,
			initialPinned: "right",
		};

		if (onEditButtonClicked || detailCellRenderer) {
			return [firstColDef, ...colDefs, lastColDef];
		}
		return [firstColDef, ...colDefs];
	}, [colDefs, onEditButtonClicked, detailCellRenderer, allowEdit]);

	const values = useWatch({
		name: name as Path<T>,
		control: control,
	});

	const hotkeysRef = useHotkeys(
		"ctrl+enter",
		addRow,
		{
			enableOnContentEditable: true,
			enabled: canAddRow,
			enableOnFormTags: true,
			preventDefault: true,
		},
		[canAddRow],
	);

	const CustomDetailCellRenderer = useCallback(
		({ node: { parent } }: ICellRendererParams) => {
			if (
				detailCellRenderer &&
        parent?.rowIndex !== null &&
        parent?.rowIndex !== undefined
			) {
				return createElement(detailCellRenderer, {
					index: parent?.rowIndex,
				});
			}

			return undefined;
		},
		[detailCellRenderer],
	);

	const onRowDragEnd = useCallback(
		(e: RowDragEvent) => {
			// 1. onGragEnd get called with the row which is dragged
			// 2. we need to update the idx of all the rows
			// 3. fetch all the rows from the grid
			// 4. update the idx of all the rows
			// 5. update the value of the form

			let tableData: any = [];
			gridRef.current?.api.forEachNode((node, index) => {
				tableData.push({
					...node.data,
					idx: index + 1,
				});
			});

			setValue(name as Path<T>, tableData, {
				shouldValidate: true,
				shouldDirty: true,
				shouldTouch: true,
			});
		},
		[setValue, name],
	);

	const sideBar = useMemo(() => {
		// hide sidebar if showSideBar is false
		if (!showSideBar) return false;

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

	return (
		<div
			className={cn(
				"w-full",
				errors?.[name] && "border border-red-500 rounded-md",
			)}
		>
			<div className="flex justify-between items-center pt-1 pb-2">
				<div className="flex items-center gap-2">
					<h2 className="text-base font-semibold">{label ? label : ""}</h2>
					{tooltip && (
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<span className="pl-1 inline-block align-middle cursor-pointer mb-[-2px]">
										<MdInfoOutline className="text-gray-500" size={16} />
									</span>
								</TooltipTrigger>
								<TooltipContent side="right" className="text-sm">
									{tooltip}
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					)}
				</div>
				<div className="flex items-center gap-2">
					{customComponents &&
            createElement(customComponents, {
            	ref: customComponentRef,
            	gridApi: gridRef?.current?.api,
            	customComponentProps: customComponentProps,
            } as AgGridCustomComponentsProps)}
					{!isRowSelected && canAddRow && !hideAddRowHelpText && (
						<span className="text-xs text-gray-400">
              Use Ctrl + Enter to add a row
						</span>
					)}
					{!isRowSelected && canAddRow && (
						<Button variant="outline" size="sm" onClick={addRow} type="button">
              Add Row
						</Button>
					)}
					{canDeleteRows && (
						<Button
							variant="destructive"
							size="sm"
							onClick={deleteRows}
							type="button"
							className={isRowSelected ? "" : "hidden"}
						>
              Delete
						</Button>
					)}
					<Button
						variant="outline"
						size="sm"
						onClick={onRowSelectionCleared}
						type="button"
						className={isRowSelected ? "" : "hidden"}
					>
            Clear Selection
					</Button>
				</div>
			</div>
			<div
				style={gridStyle}
				className={cn("rounded-md border border-input bg-background")}
				// @ts-expect-error
				ref={hotkeysRef}
			>
				<AgGridReact
					rowData={values ?? []}
					getRowId={getRowID}
					onSelectionChanged={onRowSelectionChanged}
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
					stopEditingWhenCellsLoseFocus
					rowSelection={{
						mode: "multiRow",
						checkboxes: true, // enable checkbox selection
						headerCheckbox: true, // show checkbox in header
						enableClickSelection: true, // allow selection via click
						isRowSelectable: () => true, // keep if needed
					}}
					animateRows
					suppressNoRowsOverlay
					masterDetail={detailCellRenderer ? true : false}
					readOnlyEdit
					onCellEditRequest={onCellEditRequested}
					popupParent={document.body}
					statusBar={statusBar}
					rowDragManaged={allowEdit}
					columnDefs={gridColDefs}
					defaultColDef={defaultColDef}
					rowDragMultiRow={true}
					detailCellRenderer={CustomDetailCellRenderer}
					detailCellRendererParams={{
						refreshStrategy: "nothing",
					}}
					domLayout="autoHeight"
					keepDetailRows
					detailRowAutoHeight={detailCellRenderer ? true : false}
					onRowDragEnd={onRowDragEnd}
					pagination={showPagination}
					paginationPageSize={20}
					sideBar={sideBar}
				/>
			</div>
			{errors[name] ? (
				<div className="pt-2 text-sm text-red-500">
					<TableErrorMessage error={errors[name]} />
				</div>
			) : null}
		</div>
	);
};

export const TableErrorMessage = ({
	error,
}: {
  error: FieldErrors[ArrayPath<any>];
}) => {
	if (error?.message && typeof error.message === "string") {
		return error.message;
	} else if (Array.isArray(error)) {
		return (
			<ul className="list-disc pl-4">
				{error?.map((err, index) => {
					if (err && typeof err === "object") {
						return (
							<li key={index}>
                Row {index + 1}:
								<ul className="pl-4">
									{Object.keys(err)?.map((key, idx) => (
										<li
											key={idx}
											className="flex items-center gap-1 list-none ml-[-8px]"
										>
											<MdCancel className="text-red-500" size={16} />
											{err[key]?.message}
										</li>
									))}
								</ul>
							</li>
						);
					}
					return null;
				})}
			</ul>
		);
	}
	return null;
};

export const TableEditor = forwardRef(TableEditorComponent);

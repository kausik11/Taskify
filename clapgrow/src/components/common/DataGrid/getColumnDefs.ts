import { getCellRenderer } from "./CellRenderers/CellRenderers";
import { ColumnProps } from "./DataGridComponent";
import {
	getFilterTypeFromFieldType,
	getFilterParamsFromFieldType,
	getType,
	getEnableRowGroup,
	getEnableValue,
	getValueFormatter,
} from "./utils";
import { NavigateOptions, URLSearchParamsInit } from "react-router-dom";
import {
	ColDef,
	KeyCreatorParams,
	ValueFormatterParams,
} from "ag-grid-community";

export const getColumnDefs = (
	column: ColumnProps,
	navigate: (
    doctype: string,
    docname?: string,
    title?: string,
    options?: NavigateOptions,
    sendSearchParamsInLocationState?: boolean,
    searchParams?: URLSearchParamsInit,
    autoFillFields?: any,
  ) => void,
	doctype?: string,
): ColDef => {
	return {
		colId: column.fieldname ?? column.label,
		field: column.fieldname,
		headerName: column.label,
		filter: getFilterTypeFromFieldType(column.fieldtype ?? "Data"),
		filterParams: {
			...getFilterParamsFromFieldType(
				column.type && column.type !== "badge" && column.type !== "tag"
					? column.type
					: (column.fieldtype ?? "Data"),
				column.fieldname,
				typeof column.options === "string" ? column.options : undefined,
				column.type === "Select" || column.fieldtype === "Select"
					? (column.options as string[])
					: undefined,
			),
			...column.filterParams,
		},
		hide: column.hidden === true ? true : false,
		type: getType(column.type ? column.type : (column.fieldtype ?? "Data")),
		enableRowGroup: getEnableRowGroup(
			column.type !== undefined ? column.type : (column.fieldtype ?? "Data"),
		),
		enableValue: getEnableValue(
			column.type !== undefined ? column.type : (column.fieldtype ?? "Data"),
		),
		valueFormatter: getValueFormatter(
			column.type !== undefined ? column.type : (column.fieldtype ?? "Data"),
		),
		cellRenderer: getCellRenderer(
			column.type ? column.type : (column.fieldtype ?? "Data"),
		),
		cellRendererParams: {
			colorMap: column.colorMaps,
			disabled: column.fieldtype === "Check" ? true : false,
			doctype:
        column.fieldtype === "Link"
        	? getDoctype(column.options as string, doctype ?? "")
        	: doctype,
			cellType: column.type ? column.type : (column.fieldtype ?? "Data"),
			...column.cellRendererParams,
			...column,
		},
		onCellClicked: (e) => {
			if (column.type === "user-avatar") {
				const name = e.data?.[column.cellRendererParams?.name ?? "name"];
				const navigateDoctype = column.cellRendererParams?.doctype ?? doctype;
				if (name) {
					navigate(navigateDoctype, name);
				}
			} else if (column.type === "custom-link") {
				const value = e.value;
				const navigateDoctype =
          e.data?.[column.cellRendererParams?.name] ??
          column.cellRendererParams?.doctype ??
          doctype;
				if (value) {
					navigate(navigateDoctype, value);
				}
			}
		},
		...column.overrideProps,
	} as ColDef;
};

export const getDoctype = (options: string, doctype: string) => {
	return options?.split("/n")?.[0]?.split(",")[0] ?? doctype;
};

export const getModifiedColDefs = () => {
	return {
		colId: "modified",
		field: "modified",
		headerName: "Modified",
		type: getType("Datetime"),
		hide: false,
		filter: getFilterTypeFromFieldType("Datetime"),
		filterParams: {
			...getFilterParamsFromFieldType("Datetime"),
		},
		valueFormatter: getValueFormatter("timeago"),
	};
};

export const getAssignedColDefs = () => {
	return {
		colId: "_assign",
		field: "_assign",
		headerName: "Assigned To",
		hide: false,
		filter: "agTextColumnFilter",
		// filterParams: {
		//     ...getFilterParamsFromFieldType('Assigned To')
		// },
		cellRenderer: getCellRenderer("assignment"),
	};
};

export const docStatusObj: { [key: string]: string } = {
	0: "Draft",
	1: "Submitted",
	2: "Cancelled",
};
export const keyCreator = (params: KeyCreatorParams) => {
	return params.value;
};

export const valueFormatter = (params: ValueFormatterParams) => {
	return docStatusObj?.[params.value];
};

export const getDocStatusColDefs = () => {
	return {
		colId: "docstatus",
		field: "docstatus",
		headerName: "DocStatus",
		cellRenderer: getCellRenderer("docstatus"),
		filter: getFilterTypeFromFieldType("Select"),
		enableRowGroup: true,
		filterParams: {
			values: ["0", "1", "2"],
			keyCreator: keyCreator,
			valueFormatter: valueFormatter,
		},
		hide: false,
	};
};

import { ColDef, ValueFormatterParams } from "ag-grid-community";
import {
	ICellEditorParams,
	INumberCellEditorParams,
	IRichCellEditorParams,
	ITextCellEditorParams,
} from "ag-grid-enterprise";
import { AsyncDropdownEditor, AsyncDropdownRenderer } from "./Editors";
import { CellEditRequestEvent } from "ag-grid-community";
import { DateEditor, DateTimeEditor, TimeEditor } from "./Editors/DateEditor";
import { TableRichTextEditor } from "./Editors/TableRichTextEditor";
import {
	SmallTextEditor,
	SmallTextEditorProps,
} from "./Editors/SmallTextEditor";
import { AsyncDropdownWithoutFormProps } from "../AsyncDropdown/AsyncDropdown";
import {
	DatePickerValueComponentProps,
	TimePickerValueComponentProps,
} from "../AirDatePicker/DatePickerValueComponent";
import {
	convertFrappeDateStringToReadableDate,
	convertFrappeTimestampToReadableDateTime,
	convertFrappeTimeStringToReadableTime,
} from "@/utils/dateconversion";
import { HTMLCellRenderer } from "../DataGrid/CellRenderers/CellRenderers";
import { formatCurrency, formatNumber } from "@/hooks/numberFormats";
import { CurrencyEditor } from "./Editors/CurrencyEditor";

export type EditorType =
	| "Data"
	| "Int"
	| "Float"
	| "Select"
	| "Link"
	| "Date"
	| "Datetime"
	| "Time"
	| "Check"
	| "Small Text"
	| "Currency"
	| "Mileage"
	| "Percent"
	| "Text Editor";

interface OnChangeEvent {
	/** Callback to trigger when an edit is committed */
	onChange?: (event: CellEditRequestEvent<unknown, unknown>) => Promise<void> | void;
}
type TextEditorProps = Partial<ITextCellEditorParams> & OnChangeEvent;
type TextAreaEditorProps = Partial<SmallTextEditorProps> & OnChangeEvent;
type SelectEditorProps = Partial<IRichCellEditorParams> & OnChangeEvent;
type NumberEditorProps = Partial<INumberCellEditorParams> &
	OnChangeEvent & {
		/** Do not show fallback number if value is undefined or null */
		doNotShowFallback?: boolean;
	};
type CheckboxEditorProps = OnChangeEvent;
type LinkEditorProps = {
	props: Omit<
		AsyncDropdownWithoutFormProps,
		"selected" | "setSelectedValue" | "name"
	>;
} & OnChangeEvent;

type DateEditorProps = {
	props?: Partial<
		Omit<DatePickerValueComponentProps, "value" | "onChange">
	>;
} & OnChangeEvent;

type TimeEditorProps = {
	props?: Partial<
		Omit<TimePickerValueComponentProps, "value" | "onChange">
	>;
} & OnChangeEvent;

type EditorProps<T> = T extends "Data"
	? TextEditorProps
	: T extends "Small Text"
	? TextAreaEditorProps
	: T extends "Select"
	? SelectEditorProps
	: T extends "Int"
	? NumberEditorProps
	: T extends "Float"
	? NumberEditorProps
	: T extends "Check"
	? CheckboxEditorProps
	: T extends "Link"
	? LinkEditorProps
	: T extends "Percent"
	? NumberEditorProps
	: T extends "Date"
	? DateEditorProps
	: T extends "Datetime"
	? DateEditorProps
	: T extends "Time"
	? TimeEditorProps
	: never;

type CustomCellEditRequestEvent<T = unknown> = {
	rowIndex: number;
	newValue: unknown;
	oldValue: unknown;
	data: T;
};
type EditorPropType<T> =
	| T
	| ((params: ICellEditorParams | CustomCellEditRequestEvent) => T);

/**
 * Common utility function to get the ColDef for a given editor type
 * @param type - the type of column editor
 * @param props - the props for the editor
 * @param override - add additional ColDef properties
 * @returns ColDef object to be passed to AgGrid
 *
 * @example
 *
 * The example below initializes a column definition array with editors for each column
 *
 * const colDefs = useMemo(() => {
		return [
			{
				field: 'name',
				headerName: 'Name',
				...getEditor('Data'),
				initialWidth: 200
			},
			{
				field: 'int',
				...getEditor('Int', {
					max: 100000
				}),
			},
			{
				field: 'percent',
				...getEditor('Percent'),
				initialHide: true
			},
			{
				field: 'float',
				...getEditor('Mileage')
			},
			{
				field: 'currency',
				...getEditor('Currency')
			},
			{
				field: 'check_box',
				...getEditor('Check')
			},
			{
				field: 'select',
				...getEditor('Select', {
					values: ['Option 1', 'Option 2', 'Option 3']
				})
			},
			{
				field: 'small_text',
				...getEditor('Small Text')
			},
			{
				field: 'company',
				headerName: 'Company',
				...getEditor('Link', params => ({
					props: {
						doctype: params.rowIndex === 0 ? 'Company' : 'Cost Codes',
					}
				}))
			}
		]
	}, [])
 */
export function getEditor<T extends EditorType>(
	type: T,
	props?: EditorPropType<EditorProps<T>>,
	override?: Partial<ColDef>,
): ColDef {
	switch (type) {
	case "Link":
		return {
			cellEditor: AsyncDropdownEditor,
			cellEditorParams: props,
			singleClickEdit: true,
			suppressKeyboardEvent: (params) => {
				const key = params.event.key;
				const ctrlKey = params.event.ctrlKey;
				// If the enter key is pressed when the editor is on then we want to ignore
				if (params.editing) {
					return key === "Return" || key === "Enter";
				} else if (ctrlKey) {
					return key === "Return" || key === "Enter";
				} else {
					return false;
				}
			},
			cellRenderer: AsyncDropdownRenderer,
			...override,
		};
	case "Text Editor":
		return {
			cellEditor: TableRichTextEditor,
			cellEditorParams: props,
			cellRenderer: HTMLCellRenderer,
			singleClickEdit: false,
			suppressKeyboardEvent: (params) => {
				const key = params.event.key;
				if (params.editing) {
					return key === "Return" || key === "Enter";
				}
				return false;
			},
			...override,
		};
	case "Currency":
		return {
			type: "numericColumn",
			valueFormatter: (params: ValueFormatterParams) =>
				formatCurrency(params.value),
			singleClickEdit: true,
			cellEditor: CurrencyEditor,
			cellEditorParams: {
				...props,
			},
			initialWidth: 150,
			...override,
		};
	case "Date":
		return {
			valueFormatter: (params: ValueFormatterParams) =>
				convertFrappeDateStringToReadableDate(params.value),
			cellEditor: DateEditor,
			cellEditorPopup: true,
			cellEditorParams: props,
			singleClickEdit: true,
			suppressKeyboardEvent: (params) => {
				const key = params.event.key;
				const ctrlKey = params.event.ctrlKey;
				// If the enter key is pressed when the editor is on then we want to ignore
				if (params.editing) {
					return key === "Return" || key === "Enter";
				} else if (ctrlKey) {
					return key === "Return" || key === "Enter";
				} else {
					return false;
				}
			},
			...override,
		};
	case "Datetime":
		return {
			valueFormatter: (params: ValueFormatterParams) =>
				convertFrappeTimestampToReadableDateTime(
					params.value,
					"MM-DD-YYYY hh:mm A",
				),
			cellEditorPopup: true,
			singleClickEdit: true,
			cellEditorParams: props,
			suppressKeyboardEvent: (params) => {
				const key = params.event.key;
				const ctrlKey = params.event.ctrlKey;
				// If the enter key is pressed when the editor is on then we want to ignore
				if (params.editing) {
					return key === "Return" || key === "Enter";
				} else if (ctrlKey) {
					return key === "Return" || key === "Enter";
				} else {
					return false;
				}
			},
			cellEditor: DateTimeEditor,
			...override,
		};
	case "Time":
		return {
			valueFormatter: (params: ValueFormatterParams) =>
				convertFrappeTimeStringToReadableTime(params.value),
			cellEditor: TimeEditor,
			singleClickEdit: true,
			cellEditorParams: props,
			...override,
		};
	case "Percent":
		return {
			type: "numericColumn",
			valueFormatter: (params: ValueFormatterParams) => {
				if (
					(props as NumberEditorProps)?.doNotShowFallback &&
						(params.value === null || params.value === undefined)
				) {
					return "";
				} else {
					return `${formatNumber(
						params.value,
						undefined,
						{
							minimumFractionDigits:
									(props as NumberEditorProps)?.precision ?? 2,
							maximumFractionDigits:
									(props as NumberEditorProps)?.precision ?? 2,
						},
						"0.00",
					)}%`;
				}
			},
			cellEditor: "agNumberCellEditor",
			cellEditorParams: {
				precision: 2,
				max: 100,
				min: 0,
				...props,
			},
			singleClickEdit: true,
			cellEditorPopup: false,
			initialWidth: 150,
			...override,
		};
	case "Small Text":
		return {
			cellEditor: SmallTextEditor,
			cellEditorParams: props,
			// cellRenderer: HTMLCellRenderer,
			singleClickEdit: false,
			suppressKeyboardEvent: (params) => {
				const key = params.event.key;
				if (params.editing) {
					return key === "Return" || key === "Enter";
				}
				return false;
			},
			...override,
		};
	case "Select":
		return {
			cellEditor: "agRichSelectCellEditor",
			cellEditorParams: props,
			cellEditorPopup: false,
			singleClickEdit: true,
			...override,
		};
	case "Int":
		return {
			type: "numericColumn",
			valueFormatter: (params: ValueFormatterParams) => {
				if (
					(props as NumberEditorProps)?.doNotShowFallback &&
						(params.value === null || params.value === undefined)
				) {
					return "";
				} else {
					return formatNumber(params.value);
				}
			},
			cellEditor: "agNumberCellEditor",
			cellEditorParams: {
				precision: 0,
				...props,
			},
			cellEditorPopup: false,
			initialWidth: 150,
			singleClickEdit: true,
			...override,
		};
	case "Float":
		return {
			type: "numericColumn",
			valueFormatter: (params: ValueFormatterParams) => {
				if (
					(props as NumberEditorProps)?.doNotShowFallback &&
						(params.value === null || params.value === undefined)
				) {
					return "";
				} else {
					return formatNumber(params.value, undefined, {
						minimumFractionDigits:
								(props as NumberEditorProps)?.precision ?? 2,
						maximumFractionDigits:
								(props as NumberEditorProps)?.precision ?? 2,
					});
				}
			},
			cellEditor: "agNumberCellEditor",
			cellEditorParams: {
				precision: 2,
				...props,
			},
			singleClickEdit: true,
			cellEditorPopup: false,
			initialWidth: 150,
			...override,
		};
	case "Check":
		return {
			cellEditor: "agCheckboxCellEditor",
			cellEditorParams: props,
			valueGetter: (params) =>
				params.data[params.colDef.field as string] ? true : false,
			cellEditorPopup: false,
			cellDataType: "boolean",
			singleClickEdit: true,
			...override,
		};
	case "Data":
		return {
			cellEditor: "agTextCellEditor",
			cellEditorParams: {
				maxLength: 140,
				...props,
			},
			singleClickEdit: true,
			cellEditorPopup: false,
			...override,
		};
	default:
		return {
			cellEditor: "agTextCellEditor",
			cellEditorParams: props,
			singleClickEdit: true,
			cellEditorPopup: false,
			...override,
		};
	}
}
import { useGetDoctypeMeta } from "@/hooks/useGetDoctypeMeta";
import { ColumnProps } from "./DataGridComponent";
import { ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { DocField } from "@/types/Core/DocField";
import {
	Filter,
	FrappeConfig,
	FrappeContext,
	FrappeError,
} from "frappe-react-sdk";
import { DataGridStateManager } from "./DataGridStateManager";
import { getFilterParamsFromFieldType } from "./utils";
import { AgGridReactProps } from "ag-grid-react";
import { ErrorBanner } from "@/components/layout/AlertBanner/ErrorBanner";
import { FullPageLoader } from "../FullPageLoader/FullPageLoader";
import { ActionsMenu } from "./Menu/Menu";

export let haveTableNameValue: boolean = false; // Default value


export interface UserInfo {
	email: string;
	fullname: string;
	image: string;
	name: string;
	time_zone: string;
}

export interface aggregateProps {
	field: string | undefined;
	aggFunc: string | undefined;
	fieldName: string | undefined;
}

export interface DoctypeProps {
	doctype: string;
}
export interface DoctypeListProps {
	/** doctype */
	doctype: string;
	/** defaultFilters are filters that are always applied and visible to user and on grid*/
	defaultFilters?: Filter[];
	/** mandatoryFilters are filters that are always applied and not visible to user and on grid*/
	mandatoryFilters?: Filter[];
	/** columnDefs are columns */
	columnDefs?: ColumnProps[];
	/** additionalColumns are additional columns that are not in columnDefs */
	additionalColumns?: ColumnProps[];
	/** overrideColumns are columns that are overriden */
	overrideColumns?: Record<string, Omit<ColumnProps, "fieldname">>;
	/** otherFields are other fields that are not in columnDefs but required in grid */
	otherFields?: string[];
	/** leftChild is a function that returns a JSX element for EG <Header>{doctype}</Header>*/
	leftChild?: (props: DoctypeProps) => JSX.Element;
	/** rightChild is a function that returns a JSX element */
	rightChild?: (props: DoctypeProps) => JSX.Element | null;
	/** saveLoadLayout is boolean to show save and load layout */
	saveLoadLayout?: boolean;
	/** agGridProps are ag grid props */
	agGridProps?: AgGridReactProps;
	/** showMenuActions is boolean to show menu actions like GridActionButton which include export and all*/
	showActions?: boolean,
	customActions?: ReactNode
	showModifiedColumn?: boolean;
	/** defaultOrderBy is string to use default sort data */
	defaultOrderBy?: string;
	showCheckboxColumn?: boolean // New prop to control checkbox column visibility
	haveTableName?: boolean
}

const DoctypeList = ({
	doctype,
	defaultFilters,
	mandatoryFilters,
	columnDefs,
	overrideColumns,
	additionalColumns,
	otherFields,
	leftChild,
	rightChild,
	saveLoadLayout,
	agGridProps,
	showActions = true,
	customActions,
	showModifiedColumn = true,
	defaultOrderBy,
	showCheckboxColumn = true,
	haveTableName=false,
}: DoctypeListProps) => {
	const { data, error, isLoading } = useGetDoctypeMeta(doctype);
	const workflowField: string = useMemo(
		() => data?.__workflow_docs?.[0]?.workflow_state_field,
		[data],
	);
	const workflowDocs = useMemo(() => data?.__workflow_docs, [data]);

	const { call } = useContext(FrappeContext) as FrappeConfig;

	/** getFieldOptions
   * @param options: string | undefined
   * @param fieldtype: string
   * @returns string[] | string | undefined depending on fieldtype
   */
	const getFieldOptions = (options: string | undefined, fieldtype: string) => {
		if (options !== "" && options !== null && options !== undefined) {
			if (fieldtype === "Select") {
				return options.split("\n").map((option: string) => {
					return option.split("/")[0];
				});
			} else {
				return options.split("\n")[0];
			}
		}

		return undefined;
	};

	// unWant to show these column in grid
	const removedColumnType = [
		"Column Break",
		"Button",
		"Barcode",
		"HTML",
		"Fold",
		"Geolocation",
		"Heading",
		"Icon",
		"Section Break",
		"Tab Break",
		"Table",
		"Table MultiSelect",
		"Signature",
	];

	// get title field and name field from doctype meta
	const getTitleFieldAndNameField = useCallback(() => {
		const titleFieldAndNameFieldColumn: ColumnProps[] = [];
		const titleField = data?.title_field;

		if (titleField) {
			const titleFieldIndex = data?.fields?.findIndex(
				(field: DocField) => field.fieldname === titleField,
			);
			const titleFieldColumn = data?.fields?.[titleFieldIndex];
			if (titleFieldColumn) {
				const overrideColumn =
					overrideColumns?.[titleFieldColumn.fieldname ?? ""];
				const options = getFieldOptions(
					titleFieldColumn.options,
					titleFieldColumn.fieldtype,
				);
				titleFieldAndNameFieldColumn.push({
					fieldname: titleFieldColumn.fieldname,
					label: titleFieldColumn.label,
					fieldtype: titleFieldColumn.fieldtype,
					hidden: false,
					options: options,
					filterParams: {
						doctype:
							titleFieldColumn.fieldtype === "Link" ? options : undefined,
					},
					...overrideColumn,
				});
			}
		}
		const overrideName = overrideColumns?.["name"];
		titleFieldAndNameFieldColumn.push({
			fieldname: "name",
			label: "ID",
			fieldtype: "Link",
			hidden: false,
			overrideProps: {
				filter: "agTextColumnFilter",
				filterParams: getFilterParamsFromFieldType("Data"),
			},
			...overrideName,
		});
		return titleFieldAndNameFieldColumn;
	}, [data]);

	const workflowColorMap = {
		Primary: "purple",
		Success: "green",
		Info: "blue",
		Warning: "orange",
		Danger: "red",
		Inverse: "black",
	};

	// get columns from doctype meta
	const getColumns = useCallback(() => {

		const defaultColumns: ColumnProps[] = [
			{
				fieldname: 'creation',
				fieldtype: 'Datetime',
				hidden: true,
				type: 'Datetime',
				label: 'Created On',
			},
			{
				fieldname: 'owner',
				fieldtype: 'Link',
				hidden: true,
				label: 'Created By',
				options: 'User',
				type: 'Link'
			}
		]
		return [...data?.fields?.filter((field: DocField) => {
			return !removedColumnType.includes(field.fieldtype)
		}).map((field: DocField) => {
			const options = getFieldOptions(field.options, field.fieldtype)
			const overrideColumn = overrideColumns?.[field.fieldname ?? '']
			// console.log('overrideColumn', overrideColumn)
			const isAssignedTo = field.fieldname === 'assigned_to';
			if (workflowField !== field.fieldname) {
				return {
					fieldname: field.fieldname,
					label: field.label,
					fieldtype: field.fieldtype,
					options: options,
					hidden: field.in_list_view === 1 ? false : true,
					filterParams: {
						doctype: field.fieldtype === 'Link' ? options : undefined,
					},
					...overrideColumn
				} as ColumnProps
			} else {
				const colorMap = {}
				workflowDocs?.forEach((doc: any) => {
					if (doc?.style && doc?.name) {
						// @ts-ignore
						colorMap[doc?.name] = workflowColorMap[doc?.style]
					}
				})
				return {
					fieldname: field.fieldname,
					label: field.label,
					fieldtype: field.fieldtype,
					options: options,
					hidden: field.in_list_view === 1 ? false : true,
					colorMaps: colorMap,
					filterParams: isAssignedTo
						? overrideColumn?.overrideProps?.filterParams ?? {} // Use override filterParams for assigned_to
						: {
							doctype: field.fieldtype === 'Link' ? options : undefined,
							...overrideColumn?.overrideProps?.filterParams,
						},
					...overrideColumn
				} as ColumnProps
			}
		}) as ColumnProps[] ?? [], ...defaultColumns, ...additionalColumns ?? []]

	}, [data, removedColumnType, getFieldOptions, overrideColumns, workflowField, workflowDocs])

	// get columns from doctype meta
	const columns: ColumnProps[] = useMemo(() => {
		const titleFieldAndNameFieldColumn = getTitleFieldAndNameField();
		const columns = getColumns();
		return titleFieldAndNameFieldColumn.concat(
			columns.filter((column: ColumnProps) => {
				return !titleFieldAndNameFieldColumn.some(
					(titleFieldColumn: ColumnProps) => {
						return titleFieldColumn.fieldname === column.fieldname;
					},
				);
			}),
		);
	}, [data, getTitleFieldAndNameField, getColumns]);

	const [dataError, setDataError] = useState<FrappeError | null>(null);
	const [countError, setCountError] = useState<FrappeError | null>(null);

	// Update the exported variable based on the haveTableName prop
  haveTableNameValue = haveTableName;

	/*  getCount
   * @param filters: Filter[]
   * @returns number
   */
	const getCount = async (
		filters: Filter[],
		childTableFilters?: any,
	): Promise<number> => {
		return call
			.post("frappe.desk.reportview.get_count", {
				doctype,
				filters: JSON.stringify([
					...(mandatoryFilters ?? []),
					...(childTableFilters ?? []),
					...filters,
				]),
				distinct: childTableFilters.length > 0 ? true : false,
			})
			.then((res: any) => {
				return res.message;
			})
			.catch((err: any) => {
				setCountError(err);
				// ;
			});
	};

	// escapeField is a function to escape field name with backticks for sql query as sometimes field name is reserved keyword
	const escapeField = (field: string): string => {
		return `\`${field}\``; // Wrap the field name with backticks
	};
	/*  getRowData
   * @param filters: Filter[]
   * @param groupBy: string | undefined
   * @param pageSize: number
   * @param startRow: number
   * @param otherFields: string[]
   * @param visibleColumns: (string | undefined)[]
   * @param orderBy: string
   * @param aggregate: aggregateProps
   * @returns any
   */
	const getRowData = async (
		filters: Filter[],
		groupBy: string | undefined,
		pageSize: number,
		startRow: number,
		otherFields: string[],
		visibleColumns: (string | undefined)[],
		orderBy: string,
		aggregate: aggregateProps,
		childTableFilters?: any,
	): Promise<any> => {
		return call
			.post("frappe.desk.reportview.get", {
				doctype,
				fields: JSON.stringify(
					groupBy
						? [groupBy]
						: [
							"name",
							"_liked_by",
							"modified",
							...visibleColumns,
							...otherFields,
						],
				),
				filters: JSON.stringify([
					...(mandatoryFilters ?? []),
					...(childTableFilters ?? []),
					...filters,
				]),
				start: startRow,
				page_length: pageSize,
				view: "Report",
				// Add special handling for CG Task Instance orderBy
				order_by: defaultOrderBy ? defaultOrderBy : orderBy,
				aggregate_on_doctype: groupBy ? doctype : undefined,
				group_by: groupBy ? escapeField(groupBy) : "name",
				// aggregate_function: groupBy && aggregate.aggFunc,
				aggregate_function: groupBy
					? (aggregate.aggFunc ?? "count")
					: undefined,
				// aggregate_on_field: groupBy && aggregate.fieldName
				aggregate_on_field: groupBy
					? (aggregate.fieldName ?? "name")
					: undefined,
			})
			.then((r) => {
				const rowData: any[] = [];
				if (r && r.message) {
					const keys: string[] = r.message?.keys;

					const values: string[][] = r.message?.values;

					const _user_info: Record<string, UserInfo> = r.message?.user_info;

					values &&
						values.length &&
						values.forEach((row: string[]) => {
							let obj: Record<string, any> = {};
							keys.map((key, index) => {
								// check if aggregate column because result from serve for aggregate column is with key name _aggregate_column
								// so we need to change it to actual field name
								if (key === "_aggregate_column") {
									obj[aggregate.field ?? "childCount"] = row[index];
								} else {
									obj[key] = row[index];
								}
							});
							obj["_user_info"] = _user_info;
							rowData.push(obj);
						});
				}

				return rowData;
			})
			.catch((err: any) => {
				setDataError(err);
				// 
			});
	};

	// getRowDataAndCount by combining getCount and getRowData
	const getRowDataAndCount = async (
		filters: Filter[],
		groupBy: string | undefined,
		pageSize: number,
		startRow: number,
		otherFields: string[],
		visibleColumns: (string | undefined)[],
		orderBy: string,
		aggregate: aggregateProps,
		childTableFilters?: any,
	): Promise<{
		count: number;
		rowData: any;
	}> => {
		const count = await getCount(filters, childTableFilters);
		const rowData = await getRowData(
			filters,
			groupBy,
			pageSize,
			startRow,
			otherFields,
			visibleColumns,
			orderBy,
			aggregate,
			childTableFilters,
		);

		return {
			count,
			rowData,
		};
	};

	

	return (
		<div className="flex flex-col gap-4 w-full h-full">
			{isLoading && <FullPageLoader />}
			<ErrorBanner error={error} />
			<ErrorBanner error={dataError} />
			<ErrorBanner error={countError} />
			{data && columns && !countError && !dataError && (
				<DataGridStateManager
					doctype={doctype}
					defaultFilters={defaultFilters}
					columns={columnDefs ?? columns}
					mandatoryFilters={mandatoryFilters}
					getRowDataAndCount={getRowDataAndCount}
					otherFields={otherFields}
					leftChild={leftChild}
					rightChild={rightChild}
					saveLoadLayout={saveLoadLayout}
					agGridProps={agGridProps}
					customComponents={showActions ? ActionsMenu : undefined}
					customComponentChildren={customActions}
					showModifiedColumn={showModifiedColumn}
					showCheckboxColumn={showCheckboxColumn} // Pass the new prop
				/>
			)}
		</div>
	);
};

export default DoctypeList;

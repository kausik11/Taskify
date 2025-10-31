import {
	convertFrappeDateStringToReadableDate,
	convertFrappeTimestampToReadableDateTime,
	convertFrappeTimeStringToReadableTime,
	convertFrappeTimestampToTimeAgo,
	convertFrappeTimestampToCalendarTime,
} from "@/utils/dateconversion";
import {
	ColumnVO,
	SortModelItem,
	ValueFormatterParams,
} from "ag-grid-community";
import { Filter } from "frappe-react-sdk";

// function to check filter is already present or not and update it
export const checkFilters = (filter: Filter, filtersArray: Filter[]) => {
	// check if filter is already present
	// if present then update it
	// else add it to filters

	const index = filtersArray.findIndex((f) => f[0] === filter[0]);
	if (index === -1) {
		filtersArray.push(filter);
	} else {
		filtersArray[index] = filter;
	}
};

export interface filterModelValue {
  filter: string;
  filterType: string;
  values: string[];
  filterTo?: string;
  type: string;
}
const getFilter = (key: string, value: filterModelValue) => {
	// check filterType first like it is text, number, date,check ,link etc
	// if filterType is text then check type like it is contains, equals, startswith, endswith
	if (value.filterType === "text") {
		return getTextFilter(key, value);
	} else if (value.filterType === "link") {
		return getLinkFilter(key, value);
	} else if (value.filterType === "set") {
		return getSetFilter(key, value);
	} else if (value.filterType === "number") {
		return getNumberFilter(key, value);
	} else if (value.filterType === "date") {
		return getNumberFilter(key, value);
	} else if (value.filterType === "check") {
		return equalsFilter(key, value);
	}

	return [key, "like", `%${value.filter}%`];
};

export const addFilters = (filterModel: any) => {
	// check if filterModel is empty, if empty set filters to empty array
	let filters: Filter[] = [];
	Object.entries(filterModel).forEach(([key, value]) => {
		// @ts-ignore
		const filter: Filter = getFilter(key, value);
		checkFilters(filter, filters);
	});

	return filters;
};

export const checkGroupBy = (
	rowGroupCols: ColumnVO[],
	groupKeys: string[],
	filters: Filter[],
) => {
	// check first if rowGroupCols is empty
	// if empty, set groupBy to undefined
	// else check if groupKeys is empty
	// if groupKeys is not empty then add by index mapping with rowGroupCols add to filters
	// if length of groupKeys and rowGroupCols is same then set groupBy to undefined and add to filters
	let groupBy: string | undefined = undefined;
	if (rowGroupCols.length === 0) {
		groupBy = undefined;
	} else {
		if (groupKeys.length === 0) {
			groupBy = rowGroupCols[0].field;
		} else {
			if (groupKeys.length === rowGroupCols.length) {
				groupBy = undefined;
				groupKeys.map((key, index) => {
					checkFilters(
						[rowGroupCols[index].field as string, "=", key],
						filters,
					);
				});
			} else {
				groupBy = rowGroupCols[groupKeys.length].field;
				groupKeys.map((key, index) => {
					checkFilters(
						[rowGroupCols[index].field as string, "=", key],
						filters,
					);
				});
			}
		}
	}

	return groupBy;
};

export const getOrderBy = (sortModel: SortModelItem[]) => {
	// check if sortModel is empty, if empty set orderBy to modified desc
	// else map sortModel and set orderBy comma separated
	let orderBy = "modified desc";
	if (sortModel.length === 0) {
		orderBy = "modified desc";
	} else {
		const newOrderBy = sortModel
			.filter((sort) => sort.colId !== "ag-Grid-AutoColumn")
			?.map((sort) => `${sort.colId} ${sort.sort}`)
			.join(", ");
		if (newOrderBy === "") {
			orderBy = "modified desc";
		}
		orderBy = newOrderBy;
	}

	return orderBy;
};

export const getAggregate = (valueCols: ColumnVO[]) => {
	// check if valueCols is empty, if empty set aggregate to undefined
	// else set aggregate to last valueCol

	const length = valueCols.length;
	let aggregate =
    length > 0
    	? {
    		field: valueCols?.[length - 1]?.field,
    		aggFunc: valueCols?.[length - 1]?.aggFunc,
    		fieldName:
            valueCols?.[length - 1]?.aggFunc === "count"
            	? "name"
            	: valueCols?.[length - 1]?.field,
    	}
    	: {
    		field: undefined,
    		aggFunc: undefined,
    		fieldName: undefined,
    	};

	return aggregate;
};

export const getTextFilter = (key: string, value: filterModelValue) => {
	// check type first like it is like, equals, startswith, endswith....
	// if type is not present then set it to like

	switch (value.type) {
	case "like":
		return containsFilter(key, value);
	case "equals":
		return equalsFilter(key, value);
	case "startsWith":
		return startswithFilter(key, value);
	case "endsWith":
		return endswithFilter(key, value);
	case "notLike":
		return notcontainsFilter(key, value);
	case "notEqual":
		return notequalsFilter(key, value);
	case "blank":
		return blankFilter(key, value);
	case "notBlank":
		return notblankFilter(key, value);
	case "in":
		const values = value.filter.split(",").map((v) => v.trim());
		return [key, "in", values] as Filter;
	default:
		return [key, "like", `%${value.filter}%`] as Filter;
	}
};

export const getLinkFilter = (key: string, value: filterModelValue) => {
	if (value.type === "notIn" || value.type === "notEqual") {
		if (value.filter.length === 1) {
			return [key, "!=", value.filter[0]] as Filter;
		} else {
			// @ts-ignore
			return [key, "notIn", value.filter] as Filter;
		}
	} else {
		if (value.filter.length === 1) {
			return [key, "=", value.filter[0]] as Filter;
		} else {
			// @ts-ignore
			return [key, "in", value.filter] as Filter;
		}
	}
};

export const getSetFilter = (key: string, value: filterModelValue) => {
	if (value.values.length === 1) {
		if (value.values[0] === null) {
			// @ts-ignore
			return [key, "is", "not set"] as Filter;
		} else {
			return [key, "=", value.values[0]] as Filter;
		}
	} else {
		return [key, "in", value.values] as Filter;
	}
};

export const getNumberFilter = (key: string, value: filterModelValue) => {
	switch (value.type) {
	case "equals":
		return equalsFilter(key, value);
	case "notEqual":
		return notequalsFilter(key, value);
	case "lessThan":
		return [key, "<", value.filter] as Filter;
	case "lessThanOrEqual":
		return [key, "<=", value.filter] as Filter;
	case "greaterThan":
		return [key, ">", value.filter] as Filter;
	case "greaterThanOrEqual":
		return [key, ">=", value.filter] as Filter;
	case "between":
		return [key, "between", [value.filter, value.filterTo]] as Filter;
	case "Timespan":
		return [key, "Timespan", value.filter] as Filter;
	case "blank":
		return blankFilter(key, value);
	case "notBlank":
		return notblankFilter(key, value);
	default:
		return [key, "=", value.filter] as Filter;
	}
};

export const containsFilter = (key: string, value: filterModelValue) =>
  [key, "like", `%${value.filter}%`] as Filter;

export const equalsFilter = (key: string, value: filterModelValue) =>
  [key, "=", value.filter] as Filter;

export const startswithFilter = (key: string, value: filterModelValue) =>
  [key, "like", `${value.filter}%`] as Filter;

export const endswithFilter = (key: string, value: filterModelValue) =>
  [key, "like", `%${value.filter}`] as Filter;

// @ts-ignore
export const notcontainsFilter = (key: string, value: filterModelValue) =>
  [key, "not like", `%${value.filter}%`] as Filter;

export const notequalsFilter = (key: string, value: filterModelValue) =>
  [key, "!=", value.filter] as Filter;

export const blankFilter = (key: string, value: filterModelValue) =>
  [key, "=", ""] as Filter;

export const notblankFilter = (key: string, value: filterModelValue) =>
  [key, "!=", ""] as Filter;

export const getCleanFilterValue = (value: string | string[] | number) => {
	// remove % from start and end of string
	// remove % from between string
	if (typeof value === "string") {
		return cleanValue(value);
	} else if (typeof value === "number") {
		return value;
	} else {
		return value.map((v) => cleanValue(v));
	}
};

export const cleanValue = (value: string) => {
	if (value?.startsWith("%")) {
		value = value.slice(1);
	}
	if (value?.endsWith("%")) {
		value = value.slice(0, -1);
	}
	if (value?.includes("%")) {
		value = value.replace("%", "");
	}

	return value;
};

export const getFilterModel = (filter: Filter, filterType: string) => {
	if (filterType === "agTextColumnFilter") {
		return {
			[filter[0]]: {
				filterType: "text",
				type: getFilterType(filter[1]),
				filter: getCleanFilterValue(filter[2] as string),
			},
		};
	} else if (filterType === "agNumberColumnFilter") {
		return {
			[filter[0]]: {
				filterType: "number",
				type: getFilterType(filter[1]),
				filter: getCleanFilterValue(filter[2] as string),
			},
		};
	} else if (filterType === "agSetColumnFilter") {
		return {
			[filter[0]]: {
				filterType: "set",
				type: getFilterType(filter[1]),
				// @ts-ignore
				values:
          typeof filter[2] === "string"
          	? [
          		filter[1] === "is" && filter[2] === "not set"
          			? ""
          			: getCleanFilterValue(filter[2]),
          	]
          	: getCleanFilterValue(filter[2] as string[]),
			},
		};
	} else if (filterType === "checkFilters") {
		return {
			[filter[0]]: {
				filterType: "check",
				type: getFilterType(filter[1]),
				filter: getCleanFilterValue(filter[2] as string),
			},
		};
	} else if (filterType === "dateFilters") {
		return {
			[filter[0]]: {
				filterType: "date",
				type: getFilterType(filter[1]),
				// @ts-ignore
				filter:
          getFilterType(filter[1]) === "between"
          	? getCleanFilterValue(filter[2][0])
          	: getCleanFilterValue(filter[2]),
				//  @ts-ignore
				filterTo:
          getFilterType(filter[1]) === "between"
          	? getCleanFilterValue(filter[2][1])
          	: undefined,
			},
		};
	} else if (filterType === "linkFilters") {
		return {
			[filter[0]]: {
				filterType: "link",
				type: getFilterType(filter[1]),
				filter:
          typeof filter[2] === "string"
          	? [getCleanFilterValue(filter[2])]
          	: getCleanFilterValue(filter[2] as string[]),
			},
		};
	}
	return null;
};

export const getFilterType = (filterType: string) => {
	switch (filterType) {
	case "like":
		return "like";
	case "not like":
		return "notLike";
	case "=":
		return "equals";
	case "!=":
		return "notEqual";
	case "<":
		return "lessThan";
	case "<=":
		return "lessThanOrEqual";
	case ">":
		return "greaterThan";
	case ">=":
		return "greaterThanOrEqual";
	case "in":
		return "in";
	case "not in":
		return "notIn";
	case "between":
		return "between";
	case "Timespan":
		return "Timespan";
	default:
		return "like";
	}
};

export const getFilterTypeFromFieldType = (fieldtype: string) => {
	if (["Date", "Datetime", "Time"].includes(fieldtype)) {
		return "dateFilters";
	} else if (["Currency", "Float", "Int", "Percent"].includes(fieldtype)) {
		return "agNumberColumnFilter";
	} else if (["Link", "Dynamic Link"].includes(fieldtype)) {
		return "linkFilters";
	} else if (fieldtype === "Check") {
		return "checkFilters";
	} else if (fieldtype === "Select") {
		return "agSetColumnFilter";
	} else if (fieldtype === "Data") {
		return "agTextColumnFilter";
	} else if (fieldtype === "Image" || fieldtype === "Attach Image") {
		return false;
	} else {
		return "agTextColumnFilter";
	}
};

export const getFilterParamsFromFieldType = (
	fieldtype: string,
	headerName?: string,
	doctype?: string,
	options?: string[],
) => {
	if (["Date", "Datetime", "Time"].includes(fieldtype)) {
		return {
			format:
        fieldtype === "Date"
        	? "date"
        	: fieldtype === "Datetime"
        		? "datetime"
        		: "time",
			defaultOption: "equals",
			floatingFilter: true,
			headerName: headerName ?? "Date",
			maxNumConditions: 1,
		};
	} else if (["Currency", "Float", "Int", "Percent"].includes(fieldtype)) {
		return {
			floatingFilter: true,
			maxNumConditions: 1,
			filterOptions: [
				{
					displayKey: "equals",
					displayName: "Equals",
					test: (filterValue: any, cellValue: any) => {
						return cellValue == filterValue;
					},
					hideFilterInput: true,
				},
				{
					displayKey: "notEqual",
					displayName: "Not Equal",
					test: (filterValue: any, cellValue: any) => {
						return cellValue != filterValue;
					},
					hideFilterInput: true,
				},
				{
					displayKey: "lessThan",
					displayName: "Less Than",
					test: (filterValue: any, cellValue: any) => {
						return cellValue < filterValue;
					},
					hideFilterInput: true,
				},
				{
					displayKey: "lessThanOrEqual",
					displayName: "Less Than Or Equal",
					test: (filterValue: any, cellValue: any) => {
						return cellValue <= filterValue;
					},
					hideFilterInput: true,
				},
				{
					displayKey: "greaterThan",
					displayName: "Greater Than",
					test: (filterValue: any, cellValue: any) => {
						return cellValue > filterValue;
					},
					hideFilterInput: true,
				},
				{
					displayKey: "greaterThanOrEqual",
					displayName: "Greater Than Or Equal",
					test: (filterValue: any, cellValue: any) => {
						return cellValue >= filterValue;
					},
					hideFilterInput: true,
				},
			],
		};
	} else if (["Link", "Dynamic Link"].includes(fieldtype)) {
		return {
			doctype: doctype,
		};
	} else if (fieldtype === "Check") {
		return {
			headerName: headerName ?? "Check",
		};
	} else if (fieldtype === "Select") {
		return {
			values: options && options.length > 0 ? options : [],
		};
	} else if (fieldtype === "Data") {
		return {
			floatingFilter: true,
			maxNumConditions: 1,
			defaultOption: "like",
			filterOptions: [
				{
					displayKey: "equals",
					displayName: "Equals",
					test: (filterValue: any, cellValue: any) => {
						return cellValue == filterValue;
					},
					hideFilterInput: true,
				},
				{
					displayKey: "notEqual",
					displayName: "Not Equal",
					test: (filterValue: any, cellValue: any) => {
						return cellValue != filterValue;
					},
					hideFilterInput: true,
				},
				{
					displayKey: "like",
					displayName: "Like",
					test: (filterValue: any, cellValue: any) => {
						return cellValue.indexOf(filterValue) >= 0;
					},
				},
				{
					displayKey: "notLike",
					displayName: "Not Like",
					test: (filterValue: any, cellValue: any) => {
						return cellValue.indexOf(filterValue) === -1;
					},
				},
				{
					displayKey: "in",
					displayName: "In",
					test: (filterValue: any, cellValue: any) => {
						return filterValue
							.split(",")
							.some((value: string) => cellValue.includes(value.trim()));
					},
				},
			],
		};
	} else {
		return {
			floatingFilter: true,
			maxNumConditions: 1,
			defaultOption: "like",
			autoComplete: false,
			filterOptions: [
				{
					displayKey: "equals",
					displayName: "Equals",
					test: (filterValue: any, cellValue: any) => {
						return cellValue == filterValue;
					},
					hideFilterInput: true,
				},
				{
					displayKey: "notEqual",
					displayName: "Not Equal",
					test: (filterValue: any, cellValue: any) => {
						return cellValue != filterValue;
					},
					hideFilterInput: true,
				},
				{
					displayKey: "like",
					displayName: "Like",
					test: (filterValue: any, cellValue: any) => {
						return cellValue.indexOf(filterValue) >= 0;
					},
				},
				{
					displayKey: "notLike",
					displayName: "Not Like",
					test: (filterValue: any, cellValue: any) => {
						return cellValue.indexOf(filterValue) === -1;
					},
				},
				{
					displayKey: "in",
					displayName: "In",
					test: (filterValue: any, cellValue: any) => {
						return filterValue
							.split(",")
							.some((value: string) => cellValue.includes(value.trim()));
					},
				},
			],
		};
	}
};

export const getEnableRowGroup = (fieldtype: string) => {
	if (["Currency", "Float", "Int", "Percent", "Number"].includes(fieldtype)) {
		return false;
	}
	return true;
};

export const getEnableValue = (fieldtype: string) => {
	if (["Currency", "Float", "Int", "Percent", "Number"].includes(fieldtype)) {
		return true;
	}
	return false;
};

/** Common function to get the value formatter for different field types */
export const getValueFormatter = (fieldtype: string, options?: string, showHours?: boolean) => {
	if (fieldtype === "Date") {
		return (params: ValueFormatterParams) =>
			convertFrappeDateStringToReadableDate(params.value);
	} else if (fieldtype === "Datetime") {
		return (params: ValueFormatterParams) =>
			convertFrappeTimestampToReadableDateTime(params.value);
	} else if (fieldtype === "Time") {
		return (params: ValueFormatterParams) =>
			convertFrappeTimeStringToReadableTime(params.value);
	} else if (fieldtype === "timeago") {
		return (params: ValueFormatterParams) =>
			convertFrappeTimestampToTimeAgo(params.value, true, showHours);
	} else if (fieldtype === "calendartime") {
		return (params: ValueFormatterParams) =>
			convertFrappeTimestampToCalendarTime(params.value);
	} else {
		return undefined;
	}
};

/** Common function to get the column definition for different field types */
export const getType = (fieldtype: string) => {
	if (["Currency", "Float", "Int"].includes(fieldtype)) {
		return "rightAligned";
	} else {
		return undefined;
	}
};

export const createFilterStateFromFilterModel = (
	key: string,
	filterModel: any,
) => {
	let filter: Filter = ["", "like", ""];
	if (filterModel[key].filterType === "text") {
		filter = getTextFilter(key, filterModel[key]);
	} else if (filterModel[key].filterType === "link") {
		filter = getLinkFilter(key, filterModel[key]);
	} else if (filterModel[key].filterType === "set") {
		filter = getSetFilter(key, filterModel[key]);
	} else if (filterModel[key].filterType === "number") {
		filter = getNumberFilter(key, filterModel[key]);
	} else if (filterModel[key].filterType === "date") {
		filter = getNumberFilter(key, filterModel[key]);
	} else if (filterModel[key].filterType === "check") {
		filter = equalsFilter(key, filterModel[key]);
	}

	return filter;
};

export const getTableLayoutAndState = (doctype: string) => {
	const tableLayout = JSON.parse(
		window.localStorage.getItem(`${doctype}-layout`) ?? "{}",
	);
	const tableState = JSON.parse(
		window.sessionStorage.getItem(`${doctype}-state`) ?? "{}",
	);

	const localColumnState = tableLayout?.column_state ?? [];
	const localSortModel = tableLayout?.sort_model ?? [];
	const sessionFilters = tableState?.filters ?? [];
	const sessionGroupState = tableState?.group_state ?? [];
	const sessionAggregate = tableState?.aggregate ?? [];

	return {
		localColumnState,
		localSortModel,
		sessionFilters,
		sessionGroupState,
		sessionAggregate,
	};
};

export const setFilterToSessionStorage = (doctype: string, filters: any) => {
	const { sessionAggregate, sessionGroupState } =
    getTableLayoutAndState(doctype);
	const sessionState = {
		group_state: sessionGroupState,
		aggregate: sessionAggregate,
		filters: filters,
	};
	window.localStorage.removeItem(`${doctype}-layout-id`);
	window.localStorage.removeItem(`${doctype}-layout`);
	window.sessionStorage.setItem(
		`${doctype}-state`,
		JSON.stringify(sessionState),
	);
};

export const setChildTableFilterToSessionStorage = (
	doctype: string,
	filters: any,
) => {
	window.sessionStorage.removeItem(`${doctype}-state`);
	window.localStorage.removeItem(`${doctype}-layout-id`);
	window.localStorage.removeItem(`${doctype}-layout`);
	window.sessionStorage.setItem(
		`${doctype}-child-table-filters`,
		JSON.stringify(filters),
	);
};

export const clearLocalAndSessionStorage = (doctype: string) => {
	// clear local and session storage
	window.localStorage.removeItem(`${doctype}-layout-id`);
	window.localStorage.removeItem(`${doctype}-layout`);
	window.sessionStorage.removeItem(`${doctype}-state`);
	window.sessionStorage.removeItem(`${doctype}-child-table-filters`);
};

export const scrub = (text: string) => {
	return text
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");
};

export const unscrub = (text: string) => {
	if (!text) return text;

	return text
		.replace(/_/g, " ")
		.split(" ")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
};

export const setSelectedRowToSessionStorage = (doctype: string, selectedRow: any) => {
	// set selected row to session storage

	// clear existing selected row
	clearSelectedRowFromSessionStorage(doctype)
	window.sessionStorage.setItem(`${doctype}-selected-row`, JSON.stringify(selectedRow))
}

export const getSelectedRowFromSessionStorage = (doctype: string) => {
	// get selected row from session storage
	const selectedRow = window.sessionStorage.getItem(`${doctype}-selected-row`)
	if (selectedRow) {
		return JSON.parse(selectedRow)
	}

	return null
}

export const clearSelectedRowFromSessionStorage = (doctype: string) => {
	// clear selected row from session storage
	window.sessionStorage.removeItem(`${doctype}-selected-row`)
}
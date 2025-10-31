import { useMemo } from 'react';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { ColDef } from 'ag-grid-community';

// Types
export interface FrappeReportColumn {
  fieldname: string;
  label: string;
  fieldtype: string;
}

export interface FrappeReportResponse {
  columns: FrappeReportColumn[];
  result: any[];
}

export interface FrappeReportFilters {
  company_id?: string;
  department?: string;
  branch?: string;
  score_tab?: string;
  from_date?: string;
  to_date?: string;
  task_status?: string[];
  [key: string]: any;
}

export interface UseFrappeReportOptions {
  reportName: string;
  filters?: FrappeReportFilters;
  enabled?: boolean;
}

// Custom hook for Frappe reports
export const useFrappeReport = ({
	reportName,
	filters = {},
	enabled = true
}: UseFrappeReportOptions) => {
	const cleanedFilters = useMemo(() => {
		const cleaned: Record<string, any> = {};
		
		Object.entries(filters).forEach(([key, value]) => {
			// Keep arrays (like task_status) even if they contain values
			if (Array.isArray(value)) {
				if (value.length > 0) {
					cleaned[key] = value;
				}
			} else if (value !== undefined && value !== null && value !== '') {
				cleaned[key] = value;
			}
		});
		
		return cleaned;
	}, [filters]);

	
	const { data, error, isLoading, mutate } = useFrappeGetCall<{ message: FrappeReportResponse }>(
		'frappe.desk.query_report.run',
		{
			report_name: reportName,
			filters: cleanedFilters,
		},
		undefined,
		{
			shouldFetch: enabled,
		}
	);

	const reportData = useMemo(() => ({
		columns: data?.message?.columns || [],
		result: data?.message?.result || [],
		raw: data?.message,
	}), [data]);

	return {
		...reportData,
		error,
		isLoading,
		refetch: mutate,
	};
};

// Hook for extracting unique values from report data
export const useReportFilterOptions = (data: any[], fields: string[]) => {
	return useMemo(() => {
		const options: Record<string, string[]> = {};

		fields.forEach(field => {
			const values = new Set<string>();
			data?.forEach((row: any) => {
				const value = row[field];
				if (value) {
					// Handle fields that might have hyphenated values (like "Department - Code")
					const cleanValue = typeof value === 'string' && value.includes('-')
						? value.split('-')[0].trim()
						: value;
					if (cleanValue) {
						values.add(cleanValue);
					}
				}
			});
			options[field] = Array.from(values).sort();
		});

		return options;
	}, [data, fields]);
};

// Hook for AG Grid column definitions
export const useAGGridColumns = (
	columns: FrappeReportColumn[],
	filterOptions: Record<string, string[]> = {},
	excludeFields: string[] = ['user_image']
) => {
	return useMemo(() => {
		if (!columns?.length) return [];

		const getFilterType = (fieldtype: string, fieldname: string): string => {
			if (filterOptions[fieldname]?.length > 0) {
				return 'agSetColumnFilter';
			}

			switch (fieldtype) {
			case 'Int':
			case 'Float':
			case 'Currency':
				return 'agNumberColumnFilter';
			case 'Date':
			case 'Datetime':
				return 'agDateColumnFilter';
			case 'Check':
				return 'agSetColumnFilter';
			default:
				return 'agTextColumnFilter';
			}
		};

		const getFilterParams = (fieldname: string, fieldtype: string) => {
			const baseParams = {
				buttons: ['reset'],
				closeOnApply: true,
				applyButton: false,
				debounceMs: 300,
			};

			if (filterOptions[fieldname]?.length > 0) {
				return { ...baseParams, values: filterOptions[fieldname] };
			}

			if (fieldtype === 'Check') {
				return { ...baseParams, values: ['Yes', 'No'] };
			}

			return {
				...baseParams,
				defaultOption: 'contains',
				textMatcher: ({ value, filterText }: { value: any; filterText: string }) => {
					if (!filterText) return false;
					return value?.toString().toLowerCase().includes(filterText.toLowerCase()) || false;
				},
				filterOptions: [
					'contains',
					'notContains',
					'equals',
					'notEqual',
					'startsWith',
					'endsWith',
				],
			};
		};

		const getCellRenderer = (fieldname: string) => (params: any) => {
			const value = params.value;

			if (!value) return '-';

			// Handle hyphenated values (show only the part before the hyphen)
			if (typeof value === 'string' && value.includes('-')) {
				return value.split('-')[0].trim();
			}

			return value;
		};

		return columns
			.filter((col) => !excludeFields.includes(col.fieldname))
			.map((col): ColDef => ({
				headerName: col.label,
				field: col.fieldname,
				filter: getFilterType(col.fieldtype, col.fieldname),
				floatingFilter: false,
				filterParams: getFilterParams(col.fieldname, col.fieldtype),
				sortable: true,
				resizable: true,
				enableRowGroup: true,
				enablePivot: true,
				enableValue: true,
				cellRenderer: getCellRenderer(col.fieldname),
				minWidth: 120,
				// Add specific configurations for certain field types
				...(col.fieldtype === 'Currency' && {
					cellRenderer: (params: any) => {
						const value = params.value;
						if (value == null) return '-';
						return new Intl.NumberFormat('en-US', {
							style: 'currency',
							currency: 'USD',
						}).format(value);
					},
				}),
				...(col.fieldtype === 'Date' && {
					cellRenderer: (params: any) => {
						const value = params.value;
						if (!value) return '-';
						return new Date(value).toLocaleDateString();
					},
				}),
				...(col.fieldtype === 'Check' && {
					cellRenderer: (params: any) => {
						const value = params.value;
						return value ? '✓' : '✗';
					},
				}),
			}));
	}, [columns, filterOptions, excludeFields]);
};

// Hook for AG Grid configuration
export const useAGGridConfig = () => {
	return useMemo(() => ({
		defaultColDef: {
			flex: 1,
			minWidth: 120,
			filter: true,
			floatingFilter: false,
			sortable: true,
			resizable: true,
			enableRowGroup: true,
			enablePivot: true,
			enableValue: true,
			menuTabs: ['filterMenuTab', 'generalMenuTab', 'columnsMenuTab'],
		} as ColDef,

		sideBar: {
			toolPanels: [
				{
					id: 'filters',
					labelDefault: 'Filters',
					labelKey: 'filters',
					iconKey: 'filter',
					toolPanel: 'agFiltersToolPanel',
					toolPanelParams: {
						suppressExpandAll: false,
						suppressFilterSearch: false,
					},
				},
				{
					id: 'columns',
					labelDefault: 'Columns',
					labelKey: 'columns',
					iconKey: 'columns',
					toolPanel: 'agColumnsToolPanel',
					toolPanelParams: {
						suppressRowGroups: false,
						suppressValues: false,
						suppressPivots: false,
						suppressPivotMode: false,
					},
				},
			],
			defaultToolPanel: null, // Closed by default
			position: 'right' as const,
			hidden: false,
		},

		gridOptions: {
			suppressCellFocus: true,
			animateRows: true,
			floatingFiltersHeight: 0,
			rowGroupPanelShow: 'always' as const,
			pivotPanelShow: 'always' as const,
			groupDisplayType: 'multipleColumns' as const,
			suppressDragLeaveHidesColumns: true,
		},
	}), []);
};
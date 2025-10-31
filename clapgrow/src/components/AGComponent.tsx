"use client";
import '../index.css'
import { useMemo, useRef } from "react";
import { AgGridReact } from "ag-grid-react";

import {
	ClientSideRowModelModule,
	ColDef,
	ModuleRegistry,
	RowSelectionOptions,
	ValidationModule,
	SideBarDef,
	Theme,
	themeQuartz,
} from "ag-grid-community";
import {
	ColumnsToolPanelModule,
	FiltersToolPanelModule,
	SetFilterModule,
	// RowGroupingModule,
	// RowSelectionModule,
	LicenseManager,
} from "ag-grid-enterprise";

// Register AG Grid modules once, outside the component
ModuleRegistry.registerModules([
	ClientSideRowModelModule,
	ColumnsToolPanelModule,
	FiltersToolPanelModule,
	SetFilterModule,
	ValidationModule,
	// RowGroupingModule, // Added for rowGroupPanelShow and pivotPanelShow
	// RowSelectionModule, // Added for rowSelection
]);

// Set the license key once, outside the component
const licenseKey = import.meta.env.VITE_GRID_LICENSE_KEY;
if (!licenseKey) {
	console.error(
		"AG Grid License Key is missing. Please set GRID_LICENSE_KEY in your environment variables.",
	);
} else {
	LicenseManager.setLicenseKey(licenseKey);
}

// Define theme outside the component to avoid re-creation
const myTheme = themeQuartz.withParams({
	selectedRowBackgroundColor: "rgba(202, 247, 237, 0.15)",
});

interface AGComponentProps {
  onRowClicked?: (data: any) => void;
  tableData?: any[];
  columnDefsMemo?: any[];
  tableType?:
    | "MemberSheet"
    | "TaskTable"
    | "RoleSheet"
    | "MemberInsightTable"
    | "BranchSheet"
    | "DeptSheet"
    | "OverAllDepartment"
    | null;
  TableHeight?: string;
}
const AGComponent: React.FC<AGComponentProps> = ({
	onRowClicked,
	tableData,
	columnDefsMemo,
	tableType,
	TableHeight,
}) => {
	const gridRef = useRef<AgGridReact>(null);

	const containerStyle = { width: "100%", height: TableHeight };

	const defaultColDef = useMemo<ColDef>(
		() => ({
			flex: tableType !== "TaskTable" ? 1 : 0,
			filter: true,
			sortable: true,
			resizable: true,
			headerClass: tableType !== "TaskTable" ? "ag-header-middle-align" : "",
		}),
		[tableType],
	);

	const autoGroupColumnDef = useMemo<ColDef>(() => {
		return {
			minWidth: 200,
			// headerClass: "ag-header-middle-align",
		};
	}, []);

	const sideBar = useMemo<
    SideBarDef | string | string[] | boolean | null
  >(() => {
  	return {
  		toolPanels: ["columns"],
  	};
  }, []);

	const handleRowClicked = (event: any) => {
		const target = event.event?.target;

		const isActionElement = (element: Element): boolean => {
			while (element) {
				if (
					(element.tagName === "INPUT" &&
            (element as HTMLInputElement).type === "checkbox") ||
          element.tagName === "svg" ||
          element.tagName === "path"
				) {
					return true;
				}
				element = element.parentElement;
			}
			return false;
		};

		if (event?.column && event?.column.getColDef().filter) {
			return;
		}

		if (isActionElement(target)) {
			return;
		}
		if (
			tableType === "TaskTable" ||
      tableType === "MemberSheet" ||
      tableType === "RoleSheet" ||
      tableType == "BranchSheet" ||
      tableType == "DeptSheet" ||
      tableType === "MemberInsightTable"
		) {
			onRowClicked(event.data);
		}
	};

	const rowSelection = useMemo<
    RowSelectionOptions | "single" | "multiple"
  >(() => {
  	return { mode: "multiRow" };
  }, []);

	return (
		<div
			style={containerStyle}
			className="max-md:min-w-[1200px] md:w-full w-full bg-[#F5F8FB] border-[1px] border-[#E6EBF7] px-[2px] py-[2px] rounded-t-[15px]"
		>
			<div style={{ width: "100%", height: "100%" }}>
				<AgGridReact
					ref={gridRef}
					rowData={tableData}
					columnDefs={columnDefsMemo}
					defaultColDef={defaultColDef}
					autoGroupColumnDef={autoGroupColumnDef}
					sideBar={sideBar}
					// rowGroupPanelShow={"always"}
					// pivotPanelShow={"always"}
					onRowClicked={handleRowClicked}
					// rowSelection={rowSelection}
					theme={myTheme}
				/>
			</div>
		</div>
	);
};

export default AGComponent;

import { useState } from "react";
import exportToPDF from "./common/ExportToPDF";
import exportToCSV from "./common/ExportToCSV";
import AGComponent from "./AGComponent";
import CommonHeader from "./common/CommonHeader";

interface TableData {
  full_name?: string;
  department?: string;
  kra?: string;
  kpi?: string;
  current_week_planned?: number;
  current_week_actual?: number;
  current_week_actual_percentage?: number;
  [key: string]: any;
}

interface TableComponentProps<T> {
  data: T[];
  TableName: string;
  setTableOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isTableOpen: boolean;
  FilterPart: JSX.Element;
  columnDefsMemo: any[];
  onRowClicked?: (event: any) => void; 
  isLoading?: boolean;
  fromDate: Date;
  toDate: Date;
}



const formatDate = (date: Date): string => {
  const day = date.getDate();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();

  // Function to get ordinal suffix
  const getOrdinal = (n: number) => {
    if (n >= 11 && n <= 13) return "th";
    switch (n % 10) {
      case 1: return "st";
      case 2: return "nd";
      case 3: return "rd";
      default: return "th";
    }
  };

  return `${day}${getOrdinal(day)} ${month} ${year}`;
};




function TableComponent<T extends TableData>({
  data,
  TableName,
  setTableOpen,
  isTableOpen,
  FilterPart,
  columnDefsMemo,
  onRowClicked,
  isLoading = false,
  fromDate,
  toDate,
}: TableComponentProps<T>) {
  const [isOpen, setIsOpen] = useState(false);


  const period = `${formatDate(fromDate)}, To,  ${formatDate(toDate)}`;


  // Flatten data for CSV/PDF exports
  const flattenedData = data.map((row) => ({
    team_member: row.full_name || "No name available",
    department: row.department || "",
    kra: row.kra || "",
    kpi: row.kpi || "",
    current_week_planned: row.current_week_planned || 0,
    current_week_actual: row.current_week_actual || 0,
    current_week_actual_percentage: row.current_week_actual_percentage || 0,
  }));

  // Handle CSV export
  const handleExportCSV = () => {
    exportToCSV(period,flattenedData, `${TableName.toLowerCase().replace(/\s/g, "_")}`);
  };

  // Handle PDF export
  const handleExportPDF = () => {
    exportToPDF(period,flattenedData, `${TableName.toLowerCase().replace(/\s/g, "_")}`);
  };

  return (
    <>
      <CommonHeader
        // setListSize={() => {}}
        TableName={TableName}
        setTableOpen={setTableOpen}
        isTableOpen={isTableOpen}
        FilterPart={FilterPart}
        handleExportCSV={handleExportCSV}
        handleExportPDF={handleExportPDF}
        setIsOpen={setIsOpen}
      />
      <div className="p-4 bg-white rounded-[15px] w-full">
        <div className="rounded-[15px] overflow-x-auto border-[1px] border-[#F0F1F2]">
          <AGComponent
            tableData={data}
            columnDefsMemo={columnDefsMemo}
            onRowClicked={onRowClicked}
            TableHeight="700px"
            isLoading={isLoading}
          />
        </div>
      </div>
    </>
  );
}

export default TableComponent;
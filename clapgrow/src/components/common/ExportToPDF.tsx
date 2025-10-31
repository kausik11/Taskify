import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ExportData {
  team_member?: string;
  department?: string;
  kra?: string;
  kpi?: string;
  current_week_planned?: number;
  current_week_actual?: number;
  current_week_actual_percentage?: number;
  [key: string]: any;
}

interface ExportToPDFOptions {
  title?: string;
  filename?: string;
  headers?: string[];
}

const exportToPDF = (period: string,data: ExportData[], name: string, options: ExportToPDFOptions = {}) => {
  // Validate input data
  if (!data || data.length === 0) {
    throw new Error("No data provided for PDF export");
  }

  const doc = new jsPDF();

  const defaultHeaders = [
    "Team Member",
    "Department",
    "KRA",
    "KPI",
    "Current Period Planned",
    "Current Period Actual",
    "Current Period Actual %",
  ];

  const headers = options.headers || defaultHeaders;

  const rows = data.map((row) => [
    row.team_member || "No name available",
    row.department ? row.department.split("-")[0]?.trim() || "N/A" : "N/A",
    row.kra || "N/A",
    row.kpi || "N/A",
    row.current_week_planned != null ? String(row.current_week_planned) : "0",
    row.current_week_actual != null ? String(row.current_week_actual) : "0",
    row.current_week_actual_percentage != null
      ? `${row.current_week_actual_percentage}%`
      : "0%",
  ]);

  // Set document title
  const formattedName = options.title || name.replace(/_/g, " ").toUpperCase();
  doc.setFontSize(18);
  doc.text(`${formattedName} REPORT`, 14, 20);

  const timestamp = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Kolkata",             // need to adjust this timezone as per requirement
    dateStyle: "medium",
    timeStyle: "short",
  });
  doc.setFontSize(10);
  doc.text(`Generated on: ${timestamp}`, 14, 28);
  doc.text(`Period: From, ${period}`, 150, 28, { align: "right" });

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 34,
    styles: { fontSize: 10, cellPadding: 2 },
    headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [240, 240, 240] },
    margin: { top: 34, left: 14, right: 14, bottom: 10 },
  });

  const safeFilename = options.filename || name.toLowerCase().replace(/[^a-z0-9]/g, "_");
  doc.save(`${safeFilename}.pdf`);
};

export default exportToPDF;
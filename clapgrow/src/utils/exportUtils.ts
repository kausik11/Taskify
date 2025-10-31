// // utils/exportUtils.ts
// import { toast } from "sonner";

// export const exportTasksUsingFrappeBuiltIn = async ({ filters, call }: { filters: any[], call: any }) => {
//   try {
//     const response = await call.post("frappe.desk.reportview.export_query", {
//       doctype: "CG Task Instance",
//       filters: JSON.stringify(filters),
//       fields: JSON.stringify([
//         "`name` as 'Task ID'",
//         "`task_name` as 'Task Name'", 
//         "`description` as 'Description'",
//         "`status` as 'Status'",
//         "`priority` as 'Priority'",
//         "`due_date` as 'Due Date'",
//         "`assigned_to` as 'Assigned To'",
//         "`assignee` as 'Assignee'",
//         "`task_type` as 'Task Type'",
//         "`tag` as 'Tag'",
//         "`branch` as 'Branch'",
//         "`department` as 'Department'",
//         "`is_completed` as 'Is Completed'",
//         "`completed_on` as 'Completed On'",
//         "`completed_by` as 'Completed By'",
//         "`creation` as 'Created Date'",
//         "`modified` as 'Last Modified'"
//       ]),
//       order_by: "status_priority_map asc",
//       file_format_type: "CSV"
//     });

//     if (response.message) {
//       // The response will contain a file URL
//       const downloadUrl = response.message;
      
//       // Create a temporary link to download the file
//       const link = document.createElement('a');
//       link.href = downloadUrl;
//       link.download = `tasks-export-${new Date().getTime()}.csv`;
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
      
//       return { success: true, message: "Export completed successfully" };
//     } else {
//       throw new Error("No export URL received from server");
//     }
    
//   } catch (error) {
//     console.error("Frappe export error:", error);
//     throw error;
//   }
// };

// // Usage function
// export const handleFrappeExport = async (filters: any[], call: any) => {
//   try {
//     const loadingToast = toast.loading("Preparing export...");
//     await exportTasksUsingFrappeBuiltIn({ filters, call });
//     toast.dismiss(loadingToast);
//     toast.success("Export completed successfully");
//   } catch (error) {
//     toast.error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
//   }
// };

// utils/exportUtils.ts - Complete implementation

import { toast } from "sonner";

/**
 * Export tasks using Frappe's built-in export functionality
 * This is more efficient for large datasets as it's handled server-side
 */
export const exportTasksUsingFrappeBuiltIn = async ({ 
  filters, 
  call 
}: { 
  filters: any[], 
  call: any 
}) => {
  try {

    // Use Frappe's built-in export functionality
    const response = await call.post("frappe.desk.reportview.export_query", {
      doctype: "CG Task Instance",
      filters: JSON.stringify(filters),
      fields: JSON.stringify([
        "`name` as 'Task ID'",
        "`task_name` as 'Task Name'", 
        "`description` as 'Description'",
        "`status` as 'Status'",
        "`priority` as 'Priority'",
        "`due_date` as 'Due Date'",
        "`assigned_to` as 'Assigned To'",
        "`assignee` as 'Assignee'",
        "`task_type` as 'Task Type'",
        "`tag` as 'Tag'",
        "`branch` as 'Branch'",
        "`department` as 'Department'",
        "`is_completed` as 'Is Completed'",
        "`completed_on` as 'Completed On'",
        "`completed_by` as 'Completed By'",
        "`creation` as 'Created Date'",
        "`modified` as 'Last Modified'",
        "`is_subtask` as 'Is Subtask'",
        "`parent_task_instance` as 'Parent Task'",
        "`upload_required` as 'Upload Required'",
        "`restrict` as 'Restrict Due Date'",
        "`delayed_time` as 'Delayed Time'"
      ]),
      order_by: "status_priority_map asc",
      file_format_type: "CSV"
    });

    if (response?.message) {
      // The response will contain a file URL
      const downloadUrl = response.message;
      
      // Ensure the URL is properly formatted
      let fullUrl = downloadUrl;
      if (!downloadUrl.startsWith('http')) {
        // If it's a relative URL, construct the full URL
        const baseUrl = window.location.origin;
        fullUrl = downloadUrl.startsWith('/') 
          ? `${baseUrl}${downloadUrl}` 
          : `${baseUrl}/${downloadUrl}`;
      }
      
      // Create a temporary link to download the file
      const link = document.createElement('a');
      link.href = fullUrl;
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      link.download = `tasks-export-${timestamp}.csv`;
      
      // Add to DOM, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return { 
        success: true, 
        message: "Export completed successfully",
        downloadUrl: fullUrl 
      };
    } else {
      console.error("No download URL in response:", response);
      throw new Error("No export URL received from server");
    }
    
  } catch (error) {
    console.error("Frappe export error:", error);
    
    // Enhanced error handling
    if (error?.response?.status === 403) {
      throw new Error("You don't have permission to export tasks");
    } else if (error?.response?.status === 404) {
      throw new Error("Export service not found");
    } else if (error?.response?.status >= 500) {
      throw new Error("Server error occurred during export");
    } else if (error?.message?.includes('network')) {
      throw new Error("Network error - please check your connection");
    } else if (error?.message) {
      throw new Error(error.message);
    } else {
      throw new Error("An unknown error occurred during export");
    }
  }
};

/**
 * Alternative export method using different Frappe API endpoint
 * Use this if the first method doesn't work in your environment
 */
export const exportTasksUsingAlternativeMethod = async ({ 
  filters, 
  call 
}: { 
  filters: any[], 
  call: any 
}) => {
  try {
    const response = await call.post("frappe.client.get_list", {
      doctype: "CG Task Instance",
      fields: [
        "name",
        "task_name", 
        "description",
        "status",
        "priority",
        "due_date",
        "assigned_to",
        "assignee",
        "task_type",
        "tag",
        "branch",
        "department",
        "is_completed",
        "completed_on",
        "completed_by",
        "creation",
        "modified",
        "is_subtask",
        "parent_task_instance",
        "upload_required",
        "restrict",
        "delayed_time"
      ],
      filters: filters,
      order_by: "status_priority_map asc",
      limit_page_length: 999999, // Large number to get all records
    });

    if (response?.message && Array.isArray(response.message)) {
      const data = response.message;
      
      // Convert data to CSV format
      const csvContent = convertToCSV(data);
      
      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      link.download = `tasks-export-${timestamp}.csv`;
      link.href = url;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(url);
      
      return { 
        success: true, 
        message: `Successfully exported ${data.length} tasks`,
        recordCount: data.length 
      };
    } else {
      throw new Error("No data received from server");
    }
    
  } catch (error) {
    console.error("Alternative export error:", error);
    throw error;
  }
};

/**
 * Convert array of objects to CSV string
 */
function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) {
    return '';
  }

  // Helper function to clean CSV values
  const cleanValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    
    let stringValue = String(value);
    
    // Remove HTML tags if present
    stringValue = stringValue.replace(/<[^>]*>/g, '');
    
    // Handle quotes by doubling them
    stringValue = stringValue.replace(/"/g, '""');
    
    // Wrap in quotes if contains comma, newline, or quote
    if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
      stringValue = `"${stringValue}"`;
    }
    
    return stringValue;
  };

  // Format boolean and date values
  const formatValue = (value: any, key: string): string => {
    if (value === null || value === undefined) return '';
    
    // Format boolean values
    if (key.includes('is_') || key.includes('upload_required') || key.includes('restrict')) {
      return value === 1 || value === true ? 'Yes' : 'No';
    }
    
    // Format dates
    if (key.includes('date') || key.includes('on') || key.includes('creation') || key.includes('modified')) {
      if (value && value !== '') {
        try {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return date.toISOString().replace('T', ' ').slice(0, 19);
          }
        } catch (e) {
          // If date parsing fails, return original value
        }
      }
    }
    
    return cleanValue(value);
  };

  // Create headers with friendly names
  const headers = {
    // 'name': 'Task ID',
    'task_name': 'Task Name',
    'description': 'Description',
    'status': 'Status',
    'priority': 'Priority',
    'due_date': 'Due Date',
    'assigned_to': 'Assigned To',
    'assignee': 'Assignee',
    'task_type': 'Task Type',
    'tag': 'Tag',
    'is_completed': 'Is Completed',
    'completed_on': 'Completed On',
    'completed_by': 'Completed By',
    'creation': 'Created Date',
    'modified': 'Last Modified',
    'is_subtask': 'Is Subtask',
    'upload_required': 'Upload Required',
    'restrict': 'Restrict Due Date',
    'delayed_time': 'Delayed Time'
  };

  // Get all unique keys from the data
  const allKeys = [...new Set(data.flatMap(Object.keys))];
  
  // Filter to only include keys we want to export
  const exportKeys = allKeys.filter(key => headers.hasOwnProperty(key));
  
  // Create header row
  const headerRow = exportKeys.map(key => `"${headers[key as keyof typeof headers]}"`).join(',');
  
  // Create data rows
  const dataRows = data.map(row => 
    exportKeys.map(key => formatValue(row[key], key)).join(',')
  );

  // Combine header and data with BOM for Excel compatibility
  return '\uFEFF' + [headerRow, ...dataRows].join('\n');
}

/**
 * Main export function with fallback mechanism
 * Tries the built-in method first, then falls back to alternative
 */
export const handleFrappeExport = async (filters: any[], call: any) => {
  let loadingToast: any = null;
  
  try {
    // Show loading toast
    loadingToast = toast.loading("Preparing export", {
      duration: 0, // Keep it until we dismiss it
    });


    try {
      // Try the built-in method first
      const result = await exportTasksUsingFrappeBuiltIn({ filters, call });
      
      // Dismiss loading and show success
      if (loadingToast) toast.dismiss(loadingToast);
      toast.success(result.message);
      return result;
      
    } catch (builtInError) {
      
      // Update loading message
      if (loadingToast) toast.dismiss(loadingToast);
      loadingToast = toast.loading("Trying alternative export method");
      
      try {
        // Try alternative method
        const result = await exportTasksUsingAlternativeMethod({ filters, call });
        
        // Dismiss loading and show success
        if (loadingToast) toast.dismiss(loadingToast);
        toast.success(result.message);
        
        return result;
        
      } catch (alternativeError) {
        console.error("Both export methods failed:", {
          builtInError,
          alternativeError
        });
        throw alternativeError;
      }
    }
    
  } catch (error) {
    console.error("Export process failed:", error);
    
    // Dismiss loading toast if still showing
    if (loadingToast) toast.dismiss(loadingToast);
    
    // Show error with appropriate message
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Export failed due to an unknown error';
      
    toast.error(`Export failed: ${errorMessage}`);
    
    // Re-throw for caller to handle if needed
    throw error;
  }
};
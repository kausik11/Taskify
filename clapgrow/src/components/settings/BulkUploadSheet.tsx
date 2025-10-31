import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useFrappeGetDocList, useFrappePostCall } from "frappe-react-sdk";
import { useContext, useState, useEffect, useCallback, useRef } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { UserContext } from "@/utils/auth/UserProvider";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Papa from "papaparse";
import {
  Upload,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  FileText,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Schema for form data validation
const formDataSchema = z
  .object({
    first_name: z
      .string()
      .min(1, "First name is required")
      .regex(/^[a-zA-Z\s]+$/, "Invalid First Name"),
    last_name: z
      .string()
      .optional()
      .refine((val) => !val || /^[a-zA-Z\s]+$/.test(val), {
        message: "Invalid Last Name",
      }),
    email: z
      .string()
      .email("Email is required")
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid Email Format"),
    phone: z
      .string()
      .min(10, "Phone number must be at least 10 digits")
      .max(15, "Phone number must be at most 15 digits")
      .regex(/^\+?[1-9]\d{9,14}$/, "Phone number must be numeric"),
    designation: z.string().optional(),
    branch_id: z.string().min(1, "Branch is required"),
    department_id: z.string().min(1, "Department is required"),
    role: z.string().min(1, "Role is required"),
    company_id: z.string().min(1, "Company is required"),
    ctc: z.coerce
      .number()
      .min(0, "CTC must be a positive number")
      .max(100000000, "CTC cannot exceed 100,000,000"),
    cost_per_hour: z.coerce
      .number()
      .min(0, "Cost per hour must be a positive number")
      .max(10000, "Cost per hour cannot exceed 10,000"),
    report_to: z.string().email("Report To must be a valid email").nullable().optional(),
    enabled: z.number().optional(),
  })
  .refine((data) => data.ctc >= data.cost_per_hour, {
    message: "CTC must be greater than or equal to the cost per hour",
    path: ["cost_per_hour"],
  });

interface BulkUploadProps {
  onBulkUploadComplete: () => void;
}

interface JobProgress {
  progress: number;
  created_count: number;
  error_count: number;
  status: string;
  message?: string;
  completed?: boolean;
}

interface JobResult {
  status: string;
  created_users: string[];
  skipped_users: string[];
  errors: string[];
  total_processed?: number;
  completed_at?: string;
}

interface ValidationError {
  rowIndex: number;
  error: string;
  invalidFields: string[];
  row: any;
}

// Helper function to extract error message from server response
const extractServerErrorMessage = (error: any): string => {
  try {
    if (error?._server_messages) {
      const serverMessages = JSON.parse(error._server_messages);
      if (Array.isArray(serverMessages) && serverMessages.length > 0) {
        const firstMessage = JSON.parse(serverMessages[0]);
        return firstMessage.message || error.message || "Server error occurred";
      }
    }
    return error?.message || error?.exc || "An unexpected error occurred";
  } catch (parseError) {
    return error?.message || "An unexpected error occurred";
  }
};

export default function BulkUpload({ onBulkUploadComplete }: BulkUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [skippedUsers, setSkippedUsers] = useState<string[]>([]);
  const [createdUsers, setCreatedUsers] = useState<string[]>([]);
  const [importErrors, setImportErrors] = useState<ValidationError[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>("");
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [fileReady, setFileReady] = useState(false);
  const [validatedData, setValidatedData] = useState<any[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [previewStartIndex, setPreviewStartIndex] = useState(0);
  const [showConfirmImport, setShowConfirmImport] = useState(false);
  const [currentImportItem, setCurrentImportItem] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const PREVIEW_ROWS_PER_PAGE = 10;
  const MAX_USERS_PER_BATCH = 1000;

  const { userDetails } = useContext(UserContext);

  // Get user company - fix the company logic
  const userCompanyId = userDetails?.[0]?.company_id || userDetails?.company_id;

  const { call: uploadCall } = useFrappePostCall("clapgrow_app.api.bulk_upload.bulk_upload_users");
  const { call: statusCall } = useFrappePostCall("clapgrow_app.api.bulk_upload.get_upload_status");
  const { call: progressCall } = useFrappePostCall("clapgrow_app.api.bulk_upload.get_upload_progress");

  // Fetch valid options for mapping
  const { data: branches, error: branchError, isLoading: isBranchLoading } = useFrappeGetDocList("CG Branch", {
    fields: ["name", "branch_name"],
  });
  const { data: departments, isLoading: isDepartmentLoading } = useFrappeGetDocList("CG Department", {
    fields: ["name", "department_name"],
  });
  const { data: roles, isLoading: isRoleLoading } = useFrappeGetDocList("CG Role", {
    fields: ["name", "role_name"],
  });

  const isDataLoading = isBranchLoading || isDepartmentLoading || isRoleLoading;

  if (branchError) {
    toast.error("Failed to fetch branches. Please try again.", { duration: 5000 });
  }

  // Create mapping dictionaries
  const branchMap = branches ? Object.fromEntries(branches.map(b => [b.branch_name, b.name])) : {};
  const departmentMap = departments ? Object.fromEntries(departments.map(d => [d.department_name, d.name])) : {};
  const roleMap = roles ? Object.fromEntries(roles.map(r => [r.role_name, r.name])) : {};

  // Cleanup function for polling interval
  const clearPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Enhanced resetDialog function
  const resetDialog = useCallback(() => {
    clearPolling();
    setFile(null);
    setFileName(null);
    setJobId(null);
    setJobStatus("");
    setProgress(null);
    setImportProgress(0);
    setValidationErrors([]);
    setSkippedUsers([]);
    setCreatedUsers([]);
    setImportErrors([]);
    setTotalUsers(0);
    setIsImporting(false);
    setFileReady(false);
    setValidatedData([]);
    setShowFullPreview(false);
    setPreviewStartIndex(0);
    setIsDragOver(false);
    setShowConfirmImport(false);
    setCurrentImportItem("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [clearPolling]);

  // Enhanced handleJobCompletion with better state management
  const handleJobCompletion = useCallback((response: JobResult) => {
    // Stop polling immediately - this is crucial
    clearPolling();

    // Update all states immediately
    setJobStatus(response.status);
    setCreatedUsers(response.created_users || []);
    setSkippedUsers(response.skipped_users || []);

    // Convert string errors to ValidationError format for consistent display
    const errorList = (response.errors || []).map((error, index) => ({
      rowIndex: index + 1,
      error: error,
      invalidFields: [],
      row: {}
    }));
    setImportErrors(errorList);

    // Final state updates - ensure these happen
    setProgress(null);
    setImportProgress(100); // Ensure progress is 100%
    setCurrentImportItem("Import completed");
    setIsImporting(false); // Stop importing state

    const successCount = response.created_users?.length || 0;
    const skipCount = response.skipped_users?.length || 0;
    const errorCount = response.errors?.length || 0;

    // Show appropriate toast
    if (response.status === "success") {
      toast.success(`Successfully imported ${successCount} users!`, { duration: 8000 });
    } else if (response.status === "partial_success") {
      toast.warning(`Import partially completed: ${successCount} users created, ${skipCount} skipped, ${errorCount} failed.`, { duration: 10000 });
    } else if (response.status === "failed") {
      toast.error(`Import failed: ${errorCount} errors occurred. Check the error log below.`, { duration: 10000 });
    }

    // Notify parent component
    onBulkUploadComplete();

    // Auto-close on success after delay
    if (response.status === "success") {
      setTimeout(() => {
        setIsOpen(false);
        resetDialog();
      }, 3000);
    }
  }, [clearPolling, onBulkUploadComplete, resetDialog]);

  // Improved polling for job status
  // Improved polling for job status with proper response structure handling
  const pollJobStatus = useCallback(async (currentJobId: string): Promise<boolean> => {
    if (!currentJobId) {
      console.error("No job ID provided for polling");
      setIsImporting(false);
      return true;
    }


    try {
      const progressResponse = await progressCall({ job_id: currentJobId });

      if (progressResponse && !progressResponse.error) {
        // Handle nested response structure from Frappe
        const progressData = progressResponse.message || progressResponse;

        // Check for completion first - this is the key fix
        if (progressData.completed || progressData.progress >= 100 || progressData.status === "completed") {

          // Immediately update UI states
          setImportProgress(100);
          setCurrentImportItem("Import completed successfully!");

          // Get final detailed status
          try {
            const statusResponse = await statusCall({ job_id: currentJobId });
            // Handle nested response structure for status as well
            const statusData = statusResponse.message || statusResponse;

            if (statusData) {
              handleJobCompletion(statusData);
            } else {
              // Create fallback completion response
              handleJobCompletion({
                status: progressData.status === "completed" ? "success" : "partial_success",
                created_users: Array(progressData.created_count || 0).fill("user@example.com"),
                skipped_users: [],
                errors: Array(progressData.error_count || 0).fill("Error occurred"),
                total_processed: (progressData.created_count || 0) + (progressData.error_count || 0)
              });
            }
          } catch (statusError) {
            console.error("Error getting final status:", statusError);
            // Fallback: create completion response from progress data
            handleJobCompletion({
              status: progressData.status === "completed" ? "success" : "partial_success",
              created_users: Array(progressData.created_count || 0).fill("user@example.com"),
              skipped_users: [],
              errors: Array(progressData.error_count || 0).fill("Error occurred"),
              total_processed: (progressData.created_count || 0) + (progressData.error_count || 0)
            });
          }

          return true; // Stop polling
        }

        // Update progress for ongoing job
        setProgress(progressData);

        if (typeof progressData.progress === 'number') {
          setImportProgress(Math.min(progressData.progress, 99)); // Cap at 99 until completed
        }

        // Update status message
        const createdCount = progressData.created_count || 0;
        const errorCount = progressData.error_count || 0;
        setCurrentImportItem(`Processing: ${createdCount} created, ${errorCount} errors`);

        return false; // Continue polling
      } else {
        // Fallback: try status call directly
        const statusResponse = await statusCall({ job_id: currentJobId });

        // Handle nested response structure
        const statusData = statusResponse.message || statusResponse;

        if (statusData &&
          (statusData.status === "success" ||
            statusData.status === "partial_success" ||
            statusData.status === "failed")) {
          setImportProgress(100);
          handleJobCompletion(statusData);
          return true; // Stop polling
        }

        // If no valid response, increment progress gradually
        setImportProgress(prev => Math.min(prev + 2, 95));
        return false; // Continue polling
      }

    } catch (error) {
      console.error("Error fetching job status:", error);

      // Try one more time with status call
      try {
        const statusResponse = await statusCall({ job_id: currentJobId });
        const statusData = statusResponse.message || statusResponse;
        if (statusData && statusData.status) {
          setImportProgress(100);
          handleJobCompletion(statusData);
          return true;
        }
      } catch (statusError) {
        console.error("Status call also failed:", statusError);
      }

      toast.error("Failed to fetch job status. Check console for details.", { duration: 5000 });
      setIsImporting(false);
      setImportProgress(0);
      return true; // Stop polling on error
    }
  }, [statusCall, progressCall, handleJobCompletion]);

  const validateAndPreprocessFile = useCallback((selectedFile: File) => {
    if (!selectedFile || selectedFile.type !== "text/csv") {
      toast.error("Please upload a valid CSV file (.csv).", { duration: 5000 });
      setFile(null);
      setFileName(null);
      return;
    }

    setValidationErrors([]);
    setSkippedUsers([]);
    setCreatedUsers([]);
    setImportErrors([]);
    setFileReady(false);
    setValidatedData([]);
    setCurrentImportItem("Validating CSV file...");

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const data = result.data as any[];
        setTotalUsers(data.length);

        if (data.length === 0) {
          toast.error("CSV file is empty or invalid.", { duration: 5000 });
          setFile(null);
          setFileName(null);
          setCurrentImportItem("");
          return;
        }

        if (data.length > MAX_USERS_PER_BATCH) {
          toast.error(`Maximum ${MAX_USERS_PER_BATCH} users allowed per batch. Please split your file.`, { duration: 8000 });
          setFile(null);
          setFileName(null);
          setCurrentImportItem("");
          return;
        }

        const validatedUsers: any[] = [];
        const parseErrors: ValidationError[] = [];

        data.forEach((row: any, index: number) => {
          const email = row.email?.trim()
            ? row.email.replace(/@clapgrow\.com.*?(yahoo\.com|hotmail\.com|gmail\.com|.*?\.org|.*?\.net|.*?\.biz|.*?\.info|.*?\.com)/, "@$1")
            : "";

          const userData = {
            first_name: row.first_name?.trim() || "",
            last_name: row.last_name?.trim() || "",
            email: email,
            phone: row.phone?.trim() || "",
            designation: row.designation?.trim() || "",
            branch_id: branchMap[row.branch_id?.trim()] || row.branch_id?.trim() || "",
            department_id: departmentMap[row.department_id?.trim()] || row.department_id?.trim() || "",
            role: roleMap[row.role?.trim()] || row.role?.trim() || "",
            ctc: parseFloat(row.ctc) || 0,
            cost_per_hour: parseFloat(row.cost_per_hour) || 0,
            report_to: row.report_to?.trim() || null,
            company_id: userCompanyId,
            enabled: 1,
          };

          // Check for critical missing data
          if (!userCompanyId) {
            parseErrors.push({
              rowIndex: index + 1,
              error: "User company ID not found. Please ensure you are logged in properly.",
              invalidFields: ["company_id"],
              row: row
            });
            return;
          }

          // Validate mapping
          if (userData.branch_id === row.branch_id?.trim() && !branchMap[row.branch_id?.trim()]) {
            parseErrors.push({
              rowIndex: index + 1,
              error: `Branch "${row.branch_id?.trim()}" not found. Available branches: ${Object.keys(branchMap).join(", ")}`,
              invalidFields: ["branch_id"],
              row: row
            });
            return;
          }

          if (userData.department_id === row.department_id?.trim() && !departmentMap[row.department_id?.trim()]) {
            parseErrors.push({
              rowIndex: index + 1,
              error: `Department "${row.department_id?.trim()}" not found. Available departments: ${Object.keys(departmentMap).join(", ")}`,
              invalidFields: ["department_id"],
              row: row
            });
            return;
          }

          if (userData.role === row.role?.trim() && !roleMap[row.role?.trim()]) {
            parseErrors.push({
              rowIndex: index + 1,
              error: `Role "${row.role?.trim()}" not found. Available roles: ${Object.keys(roleMap).join(", ")}`,
              invalidFields: ["role"],
              row: row
            });
            return;
          }

          const validationResult = formDataSchema.safeParse(userData);
          if (!validationResult.success) {
            const rowErrors = validationResult.error.errors.map(err => err.path.join("."));
            const errorMessage = validationResult.error.errors.map(err => `${err.path.join(".")}: ${err.message}`).join("; ");

            parseErrors.push({
              rowIndex: index + 1,
              error: errorMessage,
              invalidFields: rowErrors,
              row: row
            });
          } else {
            validatedUsers.push(validationResult.data);
          }
        });

        if (parseErrors.length > 0) {
          setValidationErrors(parseErrors);
          toast.error(
            `CSV validation failed: ${parseErrors.length} errors found. Please fix and try again.`,
            { duration: 10000 }
          );
          setFile(null);
          setFileName(null);
          setCurrentImportItem("");
          return;
        }

        setValidatedData(validatedUsers);
        setFileReady(true);
        setCurrentImportItem("");
        toast.success(`File validated successfully! ${validatedUsers.length} users ready for import.`, { duration: 3000 });
      },
      error: (error) => {
        toast.error("Error parsing CSV file. Please ensure it is a valid CSV.", { duration: 8000 });
        console.error("CSV parse error:", error);
        setFile(null);
        setFileName(null);
        setCurrentImportItem("");
      },
    });
  }, [branchMap, departmentMap, roleMap, userCompanyId]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      if (!isDataLoading && branches && departments && roles) {
        validateAndPreprocessFile(selectedFile);
      }
    } else {
      resetDialog();
    }
  }, [isDataLoading, branches, departments, roles, validateAndPreprocessFile, resetDialog]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const selectedFile = e.dataTransfer?.files?.[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      if (!isDataLoading && branches && departments && roles) {
        validateAndPreprocessFile(selectedFile);
      }
    } else {
      toast.error("Invalid file type. Please upload a valid CSV file (.csv).", { duration: 5000 });
    }
  }, [isDataLoading, branches, departments, roles, validateAndPreprocessFile]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  useEffect(() => {
    if (file && !isDataLoading && branches && departments && roles && !fileReady) {
      validateAndPreprocessFile(file);
    }
  }, [file, isDataLoading, branches, departments, roles, fileReady, validateAndPreprocessFile]);

  // Enhanced polling effect with better cleanup
  useEffect(() => {
    if (jobId && isImporting && !pollingIntervalRef.current) {
      // Start polling immediately
      pollJobStatus(jobId).then(shouldStop => {
        if (shouldStop) {
          clearPolling();
          return;
        }
      });

      // Set up interval for subsequent polls
      pollingIntervalRef.current = setInterval(async () => {
        const shouldStop = await pollJobStatus(jobId);
        if (shouldStop) {
          clearPolling();
        }
      }, 2000);
    }

    // Cleanup function
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [jobId, isImporting, pollJobStatus, clearPolling]);

  const downloadTemplate = useCallback(() => {
    const branchName = branches?.[0]?.branch_name || "Main Branch";
    const departmentName = departments?.[0]?.department_name || "IT";
    const roleName = roles?.[0]?.role_name || "Member";

    const template = `first_name,last_name,email,phone,designation,branch_id,department_id,role,ctc,cost_per_hour,report_to
John,Doe,john.doe@example.com,9876543210,Developer,${branchName},${departmentName},${roleName},500000,250,jane.smith@example.com
Jane,Smith,jane.smith@example.com,9876543211,Team Lead,${branchName},${departmentName},${roleName},800000,400,admin@example.com`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cg_user_bulk_upload_template.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Sample template downloaded successfully!");
  }, [branches, departments, roles]);

  const processFile = async () => {
    if (!fileReady || validatedData.length === 0) {
      toast.error("No valid data to import.", { duration: 5000 });
      return;
    }

    setIsImporting(true);
    setJobStatus("enqueued");
    setProgress(null);
    setImportProgress(0);
    setShowConfirmImport(false);
    setCurrentImportItem("Starting bulk import...");

    try {
      toast.info("Starting bulk import... This may take a few moments.", { duration: 5000 });

      setImportProgress(5);
      setCurrentImportItem("Initializing import process...");

      const response = await uploadCall({
        users_data: JSON.stringify(validatedData),
      });


      if (response.message?.status === "enqueued") {
        setJobId(response.message.job_id);
        setJobStatus("processing");
        setImportProgress(10);
        setCurrentImportItem(`Processing ${response.message.user_count} users...`);
        toast.success(
          `Bulk import started! Processing ${response.message.user_count} users. (Job ID: ${response.message.job_id})`,
          { duration: 8000 }
        );
      } else {
        throw new Error("Failed to enqueue bulk import");
      }
    } catch (error: any) {
      const errorMessage = extractServerErrorMessage(error);
      toast.error(`Failed to start bulk import: ${errorMessage}`, { duration: 8000 });
      console.error("Bulk import error:", error);
      setIsImporting(false);
      setImportProgress(0);
      setCurrentImportItem("");
      setJobStatus("");
    }
  };

  const renderDataPreview = () => {
    if (validatedData.length === 0) return null;

    const headers = Object.keys(validatedData[0]);
    const startIndex = showFullPreview ? previewStartIndex : 0;
    const endIndex = showFullPreview
      ? Math.min(startIndex + PREVIEW_ROWS_PER_PAGE, validatedData.length)
      : Math.min(5, validatedData.length);
    const previewData = validatedData.slice(startIndex, endIndex);

    const canGoNext = endIndex < validatedData.length;
    const canGoPrev = startIndex > 0;

    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">Data Preview</h3>
            <Badge variant="secondary" className="text-sm">
              {validatedData.length} rows validated
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFullPreview(!showFullPreview)}
              className="flex items-center gap-2 text-xs sm:text-sm"
            >
              {showFullPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span className="hidden sm:inline">{showFullPreview ? "Collapse" : "Expand"}</span>
              <span className="sm:hidden">{showFullPreview ? "Less" : "More"}</span>
            </Button>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
          <div className={showFullPreview ? "max-h-96" : "max-h-48"} style={{ overflowY: "auto" }}>
            {/* Mobile Card View */}
            <div className="block sm:hidden">
              <div className="divide-y divide-gray-200">
                {previewData.map((row, rowIndex) => {
                  const actualRowIndex = startIndex + rowIndex;
                  return (
                    <div key={actualRowIndex} className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          Row {actualRowIndex + 1}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {headers.slice(0, 4).map((key, cellIndex) => (
                          <div key={cellIndex} className="flex flex-col">
                            <span className="text-xs font-medium text-gray-500 truncate">{key}</span>
                            <span className="text-sm text-gray-900 truncate" title={String(row[key])}>
                              {String(row[key])}
                            </span>
                          </div>
                        ))}
                        {headers.length > 4 && (
                          <div className="text-xs text-gray-400">
                            +{headers.length - 4} more fields...
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-gray-50 z-10">
                  <TableRow>
                    {showFullPreview && (
                      <TableHead className="text-xs font-medium px-3 py-2 w-16 border-r">#</TableHead>
                    )}
                    {headers.map((key, index) => (
                      <TableHead
                        key={index}
                        className="text-xs font-medium px-3 py-2 min-w-[120px] max-w-[200px] border-r last:border-r-0"
                      >
                        <div className="truncate font-semibold" title={key}>
                          {key}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, rowIndex) => {
                    const actualRowIndex = startIndex + rowIndex;
                    return (
                      <TableRow key={actualRowIndex} className="hover:bg-gray-50">
                        {showFullPreview && (
                          <TableCell className="text-xs px-3 py-2 font-mono text-gray-500 border-r bg-gray-50">
                            {actualRowIndex + 1}
                          </TableCell>
                        )}
                        {headers.map((key, cellIndex) => (
                          <TableCell
                            key={cellIndex}
                            className="text-xs px-3 py-2 max-w-[200px] border-r last:border-r-0"
                          >
                            <div className="truncate" title={String(row[key])}>
                              {String(row[key])}
                            </div>
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {showFullPreview && validatedData.length > PREVIEW_ROWS_PER_PAGE && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-600">
            <span className="text-center sm:text-left">
              Showing rows {startIndex + 1}-{endIndex} of {validatedData.length}
            </span>
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewStartIndex(Math.max(0, startIndex - PREVIEW_ROWS_PER_PAGE))}
                disabled={!canGoPrev}
                className="text-xs sm:text-sm"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewStartIndex(startIndex + PREVIEW_ROWS_PER_PAGE)}
                disabled={!canGoNext}
                className="text-xs sm:text-sm"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {!showFullPreview && validatedData.length > 5 && (
          <p className="text-sm text-gray-500 text-center">
            Showing first 5 rows of {validatedData.length} total rows
          </p>
        )}
      </div>
    );
  };

  const renderValidationErrors = () => {
    if (validationErrors.length === 0) return null;

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-red-900 flex items-center gap-2">
          <XCircle className="w-5 h-5 text-red-600" />
          Validation Errors ({validationErrors.length})
        </h3>

        <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
          <div className="max-h-64 overflow-y-auto">
            {/* Mobile Card View */}
            <div className="block sm:hidden">
              <div className="divide-y divide-gray-200">
                {validationErrors.map((errorItem, idx) => (
                  <div key={idx} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="destructive" className="text-xs">
                        Row {errorItem.rowIndex}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {errorItem.invalidFields.length > 0 && (
                        <div>
                          <span className="text-xs font-medium text-gray-500">Invalid Fields:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {errorItem.invalidFields.map((field, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {field}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <span className="text-xs font-medium text-gray-500">Error:</span>
                        <p className="text-xs text-red-600 mt-1">{errorItem.error}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader className="sticky top-0 bg-gray-50 z-10">
                  <TableRow>
                    <TableHead className="text-xs font-medium px-3 py-2 w-16">Row #</TableHead>
                    <TableHead className="text-xs font-medium px-3 py-2 w-40">Invalid Fields</TableHead>
                    <TableHead className="text-xs font-medium px-3 py-2">Error Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validationErrors.map((errorItem, idx) => (
                    <TableRow key={idx} className="hover:bg-gray-50">
                      <TableCell className="text-xs px-3 py-2 font-mono bg-red-50">
                        <Badge variant="destructive" className="text-xs">
                          {errorItem.rowIndex}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {errorItem.invalidFields.length > 0 ? (
                            errorItem.invalidFields.map((field, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {field}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs px-3 py-2 text-red-600">
                        <div className="max-w-md" title={errorItem.error}>
                          {errorItem.error}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderImportResults = () => {
    if (createdUsers.length === 0 && skippedUsers.length === 0 && importErrors.length === 0) return null;

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Import Results</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {createdUsers.length > 0 && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-semibold text-green-800">{createdUsers.length} Successfully Created</p>
                  <p className="text-sm text-green-700">Users added to the system</p>
                </div>
              </div>
            </div>
          )}
          {skippedUsers.length > 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="font-semibold text-yellow-800">{skippedUsers.length} Skipped</p>
                  <p className="text-sm text-yellow-700">Users already exist</p>
                </div>
              </div>
            </div>
          )}
          {importErrors.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-semibold text-red-800">{importErrors.length} Failed</p>
                  <p className="text-sm text-red-700">Check error details below</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {(skippedUsers.length > 0 || importErrors.length > 0) && (
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              Details
            </h4>
            <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
              <div className="max-h-64 overflow-y-auto">
                {/* Mobile Card View */}
                <div className="block sm:hidden">
                  <div className="divide-y divide-gray-200">
                    {skippedUsers.map((email, idx) => (
                      <div key={`skipped-${idx}`} className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">Skipped</Badge>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-500">Email:</span>
                          <p className="text-xs text-yellow-600 mt-1">{email} (already exists)</p>
                        </div>
                      </div>
                    ))}
                    {importErrors.map((error, idx) => (
                      <div key={`error-${idx}`} className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="destructive" className="text-xs">Error</Badge>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-500">Error:</span>
                          <p className="text-xs text-red-600 mt-1">{error.error}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader className="sticky top-0 bg-gray-50 z-10">
                      <TableRow>
                        <TableHead className="text-xs font-medium px-3 py-2 w-16">Status</TableHead>
                        <TableHead className="text-xs font-medium px-3 py-2">Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {skippedUsers.map((email, idx) => (
                        <TableRow key={`skipped-${idx}`} className="hover:bg-gray-50">
                          <TableCell className="text-xs px-3 py-2 bg-yellow-50">
                            <Badge variant="outline" className="text-xs">Skipped</Badge>
                          </TableCell>
                          <TableCell className="text-xs px-3 py-2 text-yellow-600">
                            {email} (already exists)
                          </TableCell>
                        </TableRow>
                      ))}
                      {importErrors.map((error, idx) => (
                        <TableRow key={`error-${idx}`} className="hover:bg-gray-50">
                          <TableCell className="text-xs px-3 py-2 bg-red-50">
                            <Badge variant="destructive" className="text-xs">Error</Badge>
                          </TableCell>
                          <TableCell className="text-xs px-3 py-2 text-red-600">{error.error}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isDataLoading) {
    return (
      <Button variant="outline" disabled className="flex items-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) resetDialog();
      }}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="text-[#038EE2] border-[#038EE2] flex items-center gap-2 hover:bg-blue-50 transition-all duration-200"
          >
            Bulk Upload Members
            <Upload className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-7xl max-h-[95vh] w-[95vw] sm:w-[90vw] lg:w-[85vw] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              Import Team Members
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Upload a CSV file (.csv) to import team members. Download a sample template below for the correct format and guidelines.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col flex-1 space-y-6 overflow-hidden">
            {/* Sample Template Download Section */}
            <div className="flex-shrink-0 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-blue-900 text-sm sm:text-base">
                      Download Sample Template
                    </h4>
                    <p className="text-xs sm:text-sm text-blue-700">
                      Get started with our pre-configured CSV template
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                  className="flex items-center justify-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-100 text-xs sm:text-sm w-full sm:w-auto"
                  disabled={isDataLoading}
                >
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">User Template</span>
                  <span className="sm:hidden">Template</span>
                </Button>
              </div>
            </div>

            {/* File Upload Area */}
            {!isImporting && (createdUsers.length === 0 && skippedUsers.length === 0 && importErrors.length === 0) && (
              <div className="flex-shrink-0">
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`
                    border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
                    ${isDragOver
                      ? "border-blue-400 bg-blue-50 scale-[1.02]"
                      : fileName
                        ? "border-green-300 bg-green-50"
                        : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
                    }
                  `}
                >
                  <div className="flex flex-col items-center gap-4">
                    {fileName ? (
                      <>
                        <CheckCircle className="w-12 h-12 text-green-600" />
                        <div>
                          <p className="text-lg font-semibold text-green-800">File Loaded Successfully!</p>
                          <p className="text-sm text-green-700 font-medium">{fileName}</p>
                          {fileReady && (
                            <p className="text-xs text-green-600 mt-1">{validatedData.length} rows validated</p>
                          )}
                          {validationErrors.length > 0 && (
                            <p className="text-xs text-red-600 mt-1">{validationErrors.length} validation errors found</p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            resetDialog();
                            fileInputRef.current?.click();
                          }}
                          className="flex items-center gap-2"
                          disabled={isImporting || isDataLoading}
                        >
                          <Upload className="w-4 h-4" />
                          Choose Different File
                        </Button>
                      </>
                    ) : (
                      <>
                        <div
                          className={`
                            w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200
                            ${isDragOver ? "bg-blue-100 scale-110" : "bg-gray-100"}
                          `}
                        >
                          <Upload className={`w-8 h-8 ${isDragOver ? "text-blue-600" : "text-gray-500"}`} />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-gray-700 mb-2">
                            {isDragOver ? "Drop your file here!" : "Drag & Drop CSV File"}
                          </p>
                          <p className="text-sm text-gray-600 mb-4">Supports .csv files only</p>
                          <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                            className="hidden"
                            disabled={isImporting || isDataLoading}
                          />
                          <Button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isImporting || isDataLoading}
                            className="bg-blue-600 text-white hover:bg-blue-700"
                          >
                            Choose File
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                  {isDataLoading && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-yellow-600 animate-spin" />
                        <p className="text-sm text-yellow-700 font-medium">Loading system data...</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Progress Section */}
            {isImporting && (
              <div className="flex-shrink-0 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="w-5 h-5 text-yellow-600 animate-spin" />
                    <div>
                      <p className="font-semibold text-yellow-800">Import in Progress</p>
                      <p className="text-sm text-yellow-700">
                        {currentImportItem || "Processing users..."}
                      </p>
                      {jobId && <p className="text-xs text-yellow-700">Job ID: {jobId}</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-yellow-700">
                      <span>Progress</span>
                      <span>{Math.round(importProgress)}%</span>
                    </div>
                    <Progress value={importProgress} className="h-2" />
                  </div>
                </div>
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-auto space-y-6">
              {renderValidationErrors()}
              {renderDataPreview()}
              {renderImportResults()}
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 pt-4 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 order-2 sm:order-1">
              {fileReady && validatedData.length > 0 && !isImporting && validationErrors.length === 0 && (createdUsers.length === 0 && skippedUsers.length === 0 && importErrors.length === 0) && (
                <Button
                  onClick={() => setShowConfirmImport(true)}
                  className="bg-green-600 text-white hover:bg-green-700 flex items-center gap-2 w-full sm:w-auto"
                >
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">Import {validatedData.length} Users</span>
                  <span className="sm:hidden">Import ({validatedData.length})</span>
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2 order-1 sm:order-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (isImporting) return;
                  setIsOpen(false);
                  resetDialog();
                }}
                disabled={isImporting}
                className="text-gray-600 w-full sm:w-auto"
              >
                <span className="hidden sm:inline">
                  {isImporting ? "Please wait..." : "Close"}
                </span>
                <span className="sm:hidden">
                  {isImporting ? "Wait..." : "Close"}
                </span>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmImport} onOpenChange={setShowConfirmImport}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Confirm Import
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>You are about to import <strong>{validatedData.length}</strong> users into the system.</p>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                <p className="font-medium text-yellow-800">⚠️ Important:</p>
                <p className="text-yellow-700">This action cannot be undone. Please ensure your data is correct before proceeding.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={processFile}
              className="bg-green-600 hover:bg-green-700"
            >
              Yes, Import Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
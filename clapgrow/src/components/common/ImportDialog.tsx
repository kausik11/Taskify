import { useCallback, useContext, useEffect, useRef, useState } from "react";
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
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
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
import UploadIcon from "@/assets/icons/upload-icon.svg";
import { toast } from "sonner";
import { UserContext } from "@/utils/auth/UserProvider";
import {
	useFrappeCreateDoc,
	useFrappeGetCall,
	useFrappeGetDocCount,
	useFrappeGetDocList,
	useFrappeUpdateDoc,
} from "frappe-react-sdk";
import {
	ArrowUpFromLine,
	CheckCircle,
	XCircle,
	FileText,
	Download,
	RefreshCw,
	AlertCircle,
	Upload,
	Eye,
	EyeOff,
} from "lucide-react";
import { format } from "date-fns";
import { CGBranch } from "@/types/ClapgrowApp/CGBranch";
import * as XLSX from "xlsx";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ExcelImportProps {
	name: string;
}

interface ExcelRow {
	[key: string]: any;
}

interface ImportResult {
	successes: number;
	failures: {
		row: ExcelRow;
		error: string;
		invalidFields: string[];
		rowIndex: number;
	}[];
}

// Helper function to extract error message from server response
const extractServerErrorMessage = (error: any): string => {
	try {
		// Handle different error structures
		if (error?._server_messages) {
			// Parse the JSON string in _server_messages
			const serverMessages = JSON.parse(error._server_messages);
			if (Array.isArray(serverMessages) && serverMessages.length > 0) {
				const firstMessage = JSON.parse(serverMessages[0]);
				return firstMessage.message || error.message || "Server error occurred";
			}
		}

		// Fallback to other error properties
		return error?.message || error?.exc || "An unexpected error occurred";
	} catch (parseError) {
		// If parsing fails, return the original error message
		return error?.message || "An unexpected error occurred";
	}
};

// Helper function to normalize data from Excel
const normalizeData = (value: any): string => {
	if (!value && value !== 0) return "";
	return value.toString().trim().replace(/\s+/g, " ");
};

const ImportDialog: React.FC<ExcelImportProps> = ({ name }) => {
	const { roleBaseName, companyDetails, userDetails } = useContext(UserContext);
	const [data, setData] = useState<ExcelRow[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [fileName, setFileName] = useState<string | null>(null);
	const [isImporting, setIsImporting] = useState(false);
	const [importProgress, setImportProgress] = useState(0);
	const [currentImportItem, setCurrentImportItem] = useState<string>("");
	const [importResult, setImportResult] = useState<ImportResult | null>(null);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [showConfirmImport, setShowConfirmImport] = useState(false);
	const [isDragOver, setIsDragOver] = useState(false);
	const [showFullPreview, setShowFullPreview] = useState(false);
	const [previewStartIndex, setPreviewStartIndex] = useState(0);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [userCount, setUserCount] = useState<number | null>(null);

	const PREVIEW_ROWS_PER_PAGE = 10;

	// Get user company - fix the company logic
	const userCompanyId = userDetails?.[0]?.company_id || companyDetails?.[0]?.name || companyDetails?.[1]?.name;
	// console.log("Company ID Resolution Debug:", {
	// 	userCompanyId,
	// 	userDetails: userDetails?.[0],
	// 	companyDetails,
	// });

	const { data: branchData, isLoading: branchLoading } =
		useFrappeGetDocList<CGBranch>("CG Branch", { fields: ["name", "branch_name"] });

	// Fix: Get users with proper company filtering
	const { data: userCountData, error: userCountError } = useFrappeGetCall<{
		message: number;
	}>("frappe.client.get_count", {
		doctype: "CG User",
		filters: userCompanyId ? [["company_id", "=", userCompanyId]] : undefined,
	});

	// Set userCount when userCountData is available
	useEffect(() => {
		if (userCountData?.message !== undefined) {
			setUserCount(userCountData.message);
		}
	}, [userCountData]);

	// Fetch all users with the dynamic limit
	const { data: userData, isLoading: userLoading, error: userError, mutate: mutateUserData } = useFrappeGetDocList(
		"CG User",
		{
			fields: ["name", "email", "company_id"],
			filters: userCompanyId ? [["company_id", "=", userCompanyId]] : undefined,
			limit: userCount ?? 20,
		}
	);
	// Fetch tag count with company filter
	const { data: tagDataCount } = useFrappeGetDocCount(
		"CG Tags",
		userCompanyId ? [["company_id", "=", userCompanyId]] : []
	);

	// Fetch tags with dynamic limit
	const { data: tagData, isLoading: tagLoading, mutate: mutateTagData } = useFrappeGetDocList(
		"CG Tags",
		{
			fields: ["name", "tag_name"],
			filters: userCompanyId ? [["company_id", "=", userCompanyId]] : [],
			limit: tagDataCount ?? 100,
		},
		{
			enabled: tagDataCount !== undefined, // wait until count is loaded
		}
	);


	const { data: companyData, isLoading: companyLoading } = useFrappeGetDocList(
		"CG Company",
		{ fields: ["name"] },
	);

	const { data: departmentData, isLoading: departmentLoading } =
		useFrappeGetDocList("CG Department", { fields: ["name"] });

	const { createDoc } = useFrappeCreateDoc();
	const { updateDoc } = useFrappeUpdateDoc();

	const isDataLoading =
		branchLoading ||
		userLoading ||
		tagLoading ||
		companyLoading ||
		departmentLoading;

	const resetDialog = useCallback(() => {
		setData([]);
		setError(null);
		setFileName(null);
		setImportProgress(0);
		setCurrentImportItem("");
		setImportResult(null);
		setIsImporting(false);
		setShowConfirmImport(false);
		setShowFullPreview(false);
		setPreviewStartIndex(0);
		setIsDragOver(false);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	}, []);

	// Updated parseFile function with better Excel date handling
	const parseFile = useCallback((file: File) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const binaryStr = e.target?.result as string;
				const workbook = XLSX.read(binaryStr, {
					type: "binary",
					cellDates: true, // Parse dates as Date objects
					dateNF: 'yyyy-mm-dd' // Date format for parsing
				});
				const sheetName = workbook.SheetNames[0];
				const sheet = workbook.Sheets[sheetName];

				// Better date handling for cross-platform compatibility
				const jsonData = XLSX.utils.sheet_to_json(sheet, {
					raw: false, // Get formatted strings instead of raw values
					defval: null // Default value for empty cells
				});

				if (jsonData.length === 0) {
					setError(
						"The Excel file appears to be empty. Please check your file and try again.",
					);
					return;
				}

				setData(jsonData as ExcelRow[]);
				setError(null);
				setImportResult(null);
			} catch (err) {
				setError(
					"Error parsing Excel file. Please ensure the file is a valid .xlsx with correct formats.",
				);
				console.error(err);
			}
		};
		reader.onerror = () => setError("Error reading file.");
		reader.readAsBinaryString(file);
	}, []);

	const validateHolidayData = useCallback(
		(
			row: ExcelRow,
			rowIndex: number,
		): {
			success: boolean;
			cleanedRow?: Record<string, any>;
			error?: string;
			invalidFields: string[];
		} => {
			const cleanedRow: Record<string, any> = {};
			const invalidFields: string[] = [];
			const validRecurrenceTypes = ["Weekly", "Monthly", "Quarterly", "Yearly"];
			const validWeekDays = [
				"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"
			];
			const validWeekOccurrences = ["Every", "1st", "2nd", "3rd", "4th", "Last"];
			const validHolidayTypes = [
				"Public Holiday", "Weekly Off"
			];

			const sanitizeHeader = (header: string) =>
				header
					.replace(/\s*\*.*$/, "")
					.trim()
					.replace(/\s+/g, "_")
					.toLowerCase();

			Object.keys(row).forEach((key) => {
				cleanedRow[sanitizeHeader(key)] = normalizeData(row[key]);
			});

			// Required fields validation
			if (!cleanedRow.holiday_name || !cleanedRow.holiday_name.trim()) {
				invalidFields.push("Holiday Name");
				return {
					success: false,
					error: `Holiday Name is required.`,
					invalidFields,
				};
			}

			if (!cleanedRow.branch_name) {
				invalidFields.push("Branch Name");
				return {
					success: false,
					error: `Branch Name is required.`,
					invalidFields,
				};
			}

			// Validate branch exists - match by branch_name display name
			const branch = branchData?.find((b) => b.branch_name === cleanedRow.branch_name);
			if (!branch) {
				invalidFields.push("Branch Name");
				return {
					success: false,
					error: `Branch not found: ${cleanedRow.branch_name}. Please use exact branch name.`,
					invalidFields,
				};
			}

			// Get current date for start_date
			const currentDate = new Date();

			const formatLocalDate = (date: Date | string | number | undefined | null): string | null => {
				if (!date && date !== 0) return null;

				try {
					let dateObj: Date;

					// Handle Excel serial numbers (both 1900 and 1904 date systems)
					if (typeof date === "number") {
						// Excel stores dates as serial numbers
						// Check if it's a valid Excel date serial number (typically between 1 and 100000)
						if (date >= 1 && date <= 100000) {
							// Excel 1900 date system: January 1, 1900 is day 1
							// Handle the Excel leap year bug for dates after February 28, 1900
							let excelEpoch = new Date(1899, 11, 30); // December 30, 1899
							let adjustedDate = date;
							if (date > 59) { // After February 28, 1900
								adjustedDate = date - 1; // Account for non-existent Feb 29, 1900
							}
							dateObj = new Date(excelEpoch.getTime() + (adjustedDate * 24 * 60 * 60 * 1000));
						} else {
							// If not in expected range, treat as timestamp
							dateObj = new Date(date);
						}
					} else if (date instanceof Date) {
						dateObj = new Date(date);
					} else if (typeof date === "string") {
						const trimmedDate = date.trim();
						if (trimmedDate === "") return null;

						// Try direct parsing first
						dateObj = new Date(trimmedDate);

						// If that fails, try common date formats
						if (isNaN(dateObj.getTime())) {
							const formats = [
								/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY or MM/DD/YYYY
								/^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
								/^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-YYYY
								/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, // DD.MM.YYYY
							];

							let parsed = false;
							for (const format of formats) {
								const match = trimmedDate.match(format);
								if (match) {
									let day, month, year;

									if (format.source.startsWith("^(\\d{4})")) {
										// YYYY-MM-DD format
										year = parseInt(match[1]);
										month = parseInt(match[2]) - 1;
										day = parseInt(match[3]);
									} else {
										// Assume DD/MM/YYYY format for international compatibility
										day = parseInt(match[1]);
										month = parseInt(match[2]) - 1;
										year = parseInt(match[3]);

										// Handle MM/DD vs DD/MM ambiguity
										if (day > 12) {
											// Definitely DD/MM/YYYY
										} else if (month > 11) {
											// Must be MM/DD/YYYY
											[day, month] = [month + 1, day - 1];
										}
									}

									dateObj = new Date(year, month, day);
									parsed = true;
									break;
								}
							}

							if (!parsed) return null;
						}
					} else {
						return null;
					}

					if (isNaN(dateObj.getTime())) return null;

					const year = dateObj.getFullYear();
					if (year < 1900 || year > 2100) return null;

					// Format as YYYY-MM-DD (ISO date format)
					const formattedYear = dateObj.getFullYear();
					const formattedMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
					const formattedDay = String(dateObj.getDate()).padStart(2, '0');

					return `${formattedYear}-${formattedMonth}-${formattedDay}`;

				} catch (error) {
					console.error("Date parsing error:", error, "for date:", date);
					return null;
				}
			};

			// Set up the base holiday data
			const holidayData: any = {
				branch_id: branch.name, // Use the branch ID, not display name
				holiday_name: cleanedRow.holiday_name.trim(),
				holiday_type: cleanedRow.holiday_type || "Public Holiday",
				is_active: 1,
				auto_generated: 1,
				start_date: formatLocalDate(currentDate), // Always set current date as start_date
			};

			// Validate holiday type
			if (cleanedRow.holiday_type && !validHolidayTypes.includes(cleanedRow.holiday_type)) {
				invalidFields.push("Holiday Type");
				return {
					success: false,
					error: `Holiday Type must be one of: ${validHolidayTypes.join(", ")}.`,
					invalidFields,
				};
			}

			// Handle boolean fields
			const isRecurringValue = cleanedRow.is_recurring?.toString().toLowerCase()?.trim();
			const isRecurring = isRecurringValue === "yes" || isRecurringValue === "1" || isRecurringValue === "true";
			holidayData.is_recurring = isRecurring ? 1 : 0;

			const isOptionalValue = cleanedRow.is_optional?.toString().toLowerCase()?.trim();
			holidayData.is_optional = (isOptionalValue === "yes" || isOptionalValue === "1" || isOptionalValue === "true") ? 1 : 0;

			if (isRecurring) {
				// Recurring holiday validation
				if (!cleanedRow.recurrence_type || !validRecurrenceTypes.includes(cleanedRow.recurrence_type)) {
					invalidFields.push("Recurrence Type");
					return {
						success: false,
						error: `Recurrence Type must be one of: ${validRecurrenceTypes.join(", ")}.`,
						invalidFields,
					};
				}

				holidayData.recurrence_type = cleanedRow.recurrence_type;
				holidayData.recurrence_interval = cleanedRow.recurrence_interval || 1;

				// Handle end date if provided
				if (cleanedRow.end_date) {
					const endDateStr = formatLocalDate(cleanedRow.end_date);
					if (!endDateStr) {
						invalidFields.push("End Date");
						return {
							success: false,
							error: `Invalid End Date format.`,
							invalidFields,
						};
					}
					holidayData.end_date = endDateStr;
				}

				// Validate days of week for Weekly and Monthly
				if (cleanedRow.recurrence_type === "Weekly" || cleanedRow.recurrence_type === "Monthly") {
					if (!cleanedRow.days_of_week) {
						invalidFields.push("Days of Week");
						return {
							success: false,
							error: `Days of Week is required for ${cleanedRow.recurrence_type} recurring holidays.`,
							invalidFields,
						};
					}

					const days = cleanedRow.days_of_week.split(",").map((d: string) => d.trim());
					const invalidDays = days.filter((d: string) => !validWeekDays.includes(d));
					if (invalidDays.length > 0) {
						invalidFields.push("Days of Week");
						return {
							success: false,
							error: `Invalid Days of Week: ${invalidDays.join(", ")}. Must be: ${validWeekDays.join(", ")}.`,
							invalidFields,
						};
					}

					holidayData.days_of_week = days.join(",");
				}

				// Validate week occurrence for Monthly
				if (cleanedRow.recurrence_type === "Monthly") {
					if (!cleanedRow.week_occurrence || !validWeekOccurrences.includes(cleanedRow.week_occurrence)) {
						invalidFields.push("Week Occurrence");
						return {
							success: false,
							error: `Week Occurrence must be one of: ${validWeekOccurrences.join(", ")}.`,
							invalidFields,
						};
					}
					holidayData.week_occurrence = cleanedRow.week_occurrence;
				}
			} else {
				// Non-recurring holiday validation
				if (!cleanedRow.holiday_date) {
					invalidFields.push("Holiday Date");
					return {
						success: false,
						error: `Holiday Date is required for non-recurring holidays.`,
						invalidFields,
					};
				}

				const holidayDateStr = formatLocalDate(cleanedRow.holiday_date);
				if (!holidayDateStr) {
					invalidFields.push("Holiday Date");
					return {
						success: false,
						error: `Invalid Holiday Date format.`,
						invalidFields,
					};
				}

				holidayData.holiday_date = holidayDateStr;
				// Set recurrence_interval to 0 for non-recurring holidays
				holidayData.recurrence_interval = 0;
			}

			return { success: true, cleanedRow: holidayData, invalidFields };
		},
		[branchData],
	);

	// Helper function to validate tags with retry mechanism
	const validateTagWithRetry = useCallback(async (tagName: string, maxRetries = 3): Promise<boolean> => {
		const normalizedTag = normalizeData(tagName);
		if (!normalizedTag) return true; // Allow empty tags

		for (let i = 0; i < maxRetries; i++) {
			const tagExists = tagData?.some((t) =>
				normalizeData(t.tag_name) === normalizedTag ||
				normalizeData(t.name) === normalizedTag
			);

			if (tagExists) return true;

			// If not found, wait and refetch tag data (except on last attempt)
			if (i < maxRetries - 1) {
				await new Promise(resolve => setTimeout(resolve, 100));
				try {
					await mutateTagData();
				} catch (error) {
					console.warn("Failed to refetch tag data:", error);
				}
			}
		}
		return false;
	}, [tagData, mutateTagData]);

	// Pre-validate all unique tags before bulk import
	const preValidateTags = useCallback(async (data: ExcelRow[]): Promise<{
		isValid: boolean;
		invalidTags?: string[];
		message?: string;
	}> => {
		if (name === "Holiday") return { isValid: true }; // Holidays don't use tags

		const uniqueTags = [...new Set(
			data.map(row => {
				const sanitizeHeader = (header: string) =>
					header.replace(/\s*\*.*$/, "").trim().replace(/\s+/g, "_").toLowerCase();

				const cleanedRow: Record<string, any> = {};
				Object.keys(row).forEach((key) => {
					cleanedRow[sanitizeHeader(key)] = normalizeData(row[key]);
				});

				return cleanedRow.tag;
			})
				.filter(Boolean)
				.map(tag => normalizeData(tag))
		)];

		if (uniqueTags.length === 0) return { isValid: true };

		const invalidTags: string[] = [];

		for (const tag of uniqueTags) {
			const isValid = await validateTagWithRetry(tag, 1); // Single attempt for pre-validation
			if (!isValid) {
				invalidTags.push(tag);
			}
		}

		if (invalidTags.length > 0) {
			return {
				isValid: false,
				invalidTags,
				message: `Invalid tags found: ${invalidTags.join(', ')}. Please ensure these tags exist in your company.`
			};
		}

		return { isValid: true };
	}, [name, validateTagWithRetry]);

	const validateAndCleanData = useCallback(
		(
			row: ExcelRow,
			isRecurring: boolean,
			rowIndex: number,
		): {
			success: boolean;
			cleanedRow?: Record<string, any>;
			error?: string;
			invalidFields: string[];
		} => {
			const cleanedRow: Record<string, any> = {};
			const invalidFields: string[] = [];
			const validWeekDays = [
				"Monday",
				"Tuesday",
				"Wednesday",
				"Thursday",
				"Friday",
				"Saturday",
				"Sunday",
			];
			const validFrequencies = ["Daily", "Weekly", "Monthly", "Yearly"];
			const validPriorities = ["Low", "Medium", "Critical"];
			const validHolidayBehaviours = [
				"Previous Working Date",
				"Ignore Holiday",
				"Next Working Date",
			];

			const sanitizeHeader = (header: string) =>
				header
					.replace(/\s*\*.*$/, "")
					.trim()
					.replace(/\s+/g, "_")
					.toLowerCase();

			Object.keys(row).forEach((key) => {
				cleanedRow[sanitizeHeader(key)] = normalizeData(row[key]);
			});

			const requiredFields = [
				"task_name",
				"task_type",
				"priority",
				"due_date",
				"due_time",
				"assignee",
				"assigned_to",
				"holiday_behaviour",
			];

			for (const field of requiredFields) {
				if (!cleanedRow[field]) {
					invalidFields.push(field.replace(/_/g, " "));
					return {
						success: false,
						error: `${field.replace(/_/g, " ")} is required.`,
						invalidFields,
					};
				}
			}

			if (!["Onetime", "Recurring"].includes(cleanedRow.task_type)) {
				invalidFields.push("Task Type");
				return {
					success: false,
					error: `Task Type must be 'Onetime' or 'Recurring'.`,
					invalidFields,
				};
			}

			if (!validPriorities.includes(cleanedRow.priority)) {
				invalidFields.push("Priority");
				return {
					success: false,
					error: `Priority must be one of: ${validPriorities.join(", ")}.`,
					invalidFields,
				};
			}

			if (!validHolidayBehaviours.includes(cleanedRow.holiday_behaviour)) {
				invalidFields.push("Holiday Behaviour");
				return {
					success: false,
					error: `Holiday Behaviour must be one of: ${validHolidayBehaviours.join(", ")}.`,
					invalidFields,
				};
			}

			// Merge date and time fields into a single due_date
			let parsedDate: Date;
			try {
				// Handle the date part
				const dateValue = cleanedRow.due_date;
				const timeValue = cleanedRow.due_time || "00:00:00";

				let dateStr: string;
				if (typeof dateValue === "number") {
					// Excel date serial number
					const excelDate = new Date((dateValue - 25569) * 86400 * 1000);
					dateStr = format(excelDate, "yyyy-MM-dd");
				} else if (dateValue instanceof Date) {
					dateStr = format(dateValue, "yyyy-MM-dd");
				} else {
					// String date
					const tempDate = new Date(dateValue);
					if (isNaN(tempDate.getTime())) {
						invalidFields.push("Due Date");
						return {
							success: false,
							error: `Invalid Due Date format.`,
							invalidFields,
						};
					}
					dateStr = format(tempDate, "yyyy-MM-dd");
				}

				// Handle the time part
				let timeStr: string;
				if (typeof timeValue === "number") {
					// Excel time serial number (fraction of a day)
					const hours = Math.floor(timeValue * 24);
					const minutes = Math.floor((timeValue * 24 * 60) % 60);
					const seconds = Math.floor((timeValue * 24 * 60 * 60) % 60);
					timeStr = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
				} else if (timeValue instanceof Date) {
					timeStr = format(timeValue, "HH:mm:ss");
				} else {
					// String time - validate format
					const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](?::[0-5][0-9])?$/;
					if (!timeRegex.test(timeValue)) {
						invalidFields.push("Due Time");
						return {
							success: false,
							error: `Invalid Due Time format. Expected HH:MM or HH:MM:SS.`,
							invalidFields,
						};
					}
					// Add seconds if not provided
					timeStr = timeValue.length === 5 ? `${timeValue}:00` : timeValue;
				}

				// Combine date and time
				const combinedDateTime = `${dateStr} ${timeStr}`;
				parsedDate = new Date(combinedDateTime);

				if (isNaN(parsedDate.getTime())) {
					invalidFields.push("Due Date", "Due Time");
					return {
						success: false,
						error: `Invalid date/time combination.`,
						invalidFields,
					};
				}

				const currentDateTime = new Date();
				if (parsedDate < currentDateTime) {
					invalidFields.push("Due Date", "Due Time");
					return {
						success: false,
						error: `Due Date and time (${format(parsedDate, "yyyy-MM-dd HH:mm:ss")}) cannot be before current datetime.`,
						invalidFields,
					};
				}
				cleanedRow.due_date = format(parsedDate, "yyyy-MM-dd HH:mm:ss");
			} catch {
				invalidFields.push("Due Date", "Due Time");
				return {
					success: false,
					error: `Due Date must be in a valid format and Due Time must be in HH:MM or HH:MM:SS format.`,
					invalidFields,
				};
			}

			// Fix: Use the correct user company ID
			if (!userCompanyId) {
				invalidFields.push("Company");
				return {
					success: false,
					error: `User company not found.`,
					invalidFields,
				};
			}

			// Fix: Validate assignee - check if user exists in the filtered userData
			const assigneeUser = userData?.find(
				(u) => normalizeData(u.email) === normalizeData(cleanedRow.assignee)
			);
			if (!assigneeUser) {
				invalidFields.push("Assignee");
				return {
					success: false,
					error: `Assignee (${cleanedRow.assignee}) is not found in your company.`,
					invalidFields,
				};
			}

			// Fix: Validate assigned_to - check if user exists in the filtered userData
			const assignedToUser = userData?.find(
				(u) => normalizeData(u.email) === normalizeData(cleanedRow.assigned_to)
			);
			if (!assignedToUser) {
				invalidFields.push("Assigned To");
				return {
					success: false,
					error: `Assigned To (${cleanedRow.assigned_to}) is not found in your company.`,
					invalidFields,
				};
			}

			// Set the company_id from the user's company
			cleanedRow.company_id = userCompanyId;

			// Updated tag validation with proper company filtering and field mapping
			if (cleanedRow.tag && cleanedRow.tag.trim()) {
				const normalizedTag = normalizeData(cleanedRow.tag);
				const tagExists = tagData?.some((t) =>
					normalizeData(t.tag_name) === normalizedTag ||
					normalizeData(t.name) === normalizedTag
				);

				if (!tagExists) {
					invalidFields.push("Tag");
					return {
						success: false,
						error: `Invalid Tag: ${cleanedRow.tag}. Please ensure the tag exists in your company.`,
						invalidFields,
					};
				}
			}

			// Validate optional fields only if they have values
			if (
				cleanedRow.branch &&
				!branchData?.some((b) => normalizeData(b.name) === normalizeData(cleanedRow.branch))
			) {
				invalidFields.push("Branch");
				return {
					success: false,
					error: `Invalid Branch: ${cleanedRow.branch}.`,
					invalidFields,
				};
			}

			if (
				cleanedRow.department &&
				!departmentData?.some((d) => normalizeData(d.name) === normalizeData(cleanedRow.department))
			) {
				invalidFields.push("Department");
				return {
					success: false,
					error: `Invalid Department: ${cleanedRow.department}.`,
					invalidFields,
				};
			}

			if (cleanedRow.checker) {
				const checkerUser = userData?.find(
					(u) => normalizeData(u.email) === normalizeData(cleanedRow.checker)
				);
				if (!checkerUser) {
					invalidFields.push("Checker");
					return {
						success: false,
						error: `Checker (${cleanedRow.checker}) is not found in your company.`,
						invalidFields,
					};
				}
			}

			// Handle boolean fields similar to AddTaskSheet
			const uploadRequiredValue = cleanedRow.upload_required
				?.toString()
				.toLowerCase()
				?.trim();
			cleanedRow.upload_required =
				uploadRequiredValue === "yes" || uploadRequiredValue === "1" ? 1 : 0;

			const restrictValue = cleanedRow.restrict?.toString().toLowerCase()?.trim();
			cleanedRow.restrict =
				restrictValue === "yes" || restrictValue === "1" ? 1 : 0;

			// Set default values similar to AddTaskSheet
			cleanedRow.enabled = 1;
			cleanedRow.is_completed = 0;
			cleanedRow.is_help_ticket = 0;

			if (isRecurring) {
				if (
					!cleanedRow.frequency ||
					!validFrequencies.includes(cleanedRow.frequency)
				) {
					invalidFields.push("Frequency");
					return {
						success: false,
						error: `Frequency must be one of: ${validFrequencies.join(", ")}.`,
						invalidFields,
					};
				}

				// Create base recurrence object
				const recurrence: any = {
					frequency: cleanedRow.frequency,
					interval: 1,
				};

				// Handle Week Days - only add if it has a value
				const weekDaysValue = cleanedRow.week_days?.toString().trim();
				if (weekDaysValue) {
					recurrence.week_days = weekDaysValue;
				}

				// Handle Nth Week - only add if it has a value
				const nthWeekValue = cleanedRow.nth_week?.toString().trim();
				if (nthWeekValue) {
					recurrence.nth_week = nthWeekValue;
				}

				if (recurrence.frequency === "Weekly" && !recurrence.week_days) {
					invalidFields.push("Week Days");
					return {
						success: false,
						error: `Week Days are required for Weekly recurring tasks.`,
						invalidFields,
					};
				}

				if (recurrence.week_days) {
					const days = recurrence.week_days
						.split(",")
						.map((d: string) => d.trim());
					if (!days.every((d: string) => validWeekDays.includes(d))) {
						invalidFields.push("Week Days");
						return {
							success: false,
							error: `Week Days must be: ${validWeekDays.join(", ")}.`,
							invalidFields,
						};
					}
				}

				if (recurrence.frequency === "Monthly") {
					// Handle two types of monthly recurrence
					if (recurrence.week_days && recurrence.nth_week) {
						// Nth weekday of month (e.g., "2nd Monday")
						const validNthWeeks = ["1st", "2nd", "3rd", "4th", "Last"];
						if (!validNthWeeks.includes(recurrence.nth_week)) {
							invalidFields.push("Nth Week");
							return {
								success: false,
								error: `Nth Week must be one of: ${validNthWeeks.join(", ")}.`,
								invalidFields,
							};
						}
						// Validate that week_days has only one day for monthly nth week
						const days = recurrence.week_days
							.split(",")
							.map((d: string) => d.trim());
						if (days.length !== 1 || !validWeekDays.includes(days[0])) {
							invalidFields.push("Week Days");
							return {
								success: false,
								error: `For Monthly with Nth Week, Week Days must contain exactly one valid weekday.`,
								invalidFields,
							};
						}
					} else if (!recurrence.week_days && !recurrence.nth_week) {
						// Specific day of month - use the day from due_date
						const dueDate = new Date(cleanedRow.due_date);
						recurrence.month_days = dueDate.getDate();
					} else {
						// Invalid combination
						invalidFields.push("Week Days", "Nth Week");
						return {
							success: false,
							error: `For Monthly recurrence, either provide both Week Days and Nth Week (for nth weekday), or neither (for specific day of month).`,
							invalidFields,
						};
					}
				}

				cleanedRow.recurrence_type_id = [recurrence];

				// Clean up separate frequency fields
				delete cleanedRow.frequency;
				delete cleanedRow.week_days;
				delete cleanedRow.nth_week;
			}

			// Clean up the separate date/time fields since we've merged them
			delete cleanedRow.due_time;
			delete cleanedRow.due_date_;

			return { success: true, cleanedRow, invalidFields };
		},
		[userData, userCompanyId, tagData, branchData, departmentData],
	);

	const validateDataBeforeImport = useCallback(async () => {
		const validationErrors: {
			rowIndex: number;
			error: string;
			invalidFields: string[];
		}[] = [];

		// Pre-validate tags
		if (name !== "Holiday") {
			const tagValidation = await preValidateTags(data);
			if (!tagValidation.isValid) {
				return [{
					rowIndex: 0,
					error: tagValidation.message || "Tag validation failed",
					invalidFields: ["Tag"],
				}];
			}
		}

		// Validate each row
		data.forEach((row, index) => {
			if (name === "Holiday") {
				const result = validateHolidayData(row, index + 2);
				if (!result.success) {
					validationErrors.push({
						rowIndex: index + 1,
						error: result.error || "Unknown error",
						invalidFields: result.invalidFields,
					});
				}
			} else {
				const isRecurring = row["Task Type *"] === "Recurring";
				const result = validateAndCleanData(row, isRecurring, index + 2);
				if (!result.success) {
					validationErrors.push({
						rowIndex: index + 1,
						error: result.error || "Unknown error",
						invalidFields: result.invalidFields,
					});
				}
			}
		});
		return validationErrors;
	}, [data, validateAndCleanData, validateHolidayData, name, preValidateTags]);

	const importData = async () => {
		setIsImporting(true);
		setImportProgress(0);
		setCurrentImportItem("");
		setImportResult(null);
		setShowConfirmImport(false);

		try {
			if (!data.length) {
				toast.error("No data to import.");
				setIsImporting(false);
				return;
			}

			setCurrentImportItem("Validating data...");
			const validationErrors = await validateDataBeforeImport();
			if (validationErrors.length > 0) {
				setImportResult({
					successes: 0,
					failures: validationErrors.map(
						({ rowIndex, error, invalidFields }) => ({
							row: data[rowIndex - 1] || {},
							error,
							invalidFields,
							rowIndex,
						}),
					),
				});
				setIsImporting(false);
				return;
			}

			const result: ImportResult = { successes: 0, failures: [] };
			const totalRows = data.length;

			for (let i = 0; i < data.length; i++) {
				const row = data[i];
				const rowIndex = i + 1;

				setCurrentImportItem(
					`Processing row ${i + 1} of ${totalRows}: ${row["Holiday Name *"] || row["Holiday Name"] || row["Task Name *"] || `Row ${i + 1}`}`,
				);

				try {
					if (name === "Holiday") {
						// Handle holiday import with new schema
						const validationResult = validateHolidayData(row, rowIndex);
						if (!validationResult.success) {
							result.failures.push({
								row,
								error: validationResult.error || `Unknown error.`,
								invalidFields: validationResult.invalidFields,
								rowIndex,
							});
							continue;
						}

						// Create the holiday document with cleaned data
						await createDoc("CG Holiday", validationResult.cleanedRow!);
						result.successes++;
					} else {
						const isRecurring = row["Task Type *"] === "Recurring";
						const doctype = isRecurring
							? "CG Task Definition"
							: "CG Task Instance";
						const validationResult = validateAndCleanData(
							row,
							isRecurring,
							rowIndex,
						);
						if (!validationResult.success) {
							result.failures.push({
								row,
								error: validationResult.error || `Unknown error.`,
								invalidFields: validationResult.invalidFields,
								rowIndex,
							});
							continue;
						}

						// Create the task document with cleaned data
						// Use the tag name directly since autoname makes name = tag_name in CG Tags
						const taskData = {
							...validationResult.cleanedRow!,
							tag: validationResult.cleanedRow!.tag?.trim() || "",
						};

						await createDoc(doctype, taskData);
						result.successes++;
					}
				} catch (err) {
					// Extract the proper error message from server response
					const errorMessage = extractServerErrorMessage(err);
					result.failures.push({
						row,
						error: errorMessage,
						invalidFields: [],
						rowIndex,
					});
				}
				setImportProgress(((i + 1) / totalRows) * 100);

				// Small delay to prevent overwhelming the API
				await new Promise((resolve) => setTimeout(resolve, 50));
			}

			setImportResult(result);
			setCurrentImportItem("");

			if (result.successes > 0) {
				toast.success(
					` Successfully imported ${result.successes} ${name === "Holiday" ? "holidays" : "tasks"}!`,
				);
			}

			if (result.failures.length === 0) {
				setTimeout(() => {
					setIsDialogOpen(false);
					resetDialog();
				}, 2000);
			}
		} catch (err) {
			console.error("Unexpected error:", err);
			toast.error("An unexpected error occurred during import.");
		} finally {
			setIsImporting(false);
		}
	};

	const downloadEmptySheet = useCallback(
		(taskType = "one_time") => {
			const now = new Date();
			const currentDate = format(now, "yyyy-MM-dd");
			const currentTime = format(now, "HH:mm:ss");

			let headers: string[] = [];
			let sampleRows: any[][] = [];
			let dropdowns: Record<string, string[]> = {};
			const weekdays = [
				"Monday",
				"Tuesday",
				"Wednesday",
				"Thursday",
				"Friday",
				"Saturday",
				"Sunday",
			];

			if (name === "Holiday") {
				headers = [
					"Holiday Name *",
					"Branch Name *",
					"Holiday Type",
					"Is Recurring",
					"Holiday Date",
					"Recurrence Type",
					"Days of Week",
					"Week Occurrence",
					"Recurrence Interval",
				];
				sampleRows = [
					[
						"New Year's Day",
						branchData?.[0]?.branch_name ?? "Branch 1",
						"Public Holiday",
						"No",
						"2025-01-01",
						"",
						"",
						"",
						"1"
					],
					[
						"Weekly Off - Weekend",
						branchData?.[0]?.branch_name ?? "Branch 1",
						"Weekly Off",
						"Yes",
						"",
						"Weekly",
						"Sat,Sun",
						"",
						"1"
					],
					[
						"Monthly Team Meeting Day",
						branchData?.[0]?.branch_name ?? "Branch 1",
						"Public Holiday",
						"Yes",
						"",
						"Monthly",
						"Fri",
						"1st",
						"1"
					],
				];
				dropdowns = {
					"Branch Name": branchData?.map((b) => b.branch_name) || [],
					"Holiday Type": ["Public Holiday", "Weekly Off"],
					"Is Recurring": ["Yes", "No"],
					"Recurrence Type": ["Weekly", "Monthly", "Quarterly", "Yearly"],
					"Days of Week": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
					"Week Occurrence": ["Every", "1st", "2nd", "3rd", "4th", "Last"],
					"Is Optional": ["Yes", "No"],
					"Applicable For": ["All Employees", "Specific Employees"],
				};
			} else if (taskType === "one_time") {
				headers = [
					"Task Name *",
					"Task Type *",
					"Priority *",
					"Due Date *",
					"Due Time *",
					"Assignee *",
					"Assigned To *",
					"Description",
					"Holiday Behaviour *",
					"Upload Required",
					"Tag",
					"Restrict Before or After Due Date",
				];
				sampleRows = [
					[
						"Submit Quarterly Report",
						"Onetime",
						"Medium",
						currentDate,
						currentTime,
						userData?.[0]?.email || "user1@clapgrow.com",
						userData?.[0]?.email || "user1@clapgrow.com",
						"Submit the quarterly project report",
						"Ignore Holiday",
						"No",
						tagData?.[0]?.tag_name || "Project",
						"No",
					],
				];
				dropdowns = {
					"Task Type": ["Onetime"],
					Priority: ["Low", "Medium", "Critical"],
					"Holiday Behaviour": [
						"Previous Working Date",
						"Ignore Holiday",
						"Next Working Date",
					],
					Assignee: userData?.map((u) => u.email) || [],
					"Assigned To": userData?.map((u) => u.email) || [],
					Tag: tagData?.map((t) => t.tag_name) || [],
					"Upload Required": ["Yes", "No"],
					"Restrict Before or After Due Date": ["Yes", "No"],
				};
			} else if (taskType === "recurring") {
				headers = [
					"Task Name *",
					"Task Type *",
					"Priority *",
					"Due Date *",
					"Due Time *",
					"Assignee *",
					"Assigned To *",
					"Description",
					"Holiday Behaviour *",
					"Upload Required",
					"Tag",
					"Restrict Before or After Due Date",
					"Frequency *",
					"Week Days",
					"Nth Week",
				];
				sampleRows = [
					[
						"Daily Status Update",
						"Recurring",
						"Low",
						currentDate,
						"09:00:00",
						userData?.[0]?.email || "user1@clapgrow.com",
						userData?.[0]?.email || "user1@clapgrow.com",
						"Submit daily status update",
						"Ignore Holiday",
						"No",
						tagData?.[0]?.tag_name || "Daily",
						"No",
						"Daily",
						"",
						"",
					],
					[
						"Weekly Team Meeting",
						"Recurring",
						"Medium",
						currentDate,
						"10:00:00",
						userData?.[1]?.email || "user2@clapgrow.com",
						userData?.[2]?.email || "user3@clapgrow.com",
						"Weekly team sync",
						"Next Working Date",
						"No",
						tagData?.[1]?.tag_name || "Meetings",
						"Yes",
						"Weekly",
						"Monday,Wednesday",
						"",
					],
					[
						"Monthly Report",
						"Recurring",
						"Critical",
						currentDate,
						"17:00:00",
						userData?.[3]?.email || "user4@clapgrow.com",
						userData?.[3]?.email || "user4@clapgrow.com",
						"Submit monthly report",
						"Previous Working Date",
						"Yes",
						tagData?.[2]?.tag_name || "Reporting",
						"No",
						"Monthly",
						"",
					],
					[
						"Monthly Team Meeting",
						"Recurring",
						"Medium",
						currentDate,
						"14:00:00",
						userData?.[2]?.email || "user3@clapgrow.com",
						userData?.[1]?.email || "user2@clapgrow.com",
						"First Monday team meeting",
						"Ignore Holiday",
						"No",
						tagData?.[3]?.tag_name || "Meetings",
						"No",
						"Monthly",
						"Monday",
						"1st",
					],
				];
				dropdowns = {
					"Task Type": ["Recurring"],
					Priority: ["Low", "Medium", "Critical"],
					"Holiday Behaviour": [
						"Previous Working Date",
						"Ignore Holiday",
						"Next Working Date",
					],
					Assignee:
						userData
							?.filter((u) => u.company_id === companyDetails?.[0]?.name)
							.map((u) => u.email) || [],
					"Assigned To":
						userData
							?.filter((u) => u.company_id === companyDetails?.[0]?.name)
							.map((u) => u.email) || [],
					Tag: tagData?.map((t) => t.tag_name) || [],
					"Upload Required": ["Yes", "No"],
					"Restrict Before or After Due Date": ["Yes", "No"],
					Frequency: ["Daily", "Weekly", "Monthly", "Yearly"],
					"Week Days": weekdays,
					"Nth Week": ["1st", "2nd", "3rd", "4th", "Last"],
					Branch: branchData?.map((b) => b.name) || [],
					Department: departmentData?.map((d) => d.name) || [],
					Checker:
						userData
							?.filter((u) => u.company_id === companyDetails?.[0]?.name)
							.map((u) => u.email) || [],
				};
			}

			const wb = XLSX.utils.book_new();
			const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);

			Object.keys(dropdowns).forEach((field) => {
				const colIndex = headers.indexOf(field);
				if (colIndex !== -1) {
					const range = {
						s: { r: 1, c: colIndex },
						e: { r: 1000, c: colIndex },
					};
					const options = dropdowns[field]
						.map((opt) => `"${opt.replace(/"/g, '""').replace(/,/g, "\\,")}"`)
						.join(",");
					ws["!dataValidations"] = ws["!dataValidations"] || {};
					const cellRange = `${XLSX.utils.encode_cell({ r: range.s.r, c: colIndex })}:${XLSX.utils.encode_cell({ r: range.e.r, c: colIndex })}`;
					ws["!dataValidations"][cellRange] = {
						type: "list",
						allowBlank: true,
						formula1: `"${options}"`,
						showDropDown: true,
					};
				}
			});

			ws["!cols"] = headers.map(() => ({ wch: 20 }));

			// Instructions sheet
			const instructions = [
				["Import Instructions"],
				[],
				[
					"This document provides instructions for importing data into the system. Follow the guidelines below to ensure successful data import.",
				],
				[],
				["General Notes"],
				["- Fields marked with an asterisk (*) are mandatory."],
				...(name === "Holiday"
					? [
						["- Branch Name must match an existing branch display name in the system."],
						["- Holiday Type must be either 'Public Holiday' or 'Weekly Off'."],
						["- For recurring holidays: Pattern configuration is required."],
						["- For non-recurring holidays: Holiday Date is required."],
						["- Days of Week format: Use comma-separated short names (Mon,Tue,Wed,Thu,Fri,Sat,Sun)."],
						["- For Monthly recurring: Both Days of Week and Week Occurrence are required."],
						["- For Weekly recurring: Only Days of Week is required."],
						["- Date format: YYYY-MM-DD (e.g., 2025-01-01)."],
						["- Start Date is automatically set to current date for all holidays."],
					]
					: [
						[
							"- For Monthly recurring tasks: Use either specific day of month (leave Week Days and Nth Week empty) OR nth weekday of month (provide both Week Days and Nth Week).",
						],
						[
							"- For Recurring tasks with Monthly frequency using specific day, the recurrence will be set to the day of the month specified in Due Date.",
						],
						["- Ensure all users and tags exist in the system."],
						[
							"- Due Date must be in format YYYY-MM-DD and Due Time in HH:MM:SS format.",
						],
						[
							"- The combined due date and time must not be before the current datetime.",
						],
						["- Tags must exist in your company. Create tags first if they don't exist."],
					]),
				["- Use the sample sheet as a template to avoid errors."],
				[],
				["Field Descriptions"],
				...(name === "Holiday"
					? [
						[
							"Holiday Name *",
							"Name of the holiday",
							"New Year's Day",
							"Required. Keep it descriptive.",
						],
						[
							"Branch Name *",
							"Display name of the branch",
							"Main Branch",
							"Required. Must match an existing branch display name exactly.",
						],
						[
							"Holiday Type",
							"Type of holiday",
							"Public Holiday",
							"Optional. Choose from Public Holiday or Weekly Off.",
						],
						[
							"Is Recurring",
							"Whether holiday repeats",
							"No",
							"Select Yes for recurring holidays, No for one-time holidays.",
						],
						[
							"Holiday Date",
							"Date of the holiday",
							"2025-01-01",
							"Required for non-recurring holidays. Format: YYYY-MM-DD.",
						],
						[
							"Recurrence Type",
							"How often holiday repeats",
							"Weekly",
							"Required for recurring holidays. Choose from Weekly, Monthly, Quarterly, Yearly.",
						],
						[
							"Days of Week",
							"Which days holiday occurs",
							"Sat,Sun",
							"Required for Weekly/Monthly recurring. Comma-separated: Mon,Tue,Wed,Thu,Fri,Sat,Sun.",
						],
						[
							"Week Occurrence",
							"Which week of month",
							"1st",
							"Required for Monthly recurring. Choose from Every, 1st, 2nd, 3rd, 4th, Last.",
						],
						[
							"Recurrence Interval",
							"Repeat every N periods",
							"1",
							"Optional. Number of weeks/months/quarters/years between occurrences. Default: 1.",
						]
					]
					: [
						[
							"Task Name *",
							"Name of the task",
							"Daily Status Update",
							"Required. Keep it descriptive.",
						],
						[
							"Task Type *",
							"Type of task",
							"Recurring",
							"Required. Select 'Onetime' or 'Recurring'.",
						],
						[
							"Priority *",
							"Task priority",
							"Medium",
							"Required. Choose from Low, Medium, Critical.",
						],
						[
							"Due Date *",
							"Task due date",
							"2025-06-26",
							"Required. Format: YYYY-MM-DD. Combined with Due Time, must not be before current datetime.",
						],
						[
							"Due Time *",
							"Task due time",
							"12:00:00",
							"Required. Format: HH:MM:SS or HH:MM. Combined with Due Date, must not be before current datetime.",
						],
						[
							"Assignee *",
							"Person responsible",
							"user1@clapgrow.com",
							"Required. Must be a user in your company.",
						],
						[
							"Assigned To *",
							"Person assigned to",
							"user1@clapgrow.com",
							"Required. Must be a user in your company.",
						],
						[
							"Description",
							"Task details",
							"Submit daily status update",
							"Optional.",
						],
						[
							"Holiday Behaviour *",
							"Handling of holidays",
							"Ignore Holiday",
							"Required. Choose how to handle holidays.",
						],
						[
							"Upload Required",
							"Requires file upload",
							"No",
							"Select Yes or No.",
						],
						[
							"Tag",
							"Task category",
							"Daily",
							"Optional. Select from available tags in your company. Create tags first if they don't exist.",
						],
						[
							"Restrict Before or After Due Date",
							"Restrict task timing",
							"No",
							"Select Yes or No.",
						],
						[
							"Frequency *",
							"Recurrence frequency",
							"Daily",
							"Required for Recurring tasks. Choose from Daily, Weekly, Monthly, Yearly.",
						],
						[
							"Week Days",
							"Days for Weekly tasks",
							"Monday,Wednesday",
							"For Weekly tasks: Comma-separated days. For Monthly with Nth Week: Single weekday only.",
						],
						[
							"Nth Week",
							"Which week of the month",
							"1st",
							"For Monthly tasks only. Use with Week Days to specify 'nth weekday of month' (e.g., '2nd Monday'). Leave empty for specific day of month.",
						],
					]),
			];

			const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
			wsInstructions["!cols"] = [
				{ wch: 30 },
				{ wch: 50 },
				{ wch: 30 },
				{ wch: 80 },
			]; // Adjust column widths
			wsInstructions["!rows"] = instructions.map(() => ({ hpt: 20 }));
			wsInstructions["!gridLines"] = { showGridLines: false };

			XLSX.utils.book_append_sheet(
				wb,
				ws,
				name === "Holiday" ? "Holidays" : "Tasks",
			);
			XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");
			XLSX.writeFile(wb, `${name.toLowerCase()}-${taskType}-sample-sheet.xlsx`);

			toast.success("Sample sheet downloaded successfully!");
		},
		[name, branchData, userData, companyDetails, tagData, departmentData],
	);

	const handleFileChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target?.files?.[0];
			if (
				file &&
				file.type.includes(
					"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				)
			) {
				setFileName(file.name);
				parseFile(file);
			} else {
				setError("Please upload a valid Excel file (.xlsx).");
			}
		},
		[parseFile],
	);

	const handleDrop = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault();
			setIsDragOver(false);
			const file = e.dataTransfer?.files?.[0];
			if (
				file &&
				file.type.includes(
					"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				)
			) {
				setFileName(file.name);
				parseFile(file);
			} else {
				setError(
					"Invalid file type. Please upload a valid Excel file (.xlsx).",
				);
			}
		},
		[parseFile],
	);

	const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragOver(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragOver(false);
	}, []);

	const renderDataPreview = () => {
		if (data.length === 0) return null;

		const headers = Object.keys(data[0]);
		const startIndex = showFullPreview ? previewStartIndex : 0;
		const endIndex = showFullPreview
			? Math.min(startIndex + PREVIEW_ROWS_PER_PAGE, data.length)
			: Math.min(5, data.length);
		const previewData = data.slice(startIndex, endIndex);

		const canGoNext = endIndex < data.length;
		const canGoPrev = startIndex > 0;

		return (
			<div className="space-y-4">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
					<div className="flex items-center gap-3">
						<h3 className="text-lg font-semibold text-gray-900">
							Data Preview
						</h3>
						<Badge variant="secondary" className="text-sm">
							{data.length} rows loaded
						</Badge>
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowFullPreview(!showFullPreview)}
							className="flex items-center gap-2 text-xs sm:text-sm"
						>
							{showFullPreview ? (
								<EyeOff className="w-4 h-4" />
							) : (
								<Eye className="w-4 h-4" />
							)}
							<span className="hidden sm:inline">
								{showFullPreview ? "Collapse" : "Expand"}
							</span>
							<span className="sm:hidden">
								{showFullPreview ? "Less" : "More"}
							</span>
						</Button>
					</div>
				</div>

				<div className="border rounded-lg overflow-hidden bg-white shadow-sm">
					<div
						className={showFullPreview ? "max-h-96" : "max-h-48"}
						style={{ overflowY: "auto" }}
					>
						{/* Mobile Card View for small screens */}
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
														<span className="text-xs font-medium text-gray-500 truncate">
															{key}
														</span>
														<span
															className="text-sm text-gray-900 truncate"
															title={String(row[key])}
														>
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

						{/* Desktop Table View for larger screens */}
						<div className="hidden sm:block overflow-x-auto">
							<Table>
								<TableHeader className="sticky top-0 bg-gray-50 z-10">
									<TableRow>
										{showFullPreview && (
											<TableHead className="text-xs font-medium px-3 py-2 w-16 border-r">
												#
											</TableHead>
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
											<TableRow
												key={actualRowIndex}
												className="hover:bg-gray-50"
											>
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

				{showFullPreview && data.length > PREVIEW_ROWS_PER_PAGE && (
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-600">
						<span className="text-center sm:text-left">
							Showing rows {startIndex + 1}-{endIndex} of {data.length}
						</span>
						<div className="flex items-center justify-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() =>
									setPreviewStartIndex(
										Math.max(0, startIndex - PREVIEW_ROWS_PER_PAGE),
									)
								}
								disabled={!canGoPrev}
								className="text-xs sm:text-sm"
							>
								Previous
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() =>
									setPreviewStartIndex(startIndex + PREVIEW_ROWS_PER_PAGE)
								}
								disabled={!canGoNext}
								className="text-xs sm:text-sm"
							>
								Next
							</Button>
						</div>
					</div>
				)}

				{!showFullPreview && data.length > 5 && (
					<p className="text-sm text-gray-500 text-center">
						Showing first 5 rows of {data.length} total rows
					</p>
				)}
			</div>
		);
	};

	const renderImportResults = () => {
		if (!importResult) return null;

		return (
			<div className="space-y-4">
				<h3 className="text-lg font-semibold text-gray-900">Import Results</h3>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
					{importResult.successes > 0 && (
						<div className="p-4 bg-green-50 border border-green-200 rounded-lg">
							<div className="flex items-center gap-3">
								<CheckCircle className="w-5 h-5 text-green-600" />
								<div>
									<p className="font-semibold text-green-800">
										{importResult.successes} Successfully Imported
									</p>
									<p className="text-sm text-green-700">
										{name === "Holiday" ? "holidays" : "tasks"} added to the
										system
									</p>
								</div>
							</div>
						</div>
					)}

					{importResult.failures.length > 0 && (
						<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
							<div className="flex items-center gap-3">
								<XCircle className="w-5 h-5 text-red-600" />
								<div>
									<p className="font-semibold text-red-800">
										{importResult.failures.length} Failed to Import
									</p>
									<p className="text-sm text-red-700">
										Check error details below
									</p>
								</div>
							</div>
						</div>
					)}
				</div>

				{importResult.failures.length > 0 && (
					<div className="space-y-3">
						<h4 className="font-semibold text-gray-900 flex items-center gap-2">
							<AlertCircle className="w-4 h-4 text-orange-500" />
							Error Details
						</h4>

						<div className="border rounded-lg overflow-hidden bg-white shadow-sm">
							<div className="max-h-64 overflow-y-auto">
								{/* Mobile Card View for small screens */}
								<div className="block sm:hidden">
									<div className="divide-y divide-gray-200">
										{importResult.failures.map(
											({ error, invalidFields, rowIndex }, idx) => (
												<div key={idx} className="p-4 space-y-3">
													<div className="flex items-center justify-between">
														<Badge variant="destructive" className="text-xs">
															Row {rowIndex}
														</Badge>
													</div>
													<div className="space-y-2">
														<div>
															<span className="text-xs font-medium text-gray-500">
																Invalid Fields:
															</span>
															<div className="flex flex-wrap gap-1 mt-1">
																{invalidFields.length > 0 ? (
																	invalidFields.map((field, i) => (
																		<Badge
																			key={i}
																			variant="outline"
																			className="text-xs"
																		>
																			{field}
																		</Badge>
																	))
																) : (
																	<span className="text-gray-400 text-xs">
																		N/A
																	</span>
																)}
															</div>
														</div>
														<div>
															<span className="text-xs font-medium text-gray-500">
																Error:
															</span>
															<p className="text-xs text-red-600 mt-1">
																{error}
															</p>
														</div>
													</div>
												</div>
											),
										)}
									</div>
								</div>

								{/* Desktop Table View for larger screens */}
								<div className="hidden sm:block">
									<Table>
										<TableHeader className="sticky top-0 bg-gray-50 z-10">
											<TableRow>
												<TableHead className="text-xs font-medium px-3 py-2 w-16">
													Row #
												</TableHead>
												<TableHead className="text-xs font-medium px-3 py-2 w-40">
													Invalid Fields
												</TableHead>
												<TableHead className="text-xs font-medium px-3 py-2">
													Error Description
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{importResult.failures.map(
												({ error, invalidFields, rowIndex }, idx) => (
													<TableRow key={idx} className="hover:bg-gray-50">
														<TableCell className="text-xs px-3 py-2 font-mono bg-red-50">
															<Badge variant="destructive" className="text-xs">
																{rowIndex}
															</Badge>
														</TableCell>
														<TableCell className="text-xs px-3 py-2">
															<div className="flex flex-wrap gap-1">
																{invalidFields.length > 0 ? (
																	invalidFields.map((field, i) => (
																		<Badge
																			key={i}
																			variant="outline"
																			className="text-xs"
																		>
																			{field}
																		</Badge>
																	))
																) : (
																	<span className="text-gray-400">N/A</span>
																)}
															</div>
														</TableCell>
														<TableCell className="text-xs px-3 py-2 text-red-600">
															<div className="max-w-md" title={error}>
																{error}
															</div>
														</TableCell>
													</TableRow>
												),
											)}
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

	// Helper function to get tooltip text based on context
	const getTooltipText = () => {
		if (name === "Holiday") {
			return "Upload Holidays";
		} else {
			return "Upload Tasks";
		}
	};

	if (isDataLoading) {
		return (
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<div className="flex items-center justify-center gap-2 bg-gray-100 border border-gray-300 rounded-lg h-9 px-3 cursor-not-allowed">
							<RefreshCw className="w-4 h-4 animate-spin" />
							<span className="text-sm text-gray-500">Loading...</span>
						</div>
					</TooltipTrigger>
					<TooltipContent>
						<p>Loading required data...</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		);
	}

	return (
		<>
			<TooltipProvider>
				<Dialog
					open={isDialogOpen}
					onOpenChange={(open) => {
						setIsDialogOpen(open);
						if (!open) {
							resetDialog();
						}
					}}
				>
					<DialogTrigger>
						{name === "Tasks" ? (
							<div className="hidden md:block">
								<Tooltip>
									<TooltipTrigger asChild>
										<div className="flex items-center justify-center gap-2 bg-white border border-[#ACABB2] rounded-lg h-9 w-10 cursor-pointer hover:bg-gray-50 transition-all duration-200 hover:border-gray-400">
											<img
												src={UploadIcon}
												alt="Upload icon"
												className="w-5 h-5"
											/>
										</div>
									</TooltipTrigger>
									<TooltipContent className="font-medium text-sm">
										<p>{getTooltipText()}</p>
									</TooltipContent>
								</Tooltip>
							</div>
						) : roleBaseName !== "ROLE-Member" ? (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="outline"
										className="text-[#038EE2] border-[#038EE2] flex items-center gap-2 hover:bg-blue-50 transition-all duration-200"
									>
										Upload Holiday List
										<ArrowUpFromLine className="w-4 h-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent className="font-medium text-sm">
									<p>{getTooltipText()}</p>
								</TooltipContent>
							</Tooltip>
						) : null}
					</DialogTrigger>

					<DialogContent className="max-w-7xl max-h-[95vh] w-[95vw] sm:w-[90vw] lg:w-[85vw] flex flex-col">
						<DialogHeader className="flex-shrink-0">
							<DialogTitle className="text-xl font-bold flex items-center gap-2">
								<Upload className="w-5 h-5 text-blue-600" />
								Import {name === "Holiday" ? "Holidays" : "Tasks"}
							</DialogTitle>
							<DialogDescription className="text-gray-600">
								Upload an Excel file (.xlsx) to import{" "}
								{name === "Holiday" ? "holidays" : "tasks"}. Download a sample
								sheet below for the correct format and guidelines.
							</DialogDescription>
						</DialogHeader>

						<div className="flex flex-col flex-1 space-y-6 overflow-hidden">
							{/* Sample Sheet Download Section */}
							<div className="flex-shrink-0 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
								<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
									<div className="flex items-center gap-3">
										<Download className="w-5 h-5 text-blue-600 flex-shrink-0" />
										<div>
											<h4 className="font-semibold text-blue-900 text-sm sm:text-base">
												Download Sample Templates
											</h4>
											<p className="text-xs sm:text-sm text-blue-700">
												Get started with our pre-configured templates
											</p>
										</div>
									</div>
									<div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
										{name === "Tasks" ? (
											<>
												<Button
													variant="outline"
													size="sm"
													onClick={() => downloadEmptySheet("one_time")}
													className="flex items-center justify-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-100 text-xs sm:text-sm w-full sm:w-auto"
												>
													<FileText className="w-4 h-4" />
													<span className="hidden sm:inline">
														One-time Tasks
													</span>
													<span className="sm:hidden">One-time</span>
												</Button>
												<Button
													variant="outline"
													size="sm"
													onClick={() => downloadEmptySheet("recurring")}
													className="flex items-center justify-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-100 text-xs sm:text-sm w-full sm:w-auto"
												>
													<FileText className="w-4 h-4" />
													<span className="hidden sm:inline">
														Recurring Tasks
													</span>
													<span className="sm:hidden">Recurring</span>
												</Button>
											</>
										) : (
											<Button
												variant="outline"
												size="sm"
												onClick={() => downloadEmptySheet("holiday")}
												className="flex items-center justify-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-100 text-xs sm:text-sm w-full sm:w-auto"
											>
												<FileText className="w-4 h-4" />
												<span className="hidden sm:inline">
													Holiday Template
												</span>
												<span className="sm:hidden">Holiday</span>
											</Button>
										)}
									</div>
								</div>
							</div>

							{/* File Upload Area - Hide during import and results */}
							{!isImporting && !importResult && (
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
														<p className="text-lg font-semibold text-green-800">
															File Loaded Successfully!
														</p>
														<p className="text-sm text-green-700 font-medium">
															{fileName}
														</p>
														<p className="text-xs text-green-600 mt-1">
															{data.length} rows detected
														</p>
													</div>
													<Button
														variant="outline"
														size="sm"
														onClick={() => {
															resetDialog();
															fileInputRef.current?.click();
														}}
														className="flex items-center gap-2"
														disabled={isImporting}
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
														<Upload
															className={`w-8 h-8 ${isDragOver ? "text-blue-600" : "text-gray-500"}`}
														/>
													</div>
													<div>
														<p className="text-lg font-semibold text-gray-700 mb-2">
															{isDragOver
																? "Drop your file here!"
																: "Drag & Drop Excel File"}
														</p>
														<p className="text-sm text-gray-600 mb-4">
															Supports .xlsx files only
														</p>
														<input
															type="file"
															accept=".xlsx"
															onChange={handleFileChange}
															ref={fileInputRef}
															className="hidden"
															disabled={isImporting}
														/>
														<Button
															onClick={() => fileInputRef.current?.click()}
															disabled={isImporting}
															className="bg-blue-600 text-white hover:bg-blue-700"
														>
															Choose File
														</Button>
													</div>
												</>
											)}
										</div>

										{error && (
											<div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
												<div className="flex items-center gap-2">
													<XCircle className="w-5 h-5 text-red-600" />
													<p className="text-sm text-red-700 font-medium">
														{error}
													</p>
												</div>
											</div>
										)}
									</div>
								</div>
							)}

							{/* Step Indicator for Mobile - Show when file upload is hidden */}
							{(isImporting || importResult) && (
								<div className="flex-shrink-0 block sm:hidden">
									<div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
										<div className="flex items-center gap-2">
											<CheckCircle className="w-4 h-4 text-green-600" />
											<span className="text-sm font-medium text-gray-700">
												File: {fileName}
											</span>
										</div>
										<Badge variant="outline" className="text-xs">
											{data.length} rows
										</Badge>
									</div>
								</div>
							)}
							{isImporting && (
								<div className="flex-shrink-0 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
									<div className="space-y-3">
										<div className="flex items-center gap-3">
											<RefreshCw className="w-5 h-5 text-yellow-600 animate-spin" />
											<div>
												<p className="font-semibold text-yellow-800">
													Import in Progress
												</p>
												<p className="text-sm text-yellow-700">
													{currentImportItem || "Processing..."}
												</p>
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

							{/* Content Area - Scrollable */}
							<div className="flex-1 overflow-auto space-y-6">
								{renderDataPreview()}
								{renderImportResults()}
							</div>
						</div>

						<DialogFooter className="flex-shrink-0 pt-4 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
							<div className="flex items-center gap-2 order-2 sm:order-1">
								{data.length > 0 && !isImporting && !importResult && (
									<Button
										onClick={() => setShowConfirmImport(true)}
										className="bg-green-600 text-white hover:bg-green-700 flex items-center gap-2 w-full sm:w-auto"
									>
										<Upload className="w-4 h-4" />
										<span className="hidden sm:inline">
											Import {data.length}{" "}
											{name === "Holiday" ? "Holidays" : "Tasks"}
										</span>
										<span className="sm:hidden">Import ({data.length})</span>
									</Button>
								)}
							</div>

							<div className="flex items-center gap-2 order-1 sm:order-2">
								<Button
									variant="outline"
									onClick={() => {
										if (isImporting) return;
										if (data.length == 0 && !importResult) {
											setIsDialogOpen(false);
										}
										resetDialog();
									}}
									disabled={isImporting}
									className="text-gray-600 w-full sm:w-auto"
								>
									<span className="hidden sm:inline">
										{isImporting
											? "Please wait..."
											: data.length > 0 && !importResult
												? "Clear"
												: "Close"}
									</span>
									<span className="sm:hidden">
										{isImporting
											? "Wait..."
											: data.length > 0 && !importResult
												? "Clear"
												: "Close"}
									</span>
								</Button>
							</div>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</TooltipProvider>

			{/* Confirmation Dialog */}
			<AlertDialog open={showConfirmImport} onOpenChange={setShowConfirmImport}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle className="flex items-center gap-2">
							<AlertCircle className="w-5 h-5 text-orange-500" />
							Confirm Import
						</AlertDialogTitle>
						<AlertDialogDescription className="space-y-2">
							<p>
								You are about to import <strong>{data.length}</strong>{" "}
								{name === "Holiday" ? "holidays" : "tasks"} into the system.
							</p>
							<div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
								<p className="font-medium text-yellow-800">⚠️ Important:</p>
								<p className="text-yellow-700">
									This action cannot be undone. Please ensure your data is
									correct before proceeding.
								</p>
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={importData}
							className="bg-green-600 hover:bg-green-700"
						>
							Yes, Import Now
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
};

export default ImportDialog;
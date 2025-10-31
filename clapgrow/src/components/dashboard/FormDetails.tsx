import React, { useState, useEffect, useCallback } from "react";
import {
	ChevronDown,
	ChevronRight,
	AlertCircle,
	RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { useFrappeGetDoc, useFrappeGetDocList } from "frappe-react-sdk";
import { Badge } from "../ui/badge";

interface FormDetailsProps {
	taskName: string;
}

interface FormDetail {
	label: string;
	value: string | number;
	type:
	| "text"
	| "textarea"
	| "number"
	| "date"
	| "datetime"
	| "currency"
	| "email"
	| "link"
	| "select"
	| "check"
	| "file"
	| "phone";
	fieldtype?: string; // Original Frappe field type
	options?: string; // Field options for special handling
	fileData?: any;
}

const FormDetails: React.FC<FormDetailsProps> = ({ taskName }) => {
	const [isExpanded, setIsExpanded] = useState(true);
	const [formDetails, setFormDetails] = useState<FormDetail[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [retryCount, setRetryCount] = useState(0);

	// Get the current task
	const {
		data: currentTask,
		error: currentTaskError,
		mutate: mutateCurrentTask,
	} = useFrappeGetDoc("CG Task Instance", taskName);

	// Get the task mapping to find workflow info
	const {
		data: taskMappings,
		error: taskMappingsError,
		mutate: mutateTaskMappings,
	} = useFrappeGetDocList("Clapgrow Workflow Task Mapping", {
		fields: ["*"],
		filters: [["task_name", "=", taskName]],
		limit: 1,
	});

	// Get execution log
	const {
		data: executionLog,
		error: executionLogError,
		mutate: mutateExecutionLog,
	} = useFrappeGetDoc(
		"Clapgrow Workflow Execution Log",
		taskMappings?.[0]?.execution_log,
		taskMappings?.[0]?.execution_log ? undefined : null,
	);

	// Get the actual document based on event_doctype and docname from execution log
	const {
		data: actualDocument,
		error: actualDocumentError,
		mutate: mutateActualDocument,
	} = useFrappeGetDoc(
		executionLog?.event_doctype,
		executionLog?.docname,
		executionLog?.event_doctype && executionLog?.docname ? undefined : null,
	);

	// Get document metadata to understand field types
	const { data: documentMeta } = useFrappeGetDoc(
		"DocType",
		executionLog?.event_doctype,
		executionLog?.event_doctype ? undefined : null,
	);

	// Helper function to determine if a field is a Frappe system field
	const isSystemField = (fieldName: string): boolean => {
		const systemFields = [
			"name",
			"owner",
			"creation",
			"modified",
			"modified_by",
			"docstatus",
			"idx",
			"_user_tags",
			"_comments",
			"_assign",
			"_liked_by",
			"_seen",
			"doctype",
			"__islocal",
			"__onload",
			"__unsaved",
		];

		return systemFields.includes(fieldName) || fieldName.startsWith("_");
	};

	// Enhanced field type determination with metadata support
	const determineFieldType = (
		fieldName: string,
		value: any,
		fieldMeta?: any,
	): FormDetail["type"] => {
		// If we have field metadata, use it for accurate type detection
		if (fieldMeta) {
			const fieldtype = fieldMeta.fieldtype;
			const options = fieldMeta.options;

			// Map Frappe field types to our internal types
			switch (fieldtype) {
			case "Data":
				return options === "Phone" ? "phone" : "text";
			case "Small Text":
				return "textarea";
			case "Check":
				return "check";
			case "Select":
				return "select";
			case "Date":
				return "date";
			case "Datetime":
				return "datetime";
			case "Int":
			case "Float":
				return "number";
			case "Link":
				return "link";
			case "Attach":
			case "Attach Image":
				return "file";
			case "Currency":
				return "currency";
			default:
				break;
			}
		}

		// Fallback to heuristic-based detection
		const name = fieldName.toLowerCase();

		// Check for file fields
		if (
			name.includes("file") ||
			name.includes("attachment") ||
			name.includes("image") ||
			name.includes("document")
		) {
			return "file";
		}

		// Check if value looks like a file URL or file path
		if (
			typeof value === "string" &&
			(value.includes("/files/") ||
				value.includes("/private/files/") ||
				value.includes("/assets/") ||
				value.match(
					/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|jpg|jpeg|png|gif|txt|csv)$/i,
				))
		) {
			return "file";
		}

		// Check for phone patterns
		if (
			typeof value === "string" &&
			(value.match(/^[\+]?[\d\s\-\(\)]{7,}$/) ||
				name.includes("phone") ||
				name.includes("mobile") ||
				name.includes("tel"))
		) {
			return "phone";
		}

		// Check for boolean/check fields
		if (typeof value === "boolean" || value === 0 || value === 1) {
			if (
				name.includes("is_") ||
				name.includes("has_") ||
				name.includes("enable") ||
				name.includes("disable") ||
				name.includes("allow") ||
				name.includes("check")
			) {
				return "check";
			}
		}

		// Check for email pattern
		if (
			typeof value === "string" &&
			value.includes("@") &&
			value.includes(".")
		) {
			return "email";
		}

		// Check for URL pattern
		if (
			typeof value === "string" &&
			(value.startsWith("http://") || value.startsWith("https://"))
		) {
			return "link";
		}

		// Check for datetime fields (with time component)
		if (name.includes("datetime") || name.includes("timestamp")) {
			return "datetime";
		}

		// Check for date fields
		if (
			name.includes("date") ||
			name.includes("time") ||
			name.includes("created") ||
			name.includes("modified")
		) {
			return "date";
		}

		// Check for currency fields
		if (
			name.includes("amount") ||
			name.includes("total") ||
			name.includes("price") ||
			name.includes("cost") ||
			name.includes("value") ||
			name.includes("rate") ||
			name.includes("grand_total") ||
			name.includes("net_total") ||
			name.includes("base_")
		) {
			return "currency";
		}

		// Check if value is numeric
		if (
			typeof value === "number" ||
			(!isNaN(Number(value)) && value !== "" && !isNaN(parseFloat(value)))
		) {
			return "number";
		}

		// Check for textarea fields (longer text content)
		if (typeof value === "string" && value.length > 255) {
			return "textarea";
		}

		// Check for select fields
		if (
			typeof value === "string" &&
			value.length < 50 &&
			(name.includes("status") ||
				name.includes("type") ||
				name.includes("method") ||
				name.includes("mode") ||
				name.includes("category"))
		) {
			return "select";
		}

		return "text";
	};

	// Enhanced field value formatting
	const formatFieldValue = (
		value: any,
		fieldType: FormDetail["type"],
	): string => {
		if (value === null || value === undefined) {
			return "Not Set";
		}

		if (fieldType === "check") {
			return value === 1 || value === true ? "Yes" : "No";
		}

		if (fieldType === "date" && value) {
			try {
				const date = new Date(value);
				if (!isNaN(date.getTime())) {
					return format(date, "MMM dd, yyyy");
				}
			} catch (e) {
				return String(value);
			}
		}

		if (fieldType === "datetime" && value) {
			try {
				const date = new Date(value);
				if (!isNaN(date.getTime())) {
					return format(date, "MMM dd, yyyy HH:mm");
				}
			} catch (e) {
				return String(value);
			}
		}

		if (fieldType === "currency" && value) {
			const numValue = typeof value === "number" ? value : parseFloat(value);
			if (!isNaN(numValue)) {
				return new Intl.NumberFormat("en-US", {
					style: "currency",
					currency: "USD",
				}).format(numValue);
			}
		}

		if (fieldType === "number" && value) {
			const numValue = typeof value === "number" ? value : parseFloat(value);
			if (!isNaN(numValue)) {
				return new Intl.NumberFormat("en-US").format(numValue);
			}
		}

		if (fieldType === "phone" && value) {
			// Format phone number if it's a valid phone pattern
			const phoneStr = String(value).replace(/\D/g, "");
			if (phoneStr.length >= 10) {
				return phoneStr.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3");
			}
		}

		return String(value);
	};

	// Helper function to create readable labels from field names
	const createLabel = (fieldName: string): string => {
		return fieldName
			.split("_")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
	};

	// Get field metadata for a specific field
	const getFieldMetadata = (fieldName: string) => {
		if (!documentMeta?.fields) return null;
		return documentMeta.fields.find(
			(field: any) => field.fieldname === fieldName,
		);
	};

	// Retry mechanism with exponential backoff
	const retryDataFetch = useCallback(async () => {
		if (retryCount >= 3) {
			setError(
				"Maximum retry attempts reached. Please refresh the page or contact support.",
			);
			return;
		}

		setIsLoading(true);
		setError(null);
		setRetryCount((prev) => prev + 1);

		try {
			await mutateCurrentTask();
			await mutateTaskMappings();

			if (taskMappings?.[0]?.execution_log) {
				await mutateExecutionLog();
			}

			if (executionLog?.event_doctype && executionLog?.docname) {
				await mutateActualDocument();
			}
		} catch (err) {
			const errorMessage = `Failed to fetch data after ${retryCount + 1} attempts: ${err}`;
			console.error(errorMessage);
			setError(errorMessage);
		} finally {
			setIsLoading(false);
		}
	}, [
		retryCount,
		mutateCurrentTask,
		mutateTaskMappings,
		mutateExecutionLog,
		mutateActualDocument,
		taskMappings,
		executionLog,
	]);

	// Error detection and retry trigger
	useEffect(() => {
		const hasErrors =
			currentTaskError ||
			taskMappingsError ||
			executionLogError ||
			actualDocumentError;

		if (hasErrors && retryCount < 3) {
			const timer = setTimeout(
				() => {
					retryDataFetch();
				},
				1000 * Math.pow(2, retryCount),
			);

			return () => clearTimeout(timer);
		}
	}, [
		currentTaskError,
		taskMappingsError,
		executionLogError,
		actualDocumentError,
		retryCount,
		retryDataFetch,
	]);

	// Process form details from actual document
	useEffect(() => {
		if (executionLog && actualDocument) {
			setIsLoading(true);

			try {
				const details: FormDetail[] = [];

				// Process all document fields dynamically, excluding system fields
				Object.keys(actualDocument).forEach((fieldName) => {
					const value = actualDocument[fieldName];

					// Skip system fields, null/undefined values, and empty strings
					if (
						isSystemField(fieldName) ||
						value === null ||
						value === undefined ||
						value === "" ||
						(Array.isArray(value) && value.length === 0)
					) {
						return;
					}

					// Skip complex objects (like child tables) but allow simple objects
					if (
						typeof value === "object" &&
						value !== null &&
						!Array.isArray(value)
					) {
						return;
					}

					// Handle array values (like child table data)
					if (Array.isArray(value) && value.length > 0) {
						details.push({
							label: createLabel(fieldName),
							value: `${value.length} items`,
							type: "text",
						});
						return;
					}

					const fieldMeta = getFieldMetadata(fieldName);
					const fieldType = determineFieldType(fieldName, value, fieldMeta);
					const label = createLabel(fieldName);

					if (fieldType === "file") {
						// Handle file fields specially
						try {
							let fileData = [];
							let displayValue = "";

							if (typeof value === "string") {
								try {
									const parsedFiles = JSON.parse(value);
									if (Array.isArray(parsedFiles)) {
										fileData = parsedFiles;
										displayValue = `${parsedFiles.length} file(s)`;
									} else {
										fileData = [{ file_url: value }];
										displayValue = value.split("/").pop() || "Download File";
									}
								} catch (e) {
									fileData = [{ file_url: value }];
									displayValue = value.split("/").pop() || "Download File";
								}
							}

							details.push({
								label: label,
								value: displayValue,
								type: fieldType,
								fieldtype: fieldMeta?.fieldtype,
								options: fieldMeta?.options,
								fileData: fileData,
							});
						} catch (e) {
							details.push({
								label: label,
								value: String(value),
								type: "text",
								fieldtype: fieldMeta?.fieldtype,
								options: fieldMeta?.options,
							});
						}
					} else {
						const formattedValue = formatFieldValue(value, fieldType);
						details.push({
							label: label,
							value: formattedValue,
							type: fieldType,
							fieldtype: fieldMeta?.fieldtype,
							options: fieldMeta?.options,
						});
					}
				});

				setFormDetails(details);
			} catch (error) {
				console.error("Error processing document fields:", error);
				setError(`Error processing document fields: ${error}`);
				setFormDetails([]);
			} finally {
				setIsLoading(false);
			}
		}
	}, [executionLog, actualDocument, documentMeta]);

	// Don't render if task is not Process type
	if (currentTask?.task_type !== "Process") {
		return null;
	}

	// Show loading state
	if (isLoading) {
		return (
			<div className="mb-6 border border-[#E5E7EB] rounded-lg bg-white shadow-sm p-4">
				<div className="flex items-center gap-3">
					<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#3B82F6]"></div>
					<span className="text-sm text-[#6B7280]">
						Loading form details...
					</span>
				</div>
			</div>
		);
	}

	// Show error state with retry option
	if (error) {
		return (
			<div className="mb-6 border border-red-200 bg-red-50 rounded-lg p-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<AlertCircle className="w-5 h-5 text-red-500" />
						<div>
							<h3 className="font-medium text-red-800">
								Form Details Unavailable
							</h3>
							<p className="text-sm text-red-600 mt-1">{error}</p>
							{retryCount > 0 && (
								<p className="text-xs text-red-500 mt-1">
									Retry attempts: {retryCount}/3
								</p>
							)}
						</div>
					</div>
					<button
						onClick={retryDataFetch}
						disabled={retryCount >= 3}
						className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<RefreshCw className="w-4 h-4" />
						Retry
					</button>
				</div>
			</div>
		);
	}

	const formatValue = (detail: FormDetail): string => {
		if (detail.type === "email") {
			return detail.value as string;
		}

		if (detail.type === "link") {
			return detail.value as string;
		}

		return String(detail.value);
	};

	return (
		<div className="mb-6 bg-[#EFF9FF]rounded-lg">
			<button
				onClick={() => setIsExpanded(!isExpanded)}
				className="w-full flex items-center justify-between p-4 transition-colors rounded-t-lg bg-[#EFF9FF]"
			>
				<div className="flex items-center gap-3">
					{isExpanded ? (
						<ChevronDown className="w-5 h-5" />
					) : (
						<ChevronRight className="w-5 h-5" />
					)}
					<div className="flex items-center gap-2">
						<h3 className="font-[600] text-[16px]">Form Details</h3>
					</div>
				</div>
				<div className="flex items-center gap-3">
					<Badge className="bg-white text-[#3B82F6] hover:bg-[#F8FAFC]">
						{formDetails.length} Fields
					</Badge>
				</div>
			</button>

			{isExpanded && (
				<div className="border-t border-[#E2E8F0]">
					<div className="p-2 bg-[#f2f6fd] rounded-b-lg">
						<div className="grid divide-y-2 divide-[#F0F1F2] font-[600]">
							{formDetails.map((detail, index) => (
								<div
									key={index}
									className="flex space-x-7 p-3 flex-col md:flex-row md:items-start gap-y-3 md:gap-y-0 justify-start w-full"
								>
									<p className="min-w-[150px] text-[14px] font-weight-[600] text-[#5B5967]">
										{detail.label}
									</p>
									<div className="flex flex-col text-left w-full">
										<div className="text-[14px] font-[600] text-[#2D2C37] break-words">
											{detail.type === "email" ? (
												<a
													href={`mailto:${detail.value}`}
													className="text-[#0076BE] hover:underline font-[600]"
												>
													{detail.value}
												</a>
											) : detail.type === "link" ? (
												<a
													href={String(detail.value)}
													target="_blank"
													rel="noopener noreferrer"
													className="text-[#0076BE] hover:underline font-[600]"
												>
													{detail.value}
												</a>
											) : detail.type === "phone" ? (
												<a
													href={`tel:${detail.value}`}
													className="text-[#0076BE] hover:underline font-[600]"
												>
													{detail.value}
												</a>
											) : detail.type === "file" ? (
												<div className="flex flex-col gap-2">
													{detail.fileData && detail.fileData.length > 0 ? (
														detail.fileData.map(
															(file: any, fileIndex: number) => (
																<div
																	key={fileIndex}
																	className="flex items-center w-fit bg-white rounded-md px-[10px] py-[6px]"
																>
																	<a
																		href={file.file_url}
																		target="_blank"
																		rel="noopener noreferrer"
																		className="text-[#0076BE] hover:underline text-[12px] font-[600]"
																	>
																		{file.file_url?.split("/").pop() ||
																			file.name ||
																			"Download File"}
																	</a>
																</div>
															),
														)
													) : (
														<span className="text-gray-500 text-[12px] font-[600]">
															No files attached
														</span>
													)}
												</div>
											) : detail.type === "check" ? (
												<span
													className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-[600] ${detail.value === "Yes"
														? "bg-green-100 text-green-800"
														: "bg-gray-100 text-gray-800"
													}`}
												>
													{detail.value}
												</span>
											) : detail.type === "select" ? (
												<span className="bg-[#EFF9FF] text-[#304156] w-fit rounded-[16px] py-[2px] px-[6px] font-[600] text-[12px]">
													{detail.value}
												</span>
											) : detail.type === "textarea" ? (
												<div className="bg-[#EFF9FF] rounded-md text-[14px] max-w-md">
													<p className="whitespace-pre-wrap font-[600] text-[#2D2C37]">{detail.value}</p>
												</div>
											) : detail.type === "datetime" ? (
												<span className="text-[#2D2C37] font-[600]">
													{formatValue(detail)}
												</span>
											) : detail.type === "currency" ? (
												<span className="font-[600] text-[#2D2C37]">
													{formatValue(detail)}
												</span>
											) : detail.type === "number" ? (
												<span className="font-[600] text-[#2D2C37]">
													{formatValue(detail)}
												</span>
											) : (
												<span className="text-[#2D2C37] font-[600]">
													{formatValue(detail)}
												</span>
											)}
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default FormDetails;
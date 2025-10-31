import React, { useContext, useEffect, useState } from "react";
import {
	ArrowLeft,
	Check,
	File,
	MessageSquare,
	UserPlus,
	Flag,
	Edit,
	Tag,
	Calendar,
	Upload,
} from "lucide-react";
import { useFrappeGetDocList } from "frappe-react-sdk";
import { UserContext } from "@/utils/auth/UserProvider";
import { format, parse, isValid, parseISO } from "date-fns";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { TaskUpdate } from "../common/CommonTypes";
import DOMPurify from "dompurify";

interface HistoryViewProps {
  task: TaskUpdate;
  setShowHistoryPage: (show: boolean) => void;
}

interface VersionDoc {
  name: string;
  creation: string;
  owner: string;
  data: string;
}

interface CGUser {
  name: string;
  full_name: string;
  email: string;
  user_image?: string;
  first_name?: string;
  last_name?: string;
}

// Status styles for status field
export const StatusStyles: Record<
  "Completed" | "Overdue" | "Due Today" | "Upcoming",
  string
> = {
	Completed: "text-[#0CA866] bg-[#EEFDF1]",
	Overdue: "text-[#A72C2C] bg-[#FFF4F4]",
	"Due Today": "text-[#BC8908] bg-[#FCF8E4]",
	Upcoming: "text-[#494EC8] bg-[#F3F3FE]",
};

// Field label mapping for user-friendly display
const fieldLabelMap: { [key: string]: string } = {
	task_name: "Task Name",
	assigned_to: "Assigned To",
	assignee: "Creator",
	submit_file: "Submitted File",
	is_completed: "Completion Status",
	priority: "Priority",
	description: "Description",
	tag: "Tag",
	due_date: "Due Date",
	upload_required: "File Upload Requirement",
	restrict: "Restriction",
	subtask: "Subtask",
	reopened: "Reopened Status",
	status: "Status",
	creation: "Creation Date",
};

// Field type mapping
const fieldTypeMap: { [key: string]: string } = {
	task_name: "Data",
	assigned_to: "Link",
	assignee: "Link",
	submit_file: "JSON",
	is_completed: "Check",
	priority: "Select",
	description: "Small Text",
	tag: "Link",
	due_date: "Datetime",
	upload_required: "Check",
	restrict: "Check",
	subtask: "Table",
	reopened: "Int",
	status: "Select",
	creation: "Datetime",
};

const HistoryView: React.FC<HistoryViewProps> = ({
	task,
	setShowHistoryPage,
}) => {
	const { currentUser, roleBaseName } = useContext(UserContext);
	const [userMap, setUserMap] = useState<{
    [email: string]: {
      full_name: string;
      user_image?: string;
      first_name?: string;
      last_name?: string;
    };
  }>({});

	// Fetch version documents
	const {
		data: versionDocs,
		isLoading,
		mutate,
	} = useFrappeGetDocList<VersionDoc>("Version", {
		fields: ["name", "creation", "owner", "data"],
		filters: [
			["ref_doctype", "=", "CG Task Instance"],
			["docname", "=", task.name],
		],
		orderBy: { field: "creation", order: "desc" },
	});

	const { data: userDocs } = useFrappeGetDocList<CGUser>("CG User", {
		fields: [
			"name",
			"full_name",
			"email",
			"user_image",
			"first_name",
			"last_name",
		],
		filters: [
			[
				"email",
				"in",
				[
					...(versionDocs ? versionDocs.map((doc) => doc.owner) : []),
					task.assigned_to,
					task.assignee,
				],
			],
		],
	});

	// Build userMap
	useEffect(() => {
		if (userDocs) {
			const map: {
        [email: string]: {
          full_name: string;
          user_image?: string;
          first_name?: string;
          last_name?: string;
        };
      } = {};
			userDocs.forEach((user) => {
				const [first_name, ...last_name_parts] = user.full_name.split(" ");
				map[user.email] = {
					full_name: user.full_name || user.email,
					user_image: user.user_image,
					first_name: user.first_name || first_name || "",
					last_name: user.last_name || last_name_parts.join(" ") || "",
				};
			});
			setUserMap(map);
		}
	}, [userDocs]);

	// Helper to get user display text
	const getUserDisplayText = (user: string) => {
		return user === currentUser ? "You" : userMap[user]?.full_name || user;
	};

	// Helper to get initials from first and last name
	const getInitials = (first_name?: string, last_name?: string) => {
		const firstInitial = first_name ? first_name[0]?.toUpperCase() : "";
		const lastInitial = last_name ? last_name[0]?.toUpperCase() : "";
		return `${firstInitial}${lastInitial}`.slice(0, 2);
	};

	// Helper to validate Frappe datetime string
	const isValidFrappeDate = (value: string) => {
		try {
			const date = parse(value, "dd-MM-yyyy HH:mm:ss", new Date());
			return isValid(date) && !isNaN(date.getTime());
		} catch {
			return false;
		}
	};
	const isValidDate = (value: string) => {
		try {
			const date = parseISO(value);
			return isValid(date) && !isNaN(date.getTime());
		} catch {
			return false;
		}
	};

	// Helper to format field values
	const formatFieldValue = (
		value: string | null,
		fieldType: string,
		fieldName: string,
	): string => {
		if (value === null || value === "") {
			return "None";
		}
		if (fieldType === "Check") {
			return value === "1" ? "Enabled" : "Disabled";
		}
		if (fieldType === "JSON" && fieldName === "submit_file") {
			return "a file";
		}
		if (
			fieldType === "Link" &&
      (fieldName === "assigned_to" || fieldName === "assignee")
		) {
			return userMap[value]?.full_name || value;
		}
		if (fieldType === "Datetime" && fieldName === "creation") {
			return isValidDate(value)
				? format(parseISO(value), "dd MMM yyyy")
				: "Invalid Date";
		}
		if (
			fieldType === "Datetime" &&
      (fieldName === "due_date" || fieldName === "creation")
		) {
			return isValidFrappeDate(value)
				? format(parse(value, "dd-MM-yyyy HH:mm:ss", new Date()), "dd MMM yyyy")
				: "Invalid Date";
		}
		if (fieldType === "Int" && fieldName === "reopened") {
			return value === "1" ? "Reopened" : "Not Reopened";
		}
		if (fieldType === "Table" && fieldName === "subtask") {
			return "subtask(s)";
		}
		if (fieldType === "Select" && fieldName === "status") {
			return value;
		}
		return value;
	};

	// Helper to get action icon
	const getActionIcon = (action: string) => {
		switch (action) {
		case "creation":
			return <UserPlus className="w-4 h-4 text-white" />;
		case "reallocated":
			return <UserPlus className="w-4 h-4 text-white" />;
		case "submitted":
			return <File className="w-4 h-4 text-white" />;
		case "commented":
			return <MessageSquare className="w-4 h-4 text-white" />;
		case "completed":
			return <Flag className="w-4 h-4 text-white" />;
		case "updated":
			return <Edit className="w-4 h-4 text-white" />;
		case "tagged":
			return <Tag className="w-4 h-4 text-white" />;
		case "due_date":
			return <Calendar className="w-4 h-4 text-white" />;
		case "upload_required":
			return <Upload className="w-4 h-4 text-white" />;
		case "restrict":
			return <Edit className="w-4 h-4 text-white" />;
		case "subtask":
			return <Edit className="w-4 h-4 text-white" />;
		case "reopened":
			return <Flag className="w-4 h-4 text-white" />;
		default:
			return <Check className="w-4 h-4 text-white" />;
		}
	};

	// Generate timeline content for version documents
	const getVersionTimelineContent = (versionDoc: VersionDoc) => {
		const out: {
      title: string;
      comment?: string | JSX.Element;
      isComplete: boolean;
      action: string;
      creation: string;
    }[] = [];
		if (!versionDoc.data) return out;

		let data;
		try {
			data = JSON.parse(versionDoc.data);
		} catch {
			return out;
		}

		if (
			data.comment &&
      typeof data.comment === "string" &&
      data.comment.trim() !== ""
		) {
			const sanitizedComment = DOMPurify.sanitize(data.comment);
			out.push({
				title: "Comment Added",
				comment: (
					<div className="text-[#5B5967] text-sm">{sanitizedComment}</div>
				),
				isComplete: false,
				action: "commented",
				creation: versionDoc.creation,
			});
		}

		if (data.changed && data.changed.length) {
			data.changed.forEach(
				([field, oldValue, newValue]: [string, string, string]) => {
					if (
						![
							"assigned_to",
							"submit_file",
							"is_completed",
							"priority",
							"description",
							"tag",
							"due_date",
							"upload_required",
							"restrict",
							"reopened",
							"status",
						].includes(field)
					)
						return;

					const fieldLabel = fieldLabelMap[field] || field;
					const fieldType = fieldTypeMap[field] || "Data";
					const formattedOldValue = formatFieldValue(
						oldValue,
						fieldType,
						field,
					);
					const formattedNewValue = formatFieldValue(
						newValue,
						fieldType,
						field,
					);

					if (
						oldValue === newValue ||
            (fieldType !== "Check" &&
              fieldType !== "Int" &&
              oldValue == null &&
              newValue == null)
					) {
						return;
					}

					if (field === "assigned_to") {
						out.push({
							title: "Task Reallocated",
							comment: `Reallocated from ${formattedOldValue} to ${formattedNewValue}`,
							isComplete: false,
							action: "reallocated",
							creation: versionDoc.creation,
						});
					} else if (field === "submit_file") {
						// Check if newValue is a non-empty JSON array
						let parsedNewValue;
						try {
							parsedNewValue = JSON.parse(newValue);
						} catch {
							parsedNewValue = [];
						}
						if (Array.isArray(parsedNewValue) && parsedNewValue.length > 0) {
							out.push({
								title: "File Submitted",
								comment: `Submitted ${formattedNewValue}`,
								isComplete: false,
								action: "submitted",
								creation: versionDoc.creation,
							});
						}
					} else if (
						field === "status" &&
            newValue === "Completed" &&
            oldValue !== "Completed"
					) {
						out.push({
							title: "Task Completed",
							comment: `Marked as completed`,
							isComplete: true,
							action: "is_completed",
							creation: versionDoc.creation,
						});
					} else if (
						field === "status" &&
            oldValue === "Completed" &&
            newValue !== "Completed"
					) {
						out.push({
							title: "Task Reopened",
							comment: `Reopened from ${formattedOldValue} to ${formattedNewValue}`,
							isComplete: false,
							action: "reopened",
							creation: versionDoc.creation,
						});
					} else if (field === "reopened" && newValue === "1") {
						out.push({
							title: "Task Reopened",
							comment: `Reopened the task`,
							isComplete: false,
							action: "reopened",
							creation: versionDoc.creation,
						});
					} else if (field === "status") {
						out.push({
							title: "Status Updated",
							comment: `Status changed from ${formattedOldValue} to ${formattedNewValue}`,
							isComplete: false,
							action: "status",
							creation: versionDoc.creation,
						});
					} else if (
						[
							"priority",
							"description",
							"due_date",
							"upload_required",
							"restrict",
						].includes(field)
					) {
						out.push({
							title: `${fieldLabel} Updated`,
							comment: `Changed ${fieldLabel.toLowerCase()} from ${formattedOldValue} to ${formattedNewValue}`,
							isComplete: false,
							action: field,
							creation: versionDoc.creation,
						});
					} else if (field === "tag") {
						out.push({
							title: "Tag Updated",
							comment: `Changed tag to ${formattedNewValue}`,
							isComplete: false,
							action: "tagged",
							creation: versionDoc.creation,
						});
					}
				},
			);
		}

		if (
			data.added &&
      data.added.length &&
      data.added.some(([field]: [string]) => field === "subtask")
		) {
			out.push({
				title: "Subtask Added",
				comment: `Added ${formatFieldValue("subtask", "Table", "subtask")}`,
				isComplete: false,
				action: "subtask",
				creation: versionDoc.creation,
			});
		}
		if (
			data.removed &&
      data.removed.length &&
      data.removed.some(([field]: [string]) => field === "subtask")
		) {
			out.push({
				title: "Subtask Removed",
				comment: `Removed ${formatFieldValue("subtask", "Table", "subtask")}`,
				isComplete: false,
				action: "subtask",
				creation: versionDoc.creation,
			});
		}

		return out;
	};

	// Create task creation timeline item
	const taskCreationItem = {
		title: "Task Created",
		comment: `${getUserDisplayText(task.assignee)} created the task`,
		isComplete: false,
		action: "creation",
		creation: task.creation,
	};

	// Combine task creation with version doc timeline items
	const versionTimelineItems = (
		versionDocs?.flatMap((doc, index) => getVersionTimelineContent(doc)) || []
	).sort((a, b) => {
		const dateA = parse(a.creation, "dd-MM-yyyy HH:mm:ss", new Date());
		const dateB = parse(b.creation, "dd-MM-yyyy HH:mm:ss", new Date());
		return dateA.getTime() - dateB.getTime(); // Sort in ascending order
	});

	const timelineItems = [...versionTimelineItems, taskCreationItem];

	return (
		<div className="relative flex flex-col gap-8 overflow-y-auto max-h-[90vh] scroll-hidden">
			<div className="flex flex-col gap-8">
				{isLoading ? (
					<div className="text-center text-[#5B5967] text-sm">
            Loading history...
					</div>
				) : timelineItems.length > 0 ? (
					timelineItems.map((item, idx) => (
						<div key={`${item.creation}-${idx}`} className="flex gap-2">
							<div className="relative">
								{userMap[
									item.action === "creation"
										? task.assignee
										: versionDocs?.find((doc) => doc.creation === item.creation)
											?.owner || task.assignee
								]?.user_image ? (
										<Avatar className="h-8 w-8 rounded-full">
											<AvatarImage
												src={
													userMap[
														item.action === "creation"
															? task.assignee
															: versionDocs?.find(
																(doc) => doc.creation === item.creation,
															)?.owner || task.assignee
													]?.user_image
												}
												className="h-8 w-8 rounded-full object-cover"
											/>
											<AvatarFallback className="h-8 w-8 rounded-full bg-[#FEDBDB] flex items-center justify-center text-xs">
												{getInitials(
													userMap[
														item.action === "creation"
															? task.assignee
															: versionDocs?.find(
																(doc) => doc.creation === item.creation,
															)?.owner || task.assignee
													]?.first_name,
													userMap[
														item.action === "creation"
															? task.assignee
															: versionDocs?.find(
																(doc) => doc.creation === item.creation,
															)?.owner || task.assignee
													]?.last_name,
												)}
											</AvatarFallback>
										</Avatar>
									) : (
										<div className="h-8 w-8 rounded-full bg-[#FEDBDB] flex items-center justify-center">
											{getActionIcon(item.action)}
										</div>
									)}
								{idx !== timelineItems.length - 1 && (
									<div className="absolute left-1/2 top-8 w-0.5 h-[5rem] bg-gray-200 -translate-x-1/2" />
								)}
							</div>
							<div>
								<h1 className="font-semibold text-lg">{item.title}</h1>
								<div className="flex items-center gap-2">
									{item.isComplete && (
										<div className="bg-[#0DA866] rounded-full h-4 w-4 flex items-center justify-center">
											<Check className="text-white w-3 h-3 font-extrabold" />
										</div>
									)}
									<div className="text-[#5B5967] text-sm">
                    By{" "}
										{getUserDisplayText(
											item.action === "creation"
												? task.assignee
												: versionDocs?.find(
													(doc) => doc.creation === item.creation,
												)?.owner || task.assignee,
										)}
                    , on{" "}
										{formatFieldValue(item.creation, "Datetime", "creation")}
									</div>
								</div>
								{item.comment && (
									<div className="text-[#5B5967] text-sm">{item.comment}</div>
								)}
							</div>
						</div>
					))
				) : (
					<div className="text-center text-[#5B5967] text-sm">
            No history available.
					</div>
				)}
			</div>
		</div>
	);
};

export default HistoryView;

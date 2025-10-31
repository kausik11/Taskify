import {
	Sheet,
	SheetTrigger,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription,
	SheetClose,
} from "@/components/ui/sheet";
import { useContext, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
	Accordion,
	AccordionItem,
	AccordionTrigger,
	AccordionContent,
} from "@/components/ui/accordion";
import { ChevronDown, X } from "lucide-react";
import FormDropdown from "./FormDropdown";
import { UserContext } from "@/utils/auth/UserProvider";
import UserAssignees from "../dashboard/UserAssignees";
import { useEffect } from "react";
import {
	useFrappeGetDocList,
	useFrappeGetDoc,
	useFrappeFileUpload,
	useFrappeUpdateDoc,
} from "frappe-react-sdk";
import { json } from "stream/consumers";
import { format, formatDistanceToNow } from "date-fns";
import MultiFileUpload from "./MultiFileUpload";
import { DotStreamLoader } from "@/layouts/Loader";
import { FilePreviewDialog } from "../layout/AlertBanner/CommonDesign";
import { CommentSkeletonLoader, getInitials } from "./CommonFunction";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { CGUser } from "@/types/ClapgrowApp/CGUser";

interface FileProps {
  file_name: string;
  file_url: string;
}

const Workflowcmplt = () => {
	const [isOpen, setIsOpen] = useState(false);
	const { userDetails, roleBaseName } = useContext(UserContext);
	const userEmail = userDetails?.[0]?.email || "";
	const [logIndex, setLogIndex] = useState(0);
	const [matchedLog, setMatchedLog] = useState(null);
	const [stopSearch, setStopSearch] = useState(false);
	const [workflowname, setworkflowname] = useState("");
	const [showUploadError, setShowUploadError] = useState<string>("");
	const [isLoading, setIsLoading] = useState(false);
	const [existingAttachedFiles, setExistingAttachedFiles] = useState<
    FileProps[]
  >([]);
	const [existingSubmitFiles, setExistingSubmitFiles] = useState<FileProps[]>(
		[],
	);
	const [submitFiles, setSubmitFiles] = useState<File[]>([]);
	const { upload } = useFrappeFileUpload();
	const { updateDoc } = useFrappeUpdateDoc();
	const [isFormSheetOpen, setIsFormSheetOpen] = useState(false);
	const [showAllComments, setShowAllComments] = useState(false);
	const [allComments, setAllComments] = useState<any[]>([]);
	const [userDetailsMap, setUserDetailsMap] = useState<{
    [email: string]: CGUser | null;
  }>({});
	const [commentboxreload, setcommentboxreload] = useState<boolean>(false);
	const [taskIds, setTaskIds] = useState<string[]>([]);
	const [searchTerm, setSearchTerm] = useState<string>("");

	// const taskId = "TASK-229";
	const taskId = searchTerm;

	// Step 1: Get all log names
	const {
		data: logs,
		isLoading: isLogsLoading,
		error: logsError,
	} = useFrappeGetDocList("Clapgrow Workflow Execution Log", {
		fields: ["name"],
	});

	// Get the name of the first log
	const logName = logs?.[0]?.name;
	// ;

	const {
		data: logDetails,
		isLoading: isLogLoading,
		error: logError,
	} = useFrappeGetDoc("Clapgrow Workflow Execution Log", logName);

	// ;

	// Function to fetch task details for a given task ID
	// const fetchTaskDetails = (task: string = taskId) => {
	//   ;
	//   const {
	//     data: taskDetails,
	//     isLoading: isTaskLoading,
	//     error: taskError,
	//   } = useFrappeGetDoc("CG Task Instance", task);
	//   return { taskDetails, isTaskLoading, taskError };
	// };

	const alreadySelectedTaskIds = new Set<string>([
		/* populate this with taskIds you want to skip */
		taskId, // example: the currently matched taskId
	]);

	// Extract task IDs from node_logs
	const nodeTasks =
    logDetails?.node_logs?.map((node: Node) => {
    	try {
    		const parsedOutput = JSON.parse(node?.output || "{}");
    		return {
    			node,
    			taskId: parsedOutput?.context?.task,
    		};
    	} catch (err) {
    		console.warn(`Invalid JSON in node ${node.name}`, err);
    		return { node, taskId: null };
    	}
    }) || [];

	// ;

	//filter out the selected tasksIds
	const filteredTasks = nodeTasks.filter((task) => {
		return !alreadySelectedTaskIds.has(task.taskId);
	});

	// ;

	// const taskIdss = filteredTasks.map((nodeTask) => fetchTaskDetails(nodeTask.taskId));
	// ;

	const matchedNode = logDetails?.node_logs?.find((node) => {
		try {
			const parsedOutput = JSON.parse(node.output || "{}");
			return parsedOutput;
		} catch (err) {
			console.warn(`Invalid JSON in node ${node.name}`, err);
			return false;
		}
	});

	// ;

	const doctype = JSON.parse(matchedNode?.output || "{}")?.context?.doctype;
	const docname = JSON.parse(matchedNode?.output || "{}")?.context?.docname;
	// ;
	// ;

	//fetch form details
	const {
		data: formDetails,
		isLoading: isFormLoading,
		error: formError,
	} = useFrappeGetDoc(doctype, docname);
	;

	// );

	const { data: userDetailsArray } = useFrappeGetDocList<CGUser>("CG User", {
		fields: [
			"name",
			"full_name",
			"first_name",
			"last_name",
			"email",
			"user_image",
			"role",
		],
		filters: [
			["email", "in", allComments?.map((comment) => comment.owner) || []],
		],
	});

	useEffect(() => {
		setworkflowname(
			JSON.parse(matchedNode?.output || "{}")?.context?.workflow_name,
		);
	}, [matchedNode, logDetails]);

	useEffect(() => {
		if (userDetailsArray) {
			const userDetailsObject = userDetailsArray.reduce(
				(acc, user) => {
					acc[user.email] = user;
					return acc;
				},
        {} as { [email: string]: CGUser },
			);
			setUserDetailsMap(userDetailsObject);
		}
	}, [userDetailsArray, commentboxreload]);

	//get the task details after getting the task-id
	const {
		data: taskDetails,
		isLoading: isTaskLoading,
		error: taskError,
	} = useFrappeGetDoc("CG Task Instance", taskId);
	// ;

	// Parse the submit_file field to extract file URLs
	const attachments = taskDetails?.attach_file
		? JSON.parse(taskDetails.attach_file)
		: [];

	const uploads = taskDetails?.submit_file
		? JSON.parse(taskDetails.submit_file)
		: [];

	// ;

	// useEffect(() => {
	//   // ;
	//   ;
	//   ;
	// }, [logDetails, workflowname]);

	const {
		data: comments,
		isLoading: isCommentsLoading,
		error,
	} = useFrappeGetDocList("Comment", {
		filters: [["reference_name", "=", taskId]],
		fields: [
			"name",
			"owner",
			"comment_type",
			"comment_email",
			"subject",
			"content",
			"creation",
		],
		orderBy: {
			field: "creation",
			order: "desc",
		},
	});

	// ;
	useEffect(() => {
		if (comments) {
			setAllComments([...(comments || [])].reverse());
			setTimeout(() => {
				setIsLoading(false);
			}, 5000);
		}
	}, [comments]);

	const commentsWithUserDetails = allComments.map((comment) => ({
		...comment,
		userDetails: userDetailsMap[comment.owner] || null,
	}));

	// Extract other node_logs excluding the matchedNode
	const otherNodeLogs =
    logDetails?.node_logs?.filter((node) => node !== matchedNode) || [];

	// ;

	return (
		<div className="max-w-md mx-auto p-6">
			<input
				type="text"
				placeholder="Search comments"
				className="w-full p-2 border border-gray-400 rounded-md"
				value={searchTerm}
				onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
			/>
			{/* Sheet Trigger Button */}
			<Sheet>
				<SheetTrigger asChild>
					<button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
            Task Mark as Complete
						<br />
            *provide a process taskId to get the task details
					</button>
				</SheetTrigger>

				<SheetContent
					side="right"
					className="w-[100vw] md:min-w-[55vw] px-[30px] pt-1 flex flex-col overflow-y-auto
          text-gray-950"
				>
					{/* Fixed Header */}
					<SheetHeader className="m-1">
						<div className="flex items-center justify-left">
							<SheetTitle className="text-lg font-semibold text-gray-800">
								{workflowname}
							</SheetTitle>
							<Badge variant={"outline"} className="text-xs ml-2">
								{logDetails?.node_logs?.length} Steps
							</Badge>
						</div>
						<SheetDescription className="text-sm text-gray-500">
              Task created on{" "}
							{taskDetails?.creation
								? format(new Date(taskDetails.creation), "d MMMM yy, hh:mm a")
								: "No due date available"}
						</SheetDescription>
					</SheetHeader>

					<Accordion
						type="multiple"
						defaultValue={["task"]}
						className="w-full space-y-4 border rounded-md border-gray-300"
					>
						<AccordionItem value="task">
							<AccordionTrigger className="flex flex-row-reverse justify-end px-4 py-2 text-gray-800 gap-2 bg-slate-100">
								<span className="flex items-center gap-2 m-2 text-lg">
									{taskDetails?.task_name}
								</span>
							</AccordionTrigger>
							<AccordionContent className="w-full space-y-4 text-sm text-gray-950 max-h-[350px] overflow-y-auto">
								<div className="relative w-full h-full mt-2">
									<div className="flex items-center justify-between pr-[20px]">
										<div className="grid divide-y-2 divide-[#F0F1F2] pb-[100px] pl-[20px] w-full font-[600] overflow-y-auto scroll-hidden">
											<FormDropdown
												userEmail={userEmail}
												label="Assigned To"
												fieldKey="temporaryReallocation"
												taskupdate={taskDetails}
											>
												<div className="flex items-center space-x-1">
													<UserAssignees users={userDetails || []} />
													<p className="text-[14px]">
														{`${
															userEmail == taskDetails?.assigned_to
																? "Me"
																: userDetails?.[0]?.full_name
														}`}
													</p>
												</div>
											</FormDropdown>
											<FormDropdown userEmail={userEmail} label="Attachments">
												<div className="mt-1 flex flex-wrap flex-row gap-2">
													{attachments.length > 0 ? (
														attachments.map((attachment, index) => (
															<div
																key={index}
																className="flex items-center justify-between bg-[#F1F5FA] p-2 rounded-md"
																style={{ minWidth: "100px", maxWidth: "150px" }}
															>
																{/* <span className="text-sm text-gray-600"> */}
																{/* {attachment.file_url.split("/").pop()} */}
																{/* {attachment.file_url
                                    .split("/")
                                    .pop()
                                    .slice(0, 10) + "..."}
                                </span> */}
																<a
																	href={attachment.file_url}
																	target="_blank"
																	rel="noopener noreferrer"
																	className="text-sm text-blue-600 hover:underline truncate"
																	title={attachment.file_url.split("/").pop()}
																>
																	{attachment.file_url
																		.split("/")
																		.pop()
																		.slice(0, 10) + "..."}
																</a>
															</div>
														))
													) : (
														<span className="text-sm text-gray-600">
                              No attachments
														</span>
													)}
												</div>
											</FormDropdown>

											<FormDropdown
												userEmail={userEmail}
												label="Uploaded Files"
											>
												<div className="mt-1 flex flex-wrap flex-row gap-2">
													{uploads.length > 0 ? (
														uploads.map((attachment, index) => (
															<div
																key={index}
																className="flex items-center justify-between bg-[#F1F5FA] p-2 rounded-md"
																style={{ minWidth: "100px", maxWidth: "150px" }}
															>
																{/* <span className="text-sm text-gray-600"> */}
																{/* {attachment.file_url.split("/").pop()} */}
																{/* {attachment.file_url || "No file uploaded"}
                                </span> */}
																<a
																	href={attachment.file_url}
																	target="_blank"
																	rel="noopener noreferrer"
																	className="text-sm text-blue-600 hover:underline truncate"
																	title={attachment.file_url.split("/").pop()}
																>
																	{attachment.file_url
																		.split("/")
																		.pop()
																		.slice(0, 10) + "..."}
																</a>
															</div>
														))
													) : (
														<span className="text-sm text-gray-600">
                              No attachments
														</span>
													)}
												</div>
											</FormDropdown>
											{/* <div className="py-[16px] px-[12px] mt-4">
                          <h2>Comments</h2>
                          {commentsWithUserDetails.map((comment, index) => (
                            <div
                              key={`comment-${index}`}
                              className="flex gap-3 mt-2 first:mt-0"
                            >
                              <div>
                                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white font-semibold">
                                  {getInitials(
                                    comment?.userDetails?.first_name || "",
                                    comment?.userDetails?.last_name || ""
                                  ) ||
                                    comment.owner
                                      .split("@")[0]
                                      .slice(0, 2)
                                      .toUpperCase()}
                                </div>
                              </div>
                              <div>
                                <p>
                                  {comment?.userDetails?.full_name ||
                                    comment.owner.split("@")[0] ||
                                    "Unknown"}{" "}
                                  <span className="text-gray-600">
                                    {formatDistanceToNow(
                                      new Date(comment.creation),
                                      { addSuffix: true }
                                    )}
                                  </span>
                                </p>
                                <p>{comment.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>  */}
											<div className="py-[16px] px-[12px] mt-4 flex flex-col max-md:gap-y-4 justify-start w-full space-y-3">
												<div className="flex items-center justify-between">
													<p className="min-w-[150px] text-sm text-[#4B4B4F]">
                            Comments
													</p>

													{allComments.length > 5 && (
														<button
															onClick={() =>
																setShowAllComments((prev) => !prev)
															}
															className="text-[#007BFF] text-sm hover:underline"
														>
															{showAllComments ? "View Less" : "View All"}
														</button>
													)}
												</div>

												{isLoading ? (
													<CommentSkeletonLoader />
												) : (
													(showAllComments
														? commentsWithUserDetails
														: commentsWithUserDetails.slice(0, 5)
													)?.map((comment, index: any) => {
														return (
															<div
																className="flex pt-3 items-start space-x-3"
																key={`comment-${index}`}
															>
																<Avatar className="h-6 w-6">
																	<AvatarImage
																		src={comment?.userDetails?.user_image || ""}
																	/>
																	<AvatarFallback>
																		{getInitials(
																			comment?.userDetails?.first_name || "",
																			comment?.userDetails?.last_name || "",
																		)}
																	</AvatarFallback>
																</Avatar>
																<div className="flex-1">
																	<div className="flex gap-x-3 items-center">
																		<h4 className="font-[500] text-[#2D2D2D] text-[14px]">
																			{comment?.userDetails?.full_name ||
                                        "Unknown"}
																		</h4>
																		<p className="text-[#ACABB2]  font-[400] text-[12px]">
																			{formatDistanceToNow(
																				new Date(
																					comment.comment_date ||
                                            comment.creation,
																				),
																				{ addSuffix: true },
																			)}
																		</p>
																	</div>
																	<p className="text-[#2D2D2D] font-[400] text-[14px]">
																		{comment.content}
																	</p>
																</div>
															</div>
														);
													})
												)}
											</div>
										</div>
									</div>
								</div>
							</AccordionContent>
						</AccordionItem>
						{/* Render matchedNode details */}
						{/* {matchedNode && (
              <AccordionItem value="matched-node">
                <AccordionTrigger className="flex flex-row-reverse justify-end px-4 py-2 text-gray-800 gap-2 bg-slate-100">
                  <span className="flex items-center gap-2 m-2 text-lg">
                    Matched Node (Task {taskId})
                  </span>
                </AccordionTrigger>
                <AccordionContent className="w-full space-y-4 text-sm text-gray-950">
                  <div className="p-4 bg-gray-100 rounded-md">
                    <p>
                      <strong>Node Name:</strong> {matchedNode.name}
                    </p>
                    <p>
                      <strong>Task:</strong>{" "}
                      {JSON.parse(matchedNode.output || "{}").context.task}
                    </p>
                    <p>
                      <strong>Workflow:</strong>{" "}
                      {
                        JSON.parse(matchedNode.output || "{}").context
                          .workflow_name
                      }
                    </p>
                    <p>
                      <strong>Status:</strong>{" "}
                      {JSON.parse(matchedNode.output || "{}").pause
                        ? "Paused"
                        : "Active"}
                    </p>
                    <p>
                      <strong>Creation:</strong>{" "}
                      {format(
                        new Date(matchedNode.creation),
                        "d MMMM yy, hh:mm a"
                      )}
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )} */}

						{/* Render other node_logs */}
					</Accordion>
					<Accordion
						type="multiple"
						defaultValue={["task"]}
						className="w-full space-y-4 border rounded-md border-gray-300"
					>
						<AccordionItem value="task">
							<AccordionTrigger className="flex flex-row-reverse justify-end bg-[#EAF4FC] px-4 py-2 rounded-t-md text-left text-base font-medium text-gray-800">
								<span className="w-full text-left">Form Details</span>
							</AccordionTrigger>
							<AccordionContent className="bg-[#EAF4FC] px-4 py-2 rounded-b-md text-sm text-gray-700 divide-y divide-[#DDE7F0]">
								{Object.entries(formDetails || {})
									.filter(
										([key]) =>
											![
												"name",
												"owner",
												"creation",
												"modified",
												"modified_by",
												"docstatus",
												"doctype",
												"idx",
											].includes(key),
									)
									.map(([key, value]) => (
										<div
											key={key}
											className="py-2 flex justify-between items-start gap-4"
										>
											<span className="text-gray-600 capitalize">
												{key.replace(/_/g, " ")}
											</span>
											<span className="font-semibold text-gray-800 text-right break-words max-w-[60%]">
												{typeof value === "string" || typeof value === "number"
													? value
													: JSON.stringify(value)}
											</span>
										</div>
									))}
							</AccordionContent>
						</AccordionItem>
					</Accordion>

					<Accordion
						type="multiple"
						className="w-full space-y-4 border rounded-md border-gray-300"
					>
						{otherNodeLogs.length > 0 && (
							<AccordionItem value="other-nodes-header">
								<AccordionTrigger className="flex flex-row-reverse justify-end px-4 py-2 text-gray-800 gap-2 bg-slate-100">
									<span className="flex items-center gap-2 m-2 text-lg">
                    Other Nodes ({otherNodeLogs.length})
									</span>
								</AccordionTrigger>

								<AccordionContent className="space-y-2">
									{/* Now map each node as its own AccordionItem inside */}
									<Accordion type="multiple" className="space-y-2">
										{otherNodeLogs.map((node, index) => {
											const parsedOutput = JSON.parse(node.output || "{}");
											const taskId = parsedOutput?.context?.task || "N/A";
											const workflow =
                        parsedOutput?.context?.workflow_name || "N/A";
											const status = parsedOutput?.pause ? "Paused" : "Active";
											const creationTime = node.creation
												? format(new Date(node.creation), "d MMMM yy, hh:mm a")
												: "N/A";

											return (
												<AccordionItem key={node.name} value={node.name}>
													<AccordionTrigger className="bg-gray-100 px-4 py-2 rounded-md text-left text-sm text-gray-800 hover:bg-gray-200">
														<span>
															<strong>{taskId}</strong> - {node.name}
														</span>
													</AccordionTrigger>
													<AccordionContent className="bg-[#F7FAFC] px-4 py-2 rounded-md text-sm text-gray-700 space-y-1">
														<p>
															<strong>Task:</strong> {taskId}
														</p>
														<p>
															<strong>Workflow:</strong> {workflow}
														</p>
														<p>
															<strong>Status:</strong> {status}
														</p>
														<p>
															<strong>Creation:</strong> {creationTime}
														</p>
													</AccordionContent>
												</AccordionItem>
											);
										})}
									</Accordion>
								</AccordionContent>
							</AccordionItem>
						)}
					</Accordion>
				</SheetContent>
			</Sheet>
		</div>
	);
};

export default Workflowcmplt;

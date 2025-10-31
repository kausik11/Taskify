import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Calendar } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFrappeGetDoc, useFrappeGetDocList } from "frappe-react-sdk";
import { getInitials } from "../common/CommonFunction";
import ReactQuill from "react-quill";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "../ui/collapsible";
import { FilePreviewDialog } from "../layout/AlertBanner/CommonDesign";
import { FetchedFormRenderer } from "./FetchedFormRenderer";

interface ProcessTaskStepsProps {
  taskName: string;
}

interface CompletedStep {
  node_name: string;
  task_instance_name: string;
  task_name: string;
  assigned_to: string;
  assignee_details: {
    full_name: string;
    user_image?: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  completion_date: string;
  description?: string;
  comments: any[];
  attach_files: any[];
  submit_files: any[];
  node_index: number;
  priority?: string;
  due_date?: string;
  attached_form: string,
attached_docname: string,
}

const ProcessTaskSteps: React.FC<ProcessTaskStepsProps> = ({ taskName }) => {
	const [isExpanded, setIsExpanded] = useState(true);
	const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([]);
	const [expandedSteps, setExpandedSteps] = useState<{
    [key: string]: boolean;
  }>({});

	// Get the task mapping for this task to find workflow and execution log
	const { data: taskMappings,isLoading: taskMappingsLoading } = useFrappeGetDocList(
		"Clapgrow Workflow Task Mapping",
		{
			fields: ["*"],
			filters: [["task_name", "=", taskName]],
			limit: 1,
		}
	);

	// Get workflow details
	const { data: workflow, isLoading: workflowLoading } = useFrappeGetDoc(
		"Clapgrow Workflow",
		taskMappings?.[0]?.workflow,
		taskMappings?.[0]?.workflow ? undefined : null
	);

	// Get all task mappings for this workflow to find completed tasks
	const { data: allWorkflowMappings,isLoading: mappingsLoading } = useFrappeGetDocList(
		"Clapgrow Workflow Task Mapping",
		{
			fields: ["*"],
			filters: [
				["workflow", "=", taskMappings?.[0]?.workflow],
				["execution_log", "=", taskMappings?.[0]?.execution_log],
			],
			limit: 100,
		}
	);

	// Get all completed task instances from the mappings
	const completedTaskNames =
    allWorkflowMappings
    	?.map((mapping) => mapping.task_name)
    	.filter((name) => name !== taskName) || [];

	const { data: completedTaskInstances, isLoading: tasksLoading } = useFrappeGetDocList(
		"CG Task Instance",
		{
			fields: ["*"],
			filters: [
				["name", "in", completedTaskNames],
				["status", "=", "Completed"],
			],
			limit: 100,
		}
	);

	// ;

	// Get comments for all completed tasks
	const { data: allComments,isLoading: commentsLoading } = useFrappeGetDocList("Comment", {
		fields: ["*"],
		filters: [
			["reference_doctype", "=", "CG Task Instance"],
			["reference_name", "in", completedTaskNames],
			["comment_type", "=", "Comment"],
		],
		limit: 1000,
	});

	// Get user details for all assignees
	const assigneeEmails =
    completedTaskInstances?.map((task) => task.assigned_to).filter(Boolean) ||
    [];
	const { data: userDetails,isLoading: usersLoading } = useFrappeGetDocList("CG User", {
		fields: ["email", "full_name", "first_name", "last_name", "user_image"],
		filters: [["email", "in", assigneeEmails]],
		limit: 100,
	});

	useEffect(() => {
		if (
			completedTaskInstances &&
      allWorkflowMappings &&
      workflow &&
      userDetails
		) {
			const steps: CompletedStep[] = [];

			// Process each completed task
			completedTaskInstances.forEach((task) => {
				// Find the corresponding mapping
				const mapping = allWorkflowMappings.find(
					(m) => m.task_name === task.name
				);
				if (!mapping) return;

				// Find the workflow node
				const workflowNode = workflow.nodes?.find(
					(node: any) => node.node === mapping.node
				);
				if (!workflowNode) return;

				// Get user details for this task
				const assigneeDetail = userDetails.find(
					(user) => user.email === task.assigned_to
				);

				// Get comments for this task
				const taskComments =
          allComments?.filter(
          	(comment) => comment.reference_name === task.name
          ) || [];

				// Parse attached files
				let attachFiles = [];
				let submitFiles = [];

				try {
					if (task.attach_file) {
						attachFiles = JSON.parse(task.attach_file);
					}
					if (task.submit_file) {
						submitFiles = JSON.parse(task.submit_file);
					}
				} catch (e) {
					console.error("Error parsing files:", e);
				}

				steps.push({
					node_name: workflowNode.node || `Step ${mapping.node_index || 1}`,
					task_instance_name: task.name,
					task_name: task.task_name,
					assigned_to: task.assigned_to,
					assignee_details: {
						full_name: assigneeDetail?.full_name || task.assigned_to,
						user_image: assigneeDetail?.user_image,
						first_name: assigneeDetail?.first_name || "",
						last_name: assigneeDetail?.last_name || "",
						email: task.assigned_to,
					},
					completion_date: task.modified || task.creation,
					description: task.description,
					comments: taskComments,
					attach_files: attachFiles,
					submit_files: submitFiles,
					node_index: mapping.node_index || 0,
					priority: task.priority,
					due_date: task.due_date,
					attached_form: task.attached_form,
					attached_docname: task.attached_docname,
				});
			});

			// Sort steps by node index
			steps.sort((a, b) => a.node_index - b.node_index);
			setCompletedSteps(steps);
		}
	}, [
		completedTaskInstances,
		allWorkflowMappings,
		workflow,
		userDetails,
		allComments,
	]);

	const toggleStepExpansion = (stepId: string) => {
		setExpandedSteps((prev) => ({
			...prev,
			[stepId]: !prev[stepId],
		}));
	};

	if (completedSteps.length === 0) {
		return null;
	}

	const formatFiles = (files: any[]): any[] => {
		return files.map((file) => ({
			file_name: file.file_url?.split("/").pop() || "",
			file_url: file.file_url,
		}));
	};

	return (
		<div className="mb-6 border border-[#E5E7EB] rounded-lg bg-white shadow-sm">
			{isExpanded && (
				<div className="">
					{/* Workflow Progress Indicator */}
					{completedSteps.map((step, index) => {
						// ;
						const stepId = `step-${step.task_instance_name}`;
						const isStepExpanded = expandedSteps[stepId];

						return (
							<Collapsible
								key={stepId}
								open={isStepExpanded}
								onOpenChange={() => toggleStepExpansion(stepId)}
								className="border border-[#E5E7EB] rounded-lg bg-white shadow-sm"
							>
								<CollapsibleTrigger className="w-full flex items-center justify-between p-4 bg-[#e4e4e6] transition-colors rounded-t-lg">
									<div className="flex items-center gap-3">
										{isStepExpanded ? (
											<ChevronDown className="w-5 h-5 text-[#6B7280]" />
										) : (
											<ChevronRight className="w-5 h-5 text-[#6B7280]" />
										)}
										<div className="flex items-center gap-2">
											<h4 className="font-[600] text-[16px] text-[#1F2937]">
												{step.node_name}
											</h4>
										</div>
									</div>
									<div className="flex items-center gap-2">
										{/* <Badge className='bg-[#DCFCE7] text-[#16A34A] border-[#BBF7D0]'>
                                            Completed
                                        </Badge> */}
									</div>
								</CollapsibleTrigger>

								<CollapsibleContent className="border-t border-[#E5E7EB]">
									<div className="p-4 space-y-4 bg-[#FAFBFC]">
										{/* Step Details - Similar to Current Task Design */}
										<div className="grid divide-y-2 divide-[#F0F1F2] font-[600] bg-white rounded-lg p-4">
											{/* Assigned To */}
											<div className="flex space-x-4 p-3 flex-col md:flex-row md:items-center gap-y-3 md:gap-y-0 justify-start w-full">
												<p className="min-w-[150px] text-sm text-[#5B5967]">
                          Assigned To
												</p>
												<div className="flex items-center space-x-2">
													<Avatar className="h-[18px] w-[18px]">
														<AvatarImage
															src={step.assignee_details.user_image}
														/>
														<AvatarFallback className="text-[10px]">
															{getInitials(
																step.assignee_details.first_name,
																step.assignee_details.last_name
															)}
														</AvatarFallback>
													</Avatar>
													<p className="text-[14px] font-[400]">
														{step.assignee_details.full_name}
													</p>
												</div>
											</div>

											{/* Completion Date */}
											<div className="flex space-x-4 p-3 flex-col md:flex-row md:items-center gap-y-3 md:gap-y-0 justify-start w-full">
												<p className="min-w-[150px] text-sm text-[#5B5967]">
                          Completed On
												</p>
												<div className="flex items-center space-x-2">
													<Calendar className="w-4 h-4 text-[#6B7280]" />
													<p className="text-[14px] font-[400]">
														{format(
															new Date(step.completion_date),
															"dd MMM yyyy, hh:mm a"
														)}
													</p>
												</div>
											</div>

											{/* Due Date */}
											{step.due_date && (
												<div className="flex space-x-4 p-3 flex-col md:flex-row md:items-center gap-y-3 md:gap-y-0 justify-start w-full">
													<p className="min-w-[150px] text-sm text-[#5B5967]">
                            Due Date
													</p>
													<p className="text-[14px] font-[400]">
														{format(
															new Date(step.due_date),
															"dd MMM yyyy, hh:mm a"
														)}
													</p>
												</div>
											)}

											{/* Priority */}
											{step.priority && (
												<div className="flex space-x-4 p-3 flex-col md:flex-row md:items-center gap-y-3 md:gap-y-0 justify-start w-full">
													<p className="min-w-[150px] text-sm text-[#5B5967]">
                            Priority
													</p>
													<span
														className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
															step.priority === "High"
																? "bg-red-100 text-red-800"
																: step.priority === "Medium"
																	? "bg-yellow-100 text-yellow-800"
																	: "bg-green-100 text-green-800"
														}`}
													>
														{step.priority}
													</span>
												</div>
											)}

											{/* Description */}
											{step.description &&
                        step.description !== "<p><br></p>" && (
												<div className="flex space-x-4 p-3 flex-col md:flex-row md:items-start gap-y-3 md:gap-y-0 justify-start w-full">
													<p className="min-w-[150px] text-sm text-[#5B5967]">
                              Description
													</p>
													<div className="w-full max-w-[28rem] md:max-w-[500px] font-[400] text-[14px] text-black bg-[#F9FAFB] rounded-lg p-3">
														<ReactQuill
															value={step.description}
															readOnly={true}
															theme="snow"
															modules={{ toolbar: false }}
															className="[&_.ql-container]:border-0 [&_.ql-editor]:p-0 [&_.ql-editor]:text-[12px] [&_.ql-editor]:bg-transparent"
														/>
													</div>
												</div>
											)}

											<div
												style={{
													display: "flex",
													flexDirection: "column",
													height: "100%",
												}}
											>
												{/* {completedTaskInstances?.map((taskName) => {
													;
													if (taskName.attached_form!==null) {
														// ;
														return (
															<FetchedFormRenderer
																key={taskName}
																doctype={taskName.attached_form}
																docname={taskName.attached_docname}
															/>
														);
													}
												})} */}
												{step.attached_form && step.attached_docname && (
													<FetchedFormRenderer
													     key={step.node_name}
														doctype={step.attached_form}
														docname={step.attached_docname}
													/>
												)}
											</div>

											{/* Attached Files */}
											{/* {step.attach_files.length > 0 && (
                                                <div className="flex space-x-4 p-3 flex-col md:flex-row md:items-start gap-y-3 md:gap-y-0 justify-start w-full">
                                                    <p className="min-w-[150px] text-sm text-[#5B5967]">Attached Files</p>
                                                    <div className="flex flex-col w-fit gap-2">
                                                        {formatFiles(step.attach_files).map((file, index) => (
                                                            <div
                                                                key={index}
                                                                className="flex items-center w-fit bg-white rounded-md px-[10px] py-[8px] mr-2 mb-1"
                                                            >
                                                                <FilePreviewDialog file={file} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )} */}

											{/* Submit Files */}
											{step.submit_files.length > 0 && (
												<div className="flex space-x-4 p-3 flex-col md:flex-row md:items-start gap-y-3 md:gap-y-0 justify-start w-full">
													<p className="min-w-[150px] text-sm text-[#5B5967]">
                            Submit Files
													</p>
													<div className="flex flex-col w-fit gap-2">
														{formatFiles(step.submit_files).map(
															(file, index) => (
																<div
																	key={index}
																	className="flex items-center w-fit bg-white rounded-md px-[10px] py-[8px] mr-2 mb-1"
																>
																	<FilePreviewDialog file={file} />
																</div>
															)
														)}
													</div>
												</div>
											)}
										</div>

										{/* Comments Section - Similar to Current Task */}
										{step.comments.length > 0 && (
											<div className="py-[16px] px-[12px] mt-4 flex flex-col justify-start w-full space-y-3 bg-white rounded-lg">
												<p className="min-w-[150px] text-sm text-[#4B4B4F] font-[600]">
                          Comments ({step.comments.length})
												</p>

												{step.comments.map(
													(comment: any, commentIndex: number) => (
														<div
															className="flex pt-3 items-start space-x-3"
															key={`comment-${commentIndex}`}
														>
															<Avatar className="h-6 w-6">
																<AvatarFallback className="text-[10px]">
																	{comment.owner?.slice(0, 2).toUpperCase()}
																</AvatarFallback>
															</Avatar>
															<div className="flex-1">
																<div className="flex gap-x-3 items-center">
																	<h4 className="font-[500] text-[#2D2D2D] text-[14px]">
																		{comment.owner}
																	</h4>
																	<p className="text-[#ACABB2] font-[400] text-[12px]">
																		{formatDistanceToNow(
																			new Date(comment.creation),
																			{ addSuffix: true }
																		)}
																	</p>
																</div>
																<p className="text-[#2D2D2D] font-[400] text-[14px]">
																	{comment.content}
																</p>
															</div>
														</div>
													)
												)}
											</div>
										)}
									</div>
								</CollapsibleContent>
							</Collapsible>
						);
					})}
				</div>
			)}
		</div>
	);
};

export default ProcessTaskSteps;

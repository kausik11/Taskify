import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Ban,
  CircleCheck,
  User,
  Calendar,
  Flag,
  Tag,
  MessageSquare,
  X,
} from "lucide-react";
import React, { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CommentSkeletonLoader,
  getInitials,
  useUserDetailsByEmails,
} from "../common/CommonFunction";
import { Input } from "../ui/input";
import { UserContext } from "@/utils/auth/UserProvider";
import HistoryView from "../dashboard/HistoryView";
import ProcessTaskSteps from "../dashboard/ProcessTaskSteps";
import FormDetails from "../dashboard/FormDetails";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { PriorityDisplay } from "../common/PriorityDisplay";
import UserAssignees from "../dashboard/UserAssignees";
import {
  useFrappeAuth,
  useFrappeCreateDoc,
  useFrappeGetDoc,
  useFrappeGetDocList,
  useFrappeUpdateDoc,
  useFrappeFileUpload,
} from "frappe-react-sdk";
import { CGUser } from "@/types/ClapgrowApp/CGUser";
import { CGTaskInstance } from "@/types/ClapgrowApp/CGTaskInstance";
import { toast } from "sonner";
import { Loader, DotStreamLoader } from "@/layouts/Loader";
import { Badge } from "../ui/badge";
import { FilePreviewDialog } from "../layout/AlertBanner/CommonDesign";
import PageNotFound from "../common/PageNotFound/PageNotFound";
import { BsInfoCircle } from "react-icons/bs";
import MultiFileUpload from "../common/MultiFileUpload";

interface FileProps {
  file_name: string;
  file_url: string;
}

const TaskDetailsPage: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { createDoc } = useFrappeCreateDoc();
  const { updateDoc: updateTaskDoc } = useFrappeUpdateDoc();
  const { upload } = useFrappeFileUpload();
  const { userDetails, roleBaseName } = useContext(UserContext);
  const { currentUser } = useFrappeAuth();
  const userEmail = userDetails?.[0]?.email || "";

  // Query task data using the task ID from URL
  const {
    data: taskData,
    mutate: mutateTask,
    isLoading: isTaskLoading,
  } = useFrappeGetDoc<CGTaskInstance>(
    "CG Task Instance",
    taskId,
    taskId ? undefined : null,
  );

  // Get the task mapping for Process tasks to find workflow info
  const { data: taskMappings } = useFrappeGetDocList(
    "Clapgrow Workflow Task Mapping",
    {
      fields: ["*"],
      filters: [["task_name", "=", taskId]],
      limit: 1,
    },
  );

  // Get workflow details for step count (for Process tasks)
  const { data: workflow } = useFrappeGetDoc(
    "Clapgrow Workflow",
    taskMappings?.[0]?.workflow,
    taskMappings?.[0]?.workflow ? undefined : null,
  );

  const [isLoading, setIsLoading] = useState(false);
  const [showHistoryPage, setShowHistoryPage] = useState<boolean>(false);
  const [totalWorkflowSteps, setTotalWorkflowSteps] = useState<number>(0);
  const [existingAttachedFiles, setExistingAttachedFiles] = useState<
    FileProps[]
  >([]);
  const [existingSubmitFiles, setExistingSubmitFiles] = useState<FileProps[]>(
    [],
  );
  const [newSubmitFiles, setNewSubmitFiles] = useState<File[]>([]);
  const [showAllComments, setShowAllComments] = useState(false);
  const [commentboxreload, setcommentboxreload] = useState<boolean>(false);
  const [allComments, setAllComments] = useState<any[]>([]);
  const [userDetailsMap, setUserDetailsMap] = useState<{
    [email: string]: CGUser | null;
  }>({});
  const [pendingComment, setPendingComment] = useState<string>("");

  // Calculate total workflow steps
  useEffect(() => {
    if (workflow?.nodes) {
      setTotalWorkflowSteps(workflow.nodes.length);
    }
  }, [workflow]);

  const { data: usersData } = useUserDetailsByEmails(
    taskData?.assigned_to || "",
  );
  const { data: usersDetails } = useUserDetailsByEmails(userEmail || "");

  // Process files
  useEffect(() => {
    const processFiles = (
      fileData: string | undefined,
      setter: (files: FileProps[]) => void,
    ) => {
      if (fileData) {
        try {
          const parsedFiles = JSON.parse(fileData);
          const updatedFiles: FileProps[] = parsedFiles.map(
            (file: { file_url: string }) => ({
              ...file,
              file_name: file.file_url?.split("/").pop() || "",
            }),
          );
          setter(updatedFiles);
        } catch (err) {
          console.error("Failed to parse file data:", fileData, err);
          setter([]);
        }
      } else {
        setter([]);
      }
    };
    processFiles(taskData?.attach_file, setExistingAttachedFiles);
    processFiles(taskData?.submit_file, setExistingSubmitFiles);
  }, [taskData?.attach_file, taskData?.submit_file]);

  // Helper functions for edit permissions
  const isTaskEditable = () => {
    const isRejected = taskData?.status === "Rejected";
    const isCompleted = taskData?.is_completed === 1;
    return !isRejected && !isCompleted;
  };

  const canEditTask = () => {
    const hasEditPermission =
      roleBaseName === "ROLE-Admin" ||
      userEmail === taskData?.assignee ||
      userEmail === taskData?.assigned_to;
    return hasEditPermission && isTaskEditable();
  };

  // Handle file upload for submit files
  const handleSubmitFileSelected = async (files: File[]) => {
    setIsLoading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const response = await upload(file, {
          isPrivate: false,
          doctype: "CG Task Instance",
          fieldname: "submit_file",
        });
        return { file_url: response.file_url, name: response.name };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      const updatedFiles: FileProps[] = uploadedFiles.map((file) => ({
        ...file,
        file_name: file.file_url?.split("/").pop() || "",
      }));

      // Update the file metadata
      for (const file of uploadedFiles) {
        await updateTaskDoc("File", file.name, {
          attached_to_name: taskData?.name,
          attached_to_doctype: "CG Task Instance",
        });
      }

      // Update local state
      setExistingSubmitFiles((prevFiles) => [...prevFiles, ...updatedFiles]);

      // Update the task with new files
      const allSubmitFiles = [...existingSubmitFiles, ...updatedFiles];
      const formattedSubmitFiles = JSON.stringify(
        allSubmitFiles.map((file: { file_url: string }) => ({
          file_url: file.file_url,
        })),
      );

      await updateTaskDoc("CG Task Instance", taskData?.name, {
        submit_file: formattedSubmitFiles,
      });

      mutateTask();
      toast.success("Files uploaded successfully!");
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload files. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file removal
  const handleFileRemove = async (indexToRemove: number) => {
    try {
      const updatedFiles = existingSubmitFiles.filter(
        (_, index) => index !== indexToRemove,
      );
      setExistingSubmitFiles(updatedFiles);

      const formattedSubmitFiles = JSON.stringify(
        updatedFiles.map((file: { file_url: string }) => ({
          file_url: file.file_url,
        })),
      );

      await updateTaskDoc("CG Task Instance", taskData?.name, {
        submit_file: formattedSubmitFiles,
      });

      mutateTask();
      toast.success("File removed successfully!");
    } catch (error) {
      console.error("Error removing file:", error);
      toast.error("Failed to remove file. Please try again.");
    }
  };

  // *******************COMMENT SECTION HERE ****************//
  const { data: Commentlists, mutate } = useFrappeGetDocList("Comment", {
    fields: ["*"],
    filters: [
      ["comment_type", "=", "Comment"],
      ["reference_doctype", "=", "CG Task Instance"],
      ["reference_name", "=", taskData?.name],
    ],
  });

  useEffect(() => {
    if (taskData?.name || commentboxreload) {
      mutate();
    }
  }, [taskData?.name, commentboxreload]);

  useEffect(() => {
    if (Commentlists) {
      setAllComments([...(Commentlists || [])].reverse());
    }
  }, [Commentlists]);

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

  const commentsWithUserDetails = allComments.map((comment) => ({
    ...comment,
    userDetails: userDetailsMap[comment.owner] || null,
  }));

  // Check permissions for task completion
  const canCompleteTask = () => {
    const isRejected = taskData?.status === "Rejected";
    const isCompleted = taskData?.is_completed === 1;
    const hasPermission =
      roleBaseName === "ROLE-Admin" || userEmail === taskData?.assigned_to;
    return !isRejected && !isCompleted && hasPermission;
  };

  // Handle task completion
  const handleTaskCompletion = async () => {
    if (!taskData) return;

    setIsLoading(true);
    try {
      // Check if file upload is required but not provided
      const isUploadRequired =
        taskData?.upload_required === 1 && existingSubmitFiles.length === 0;
      if (isUploadRequired) {
        toast.error("File upload is required to mark this task as complete.");
        setIsLoading(false);
        return;
      }

      // Submit pending comment if it exists
      if (pendingComment.trim()) {
        await createDoc("Comment", {
          comment_type: "Comment",
          reference_doctype: "CG Task Instance",
          reference_name: taskData.name,
          reference_owner: taskData.assignee,
          comment_email: userEmail || "",
          company_id: userDetails?.[0]?.company_id || "",
          content: pendingComment,
        });
        setPendingComment("");
      }

      // Mark task as complete
      await updateTaskDoc("CG Task Instance", taskData.name, {
        is_completed: 1,
        status: "Completed",
        completion_platform: "Web", // Explicitly set to Web for web interface
      });

      mutateTask();
      toast.success("Task marked as completed successfully!");
    } catch (error: any) {
      console.error("Error completing task:", error);
      const serverMessages = error._server_messages
        ? JSON.parse(error._server_messages)
        : null;
      const msgObj = serverMessages ? JSON.parse(serverMessages[0]) : null;
      const errorMessage = msgObj?.message
        ? msgObj.message.replace(/<[^>]*>/g, "")
        : "Failed to complete task. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle comment submission
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingComment.trim() || !taskData) return;

    setIsLoading(true);
    try {
      await createDoc("Comment", {
        comment_type: "Comment",
        reference_doctype: "CG Task Instance",
        reference_name: taskData.name,
        reference_owner: taskData.assignee,
        comment_email: userEmail || "",
        company_id: userDetails?.[0]?.company_id || "",
        content: pendingComment,
      });
      setcommentboxreload(true);
      setPendingComment("");
      toast.success("Comment added successfully!");
    } catch (error) {
      console.error("Error submitting comment:", error);
      toast.error("Failed to add comment. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if no task ID provided
  if (!taskId) {
    return (
      <div className="flex items-center justify-center h-screen px-4">
        <div className="text-center max-w-md mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">
            Task Not Found
          </h2>
          <p className="text-gray-600 mb-6 text-sm sm:text-base">
            The requested task could not be found.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-[#0385FF] text-white px-4 sm:px-6 py-2 rounded-md font-medium hover:bg-[#0370e0] text-sm sm:text-base"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Show loading state while fetching task data
  if (isTaskLoading) {
    return (
      <div className="flex items-center justify-center h-screen px-4">
        <Loader size={45} speed={1.75} color="blue" />
      </div>
    );
  }

  // Show error state if task not found after loading is complete
  if (!isTaskLoading && !taskData) {
    return <PageNotFound />;
  }

  // Check if this is a Process task type
  const isProcessTask = taskData?.task_type === "Process";

  return (
    <div className="min-h-screen bg-gray-50">
      {isLoading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Loader size={45} speed={1.75} color="blue" />
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-40">
        <div className="max-w-4xl xl:max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Left Section */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="min-w-0 flex-1 flex flex-col">
                {/* Task Name */}
                <h1 className="text-lg font-bold text-gray-800 max-w-[800px] break-words">
                  {isProcessTask
                    ? taskMappings?.[0]?.workflow || taskData?.task_name
                    : taskData?.task_name}
                </h1>

                {/* Creation Date */}
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Created{" "}
                  {taskData?.creation
                    ? format(new Date(taskData.creation), "d MMM yy, hh:mm a")
                    : "No creation date"}
                </p>
              </div>

              {/* Workflow Badge */}
              {isProcessTask && totalWorkflowSteps > 0 && (
                <Badge className="bg-[#f8f9fa] text-gray-700 border-[#6f6f70] hover:text-white hover:bg-gray-500 py-1 shrink-0 text-xs">
                  {totalWorkflowSteps} steps
                </Badge>
              )}
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2 sm:gap-3 justify-end sm:justify-start">
              <button
                onClick={() => setShowHistoryPage(true)}
                className="sm:border border-[#0076BE] text-[#0076BE] px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium hover:bg-[#0076BE] hover:text-white transition-colors"
              >
                <div>
                  <span className="hidden sm:inline">Show History</span>
                </div>
                <span className="sm:hidden">
                  <BsInfoCircle size={18} />
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl xl:max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
        {showHistoryPage ? (
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <button
              onClick={() => setShowHistoryPage(false)}
              className="flex items-center gap-2 mb-4 sm:mb-6 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm sm:hidden">Back</span>
            </button>
            <HistoryView
              task={taskData}
              setShowHistoryPage={setShowHistoryPage}
            />
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {/* Task Information Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {/* Assigned To */}
                  <div className="space-y-2 gap-y-2">
                    <label className="text-xs sm:text-sm font-medium text-gray-500 flex items-center gap-2">
                      <User className="w-3 h-3 sm:w-4 sm:h-4" />
                      Assigned To
                    </label>
                    <div className="flex items-center gap-2">
                      <UserAssignees users={usersData || []} />
                      <span className="text-xs sm:text-sm text-gray-900 truncate">
                        {userEmail === taskData?.assigned_to
                          ? "Me"
                          : usersData?.[0]?.full_name || "Unknown User"}
                      </span>
                    </div>
                  </div>

                  {/* Due Date */}
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-medium text-gray-500 flex items-center gap-2">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                      Due Date
                    </label>
                    <p className="text-xs sm:text-sm text-gray-900">
                      {taskData?.due_date
                        ? format(
                            new Date(taskData.due_date),
                            "dd MMM yyyy, hh:mm a",
                          )
                        : "No due date available"}
                    </p>
                  </div>

                  {/* Priority */}
                  {!taskData?.is_help_ticket && (
                    <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-medium text-gray-500 flex items-center gap-2">
                        <Flag className="w-3 h-3 sm:w-4 sm:h-4" />
                        Priority
                      </label>
                      <PriorityDisplay priority={taskData?.priority} />
                    </div>
                  )}

                  {/* Task Type */}
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-medium text-gray-500 flex items-center gap-2">
                      <Tag className="w-3 h-3 sm:w-4 sm:h-4" />
                      Task Type
                    </label>
                    <Badge variant="secondary" className="w-fit text-xs">
                      {taskData?.task_type}
                    </Badge>
                  </div>
                </div>

                {/* Tags */}
                {taskData?.tag && (
                  <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-100">
                    <label className="text-xs sm:text-sm font-medium text-gray-500 mb-2 block">
                      Tags
                    </label>
                    <span className="inline-block bg-gray-100 text-gray-700 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm">
                      {taskData.tag}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {taskData?.description &&
              taskData.description !== "<p><br></p>" && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-4 sm:p-6">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                      Description
                    </h3>
                    <div className="prose prose-sm sm:prose max-w-none">
                      <ReactQuill
                        value={taskData.description || ""}
                        readOnly={true}
                        theme="snow"
                        modules={{ toolbar: false }}
                        className="[&_.ql-container]:border-0 [&_.ql-editor]:border-0 [&_.ql-editor]:p-0 [&_.ql-editor]:text-sm [&_.ql-editor]:sm:text-base"
                      />
                    </div>
                  </div>
                </div>
              )}

            {/* Process Task Details */}
            {isProcessTask && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                    Process Details
                  </h3>
                  <FormDetails taskName={taskId} />
                  <div className="mt-4 sm:mt-6">
                    <ProcessTaskSteps taskName={taskId} />
                  </div>
                </div>
              </div>
            )}

            {/* Attached Files */}
            {existingAttachedFiles.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                    Attached Files
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {existingAttachedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                      >
                        <FilePreviewDialog file={file} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Submit Files */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                    Attached Files
                    {taskData?.upload_required == 1 && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </h3>
                </div>

                {/* File Upload Section */}
                {!taskData?.is_completed &&
                  isTaskEditable() &&
                  canEditTask() && (
                    <div className="mb-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <span className="text-sm font-medium text-gray-700">
                          Upload Files:
                        </span>
                        <MultiFileUpload
                          onFilesSelected={handleSubmitFileSelected}
                          selectedFiles={newSubmitFiles}
                        />
                      </div>
                    </div>
                  )}

                {/* Existing Submit Files */}
                {isLoading ? (
                  <div className="flex justify-center py-4">
                    <DotStreamLoader />
                  </div>
                ) : existingSubmitFiles.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {existingSubmitFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                      >
                        <FilePreviewDialog file={file} />
                        {!taskData?.is_completed &&
                          isTaskEditable() &&
                          canEditTask() && (
                            <button
                              onClick={() => handleFileRemove(index)}
                              className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50 transition-colors"
                              title="Remove file"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center sm:py-8 text-gray-500">
                    {!taskData?.is_completed &&
                      isTaskEditable() &&
                      canEditTask() &&
                      taskData?.upload_required == 1 && (
                        <p className="text-xs sm:text-sm">
                          Upload files to get started!
                        </p>
                      )}
                  </div>
                )}
              </div>
            </div>

            {/* Comments Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                    Comments ({allComments.length})
                  </h3>
                  {allComments.length > 5 && (
                    <button
                      onClick={() => setShowAllComments((prev) => !prev)}
                      className="text-[#0385FF] text-xs sm:text-sm hover:underline font-medium self-start sm:self-auto"
                    >
                      {showAllComments ? "Show Less" : "Show All"}
                    </button>
                  )}
                </div>

                {/* Add Comment Form */}
                {!taskData?.is_completed && (
                  <form onSubmit={handleCommentSubmit} className="mb-4 sm:mb-6">
                    <div className="flex flex-col sm:flex-row items-start space-y-3 sm:space-y-0 sm:space-x-4">
                      <div className="shrink-0 md:mt-2 lg:mt-2">
                        <UserAssignees users={usersDetails || []} />
                      </div>
                      <div className="flex-1 w-full sm:w-auto">
                        <Input
                          type="text"
                          placeholder="Add a comment..."
                          className="w-full text-sm sm:text-base"
                          value={pendingComment}
                          onChange={(e) => setPendingComment(e.target.value)}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={!pendingComment.trim() || isLoading}
                        className="bg-[#0385FF] text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium hover:bg-[#0370e0] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
                      >
                        {isLoading ? "Posting..." : "Post"}
                      </button>
                    </div>
                  </form>
                )}

                {/* Comments List */}
                <div className="space-y-3 sm:space-y-4">
                  {isLoading && allComments.length === 0 ? (
                    <CommentSkeletonLoader />
                  ) : (
                    (showAllComments
                      ? commentsWithUserDetails
                      : commentsWithUserDetails.slice(0, 5)
                    )?.map((comment, index) => (
                      <div
                        className="flex items-start space-x-3 p-3 sm:p-4 bg-gray-50 rounded-lg"
                        key={`comment-${index}`}
                      >
                        <Avatar className="h-6 w-6 sm:h-8 sm:w-8 shrink-0">
                          <AvatarImage
                            src={comment?.userDetails?.user_image || ""}
                          />
                          <AvatarFallback className="text-xs">
                            {getInitials(
                              comment?.userDetails?.first_name || "",
                              comment?.userDetails?.last_name || "",
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-1">
                            <h4 className="font-medium text-gray-900 text-xs sm:text-sm truncate">
                              {comment?.userDetails?.full_name || "Unknown"}
                            </h4>
                            <p className="text-gray-500 text-xs">
                              {formatDistanceToNow(
                                new Date(
                                  comment.comment_date || comment.creation,
                                ),
                                { addSuffix: true },
                              )}
                            </p>
                          </div>
                          <p className="text-gray-700 text-xs sm:text-sm break-words">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  {allComments.length === 0 && !isLoading && (
                    <div className="text-center py-6 sm:py-8 text-gray-500">
                      <MessageSquare className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 opacity-50" />
                      <p className="text-sm sm:text-base">No comments yet</p>
                      <p className="text-xs sm:text-sm">
                        Be the first to add a comment!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {!taskData?.is_completed && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="text-xs sm:text-sm text-gray-600"></div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className={`flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 rounded-md font-medium transition-colors text-sm sm:text-base w-full sm:w-auto ${
                              canCompleteTask()
                                ? "bg-[#0385FF] text-white hover:bg-[#0370e0]"
                                : "bg-gray-200 text-gray-500 cursor-not-allowed"
                            }`}
                            onClick={handleTaskCompletion}
                            disabled={!canCompleteTask() || isLoading}
                          >
                            {canCompleteTask() ? (
                              <CircleCheck className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                            ) : (
                              <Ban className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                            )}
                            {isLoading ? "Completing..." : "Mark as Complete"}
                          </button>
                        </TooltipTrigger>
                        {!canCompleteTask() && (
                          <TooltipContent>
                            <p className="text-xs sm:text-sm">
                              {taskData?.status === "Rejected"
                                ? "Rejected tasks cannot be completed"
                                : taskData?.is_completed
                                  ? "Task is already completed"
                                  : "You don't have permission to complete this task"}
                            </p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom spacing for mobile */}
            <div className="h-4 sm:h-0" />
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskDetailsPage;

import React, { useContext, useState, useRef } from "react";
import { ArrowLeft } from "lucide-react";

// UI Components
import { SheetContent } from "@/components/ui/sheet";
import { Loader } from "@/layouts/Loader";

// Custom Components
import TaskHeader from "./TaskHeader";
import TaskStatusIndicator from "./TaskStatusIndicator";
import TaskDetailsForm from "./TaskDetailsForm";
import SubtasksSection from "./SubtasksSection";
import CommentsSection from "./CommentsSection";
import TaskActions from "./TaskActions";
import HistoryView from "../HistoryView";
import ProcessTaskSteps from "../ProcessTaskSteps";
import ProcessTaskSection from "./ProcessTaskSection";
import ChecklistSection from "./ChecklistSection";
import { useTaskData } from "@/hooks/useTaskData";
import { useFileManagement } from "@/hooks/useFileManagement";
import { useCommentsManagement } from "@/hooks/useCommentsManagement";
import { useTaskForm } from "@/hooks/useTaskForm";
import { useSubtaskNavigation } from "@/hooks/useSubtaskNavigation";
import { useTaskOperations } from "@/hooks/useTaskOperation";
import {
  useUserDetailsByEmails,
  getReminderSentence,
} from "@/components/common/CommonFunction";

// Context and Auth
import { UserContext } from "@/utils/auth/UserProvider";
import { useFrappeAuth } from "frappe-react-sdk";
import { ChecklistItem } from "@/components/common/CommonTypes";

interface TaskSheetContentProps {
  taskName: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onTaskNameChange?: (newTaskName: string) => void;
}

const TaskSheetContent: React.FC<TaskSheetContentProps> = ({
  taskName,
  isOpen,
  setIsOpen,
  onTaskNameChange,
}) => {
  // Context and Auth
  const { currentUser } = useFrappeAuth();
  const { userDetails, roleBaseName, rolePermissions } =
    useContext(UserContext);
  const userEmail = userDetails?.[0]?.email || "";

  // Local state
  const [showHistoryPage, setShowHistoryPage] = useState<boolean>(false);
  const [isCurrentTaskExpanded, setIsCurrentTaskExpanded] = useState(true);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState([
    {
      reason: "",
      by: { first_name: "", last_name: "", user_image: "", full_name: "" },
    },
  ]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const reopenButtonRef = useRef<HTMLButtonElement>(null);
  // const formMetaRef = useRef<any>(null);
  // console.log("formmetaref", formMetaRef);

  const [formMetaState, setFormMetaState] = useState<{
    isValid: boolean;
    submitForm: (() => Promise<any>) | null;
  }>({
    isValid: false,
    submitForm: null,
  });

  const [triggerFormSubmit, setTriggerFormSubmit] = useState(false);
  const [formSubmissionResult, setFormSubmissionResult] = useState<{
    success: boolean;
    data?: any;
    error?: any;
  } | null>(null);

  // Handle form state changes from FormMeta
  const handleFormStateChange = (
    isValid: boolean,
    submitForm: () => Promise<any>,
  ) => {
    setFormMetaState({ isValid, submitForm });
  };

  // Handle form submission results
  const handleFormSubmissionResult = (result: {
    success: boolean;
    data?: any;
    error?: any;
  }) => {
    setFormSubmissionResult(result);
    setTriggerFormSubmit(false); // Reset trigger
  };

  // Custom Hooks
  const {
    selectedTaskName,
    parentTaskName,
    sheetRef,
    handleSubtaskClick,
    handleBackToParent,
  } = useSubtaskNavigation({
    initialTaskName: taskName,
    isOpen,
    onTaskNameChange,
  });

  const {
    taskData,
    taskMappings,
    workflow,
    isLoading: taskDataLoading,
    mutateTask,
    totalWorkflowSteps,
  } = useTaskData({ taskName: selectedTaskName });

  React.useEffect(() => {
    if (taskData?.checklist) {
      setChecklist(taskData.checklist);
    } else {
      setChecklist([]);
    }
  }, [taskData]);

  const updateTaskWithChecklist = (newChecklist: ChecklistItem[]) => {
    setChecklist(newChecklist);
    setTaskUpdate((prev) => ({ ...prev, checklist: newChecklist }));
  };

  const {
    taskUpdate,
    setTaskUpdate,
    editMode,
    setEditMode,
    resetEditModes,
    selectedDueDate,
    setSelectedDueDate,
    frequency,
    setFrequency,
    weekDays,
    setWeekDays,
    custom,
    setCustom,
    monthDay,
    setMonthDay,
    intervalWeek,
    setIntervalWeek,
    nthValue,
    setNthValue,
    dueWorkingDay,
    setDueWorkingDay,
    reminderSentence,
    setReminderSentence,
    newAssignedTo,
    setNewAssignedTo,
    selectedStartDate,
    setSelectedStartDate,
    selectedEndDate,
    setSelectedEndDate,
    handleSelect,
    isTaskEditable,
    canEditTask,
  } = useTaskForm({ initialTaskData: taskData });

  const {
    existingAttachedFiles,
    newAttachedFiles,
    setNewAttachedFiles,
    existingSubmitFiles,
    submitFiles,
    setSubmitFiles,
    handleAttachFileSelected,
    handleSubmitFileSelected,
    handleFileRemove,
    clearFileStates,
    isLoading: fileLoading,
    showUploadError,
    setShowUploadError,
  } = useFileManagement({
    taskName: selectedTaskName,
    initialAttachFiles: taskUpdate?.attach_file,
    initialSubmitFiles: taskUpdate?.submit_file,
  });

  const {
    allComments,
    showAllComments,
    setShowAllComments,
    pendingComment,
    setPendingComment,
    isLoading: commentsLoading,
    reopenComment,
    submitComment,
    mutateComments,
  } = useCommentsManagement({ taskName: selectedTaskName });

  const {
    isLoading: operationsLoading,
    handleSubmit,
    handleStatusUpdate,
    handleUserSelect,
    checkTaskCompletion,
  } = useTaskOperations({
    taskUpdate,
    setTaskUpdate,
    selectedDueDate,
    frequency,
    weekDays,
    monthDay,
    intervalWeek,
    nthValue,
    dueWorkingDay,
    newAssignedTo,
    selectedStartDate,
    selectedEndDate,
    existingAttachedFiles,
    existingSubmitFiles,
    mutateTask,
    resetEditModes,
    clearFileStates,
    submitComment,
    pendingComment,
    onTaskCompleted: () => setIsOpen(false),
    // formMetaRef, // Pass formMetaRef
    // Remove formMetaRef - replace with new form handling
    formMetaState,
    triggerFormSubmit: () => setTriggerFormSubmit(true),
    formSubmissionResult,
    clearFormSubmissionResult: () => setFormSubmissionResult(null),
  });

  // User data queries
  const { data: usersData } = useUserDetailsByEmails(
    taskUpdate?.assigned_to || "",
  );
  const { data: usersDetails } = useUserDetailsByEmails(userEmail || "");

  // Computed values
  const isProcessTask = taskUpdate?.task_type === "Process";
  const flag =
    roleBaseName === "ROLE-Admin" || taskUpdate?.assigned_to === currentUser;
  const { isDisabled, tooltipMessage } = checkTaskCompletion();
  // console.log("checkTaskCompletion:", { isDisabled, tooltipMessage });
  const isLoading =
    taskDataLoading || fileLoading || commentsLoading || operationsLoading;

  // Event handlers
  const handleReopen = () => {
    setIsPopupOpen(false);
  };

  // Set reminder sentence when task data changes
  React.useEffect(() => {
    if (taskData) {
      setReminderSentence(getReminderSentence(taskData));
    }
  }, [taskData, setReminderSentence]);

  // Don't render if no task name provided
  if (!selectedTaskName) {
    return null;
  }

  return (
    <>
      {isLoading && <Loader size={45} speed={1.75} color="blue" />}
      <SheetContent
        className="w-[90vw] sm:min-w-[750px] sm:w-[100px] max-w-[300px] text-[#2D2C37] px-4 sm:px-8 flex flex-col gap-y-[20px] overflow-auto"
        ref={sheetRef}
      >
        {!taskData ? (
          <div className="flex items-center justify-center h-[calc(100vh-200px)] w-full opacity-0 animate-fadeIn">
            <Loader size={45} speed={1.75} color="blue" />
          </div>
        ) : showHistoryPage ? (
          <div className="flex flex-col gap-8 animate-[fadeIn_0.2s_ease-in_forwards]">
            <button
              onClick={() => setShowHistoryPage(false)}
              className="flex gap-2"
            >
              <ArrowLeft className="text-[#1E1E1E]" />
              <div className="text-[#1E1E1E]">Go Back</div>
            </button>
            <HistoryView
              task={taskUpdate}
              setShowHistoryPage={setShowHistoryPage}
            />
          </div>
        ) : (
          <>
            {/* Back to Parent Task Button */}
            {parentTaskName && (
              <div className="flex items-center gap-2 py-2 px-4 bg-[#F8F9FA] border border-[#E5E7EB] rounded-md">
                <button
                  onClick={handleBackToParent}
                  className="flex items-center gap-2 text-[#0076BE] hover:text-[#0056B3] text-sm font-medium transition-colors"
                >
                  <ArrowLeft size={16} />
                  Back to Parent Task
                </button>
              </div>
            )}

            {/* Task Header */}
            <TaskHeader
              taskupdate={taskUpdate}
              editMode={editMode}
              setEditMode={setEditMode}
              handleSelect={handleSelect}
              canEditTask={(fieldName) =>
                canEditTask(fieldName, userEmail, roleBaseName)
              }
              setShowHistoryPage={setShowHistoryPage}
              isProcessTask={isProcessTask}
              taskMappings={taskMappings}
              totalWorkflowSteps={totalWorkflowSteps}
              roleBaseName={roleBaseName}
              currentUser={currentUser || ""}
            />

            {/* Status Indicator */}
            <TaskStatusIndicator
              taskupdate={taskUpdate}
              reopencmnt={reopenComment}
              isProcessTask={isProcessTask}
            />

            {/* Process Task Section */}
            {isProcessTask && (
              <ProcessTaskSection
                taskUpdate={taskUpdate}
                editMode={editMode}
                setEditMode={setEditMode}
                handleSelect={handleSelect}
                userEmail={userEmail}
                isTaskEditable={isTaskEditable}
                canEditTask={(fieldName) =>
                  canEditTask(fieldName, userEmail, roleBaseName)
                }
                selectedDueDate={selectedDueDate}
                setSelectedDueDate={setSelectedDueDate}
                frequency={frequency}
                setFrequency={setFrequency}
                weekDays={weekDays}
                setWeekDays={setWeekDays}
                custom={custom}
                setCustom={setCustom}
                monthDay={monthDay}
                setMonthDay={setMonthDay}
                intervalWeek={intervalWeek}
                setIntervalWeek={setIntervalWeek}
                nthValue={nthValue}
                setNthValue={setNthValue}
                dueWorkingDay={dueWorkingDay}
                setDueWorkingDay={setDueWorkingDay}
                reminderSentence={reminderSentence}
                existingAttachedFiles={existingAttachedFiles}
                newAttachedFiles={newAttachedFiles}
                isLoading={fileLoading}
                handleAttachFileSelected={handleAttachFileSelected}
                handleFileRemove={handleFileRemove}
                usersData={usersData}
                taskData={taskData}
                onSubtaskClick={handleSubtaskClick}
                reopenComment={reopenComment}
                selectedTaskName={selectedTaskName}
                // formMetaRef={formMetaRef}
                handleUserSelect={handleUserSelect}
                existingSubmitFiles={existingSubmitFiles}
                submitFiles={submitFiles}
                handleSubmitFileSelected={handleSubmitFileSelected}
                showUploadError={showUploadError}
                allComments={allComments}
                showAllComments={showAllComments}
                setShowAllComments={setShowAllComments}
                pendingComment={pendingComment}
                setPendingComment={setPendingComment}
                usersDetails={usersDetails}
                isCurrentTaskExpanded={isCurrentTaskExpanded}
                setIsCurrentTaskExpanded={setIsCurrentTaskExpanded}
                handleStatusUpdate={handleStatusUpdate}
                handleSubmit={handleSubmit}
                isDisabled={isDisabled}
                tooltipMessage={tooltipMessage}
                flag={flag}
                rolePermissions={rolePermissions}
                currentUser={currentUser}
                isPopupOpen={isPopupOpen}
                setIsPopupOpen={setIsPopupOpen}
                reopenButtonRef={reopenButtonRef}
                userDetails={userDetails}
                setReopenReason={setReopenReason}
                setTaskUpdate={setTaskUpdate}
                setcommentboxreload={mutateComments}
                handleReopen={handleReopen}
                formMetaState={formMetaState}
                triggerFormSubmit={triggerFormSubmit}
                handleFormStateChange={handleFormStateChange}
                handleFormSubmissionResult={handleFormSubmissionResult}
              />
            )}

            {/* Process Steps - Only show completed steps */}
            {isProcessTask && <ProcessTaskSteps taskName={selectedTaskName} />}

            {/* Non-Process task content */}
            {!isProcessTask && (
              <>
                <div className="grid divide-y-2 divide-[#F0F1F2] font-[600] overflow-y-auto scroll-hidden pb-[100px]">
                  <TaskDetailsForm
                    taskupdate={taskUpdate}
                    editMode={editMode}
                    setEditMode={setEditMode}
                    handleSelect={handleSelect}
                    userEmail={userEmail}
                    isTaskEditable={isTaskEditable}
                    canEditTask={(fieldName) =>
                      canEditTask(fieldName, userEmail, roleBaseName)
                    }
                    selectedDueDate={selectedDueDate}
                    setSelectedDueDate={setSelectedDueDate}
                    frequency={frequency}
                    setFrequency={setFrequency}
                    weekDays={weekDays}
                    setWeekDays={setWeekDays}
                    custom={custom}
                    setCustom={setCustom}
                    monthDay={monthDay}
                    setMonthDay={setMonthDay}
                    intervalWeek={intervalWeek}
                    setIntervalWeek={setIntervalWeek}
                    nthValue={nthValue}
                    setNthValue={setNthValue}
                    dueWorkingDay={dueWorkingDay}
                    setDueWorkingDay={setDueWorkingDay}
                    reminderSentence={reminderSentence}
                    existingAttachedFiles={existingAttachedFiles}
                    newAttachedFiles={newAttachedFiles}
                    isLoading={fileLoading}
                    handleAttachFileSelected={handleAttachFileSelected}
                    handleFileRemove={handleFileRemove}
                    usersData={usersData}
                    taskData={taskData}
                    onSubtaskClick={handleSubtaskClick}
                    newAssignedTo={newAssignedTo}
                    setNewAssignedTo={setNewAssignedTo}
                    selectedStartDate={selectedStartDate}
                    setSelectedStartDate={setSelectedStartDate}
                    selectedEndDate={selectedEndDate}
                    setSelectedEndDate={setSelectedEndDate}
                    existingSubmitFiles={existingSubmitFiles}
                    submitFiles={submitFiles}
                    handleSubmitFileSelected={handleSubmitFileSelected}
                    showUploadError={showUploadError}
                  />

                  {/* Subtasks Section */}
                  {
                    <div>
                      <SubtasksSection
                        // editMode={taskData?.task_type !== "Recurring" ? editMode : {}}
                        editMode={editMode}
                        setEditMode={setEditMode}
                        subtask={taskUpdate?.subtask || []}
                        setSubtask={(subtasks) =>
                          setTaskUpdate((prev) => ({
                            ...prev,
                            subtask: subtasks,
                          }))
                        }
                        taskupdate={taskUpdate}
                        userEmail={userEmail}
                        isTaskEditable={isTaskEditable}
                        onSubtaskClick={handleSubtaskClick}
                        roleBaseName={roleBaseName}
                        currentUser={currentUser || ""}
                      />
                    </div>
                  }

                  <ChecklistSection
                    editMode={editMode}
                    setEditMode={setEditMode}
                    checklist={checklist}
                    setChecklist={updateTaskWithChecklist}
                    taskupdate={taskUpdate}
                    userEmail={userEmail}
                    isTaskEditable={isTaskEditable}
                    roleBaseName={roleBaseName}
                  />

                  {/* Comments Section */}
                  <CommentsSection
                    allComments={allComments}
                    showAllComments={showAllComments}
                    setShowAllComments={setShowAllComments}
                    pendingComment={pendingComment}
                    setPendingComment={setPendingComment}
                    isLoading={commentsLoading}
                    canEdit={!taskUpdate?.is_completed && isTaskEditable()}
                    usersDetails={usersDetails || []}
                  />
                </div>

                {/* Bottom Action Buttons for non-Process tasks */}
                <TaskActions
                  taskupdate={taskUpdate}
                  isTaskEditable={isTaskEditable}
                  handleSubmit={handleSubmit}
                  isDisabled={isDisabled}
                  tooltipMessage={tooltipMessage}
                  flag={flag}
                  rolePermissions={rolePermissions}
                  currentUser={currentUser || ""}
                  isPopupOpen={isPopupOpen}
                  setIsPopupOpen={setIsPopupOpen}
                  reopenButtonRef={reopenButtonRef}
                  userDetails={userDetails || []}
                  setReopenReason={setReopenReason}
                  setTaskUpdate={setTaskUpdate}
                  setcommentboxreload={mutateComments}
                  handleReopen={handleReopen}
                  isProcessTask={false}
                />
              </>
            )}
          </>
        )}
      </SheetContent>
    </>
  );
};

export default TaskSheetContent;

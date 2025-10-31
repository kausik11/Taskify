import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Custom Components
import TaskDetailsForm from "./TaskDetailsForm";
import FileUploadSection from "./FileUploadSection";
import CommentsSection from "./CommentsSection";
import TaskActions from "./TaskActions";
import ProcessTaskActionDropdown from "./ProcessTaskActionDropdown";
import FormDetails from "../FormDetails";
import { FormMeta } from "../FormMeta";
import { FetchedFormRenderer } from "../FetchedFormRenderer";
import UserSelect from "./UserSelect";

interface ProcessTaskSectionProps {
  // Task data
  taskUpdate: any;
  taskData: any;
  selectedTaskName: string;
  
  // Form state
  editMode: any;
  setEditMode: any;
  handleSelect: any;
  userEmail: string;
  isTaskEditable: (fieldName?: string) => boolean;
  canEditTask: (fieldName?: string) => boolean;
  
  // Date and frequency
  selectedDueDate: Date | null;
  setSelectedDueDate: (date: Date | null) => void;
  frequency: { name: string };
  setFrequency: (freq: { name: string }) => void;
  weekDays: string[];
  setWeekDays: (days: string[]) => void;
  custom: { name: string };
  setCustom: (custom: { name: string }) => void;
  monthDay: { name: string };
  setMonthDay: (day: { name: string }) => void;
  intervalWeek: { name: string };
  setIntervalWeek: (week: { name: string }) => void;
  nthValue: { name: string };
  setNthValue: (value: { name: string }) => void;
  dueWorkingDay: string;
  setDueWorkingDay: (day: string) => void;
  reminderSentence: string;
  
  // Files
  existingAttachedFiles: any[];
  newAttachedFiles: File[];
  existingSubmitFiles: any[];
  submitFiles: File[];
  isLoading: boolean;
  handleAttachFileSelected: (files: File[], field: "attach_file" | "submit_file") => void;
  handleFileRemove: (index: number, fileType: "attach_file" | "submit_file") => void;
  handleSubmitFileSelected: (files: File[], field: "attach_file" | "submit_file") => void;
  showUploadError: string;
  
  // Users and navigation
  usersData: any;
  onSubtaskClick?: (subtaskId: string) => void;
  
  // Comments
  allComments: any[];
  showAllComments: boolean;
  setShowAllComments: (show: boolean) => void;
  pendingComment: string;
  setPendingComment: (comment: string) => void;
  usersDetails: any[];
  
  // Reopen functionality
  reopenComment: string;
  
  // UI state
  isCurrentTaskExpanded: boolean;
  setIsCurrentTaskExpanded: (expanded: boolean) => void;
  
  // Refs
  formMetaRef: React.RefObject<any>;
  
  // Event handlers
  handleStatusUpdate: (status: string) => void;
  handleUserSelect: (value: string) => void;
  handleSubmit: (e: React.FormEvent, action: string) => void;
  
  // Task actions
  isDisabled: boolean;
  tooltipMessage: string;
  flag: boolean;
  rolePermissions: any;
  currentUser: string;
  isPopupOpen: boolean;
  setIsPopupOpen: (open: boolean) => void;
  reopenButtonRef: React.RefObject<HTMLButtonElement>;
  userDetails: any[];
  setReopenReason: any;
  setTaskUpdate: any;
  setcommentboxreload: any;
  handleReopen: () => void;
  formMetaState?: {
    isValid: boolean;
    submitForm: (() => Promise<any>) | null;
  };
  triggerFormSubmit?: boolean;
  handleFormStateChange?: (isValid: boolean, submitForm: () => Promise<any>) => void;
  handleFormSubmissionResult?: (result: { success: boolean; data?: any; error?: any }) => void;
}

const ProcessTaskSection: React.FC<ProcessTaskSectionProps> = ({
  taskUpdate,
  taskData,
  selectedTaskName,
  editMode,
  setEditMode,
  handleSelect,
  userEmail,
  isTaskEditable,
  canEditTask,
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
  existingAttachedFiles,
  newAttachedFiles,
  existingSubmitFiles,
  submitFiles,
  isLoading,
  handleAttachFileSelected,
  handleFileRemove,
  handleSubmitFileSelected,
  showUploadError,
  usersData,
  onSubtaskClick,
  allComments,
  showAllComments,
  setShowAllComments,
  pendingComment,
  setPendingComment,
  usersDetails,
  reopenComment,
  isCurrentTaskExpanded,
  setIsCurrentTaskExpanded,
  formMetaRef,
  handleStatusUpdate,
  handleUserSelect,
  handleSubmit,
  isDisabled,
  tooltipMessage,
  flag,
  rolePermissions,
  currentUser,
  isPopupOpen,
  setIsPopupOpen,
  reopenButtonRef,
  userDetails,
  setReopenReason,
  setTaskUpdate,
  setcommentboxreload,
  handleReopen,
   // ADD THESE:
  formMetaState,
  triggerFormSubmit,
  handleFormStateChange,
  handleFormSubmissionResult,
}) => {
  return (
    <>
      {/* Process Task Current Task Section */}
      <Collapsible
        open={isCurrentTaskExpanded}
        onOpenChange={setIsCurrentTaskExpanded}
        className="border border-[#E5E7EB] rounded-lg bg-white shadow-sm"
      >
        <CollapsibleTrigger className="w-full flex items-center justify-between p-4 bg-[#e4e4e6] transition-colors">
          <div className="flex items-center gap-3">
            {isCurrentTaskExpanded ? (
              <ChevronDown className="w-5 h-5 text-[#6B7280]" />
            ) : (
              <ChevronRight className="w-5 h-5 text-[#6B7280]" />
            )}
            <div className="flex items-center gap-2">
              <h3 className="font-[600] text-[16px] text-[#1F2937]">
                {taskUpdate?.task_name}
              </h3>
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="border-t border-[#E5E7EB]">
          <div className="p-4 space-y-4">
            {/* Reopen comment for Process tasks */}
            {taskUpdate.task_type === "Process" &&
              reopenComment &&
              taskUpdate?.status !== "Rejected" && (
                <div className="mx-w-648 mx-h-33 mb-6 bg-[#F0E7BB] flex rounded-[8px]">
                  <p className="font-[400] text-[14px] pt-2 pr-3 pb-2 pl-3 text-[#2D2C37]">
                    {reopenComment || ""}
                  </p>
                </div>
              )}

            {/* Task Details Form for Process Tasks */}
            <TaskDetailsForm
              taskupdate={taskUpdate}
              editMode={editMode}
              setEditMode={setEditMode}
              handleSelect={handleSelect}
              userEmail={userEmail}
              isTaskEditable={isTaskEditable}
              canEditTask={canEditTask}
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
              isLoading={isLoading}
              handleAttachFileSelected={handleAttachFileSelected}
              handleSubmitFileSelected={handleSubmitFileSelected}
              handleFileRemove={handleFileRemove}
              usersData={usersData}
              taskData={taskData}
              onSubtaskClick={onSubtaskClick}
            />

            {/* Form Details */}
            <div>
              <FormDetails taskName={selectedTaskName} />
            </div>

            <div className="pt-4">
              {/* {taskUpdate?.task_type === "Process" && taskUpdate?.attached_form &&
                !taskUpdate.is_completed && (
                  <FormMeta
                    ref={formMetaRef}
                    doctype={taskUpdate.attached_form}
                    docName={taskData?.name}
                  />
                )} */}
                {taskUpdate?.task_type === "Process" && taskUpdate?.attached_form &&
                        !taskUpdate.is_completed && (
                          <FormMeta
                            doctype={taskUpdate.attached_form}
                            docName={taskData?.name}
                            onFormStateChange={handleFormStateChange}
                            triggerSubmit={triggerFormSubmit}
                            onSubmissionResult={handleFormSubmissionResult}
                          />
                        )}

              {taskData?.select_next_task_doer === 1 &&
                !taskData?.attached_form &&
                !taskUpdate?.is_completed && (
                  <UserSelect
                    field={{
                      fieldname: "next_task_assigned_to",
                      label: "Next Task Assigned To",
                      fieldtype: "Link",
                      options: "CG User",
                      reqd: 1,
                    }}
                    fieldProps={{
                      readOnly: false,
                    }}
                    onUserSelect={handleUserSelect}
                    value={taskUpdate?.next_task_assigned_to || ""}
                  />
                )}

              {/* Form for completed process task */}
              {taskData?.attached_docname &&
                taskUpdate?.is_completed == 1 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      height: "100%",
                    }}
                  >
                    <FetchedFormRenderer
                      key={taskUpdate?.task_name}
                      doctype={taskUpdate?.attached_form}
                      docname={taskUpdate?.attached_docname}
                    />
                  </div>
                )}
            </div>

            {/* Submit Files Section for Process Tasks */}
            <FileUploadSection
              type="submit_file"
              label="Submit Files"
              required={taskUpdate?.upload_required === 1}
              existingFiles={existingSubmitFiles}
              newFiles={submitFiles}
              isLoading={isLoading}
              canEdit={!taskUpdate?.is_completed && isTaskEditable()}
              onFilesSelected={handleSubmitFileSelected}
              onFileRemove={handleFileRemove}
              showUploadError={showUploadError}
            />

            {/* Comments Section for Process Tasks */}
            <CommentsSection
              allComments={allComments}
              showAllComments={showAllComments}
              setShowAllComments={setShowAllComments}
              pendingComment={pendingComment}
              setPendingComment={setPendingComment}
              isLoading={isLoading}
              canEdit={!taskUpdate?.is_completed && isTaskEditable()}
              usersDetails={usersDetails || []}
            />

            {/* Action Buttons for Process Tasks */}
            <div className="flex items-center justify-end border-t border-[#E5E7EB] py-6 px-2 mt-4">
              <div className="flex justify-center items-center gap-x-3">
                {!taskUpdate?.is_completed && (
                  <ProcessTaskActionDropdown
                    taskupdate={taskUpdate}
                    handleStatusUpdate={handleStatusUpdate}
                  />
                )}

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
                  setcommentboxreload={setcommentboxreload}
                  handleReopen={handleReopen}
                  isProcessTask={true}
                  // formMetaRef={formMetaRef} // Ensure this is passed
                />
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
};

export default ProcessTaskSection;
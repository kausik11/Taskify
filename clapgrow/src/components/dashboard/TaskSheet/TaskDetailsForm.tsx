import React from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronDown } from "lucide-react";
import FormDropdown from "@/components/common/FormDropdown";
import CombinedDropDown from "../CombinedDropDown";
import CustomCalender from "@/components/common/CustomCalender";
import { PriorityDisplay } from "@/components/common/PriorityDisplay";
import UserAssignees from "../UserAssignees";
import {
  getInitials,
  getReminderSentence,
} from "@/components/common/CommonFunction";
import FileUploadSection from "./FileUploadSection";
import { useFrappeGetDoc } from "frappe-react-sdk";

interface TaskDetailsFormProps {
  taskupdate: any;
  editMode: any;
  setEditMode: any;
  handleSelect: any;
  userEmail: string;
  isTaskEditable: (fieldName?: string) => boolean;
  canEditTask: (fieldName?: string) => boolean;

  // Date and frequency related
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

  // File related
  existingAttachedFiles: any[];
  newAttachedFiles: File[];
  isLoading: boolean;
  handleAttachFileSelected: (
    files: File[],
    field: "attach_file" | "submit_file",
  ) => void;
  handleFileRemove: (
    index: number,
    fileType: "attach_file" | "submit_file",
  ) => void;
  existingSubmitFiles: any[];
  submitFiles: File[];
  handleSubmitFileSelected: (
    files: File[],
    field: "attach_file" | "submit_file",
  ) => void;
  showUploadError: string;

  // User data
  usersData: any[];
  taskData: any;

  // Add subtask click handler prop
  onSubtaskClick?: (subtaskId: string) => void;
}

const TaskDetailsForm: React.FC<TaskDetailsFormProps> = ({
  taskupdate,
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
  isLoading,
  handleAttachFileSelected,
  handleFileRemove,
  existingSubmitFiles,
  submitFiles,
  handleSubmitFileSelected,
  showUploadError,
  usersData,
  taskData,
}) => {
  // console.log("taskData", taskData);
  // console.log("taskupdate", taskupdate);
  const canEditFrequency = (taskType: string): boolean => {
    return taskType === "Onetime";
  };

  const holidayBehaviorOptions = [
    { name: "Previous Working Date" },
    { name: "Next Working Date" },
    { name: "Ignore Holiday" },
  ];

  const { data: parentTaskData } = useFrappeGetDoc(
    "CG Task Instance",
    taskupdate?.parent_task_instance,
  );
  // console.log("parentTaskData", parentTaskData);
  return (
    <div className="grid divide-y-2 divide-[#F0F1F2] font-[600]">
      {/* Assigned To */}
      <FormDropdown
        userEmail={userEmail}
        label="Assigned To"
        fieldKey="temporaryReallocation"
        editMode={taskData.task_type !== "Recurring" ? editMode : {}}
        setEditMode={setEditMode}
        taskupdate={taskupdate}
        disabled={!isTaskEditable("assigned_to")}
      >
        <div className="flex items-center space-x-1">
          <UserAssignees users={usersData || []} />
          <p className="text-[14px]">
            {`${
              userEmail === taskupdate?.assigned_to
                ? "Me"
                : usersData?.[0]?.full_name
            }`}
          </p>
        </div>
      </FormDropdown>

      {/* Checker */}
      <FormDropdown
        userEmail={userEmail}
        label="Checker"
        fieldKey="checker"
        editMode={taskData.task_type !== "Recurring" ? editMode : {}}
        setEditMode={setEditMode}
        taskupdate={taskupdate}
        disabled={!isTaskEditable("checker")}
      >
        <div className="flex items-center space-x-1">
          {editMode.checker ? (
            <CombinedDropDown
              disabled={true}
              DataType={"isEmployeeData"}
              value={taskupdate?.checker ?? ""}
              handleSelect={(value: string) => handleSelect("checker", value)}
              placeholder="Add Member"
              className="w-full border-none text-[14px] bg-transparent text-[#A0A0A0] p-0 font-[400]"
            />
          ) : taskData?.checker_full_name ? (
            <div className="rounded-full bg-[#E0E0E0] text-[#A0A0A0] w-[18px] h-[18px] font-[400] text-[10px] flex items-center justify-center">
              <Avatar className="h-[18px] w-[18px]">
                <AvatarImage src={taskData?.checker_image} />
                <AvatarFallback>
                  {getInitials(
                    taskData?.checker_first_name,
                    taskData?.checker_last_name,
                  )}
                </AvatarFallback>
              </Avatar>
            </div>
          ) : (
            ""
          )}
          {!editMode.checker && (
            <div className="text-[14px] text-[#A0A0A0]">
              {taskData?.checker_full_name ? (
                `Assigned to ${
                  taskData?.assignee_email === taskData?.checker_email
                    ? "me"
                    : taskData?.checker_full_name
                }`
              ) : (
                <p className="font-[400] text-[14px] text-[#A0A0A0]">
                  No checker assigned
                </p>
              )}
            </div>
          )}
        </div>
      </FormDropdown>

      {/* Task Type */}
      {/* {!taskupdate?.is_help_ticket && taskupdate?.task_type==="Onetime" && (
        <FormDropdown
          userEmail={userEmail}
          label="Frequency"
          fieldKey="task_type"
          editMode={editMode}
          setEditMode={setEditMode}
          taskupdate={taskupdate}
          disabled={true}
        >
          <div className="flex items-center">
            <p className="bg-[#F0F1F2] text-[#304156] w-fit rounded-[16px] py-[2px] px-[6px] text-[12px] font-[400]">
              Subtask of
            </p>
          </div>
        </FormDropdown>
      )} */}

      {taskData.is_subtask ? (
        <FormDropdown
          userEmail={userEmail}
          label="Task Type"
          fieldKey="task_type"
          editMode={editMode}
          setEditMode={setEditMode}
          taskupdate={taskupdate}
          disabled={true}
        >
          <div className="flex items-center">
            <p className="bg-[#F0F1F2] text-[#304156] w-fit rounded-[16px] py-[2px] px-[6px] text-[12px] font-[400]">
              {taskupdate?.task_type} Task
            </p>
          </div>
        </FormDropdown>
      ) : (
        ""
      )}

      {/* Frequency */}
      {taskData.task_type === "Recurring" && (
        <FormDropdown
          userEmail={userEmail}
          label="Frequency"
          fieldKey="frequency"
          editMode={taskData.task_type !== "Recurring" ? editMode : {}}
          setEditMode={setEditMode}
          taskupdate={taskupdate}
          disabled={!isTaskEditable("frequency")}
        >
          <div className="flex  flex-col items-start gap-2">
            <div className="flex gap-2">
              <p className="bg-[#F0F1F2] text-[#2D2C37] w-fit rounded-[16px] py-[2px] px-[6px] font-normal text-[12px] text-[400]">
                {taskupdate?.task_type} Task
              </p>
              <p className="text-[14px] text-[600] text-[#2D2C37]">
                {taskupdate?.recurrence_type_id[0]?.frequency}
              </p>
            </div>
            <p>
              {taskupdate?.recurrence_type_id[0]?.frequency === "Weekly" && (
                <p className="bg-[#F0F1F2] text-[#304156] w-fit rounded-[16px] py-[2px] px-[6px] font-normal text-[12px]">
                  {taskupdate?.recurrence_type_id[0]?.week_days}
                </p>
              )}
              {taskupdate?.recurrence_type_id[0]?.frequency === "Monthly" &&
                taskupdate?.recurrence_type_id[0]?.nth_week && (
                  <p className="bg-[#F0F1F2] text-[#304156] w-fit rounded-[16px] py-[2px] px-[6px] font-normal text-[12px]">
                    Every {taskupdate?.recurrence_type_id[0]?.nth_week}{" "}
                    {taskupdate?.recurrence_type_id[0]?.week_days}
                  </p>
                )}

              {taskupdate?.recurrence_type_id[0]?.frequency === "Monthly" &&
              !taskupdate?.recurrence_type_id[0]?.nth_week &&
              taskupdate?.recurrence_type_id[0]?.month_days ? (
                <p className="bg-[#F0F1F2] text-[#304156] w-fit rounded-[16px] py-[2px] px-[6px] font-normal text-[12px]">
                  every {taskupdate?.recurrence_type_id[0]?.month_days} of
                  current month
                </p>
              ) : (
                ""
              )}

              {taskupdate?.recurrence_type_id?.[0]?.frequency === "Yearly" &&
                taskupdate?.due_date && (
                  <p className="bg-[#F0F1F2] text-[#304156] w-fit rounded-[16px] py-[2px] px-[6px] font-normal text-[12px]">
                    {(() => {
                      const date = new Date(taskupdate.due_date);
                      const day = date.getDate(); // 20
                      const month = date.toLocaleString("default", {
                        month: "long",
                      }); // September
                      return `every ${day} of ${month}`;
                    })()}
                  </p>
                )}

              {/* Custom monthly */}
              {taskupdate?.recurrence_type_id?.[0]?.frequency === "Custom" &&
              taskupdate?.recurrence_type_id[0]?.nth_week !== "" ? (
                <p className="bg-[#F0F1F2] text-[#304156] w-fit rounded-[16px] py-[2px] px-[6px] font-normal text-[12px]">
                  Every {taskupdate?.recurrence_type_id[0]?.interval} Month
                  {", "} {taskupdate?.recurrence_type_id[0]?.nth_week} Week
                  {", "}
                  {taskupdate?.recurrence_type_id[0]?.week_days}
                </p>
              ) : (
                ""
              )}

              {/* Custom Weekly */}
              {taskupdate?.recurrence_type_id?.[0]?.frequency === "Custom" &&
              taskupdate?.recurrence_type_id[0]?.nth_week === "" &&
              taskupdate?.recurrence_type_id[0]?.week_days ? (
                <p className="bg-[#F0F1F2] text-[#304156] w-fit rounded-[16px] py-[2px] px-[6px] font-normal text-[12px]">
                  Every {taskupdate?.recurrence_type_id[0]?.interval} Week{" "}
                  {taskupdate?.recurrence_type_id[0]?.week_days}
                </p>
              ) : (
                ""
              )}

              {/* Custom -> month -> on_day */}
              {taskupdate?.recurrence_type_id?.[0]?.frequency === "Custom" &&
              taskupdate?.recurrence_type_id[0]?.nth_week === "" &&
              taskupdate?.recurrence_type_id[0]?.month_days ? (
                <p className="bg-[#F0F1F2] text-[#304156] w-fit rounded-[16px] py-[2px] px-[6px] font-normal text-[12px]">
                  Every {taskupdate?.recurrence_type_id[0]?.interval} Month{" "}
                  {taskupdate?.recurrence_type_id[0]?.on_day} {", On day "}
                  {taskupdate?.recurrence_type_id[0]?.month_days}
                </p>
              ) : (
                ""
              )}
            </p>
          </div>
        </FormDropdown>
      )}

      {/* Due Date */}
      <FormDropdown
        userEmail={userEmail}
        label="Due Date and Time"
        fieldKey="due_date"
        editMode={taskData.task_type !== "Recurring" ? editMode : {}}
        setEditMode={setEditMode}
        taskupdate={taskupdate}
        disabled={!isTaskEditable("due_date")}
      >
        <div className="flex space-x-4">
          <div className="flex flex-col">
            {editMode.due_date ? (
              <CustomCalender
                date={selectedDueDate || new Date()}
                onChange={(value) => {
                  setSelectedDueDate(value);
                  handleSelect("due_date", format(value, "yyyy-MM-dd"));
                }}
                containerClassName="w-full md:w-[20vw] border-none text-black p-0 bg-transparent"
                text="Due Date"
                TaskType={taskupdate?.task_type}
                isSubtask={false}
                frequency={frequency}
                setFrequency={
                  canEditFrequency(taskupdate?.task_type || "")
                    ? setFrequency
                    : () => {}
                }
                weekDays={weekDays}
                setWeekDays={
                  canEditFrequency(taskupdate?.task_type || "")
                    ? setWeekDays
                    : () => {}
                }
                custom={custom}
                setCustom={
                  canEditFrequency(taskupdate?.task_type || "")
                    ? setCustom
                    : () => {}
                }
                monthDay={monthDay}
                setMonthDay={
                  canEditFrequency(taskupdate?.task_type || "")
                    ? setMonthDay
                    : () => {}
                }
                intervalWeek={intervalWeek}
                setIntervalWeek={
                  canEditFrequency(taskupdate?.task_type || "")
                    ? setIntervalWeek
                    : () => {}
                }
                nthValue={nthValue}
                setNthValue={
                  canEditFrequency(taskupdate?.task_type || "")
                    ? setNthValue
                    : () => {}
                }
              />
            ) : (
              <>
                <div className="ml-0">
                  <p className="text-[14px] text-[#2D2C37] font-semibold">
                    {taskupdate?.due_date
                      ? format(
                          new Date(taskupdate.due_date),
                          "dd MMMM, hh:mm a",
                        )
                      : "No due date available"}
                  </p>

                  {taskupdate?.holiday_behaviour && (
                    <p className="flex items-center gap-1 mt-1">
                      <span className="text-[12px] text-[#5B5967]">
                        If holidays fall on the due dates, mark it done on
                      </span>
                      <span className="text-[12px] text-[#5B5967] bg-gray-100 px-2 py-1 rounded-full">
                        {taskupdate?.holiday_behaviour}
                      </span>
                    </p>
                  )}
                  {reminderSentence && getReminderSentence(taskupdate)}
                </div>
              </>
            )}
            {taskupdate?.task_type === "Recurring" && editMode.due_date && (
              <div className="w-[450px]">
                <div className="flex items-center gap-x-2">
                  <p className="font-[400] text-[12px] text-[#5B5967]">
                    If holidays fall on the due dates, mark it done on
                  </p>
                  <div className="relative flex items-center gap-1 text-[12px] text-[#0076BD] bg-[#EFF9FF] py-[5px] px-[6px] rounded-[10px] w-fit">
                    <ChevronDown className="w-[15px] h-[15px] pointer-events-none absolute right-2 top-1/2 transform -translate-y-1/2" />
                    <select
                      value={dueWorkingDay}
                      onChange={(e) => {
                        setDueWorkingDay(e.target.value);
                        handleSelect("holiday_behaviour", e.target.value);
                      }}
                      className="appearance-none bg-transparent text-[#0076BD] font-[400] text-[12px] pl-2 pr-6 py-1 outline-none"
                      disabled={!isTaskEditable("holiday_behaviour")}
                    >
                      {holidayBehaviorOptions.map((option) => (
                        <option key={option.name} value={option.name}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </FormDropdown>

      {/* Priority */}
      {!taskupdate?.is_help_ticket && (
        <FormDropdown
          userEmail={userEmail}
          label="Priority"
          required
          fieldKey="priority"
          editMode={taskData.task_type !== "Recurring" ? editMode : {}}
          setEditMode={setEditMode}
          taskupdate={taskupdate}
          disabled={!isTaskEditable("priority")}
        >
          <div className="flex space-x-4">
            {editMode.priority ? (
              <CombinedDropDown
                DataType="isPriorityData"
                value={taskupdate?.priority}
                handleSelect={(item: any) =>
                  handleSelect("priority", item.name)
                }
                placeholder="Select Priority"
                getKey={(item: any) => item.name}
                renderItem={(item: any) => (
                  <div className="text-[#2D2C37] text-[12px] px-3 py-1 hover:bg-[#F1F5FA] rounded">
                    {item?.name}
                  </div>
                )}
                className="border-none p-0"
                disabled={!isTaskEditable("priority")}
              />
            ) : (
              <PriorityDisplay priority={taskupdate?.priority} />
            )}
          </div>
        </FormDropdown>
      )}

      {/* Tags */}
      <FormDropdown
        userEmail={userEmail}
        label="Tags"
        fieldKey="tag"
        editMode={taskData.task_type !== "Recurring" ? editMode : {}}
        setEditMode={setEditMode}
        taskupdate={taskupdate}
        disabled={!isTaskEditable("tags")}
      >
        {editMode.tag ? (
          <CombinedDropDown
            value={taskupdate?.tag}
            handleSelect={(value) => handleSelect("tag", value)}
            DataType={"isTagsData"}
            placeholder="Select Tags"
            className={`border-none p-0`}
            disabled={!isTaskEditable("tags")}
          />
        ) : (
          <p className="rounded-[8px] py-[2px] font-[600] text-[14px] text-[#2D2C37]">
            {taskupdate?.tag ? taskupdate?.tag : "No Tags"}
          </p>
        )}
      </FormDropdown>

      {/* Description with Attached Files */}
      <FormDropdown
        userEmail={userEmail}
        label="Description"
        width="70%"
        fieldKey="description"
        editMode={taskData.task_type !== "Recurring" ? editMode : {}}
        setEditMode={setEditMode}
        taskupdate={taskupdate}
        disabled={!isTaskEditable("description")}
      >
        <div className="flex flex-col text-left w-full">
          {editMode.description ? (
            <div
              style={{
                borderRadius: "8px",
                border: "1px solid #D0D3D9",
                width: "100%",
                maxWidth: "min(50vw, 450px)",
                minWidth: "100px",
                margin: "0 auto",
                padding: "0",
              }}
              className="mb-4"
            >
              <ReactQuill
                theme="snow"
                value={taskupdate.description || ""}
                onChange={(value) => handleSelect("description", value)}
                modules={{
                  toolbar: [
                    [{ header: [1, 2, false] }],
                    ["bold", "italic", "underline", "strike"],
                    [{ list: "ordered" }, { list: "bullet" }],
                    ["link"],
                    ["clean"],
                  ],
                }}
                placeholder="Task description"
                className="min-h-[150px] [&_.ql-container]:h-32 [&_.ql-container]:border-0 [&_.ql-toolbar]:border-0 [&_.ql-toolbar_button:focus-visible]:outline-none [&_.ql-editor:focus-visible]:outline-none [&_.ql-editor]:text-left font-[400] text-[14px] text-gray-700"
                readOnly={!isTaskEditable("description")}
              />
            </div>
          ) : (
            <div
              className="w-full max-w-[28rem] md:max-w-[500px] font-[400] text-[14px] text-gray-700"
              style={{ padding: "0", border: "none" }}
            >
              {taskupdate.description &&
              taskupdate.description !== "<p><br></p>" ? (
                <div
                  style={{
                    width: "100%",
                    maxWidth: "min(90vw, 700px)",
                    minWidth: "250px",
                    margin: "0 1px",
                  }}
                  className="mb-0"
                >
                  <ReactQuill
                    value={taskupdate.description || ""}
                    readOnly={true}
                    theme="snow"
                    modules={{ toolbar: false }}
                    className="min-w-[40vh] [&_.ql-container]:border-0 [&_.ql-container]:max-h-[10px] [&_.ql-toolbar]:border-0 [&_.ql-toolbar_button:focus-visible]:outline-none [&_.ql-editor]:border-none [&_.ql-editor:focus-visible]:outline-none [&_.ql-editor]:border-0 [&_.ql-editor]:p-0 font-[400] text-[14px] text-[#2D2C37]"
                  />
                </div>
              ) : (
                <span className="text-gray-500 font-[400] text-[14px]">
                  No Description
                </span>
              )}
            </div>
          )}
          {/* Attached Files Integration */}
          <div className="w-full">
            <FileUploadSection
              type="attach_file"
              label=""
              existingFiles={existingAttachedFiles}
              newFiles={newAttachedFiles}
              isLoading={isLoading}
              canEdit={editMode.description && isTaskEditable("description")}
              onFilesSelected={handleAttachFileSelected}
              onFileRemove={handleFileRemove}
              className="mt-4 bg-transparent p-0"
            />
          </div>
        </div>
      </FormDropdown>
      {taskData.task_type !== "Process" && (
        <div className="py-2 border-y-1">
          <FileUploadSection
            type="submit_file"
            label="Attach files"
            required={taskupdate?.upload_required === 1}
            existingFiles={existingSubmitFiles}
            newFiles={submitFiles}
            isLoading={isLoading}
            canEdit={!taskupdate?.is_completed && isTaskEditable()}
            onFilesSelected={handleSubmitFileSelected}
            onFileRemove={handleFileRemove}
            showUploadError={showUploadError}
          />
        </div>
      )}

      {taskupdate.is_subtask === 1 && (
        <FormDropdown
          label="Parent Task"
          width="70%"
          fieldKey="parent_task"
          editMode={editMode}
          setEditMode={setEditMode}
          taskupdate={taskupdate}
          disabled={isTaskEditable("parent_task")}
        >
          <div className="px-1">
            {taskupdate.parent_task_instance && (
              <span className="text-[#2D2C37] font-semibold text-[14px] px-1">
                {/* {parentTaskData?.task_name?.toupperCase()} */}
                {parentTaskData?.task_name.charAt(0).toUpperCase() +
                  parentTaskData?.task_name.slice(1)}
              </span>
            )}
          </div>
        </FormDropdown>
      )}
    </div>
  );
};

export default TaskDetailsForm;

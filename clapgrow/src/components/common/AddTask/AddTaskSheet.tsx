import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetContent,
  SheetOverlay,
  SheetTrigger,
} from "@/components/ui/sheet";
import { UserContext } from "@/utils/auth/UserProvider";
import { useContext, useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Loader } from "@/components/layout/AlertBanner/CommonDesign";
import { PRIORITY_DATA } from "@/data/common";
import { DateFormat, convertTo24HourFormat } from "../CommonFunction";
import {
  FrappeConfig,
  FrappeContext,
  useFrappeCreateDoc,
  useFrappeFileUpload,
  useFrappeGetDoc,
  useFrappeGetDocList,
  useFrappeUpdateDoc,
} from "frappe-react-sdk";
import { toast } from "sonner";
import { CGBranch } from "@/types/ClapgrowApp/CGBranch";
import { CGUser } from "@/types/ClapgrowApp/CGUser";
import { useTaskContext } from "@/utils/api/TaskProvider";

// Import smaller components
import TaskHeader from "./TaskHeader";
import TaskTypeSelector from "./TaskTypeSelector";
import TaskFormFields from "./TaskFormFields";
import CheckerManager from "./CheckerManager";
import SubtaskManager from "./SubtaskManager";
import TaskOptions from "./TaskOptions";
import TaskSubmitFooter from "./TaskSubmitFooter";
import ChecklistManager from "./ChecklistManager";
import { EditModeOfTask, TaskFormData } from "../CommonTypes";

const defaultEditMode: EditModeOfTask = {
  task_name: false,
  temporaryReallocation: false,
  checker: false,
  task_type: false,
  due_date: false,
  priority: false,
  tags: false,
  description: false,
  subTasks: false,
  attach_file: false,
};

const subtaskSchema = z.object({
  task_name: z.string().min(1, "Subtask name is required field"),
  assigned_to: z.object({
    email: z.string().min(1, "Assigned to is required"),
  }),
  due_date: z.date().refine((date) => date > new Date(), {
    message: "Subtask due date cannot be in the past",
  }),
});
const checklistSchema = z.object({
  checklist_item: z.string().min(1, "Checklist item is required"),
  is_checked: z.number().default(0),
});

const formSchema = z
  .object({
    task_name: z.string().min(1, "Task Name is required"),
    is_help_ticket: z.number(),
    assigned_to: z
      .object({
        email: z.string().email({ message: "Assigned To is required" }),
      })
      .nullable()
      .refine((value) => value === null || value?.email?.trim(), {
        message: "Assigned To is a required field",
      }),
    due_date: z.date().refine((date) => date > new Date(), {
      message: "Main task cannot be in the past",
    }),
    priority: z.union([
      z.object({
        value: z.string().min(1, "Priority is a required field").default("Low"),
      }),
      z.null(),
    ]),
    description: z.string().optional(),
    checker: z
      .object({
        email: z.string().optional(),
      })
      .optional(),
    tags: z
      .union([
        z.array(z.any()).optional(),
        z.object({
          tag_name: z.string().optional(),
        }),
        z.null(),
      ])
      .optional(),
    restrict: z.number(),
    upload_required: z.number(),
    is_completed: z.number(),
    task_type: z.enum(["Onetime", "Recurring"]),
    subtask: z.array(subtaskSchema).optional(),
    checklist: z.array(checklistSchema).optional(),
  })
  .superRefine((data, ctx) => {
    data.subtask?.forEach((subtask, index) => {
      if (subtask.due_date > data.due_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["subtask", index, "due_date"],
          message: "Subtask due date must be before the main task's due date",
        });
      }
    });
  });

export default function AddTaskSheet({ onTaskCreated }) {
  const { call } = useContext(FrappeContext) as FrappeConfig;
  const { userDetails, rolePermissions } = useContext(UserContext);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [frequency, setFrequency] = useState<{ name: string }>({
    name: "Weekly",
  });
  const [custom, setCustom] = useState<{ name: string }>({ name: "" });
  const [weekDays, setWeekDays] = useState<string[]>([]);
  const [monthDay, setMonthDay] = useState({ name: "" });
  const [intervalWeek, setIntervalWeek] = useState<{ name: string }>({
    name: "",
  });
  const [isRemainderSet, setIsRemainderSet] = useState<boolean>(false);
  const [reminderType, setReminderType] = useState("Select");
  const [reminderCustomType, setReminderCustomType] = useState("Hours");
  const [reminderCustomTypeValue, setReminderTypeValue] = useState<
    string | number
  >("Select");

  const [isRemainderStartingOn, setIsRemainderStartingOn] = useState<
    Date | undefined
  >(new Date());

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDropdownCustomTypeOpen, setIsDropdownCustomTypeOpen] =
    useState(false);
  const [isDropdownCustomOpen, setIsDropdownCustomOpen] = useState(false);

  const reminderOptions = ["Daily", "Weekly", "Custom"];
  const reminderTimeOptions = ["Hours", "Days"];
  const Fdata = [
    { name: "Ignore Holiday" },
    { name: "Next Working Date" },
    { name: "Previous Working Date" },
  ];
  const [dueWorkingDay, setDueWorkingDay] = useState("Next Working Date");

  const [nthValue, setNthValue] = useState({ name: "" });
  const [fileData, setFileData] = useState({ name: "", task_id: "" });
  const [selectBranch, setSelectedBranch] = useState("");

  // Recurring reminder (definition level per Figma)
  const [isRecurringReminderSet, setIsRecurringReminderSet] = useState(false);
  const [recurringBeforeValue, setRecurringBeforeValue] = useState<number>(0);
  const [recurringUnit, setRecurringUnit] = useState<"Days" | "Hours">("Hours");
  const [recurringStartTime, setRecurringStartTime] = useState<string>("12:00");
  const [recurringTimes, setRecurringTimes] = useState<number>(1);

  // Permission checks
  const canCreateOnetime = rolePermissions?.create_onetime_task === 1;
  const canCreateRecurring = rolePermissions?.create_recurring_task === 1;
  const canCreateHelpTicket = rolePermissions?.create_help_ticket === 1;

  // console.log("canCreateOnetime", canCreateOnetime);
  // console.log("canCreateRecurring", canCreateRecurring);
  // console.log("canCreateHelpTicket", canCreateHelpTicket);

  // Determine allowed task types based on permissions
  const allowedTaskTypes = [
    ...(canCreateOnetime ? ["Onetime"] : []),
    ...(canCreateRecurring ? ["Recurring"] : []),
  ];

  // Default task type based on permissions
  const defaultTaskType = allowedTaskTypes[0] || "Onetime";

  // Default is_help_ticket: 0 (Create Tasks) if canCreateOnetime or canCreateRecurring is true, else 1 (Help Ticket)
  const defaultIsHelpTicket = canCreateOnetime || canCreateRecurring ? 0 : 1;

  const { tablerefreshKeys, updateRefreshKey } = useTaskContext();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    getValues,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      task_name: "",
      is_help_ticket: defaultIsHelpTicket,
      assignee: userDetails?.[0]?.email ?? "",
      assigned_to: { email: "" },
      due_date: DateFormat(new Date(new Date().getTime())),
      priority: PRIORITY_DATA[2],
      description: "",
      checker: { email: "" },
      tags: [],
      restrict: 0,
      upload_required: 0,
      is_completed: 0,
      task_type: defaultTaskType as "Onetime" | "Recurring",
      subtask: [],
      attach_file: [],
      checklist: [],
    },
  });
  const {
    fields: checklist,
    append: appendChecklist,
    remove: removeChecklist,
  } = useFieldArray({
    control,
    name: "checklist",
  });

  const {
    fields: subtask,
    append,
    remove,
  } = useFieldArray({
    control,
    name: "subtask",
  });

  const { upload } = useFrappeFileUpload();

  const getDefaultTime = async (
    call: FrappeConfig["call"],
    userEmail: string,
  ): Promise<Date> => {
    try {
      const response = await call.get(
        `clapgrow_app.api.common.utils.org_name?current_user=${userEmail}`,
      );
      let defaultTime = new Date();

      if (response.data?.message?.end_time) {
        const [hours, minutes, seconds] = response.data.message.end_time
          .split(":")
          .map(Number);
        defaultTime.setHours(hours, minutes, seconds, 0);
      } else {
        defaultTime.setHours(defaultTime.getHours() + 3);
        defaultTime.setMinutes(0);
        defaultTime.setSeconds(0, 0);
      }

      if (defaultTime < new Date()) {
        defaultTime.setDate(defaultTime.getDate() + 1);
      }

      return defaultTime;
    } catch (error) {
      console.error("Error fetching default time:", error);
      const fallbackTime = new Date();
      fallbackTime.setHours(fallbackTime.getHours() + 3);
      fallbackTime.setMinutes(0);
      fallbackTime.setSeconds(0, 0);

      if (fallbackTime < new Date()) {
        fallbackTime.setDate(fallbackTime.getDate() + 1);
      }
      return fallbackTime;
    }
  };

  useEffect(() => {
    if (userDetails?.[0]?.email) {
      getDefaultTime(call, userDetails[0].email).then((time) => {
        if (time instanceof Date) {
          setValue("due_date", time);
        }
      });
    }
  }, [userDetails, setValue]);

  const createNewSubtaskDueDate = () => {
    const newDueDate = new Date();
    newDueDate.setHours(newDueDate.getHours() + 3);
    newDueDate.setMinutes(0, 0, 0);
    if (newDueDate < new Date()) {
      newDueDate.setDate(newDueDate.getDate() + 1);
    }
    return newDueDate;
  };

  useEffect(() => {
    if (getValues("task_type") === "Recurring") {
      setValue("priority", PRIORITY_DATA[2]);
    }
  }, [getValues("task_type"), setValue]);

  const { createDoc } = useFrappeCreateDoc<TaskFormData>();
  const { updateDoc } = useFrappeUpdateDoc();

  const handleFilesSelected = async (files: File[], field: "attach_file") => {
    setSelectedFiles(files);
    const uploadPromises = files.map(async (file) => {
      const response = await upload(file, {
        isPrivate: false,
        doctype:
          getValues("task_type") === "Recurring"
            ? "CG Task Definition"
            : "CG Task Instance",
        fieldname: field,
      });
      return { file_url: response.file_url, name: response.name };
    });

    const uploadedFiles = await Promise.all(uploadPromises);
    const FilesData = uploadedFiles.map((file) => ({
      name: file.name,
    }))[0] || { name: "" };

    setFileData((prev) => ({
      ...prev,
      ...FilesData,
    }));
    setValue(field, uploadedFiles);
  };

  const resetCalendar = () => {
    setFrequency({ name: "Weekly" });
    setCustom({ name: "" });
    setWeekDays([]);
    setMonthDay({ name: "" });
    setIntervalWeek({ name: "" });
    setNthValue({ name: "" });
  };

  const UpdateFilesSelected = async (name: any) => {
    const newTask = await updateDoc("File", fileData?.name, {
      attached_to_name: name,
      attached_to_doctype:
        getValues("task_type") === "Recurring"
          ? "CG Task Definition"
          : "CG Task Instance",
    });
  };

  const onSubmit = async (data: TaskFormData) => {
    if (data.task_type === "Recurring") {
      if (
        (frequency?.name === "Weekly" && weekDays.length === 0) ||
        (frequency?.name === "Custom" &&
          custom?.name === "Week" &&
          weekDays.length === 0)
      ) {
        return;
      }
    }
    setIsLoading(true);
    const latestAttachFiles = getValues("attach_file") || [];
    const formattedAttachFiles = JSON.stringify(
      latestAttachFiles.map((file) => ({ file_url: file.file_url })),
    );
    const mappedSubtasks =
      data.subtask?.map((sub) => ({
        subtask_name: sub.task_name,
        due_date: DateFormat(sub.due_date),
        assigned_to: sub?.assigned_to?.email,
        company_id: userDetails?.[0]?.company_id || "",
      })) || "";
    const mappedChecklist =
      data.checklist?.map((item) => ({
        checklist_item: item.checklist_item,
        is_checked: item.is_checked || 0,
      })) || [];

    const formattedWeekDays =
      frequency?.name === "Weekly"
        ? weekDays.join(", ") || ""
        : weekDays.length > 0
          ? weekDays[0]
          : "";
    const dataAll = [
      {
        frequency:
          getValues("task_type") === "Recurring"
            ? data.is_help_ticket
              ? undefined
              : (frequency?.name ?? null)
            : undefined,
        interval: intervalWeek?.name ? parseInt(intervalWeek.name) : 0,
        week_days: formattedWeekDays,
        month_days: monthDay?.name ? parseInt(monthDay.name) : 0,
        nth_week: nthValue?.name ?? null,
      },
    ];

    const reminderPayload =
      isRemainderSet && getValues("task_type") === "Onetime"
        ? {
            reminder_enabled: 1,
            reminder_frequency: "Custom",
            reminder_interval:
              parseInt(reminderCustomTypeValue.toString()) || 0,
            reminder_unit: reminderCustomType,
            ...(reminderCustomType === "Days" && {
              starting_on: isRemainderStartingOn
                ? DateFormat(isRemainderStartingOn)
                : null,
              reminder_total_times: recurringTimes,
            }),
          }
        : {};

    try {
      const newTask = await createDoc(
        getValues("task_type") === "Recurring"
          ? "CG Task Definition"
          : "CG Task Instance",
        {
          task_name: data.task_name,
          is_help_ticket: data.is_help_ticket ? 1 : 0,
          assignee: userDetails?.[0]?.email ?? "",
          assigned_to: data.assigned_to.email || "",
          due_date: DateFormat(data.due_date),
          priority: data.is_help_ticket ? undefined : data.priority.value,
          description: data.description,
          checker: data.checker?.email || "",
          tag: data?.tags?.tag_name || "",
          restrict: data.restrict,
          upload_required: data.upload_required,
          is_completed: data.is_completed,
          task_type: data.task_type,
          has_subtask: mappedSubtasks.length > 0 ? 1 : 0,
          subtask: data.is_help_ticket ? undefined : mappedSubtasks,
          company_id: userDetails?.[0]?.company_id || "",
          checklist: mappedChecklist.length > 0 ? mappedChecklist : undefined,
          attach_file: formattedAttachFiles || null,
          recurrence_type_id:
            getValues("task_type") === "Recurring" ? dataAll || [] : null,
          holiday_behaviour:
            getValues("task_type") === "Recurring"
              ? dueWorkingDay || "Ignore Holiday"
              : null,
          // Recurring reminder payload per Figma
          ...(getValues("task_type") === "Recurring"
            ? {
                reminder_enabled: isRecurringReminderSet ? 1 : 0,
                ...(isRecurringReminderSet && {
                  reminder_before_value: Number(recurringBeforeValue) || 0,
                  reminder_unit: recurringUnit,
                  reminder_start_time:
                    convertTo24HourFormat(recurringStartTime),
                  reminder_times: Number(recurringTimes) || 1,
                }),
              }
            : {}),
          ...reminderPayload,
        },
      );
      if (newTask) {
        setFileData((prev) => ({
          ...prev,
          task_id: newTask.name,
        }));
        if (newTask.name) {
          UpdateFilesSelected(newTask.name);
        }
        setSelectedFiles([]);
        onTaskCreated();
        setIsOpen(false);
        resetCalendar();
        reset();
        if (userDetails?.[0]?.email) {
          const newDefaultTime = new Date(
            new Date().getTime() + 3 * 60 * 60 * 1000,
          );
          if (newDefaultTime instanceof Date) {
            setValue("due_date", newDefaultTime);
          }
        }
        setValue("task_type", defaultTaskType as "Onetime" | "Recurring");
        setValue("is_help_ticket", canCreateHelpTicket ? 0 : 0);
        toast.success("Task created successfully");
        updateRefreshKey();
      }
    } catch (error: any) {
      const serverMessages = error._server_messages
        ? JSON.parse(error._server_messages)
        : null;
      const msgObj = serverMessages ? JSON.parse(serverMessages[0]) : null;
      const exception = error.exception;
      if (exception) {
        const exc = JSON.parse(error.exc);
        if (exc[0].includes("day_index = WEEKDAYS.index(day)"))
          toast.error("Please enter a valid frequency");
        else toast.error(exception);
      } else {
        const errorMessage = msgObj?.message
          ? msgObj.message.replace(/<[^>]*>/g, "")
          : "An error occurred while creating the task";
        toast.error(errorMessage);
        console.error("Error occurred while creating the task:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const watchedDueDate = watch("due_date");
  useEffect(() => {
    if (watchedDueDate) {
      const nowPlus2Hours = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const dueDate = new Date(watchedDueDate);

      const newRemiderDate = dueDate >= nowPlus2Hours ? nowPlus2Hours : dueDate;
      setIsRemainderStartingOn(newRemiderDate);
    }
  }, [watchedDueDate]);

  const [assignedToEmail, setAssignedToEmail] = useState<string | null>(null);

  const { data: userData } = useFrappeGetDocList<CGUser>("CG User", {
    fields: ["*"],
    filters: [["email", "=", assignedToEmail]],
    limit: 1,
  });
  useEffect(() => {
    if (userData && userData.length > 0) {
      const userBranch = userData[0].branch_id;
      setSelectedBranch(userBranch);
    }
  }, [userData]);

  const { data: branchDataList } = useFrappeGetDoc<CGBranch>(
    "CG Branch",
    selectBranch || "",
  );

  const handleDropdownChange = (
    idField: string,
    nameField: string,
    idValue: string,
    nameValue: string,
  ) => {
    setValue(idField as keyof TaskFormData, idValue);
    setValue(nameField as keyof TaskFormData, nameValue);

    if (idField === "assigned_to") {
      setAssignedToEmail(idValue?.email);
    }
  };

  const getReminderOptions = (type: string): (string | number)[] => {
    switch (type) {
      case "Days":
        return Array.from({ length: 31 }, (_, i) => i + 1);
      case "Hours":
        return Array.from({ length: 24 }, (_, i) => i + 1);
      default:
        return [];
    }
  };
  const reminderCustomOptions = getReminderOptions(reminderCustomType);
  const ResetReminderHandle = () => {
    setReminderType("Select");
    setReminderTypeValue("Select");
    setIsRemainderStartingOn(new Date());
    setReminderCustomType("Hours");
  };

  // Disable Add Task button if no permissions are granted
  const hasAnyPermission =
    canCreateOnetime || canCreateRecurring || canCreateHelpTicket;

  return (
    <>
      {isLoading && <Loader message="Submitting your task..." />}
      {hasAnyPermission && (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <button className="bg-[#038EE2] py-[9.5px] px-4 rounded-[8px] hover:bg-[#0265a1] text-white text-[14px]">
              Add Task +
            </button>
          </SheetTrigger>
          <SheetOverlay className="bg-black/10 backdrop-grayscale-0" />
          <SheetContent className="w-full max-w-[100vw] md:min-w-[60vw] lg:min-w-[700px] xl:min-w-[800px] px-[15px] sm:px-[30px] pt-1 [&>button]:mt-3 [&>button]:right-3 sm:[&>button]:right-6 [&>button>svg]:stroke-[5]">
            <div className="relative w-full h-full mt-2">
              <TaskHeader
                register={register}
                watch={watch}
                setValue={setValue}
                errors={errors}
                canCreateHelpTicket={canCreateHelpTicket}
                canCreateTasks={canCreateOnetime || canCreateRecurring} // Pass flag to show toggle button
                remove={() => remove()}
                getValues={getValues}
              />

              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="pt-2 space-y-3 max-h-[85vh] overflow-y-scroll scroll-hidden mt-4">
                  <TaskTypeSelector
                    watch={watch}
                    setValue={setValue}
                    allowedTaskTypes={allowedTaskTypes}
                  />

                  <TaskFormFields
                    register={register}
                    watch={watch}
                    setValue={setValue}
                    control={control}
                    getValues={getValues}
                    errors={errors}
                    defaultEditMode={defaultEditMode}
                    frequency={frequency}
                    setFrequency={setFrequency}
                    custom={custom}
                    setCustom={setCustom}
                    weekDays={weekDays}
                    setWeekDays={setWeekDays}
                    monthDay={monthDay}
                    setMonthDay={setMonthDay}
                    intervalWeek={intervalWeek}
                    setIntervalWeek={setIntervalWeek}
                    nthValue={nthValue}
                    setNthValue={setNthValue}
                    dueWorkingDay={dueWorkingDay}
                    setDueWorkingDay={setDueWorkingDay}
                    handleFilesSelected={handleFilesSelected}
                    selectedFiles={selectedFiles}
                    handleDropdownChange={handleDropdownChange}
                    // Recurring reminder (definition-level)
                    isRecurringReminderSet={isRecurringReminderSet}
                    setIsRecurringReminderSet={setIsRecurringReminderSet}
                    recurringBeforeValue={recurringBeforeValue}
                    setRecurringBeforeValue={setRecurringBeforeValue}
                    recurringUnit={recurringUnit}
                    setRecurringUnit={setRecurringUnit}
                    recurringStartTime={recurringStartTime}
                    setRecurringStartTime={setRecurringStartTime}
                    recurringTimes={recurringTimes}
                    setRecurringTimes={setRecurringTimes}
                    isRemainderSet={isRemainderSet}
                    setIsRemainderSet={setIsRemainderSet}
                    reminderCustomType={reminderCustomType}
                    setReminderCustomType={setReminderCustomType}
                    reminderCustomTypeValue={reminderCustomTypeValue}
                    setReminderTypeValue={setReminderTypeValue}
                  />

                  {/* Recurring Reminder (Definition) per Figma - moved into TaskFormFields below due date */}
                  {false && watch("task_type") === "Recurring" && (
                    <div className="px-3">
                      <div className="flex items-center gap-[6px] text-[12px] mt-3">
                        <input
                          type="checkbox"
                          checked={isRecurringReminderSet}
                          onChange={(e) =>
                            setIsRecurringReminderSet(e.target.checked)
                          }
                        />
                        <p className="text-[#5B5967] text-[12px] font-[600]">
                          Set Reminder
                        </p>
                      </div>
                      {isRecurringReminderSet && (
                        <div className="text-[12px] text-[#5B5967] flex flex-wrap items-center gap-2 bg-[#EFF9FF] rounded-[10px] px-3 py-2 mt-2 w-full max-w-[520px]">
                          <span>Before</span>
                          <input
                            type="number"
                            min={0}
                            value={recurringBeforeValue}
                            onChange={(e) =>
                              setRecurringBeforeValue(
                                parseInt(e.target.value || "0"),
                              )
                            }
                            className="w-14 border rounded px-2 py-1"
                          />
                          <select
                            value={recurringUnit}
                            onChange={(e) =>
                              setRecurringUnit(e.target.value as any)
                            }
                            className="border rounded px-2 py-1"
                          >
                            <option value="Days">Days</option>
                            <option value="Hours">Hours</option>
                          </select>
                          <span>at</span>
                          <input
                            type="time"
                            value={recurringStartTime}
                            onChange={(e) =>
                              setRecurringStartTime(e.target.value)
                            }
                            className="border rounded px-2 py-1"
                          />
                          <span>Remind</span>
                          <input
                            type="number"
                            min={1}
                            value={recurringTimes}
                            onChange={(e) =>
                              setRecurringTimes(parseInt(e.target.value || "1"))
                            }
                            className="w-14 border rounded px-2 py-1"
                          />
                          <span>times</span>
                        </div>
                      )}
                    </div>
                  )}

                  <CheckerManager
                    watch={watch}
                    setValue={setValue}
                    control={control}
                  />

                  <SubtaskManager
                    register={register}
                    watch={watch}
                    control={control}
                    errors={errors}
                    subtask={subtask}
                    append={append}
                    remove={remove}
                    createNewSubtaskDueDate={createNewSubtaskDueDate}
                    frequency={frequency}
                    setFrequency={setFrequency}
                    custom={custom}
                    setCustom={setCustom}
                    weekDays={weekDays}
                    setWeekDays={setWeekDays}
                    monthDay={monthDay}
                    setMonthDay={setMonthDay}
                    intervalWeek={intervalWeek}
                    setIntervalWeek={setIntervalWeek}
                    nthValue={nthValue}
                    setNthValue={setNthValue}
                  />

                  <ChecklistManager
                    register={register}
                    watch={watch}
                    control={control}
                    errors={errors}
                    checklist={checklist}
                    append={appendChecklist}
                    remove={removeChecklist}
                  />

                  <TaskOptions watch={watch} control={control} />

                  {/* 
									<ReminderSettings
										watch={watch}
										getValues={getValues}
										isRemainderSet={isRemainderSet}
										setIsRemainderSet={setIsRemainderSet}
										reminderType={reminderType}
										setReminderType={setReminderType}
										reminderCustomType={reminderCustomType}
										setReminderCustomType={setReminderCustomType}
										reminderCustomTypeValue={reminderCustomTypeValue}
										setReminderTypeValue={setReminderTypeValue}
										isRemainderStartingOn={isRemainderStartingOn}
										setIsRemainderStartingOn={setIsRemainderStartingOn}
										isDropdownOpen={isDropdownOpen}
										setIsDropdownOpen={setIsDropdownOpen}
										isDropdownCustomTypeOpen={isDropdownCustomTypeOpen}
										setIsDropdownCustomTypeOpen={setIsDropdownCustomTypeOpen}
										isDropdownCustomOpen={isDropdownCustomOpen}
										setIsDropdownCustomOpen={setIsDropdownCustomOpen}
										reminderOptions={reminderOptions}
										reminderTimeOptions={reminderTimeOptions}
										reminderCustomOptions={reminderCustomOptions}
										ResetReminderHandle={ResetReminderHandle}
										frequency={frequency}
										setFrequency={setFrequency}
										custom={custom}
										setCustom={setCustom}
										weekDays={weekDays}
										setWeekDays={setWeekDays}
										monthDay={monthDay}
										setMonthDay={setMonthDay}
										intervalWeek={intervalWeek}
										setIntervalWeek={setIntervalWeek}
										nthValue={nthValue}
										setNthValue={setNthValue}
									/>
									*/}
                </div>

                <TaskSubmitFooter watch={watch} isLoading={isLoading} />
              </form>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}

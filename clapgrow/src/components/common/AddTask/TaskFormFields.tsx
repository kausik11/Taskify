import React, { useState, useEffect } from "react";
import {
  UseFormRegister,
  UseFormWatch,
  UseFormSetValue,
  Control,
  UseFormGetValues,
  FieldErrors,
  Controller,
} from "react-hook-form";
import { ChevronDown } from "lucide-react";
import CombinedDropDown from "@/components/dashboard/CombinedDropDown";
import { Input } from "@/components/ui/input";
import CustomCalender from "../CustomCalender";
import FormDropdown from "../FormDropdown";
import MultiFileUpload from "../MultiFileUpload";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { TaskFields } from "../commonColumns";
import { EditModeOfTask, TaskFormData } from "../CommonTypes";

// Add this constant locally since it was defined in the original component
const Fdata = [
  { name: "Ignore Holiday" },
  { name: "Next Working Date" },
  { name: "Previous Working Date" },
];

interface TaskFormFieldsProps {
  register: UseFormRegister<TaskFormData>;
  watch: UseFormWatch<TaskFormData>;
  setValue: UseFormSetValue<TaskFormData>;
  control: Control<TaskFormData>;
  getValues: UseFormGetValues<TaskFormData>;
  errors: FieldErrors<TaskFormData>;
  defaultEditMode: EditModeOfTask;
  frequency: { name: string };
  setFrequency: React.Dispatch<React.SetStateAction<{ name: string }>>;
  custom: { name: string };
  setCustom: React.Dispatch<React.SetStateAction<{ name: string }>>;
  weekDays: string[];
  setWeekDays: React.Dispatch<React.SetStateAction<string[]>>;
  monthDay: { name: string };
  setMonthDay: React.Dispatch<React.SetStateAction<{ name: string }>>;
  intervalWeek: { name: string };
  setIntervalWeek: React.Dispatch<React.SetStateAction<{ name: string }>>;
  nthValue: { name: string };
  setNthValue: React.Dispatch<React.SetStateAction<{ name: string }>>;
  dueWorkingDay: string;
  setDueWorkingDay: React.Dispatch<React.SetStateAction<string>>;
  handleFilesSelected: (files: File[], field: "attach_file") => Promise<void>;
  selectedFiles: File[];
  handleDropdownChange: (
    idField: string,
    nameField: string,
    idValue: string,
    nameValue: string,
  ) => void;
  // Recurring reminder props
  isRecurringReminderSet: boolean;
  setIsRecurringReminderSet: React.Dispatch<React.SetStateAction<boolean>>;
  recurringBeforeValue: number;
  setRecurringBeforeValue: React.Dispatch<React.SetStateAction<number>>;
  recurringUnit: "Days" | "Hours";
  setRecurringUnit: React.Dispatch<React.SetStateAction<"Days" | "Hours">>;
  recurringStartTime: string;
  setRecurringStartTime: React.Dispatch<React.SetStateAction<string>>;
  recurringTimes: number;
  setRecurringTimes: React.Dispatch<React.SetStateAction<number>>;
  // Reminder props
  isRemainderSet: boolean;
  setIsRemainderSet: React.Dispatch<React.SetStateAction<boolean>>;
  reminderCustomType: string;
  setReminderCustomType: React.Dispatch<React.SetStateAction<string>>;
  reminderCustomTypeValue: string | number;
  setReminderTypeValue: React.Dispatch<React.SetStateAction<string | number>>;
}

const TaskFormFields: React.FC<TaskFormFieldsProps> = ({
  register,
  watch,
  setValue,
  control,
  getValues,
  errors,
  defaultEditMode,
  frequency,
  setFrequency,
  custom,
  setCustom,
  weekDays,
  setWeekDays,
  monthDay,
  setMonthDay,
  intervalWeek,
  setIntervalWeek,
  nthValue,
  setNthValue,
  dueWorkingDay,
  setDueWorkingDay,
  handleFilesSelected,
  selectedFiles,
  handleDropdownChange,
  // Recurring reminder props
  isRecurringReminderSet,
  setIsRecurringReminderSet,
  recurringBeforeValue,
  setRecurringBeforeValue,
  recurringUnit,
  setRecurringUnit,
  recurringStartTime,
  setRecurringStartTime,
  recurringTimes,
  setRecurringTimes,
  // Reminder props
  isRemainderSet,
  setIsRemainderSet,
  reminderCustomType,
  setReminderCustomType,
  reminderCustomTypeValue,
  setReminderTypeValue,
}) => {
  // Local state for input fields to allow temporary empty values
  const [beforeValueInput, setBeforeValueInput] = useState<string>(
    String(recurringBeforeValue),
  );
  const [timesInput, setTimesInput] = useState<string>(String(recurringTimes));

  // Sync local state when parent state changes
  useEffect(() => {
    setBeforeValueInput(String(recurringBeforeValue));
  }, [recurringBeforeValue]);

  useEffect(() => {
    setTimesInput(String(recurringTimes));
  }, [recurringTimes]);
  return (
    <div className="grid divide-y-2 divide-[#F0F1F2] pb-[40px]">
      {TaskFields.filter(
        ({ condition }) =>
          !condition ||
          (condition(watch("task_type"), !!watch("is_help_ticket")) &&
            !(
              watch("is_help_ticket") === 1 &&
              watch("priority") &&
              watch("checker")
            )),
      ).map(
        (
          {
            label,
            name,
            type,
            required,
            idField,
            nameField,
            datatype,
            fieldType,
            width,
            disabled,
          },
          index,
        ) => {
          if (name === "tags") {
            return (
              <FormDropdown
                key={`${name}-${index}`}
                label={label}
                required={required}
                helpTicketType={watch("is_help_ticket")}
                disabled={disabled}
                editMode={defaultEditMode}
                setEditMode={() => {}}
                fieldKey={name}
                taskupdate={null}
              >
                <Controller
                  name="tags"
                  control={control}
                  render={({ field }) => (
                    <CombinedDropDown
                      value={field.value?.[0] || null}
                      handleSelect={(selectedTag) => {
                        field.onChange(selectedTag ? [selectedTag] : []);
                      }}
                      placeholder={`Select ${label}`}
                      DataType={datatype}
                      className="border-none p-0"
                    />
                  )}
                />
                {errors.tags && (
                  <p className="text-red-500 text-xs">{errors.tags.message}</p>
                )}
              </FormDropdown>
            );
          }

          // Add rich text editor for description field
          if (name === "description") {
            return (
              <FormDropdown
                key={`${name}-${index}`}
                label={label}
                required={required}
                helpTicketType={watch("is_help_ticket")}
                disabled={disabled}
                editMode={defaultEditMode}
                setEditMode={() => {}}
              >
                <div className="ml-3">
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <div
                        style={{
                          borderRadius: "8px",
                          border: "1px solid #D0D3D9",
                          width: "100%",
                          maxWidth: "min(90vw, 700px)",
                          minWidth: "250px",
                        }}
                      >
                        <ReactQuill
                          theme="snow"
                          value={field.value || ""}
                          onChange={field.onChange}
                          modules={{
                            toolbar: [
                              [{ header: [1, 2, false] }],
                              ["bold", "italic", "underline", "strike"],
                              [{ list: "ordered" }, { list: "bullet" }],
                              ["link"],
                              ["clean"],
                            ],
                          }}
                          placeholder="Write description here"
                          className="min-h-[150px] [&_.ql-container]:h-32 [&_.ql-container]:border-0 [&_.ql-toolbar]:border-0 [&_.ql-toolbar_button:focus-visible]:outline-none [&_.ql-editor:focus-visible]:outline-none"
                        />
                      </div>
                    )}
                  />
                  {errors.description && (
                    <p className="text-red-500 text-xs">
                      {errors.description.message}
                    </p>
                  )}
                  <MultiFileUpload
                    onFilesSelected={handleFilesSelected}
                    selectedFiles={selectedFiles}
                  />
                </div>
              </FormDropdown>
            );
          }

          return (
            <FormDropdown
              key={`${name}-${index}`}
              label={label}
              required={required}
              helpTicketType={watch("is_help_ticket")}
              disabled={disabled}
              editMode={defaultEditMode}
              setEditMode={() => {}}
            >
              {fieldType === "text" && (
                <div>
                  <Input
                    type={type}
                    className="w-[300px]"
                    {...register(name as keyof TaskFormData)}
                  />
                  {errors[name as keyof typeof errors] && (
                    <p className="text-red-500 text-xs">
                      {errors[name as keyof typeof errors]?.message}
                    </p>
                  )}
                </div>
              )}
              {fieldType === "dropdown" && nameField && (
                <div>
                  <Controller
                    control={control}
                    {...register(nameField as keyof TaskFormData)}
                    render={({ field }) => (
                      <CombinedDropDown
                        value={field.value}
                        handleSelect={(value) =>
                          handleDropdownChange(idField, nameField, value, value)
                        }
                        placeholder={`Select ${label}`}
                        DataType={datatype}
                        className={"border-none p-0"}
                      />
                    )}
                  />
                  {errors[nameField as keyof typeof errors] &&
                    (!watch("assigned_to") ||
                      !watch("assigned_to")?.email?.trim()) && (
                      <p className="text-red-500 text-xs">
                        {errors[nameField as keyof typeof errors]?.message}
                      </p>
                    )}
                </div>
              )}
              {fieldType === "date" && (
                <div>
                  <Controller
                    name="due_date"
                    control={control}
                    render={({ field }) => (
                      <CustomCalender
                        date={new Date(field.value)}
                        onChange={field.onChange}
                        containerClassName="md:w-[20vw] border-none text-[#0076BD] p-0 bg-transparent"
                        text="Select Date and Time"
                        Style="absolute -left-[90px] top-[-60px]"
                        TaskType={getValues("task_type")}
                        frequency={frequency}
                        setFrequency={setFrequency}
                        custom={custom}
                        setCustom={setCustom}
                        weekDays={weekDays}
                        setWeekDays={setWeekDays}
                        monthDay={monthDay}
                        setMonthDay={setMonthDay}
                        recurrenceInterval={intervalWeek}
                        setRecurrenceInterval={setIntervalWeek}
                        nthValue={nthValue}
                        setNthValue={setNthValue}
                        employeeId={watch("assigned_to")?.email}
                      />
                    )}
                  />
                  {getValues("task_type") === "Recurring" && (
                    <div className="flex items-center gap-x-2 pl-3">
                      <p className="font-[400] text-[12px] text-[#5B5967]">
                        If holidays fall on the due dates, mark it done on
                      </p>
                      <div className="relative flex items-center justify-start gap-1 text-[12px] text-[#0076BD] bg-[#EFF9FF] font-[400] rounded-[10px]">
                        <ChevronDown className="w-[15px] h-[15px] pointer-events-none absolute right-2 top-1/2 transform -translate-y-1/2" />
                        <select
                          value={dueWorkingDay}
                          onChange={(e) => setDueWorkingDay(e.target.value)}
                          className="appearance-none bg-transparent text-[#0076BD] font-[400] text-[12px] pl-2 pr-6 py-1 outline-none"
                        >
                          {Fdata?.map((trend) => (
                            <option key={trend.name} value={trend.name}>
                              {trend.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Recurring Reminder - below due date per Figma */}
                  {getValues("task_type") === "Recurring" && (
                    <div className="pl-3 mt-3">
                      <div className="flex items-center gap-[6px] text-[12px]">
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
                          <span>Remind</span>
                          <input
                            type="number"
                            min={0}
                            value={beforeValueInput}
                            onChange={(e) => {
                              const value = e.target.value;
                              setBeforeValueInput(value);

                              // Only update parent state with valid numbers
                              if (value !== "") {
                                const parsed = parseInt(value);
                                if (!isNaN(parsed) && parsed >= 0) {
                                  setRecurringBeforeValue(parsed);
                                }
                              }
                            }}
                            onBlur={(e) => {
                              const value = e.target.value;
                              if (
                                value === "" ||
                                isNaN(parseInt(value)) ||
                                parseInt(value) < 0
                              ) {
                                setRecurringBeforeValue(0);
                                setBeforeValueInput("0");
                              }
                            }}
                            className="w-14 border rounded px-2 py-1"
                          />
                          <select
                            value={recurringUnit}
                            onChange={(e) =>
                              setRecurringUnit(
                                e.target.value as "Days" | "Hours",
                              )
                            }
                            className="border rounded px-2 py-1"
                          >
                            <option value="Hours">Hours</option>
                            <option value="Days">Days</option>
                          </select>
                          <span>before due date</span>
                          {recurringUnit === "Days" && (
                            <>
                              <span>starting at</span>
                              <input
                                type="time"
                                value={recurringStartTime}
                                onChange={(e) =>
                                  setRecurringStartTime(e.target.value)
                                }
                                className="border rounded px-2 py-1"
                              />
                              <span>and repeat</span>
                              <input
                                type="number"
                                min={1}
                                value={timesInput}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setTimesInput(value);

                                  // Only update parent state with valid numbers
                                  if (value !== "") {
                                    const parsed = parseInt(value);
                                    if (!isNaN(parsed) && parsed >= 1) {
                                      setRecurringTimes(parsed);
                                    }
                                  }
                                }}
                                onBlur={(e) => {
                                  const value = e.target.value;
                                  if (
                                    value === "" ||
                                    isNaN(parseInt(value)) ||
                                    parseInt(value) < 1
                                  ) {
                                    setRecurringTimes(1);
                                    setTimesInput("1");
                                  }
                                }}
                                className="w-14 border rounded px-2 py-1"
                              />
                              <span>times</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reminder Settings - Only for Onetime tasks */}
                  {getValues("task_type") !== "Recurring" && (
                    <div className="pl-3 mt-3">
                      <div className="flex items-center gap-[6px] text-[12px]">
                        <input
                          type="checkbox"
                          checked={isRemainderSet}
                          onChange={(e) => setIsRemainderSet(e.target.checked)}
                        />
                        <p className="text-[#5B5967] text-[12px] font-[600]">
                          Set Reminder
                        </p>
                      </div>
                      {isRemainderSet && (
                        <div className="text-[12px] text-[#5B5967] flex flex-wrap items-center gap-2 bg-[#EFF9FF] rounded-[10px] px-3 py-2 mt-2 w-full max-w-[520px]">
                          <span>Remind</span>
                          <input
                            type="number"
                            min={0}
                            value={reminderCustomTypeValue}
                            onChange={(e) => {
                              const value = e.target.value;
                              setReminderTypeValue(value);
                            }}
                            className="w-14 border rounded px-2 py-1"
                          />
                          <select
                            value={reminderCustomType}
                            onChange={(e) =>
                              setReminderCustomType(e.target.value)
                            }
                            className="border rounded px-2 py-1"
                          >
                            <option value="Hours">Hours</option>
                            <option value="Days">Days</option>
                          </select>
                          <span>before due date</span>
                          {reminderCustomType === "Days" && (
                            <>
                              <span>starting at</span>
                              <input
                                type="time"
                                value={recurringStartTime}
                                onChange={(e) =>
                                  setRecurringStartTime(e.target.value)
                                }
                                className="border rounded px-2 py-1"
                              />
                              <span>and repeat</span>
                              <input
                                type="number"
                                min={1}
                                value={recurringTimes}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  const parsed = parseInt(value);
                                  if (!isNaN(parsed) && parsed >= 1) {
                                    setRecurringTimes(parsed);
                                  }
                                }}
                                className="w-14 border rounded px-2 py-1"
                              />
                              <span>times</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {errors.due_date && (
                    <p className="text-red-500 text-xs">
                      {errors.due_date.message}
                    </p>
                  )}
                  {getValues("task_type") === "Recurring" &&
                    ((frequency?.name === "Weekly" && weekDays.length === 0) ||
                      (frequency?.name !== "Daily" && !frequency?.name)) && (
                      <p className="text-red-500 text-xs pl-3">
                        Frequency is a required field
                      </p>
                    )}
                </div>
              )}
            </FormDropdown>
          );
        },
      )}
    </div>
  );
};

export default TaskFormFields;

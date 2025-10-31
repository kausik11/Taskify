import React from "react";
import {
  UseFormRegister,
  UseFormWatch,
  Control,
  FieldErrors,
  Controller,
  FieldArrayWithId,
  UseFieldArrayReturn,
} from "react-hook-form";
import { Trash2 } from "lucide-react";
import CombinedDropDown from "@/components/dashboard/CombinedDropDown";
import CustomCalender from "../CustomCalender";
import { TaskFormData } from "../CommonTypes";

interface SubtaskManagerProps {
  register: UseFormRegister<TaskFormData>;
  watch: UseFormWatch<TaskFormData>;
  control: Control<TaskFormData>;
  errors: FieldErrors<TaskFormData>;
  subtask: FieldArrayWithId<TaskFormData, "subtask", "id">[];
  append: UseFieldArrayReturn<TaskFormData, "subtask", "id">["append"];
  remove: UseFieldArrayReturn<TaskFormData, "subtask", "id">["remove"];
  createNewSubtaskDueDate: () => Date;
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
}

const SubtaskManager: React.FC<SubtaskManagerProps> = ({
  register,
  watch,
  control,
  errors,
  subtask,
  append,
  remove,
  createNewSubtaskDueDate,
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
}) => {
  if (watch("is_help_ticket")) return null;

  return (
    <div className="w-full flex flex-col gap-3 pb-4 relative">
      {subtask.length > 0 ? (
        <div className="flex flex-col sm:flex-row bg-[#F1F5FA] rounded-lg px-3 py-2 pt-4">
          <p className="w-full sm:w-[160px] text-sm font-semibold text-[#5B5967] self-start pt-2">
            Subtask
          </p>

          <div className="flex flex-col w-full gap-3 pl-16">
            {subtask.map((sub, index) => (
              <div
                key={sub.id}
                className="flex flex-col sm:grid sm:grid-cols-12 sm:gap-5 gap-3 w-full items-start justify-center"
              >
                {/* Task Name */}
                <div className="sm:col-span-5 flex flex-col w-full">
                  <input
                    {...register(`subtask.${index}.task_name`)}
                    className="focus:outline-none px-2 py-1 w-full text-sm border border-[#D0D3D9] rounded-md"
                    placeholder="Subtask name"
                  />
                  {errors.subtask?.[index]?.task_name && (
                    <p className="text-red-500 text-xs mt-1 truncate">
                      {errors.subtask[index]?.task_name?.message}
                    </p>
                  )}
                </div>

                {/* Assigned To */}
                <div className="sm:col-span-1 flex justify-start items-start -mt-2 -ml-2">
                  <Controller
                    name={`subtask.${index}.assigned_to`}
                    control={control}
                    render={({ field }) => (
                      <CombinedDropDown
                        value={field.value}
                        handleSelect={field.onChange}
                        DataType="isEmployeeData"
                        isSubtaskData
                        hasError={!!errors.subtask?.[index]?.assigned_to?.email}
                        className="!w-auto !px-2 flex items-center gap-1 rounded-full"
                      />
                    )}
                  />
                </div>

                {/* Due Date */}
                <div className="sm:col-span-5 flex flex-col w-full mt-1">
                  <Controller
                    name={`subtask.${index}.due_date`}
                    control={control}
                    render={({ field }) => (
                      <CustomCalender
                        date={field.value}
                        onChange={field.onChange}
                        containerClassName="w-full rounded-md text-sm"
                        text="Due Date"
                        employeeId={watch(`subtask.${index}.assigned_to`)?.email}
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
                      />
                    )}
                  />
                  {errors.subtask?.[index]?.due_date && (
                    <p className="text-red-500 text-xs mt-1 truncate">
                      {errors.subtask[index]?.due_date?.message}
                    </p>
                  )}
                </div>

                {/* Delete Button */}
                <div className="sm:col-span-1 flex justify-left items-left cursor-pointer mt-2 sm:mt-0 pt-1">
                  <div
                    className="border border-[#5B5967] rounded-full p-1 hover:bg-gray-200 transition"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="w-3 h-3 text-[#5B5967]" />
                  </div>
                </div>
              </div>
            ))}

            {/* Add Subtask */}
            <div
              className="text-[#0076BD] font-medium text-sm cursor-pointer text-left"
              onClick={() =>
                append({
                  task_name: "",
                  assigned_to: { email: "" },
                  due_date: createNewSubtaskDueDate(),
                })
              }
            >
              + Add Subtask
            </div>
          </div>
        </div>
      ) : (
        <div
          className="bg-[#F1F5FA] text-[#0076BD] rounded-lg px-2 py-2 text-sm font-semibold cursor-pointer w-full text-left"
          onClick={() =>
            append({
              task_name: "",
              assigned_to: { email: "" },
              due_date: createNewSubtaskDueDate(),
            })
          }
        >
          + Add Subtask
        </div>
      )}
    </div>
  );
};

export default SubtaskManager;

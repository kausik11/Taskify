import React from "react";
import { UseFormWatch, UseFormGetValues } from "react-hook-form";
import { Clock3, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import CustomCalender from "../CustomCalender";
import { TaskFormData } from "../CommonTypes";

interface ReminderSettingsProps {
  watch: UseFormWatch<TaskFormData>;
  getValues: UseFormGetValues<TaskFormData>;
  isRemainderSet: boolean;
  setIsRemainderSet: React.Dispatch<React.SetStateAction<boolean>>;
  reminderType: string;
  setReminderType: React.Dispatch<React.SetStateAction<string>>;
  reminderCustomType: string;
  setReminderCustomType: React.Dispatch<React.SetStateAction<string>>;
  reminderCustomTypeValue: string | number;
  setReminderTypeValue: React.Dispatch<React.SetStateAction<string | number>>;
  isRemainderStartingOn: Date | undefined;
  setIsRemainderStartingOn: React.Dispatch<
    React.SetStateAction<Date | undefined>
  >;
  isDropdownOpen: boolean;
  setIsDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isDropdownCustomTypeOpen: boolean;
  setIsDropdownCustomTypeOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isDropdownCustomOpen: boolean;
  setIsDropdownCustomOpen: React.Dispatch<React.SetStateAction<boolean>>;
  reminderOptions: string[];
  reminderTimeOptions: string[];
  reminderCustomOptions: (string | number)[];
  ResetReminderHandle: () => void;
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

const ReminderSettings: React.FC<ReminderSettingsProps> = ({
  watch,
  getValues,
  isRemainderSet,
  setIsRemainderSet,
  reminderType,
  setReminderType,
  reminderCustomType,
  setReminderCustomType,
  reminderCustomTypeValue,
  setReminderTypeValue,
  isRemainderStartingOn,
  setIsRemainderStartingOn,
  isDropdownOpen,
  setIsDropdownOpen,
  isDropdownCustomTypeOpen,
  setIsDropdownCustomTypeOpen,
  isDropdownCustomOpen,
  setIsDropdownCustomOpen,
  reminderOptions,
  reminderTimeOptions,
  reminderCustomOptions,
  ResetReminderHandle,
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
  if (getValues("task_type") === "Recurring") {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-[6px] text-[12px] max-md: mt-2 ml-3">
        <Checkbox
          checked={isRemainderSet}
          onCheckedChange={setIsRemainderSet}
        />
        <p className="text-[#5B5967] text-[12px] font-[600]">Set Reminder</p>
      </div>
      {isRemainderSet && (
        <div className="mt-2 max-w-[500px]">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Clock3 size={16} className="text-gray-600" />
              <span className="text-gray-600 text-sm font-medium">
                Set Reminder for this Task
              </span>
            </div>
            <button
              onClick={() => ResetReminderHandle()}
              className="text-sm text-blue-500 font-medium hover:underline"
              type="button"
            >
              Reset Reminder
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-gray-600">Remind me</span>

            <div className="relative">
              <button
                className="border rounded-md px-3 py-1 bg-white shadow-sm flex items-center gap-2 text-gray-700"
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                {reminderType}
                <ChevronDown size={16} />
              </button>
              {isDropdownOpen && (
                <div className="absolute z-10 mt-1 bg-white border rounded-md shadow-lg w-full">
                  {reminderOptions.map((option) => (
                    <div
                      key={option}
                      onClick={() => {
                        setReminderType(option);
                        setIsDropdownOpen(false);
                      }}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-700"
                    >
                      {option}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {reminderType !== "Custom" && (
              <>
                <span className="text-gray-600">Starting at</span>

                <div className="flex items-center gap-1 border px-3 py-1 rounded-md text-gray-700 bg-white shadow-sm">
                  <CustomCalender
                    date={isRemainderStartingOn}
                    onChange={(value) => {
                      setIsRemainderStartingOn(value);
                    }}
                    containerClassName=" border-none text-[#0076BD] p-0 bg-transparent"
                    text="Select Date and Time"
                    Style="absolute -right-[0px] top-[-60px]"
                    TaskType=""
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
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {reminderType === "Custom" && (
        <div className="border rounded-lg p-4 bg-[#DFE8F3] shadow-sm w-full max-w-[500px] mt-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-gray-600">Remind me every</span>

            <div className="relative">
              <button
                className="border rounded-md px-3 py-1 bg-white shadow-sm flex items-center gap-2 text-gray-700"
                onClick={() => setIsDropdownCustomOpen(!isDropdownCustomOpen)}
              >
                {reminderCustomType}
                <ChevronDown size={16} />
              </button>
              {isDropdownCustomOpen && (
                <div className="absolute z-10 mt-1 bg-white border rounded-md shadow-lg w-full">
                  {reminderTimeOptions.map((option) => (
                    <div
                      key={option}
                      onClick={() => {
                        setReminderCustomType(option);
                        setIsDropdownCustomOpen(false);
                      }}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-700"
                    >
                      {option}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                className="border rounded-md px-3 py-1 bg-white shadow-sm flex items-center gap-2 text-gray-700"
                onClick={() =>
                  setIsDropdownCustomTypeOpen(!isDropdownCustomTypeOpen)
                }
              >
                {reminderCustomTypeValue}
                <ChevronDown size={16} />
              </button>

              {isDropdownCustomTypeOpen && (
                <div className="absolute z-10 mt-1 bg-white border rounded-md shadow-lg w-full max-h-60 overflow-y-auto scroll-hidden">
                  {reminderCustomOptions.map((option) => (
                    <div
                      key={option}
                      onClick={() => {
                        setReminderTypeValue(option);
                        setIsDropdownCustomTypeOpen(false);
                      }}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-700"
                    >
                      {option}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <span className="text-gray-600">Starting at</span>

            <div className="flex items-center gap-1 border px-3 py-1 rounded-md text-gray-700 bg-white shadow-sm">
              <CustomCalender
                date={isRemainderStartingOn}
                onChange={(value) => {
                  setIsRemainderStartingOn(value);
                }}
                containerClassName=" border-none text-[#0076BD] p-0 bg-transparent"
                text="Select Date and Time"
                Style={"absolute -left-[90px] top-[-60px]"}
                TaskType={""}
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
            </div>

            <span className="text-gray-600">Until</span>

            <span className="font-semibold text-gray-800">
              {isRemainderStartingOn
                ? format(isRemainderStartingOn, "dd MMMM, hh:mm a")
                : ""}
            </span>
          </div>
        </div>
      )}
    </>
  );
};

export default ReminderSettings;

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
import { TaskFormData } from "../CommonTypes";

interface ChecklistManagerProps {
  register: UseFormRegister<TaskFormData>;
  watch: UseFormWatch<TaskFormData>;
  control: Control<TaskFormData>;
  errors: FieldErrors<TaskFormData>;
  checklist: FieldArrayWithId<TaskFormData, "checklist", "id">[];
  append: UseFieldArrayReturn<TaskFormData, "checklist", "id">["append"];
  remove: UseFieldArrayReturn<TaskFormData, "checklist", "id">["remove"];
}

const ChecklistManager: React.FC<ChecklistManagerProps> = ({
  register,
  watch,
  control,
  errors,
  checklist,
  append,
  remove,
}) => {
  // Don't show checklist for help tickets
  if (watch("is_help_ticket")) return null;

  return (
    <div className="w-full flex flex-col gap-3 pb-4">
      {checklist.length > 0 ? (
        <div className="flex flex-col sm:flex-row bg-[#F1F5FA] rounded-lg p-4">
          <p className="w-full sm:w-[160px] text-sm font-semibold text-[#5B5967] pt-2">
            Checklist
          </p>

          <div className="flex flex-col w-full gap-3 pl-14">
            {checklist.map((item, index) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:gap-5 gap-3 w-full items-start"
              >
                {/* Checklist Item Input */}
                <div className="flex-1 flex flex-col w-full">
                  <input
                    {...register(`checklist.${index}.checklist_item`)}
                    className="focus:outline-none px-2 py-1 w-full text-sm border border-[#D0D3D9] rounded-md"
                    placeholder="Enter checklist item"
                  />
                  {errors.checklist?.[index]?.checklist_item && (
                    <p className="text-red-500 text-xs mt-1 truncate">
                      {errors.checklist[index]?.checklist_item?.message}
                    </p>
                  )}
                </div>

                {/* Delete Button */}
                <div className="flex justify-center items-center cursor-pointer mt-2 pt-1 sm:mt-0">
                  <div
                    className="border border-[#5B5967] rounded-full p-1 hover:bg-gray-200 transition"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="w-3 h-3 text-[#5B5967]" />
                  </div>
                </div>
              </div>
            ))}

            {/* Add Checklist Item */}
            <div
              className="text-[#0076BD] font-medium text-sm cursor-pointer text-left"
              onClick={() =>
                append({
                  checklist_item: "",
                  is_checked: 0,
                })
              }
            >
              + Add Checklist Item
            </div>
          </div>
        </div>
      ) : (
        <div
          className="bg-[#F1F5FA] text-[#0076BD] rounded-lg px-2 py-2 text-sm font-semibold cursor-pointer w-full text-left"
          onClick={() =>
            append({
              checklist_item: "",
              is_checked: 0,
            })
          }
        >
          + Add Checklist
        </div>
      )}
    </div>
  );
};

export default ChecklistManager;
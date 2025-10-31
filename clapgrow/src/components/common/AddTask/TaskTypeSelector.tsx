import React from "react";
import { UseFormWatch, UseFormSetValue } from "react-hook-form";
import { cn } from "@/lib/utils";
import { TaskFormData } from "../CommonTypes";

interface TaskTypeSelectorProps {
  watch: UseFormWatch<TaskFormData>;
  setValue: UseFormSetValue<TaskFormData>;
  allowedTaskTypes: string[];
}

const TaskTypeSelector: React.FC<TaskTypeSelectorProps> = ({
  watch,
  setValue,
  allowedTaskTypes,
}) => {
  if (watch("is_help_ticket") || allowedTaskTypes.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center rounded-[8px] text-[14px]">
      {allowedTaskTypes.map((type, index) => (
        <p
          key={type}
          onClick={() => setValue("task_type", type)}
          className={cn(
            "py-[5px] px-[6px] text-[12px] font-[400] cursor-pointer border",
            watch("task_type") === type
              ? "bg-[#038EE2] border-[#038EE2] text-white"
              : "bg-white border-[#D0D3D9]",
            index === 0 ? "rounded-l-[8px]" : "",
            index === allowedTaskTypes.length - 1 ? "rounded-r-[8px]" : "",
          )}
        >
          {type}
        </p>
      ))}
    </div>
  );
};

export default TaskTypeSelector;
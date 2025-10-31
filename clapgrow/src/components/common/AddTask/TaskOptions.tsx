import React from "react";
import { UseFormWatch, Control, Controller } from "react-hook-form";
import { TaskFormData } from "../CommonTypes";
import { Checkbox } from "@/components/ui/checkbox";


interface TaskOptionsProps {
  watch: UseFormWatch<TaskFormData>;
  control: Control<TaskFormData>;
}

const TaskOptions: React.FC<TaskOptionsProps> = ({
  watch,
  control,
}) => {
  if (watch("is_help_ticket")) {
    return null;
  }

  return (
    <div className="w-full mt-4 pb-10">
      <div className="flex items-center gap-[6px] text-[12px]">
        <Controller
          name="restrict"
          control={control}
          render={({ field }) => (
            <Checkbox
              checked={field.value === 1}
              onCheckedChange={(checked) => {
                field.onChange(checked ? 1 : 0);
              }}
            />
          )}
        />
        <p className="text-[#5B5967] text-[12px] font-[600]">
          Restrict user to mark as done after or before due date?
        </p>
      </div>
      <div className="flex items-center gap-[6px] text-[12px] mt-2">
        <Controller
          name="upload_required"
          control={control}
          render={({ field }) => (
            <Checkbox
              checked={field.value === 1}
              onCheckedChange={(checked) => {
                field.onChange(checked ? 1 : 0);
              }}
            />
          )}
        />
        <p className="text-[#5B5967] text-[12px] font-[600]">
          File upload is mandatory during mark as done?
        </p>
      </div>
    </div>
  );
};

export default TaskOptions;
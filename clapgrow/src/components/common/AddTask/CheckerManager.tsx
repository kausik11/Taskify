import React from "react";
import { UseFormWatch, UseFormSetValue, Control, Controller } from "react-hook-form";
import { Trash2 } from "lucide-react";
import CombinedDropDown from "@/components/dashboard/CombinedDropDown";
import { TaskFormData } from "../CommonTypes";

interface CheckerManagerProps {
  watch: UseFormWatch<TaskFormData>;
  setValue: UseFormSetValue<TaskFormData>;
  control: Control<TaskFormData>;
}

const CheckerManager: React.FC<CheckerManagerProps> = ({
  watch,
  setValue,
  control,
}) => {
  if (watch("is_help_ticket")) {
    return null;
  }

  return (
    <div className="w-full py-3 flex flex-col gap-y-2">
      {watch("checker")?.email ? (
        <div className="flex items-center justify-start bg-[#E0E0E0] rounded-[8px] px-[8px] py-[3px] relative">
          <p className="w-[160px] text-[14px] font-[600] text-[#A0A0A0]">
            Checker
          </p>
          <Controller
            name="checker"
            control={control}
            render={({ field }) => (
              <CombinedDropDown
                value={field.value}
                handleSelect={(value) => field.onChange(value)}
                placeholder="Add Member"
                DataType="isEmployeeData"
                className="border-none p-0 bg-transparent text-[#A0A0A0]"
              />
            )}
          />
          <div
            className="border-[1px] border-[#A0A0A0] rounded-fullImgs rounded-full p-1 absolute top-0 right-0 cursor-pointer"
            onClick={() => setValue("checker", { email: "" })}
          >
            <Trash2 color="#A0A0A0" className="w-[10px] h-[10px]" />
          </div>
        </div>
      ) : (
        <div
          className="bg-[#E0E0E0] text-[#A0A0A0] rounded-[8px] px-[8px] py-[8.5px] text-[14px] font-[600] cursor-pointer"
          onClick={() => setValue("checker", { email: "" })}
        >
          + Add Checker
        </div>
      )}
    </div>
  );
};

export default CheckerManager;
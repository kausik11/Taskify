import React from "react";
import { UseFormWatch } from "react-hook-form";
import { TaskFormData } from "../CommonTypes";

interface TaskSubmitFooterProps {
  watch: UseFormWatch<TaskFormData>;
  isLoading: boolean;
}

const TaskSubmitFooter: React.FC<TaskSubmitFooterProps> = ({
  watch,
  isLoading,
}) => {
  return (
    <div className="border-t-[2px] h-[50px] bg-white border-[#F0F1F2] flex justify-end items-center absolute left-0 right-0 bottom-0 w-full px-[30px]">
      <button
        className="bg-[#038EE2] px-4 py-2 w-fit rounded-[8px] text-white font-[600] text-[14px]"
        type="submit"
        disabled={isLoading}
      >
        {isLoading
          ? "Submitting..."
          : !watch("is_help_ticket")
            ? "Add"
            : "Submit"}
      </button>
    </div>
  );
};

export default TaskSubmitFooter;
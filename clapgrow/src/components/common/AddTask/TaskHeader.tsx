import React from "react";
import { UseFormRegister, UseFormWatch, UseFormSetValue, FieldErrors } from "react-hook-form";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { SheetTitle, SheetDescription } from "@/components/ui/sheet";
import helpIcon from "@/assets/icons/help-icon-blue.svg";
import taskIcon from "@/assets/icons/task-icon-blue.svg";
import { TaskFormData } from "../CommonTypes";

interface TaskHeaderProps {
  register: UseFormRegister<TaskFormData>;
  watch: UseFormWatch<TaskFormData>;
  setValue: UseFormSetValue<TaskFormData>;
  errors: FieldErrors<TaskFormData>;
  canCreateHelpTicket: boolean;
  canCreateTasks: boolean;
  remove: () => void;
  getValues: (name?: keyof TaskFormData) => any;
}

const TaskHeader: React.FC<TaskHeaderProps> = ({
  register,
  watch,
  setValue,
  errors,
  canCreateHelpTicket,
  canCreateTasks,
  remove,
  getValues,
}) => {
  return (
    <div className="flex items-center justify-between pr-[20px]">
      <div className="flex-1">
        <input
          type="text"
          className="task-input text-[22px] w-full"
          id="taskInput"
          {...register("task_name")}
          placeholder={
            watch("is_help_ticket")
              ? "Write the help ticket required here"
              : "Write Task Name Here"
          }
        />
       
        {errors.task_name && (
          <p className="text-red-500 text-xs ">
            {errors.task_name.message}
          </p>
        )}
        {watch("is_help_ticket") ? (
         <button className="flex items-center mt-1 bg-[#038EE2] text-[white] px-2 py-1 rounded-full p-5">
          <img src={helpIcon} alt="help icon" className="inline w-[15px] h-[15px] ml-1 filter invert brightness-0" />
          <span className="text-[13px] text-[white] ml-1 text-[600] font-semibold">Help Ticket</span>
        </button>
        ):""}
      </div>
      <VisuallyHidden>
        <SheetTitle>Add Task</SheetTitle>
        <SheetDescription>
          Create a new Task here. Click save when you're done.
        </SheetDescription>
      </VisuallyHidden>
      {canCreateTasks && canCreateHelpTicket && (
        <button
          className="flex items-center gap-x-2 border-[1px] border-[#038EE2] rounded-full md:rounded-[38px] p-2 md:px-[10px] md:py-[6px] text-[#038EE2] text-[12px] font-[600]"
          onClick={() => {
            const current = getValues("is_help_ticket");
            setValue("is_help_ticket", current ? 0 : 1);
            if (!current) remove();
          }}
        >
          <img
            src={watch("is_help_ticket") ? taskIcon : helpIcon}
            alt="action icon"
            className="fill-[#038EE2] w-[15px] h-[15px]"
          />
          <span className="hidden md:block">
            {watch("is_help_ticket") ? "Create Tasks" : "Help Ticket"}
          </span>
        </button>
      )}
    </div>
  );
};

export default TaskHeader;
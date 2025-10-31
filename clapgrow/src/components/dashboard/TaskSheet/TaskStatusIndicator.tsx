import React from "react";
import { X, Pause } from "lucide-react";

interface TaskStatusIndicatorProps {
  taskupdate: any;
  reopencmnt: string;
  isProcessTask: boolean;
}

const TaskStatusIndicator: React.FC<TaskStatusIndicatorProps> = ({
  taskupdate,
  reopencmnt,
  isProcessTask,
}) => {
  // Show reopen comment for non-Process tasks
  if (!isProcessTask && reopencmnt && taskupdate?.status !== "Rejected") {
    return (
      <div className="mx-w-648 mx-h-33 -mb-5 bg-[#F0E7BB] flex rounded-[8px]">
        <p className="font-[400] text-[14px] pt-2 pr-3 pb-2 pl-3 text-[#2D2C37]">
          {reopencmnt || ""}
        </p>
      </div>
    );
  }

  // Show status indicators for specific statuses
  if (taskupdate?.status === "Rejected") {
    return (
      <div className="flex items-center gap-2 bg-[#F8D7DA] text-[#721C24] px-3 py-2 rounded-md text-[14px] font-[500] border border-[#F5C6CB]">
        <X className="w-4 h-4" />
        Task Rejected
      </div>
    );
  }

  if (taskupdate?.status === "Paused") {
    return (
      <div className="flex items-center gap-2 bg-[#FFF3CD] text-[#856404] px-3 py-2 rounded-md text-[14px] font-[500] border border-[#FFEAA7]">
        <Pause className="w-4 h-4" />
        Task Paused (Can Complete Directly)
      </div>
    );
  }

  return null;
};

export default TaskStatusIndicator;
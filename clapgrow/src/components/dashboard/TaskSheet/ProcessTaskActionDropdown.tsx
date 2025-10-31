import React from "react";
import { ChevronDown, X, Pause, Play } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProcessTaskActionDropdownProps {
  taskupdate: any;
  handleStatusUpdate: (status: string) => void;
}

const ProcessTaskActionDropdown: React.FC<ProcessTaskActionDropdownProps> = ({
  taskupdate,
  handleStatusUpdate,
}) => {
  const isRejected = taskupdate?.status === "Rejected";
  const isPaused = taskupdate?.status === "Paused";
  const isCompleted =
    taskupdate?.is_completed === 1 || taskupdate?.status === "Completed";

  if (isCompleted) return null;

  // If task is rejected, show Rejected button (non-interactive)
  if (isRejected) {
    return (
      <button
        className="flex items-center gap-2 bg-[#F8D7DA] text-[#721C24] px-3 py-2 rounded-md text-[14px] font-[500] border border-[#F5C6CB] cursor-not-allowed"
        disabled
      >
        <X className="w-4 h-4" />
        Rejected
      </button>
    );
  }

  // If task is paused, show Resume and Reject options
  if (isPaused) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 bg-[#FFF3CD] text-[#856404] px-3 py-2 rounded-md text-[14px] font-[500] border border-[#FFEAA7] hover:bg-[#FFF8DC] transition-colors">
            <Pause className="w-4 h-4" />
            Paused
            <ChevronDown className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={() => handleStatusUpdate("Due Today")}
            className="flex items-center gap-2 cursor-pointer text-green-600 hover:text-green-800 hover:bg-green-50 focus:bg-green-50"
          >
            <Play className="w-4 h-4" />
            Resume Task
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleStatusUpdate("Rejected")}
            className="flex items-center gap-2 text-[#DC3545] hover:bg-red-50 focus:bg-red-50 cursor-pointer"
          >
            <X className="w-4 h-4" />
            Mark as Rejected
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Default Actions dropdown for active tasks
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 bg-[#F8F9FA] text-[#6C757D] px-3 py-2  mt-4 rounded-md text-[14px] font-[500] border border-[#DEE2E6] hover:bg-[#E9ECEF] transition-colors">
          Actions
          <ChevronDown className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => handleStatusUpdate("Rejected")}
          className="flex items-center gap-2 text-[#DC3545] hover:bg-red-50 focus:bg-red-50 cursor-pointer"
        >
          <X className="w-4 h-4" />
          Mark as Rejected
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleStatusUpdate("Paused")}
          className="flex items-center gap-2 text-[#FFC107] hover:bg-yellow-50 focus:bg-yellow-50 cursor-pointer"
        >
          <Pause className="w-4 h-4" />
          Pause Task
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProcessTaskActionDropdown;
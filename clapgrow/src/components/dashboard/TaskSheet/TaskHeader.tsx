import React, { useCallback } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { EditToggle } from "@/components/layout/AlertBanner/CommonDesign";

interface TaskHeaderProps {
  taskupdate: any;
  editMode: any;
  setEditMode: any;
  handleSelect: any;
  isHovered: boolean;
  setIsHovered: React.Dispatch<React.SetStateAction<boolean>> | ((value: boolean) => void);
  canEditTask: any;
  setShowHistoryPage: any;
  isProcessTask: boolean;
  taskMappings: any[];
  totalWorkflowSteps: number;
  roleBaseName: string;
  currentUser: string;
}

const TaskHeader: React.FC<TaskHeaderProps> = ({
  taskupdate,
  editMode,
  setEditMode,
  handleSelect,
  isHovered,
  setIsHovered,
  canEditTask,
  setShowHistoryPage,
  isProcessTask,
  taskMappings,
  totalWorkflowSteps,
  roleBaseName,
  currentUser,
}) => {
  // Memoize event handlers to prevent stale closures
  const handleMouseEnter = useCallback(() => {
    if (typeof setIsHovered === 'function') {
      setIsHovered(true);
    }
  }, [setIsHovered]);

  const handleMouseLeave = useCallback(() => {
    if (typeof setIsHovered === 'function') {
      setIsHovered(false);
    }
  }, [setIsHovered]);

  return (
    <div
      className={`py-3 flex flex-col md:flex-row md:items-center max-md:gap-y-3 justify-between w-full space-x-4 ${
        editMode.task_name && " px-3 rounded-[8px] bg-[#F1F5FA]"
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <SheetHeader className="space-y-0 w-full">
        {editMode?.task_name ? (
          <textarea
            className="task-input text-[22px] resize-none p-4 rounded-md "
            id="taskInput"
            name="task_name"
            value={taskupdate?.task_name || ""}
            onChange={(e) => handleSelect("task_name", e.target.value)}
            placeholder={
              taskupdate?.is_help_ticket
                ? "Write the help ticket required here"
                : "Write task name here"
            }
            disabled={!canEditTask()}
          />
        ) : (
          <SheetTitle> 
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3 flex-row">
                <span className="flex-grow">
                  {isProcessTask
                    ? taskMappings?.[0]?.workflow || taskupdate?.task_name
                    : taskupdate?.task_name}
                </span>
                {isProcessTask && totalWorkflowSteps > 0 && (
                  <Badge className="bg-[#f8f9fa] text-gray-700 border-[#6f6f70] hover:text-white hover:bg-gray-500 py-1">
                    {totalWorkflowSteps} steps
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowHistoryPage(true)}
                  className="sm:block border border-1 border-[#0076BE] text-[#0076BE] px-3 py-2 rounded-full text-xs flex items-center justify-center"
                >
                  Show History
                </button>
              </div>
            </div>
          </SheetTitle>
        )}
        <SheetDescription className="text-[#5B5967] text-[12px] flex items-center justify-between">
          Task created on{" "}
          {taskupdate?.creation
            ? format(new Date(taskupdate.creation), "d MMMM yy, hh:mm a")
            : "No due date available"}
        </SheetDescription>
      </SheetHeader>
      <div className="w-[24px] h-[24px] flex items-center justify-center">
        {canEditTask("task_name") &&
          !taskupdate?.is_completed &&
          isHovered &&
          taskupdate?.task_type &&
          !taskupdate?.is_help_ticket && (
            <EditToggle
              fieldKey="task_name"
              toggleEditMode={setEditMode}
              editMode={editMode}
              roleBaseName={roleBaseName}
              editflag={taskupdate?.assignee == currentUser}
            />
          )}
      </div>
    </div>
  );
};

export default TaskHeader;
import React from "react";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import FormDropdown from "@/components/common/FormDropdown";
import { Input } from "@/components/ui/input";
import CustomCalender from "@/components/common/CustomCalender";
import CombinedDropDown from "../CombinedDropDown";
import UserAssignees from "../UserAssignees";
import { useUserDetailsByEmails } from "@/components/common/CommonFunction";
import { useFrappeGetDoc } from "frappe-react-sdk";
import { CGTaskInstance } from "@/types/ClapgrowApp/CGTaskInstance";

interface Subtask {
  status: string;
  subtask_id: string | null;
  task_name: string;
  subtask_name: string;
  due_date: string;
  assigned_to:
    | {
        user_image?: string;
        first_name: string;
        full_name: string;
        last_name: string;
        email: string;
      }
    | string;
}

interface SubtasksSectionProps {
  editMode: any;
  setEditMode: any;
  subtask: Subtask[];
  setSubtask: any;
  taskupdate: any;
  userEmail: string;
  isTaskEditable: (fieldName?: string) => boolean;
  onSubtaskClick?: (subtaskId: string) => void;
  roleBaseName?: string;
  currentUser?: string;
}

// Edit mode subtask item component to handle hooks properly
const EditSubtaskItem: React.FC<{
  sub: any;
  index: number;
  updateSubtask: (index: number, field: string, value: any) => void;
  handleRemoveSubtask: (index: number) => void;
  getAssignedToEmail: (sub: any) => string;
  getAssignedToValue: (sub: any) => any;
  getSubtaskName: (sub: any) => string;
}> = ({
  sub,
  index,
  updateSubtask,
  handleRemoveSubtask,
  getAssignedToEmail,
  getAssignedToValue,
  getSubtaskName,
}) => {
  // Now the hook is called at the component level, not in a loop
  const assignedEmail = getAssignedToEmail(sub);
  const { data: editUsersData } = useUserDetailsByEmails(assignedEmail);

  return (
    <div className="flex items-start gap-4 w-full">
      {/* Subtask Content - Takes up available space */}
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-3 p-3 max-w-[500px] rounded-lg border border-gray-200">
        {/* Task Name */}
        <div className="lg:col-span-4 flex flex-col w-full">
          <Input
            value={getSubtaskName(sub)}
            onChange={(e) =>
              updateSubtask(index, "subtask_name", e.target.value)
            }
            className="focus:outline-none px-2 py-1 w-full text-sm border border-[#D0D3D9] rounded-md"
            placeholder="Enter subtask name"
          />
        </div>

        {/* Assigned To - Avatar only with tooltip */}
        <div className="lg:col-span-2 w-full -mt-1">
          <CombinedDropDown
            value={getAssignedToValue(sub)}
            handleSelect={(value: any) =>
              updateSubtask(index, "assigned_to", value)
            }
            DataType="isEmployeeData"
            isSubtaskData={true}
            className="w-full rounded-md"
          />
        </div>

        {/* Due Date */}
        <div className="lg:col-span-4 flex flex-col w-full mt-1">
          <CustomCalender
            date={sub.due_date ? new Date(sub.due_date) : undefined}
            onChange={(value) => updateSubtask(index, "due_date", value)}
            containerClassName="w-full rounded-md text-sm border border-[#D0D3D9]"
            text="Select date"
          />
        </div>
      </div>

      {/* Delete Button - Fixed position on the right with gap */}
      <div className="flex-shrink-0 flex items-start pt-3">
        <button
          className="border border-[#5B5967] rounded-full p-1.5 hover:bg-gray-200 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-300"
          onClick={() => handleRemoveSubtask(index)}
          aria-label="Remove subtask"
        >
          <Trash2 className="w-4 h-4 text-[#5B5967]" />
        </button>
      </div>
    </div>
  );
};

// Individual Subtask Item Component to handle data fetching for view mode
const SubtaskItem: React.FC<{
  item: any;
  index: number;
  onSubtaskClick?: (subtaskId: string) => void;
}> = ({ item, index, onSubtaskClick }) => {
  // Get assigned_to email consistently
  const assignedToEmail =
    typeof item.assigned_to === "string"
      ? item.assigned_to
      : item.assigned_to?.email || "";

  // Fetch user details for the assigned user - same pattern as TaskTable
  const { data: usersData } = useUserDetailsByEmails(assignedToEmail);

  // Fetch subtask instance data to get current status
  const { data: subtaskInstanceData } = useFrappeGetDoc<CGTaskInstance>(
    "CG Task Instance",
    item.subtask_id || "",
    item.subtask_id ? undefined : null,
  );

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "Completed":
        return {
          label: "Completed",
          textColor: "text-[#0CA866]",
          bgColor: "bg-[#EEFDF1]",
        };
      case "Overdue":
        return {
          label: "Overdue",
          textColor: "text-[#A72C2C]",
          bgColor: "bg-[#FFF4F4]",
        };
      case "Due Today":
        return {
          label: "Due Today",
          textColor: "text-[#BC8908]",
          bgColor: "bg-[#FCF8E4]",
        };
      case "Upcoming":
        return {
          label: "Upcoming",
          textColor: "text-[#494EC8]",
          bgColor: "bg-[#F3F3FE]",
        };
      case "Paused":
        return {
          label: "Paused",
          textColor: "text-[#856404]",
          bgColor: "bg-[#FFF3CD]",
        };
      case "Rejected":
        return {
          label: "Rejected",
          textColor: "text-[#721C24]",
          bgColor: "bg-[#F8D7DA]",
        };
      default:
        return null;
    }
  };

  // Use the actual status from the subtask instance, fallback to item status
  const currentStatus = subtaskInstanceData?.status || item.status;
  const statusStyles = getStatusStyles(currentStatus);

  const handleSubtaskClick = () => {
    if (item.subtask_id && onSubtaskClick) {
      onSubtaskClick(item.subtask_id);
    }
  };

  return (
    <div
      key={index}
      className={`pb-5 transition-colors  ${
        item.subtask_id ? " cursor-pointer" : ""
      }`}
      onClick={handleSubtaskClick}
      title={item.subtask_id ? "Click to view subtask details" : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {statusStyles && (
            <span
              className={`inline-block rounded-full px-3 py-1 font-[500] text-[12px] ${statusStyles.textColor} ${statusStyles.bgColor}`}
            >
              {statusStyles.label}
            </span>
          )}
          <h4
            className={`text-[14px] px-1 font-[600] text-[#2D2C37] ${
              item.subtask_id ? "hover:text-[#0076BE]" : ""
            }`}
          >
            {item.subtask_name}
          </h4>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center space-x-2">
          {!assignedToEmail ? (
            <span className="text-[12px] text-[#6B7280]">Unassigned</span>
          ) : (
            <div className="flex items-center space-x-2">
              <UserAssignees users={usersData || []} className="h-6 w-6" />
            </div>
          )}
        </div>

        <div className="text-[12px] font-[400] text-[#5B5967] tracking-0">
          {item.due_date
            ? format(new Date(item.due_date), "dd MMM, hh:mm a")
            : "No Due Date"}
        </div>
      </div>
    </div>
  );
};

const SubtasksSection: React.FC<SubtasksSectionProps> = ({
  editMode,
  setEditMode,
  subtask,
  setSubtask,
  taskupdate,
  userEmail,
  isTaskEditable,
  onSubtaskClick,
  roleBaseName,
}) => {
  const canEditSubtasks = () => {
    if (!isTaskEditable()) return false;

    const isAdmin = roleBaseName === "ROLE-Admin";
    const isAssignee = userEmail === taskupdate?.assignee;

    return isAdmin || isAssignee;
  };

  const handleAddSubtask = () => {
    const newSubtask = {
      task_name: "",
      subtask_name: "",
      assigned_to: "",
      due_date: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
      status: "Upcoming",
      subtask_id: null,
      company_id: taskupdate?.company_id || "",
      has_subtask: 1,
    };

    const updatedSubtasks = [...subtask, newSubtask];
    setSubtask(updatedSubtasks);

    if (!taskupdate?.has_subtask) {
      if (typeof taskupdate?.setTaskUpdate === "function") {
        taskupdate.setTaskUpdate((prev: any) => ({
          ...prev,
          has_subtask: 1,
          subtask: updatedSubtasks,
        }));
      }
    }
  };

  const handleRemoveSubtask = (index: number) => {
    const newSubtasks = subtask.filter((_, idx) => idx !== index);
    setSubtask(newSubtasks);

    if (newSubtasks.length === 0 && taskupdate?.has_subtask) {
      if (typeof taskupdate?.setTaskUpdate === "function") {
        taskupdate.setTaskUpdate((prev: any) => ({
          ...prev,
          has_subtask: 0,
          subtask: newSubtasks,
        }));
      }
    }
  };

  const updateSubtask = (index: number, field: string, value: any) => {
    const newSubtasks = [...subtask];

    if (field === "due_date") {
      // Handle date formatting
      if (value instanceof Date) {
        newSubtasks[index][field] = format(value, "yyyy-MM-dd HH:mm:ss");
      } else {
        newSubtasks[index][field] = value;
      }
    } else if (field === "assigned_to") {
      // Handle assigned_to - store just the email string
      if (typeof value === "object" && value?.email) {
        newSubtasks[index][field] = value.email;
      } else {
        newSubtasks[index][field] = value || "";
      }
    } else if (field === "subtask_name") {
      // Update both subtask_name and task_name to maintain consistency
      newSubtasks[index]["subtask_name"] = value;
      newSubtasks[index]["task_name"] = value;
    } else {
      newSubtasks[index][field] = value;
    }

    // Ensure company_id is always set
    if (!newSubtasks[index].company_id && taskupdate?.company_id) {
      newSubtasks[index].company_id = taskupdate.company_id;
    }

    setSubtask(newSubtasks);
  };

  // Helper functions remain the same
  const getAssignedToEmail = (sub: any) => {
    if (typeof sub.assigned_to === "string") {
      return sub.assigned_to;
    }
    return sub.assigned_to?.email || "";
  };

  const getAssignedToValue = (sub: any) => {
    const email = getAssignedToEmail(sub);
    if (!email) return null;

    if (typeof sub.assigned_to === "object" && sub.assigned_to?.full_name) {
      return sub.assigned_to;
    }

    return { email, full_name: email };
  };

  const getSubtaskName = (sub: any) => {
    return sub.subtask_name || sub.task_name || "";
  };

  if (taskupdate?.is_help_ticket || taskupdate?.parent_task_id) {
    return null;
  }

  return (
    <FormDropdown
      label="Subtask"
      fieldKey="subTasks"
      editMode={editMode}
      setEditMode={setEditMode}
      is_help_ticket={taskupdate?.is_help_ticket}
      canEdit={canEditSubtasks()}
    >
      {editMode?.subTasks ? (
        <div className="w-full flex flex-col gap-3 pb-2 bg-[#F1F5FA] rounded-lg py-1 pt-4 max-w-[500px]">
          <div className="flex flex-col w-full gap-3 px-3">
            <div className="pl-2">
              {subtask.map((sub: any, ind: number) => (
                <EditSubtaskItem
                  key={`subtask-${ind}`}
                  sub={sub}
                  index={ind}
                  updateSubtask={updateSubtask}
                  handleRemoveSubtask={handleRemoveSubtask}
                  getAssignedToEmail={getAssignedToEmail}
                  getAssignedToValue={getAssignedToValue}
                  getSubtaskName={getSubtaskName}
                />
              ))}
            </div>
            <button
              className="text-[#0076BD] font-medium text-sm cursor-pointer hover:text-[#0056B3] transition-colors p-2 border border-dashed border-[#0076BD] rounded-lg hover:bg-blue-50 w-fit"
              onClick={handleAddSubtask}
              type="button"
            >
              + Add New Subtask
            </button>
          </div>
        </div>
      ) : (
        // View mode
        <div className="ml-1">
          {taskupdate?.subtask && taskupdate.subtask.length > 0 ? (
            <div className="space-y-1">
              {taskupdate.subtask.map((item: any, ind: number) => (
                <SubtaskItem
                  key={ind}
                  item={item}
                  index={ind}
                  onSubtaskClick={onSubtaskClick}
                />
              ))}
              {canEditSubtasks() && !taskupdate?.is_completed && (
                <button
                  className="text-[#0076BD] text-sm hover:text-[#0056B3] transition-colors"
                  onClick={() =>
                    setEditMode((prev: any) => ({ ...prev, subTasks: true }))
                  }
                >
                  + Add Subtaskss
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between py-0">
              <span className="text-gray-500 text-sm">No subtasks</span>
              {/* {canEditSubtasks() && !taskupdate?.is_completed && (
                <button
                  className="text-[#0076BD] text-sm hover:text-[#0056B3] transition-colors"
                  onClick={() => setEditMode((prev: any) => ({ ...prev, subTasks: true }))}
                >
                  + Add Subtasks
                </button>
              )} */}
            </div>
          )}
        </div>
      )}
    </FormDropdown>
  );
};

export default SubtasksSection;

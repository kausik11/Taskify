import React, { useContext, useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  Edit2,
  Calendar,
  ChevronDown,
  Check,
  X,
  CircleCheck,
  Ban,
  Play,
  Pause,
  Clock,
  AlertCircle,
  History,
  Settings,
  Plus,
} from "lucide-react";
import {
  useFrappeGetDoc,
  useFrappeUpdateDoc,
  useFrappeGetDocList,
  useFrappePostCall,
  FrappeContext,
  FrappeConfig,
} from "frappe-react-sdk";
import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import { UserContext } from "@/utils/auth/UserProvider";
import UserAssignees from "../dashboard/UserAssignees";
import { useUserDetailsByEmails } from "../common/CommonFunction";
import { Loader } from "@/layouts/Loader";
import { Badge } from "../ui/badge";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { PRIORITY_DATA } from "@/data/common";
import CustomCalender from "../common/CustomCalender";
import CombinedDropDown from "../dashboard/CombinedDropDown";
import { format } from "date-fns";
import { toast } from "sonner";
import { useFrappeData } from "@/utils/frappeapi/FrappeApiProvider";
import { PriorityDisplay } from "../common/PriorityDisplay";

interface TaskDefinitionSheetProps {
  taskDefinitionId: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  ontaskDefUpdated?: () => void;
}

interface CGTaskDefinition {
  name: string;
  task_name: string;
  description?: string;
  due_date?: string;
  assignee?: string;
  assigned_to?: string;
  priority?: string;
  tag?: string;
  task_type?: string;
  status?: string;
  checker?: string;
  holiday_behaviour?: string;
  recurrence_type_id?: any[];
  creation?: string;
  enabled?: number;
  company_id?: string;
  branch?: string;
  department?: string;
  is_paused?: number;
  pause_start_date?: string;
  pause_end_date?: string;
  pause_reason?: string;
  paused_by?: string;
  can_resume_manually?: number;
}

interface EditState {
  [key: string]: boolean;
}

interface PauseHistoryItem {
  name: string;
  action_type: string;
  pause_start_date?: string;
  pause_end_date?: string;
  reason?: string;
  performed_by: string;
  performed_by_name?: string;
  performed_on: string;
  instances_deleted: number;
  instances_created: number;
}

const TaskDefinitionSheet: React.FC<TaskDefinitionSheetProps> = ({
  taskDefinitionId,
  isOpen,
  setIsOpen,
  ontaskDefUpdated,
}) => {
  const { updateDoc } = useFrappeUpdateDoc();
  const { call: frappeCall } = useContext(FrappeContext) as FrappeConfig;
  const { userDetails } = useContext(UserContext);
  const { employeeData, rawTagData } = useFrappeData();

  // Individual field edit states
  const [editStates, setEditStates] = useState<EditState>({});
  const [isLoading, setIsLoading] = useState(false);

  // Pause functionality states
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [showManualGenerateDialog, setShowManualGenerateDialog] =
    useState(false);
  const [pauseStartDate, setPauseStartDate] = useState<Date | null>(null);
  const [pauseEndDate, setPauseEndDate] = useState<Date | null>(null);
  const [pauseReason, setPauseReason] = useState("");
  const [pauseHistory, setPauseHistory] = useState<PauseHistoryItem[]>([]);
  const [pauseStatus, setPauseStatus] = useState<any>(null);

  // History view state
  const [showHistoryPage, setShowHistoryPage] = useState(false);

  // Manual generation states
  const [generateStartDate, setGenerateStartDate] = useState<Date | null>(null);
  const [generateEndDate, setGenerateEndDate] = useState<Date | null>(null);

  // Fetch task definition data
  const {
    data: taskDefinition,
    mutate: mutateTaskDefinition,
    isLoading: isFetching,
  } = useFrappeGetDoc<CGTaskDefinition>(
    "CG Task Definition",
    taskDefinitionId,
    taskDefinitionId ? undefined : null,
  );

  const [taskDefUpdate, setTaskDefUpdate] = useState<CGTaskDefinition>({
    name: "",
    task_name: "",
    description: "",
    due_date: "",
    assignee: "",
    assigned_to: "",
    priority: "Low",
    tag: "",
    task_type: "Recurring",
    status: "",
    checker: "",
    holiday_behaviour: "Ignore Holiday",
    recurrence_type_id: [],
    creation: "",
    enabled: 1,
    is_paused: 0,
    can_resume_manually: 1,
  });

  // Calendar and frequency states
  const [selectedDueDate, setSelectedDueDate] = useState<Date | null>(null);
  const [frequency, setFrequency] = useState<{ name: string }>({
    name: "Weekly",
  });
  const [custom, setCustom] = useState<{ name: string }>({ name: "" });
  const [weekDays, setWeekDays] = useState<string[]>([]);
  const [monthDay, setMonthDay] = useState<{ name: string }>({ name: "" });
  const [intervalWeek, setIntervalWeek] = useState<{ name: string }>({
    name: "",
  });
  const [nthValue, setNthValue] = useState<{ name: string }>({ name: "" });
  const [dueWorkingDay, setDueWorkingDay] = useState<string>("Ignore Holiday");
  const [previousRecurrence, setPreviousRecurrence] = useState<any>(null);

  // Check if any field is being edited
  const isEditing = Object.values(editStates).some((state) => state === true);

  // Fetch pause status and history when task definition loads
  useEffect(() => {
    if (taskDefinitionId && taskDefinition) {
      fetchPauseStatus();
      fetchPauseHistory();
    }
  }, [taskDefinitionId, taskDefinition]);

  // Fetch pause status
  const fetchPauseStatus = async () => {
    try {
      const result = await frappeCall.post(
        "clapgrow_app.api.task_pause_management.get_task_pause_status",
        {
          task_definition_id: taskDefinitionId,
        },
      );
      setPauseStatus(result.message || result);
    } catch (error) {
      console.error("Error fetching pause status:", error);
    }
  };

  // Fetch pause history
  const fetchPauseHistory = async () => {
    try {
      const result = await frappeCall.post(
        "clapgrow_app.api.task_pause_management.get_task_pause_history",
        {
          task_definition_id: taskDefinitionId,
        },
      );
      setPauseHistory(result.message || result || []);
    } catch (error) {
      console.error("Error fetching pause history:", error);
      setPauseHistory([]);
    }
  };

  // Update local state when data is fetched
  useEffect(() => {
    if (taskDefinition) {
      setTaskDefUpdate(taskDefinition);

      // Set up calendar and frequency states
      if (taskDefinition.due_date) {
        setSelectedDueDate(new Date(taskDefinition.due_date));
      }

      if (taskDefinition.recurrence_type_id?.length > 0) {
        const recurrenceData = taskDefinition.recurrence_type_id[0];
        setPreviousRecurrence(recurrenceData);
        setFrequency({ name: recurrenceData.frequency || "Weekly" });
        setWeekDays(
          recurrenceData.week_days
            ? recurrenceData.week_days.split(", ").filter(Boolean)
            : [],
        );
        setMonthDay({ name: recurrenceData.month_days?.toString() || "" });
        setIntervalWeek({ name: recurrenceData.interval?.toString() || "" });
        setNthValue({ name: recurrenceData.nth_week || "" });
      }

      if (taskDefinition.holiday_behaviour) {
        setDueWorkingDay(taskDefinition.holiday_behaviour);
      }
    }
  }, [taskDefinition]);

  // Get user details for assignee and assigned_to
  const { data: assigneeData } = useUserDetailsByEmails(
    taskDefUpdate?.assignee || "",
  );
  const { data: assignedToData } = useUserDetailsByEmails(
    taskDefUpdate?.assigned_to || "",
  );
  const { data: checkerData } = useUserDetailsByEmails(
    taskDefUpdate?.checker || "",
  );

  // Helper functions to find full objects for dropdowns
  const getAssignedToUser = () => {
    return (
      employeeData?.find((emp) => emp.email === taskDefUpdate.assigned_to) ||
      assignedToData?.[0] ||
      null
    );
  };

  const getPriorityObject = () => {
    return PRIORITY_DATA.find((p) => p.name === taskDefUpdate.priority) || null;
  };

  const getTagObject = () => {
    return (
      rawTagData?.find((tag) => tag.tag_name === taskDefUpdate.tag) || null
    );
  };

  // Handle field updates
  const handleSelect = (field: string, value: any) => {
    setTaskDefUpdate((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle date change
  const handleDateChange = (value: Date) => {
    setSelectedDueDate(value);
    handleSelect("due_date", format(value, "yyyy-MM-dd HH:mm:ss"));
  };

  // Handle edit mode toggle for specific field
  const handleEditToggle = (fieldName: string) => {
    setEditStates((prev) => ({
      ...prev,
      [fieldName]: !prev[fieldName],
    }));
  };

  // Check if recurrence has changed
  const hasRecurrenceChanged = () => {
    if (!previousRecurrence) return false;
    return (
      frequency.name !== previousRecurrence.frequency ||
      parseInt(intervalWeek.name || "0") !== previousRecurrence.interval ||
      weekDays.join(", ") !== previousRecurrence.week_days ||
      parseInt(monthDay.name || "0") !== previousRecurrence.month_days ||
      nthValue.name !== previousRecurrence.nth_week
    );
  };

  // Pause task functionality
  const handlePauseTask = async () => {
    if (!pauseStartDate) {
      toast.error("Please select a pause start date");
      return;
    }

    setIsLoading(true);
    try {
      const result = await frappeCall.post(
        "clapgrow_app.api.task_pause_management.pause_recurring_task",
        {
          task_definition_id: taskDefinitionId,
          pause_start_date: format(pauseStartDate, "yyyy-MM-dd HH:mm:ss"),
          pause_end_date: pauseEndDate
            ? format(pauseEndDate, "yyyy-MM-dd HH:mm:ss")
            : null,
          reason: pauseReason || null,
        },
      );

      if (result.message?.success || result?.success) {
        toast.success("Task paused successfully");
        setShowPauseDialog(false);
        setPauseStartDate(null);
        setPauseEndDate(null);
        setPauseReason("");
        mutateTaskDefinition();
        fetchPauseStatus();
        fetchPauseHistory();
        if (ontaskDefUpdated) ontaskDefUpdated();
      } else {
        toast.error(
          result.message?.message || result?.message || "Failed to pause task",
        );
      }
    } catch (error: any) {
      console.error("Error pausing task:", error);
      toast.error(error?.message || "Failed to pause task");
    } finally {
      setIsLoading(false);
    }
  };

  // Resume task functionality
  const handleResumeTask = async (generateMissedInstances = true) => {
    setIsLoading(true);
    try {
      const result = await frappeCall.post(
        "clapgrow_app.api.task_pause_management.resume_recurring_task",
        {
          task_definition_id: taskDefinitionId,
          generate_missed_instances: generateMissedInstances,
        },
      );

      if (result.message?.success || result?.success) {
        toast.success("Task resumed successfully");
        setShowResumeDialog(false);
        mutateTaskDefinition();
        fetchPauseStatus();
        fetchPauseHistory();
        if (ontaskDefUpdated) ontaskDefUpdated();
      } else {
        toast.error(
          result.message?.message || result?.message || "Failed to resume task",
        );
      }
    } catch (error: any) {
      console.error("Error resuming task:", error);
      toast.error(error?.message || "Failed to resume task");
    } finally {
      setIsLoading(false);
    }
  };

  // Manual generate instances functionality
  const handleManualGenerate = async () => {
    if (!generateStartDate) {
      toast.error("Please select a start date for manual generation");
      return;
    }

    setIsLoading(true);
    try {
      const result = await frappeCall.post(
        "clapgrow_app.api.task_pause_management.manually_generate_task_instances",
        {
          task_definition_id: taskDefinitionId,
          start_date: format(generateStartDate, "yyyy-MM-dd HH:mm:ss"),
          end_date: generateEndDate
            ? format(generateEndDate, "yyyy-MM-dd HH:mm:ss")
            : null,
        },
      );

      if (result.message?.success || result?.success) {
        toast.success(
          `Successfully generated ${result.message?.created_instances || result?.created_instances || 0} instances`,
        );
        setShowManualGenerateDialog(false);
        setGenerateStartDate(null);
        setGenerateEndDate(null);
        fetchPauseHistory();
        if (ontaskDefUpdated) ontaskDefUpdated();
      } else {
        toast.error(
          result.message?.message ||
          result?.message ||
          "Failed to generate instances",
        );
      }
    } catch (error: any) {
      console.error("Error generating instances:", error);
      toast.error(error?.message || "Failed to generate instances");
    } finally {
      setIsLoading(false);
    }
  };

  // Main submit function
  const handleSubmit = async (
    e: React.FormEvent,
    actionType: string = "Save",
  ) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const updatedTaskDef: any = {
        ...taskDefUpdate,
        tag: taskDefUpdate?.tag || null,
        checker: taskDefUpdate?.checker || null,
        due_date: selectedDueDate
          ? format(selectedDueDate, "yyyy-MM-dd HH:mm:ss")
          : taskDefUpdate?.due_date,
        holiday_behaviour:
          taskDefUpdate?.task_type === "Recurring"
            ? dueWorkingDay || "Ignore Holiday"
            : null,
      };

      if (hasRecurrenceChanged()) {
        updatedTaskDef.recurrence_type_id = [
          {
            frequency: frequency?.name || null,
            interval: intervalWeek?.name ? parseInt(intervalWeek.name) : 0,
            week_days: weekDays.join(", ") || "",
            month_days: monthDay?.name ? parseInt(monthDay.name) : 0,
            nth_week: nthValue?.name || null,
          },
        ];
      }

      const updatedTaskResponse = await updateDoc(
        "CG Task Definition",
        taskDefUpdate?.name,
        updatedTaskDef,
      );

      if (updatedTaskResponse) {
        setTaskDefUpdate((prevState) => ({
          ...prevState,
          ...updatedTaskResponse,
          due_date: selectedDueDate
            ? format(selectedDueDate, "yyyy-MM-dd HH:mm:ss")
            : prevState.due_date,
          recurrence_type_id: hasRecurrenceChanged()
            ? updatedTaskDef.recurrence_type_id
            : prevState.recurrence_type_id,
          holiday_behaviour:
            taskDefUpdate?.task_type === "Recurring"
              ? dueWorkingDay || "Ignore Holiday"
              : null,
        }));

        mutateTaskDefinition();
        setEditStates({});
        setIsLoading(false);

        if (actionType === "Save") {
          toast.success("Task definition updated successfully");
        }
        setIsOpen(false);

        setTimeout(() => {
          if (ontaskDefUpdated) {
            ontaskDefUpdated();
          }
        }, 100);
      }
    } catch (error: any) {
      setIsLoading(false);
      const serverMessages = error._server_messages
        ? JSON.parse(error._server_messages)
        : null;
      const msgObj = serverMessages ? JSON.parse(serverMessages[0]) : null;
      const errorMessage = msgObj?.message
        ? msgObj.message.replace(/<[^>]*>/g, "")
        : "An error occurred while updating the task definition";
      toast.error(errorMessage);
      console.error(
        "Error occurred while updating the task definition:",
        error,
      );
    }
  };

  // Get priority data for display
  const getPriorityData = (priority?: string) => {
    return PRIORITY_DATA.find((p) => p.name === priority);
  };

  // Render pause dialog
  const renderPauseDialog = () => {
    if (!showPauseDialog) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Pause size={20} className="text-orange-600" />
              Pause Recurring Task
            </h3>
            <button
              onClick={() => setShowPauseDialog(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pause Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={
                  pauseStartDate
                    ? format(pauseStartDate, "yyyy-MM-dd'T'HH:mm")
                    : ""
                }
                onChange={(e) =>
                  setPauseStartDate(
                    e.target.value ? new Date(e.target.value) : null,
                  )
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pause End Date (Optional)
              </label>
              <input
                type="datetime-local"
                value={
                  pauseEndDate ? format(pauseEndDate, "yyyy-MM-dd'T'HH:mm") : ""
                }
                onChange={(e) =>
                  setPauseEndDate(
                    e.target.value ? new Date(e.target.value) : null,
                  )
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to pause indefinitely
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason (Optional)
              </label>
              <textarea
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter reason for pausing..."
              />
            </div>

            <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-md border border-yellow-200">
              <AlertCircle size={16} className="text-yellow-600" />
              <p className="text-sm text-yellow-800">
                Future task instances will be deleted when paused
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowPauseDialog(false)}
              className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePauseTask}
              disabled={!pauseStartDate || isLoading}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Pausing..." : "Pause Task"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render resume dialog
  const renderResumeDialog = () => {
    if (!showResumeDialog) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Play size={20} className="text-green-600" />
              Resume Recurring Task
            </h3>
            <button
              onClick={() => setShowResumeDialog(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to resume this recurring task? The task will
              start generating instances according to its schedule.
            </p>

            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-md border border-green-200">
              <CircleCheck size={16} className="text-green-600" />
              <p className="text-sm text-green-800">
                Missed instances during pause will be generated
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowResumeDialog(false)}
              className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleResumeTask(true)}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Resuming..." : "Resume Task"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render manual generate dialog
  const renderManualGenerateDialog = () => {
    if (!showManualGenerateDialog) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Plus size={20} className="text-blue-600" />
              Manually Generate Instances
            </h3>
            <button
              onClick={() => setShowManualGenerateDialog(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={
                  generateStartDate
                    ? format(generateStartDate, "yyyy-MM-dd'T'HH:mm")
                    : ""
                }
                onChange={(e) =>
                  setGenerateStartDate(
                    e.target.value ? new Date(e.target.value) : null,
                  )
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date (Optional)
              </label>
              <input
                type="datetime-local"
                value={
                  generateEndDate
                    ? format(generateEndDate, "yyyy-MM-dd'T'HH:mm")
                    : ""
                }
                onChange={(e) =>
                  setGenerateEndDate(
                    e.target.value ? new Date(e.target.value) : null,
                  )
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to generate for 1 week from start date
              </p>
            </div>

            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-md border border-blue-200">
              <AlertCircle size={16} className="text-blue-600" />
              <p className="text-sm text-blue-800">
                This will generate task instances based on the recurrence
                pattern
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowManualGenerateDialog(false)}
              className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleManualGenerate}
              disabled={!generateStartDate || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Generating..." : "Generate Instances"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render history view
  const renderHistoryView = () => {
    return (
      <div className="flex flex-col gap-8">
        <div className="py-3 flex items-center gap-2 border-b border-[#F0F1F2]">
          <button
            onClick={() => setShowHistoryPage(false)}
            className="flex items-center gap-2 text-[#1E1E1E] hover:text-[#0076BE] transition-colors"
          >
            <ArrowLeft size={20} />
            Go Back
          </button>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <History size={24} className="text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Pause History
            </h2>
          </div>

          <div className="space-y-4">
            {pauseHistory.length === 0 ? (
              <div className="text-center py-12">
                <History size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">No pause history available</p>
                <p className="text-sm text-gray-400 mt-2">
                  Pause and resume actions will appear here
                </p>
              </div>
            ) : (
              pauseHistory.map((record) => (
                <div
                  key={record.name}
                  className="border rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge
                          className={`text-xs px-3 py-1 ${record.action_type === "Pause"
                              ? "bg-orange-100 text-orange-800 border-orange-200"
                              : record.action_type === "Resume"
                                ? "bg-green-100 text-green-800 border-green-200"
                                : "bg-blue-100 text-blue-800 border-blue-200"
                            }`}
                        >
                          {record.action_type}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          by {record.performed_by_name || record.performed_by}
                        </span>
                      </div>

                      <p className="text-sm text-gray-700 mb-2">
                        <span className="font-medium">Date:</span>{" "}
                        {new Date(record.performed_on).toLocaleDateString(
                          "en-US",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </p>

                      {record.pause_start_date && (
                        <p className="text-sm text-gray-700 mb-2">
                          <span className="font-medium">Period:</span>{" "}
                          {new Date(record.pause_start_date).toLocaleDateString(
                            "en-US",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                          {record.pause_end_date && (
                            <>
                              {" "}
                              to{" "}
                              {new Date(
                                record.pause_end_date,
                              ).toLocaleDateString("en-US", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </>
                          )}
                        </p>
                      )}

                      {record.reason && (
                        <p className="text-sm text-gray-600 mb-3">
                          <span className="font-medium">Reason:</span>{" "}
                          {record.reason}
                        </p>
                      )}

                      <div className="flex gap-6 text-xs text-gray-500">
                        {record.instances_deleted > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                            <span>
                              Deleted: {record.instances_deleted} instances
                            </span>
                          </div>
                        )}
                        {record.instances_created > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                            <span>
                              Created: {record.instances_created} instances
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render editable field component with hover edit icons
  const renderEditableField = (
    fieldName: string,
    label: string,
    content: React.ReactNode,
    editContent?: React.ReactNode,
    isEditable: boolean = true,
  ) => {
    const isEditing = editStates[fieldName];

    return (
      <div className="group flex space-x-4 py-4 flex-col md:flex-row md:items-center gap-y-3 md:gap-y-0 justify-start w-full relative border-b border-[#F0F1F2] hover:bg-gray-50/50 transition-colors">
        <p className="min-w-[150px] text-sm text-[#5B5967] font-medium">
          {label}
        </p>
        <div className="flex-1 flex items-center justify-between">
          {isEditing && editContent ? (
            <div className="flex-1">{editContent}</div>
          ) : (
            <div className="flex-1 flex items-center justify-between">
              <div className="flex-1">{content}</div>
              {isEditable && (
                <button
                  onClick={() => handleEditToggle(fieldName)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all"
                >
                  {/* <Edit2 size={16} /> */}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Handle cancel action
  const handleCancel = () => {
    if (taskDefinition) {
      setTaskDefUpdate(taskDefinition);

      if (taskDefinition.due_date) {
        setSelectedDueDate(new Date(taskDefinition.due_date));
      }

      if (taskDefinition.recurrence_type_id?.length > 0) {
        const recurrenceData = taskDefinition.recurrence_type_id[0];
        setFrequency({ name: recurrenceData.frequency || "Weekly" });
        setWeekDays(
          recurrenceData.week_days
            ? recurrenceData.week_days.split(", ").filter(Boolean)
            : [],
        );
        setMonthDay({ name: recurrenceData.month_days?.toString() || "" });
        setIntervalWeek({ name: recurrenceData.interval?.toString() || "" });
        setNthValue({ name: recurrenceData.nth_week || "" });
      }

      if (taskDefinition.holiday_behaviour) {
        setDueWorkingDay(taskDefinition.holiday_behaviour);
      }
    }

    setEditStates({});
    setIsOpen(true);
  };

  // Holiday behavior options
  const holidayBehaviorOptions = [
    { name: "Previous Working Date" },
    { name: "Next Working Date" },
    { name: "Ignore Holiday" },
  ];

  // Reset edit modes when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setEditStates({});
      setShowHistoryPage(false);
    }
  }, [isOpen]);

  if (isFetching) {
    return (
      <SheetContent className="min-w-[750px] w-[1000px] text-[#2D2C37] px-[32px] flex flex-col gap-y-[20px]">
        <div className="flex items-center justify-center h-full">
          <Loader size={45} speed={1.75} color="blue" />
        </div>
      </SheetContent>
    );
  }

  if (!taskDefinitionId || !taskDefinition) {
    return null;
  }

  return (
    <>
      {isLoading && <Loader size={45} speed={1.75} color="blue" />}
      <SheetContent className="min-w-[750px] w-[1000px] text-[#2D2C37] px-[32px] flex flex-col gap-y-[20px] overflow-auto">
        {showHistoryPage ? (
          renderHistoryView()
        ) : (
          <>
            {/* Header */}
            <div className="py-3 flex flex-col md:flex-row md:items-center max-md:gap-y-3 justify-between w-full space-x-4 border-b border-[#F0F1F2]">
              <SheetHeader className="space-y-0 w-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 w-full group">
                    {editStates["task_name"] ? (
                      <div className="flex items-center gap-2 w-full">
                        <input
                          type="text"
                          value={taskDefUpdate.task_name}
                          onChange={(e) =>
                            handleSelect("task_name", e.target.value)
                          }
                          className="text-[22px] font-semibold rounded px-3 py-2 flex-1"
                          autoFocus
                        />
                        <button
                          onClick={() =>
                            setEditStates((prev) => ({
                              ...prev,
                              task_name: false,
                            }))
                          }
                          className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setTaskDefUpdate((prev) => ({
                              ...prev,
                              task_name: taskDefinition?.task_name || "",
                            }));
                            setEditStates((prev) => ({
                              ...prev,
                              task_name: false,
                            }));
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <SheetTitle className="text-[22px]">
                          {taskDefUpdate.task_name}
                        </SheetTitle>
                        {/* <button
                                                    onClick={() => handleEditToggle("task_name")}
                                                    className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all"
                                                >
                                                    <Edit2 size={16} />
                                                </button> */}
                      </div>
                    )}
                  </div>
                </div>
                <SheetDescription className="text-[#5B5967] text-[12px]">
                  <div className="flex flex-1 items-center justify-between mt-1">
                    {/* Left side - Active/Inactive + Created On */}
                    <div className="flex items-center gap-2">
                      {taskDefUpdate.enabled ? (
                        <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px] px-2 py-0.5">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px] px-2 py-0.5">
                          Inactive
                        </Badge>
                      )}

                      <span className="text-[11px] text-gray-500">
                        Created on{" "}
                        {taskDefUpdate.creation
                          ? new Date(taskDefUpdate.creation).toLocaleDateString(
                            "en-US",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )
                          : "Unknown date"}
                      </span>
                    </div>

                    {/* Right side - History Badge */}
                    {taskDefUpdate.task_type === "Recurring" && (
                      <Badge
                        className="bg-gray-100 text-gray-700 border-gray-200 text-[13px] px-3 py-1 cursor-pointer hover:bg-gray-200 transition-colors flex items-center gap-1"
                        onClick={() => setShowHistoryPage(true)}
                      >
                        <History size={14} />
                        History
                      </Badge>
                    )}
                  </div>
                </SheetDescription>
              </SheetHeader>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto space-y-0 pb-[100px]">
              {/* Assigned To */}
              {renderEditableField(
                "assigned_to",
                "Assigned To",
                <div className="flex items-center space-x-2">
                  <UserAssignees users={assignedToData || []} className="" />
                  <span className="text-[14px] text-[#2D2C37] font-[600]">
                    {assignedToData?.[0]?.full_name ||
                      taskDefUpdate.assigned_to ||
                      "Assigned to me"}
                  </span>
                </div>,
                <CombinedDropDown
                  DataType="isEmployeeData"
                  value={getAssignedToUser()}
                  handleSelect={(value: any) =>
                    handleSelect("assigned_to", value?.email || value)
                  }
                  placeholder="Select assignee"
                  className="border rounded px-3 py-2 flex-1"
                />,
              )}

              {renderEditableField(
                "Frequency",
                "Frequency",
                <div className="flex  flex-col items-start gap-2">
                  <div className="flex gap-2">
                    <p className="bg-[#F0F1F2] text-[#2D2C37] w-fit rounded-[16px] py-[2px] px-[6px] font-normal text-[12px] text-[400]">
                      {taskDefUpdate?.task_type} Task
                    </p>
                    <p className="text-[14px] text-[600] font-semibold">
                      {taskDefUpdate?.recurrence_type_id[0]?.frequency}
                    </p>
                  </div>
                  {/* <p className="bg-[#F0F1F2] text-[#304156] w-fit rounded-[16px] py-[2px] px-[6px] font-normal text-[12px]">
              {taskDefUpdate?.recurrence_type_id[0]?.frequency}
            </p> */}
                  <p>
                    {taskDefUpdate?.recurrence_type_id[0]?.frequency ===
                      "Weekly" && (
                        <p className="bg-[#F0F1F2] text-[#304156] w-fit rounded-[16px] py-[2px] px-[6px] font-normal text-[12px]">
                          {taskDefUpdate?.recurrence_type_id[0]?.week_days}
                        </p>
                      )}
                    {taskDefUpdate?.recurrence_type_id[0]?.frequency ===
                      "Monthly" &&
                      taskDefUpdate?.recurrence_type_id[0]?.nth_week && (
                        <p className="bg-[#F0F1F2] text-[#304156] w-fit rounded-[16px] py-[2px] px-[6px] font-normal text-[12px]">
                          Every {taskDefUpdate?.recurrence_type_id[0]?.nth_week}{" "}
                          {taskDefUpdate?.recurrence_type_id[0]?.week_days}
                        </p>
                      )}

                    {taskDefUpdate?.recurrence_type_id[0]?.frequency ===
                      "Monthly" &&
                      !taskDefUpdate?.recurrence_type_id[0]?.nth_week &&
                      taskDefUpdate?.recurrence_type_id[0]?.month_days ? (
                      <p className="bg-[#F0F1F2] text-[#304156] w-fit rounded-[16px] py-[2px] px-[6px] font-normal text-[12px]">
                        every {taskDefUpdate?.recurrence_type_id[0]?.month_days}{" "}
                        of current month
                      </p>
                    ) : (
                      ""
                    )}

                    {taskDefUpdate?.recurrence_type_id?.[0]?.frequency ===
                      "Yearly" &&
                      taskDefUpdate?.due_date && (
                        <p className="bg-[#F0F1F2] text-[#304156] w-fit rounded-[16px] py-[2px] px-[6px] font-normal text-[12px]">
                          {(() => {
                            const date = new Date(taskDefUpdate.due_date);
                            const day = date.getDate(); // 20
                            const month = date.toLocaleString("default", {
                              month: "long",
                            }); // September
                            return `every ${day} of ${month}`;
                          })()}
                        </p>
                      )}

                    {/* Custom monthly */}
                    {taskDefUpdate?.recurrence_type_id?.[0]?.frequency ===
                      "Custom" &&
                      taskDefUpdate?.recurrence_type_id[0]?.nth_week !== "" ? (
                      <p className="bg-[#F0F1F2] text-[#304156] w-fit rounded-[16px] py-[2px] px-[6px] font-normal text-[12px]">
                        Every {taskDefUpdate?.recurrence_type_id[0]?.interval}{" "}
                        Month{", "}{" "}
                        {taskDefUpdate?.recurrence_type_id[0]?.nth_week} Week
                        {", "}
                        {taskDefUpdate?.recurrence_type_id[0]?.week_days}
                      </p>
                    ) : (
                      ""
                    )}

                    {/* Custom Weekly */}
                    {taskDefUpdate?.recurrence_type_id?.[0]?.frequency ===
                      "Custom" &&
                      taskDefUpdate?.recurrence_type_id[0]?.nth_week === "" &&
                      taskDefUpdate?.recurrence_type_id[0]?.week_days ? (
                      <p className="bg-[#F0F1F2] text-[#304156] w-fit rounded-[16px] py-[2px] px-[6px] font-normal text-[12px]">
                        Every {taskDefUpdate?.recurrence_type_id[0]?.interval}{" "}
                        Week, {taskDefUpdate?.recurrence_type_id[0]?.week_days}
                      </p>
                    ) : (
                      ""
                    )}

                    {/* Custom -> month -> on_day */}
                    {taskDefUpdate?.recurrence_type_id?.[0]?.frequency ===
                      "Custom" &&
                      taskDefUpdate?.recurrence_type_id[0]?.nth_week === "" &&
                      taskDefUpdate?.recurrence_type_id[0]?.month_days ? (
                      <p className="bg-[#F0F1F2] text-[#304156] w-fit rounded-[16px] py-[2px] px-[6px] font-normal text-[12px]">
                        Every {taskDefUpdate?.recurrence_type_id[0]?.interval}{" "}
                        Month {taskDefUpdate?.recurrence_type_id[0]?.on_day}{" "}
                        {", On day "}
                        {taskDefUpdate?.recurrence_type_id[0]?.month_days}
                      </p>
                    ) : (
                      ""
                    )}
                  </p>
                </div>,
              )}

              {/* Due Date and Time */}
              {renderEditableField(
                "due_date",
                "Due Date and Time",
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center gap-2">
                    {/* <Calendar size={16} className="text-gray-500" /> */}
                    <span className="text-[14px] text-[#2D2C37] text-[600] font-semibold">
                      {/* {taskDefUpdate.due_date
                                                ? new Date(taskDefUpdate.due_date).toLocaleDateString("en-US", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                    hour12: true
                                                })
                                                : "12 March, 12:30 PM"} */}
                      {taskDefUpdate?.due_date
                        ? format(
                          new Date(taskDefUpdate.due_date),
                          "dd MMM yyyy, hh:mm a",
                        )
                        : "No due date available"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-[400] text-[12px] text-[#5B5967]">
                      If holidays fall on due dates, mark it done on
                    </span>
                    <span className="bg-[#F1F5FA] px-2 py-1 rounded text-gray-600 font-inter font-normal text-[12px] leading-[100%] tracking-[0]">
                      {taskDefUpdate.holiday_behaviour || "Next working day"}
                    </span>
                  </div>
                </div>,
                <div className="flex flex-col gap-3">
                  <CustomCalender
                    date={selectedDueDate || new Date()}
                    onChange={handleDateChange}
                    containerClassName="w-full border rounded px-3 py-2"
                    text="Due Date"
                    TaskType={taskDefUpdate?.task_type}
                    isSubtask={false}
                    frequency={frequency}
                    setFrequency={setFrequency}
                    weekDays={weekDays}
                    setWeekDays={setWeekDays}
                    custom={custom}
                    setCustom={setCustom}
                    monthDay={monthDay}
                    setMonthDay={setMonthDay}
                    intervalWeek={intervalWeek}
                    setIntervalWeek={setIntervalWeek}
                    nthValue={nthValue}
                    setNthValue={setNthValue}
                  />
                  {taskDefUpdate?.task_type === "Recurring" && (
                    <div className="flex items-center gap-2">
                      <span className="font-[400] text-[12px] text-[#5B5967]">
                        If holidays fall on due dates, mark it done on
                      </span>
                      <select
                        value={dueWorkingDay}
                        onChange={(e) => setDueWorkingDay(e.target.value)}
                        className="bg-[#F1F5FA] px-2 py-1 rounded text-[11px] text-gray-600"
                      >
                        {holidayBehaviorOptions.map((option) => (
                          <option key={option.name} value={option.name}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>,
              )}

              {/* Tags */}
              {renderEditableField(
                "tag",
                "Tags",
                <p className="w-[90px] h-[28px] px-2 py-[2px] gap-1 opacity-100 rounded-[8px] bg-[#EFF9FF] font-[600] text-[14px] text-[#2D2C37] flex items-center justify-center">
                  {taskDefUpdate?.tag || "No tag"}
                </p>
                ,
                <CombinedDropDown
                  DataType="isTagsData"
                  value={getTagObject()}
                  handleSelect={(value: any) =>
                    handleSelect("tag", value?.tag_name || value)
                  }
                  placeholder="Select tag"
                  className="rounded px-3 py-2 flex-1"
                />,
              )}

              {/* Description */}
              <div className="group flex space-x-4 py-4 flex-col min-h-[150px] md:flex-row md:items-start gap-y-3 md:gap-y-0 justify-start w-full relative border-b border-[#F0F1F2] hover:bg-gray-50/50 transition-colors">
                <p className="min-w-[150px] text-sm text-[#5B5967] font-medium">
                  Description
                </p>
                <div className="flex-1">
                  {editStates["description"] ? (
                    <div className="space-y-4">
                      <ReactQuill
                        theme="snow"
                        value={taskDefUpdate.description || ""}
                        onChange={(value) => handleSelect("description", value)}
                        className="[&_.ql-container]:min-h-[150px] [&_.ql-container]:max-h-[160px] [&_.ql-container]:overflow-y-auto [&_.ql-editor]:min-h-[150px]"
                      />
                    </div>
                  ) : (
                    // <div className="relative flex items-start justify-between">
                    //   <div className="flex-1">
                    //     {taskDefUpdate.description &&
                    //       taskDefUpdate.description !== "<p><br></p>" && (
                    //         <div className="prose prose-sm max-h-[150px] overflow-hidden line-clamp-4">
                    //           <ReactQuill
                    //             theme="snow"
                    //             value={taskDefinition.description || ""}
                    //             readOnly
                    //             modules={{ toolbar: false }}
                    //             className="[&_.ql-container]:border-0 [&_.ql-container]:p-0 [&_.ql-editor]:p-0"
                    //           />
                    //         </div>
                    //       )}
                    //   </div>
                    //   <button
                    //     onClick={() => handleEditToggle("description")}
                    //     className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all ml-2"
                    //   >
                    //     {/* <Edit2 size={16} /> */}
                    //   </button>
                    // </div>
                    <div
                      className="w-full max-w-[28rem] md:max-w-[500px] font-[400] text-[14px] text-gray-700"
                      style={{ padding: "0", border: "none" }}
                    >
                      {taskDefUpdate.description &&
                        taskDefUpdate.description !== "<p><br></p>" ? (
                        <div
                          style={{
                            width: "100%",
                            maxWidth: "min(90vw, 700px)",
                            minWidth: "250px",
                            margin: "0 5px",
                          }}
                          className="mb-0"
                        >
                          <ReactQuill
                            value={taskDefUpdate.description || ""}
                            readOnly={true}
                            theme="snow"
                            modules={{ toolbar: false }}
                            className="min-w-[40vh] [&_.ql-container]:border-0 [&_.ql-container]:max-h-[10px] [&_.ql-toolbar]:border-0 [&_.ql-toolbar_button:focus-visible]:outline-none [&_.ql-editor]:border-none [&_.ql-editor:focus-visible]:outline-none [&_.ql-editor]:border-0 [&_.ql-editor]:p-0 font-[400] text-[14px] text-[#2D2C37]"
                          />
                        </div>
                      ) : (
                        <span className="text-gray-500 font-[400] text-[14px] px-1">
                          No Description
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Priority and Task Type in single line */}
              <div className="group flex space-x-4 py-4 flex-col md:flex-row md:items-center gap-y-3 md:gap-y-0 justify-start w-full relative border-b border-[#F0F1F2] hover:bg-gray-50/50 transition-colors">
                <p className="min-w-[150px] text-sm text-[#5B5967] font-medium">
                  Priority
                </p>
                <div className="flex-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      {editStates["priority"] ? (
                        <div className="flex gap-2 justify-center">
                          <CombinedDropDown
                            DataType="isPriorityData"
                            value={getPriorityObject()}
                            handleSelect={(item: any) =>
                              handleSelect("priority", item.name)
                            }
                            placeholder="Select Priority"
                            className="rounded px-3 py-2"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {(() => {
                            const priorityData = getPriorityData(
                              taskDefUpdate.priority,
                            );
                            return (
                              priorityData &&
                              //   (
                              //     <img
                              //       src={priorityData.image}
                              //       alt={taskDefUpdate.priority}
                              //       className="w-3 h-3"
                              //     />
                              //   )
                              <PriorityDisplay priority={taskDefUpdate?.priority} />
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* <div className="flex items-center">
                      <span className="rounded-full text-[14px]">
                        {taskDefUpdate.task_type || "Recurring"}
                      </span>
                    </div> */}
                  </div>

                  <button
                    onClick={() => handleEditToggle("priority")}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all"
                  >
                    {/* <Edit2 size={16} /> */}
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom button bar */}
            <div className="absolute bottom-0 left-0 flex items-center justify-end bg-white w-full border-t border-[#F0F0F2] px-[30px] py-[24px]">
              {/* All buttons on the right */}
              <div className="flex items-center gap-x-3 ml-auto">
                {/* Pause/Resume/Generate buttons for recurring tasks */}
                {taskDefUpdate.task_type === "Recurring" && (
                  <>
                    {taskDefUpdate.is_paused ? (
                      <>
                        <button
                          onClick={() => setShowResumeDialog(true)}
                          className="flex items-center gap-1 px-3 py-2 text-green-600 bg-green-50 hover:bg-green-100 rounded text-sm transition-colors font-medium"
                          disabled={isLoading}
                        >
                          <Play size={14} />
                          Resume
                        </button>
                        <button
                          onClick={() => setShowManualGenerateDialog(true)}
                          className="flex items-center gap-1 px-3 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded text-sm transition-colors font-medium"
                          disabled={isLoading}
                        >
                          <Plus size={14} />
                          Generate
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setShowPauseDialog(true)}
                        className="flex items-center gap-1 px-3 py-2 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded text-sm transition-colors font-medium"
                        disabled={isLoading}
                      >
                        <Pause size={14} />
                        Pause
                      </button>
                    )}
                  </>
                )}

                {/* Cancel button - only show when editing */}
                {isEditing && (
                  <button
                    className="bg-[#f78e8e] text-[#1d1e1f] px-[12px] py-2 w-[100px] rounded-md font-[600] text-[14px] border border-[#DEE2E6]"
                    onClick={handleCancel}
                    type="button"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                )}

                {/* Save button */}
                <button
                  className="bg-[#0385FF] text-white px-[12px] py-2 w-[100px] rounded-md font-[600] text-[14px] hover:bg-[#0366CC] transition-colors"
                  onClick={(e) => handleSubmit(e, "Save")}
                  type="button"
                  disabled={isLoading}
                >
                  Save
                </button>
              </div>
            </div>

            {/* Pause Dialog */}
            {renderPauseDialog()}

            {/* Resume Dialog */}
            {renderResumeDialog()}

            {/* Manual Generate Dialog */}
            {renderManualGenerateDialog()}
          </>
        )}
      </SheetContent>
    </>
  );
};

export default TaskDefinitionSheet;

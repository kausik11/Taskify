import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CGTaskInstance } from '@/types/ClapgrowApp/CGTaskInstance';
import { CGRecurrenceType } from '@/types/ClapgrowApp/CGRecurrenceType';

interface UseTaskFormProps {
  initialTaskData?: CGTaskInstance;
}

interface UseTaskFormReturn {
  // Task state
  taskUpdate: CGTaskInstance;
  setTaskUpdate: React.Dispatch<React.SetStateAction<CGTaskInstance>>;
  
  // Edit modes
  editMode: Record<string, boolean>;
  setEditMode: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  resetEditModes: () => void;
  
  // Date and recurrence
  selectedDueDate: Date | null;
  setSelectedDueDate: (date: Date | null) => void;
  frequency: { name: string };
  setFrequency: (freq: { name: string }) => void;
  weekDays: string[];
  setWeekDays: (days: string[]) => void;
  custom: { name: string };
  setCustom: (custom: { name: string }) => void;
  monthDay: { name: string };
  setMonthDay: (day: { name: string }) => void;
  intervalWeek: { name: string };
  setIntervalWeek: (week: { name: string }) => void;
  nthValue: { name: string };
  setNthValue: (value: { name: string }) => void;
  dueWorkingDay: string;
  setDueWorkingDay: (day: string) => void;
  reminderSentence: string;
  setReminderSentence: (sentence: string) => void;
  
  // Reallocation
  newAssignedTo: { email: string; full_name?: string } | null;
  setNewAssignedTo: (assignee: { email: string; full_name?: string } | null) => void;
  selectedStartDate: Date;
  setSelectedStartDate: (date: Date) => void;
  selectedEndDate: Date;
  setSelectedEndDate: (date: Date) => void;
  
  // Form handlers
  handleSelect: (field: string, value: string | any[]) => void;
  
  // Validation
  isTaskEditable: (fieldName?: string) => boolean;
  canEditTask: (fieldName?: string, userEmail?: string, roleBaseName?: string) => boolean;
}

const defaultEditMode = {
  task_name: false,
  temporaryReallocation: false,
  checker: false,
  task_type: false,
  frequency: false,
  due_date: false,
  priority: false,
  tag: false,
  description: false,
  subTasks: false,
  attach_file: false,
};

const canEditRecurringField = (fieldName: string, taskType: string): boolean => {
  if (taskType === "Onetime") return true;
  const restrictedFields = ["frequency", "task_type"];
  return !restrictedFields.includes(fieldName);
};

const getDefaultStartDate = () => {
  const date = new Date();
  date.setHours(9, 30, 0, 0);
  return date;
};

const getDefaultEndDate = () => {
  const date = new Date();
  date.setHours(18, 0, 0, 0);
  return date;
};

export const useTaskForm = ({ initialTaskData }: UseTaskFormProps): UseTaskFormReturn => {
  // Task state
  const [taskUpdate, setTaskUpdate] = useState<CGTaskInstance>({
    name: "",
    task_name: "",
    assigned_to: "",
    checker: "",
    recurrence_type_id: [],
    due_date: "",
    priority: "Low",
    tags: "",
    description: "",
    subtask: [],
    attach_file: "",
    is_help_ticket: 0,
    is_completed: 0,
    creation: "",
    restrict: 0,
  });

  // console.log("taskUpdate", taskUpdate);
  // Edit modes
  const [editMode, setEditMode] = useState(defaultEditMode);

  // Date and recurrence state
  const [selectedDueDate, setSelectedDueDate] = useState<Date | null>(null);
  const [frequency, setFrequency] = useState<{ name: string }>({ name: "Weekly" });
  const [custom, setCustom] = useState<{ name: string }>({ name: "" });
  const [weekDays, setWeekDays] = useState<string[]>([]);
  const [monthDay, setMonthDay] = useState<{ name: string }>({ name: "" });
  const [intervalWeek, setIntervalWeek] = useState<{ name: string }>({ name: "" });
  const [nthValue, setNthValue] = useState<{ name: string }>({ name: "" });
  const [dueWorkingDay, setDueWorkingDay] = useState<string>("Ignore Holiday");
  const [reminderSentence, setReminderSentence] = useState<string>("");

  // Reallocation state
  const [newAssignedTo, setNewAssignedTo] = useState<{
    email: string;
    full_name?: string;
  } | null>(null);
  const [selectedStartDate, setSelectedStartDate] = useState<Date>(getDefaultStartDate());
  const [selectedEndDate, setSelectedEndDate] = useState<Date>(getDefaultEndDate());

  // Initialize form when task data changes
  useEffect(() => {
    if (initialTaskData) {
      setTaskUpdate(initialTaskData);
      
      // Set due date
      if (initialTaskData.due_date) {
        setSelectedDueDate(new Date(initialTaskData.due_date));
      }
      
      // Set recurrence data
      if (initialTaskData.recurrence_type_id?.length > 0) {
        const recurrenceData = initialTaskData.recurrence_type_id[0];
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
      
      // Set holiday behavior
      if (initialTaskData.holiday_behaviour) {
        setDueWorkingDay(initialTaskData.holiday_behaviour);
      }
    }
  }, [initialTaskData]);

  const resetEditModes = () => {
    setEditMode(defaultEditMode);
    setNewAssignedTo(null);
    setSelectedStartDate(getDefaultStartDate());
    setSelectedEndDate(getDefaultEndDate());
  };

  const handleSelect = (field: string, value: string | any[]) => {
    if (field !== "temporary_reallocation") {
      setTaskUpdate((prevState: any) => ({
        ...prevState,
        [field]:
          field === "assigned_to" &&
          typeof value === "object" &&
          !Array.isArray(value)
            ? (value as { email: string }).email
            : value,
      }));
    }
  };

  const isTaskEditable = (fieldName?: string) => {
    const isRejected = taskUpdate?.status === "Rejected";
    const isCompleted = taskUpdate?.is_completed === 1;
    const baseEditable = !isRejected && !isCompleted;

    if (!fieldName) return baseEditable;
    return baseEditable && canEditRecurringField(fieldName, taskUpdate?.task_type || "");
  };

  const canEditTask = (fieldName?: string, userEmail?: string, roleBaseName?: string) => {
    if (!userEmail || !roleBaseName) return false;
    
    const hasEditPermission =
      roleBaseName === "ROLE-Admin" || userEmail === taskUpdate?.assignee;
    return hasEditPermission && isTaskEditable(fieldName);
  };

  return {
    taskUpdate,
    setTaskUpdate,
    editMode,
    setEditMode,
    resetEditModes,
    selectedDueDate,
    setSelectedDueDate,
    frequency,
    setFrequency,
    weekDays,
    setWeekDays,
    custom,
    setCustom,
    monthDay,
    setMonthDay,
    intervalWeek,
    setIntervalWeek,
    nthValue,
    setNthValue,
    dueWorkingDay,
    setDueWorkingDay,
    reminderSentence,
    setReminderSentence,
    newAssignedTo,
    setNewAssignedTo,
    selectedStartDate,
    setSelectedStartDate,
    selectedEndDate,
    setSelectedEndDate,
    handleSelect,
    isTaskEditable,
    canEditTask,
  };
};
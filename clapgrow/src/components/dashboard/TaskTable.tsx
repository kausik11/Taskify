import { CGTaskInstance } from "@/types/ClapgrowApp/CGTaskInstance";
import { CGUser } from "@/types/ClapgrowApp/CGUser";
import { format } from "date-fns";
import {
  Filter,
  FrappeConfig,
  FrappeContext,
  useFrappeAuth,
  useFrappeGetDocCount,
  useFrappeGetDocList,
  useFrappeUpdateDoc,
} from "frappe-react-sdk";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import CommonHeader from "../common/CommonHeader";
import { handleFrappeExport } from "@/utils/exportUtils";
import FilterComponent from "../common/FilterComponent";
import { Sheet } from "../ui/sheet";
import CalendarView from "./CalenderView";
import TaskSheetContent from "./TaskSheet/TaskSheetContent";
import { Check, X } from "lucide-react";
import { PRIORITY_DATA, StatusStyles } from "@/data/common";
import UserAssignees from "./UserAssignees";
import { useUserDetailsByEmails } from "../common/CommonFunction";
import { UserContext } from "@/utils/auth/UserProvider";
import { useTaskContext } from "@/utils/api/TaskProvider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { Portal } from "@radix-ui/react-tooltip";
import DoctypeList from "../common/DataGrid/DataGridWithMeta";
import { ColumnProps } from "../common/DataGrid/DataGridComponent";
// TaskTable.tsx

interface TaskTableProps {
  setSelectedTask: Dispatch<SetStateAction<string>>;
  selectedTask: string;
  setTableOpen: Dispatch<SetStateAction<boolean>>;
  isTableOpen: boolean;
  refreshKey?: number;
  listSize?: number;
  setListSize?: Dispatch<SetStateAction<number>>;
}

interface Comment {
  name: string;
  reference_doctype: string;
  reference_name: string;
  content: string;
  owner: string;
  creation: string;
}

interface Notification {
  name: string;
  subject: string;
  type: string;
  owner: string;
  read: 0 | 1;
  creation: string;
  document_type: string;
  document_name: string;
}

interface CGTeam {
  name: string;
  team_lead: string;
  members: { member: string }[];
}

export default function TaskTable({
  setSelectedTask,
  selectedTask,
  setTableOpen,
  isTableOpen,
  refreshKey,
  listSize,
  setListSize,
}: TaskTableProps) {
  // State to track if screen size is below 360x740
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false);
  // === Context and Hooks ===
  const { currentUser } = useFrappeAuth();
  const { userDetails, rolePermissions, companyDetails } =
    useContext(UserContext);
  const { tablerefreshKeys } = useTaskContext();
  const { updateDoc } = useFrappeUpdateDoc();
  const { call } = useContext(FrappeContext) as FrappeConfig;
  const [viewType, setViewType] = useState<string>("list");

  // Set default status to exclude "Completed" tasks
  const [status, setStatus] = useState<string>(
    "Due Today,Overdue,Upcoming,Rejected,Paused",
  );
  const [task, setTask] = useState<string[]>([]);
  const [audit, setAudit] = useState<string>("");
  const [assignedTo, setAssignedTo] = useState<any[]>([]);
  const [assignee, setAssignee] = useState<any[]>([]);
  const [priority, setPriority] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [branch, setBranch] = useState<{ branch_name: string } | null>(null);
  const [department, setDepartment] = useState<{
    department_name: string;
  } | null>(null);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selected, setSelected] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [mutation, setMutation] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Export state
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const [selectedTaskName, setSelectedTaskName] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [taskToComplete, setTaskToComplete] = useState<{
    name: string;
    task_name: string;
    status: string;
  } | null>(null);
  // State to control taskId for fetching details
  const [taskIdForFetch, setTaskIdForFetch] = useState<string | null>(null);

  const [teamMembers, setTeamMembers] = useState<string[]>([currentUser || ""]);
  const company = companyDetails?.[0]?.name;
  const [taskNotifications, setTaskNotifications] = useState<{
    [key: string]: Notification[];
  }>({});

  const [tablerefreshKey, setTableRefreshKey] = useState<number>(0);
  const recordsPerPage = listSize;

  const [delayStatus, setDelayStatus] = useState<string[]>([]);

  let USERfilters: any[] = [];
  const formValidationRef = useRef<(() => Promise<boolean>) | null>(null);

  const useTaskDetails = (taskId: string | null) => {
    const { data, error, isLoading } = useFrappeGetDocList<CGTaskInstance>(
      "CG Task Instance",
      {
        fields: [
          "name",
          "task_name",
          "status",
          "task_type",
          "attached_form",
          "is_completed",
          "assigned_to",
        ],
        filters: taskId ? [["name", "=", taskId]] : [],
        limit: 1,
      },
      { deps: [taskId, tablerefreshKeys] },
    );

    return {
      taskDetails: data?.[0] || null,
      error,
      isLoading,
    };
  };

  useEffect(() => {
    setTableRefreshKey((prevKey) => prevKey + 1);
  }, [tablerefreshKeys]);

  const handleTaskComplete = async (
    taskId: string,
    taskDetails: CGTaskInstance | null,
    setTaskIdForFetch: Dispatch<SetStateAction<string | null>>,
  ) => {
    try {
      setLoading(true);

      if (!taskDetails) {
        throw new Error("Task not found or still loading");
      }

      // Extract task details
      const {
        task_name,
        status,
        task_type,
        attached_form,
        is_completed,
        assigned_to,
      } = taskDetails;

      // Check if task is already completed
      if (is_completed === 1) {
        toast.error("Task is already completed");
        setLoading(false);
        setIsDialogOpen(false);
        return;
      }

      // Check permissions
      const hasPermission =
        rolePermissions?.role_name === "Admin" || assigned_to === currentUser;
      if (!hasPermission) {
        toast.error("You don't have permission to mark this task as complete");
        setLoading(false);
        setIsDialogOpen(false);
        return;
      }

      // Check if task is a Process task with an attached form
      if (task_type === "Process" && attached_form) {
        setSelectedTaskName(taskId);
        setIsOpen(true);
        toast.error("Please fill up all mandatory fields in step form");
        setLoading(false);
        setIsDialogOpen(false);
        return;
      }

      // Prepare update data
      const updateData: any = {
        is_completed: 1,
        completion_platform: "Web", // Explicitly set to Web for web interface
      };

      // If task is paused, also update status to completed and handle due date adjustment
      if (status === "Paused") {
        updateData.status = "Completed";
        updateData.auto_adjust_due_date = true; // Flag to trigger due date adjustment in backend
      }

      // Update the task
      const success = await updateDoc("CG Task Instance", taskId, updateData);

      if (success) {
        setLoading(false);
        if (status === "Paused") {
          toast.success(
            "Paused task marked as completed with adjusted due date",
          );
        } else {
          toast.success("Task marked as completed");
        }
        setIsOpen(false);
        mutate();
      }
    } catch (error: any) {
      setLoading(false);
      const serverMessages = error._server_messages
        ? JSON.parse(error._server_messages)
        : null;
      const msgObj = serverMessages ? JSON.parse(serverMessages[0]) : null;
      const errorMessage = msgObj?.message
        ? msgObj.message.replace(/<[^>]*>/g, "")
        : `An error occurred while marking the task as complete: ${error.message || "Unknown error"}`;
      toast.error(errorMessage);
      console.error("Error marking task complete:", error);
    } finally {
      setTableRefreshKey((prev) => prev + 1);
      setIsDialogOpen(false);
      setTaskToComplete(null);
      setTaskIdForFetch(null); // Reset taskId to avoid unnecessary fetches
    }
  };

  // Fetch task details using custom hook
  const {
    taskDetails,
    error: taskFetchError,
    isLoading: taskFetchLoading,
  } = useTaskDetails(taskIdForFetch);

  // Callback to handle filter changes
  const handleFiltersChanged = useCallback(() => {
    setTableRefreshKey((prev) => prev + 1);
  }, []);

  // Get team data for role-based filtering
  const { data: teamData } = useFrappeGetDocList<CGTeam>("CG Team", {
    fields: ["name", "team_lead", "members"],
    filters: [["company_id", "=", company]],
  });

  useEffect(() => {
    if (!teamData || !currentUser) {
      setTeamMembers([currentUser || ""]);
      return;
    }

    const fetchTeamMembers = async () => {
      // start with the team lead
      const memberIds = new Set<string>([currentUser]);
      // only consider teams where currentUser is the lead
      const myTeams = teamData.filter((t) => t.team_lead === currentUser);
      if (myTeams.length === 0) {
        setTeamMembers([currentUser]);
        return;
      }

      try {
        for (const team of myTeams) {
          const res = await call.get("frappe.client.get_list", {
            doctype: "CG User",
            fields: ["name"],
            filters: [["company_id", "=", company]],
          });
          const membersArray = res.message.members as { member: string }[];
          if (membersArray && membersArray.length > 0) {
            membersArray.forEach((m) => {
              if (m.member) {
                memberIds.add(m.member);
              }
            });
          }
        }
        const finalMembers = Array.from(memberIds);

        // Supplement with CG User emails if needed
        if (finalMembers.length <= 1) {
          try {
            const res = await call.get("frappe.client.get_list", {
              doctype: "CG User",
              fields: ["name"],
              filters: [["company_id", "=", company]],
            });
            const users = res.message.map((u: { name: string }) => u.name);
            users.forEach((u) => memberIds.add(u));
            setTeamMembers(Array.from(memberIds));
          } catch (err) {
            console.error("Error fetching CG User supplement:", err);
            setTeamMembers(finalMembers);
          }
        } else {
          setTeamMembers(finalMembers);
        }
      } catch (err) {
        console.error("Error fetching team members:", err);
        setTeamMembers([currentUser]);
      }
    };

    fetchTeamMembers();
  }, [teamData, currentUser, call]);

  // Update getInitialFilters to use teamMembers state
  const getInitialFilters = useMemo(() => {
    const baseFilters: any[] = [];
    baseFilters.push(["company_id", "=", company]);

    if (selectedTask === "myTask") {
      baseFilters.push(["assigned_to", "=", currentUser]);
    } else if (selectedTask === "teamTask") {
      const role = rolePermissions?.role_name;

      switch (role) {
        case "Admin":
          // Admin: No filters – see everything
          break;

        case "Team Lead":
          if (teamMembers.length > 0) {
            baseFilters.push(["assignee", "in", teamMembers]);
          } else {
            console.warn(
              "No team members found for Team Lead; applying no filter",
            );
            // Optionally, restrict to team lead only if no members
            baseFilters.push(["assigned_to", "=", currentUser]);
          }
          break;

        case "Member":
          baseFilters.push(["assignee", "=", currentUser]);
          break;

        default:
          console.warn("Unknown role;", { role });
          break;
      }
    }
    return baseFilters;
  }, [selectedTask, rolePermissions, currentUser, teamMembers]);

  const [filters, setFilters] = useState<any[]>(getInitialFilters);
  // console.log("filters with getInitialFilters", filters);
  const [debouncedFilters] = useDebounce(filters, 300);

  const { data: UGUserData } = useFrappeGetDocList<CGUser>("CG User", {
    fields: ["name"],
    filters: [...(USERfilters || []), ["company_id", "=", company]],
  });

  const { data: totalRecords, mutate: countMutate } = useFrappeGetDocCount(
    "CG Task Instance",
    debouncedFilters.length > 0 ? debouncedFilters : [],
  );

  const { data: TaskData, mutate } = useFrappeGetDocList<CGTaskInstance>(
    "CG Task Instance",
    {
      fields: ["*"],
      filters: [...(debouncedFilters || []), ["company_id", "=", company]],
      orderBy: {
        field: "status_priority_map",
        order: "asc",
      },
      limit: recordsPerPage,
      limit_start: (currentPage - 1) * recordsPerPage,
    },
    { deps: [currentPage] },
  );

  const { roleBaseName } = useContext(UserContext);

  // Fetch comments for CG Task Instance
  const { data: comments } = useFrappeGetDocList<Comment>("Comment", {
    fields: [
      "name",
      "reference_doctype",
      "reference_name",
      "content",
      "owner",
      "creation",
    ],
    filters: [["reference_doctype", "=", "CG Task Instance"]],
  });

  // Fetch notifications for comments
  const { data: notifications } = useFrappeGetDocList<Notification>(
    "Notification Log",
    {
      fields: [
        "name",
        "subject",
        "type",
        "owner",
        "read",
        "creation",
        "document_type",
        "document_name",
      ],
      filters: [
        ["type", "=", "Alert"],
        ["document_type", "=", "Comment"],
        ["read", "=", 0],
      ],
    },
  );

  // Group notifications by task based on comments
  useEffect(() => {
    if (comments && notifications) {
      // Map comment names to their reference_name (task ID)
      const commentToTaskMap = comments.reduce(
        (acc, comment) => {
          if (comment.reference_doctype === "CG Task Instance") {
            acc[comment.name] = comment.reference_name;
          }
          return acc;
        },
        {} as { [key: string]: string },
      );

      // Group notifications by task ID
      const groupedNotifications = notifications.reduce(
        (acc, notification) => {
          if (notification.document_type === "Comment") {
            const taskId = commentToTaskMap[notification.document_name];
            if (taskId) {
              if (!acc[taskId]) {
                acc[taskId] = [];
              }
              acc[taskId].push(notification);
            }
          }
          return acc;
        },
        {} as { [key: string]: Notification[] },
      );

      setTaskNotifications(groupedNotifications);
    }
  }, [comments, notifications]);

  const statusOrder = {
    "Due Today": 0,
    Overdue: 1,
    Upcoming: 2,
    Paused: 3,
    Completed: 4,
    Rejected: 5,
  };

  const sortedTaskData = useMemo(() => {
    if (!TaskData) return [];
    return [...TaskData].sort((a, b) => {
      const statusA = statusOrder[a.status as keyof typeof statusOrder] ?? 6;
      const statusB = statusOrder[b.status as keyof typeof statusOrder] ?? 6;
      return statusA - statusB;
    });
  }, [TaskData]);

  // Update filters when dependencies change for old ag grid
  useEffect(() => {
    const tempFilters: any[] = [...getInitialFilters];

    // Add default status filter (exclude Completed tasks by default)
    if (status) {
      if (status.includes(",")) {
        // Multiple statuses
        const statusArray = status.split(",").map((s) => s.trim());
        tempFilters.push(["status", "in", statusArray]);
      } else {
        tempFilters.push(["status", "like", status]);
      }
    } else {
      // Default: exclude completed tasks
      tempFilters.push(["status", "in", ["Due Today", "Overdue", "Upcoming"]]);
    }

    if (priority) tempFilters.push(["priority", "like", priority]);
    if (task.length > 0) {
      if (task.includes("Help") && !task.includes("Onetime")) {
        tempFilters.push(["is_help_ticket", "=", 1]);
      } else {
        tempFilters.push(["task_type", "in", task]);
      }
    }
    if (assignee.length > 0) {
      const assigneeEmails = assignee.map((user: any) => user.email);
      tempFilters.push(["assignee", "in", assigneeEmails]);
    }
    if (
      selectedTask !== "myTask" &&
      selectedTask === "teamTask" &&
      assignedTo.length > 0
    ) {
      const assignedEmails = assignedTo.map((user: any) => user.email);
      tempFilters.push(["assigned_to", "in", assignedEmails]);
    }
    if (department)
      tempFilters.push([
        "department",
        "like",
        `%${department.department_name}%`,
      ]);
    if (branch) tempFilters.push(["branch", "like", `%${branch.branch_name}%`]);

    if (department || branch) {
      if (UGUserData && UGUserData.length > 0) {
        const ugUserEmails = UGUserData.map((user: any) => user.name);
        tempFilters.push(["assigned_to", "in", ugUserEmails]);
      }
    }

    if (searchQuery)
      tempFilters.push(["task_name", "like", `%${searchQuery}%`]);
    if (tags?.length > 0) tempFilters.push(["_user_tags", "in", tags]);
    if (fromDate && toDate) {
      const formattedFromDate = format(fromDate, "yyyy-MM-dd");
      const formattedToDate = format(toDate, "yyyy-MM-dd");
      tempFilters.push(["due_date", ">=", formattedFromDate]);
      tempFilters.push(["due_date", "<=", formattedToDate]);
    }

    // Add delay status filter
    if (delayStatus.length > 0) {
      const delayValues = delayStatus.map((status) =>
        status === "Delayed" ? 1 : status === "On Time" ? 0 : status,
      );
      tempFilters.push(["is_delayed", "in", delayValues]);
    }
    setFilters(tempFilters);
  }, [
    selectedTask,
    status,
    priority,
    task,
    assignee,
    assignedTo,
    department,
    branch,
    UGUserData,
    searchQuery,
    tags,
    fromDate,
    toDate,
    currentUser,
    getInitialFilters,
    delayStatus,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    status,
    priority,
    assignedTo,
    selectedTask,
    tags,
    fromDate,
    toDate,
    delayStatus,
  ]);

  // Refresh data
  useEffect(() => {
    mutate();
    countMutate();
  }, [debouncedFilters, currentPage, isOpen, refreshKey, modalOpen]);

  // === Helper Functions ===

  // Check if task can be completed - Updated to allow paused tasks
  const canCompleteTask = (task: CGTaskInstance) => {
    const isRejected = task.status === "Rejected";
    const isCompleted = task.status === "Completed";
    const hasPermission =
      rolePermissions?.role_name === "Admin" ||
      task.assigned_to === currentUser;

    return !isRejected && !isCompleted && hasPermission;
  };

  // Get tooltip message for disabled complete button
  const getCompleteTooltipMessage = (task: CGTaskInstance) => {
    if (task.status === "Rejected") return "Rejected tasks cannot be completed";
    if (task.is_completed === 1) return "Task is already completed";
    if (
      rolePermissions?.role_name !== "Admin" &&
      task.assigned_to !== currentUser
    ) {
      return "You don't have permission to mark this task as complete";
    }
    return "";
  };

  // === Handlers ===
  const handleExport = useCallback(async () => {
    if (isExporting) {
      toast.info("Export already in progress...");
      return;
    }

    setIsExporting(true);

    try {
      // Use the current filters from the table to export filtered data
      const exportFilters = [...debouncedFilters];

      await handleFrappeExport(exportFilters, call);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Export failed";
      console.error("Export error:", error);
      // Error toast is already handled in handleFrappeExport
    } finally {
      setIsExporting(false);
    }
  }, [debouncedFilters, call, isExporting]);

  const markNotificationsAsRead = async (taskId: string) => {
    const taskNotificationsList = taskNotifications[taskId] || [];
    for (const notification of taskNotificationsList) {
      if (notification.read === 0) {
        try {
          await call.post(
            `frappe.desk.doctype.notification_log.notification_log.mark_as_read`,
            { docname: notification.name },
          );
          setTaskNotifications((prev) => ({
            ...prev,
            [taskId]: prev[taskId].map((n) =>
              n.name === notification.name ? { ...n, read: 1 } : n,
            ),
          }));
        } catch (error) {
          console.error("Error marking notification as read:", error);
          toast.error("Failed to mark notification as read");
        }
      }
    }
  };

  const handleRowClick = useCallback((task: CGTaskInstance) => {
    // Set both states together - React 18 will batch them
    setSelectedTaskName(task.name);
    setIsOpen(true);
    // Mark notifications as read after opening (non-blocking)
    markNotificationsAsRead(task.name);
  }, []);

  const mandatoryFilters = useMemo<Filter[]>(() => {
    let filters: Filter[] = [];

    // Always filter by company (hidden from user)
    if (company) {
      filters.push(["company_id", "=", company]);
    }

    // Apply role-based filters for selectedTask
    if (selectedTask === "myTask") {
      // Filter tasks assigned to the current user
      filters.push(["assigned_to", "=", currentUser]);
    } else if (selectedTask === "teamTask") {
      const role = rolePermissions?.role_name;

      if (role === "Admin") {
        // Admin sees all tasks
      } else if (role === "Team Lead" && teamMembers.length > 0) {
        filters.push(["assigned_to", "in", teamMembers]);
      } else {
        filters.push(["assigned_to", "=", currentUser]);
      }
    }
    return filters;
  }, [company, selectedTask, currentUser, teamMembers, rolePermissions]);

  // Update filters when dependencies change for new ag grid
  useEffect(() => {
    const tempFilters: any[] = [...getInitialFilters];

    // Add default status filter (exclude Completed tasks by default)
    if (status) {
      if (status.includes(",")) {
        const statusArray = status.split(",").map((s) => s.trim());
        tempFilters.push(["status", "in", statusArray]);
      } else {
        tempFilters.push(["status", "like", status]);
      }
    } else {
      tempFilters.push(["status", "in", ["Due Today", "Overdue", "Upcoming"]]);
    }

    if (priority) tempFilters.push(["priority", "like", priority]);
    if (task.length > 0) {
      if (task.includes("Help") && !task.includes("Onetime")) {
        tempFilters.push(["is_help_ticket", "=", 1]);
      } else {
        tempFilters.push(["task_type", "in", task]);
      }
    }
    if (assignee.length > 0) {
      const assigneeEmails = assignee.map((user: any) => user.email);
      tempFilters.push(["assignee", "in", assigneeEmails]);
    }
    if (
      selectedTask !== "myTask" &&
      selectedTask === "teamTask" &&
      assignedTo.length > 0
    ) {
      const assignedEmails = assignedTo.map((user: any) => user.email);
      tempFilters.push(["assigned_to", "in", assignedEmails]);
    }
    if (department)
      tempFilters.push([
        "department",
        "like",
        `%${department.department_name}%`,
      ]);
    if (branch) tempFilters.push(["branch", "like", `%${branch.branch_name}%`]);

    if (department || branch) {
      if (UGUserData && UGUserData.length > 0) {
        const ugUserEmails = UGUserData.map((user: any) => user.name);
        tempFilters.push(["assigned_to", "in", ugUserEmails]);
      }
    }

    if (searchQuery)
      tempFilters.push(["task_name", "like", `%${searchQuery}%`]);
    if (tags?.length > 0) tempFilters.push(["tag", "in", tags]);
    if (fromDate && toDate) {
      // dd-mm-yyyy hh:mm a format
      // make sure to set time to start of day is 00:00:00 for fromDate and end of day for toDate 12:59:59
      const startOfFromDate = new Date(fromDate);
      startOfFromDate.setHours(0, 0, 0, 0);
      const endOfToDate = new Date(toDate);
      endOfToDate.setHours(23, 59, 59, 999);
      const formattedFromDate = format(startOfFromDate, "yyyy-MM-dd HH:mm:ss");
      const formattedToDate = format(endOfToDate, "yyyy-MM-dd HH:mm:ss");
      tempFilters.push(["due_date", ">=", formattedFromDate]);
      tempFilters.push(["due_date", "<=", formattedToDate]);
    }
    // Add delay status filter
    if (delayStatus.length > 0) {
      const delayValues = delayStatus.map((status) =>
        status === "Delayed" ? 1 : status === "On Time" ? 0 : status,
      );
      tempFilters.push(["is_delayed", "in", delayValues]);
    }

    setFilters(tempFilters);
    handleFiltersChanged(); // Trigger refresh when filters change
  }, [
    selectedTask,
    status,
    priority,
    task,
    assignee,
    assignedTo,
    department,
    branch,
    UGUserData,
    searchQuery,
    tags,
    fromDate,
    toDate,
    currentUser,
    getInitialFilters,
    handleFiltersChanged, // Add to dependency array
  ]);

  // this is for new ag grid
  const combinedFilters = useMemo(() => {
    return [...mandatoryFilters, ...filters];
  }, [mandatoryFilters, filters]);

  // Fetch unique assigned_to values for filter dropdown
  const { data: assignedToUsers } = useFrappeGetDocList<CGTaskInstance>(
    "CG Task Instance",
    {
      fields: ["assigned_to"],
      filters: mandatoryFilters,
      distinct: true,
    },
    { deps: [mandatoryFilters] },
  );

  const assignedToValues = useMemo(() => {
    const values =
      assignedToUsers?.map((doc) => doc.assigned_to).filter(Boolean) ?? [];
    const finalValues =
      selectedTask === "teamTask"
        ? teamMembers
        : values.length > 0
          ? values
          : [currentUser];
    return finalValues;
  }, [assignedToUsers, selectedTask, currentUser, teamMembers]);

  // Check screen size on mount and resize
  useEffect(() => {
    const checkScreenSize = () => {
      window.localStorage.clear();
      setTableRefreshKey((prev) => prev + 1);
      const isBelowThreshold = window.innerWidth < 500;
      setIsSmallScreen(isBelowThreshold);
    };

    // Initial check
    checkScreenSize();

    // Add event listener for window resize
    window.addEventListener("resize", checkScreenSize);

    // Cleanup event listener on component unmount
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  useEffect(() => {
    //   console.log("issmallscreen",isSmallScreen)
    //  console.log("refreshkey",tablerefreshKey)
  }, [isSmallScreen]);

  const columnDefs: ColumnProps[] = [
    {
      fieldname: "name",
      label: "ID",
      fieldtype: "Link",
      hidden: true,
      overrideProps: {
        filter: "agTextColumnFilter",
        maxWidth: 120,

        cellRenderer: (params: any) => (
          <p className="truncate text-[14px] text-[#5B5967] font-[400] flex items-center justify-center">
            #{params.data?.name}
          </p>
        ),
      },
    },
    {
      fieldname: "task_name",
      label: "Task Name",
      fieldtype: "Data",
      hidden: false,
      overrideProps: {
        filter: "agTextColumnFilter",
        floatingFilter: false,
        minWidth: isSmallScreen ? 100 : 500,
        maxWidth: isSmallScreen ? 100 : 850,
        filterParams: {
          debounceMs: 200,
          suppressMiniFilter: true,
        },
        onCellClicked: (params) => {
          handleRowClick(params.data);
        },
        //   cellStyle: {
        //     textAlign: 'left',
        // display: 'flex',
        // alignItems: 'center',
        // justifyContent: 'flex-start',
        // paddingLeft: '12px',
        // color:"red"
        //   },
        //  headerStyle: { color: 'red', 'background-color': 'green',fontSize: '14px', paddingLeft: '12px',display: 'inline-block'},
        cellClass: "task-name-cell",
        // headerClass: "my-header-center",
        cellRenderer: (params: any) => (
          <p className="truncate text-[15px] text-[#5B5967] font-[400] line-height-[18px]">
            {params.data?.task_name || "No Task Name"}
          </p>
        ),
      },
    },
    {
      fieldname: "status",
      label: "Status",
      fieldtype: "Select",
      hidden: isSmallScreen,
      overrideProps: {
        maxWidth: 150,
        // filter: "agSetColumnFilter",
        filter: true,
        floatingFilter: false,
        filterParams: {
          values: [
            "Due Today",
            "Overdue",
            "Upcoming",
            "Paused",
            "Completed",
            "Rejected",
          ],
          debounceMs: 200,
          suppressMiniFilter: true,
        },
        headerClass: "my-header-center",
        // headerStyle: { color: "black", "background-color": "yellow",
        // display: 'flex',
        // alignItems: 'center',
        // justifyContent: 'center',
        // paddingLeft: '16px'},
        cellRenderer: (params: any) => {
          const statusStyle =
            StatusStyles[params.data?.status as keyof typeof StatusStyles] ||
            "";
          // console.log("statusStyle",statusStyle)
          return (
            <div
              className={`text-[12px] font-[400] rounded-[20px] mt-2 mb-1 ml-7 text-center flex items-center justify-around ${statusStyle} max-w-20`}
              style={{ height: "calc(100% - 15px)", lineHeight: "1" }}
            >
              {params.data?.status}
            </div>
          );
        },
      },
      colorMaps: {
        Overdue: "red",
        Upcoming: "green",
        "Due Today": "yellow",
        Completed: "cyan",
      },
    },
    {
      fieldname: "task_type",
      label: "Task Type",
      fieldtype: "Data",
      hidden: true,
      overrideProps: {
        maxWidth: 120,
        filter: true,
        floatingFilter: false,
        filterParams: {
          values: ["Onetime", "Recurring", "Process", "Project"],
          debounceMs: 200,
          suppressMiniFilter: true,
        },
        cellRenderer: (params: any) => {
          if (params.data?.task_type) {
            return (
              <p className="truncate text-[14px] text-[#5B5967] font-[400] flex items-start justify-start">
                {params.data?.task_type}
              </p>
            );
          }
        },
      },
    },
    {
      fieldname: "priority",
      label: "Priority",
      fieldtype: "Select",
      hidden: isSmallScreen,
      overrideProps: {
        maxWidth: 120,
        filter: "agSetColumnFilter",
        // filter:false,
        filterParams: {
          values: ["High", "Low", "Medium"],
          debounceMs: 200,
          suppressMiniFilter: true,
        },
        //       headerStyle: {
        //   color: "black",
        //   backgroundColor: "yellow",
        //   display: "flex",
        //   justifyContent: "center", // horizontal center
        //   alignItems: "center",     // vertical center
        // },
        headerClass: "my-header-center",
        filterValueGetter: (params: any) => {
          return params.data?.priority;
        },
        suppressColumnsToolPanel: false, // Allow toggling in column panel
        cellRenderer: (params: any) => {
          const priority = PRIORITY_DATA.find(
            (p) => p.name === params.data?.priority,
          );
          return priority ? (
            <img
              src={priority.image}
              alt={priority.name}
              className="mt-4 mx-auto w-[12px] h-[12px] ml-11"
            />
          ) : null;
        },
      },
    },
    {
      fieldname: "tag",
      label: "Tag",
      fieldtype: "Data",
      hidden: true,
      overrideProps: {
        filter: "agTextColumnFilter",
      },
    },
    {
      fieldname: "due_date",
      label: "Due Date",
      fieldtype: "Datetime",
      hidden: isSmallScreen,
      filter: "agDateColumnFilter",
      overrideProps: {
        maxWidth: 150,

        // filter:false,
        floatingFilter: false,
        // headerStyle:{
        //   color: "black",
        //   "background-color": "red",
        // },
        // headerClass: "my-header-center",
        cellRenderer: (params: any) => {
          if (!params.data?.due_date) {
            return <div className="text-center">No Date</div>;
          }
          const date = new Date(params.data.due_date);
          if (isNaN(date.getTime())) {
            return <div className="text-center">Invalid Date</div>;
          }
          const today = new Date();
          const dateOptions: Intl.DateTimeFormatOptions = {
            weekday: "short",
            day: "2-digit",
            month: "short",
          };
          let formattedDate = date.toLocaleDateString("en-US", dateOptions);
          if (date.getFullYear() !== today.getFullYear()) {
            formattedDate += `, ${date.getFullYear()}`;
          }
          const timeOptions: Intl.DateTimeFormatOptions = {
            hour: "2-digit",
            minute: "2-digit",
          };
          const formattedTime = date.toLocaleTimeString("en-US", timeOptions);
          return (
            <div
              className="flex items-left justify-left flex-col gap-1 max-w-[100px]"
              style={{ lineHeight: "normal", padding: "4px 0" }}
            >
              <p className="text-[14px] text-[#5B5967] font-[400] tracking-wide">
                {formattedDate}
              </p>
              <p className="text-[12px] text-[#8A8894] font-[400] tracking-wide">
                {formattedTime}
              </p>
            </div>
          );
        },
      },
    },

    {
      fieldname: "assignee",
      label: "Assignee",
      fieldtype: "Link",
      hidden: isSmallScreen,
      overrideProps: {
        maxWidth: 130,
        filter: "agTextColumnFilter",
        // filter:false,
        // headerStyle:{
        //   color: "black",
        //   "background-color": "blue",
        // },
        headerClass: "my-header-center",
        cellRenderer: (params: any) => {
          const { data: usersData } = useUserDetailsByEmails(
            params.data.assignee,
          );
          return !params.data.assignee ? (
            <div className="text-left text-[#5B5967] mt-2 ml-3">
              No Assignee
            </div>
          ) : (
            <div className="flex justify-center mt-2 ml-3">
              <UserAssignees users={usersData || []} className="" />
            </div>
          );
        },
      },
    },
    {
      fieldname: "assigned_to",
      label: "Assigned To",
      fieldtype: "Link",
      hidden: selectedTask !== "myTask" && !isSmallScreen ? true : false,
      overrideProps: {
        maxWidth: selectedTask !== "myTask" ? 150 : 0,
        filter: selectedTask !== "myTask" ? "agSetColumnFilter" : false,
        // filter:false,
        filterParams: {
          values: assignedToValues,
          debounceMs: 200,
          suppressMiniFilter: true,
        },
        // headerStyle: {
        //   color: "black",
        //   backgroundColor: "green",
        // },
        headerClass: "my-header-center",
        cellRenderer: (params: any) => {
          if (selectedTask === "myTask") return null;
          const { data: usersData } = useUserDetailsByEmails(
            params.data.assigned_to,
          );
          return !params.data.assigned_to ? (
            <div className="text-center text-[#5B5967] mt-2 ml-3">
              No Assign to
            </div>
          ) : (
            <div className="flex justify-center mt-2 ml-3">
              <UserAssignees users={usersData || []} className="" />
            </div>
          );
        },
      },
    },
    {
      fieldname: undefined,
      label: "Action",
      hidden: false,
      overrideProps: {
        maxWidth: 100,
        // headerStyle: {
        //   color: "black",
        //   backgroundColor: "yellow",
        // },
        headerClass: "my-header-center",
        filter: false,
        cellRenderer: (params: any) => {
          const isRejected = params.data?.status === "Rejected";
          const isPaused = params.data?.status === "Paused";
          const isCompleted = params.data?.status === "Completed";
          const canComplete = canCompleteTask(params.data);

          let bgColor = "";
          let textColor = "";
          let iconContent = null;
          let hoverEffect = "";
          let tooltipMessage = "";

          if (isCompleted) {
            bgColor = "bg-[#0CA866]";
            textColor = "text-white";
            iconContent = <Check color="#fff" className="w-[14px] h-[14px]" />;
            tooltipMessage = "Task already completed";
          } else if (isRejected) {
            bgColor = "border-[1px] border-[#5B5967] bg-[#F8D7DA]";
            textColor = "text-[#721C24]";
            iconContent = <X color="#721C24" className="w-[14px] h-[14px]" />;
            tooltipMessage = "Rejected tasks cannot be completed";
          } else if (isPaused) {
            bgColor = "border-[1px] border-[#FFC107] bg-[#FFF3CD]";
            textColor = "text-[#856404]";
            hoverEffect = "hover:bg-[#FFEAA7]";
            iconContent = (
              <Check
                color="#856404"
                className="w-[14px] h-[14px] cursor-pointer"
              />
            );
            tooltipMessage = "Complete paused task";
          } else if (canComplete) {
            bgColor = "border-[1px] border-[#5B5967]";
            textColor = "text-[#5B5967]";
            hoverEffect = "hover:bg-[#EEFDF1]";
            iconContent = (
              <Check
                color="#5B5967"
                className="w-[14px] h-[14px] cursor-pointer"
              />
            );
            tooltipMessage = "Mark task as complete";
          } else {
            bgColor = "bg-[#e4edf3] border-[1px] border-[#4d4a4a]";
            textColor = "text-[#4d4a4a]";
            iconContent = (
              <Check
                color="#4d4a4a"
                className="w-[14px] h-[14px] cursor-not-allowed"
              />
            );
            tooltipMessage =
              rolePermissions?.role_name !== "Admin" &&
              params.data?.assigned_to !== currentUser
                ? "You don't have permission to mark this task as complete"
                : "Task cannot be completed";
          }

          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`${bgColor} ${textColor} ${hoverEffect} rounded-full p-1 w-fit mt-2 mx-auto cursor-${canComplete ? "pointer" : "not-allowed"}`}
                    onClick={(e) => {
                      e.stopPropagation();

                      // Only allow completion for tasks that can be completed
                      if (!canComplete || isCompleted || isRejected) {
                        return;
                      }

                      setTaskToComplete({
                        name: params.data?.name,
                        task_name: params.data?.task_name,
                        status: params.data?.status,
                      });
                      setTaskIdForFetch(params.data?.name); // Set taskId to fetch details
                      setIsDialogOpen(true);
                    }}
                  >
                    {iconContent}
                  </div>
                </TooltipTrigger>
                <Portal>
                  <TooltipContent
                    side="top"
                    className="text-white text-sm rounded-md"
                  >
                    <p>{tooltipMessage}</p>
                  </TooltipContent>
                </Portal>
              </Tooltip>
            </TooltipProvider>
          );
        },
      },
    },
    {
      fieldname: "is_delayed",
      label: "Delay Status",
      fieldtype: "Check",
      hidden: true, // Hidden but available for filtering
      overrideProps: {
        filter: "agSetColumnFilter",
        filterParams: {
          values: [0, 1],
          valueFormatter: (params: any) => {
            if (params.value === 1 || params.value === 1) return "Delayed";
            if (params.value === 0 || params.value === 0) return "On Time";
            return "Unchecked";
          },
          debounceMs: 200,
          suppressMiniFilter: true,
        },
      },
    },
  ];

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    status,
    priority,
    assignedTo,
    selectedTask,
    tags,
    fromDate,
    toDate,
    delayStatus,
  ]);

  useEffect(() => {
    mutate();
    countMutate();
  }, [
    debouncedFilters,
    currentPage,
    isOpen,
    refreshKey,
    modalOpen,
    mandatoryFilters,
    TaskData,
    tablerefreshKeys,
    delayStatus,
  ]);

  const agGridProps = {
    sideBar: {
      toolPanels: [
        {
          id: "columns",
          labelDefault: "Columns",
          labelKey: "columns",
          iconKey: "columns",
          toolPanel: "agColumnsToolPanel",
          toolPanelParams: {
            suppressRowGroups: true,
            suppressValues: true,
          },
        },
        {
          id: "filters",
          labelDefault: "Filters",
          labelKey: "filters",
          iconKey: "filter",
          toolPanel: "agFiltersToolPanel",
          toolPanelParams: {
            suppressFilterSearch: true,
            suppressExpandAll: true,
          },
        },
      ],
    },
  };

  // === Filter Component ===
  const FilterPart: JSX.Element = (
    <FilterComponent
      selectedTask={selectedTask}
      status={status}
      setStatus={(value: string) => {
        setStatus(value);
        handleFiltersChanged();
      }}
      task={task}
      setTask={(value: string[]) => {
        setTask(value);
        handleFiltersChanged();
      }}
      audit={audit}
      setAudit={(value: string) => {
        setAudit(value);
        handleFiltersChanged();
      }}
      assignedTo={assignedTo}
      setAssignedTo={(value: any[]) => {
        setAssignedTo(value);
        handleFiltersChanged();
      }}
      assignee={assignee}
      setAssignee={(value: any[]) => {
        setAssignee(value);
        handleFiltersChanged();
      }}
      priority={priority}
      setPriority={(value: string) => {
        setPriority(value);
        handleFiltersChanged();
      }}
      tags={tags}
      setTags={setTags}
      branch={branch}
      setBranch={setBranch}
      dept={department}
      setDept={setDepartment}
      fromDate={fromDate}
      setFromDate={setFromDate}
      toDate={toDate}
      setToDate={setToDate}
      teamMember={[]}
      setTeamMember={() => {}}
      scoreTab={""}
      setScoreTab={() => {}}
      scoreInterval={""}
      setScoreInterval={() => {}}
      FilterName={"Tasks"}
      excludeCompleted={false}
      setExcludeCompleted={() => {}}
      includeAllWork={false}
      setIncludeAllWork={() => {}}
      TableAPI={{ doctype: "CG Task Instance", mutate }}
      onFiltersChanged={handleFiltersChanged}
      delayStatus={delayStatus}
      setDelayStatus={(value: string[]) => {
        setDelayStatus(value);
        handleFiltersChanged();
      }}
    />
  );

  // Handle loading state for teamData
  if (!teamData) {
    return <div className="p-4 text-center">Loading teams...</div>;
  }

  return (
    <section className="space-y-4 h-full mt-[24px] w-full">
      <CommonHeader
        TableName="Tasks"
        setTableOpen={setTableOpen}
        isTableOpen={isTableOpen}
        FilterPart={FilterPart}
        setSelectedTask={setSelectedTask}
        selectedTask={selectedTask}
        setViewType={setViewType}
        viewType={viewType}
        handleExportCSV={handleExport} // This now handles all tasks with Frappe built-in export
        isExporting={isExporting} // Export loading state
        setIsOpen={setIsOpen}
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        onBranchAdded={() => {}}
        selectedBranch={null}
        isSheetOpen={false}
        setIsSheetOpen={() => {}}
        selected={selected}
        setSelected={setSelected}
        rolePermission={rolePermissions}
        listSize={listSize}
        setListSize={setListSize}
      />

      {viewType === "list" && (
        <div className="px-[5px] py-[0px] bg-white rounded-[15px] w-full">
          <div className="h-[85vh] flex flex-row relative">
            <DoctypeList
              doctype="CG Task Instance"
              key={tablerefreshKey}
              columnDefs={columnDefs}
              mandatoryFilters={combinedFilters}
              agGridProps={agGridProps}
              showModifiedColumn={false}
              defaultOrderBy="status_priority_map asc"
              haveTableName={true}
              otherFields={["status_priority_map"]}
            />
          </div>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <TaskSheetContent
              taskName={selectedTaskName}
              isOpen={isOpen}
              setIsOpen={setIsOpen}
            />
          </Sheet>
        </div>
      )}

      {viewType === "calender" && (
        <CalendarView
          year={new Date().getFullYear()}
          month={new Date().getMonth() + 1}
          tasksData={sortedTaskData || []}
          taskName={selectedTaskName}
          TaskDetailsFunc={(name: string) => {
            setIsOpen(true);
          }}
          setMutation={setMutation}
          mutation={mutation}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
        />
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTitle></DialogTitle>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>
              {taskToComplete?.status === "Paused"
                ? "Complete Paused Task"
                : "Confirm Task Completion"}
            </DialogTitle>
            <DialogDescription>
              {taskToComplete?.status === "Paused" ? (
                <>
                  Are you sure you want to mark the paused task "
                  {taskToComplete?.task_name || "Unknown Task"}" as completed?
                  <br />
                  <br />
                  <strong>Note:</strong> The due date will be automatically
                  adjusted to account for the time the task was paused.
                </>
              ) : (
                <>
                  Are you sure you want to mark the task "
                  {taskToComplete?.task_name || "Unknown Task"}" as completed?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setTaskToComplete(null);
                setTaskIdForFetch(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (taskToComplete?.name) {
                  handleTaskComplete(
                    taskToComplete.name,
                    taskDetails,
                    setTaskIdForFetch,
                  );
                }
              }}
            >
              {taskToComplete?.status === "Paused" ? "Complete" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

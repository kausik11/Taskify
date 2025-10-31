import Polygon from "@/assets/icons/upArrow.svg";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { PenLine, PlusCircleIcon, Trash2 } from "lucide-react";
import { useContext, useEffect, useMemo, useState } from "react";
import CustomCalender from "../common/CustomCalender";
import Pagination from "../common/Pagination";
import EmployeeDropDown from "../dashboard/EmployeeDropDown";
import { Checkbox } from "../ui/checkbox";
import { CGUser } from "@/types/ClapgrowApp/CGUser";
import AGComponent from "../AGComponent";
import { PRIORITY_DATA } from "@/data/common";
import UserAssignees from "../dashboard/UserAssignees";
import CombinedDropDown from "../dashboard/CombinedDropDown";
import PhoneInput from "./PhoneNoIdInput";
import { EditToggle } from "../layout/AlertBanner/CommonDesign";
import {
  useFrappeGetDocList,
  useFrappeUpdateDoc,
  useFrappeDeleteDoc,
  FrappeContext,
  FrappeConfig,
  useFrappeGetDoc,
  Filter,
} from "frappe-react-sdk";
import { toast } from "sonner";
import { UserContext } from "@/utils/auth/UserProvider";
import { useForm } from "react-hook-form";
import { useUserDetailsByEmails } from "../common/CommonFunction";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CGTaskDefinition } from "@/types/ClapgrowApp/CGTaskDefinition";
import { SpinnerLoader } from "../common/FullPageLoader/SpinnerLoader";
import DoctypeList from "../common/DataGrid/DataGridWithMeta";
import { ColumnProps } from "../common/DataGrid/DataGridComponent";
import { isFloat16Array } from "util/types";

interface TeamMemberTableProps {
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  totalRecords: number;
  recordsPerPage: number;
  currentPage: number;
  TeammemberData: CGUser[];
  onTeamMemberAdded: () => void;
}

const TeamMembersTable: React.FC<TeamMemberTableProps> = ({
  setCurrentPage,
  totalRecords,
  recordsPerPage,
  currentPage,
  TeammemberData,
  onTeamMemberAdded,
}) => {
  const { userDetails, rolePermissions, companyDetails, roleBaseName } =
    useContext(UserContext);
  const { call } = useContext(FrappeContext) as FrappeConfig;
  const { updateDoc } = useFrappeUpdateDoc<CGUser>();
  const { deleteDoc } = useFrappeDeleteDoc();
  const [viewType, setViewType] = useState<string>("personal");
  const [selected, setSelected] = useState<string[]>([]);
  const [reallocateForm, setReallocateForm] = useState<boolean>(false);
  const [assignedTo, setAssignedTo] = useState<string>("");
  console.log("assignedTo in teamMembersTable", assignedTo);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CGUser | null>(null);
  // console.log("selectedUser in teamMembersTable", selectedUser);
  const [selectupateUser, setSelectUpdateUser] = useState<CGUser | null>(null);
  // console.log("selectedUser in teamMembersTable------------------------",selectedUser)
  // console.log("selectupateUser in teamMembersTable************************",selectupateUser)
  const [type, setType] = useState<string>("Permanent");
  const [temporaryFrom, setTemporaryFrom] = useState<string | null>(null);
  const [temporaryUntil, setTemporaryUntil] = useState<string | null>(null);
  const [dueToday, setDueToday] = useState<boolean>(true);
  const [upcoming, setUpcoming] = useState<boolean>(true);
  const [overdue, setOverdue] = useState<boolean>(true);
  const [reallocationReason, setReallocationReason] = useState<string>("");
  const [isDisableDialogOpen, setIsDisableDialogOpen] =
    useState<boolean>(false);
  const [userToDisable, setUserToDisable] = useState<CGUser | null>(null);
  const [superiorName, setSuperiorName] = useState<string>("No Superior");
  const [superiorEmails, setSuperiorEmails] = useState<string[]>([]);
  const [isTeamLead, setIsTeamLead] = useState<boolean>(false);
  const [teamMemberCount, setTeamMemberCount] = useState<number>(0);
  const [isDeactivating, setIsDeactivating] = useState<boolean>(false); // Add loading state
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isFormSubmitted, setIsFormSubmitted] = useState<boolean>(false); // Track form submission

  //fetchuserDetails
  const { data: userDoc, error: userError } = useFrappeGetDoc<CGUser>(
    "CG User",
    userToDisable?.email || null,
    userToDisable?.email ? `user-${userToDisable.email}` : null,
  );

  const Fdata = [
  { name: "Ignore Holiday" },
  { name: "Next Working Date" },
  { name: "Previous Working Date" },
];

  // console.log("userDoc in teamMembersTable",userDoc)
  // Fetch specific user details when selectedUser.email changes
  // 	useMemo(() => {
  //   const { data: fetchuserDetails, isLoading: isDetailsLoading, error: detailsError } = useFrappeGetDocList<CGUser>(
  //     "CG User",
  //     {
  //       fields: [
  //         "name",
  //         "first_name",
  //         "last_name",
  //         "email",
  //         "phone",
  //         "role",
  //         "branch_id",
  //         "department_id",
  //         "company_id",
  //         "report_to",
  // 		"ctc",
  // 		"cost_per_hour"
  //       ],
  //       filters: selectedUser?.email ? [["email", "=", selectedUser.email]] : undefined,
  //       limit: 1, // Ensure only one user is fetched
  //     },
  //     {
  //       enabled: !!selectedUser?.email, // Only fetch when selectedUser.email exists
  //     }
  //   );

  // // return the data
  //   return fetchuserDetails;

  // },[selectedUser?.email]);

  // Update selectedUser when fetchuserDetails changes
  // useEffect(() => {
  //   if (fetchuserDetails && fetchuserDetails.length > 0) {
  //     setSelectedUser(fetchuserDetails[0]);
  //   } else if (detailsError) {
  //     toast.error("Failed to fetch user details.");
  //   }
  // }, [fetchuserDetails, detailsError,selectedUser]);

  const superiorId = userDoc?.report_to?.[0]?.superior;
  const { data: superiorDoc, error: superiorError } = useFrappeGetDoc<CGUser>(
    "CG User",
    superiorId || null,
    superiorId ? `superior-${superiorId}` : null,
  );

  // Add hook for checking team lead status
  const { data: userTeams } = useFrappeGetDocList("CG Team", {
    fields: ["name"],
    filters: userToDisable?.name
      ? [["team_lead", "=", userToDisable.name]]
      : [],
  });

  const {
    data: userData,
    mutate: refetchUser,
    isLoading,
    error,
  } = useFrappeGetDoc<CGUser>(
    "CG User",
    selectedUser?.email,
    selectedUser?.email ? `user-${selectedUser.email}` : null,
  );

  useEffect(() => {
    if (userData) {
      setSelectUpdateUser(userData);
    } else {
      setSelectUpdateUser(null);
    }
  }, [userData]);

  // Update superiorEmails when userData changes
  useEffect(() => {
    if (userData && userData.report_to) {
      const emails = userData.report_to
        .filter((item: any) => item.superior)
        .map((item: any) => item.superior);
      setSuperiorEmails(emails);
    } else {
      setSuperiorEmails([]);
    }
  }, [userData, refreshKey]);

  // Refetch user details after successful submission
  useEffect(() => {
    if (isFormSubmitted && selectedUser?.email) {
      refetchUser(); // Trigger refetch of user data
      setIsFormSubmitted(false); // Reset the flag
    }
  }, [isFormSubmitted, selectedUser?.email, refetchUser]);

  // Add useEffect to check team member count
  useEffect(() => {
    if (userToDisable && userTeams && userTeams.length > 0) {
      setIsTeamLead(true);

      // Count total team members across all teams
      const teamPromises = userTeams.map((team) =>
        call.get("frappe.client.get_list", {
          doctype: "CG Team Member",
          filters: { parent: team.name },
          fields: ["member"],
        }),
      );

      Promise.all(teamPromises)
        .then((memberLists: any[]) => {
          const totalMembers = memberLists.reduce(
            (sum, members) => sum + (members?.length || 0),
            0,
          );
          setTeamMemberCount(totalMembers);
        })
        .catch((error) => {
          console.error("Error counting team members:", error);
          setTeamMemberCount(0);
        });
    } else {
      setIsTeamLead(false);
      setTeamMemberCount(0);
    }
  }, [userToDisable, userTeams, call]);

  useEffect(() => {
    if (userError) {
      console.error("Error fetching user:", userError);
      setSuperiorName("Error fetching superior");
      toast.error("Failed to fetch user details for deletion confirmation.");
      return;
    }

    if (!userDoc || !userToDisable) {
      setSuperiorName("No Superior");
      return;
    }

    if (!userDoc.report_to || userDoc.report_to.length === 0) {
      setSuperiorName("No Superior");
      return;
    }

    if (superiorError) {
      console.error("Error fetching superior:", superiorError);
      setSuperiorName("Error fetching superior");
      toast.error(
        "Failed to fetch superior details for deletion confirmation.",
      );
      return;
    }

    if (superiorDoc) {
      setSuperiorName(superiorDoc.full_name || "Unknown");
    }
  }, [userDoc, superiorDoc, userError, superiorError, userToDisable]);

  const { data: taskInstances, mutate: mutateTaskInstances } =
    useFrappeGetDocList("CG Task Instance", {
      fields: [
        "name",
        "task_name",
        "task_type",
        "priority",
        "due_date",
        "assigned_to",
        "status",
        "is_completed",
      ],
      filters: selectedUser?.email
        ? [
            ["assigned_to", "=", selectedUser.email],
            ["is_completed", "=", 0],
            ["task_type", "=", "Onetime"],
            ["enabled", "=", 1],
          ]
        : [],
    });

  const { data: taskDefinitions, mutate: mutateTaskDefinitions } =
    useFrappeGetDocList<CGTaskDefinition>("CG Task Definition", {
      fields: [
        "name",
        "task_name",
        "task_type",
        "priority",
        "due_date",
        "assigned_to",
        "status",
        "is_completed",
      ],
      filters: selectedUser?.email
        ? [
            ["assigned_to", "=", selectedUser.email],
            ["enabled", "=", 1],
          ]
        : [],
    });

  const calculateTaskStatus = (
    dueDate: string,
    status: string,
    isCompleted: boolean,
  ): string => {
    if (isCompleted) return "Completed";
    if (!dueDate) return status || "Upcoming";

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    if (due < today) return "Overdue";
    if (due.toDateString() === today.toDateString()) return "Due Today";
    return "Upcoming";
  };

  const combinedTasks = useMemo(() => {
    const instances = (taskInstances || []).map((task) => ({
      ...task,
      task_type: "Onetime",
      calculated_status: task.status,
    }));
    const definitions = (taskDefinitions || []).map((task) => ({
      ...task,
      task_type: "Recurring",
      calculated_status: calculateTaskStatus(
        task.due_date,
        task.status,
        task.is_completed,
      ),
    }));
    return [...instances, ...definitions];
  }, [taskInstances, taskDefinitions]);

  const fields = [
    "full_name",
    "first_name",
    "last_name",
    "email",
    "phone",
    "designation",
    "branch_id",
    "department_id",
    "cost_per_hour",
    "role",
    "reporter",
    "user_image",
    "report_to",
  ];

  const viewOptions = [
    { label: "Personal", value: "personal", rounded: "rounded-l-[8px]" },
    { label: "Tasks", value: "tasks" },
    // { label: "Reportees", value: "team", rounded: "rounded-r-[8px]" },
  ];
  viewOptions.length == 2
    ? (viewOptions[1].rounded = "rounded-r-[8px]")
    : (viewOptions[2].rounded = "rounded-r-[8px]");

  const [editMode, setEditMode] = useState<Record<string, boolean>>(
    Object.fromEntries(fields.map((key) => [key, false])),
  );

  const [hoveredField, setHoveredField] = useState<string | null>(null);

  const handleDisableUser = async (userName: string) => {
    setIsDeactivating(true); // Start loading
    try {
      const response = await call.post(
        "clapgrow_app.clapgrow_app.doctype.cg_user.cg_user.disable_cg_user_with_reassignment",
        {
          user_name: userName,
        },
      );
      if (response.message.status === "success") {
        toast.success(response.message.message);
        onTeamMemberAdded();
      } else {
        // Handle case where response doesn't have success status
        const errorMessage =
          response.message?.message ||
          "Failed to delete user. Please try again.";
        toast.error(errorMessage);
      }
    } catch (error: any) {
      console.error("Error disabling user:", error);
      let errorMessage = "Failed to delete user. Please try again.";

      // Try to extract error message from various possible error formats
      if (error._server_messages) {
        try {
          const serverMessages = JSON.parse(error._server_messages);
          if (Array.isArray(serverMessages) && serverMessages.length > 0) {
            const parsedMessage = JSON.parse(serverMessages[0]);
            errorMessage = parsedMessage.message || errorMessage;
          }
        } catch (e) {
          console.error("Failed to parse _server_messages:", e);
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setIsDeactivating(false); // Stop loading
      setIsDisableDialogOpen(false);
      setUserToDisable(null);
    }
  };

  const handleDisableClick = (user: CGUser) => {
    setUserToDisable(user);
    setIsDisableDialogOpen(true);
  };

  const handleConfirmDisable = async () => {
    if (userToDisable) {
      try {
        await handleDisableUser(userToDisable.name);
        setSuperiorName("No Superior"); // Reset superior name
        setIsTeamLead(false);
        setTeamMemberCount(0);
      } catch (error: any) {
        console.error("Error in confirm delete:", error);
        toast.error("An unexpected error occurred while disabling the user.");
      }
    } else {
      toast.error("No user selected for disabling.");
    }
  };

  const baseColumnDefs = [
    {
      headerName: "Team member",
      field: "user",
      filter: true,
      width:150,
      cellRenderer: (params: any) => {
        const { data: usersData } = useUserDetailsByEmails(
          params.data?.email || "",
          userDetails?.[0]?.company_id,
        );
        return !params.data.email ? (
          <div className="text-center text-gray-500 mt-2">No Assignee</div>
        ) : (
          <div className="flex items-center gap-2 mt-2">
            <UserAssignees users={usersData || []} className="w-6 h-6" />
            <span className="text-sm font-medium text-gray-700">
              {params.data?.full_name || ""}
            </span>
          </div>
        );
      },
    },
    {
      headerName: "Email",
      field: "email",
      width: 270,
      filter: true,
      cellRenderer: (params: any) => (
        <p className="truncate text-[14px] text-[#5B5967] font-[400]">
          {params.data?.email}
        </p>
      ),
    },
    {
      headerName: "Phone",
      key: "phone",
      width: 270,
      filter: true,
      cellRenderer: (params: any) => (
        <p className="truncate text-[14px] text-[#5B5967] font-[400] text-center">
          {params.data?.phone}
        </p>
      ),
    },
    {
      headerName: "Designation",
      key: "designation",
      width: 270,
      filter: true,
      cellRenderer: (params: any) => (
        <p className="truncate text-[14px] text-[#5B5967] font-[400]">
          {params.data?.designation || "-"}
        </p>
      ),
    },
    {
      headerName: "Branch",
      key: "branch_id",
      width: 270,
      filter: true,
      valueGetter: (params: any) => {
        // This makes the filter work on the displayed value
        return params.data.branch_name?.split("-")[0] || "";
      },
      cellRenderer: (params: any) => {
        const branchValue =
          params.data?.branch_name || params.data?.branch_id || "-";
        const displayValue = branchValue.includes("-")
          ? branchValue.split("-")[0]
          : branchValue;
        return (
          <p className="truncate text-[14px] text-[#5B5967] font-[400]">
            {displayValue}
          </p>
        );
      },
    },
    {
      headerName: "Department",
      key: "department_id",
      width: 270,
      filter: true,
      valueGetter: (params: any) => {
        // This makes the filter work on the displayed value
        return params.data.department_id?.split("-")[0] || "";
      },
      cellRenderer: (params: any) => {
        const deptValue =
          params.data?.department_id || params.data?.branch_id || "-";
        const displayValue = deptValue.includes("-")
          ? deptValue.split("-")[0]
          : deptValue;
        return (
          <p className="truncate text-[14px] text-[#5B5967] font-[400]">
            {displayValue}
          </p>
        );
      },
    },
    {
      headerName: "Role",
      key: "role",
      width: 270,
      filter: true,
      cellRenderer: (params: any) => (
        <p className="truncate text-[14px] text-[#5B5967] font-[400]">
          {params.data?.role ? params.data.role.replace("ROLE-", "") : ""}
        </p>
      ),
    },
  ];

  const newColumnDefs: ColumnProps[] = useMemo(() => {
    const baseColumn: ColumnProps[] = [
      {
        fieldname: "full_name",
        label: "Team member",
        fieldtype: "Data",
        hidden: false,
        overrideProps: {
          width: 150,
          onCellClicked: (params) => {
            // console.log("params in onCellClicked of teamMembersTable",params)
            TaskDetailsFunc(params.data);
          },
          cellRenderer: (params: any) => {
            // const { data: name } = useFrappeGetDoc("CG User", params.data.email || "");
            // console.log("name",name);
            const { data: usersData } = useUserDetailsByEmails(
              params.data.email || "",
              userDetails?.[0]?.company_id,
            );

            // console.log("userdata in cellRenderer of teamMembersTable",usersData)
            return (
              <div className="flex items-center gap-2 mt-2">
                <UserAssignees users={usersData || []} className="w-6 h-6" />
                <span className="text-sm font-medium text-gray-700">
                  {params.data?.full_name || ""}
                </span>
              </div>
            );
          },
        },
      },
      {
        fieldname: "email",
        label: "Email",
        fieldtype: "Data",
        hidden: false,
        overrideProps: {
          maxWidth: 400,
          cellRenderer: (params: any) => (
            <p className="truncate text-[14px] text-[#5B5967] font-[400]">
              {params.data?.email}
            </p>
          ),
        },
      },
      {
        fieldname: "phone",
        label: "Phone",
        fieldtype: "Phone",
        hidden: false,
        overrideProps: {
            maxWidth: 150,
          cellRenderer: (params: any) => (
            <p className="truncate text-[14px] text-[#5B5967] font-[400]">
              {params.data?.phone}
            </p>
          ),
        },
      },
      {
        fieldname: "designation",
        label: "Designation",
        hidden: false,
        overrideProps: {
          maxWidth: 180,
          cellRenderer: (params: any) => (
            <p className="truncate text-[14px] text-[#5B5967] font-[400]">
              {params.data?.designation || "-"}
            </p>
          ),
        },
      },
      {
        fieldname: "branch_id",
        label: "Branch",
        hidden: false,
        overrideProps: {
          maxWidth: 180,
          valueGetter: (params: any) => {
            // This makes the filter work on the displayed value
            return params.data.branch_name?.split("-")[0] || "";
          },
          cellRenderer: (params: any) => {
            const branchValue =
              params.data?.branch_name || params.data?.branch_id || "-";
            const displayValue = branchValue.includes("-")
              ? branchValue.split("-")[0]
              : branchValue;
            return (
              <p className="truncate text-[14px] text-[#5B5967] font-[400]">
                {displayValue}
              </p>
            );
          },
        },
      },
      {
        fieldname: "department_id",
        label: "Department",
        hidden: false,
        overrideProps: {
          maxWidth: 180,
          valueGetter: (params: any) => {
            // This makes the filter work on the displayed value
            return params.data.department_id?.split("-")[0] || "";
          },
          cellRenderer: (params: any) => {
            const deptValue =
              params.data?.department_id || params.data?.branch_id || "-";
            const displayValue = deptValue.includes("-")
              ? deptValue.split("-")[0]
              : deptValue;
            return (
              <p className="truncate text-[14px] text-[#5B5967] font-[400]">
                {displayValue}
              </p>
            );
          },
        },
      },
      {
        fieldname:"ctc",
        label:"CTC (p.a)",
        // hidden: false,
        overrideProps: {
          maxWidth: 120,
          cellRenderer: (params: any) => {

            // <p className="truncate text-[14px] text-[#5B5967] font-[400]">
            //   {params.data?.ctc || 0}
            // </p>
            const value = params.data?.ctc || 0;
      // Format with commas (Indian numbering system)
      const formatted = new Intl.NumberFormat("en-IN").format(value);
      return (
        <p className="truncate text-[14px] text-[#5B5967] font-[400]">
          {formatted} Rs
        </p>
      );
          },
        }
      },
      {
        fieldname: "role",
        label: "User Role",
        hidden: false,
        overrideProps: {
          maxWidth: 120,
          cellRenderer: (params: any) => (
            <p className="truncate text-[14px] text-[#5B5967] font-[400] ml-6">
              {params.data?.role ? params.data.role.replace("ROLE-", "") : ""}
            </p>
          ),
        },
      },
      {
        fieldname: "cost_per_hour",
        label: "Cost Per Hour",
        hidden: true,

      },
      {
        fieldname: "ctc",
        label: "CTC",
        hidden: true,
      },
      {
        fieldname: "is_super_admin",
        label: "Action",
        hidden: false,
        overrideProps: {
          maxWidth: 100,
          filter: false,
          headerClass:"my-header-center",
          cellRenderer: (params: any) => (
            <div className="flex justify-center items-center h-full">
              {params.data?.is_super_admin == 0 && (
                <Trash2
                  className="w-5 h-5 text-red-500 cursor-pointer"
                  onClick={() => handleDisableClick(params.data)}
                />
              )}
            </div>
          ),
        },
      },
      {
        fieldname: "enabled",
        label: "Status",
        hidden: true,
      },
    ];
    // if ( roleBaseName !== "ROLE-Admin") {
    // 	baseColumn.push({
    // 		fieldname:undefined,
    // 	})
    // }

    return baseColumn;
  }, [userDetails]);

  const columnDefsMemo = useMemo(() => {
    if (rolePermissions?.team_members_write === 1) {
      return [
        ...baseColumnDefs,
        {
          headerName: "Action",
          field: "action",
          maxWidth: 80,
          filter: false,
          cellRenderer: (params: any) => (
            <div className="flex justify-center items-center h-full">
              {params.data?.is_super_admin == 0 && (
                <Trash2
                  className="w-5 h-5 text-red-500 cursor-pointer"
                  onClick={() => handleDisableClick(params.data)}
                />
              )}
            </div>
          ),
        },
      ];
    }
    return baseColumnDefs;
  }, [rolePermissions]);

  const columnTaskMemo = useMemo(
    () => [
      {
        headerName: "",
        field: "",
        maxWidth:50,
        filter: false,
        headerComponent: () => (
          <Checkbox
            checked={
              selected.length === combinedTasks.length &&
              combinedTasks.length > 0
            }
            onCheckedChange={() => {
              if (selected.length === combinedTasks.length) {
                setSelected([]);
              } else {
                setSelected(combinedTasks.map((item) => item.name));
              }
            }}
          />
        ),
        cellRenderer: (params: any) => (
          <Checkbox
            checked={selected.includes(params.data?.name)}
            onCheckedChange={() => {
              if (selected.includes(params.data?.name)) {
                setSelected(
                  selected.filter((i: any) => i !== params.data?.name),
                );
              } else {
                setSelected([...selected, params.data?.name]);
              }
            }}
          />
        ),
      },
      {
        headerName: "#",
        field: "name",
        width: 100,
        hide: true,
        filter: true,
        cellRenderer: (params: any) => (
          <p className="text-[14px] text-[#5B5967] font-[400]">
            {params.data?.name}
          </p>
        ),
      },
      {
        headerName: "Task",
        field: "task_name",
        maxWidth: 450,
        filter: true,
        cellRenderer: (params: any) => (
          <p className="truncate text-[15px] text-[#2D2C37] font-[400] line-height-[18px]">
            {params.data?.task_name}
          </p>
        ),
      },
      {
        headerName: "Type",
        field: "task_type",
        maxWidth: 100,
        filter: true,
        cellRenderer: (params: any) => (
          <p className="truncate text-[14px] text-[#5B5967] font-[400]">
            {params.data?.task_type}
          </p>
        ),
      },
      {
        headerName: "Priority",
        field: "priority",
        maxWidth: 100,
        filter: true,
        cellRenderer: (params: any) => {
          const priority = PRIORITY_DATA.find(
            (p) => p.name === params.data?.priority,
          );
          return priority ? (
            <img
              src={priority.image}
              alt={priority.name}
              className="mt-4 mx-auto"
            />
          ) : null;
        },
      },
      {
        headerName: "Due Date",
        field: "due_date",
        maxWidth: 130,
        filter: true,
        // cellRenderer: (params: any) => {
        //   const date = new Date(params.data?.due_date);
        //   const month = date.toLocaleString("en-US", { month: "short" });
        //   const day = date.getDate();
        //   const year = date.getFullYear();
        //   const time = date.toLocaleTimeString("en-US", {
        //     hour: "2-digit",
        //     minute: "2-digit",
        //     hour12: true,
        //   });
        //   return (
        //     <div className="text-center">
        //       <p className="truncate text-[14px] text-[#5B5967] font-[400]">
        //         {day} {month}, {year}
        //       </p>
        //       <span className="text-[#ACABB2] block">{time}</span>
        //     </div>
        //   );
        // },
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
              className="flex items-left justify-left flex-col gap-1"
              style={{ lineHeight: "normal", padding: "4px 0" }}
            >
              <p className="text-[14px] text-[#2D2C37] font-[400] tracking-wide">
                {formattedDate}
              </p>
              <p className="text-[12px] text-[#8A8894] font-[400] tracking-wide">
                {formattedTime}
              </p>
            </div>
          );
        },
      },
      // {
      //   headerName: "Status",
      //   field: "calculated_status",
      //   width: 150,
      //   filter: true,
      //   cellRenderer: (params: any) => (
      //     <p className="truncate text-[14px] text-[#5B5967] font-[400]">
      //       {params.data?.calculated_status}
      //     </p>
      //   ),
      // },
      {
        headerName: "Reallocate",
        field: "assigned_to",
        maxWidth: 120,
        filter: true,
        cellRenderer: (params: any) => {
          const assignedUser = {
            email: params.data?.assigned_to,
             first_name: selectedUser?.full_name?.split(" ")[0] || "",
             last_name: selectedUser?.full_name?.split(" ")[1] || "",
            image: params.data?.assigned_to_image || null,
          };
          if (!assignedUser.email) {
            return (
              <div className="text-center text-[#5B5967] mt-2">No Assignee</div>
            );
          }
          return (
            <div className="flex justify-center mt-2 mx-auto">
              <UserAssignees users={[assignedUser]} />
            </div>
          );
        },
      },
    ],
    [selected, combinedTasks],
  );

  const {
    register,
    setValue,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<CGUser>({
    defaultValues: {
      first_name: selectedUser?.first_name || "",
      last_name: selectedUser?.last_name || "",
      email: selectedUser?.email || "",
      phone: selectedUser?.phone || "",
      designation: selectedUser?.designation || "",
      role: selectedUser?.role?.replace(/^ROLE-/, "") || "",
      branch_id: selectedUser?.branch_name || selectedUser?.branch_id || "",
      department_id:
        selectedUser?.department_name || selectedUser?.department_id || "",
      //   report_to: selectedUser?.report_to || "",
      report_to: superiorEmails.length > 0 ? superiorEmails[0] : "", // Initialize with first superior email
      reporter: selectedUser?.reporter || "",
    },
  });

  useEffect(() => {
    if (selectedUser) {
      setValue("first_name", selectupateUser?.first_name || "");
      setValue("last_name", selectupateUser?.last_name || "");
      setValue(
        "branch_id",
        selectupateUser?.branch_name || selectedUser.branch_id || "",
      );
      setValue(
        "department_id",
        selectupateUser?.department_name || selectedUser.department_id || "",
      );
      setValue("role", selectupateUser?.role?.replace(/^ROLE-/, "") || "");
      setValue("phone", selectupateUser?.phone?.replace(/^(\+91-)+/, "") || "");
      setValue("email", selectupateUser?.email || "");
      setValue("designation", selectupateUser?.designation || "");
      setValue("cost_per_hour", selectupateUser?.cost_per_hour || 0);
      setValue("ctc", selectupateUser?.ctc || 0);
      //   setValue("reporter", selectupateUser?.reporter || "");
      setValue("report_to", superiorEmails.length > 0 ? superiorEmails[0] : "");
    }
  }, [selectupateUser, setValue]);

  const onSubmit = async (data: CGUser) => {
    try {
      const oldEmail = selectedUser?.email;
      const newEmail = data.email;
      const fullName =
        `${data.first_name || ""} ${data.last_name || ""}`.trim();

      const payload = {
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        phone: data.phone ? `+91-${data.phone}` : "",
        designation: data.designation || "",
        role: `ROLE-${data.role}`,
        branch_id: data.branch_id,
        department_id: data.department_id,
        // report_to: data.report_to || "",
        cost_per_hour: data.cost_per_hour,
        ctc: data.ctc,
        report_to: data.report_to ? [{ superior: data.report_to }] : [], // Send as array of objects
        reporter: data.reporter || "",
        company_id: userDetails?.[0]?.company_id || "",
        full_name: fullName || selectedUser?.full_name,
        email: newEmail,
      };

      if (newEmail !== oldEmail) {
        try {
          const renameResponse = await call.post(
            "clapgrow_app.clapgrow_app.doctype.cg_user.cg_user.rename_cg_user",
            {
              old_name: oldEmail,
              new_name: newEmail,
            },
          );

          if (
            !renameResponse.message ||
            renameResponse.message.status === "error"
          ) {
            throw new Error(
              renameResponse.message?.error ||
                "Failed to rename CG User document.",
            );
          }
        } catch (renameError: any) {
          console.error("Error renaming user:", renameError);
          let errorMessage = "Failed to update email. Please try again.";

          if (renameError._server_messages) {
            try {
              const serverMessages = JSON.parse(renameError._server_messages);
              if (Array.isArray(serverMessages) && serverMessages.length > 0) {
                const parsedMessage = JSON.parse(serverMessages[0]);
                errorMessage = parsedMessage.message || errorMessage;
              }
            } catch (e) {
              console.error("Failed to parse _server_messages:", e);
            }
          } else if (renameError.response?.data?.message) {
            errorMessage = renameError.response.data.message;
          } else if (renameError.message) {
            errorMessage = renameError.message;
          }

          toast.error(errorMessage);
          return; // Exit early if rename fails
        }
      }

      const updatedUser = await updateDoc(
        "CG User",
        newEmail || oldEmail,
        payload,
      );

      // console.log("updatedUser in teamMembersTable",updatedUser)
      if (updatedUser) {
        setSuperiorEmails([data.report_to]);
        toast.success("User details updated successfully!");
        setEditMode({
          branch_id: false,
          first_name: false,
          last_name: false,
          cost_per_hour: false,
          department_id: false,
          designation: false,
          email: false,
          full_name: false,
          phone: false,
          report_to: false,
          role: false,
        });
        onTeamMemberAdded();
        setIsOpen(false);
        setIsFormSubmitted(true);
        setRefreshKey((prev) => prev + 1);
        // window.location.reload();
      } else {
        toast.error("Failed to update user. No response received.");
      }
    } catch (error: any) {
      console.error("Error updating user:", error);
      let errorMessage = "Failed to update user. Please try again.";

      // Try to extract error message from various possible error formats
      if (error._server_messages) {
        try {
          const serverMessages = JSON.parse(error._server_messages);
          if (Array.isArray(serverMessages) && serverMessages.length > 0) {
            const parsedMessage = JSON.parse(serverMessages[0]);
            errorMessage = parsedMessage.message || errorMessage;
          }
        } catch (e) {
          console.error("Failed to parse _server_messages:", e);
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    }
  };

  const formatDateToYMD = (date: string | null): string | null => {
    if (!date) return null;
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) {
        toast.error("Invalid date format provided.");
        return null;
      }
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch (error: any) {
      console.error("Error formatting date:", error);
      toast.error("Failed to format date. Please check the date format.");
      return null;
    }
  };

  const handleReallocate = async () => {
    try {
      const instanceIds = combinedTasks
        .filter(
          (task) =>
            task.task_type === "Onetime" && selected.includes(task.name),
        )
        .map((task) => task.name);
      const taskDefinitionIds = combinedTasks
        .filter(
          (task) =>
            task.task_type === "Recurring" && selected.includes(task.name),
        )
        .map((task) => task.name);

      if (!instanceIds.length && !taskDefinitionIds.length) {
        toast.error("No tasks selected for reallocation.");
        return;
      }

      if (!assignedTo) {
        toast.error("Please select a new assignee.");
        return;
      }

      const payload = {
        instance_ids: instanceIds,
        task_definition_ids: taskDefinitionIds,
        new_assigned_to:
          typeof assignedTo === "string" ? assignedTo : assignedTo.email || "",
        reallocation_type: type,
        temporary_from: formatDateToYMD(temporaryFrom),
        temporary_until: formatDateToYMD(temporaryUntil),
        due_today: dueToday,
        upcoming: upcoming,
        overdue: overdue,
        company_id: userDetails?.[0]?.company_id || null,
        reallocation_reason: reallocationReason,
      };

      const response = await call.post(
        "clapgrow_app.clapgrow_app.doctype.cg_task_reallocation.cg_task_reallocation.bulk_reallocate_tasks",
        payload,
      );

      if (response.message.status === "success") {
        toast.success(response.message.message);
        setReallocateForm(false);
        setSelected([]);
        setAssignedTo("");
        setTemporaryFrom(null);
        setTemporaryUntil(null);
        mutateTaskInstances();
        mutateTaskDefinitions();
      } else {
        const errorMessage =
          response.message?.message || "Failed to reallocate tasks.";
        toast.error(errorMessage);
      }
    } catch (error: any) {
      console.error("Error reallocating tasks:", error);
      let errorMessage = "Failed to reallocate tasks. Please try again.";

      // Try to extract error message from various possible error formats
      if (error._server_messages) {
        try {
          const serverMessages = JSON.parse(error._server_messages);
          if (Array.isArray(serverMessages) && serverMessages.length > 0) {
            const parsedMessage = JSON.parse(serverMessages[0]);
            errorMessage = parsedMessage.message || errorMessage;
          }
        } catch (e) {
          console.error("Failed to parse _server_messages:", e);
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    }
  };

  // const userDetails = useMemo((user:any) => {
  // 	return useUserDetailsByEmails(user.email || "", userDetails?.[0]?.company_id);
  // }, [user.email, userDetails?.[0]?.company_id]);

  const TaskDetailsFunc = (user: any) => {
    try {
      if (!user) {
        toast.error("No user data available to display details.");
        return;
      }

      // 			 const { data: fetchuserDetails, isLoading: isDetailsLoading, error: detailsError } = useFrappeGetDocList<CGUser>(
      //     "CG User",
      //     {
      //       fields: [
      //         "name",
      //         "first_name",
      //         "last_name",
      //         "email",
      //         "phone",
      //         "role",
      //         "branch_id",
      //         "department_id",
      //         "company_id",
      //         "report_to",
      // 		"ctc",
      // 		"cost_per_hour"
      //       ],
      //       filters: selectedUser?.email ? [["email", "=", selectedUser.email]] : undefined,
      //       limit: 1, // Ensure only one user is fetched
      //     },
      //     {
      //       enabled: !!selectedUser?.email, // Only fetch when selectedUser.email exists
      //     }
      //   );
      //   console.log("Fetched user details:", fetchuserDetails);
      setSelectedUser(user);
      setIsOpen(true);
    } catch (error: any) {
      console.error("Error opening user details:", error);
      toast.error("Failed to open user details. Please try again.");
    }
  };
  //    console.log("selectedUser in teamMembersTable",selectedUser)
  // Define default filters for DoctypeList
  const defaultFilters = useMemo<Filter[]>(() => {
    const filters: Filter[] = [];
    filters.push(["enabled", "=", 1]);
    return filters;
  }, []);

  const mandatoryFilters = useMemo<Filter>(() => {
     let filterss: Filter[] = [];
     filterss.push(["assigned_to", "=", "kausik.sahaa@clapgrow.com"])

     return filterss;

  },[selectedUser])

  const selectedColumnsDefs: ColumnProps[] = [
    {
      fieldname:"task_name",
      label:"Task Name",
      fieldtype:"Data",
      hidden:false
    }
  ]
  return (
    <div className="bg-white rounded-[15px] w-full">
      <div className="rounded-[15px] overflow-x-auto border-[1px] border-[#F0F1F2]">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          {/* <AGComponent
						tableData={TeammemberData}
						columnDefsMemo={columnDefsMemo}
						onRowClicked={(event) => {
							TaskDetailsFunc(event);
						}}
						tableType="MemberSheet"
						TableHeight="500px"
					/> */}
          <div className="h-[90vh] flex flex-row">
            <DoctypeList
              key={refreshKey} // Use refreshKey to force remount
              doctype="CG User"
              columnDefs={newColumnDefs}
              showCheckboxColumn={false}
              showModifiedColumn={false}
              mandatoryFilters={defaultFilters}
            />
          </div>
          {rolePermissions?.team_members_write === 1 && isOpen && (
            <SheetContent className="w-[100vw] md:min-w-[55vw] px-[30px] pt-1">
              <div className="w-full h-full mt-2">
                <div className="flex items-center justify-between pr-[20px]">
                  <p className="focus:outline-0 py-2 font-[600] text-2xl">
                    {selectedUser?.full_name}
                  </p>
                </div>
                <div className="pt-2 space-y-3 max-h-[80vh] overflow-y-scroll mt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center rounded-[8px] text-[14px]">
                      {viewOptions.map(({ label, value, rounded }) => (
                        <p
                          key={value}
                          onClick={() => setViewType(value)}
                          className={cn(
                            `py-[5px] px-[6px] text-[12px] font-[400] cursor-pointer border-collapse border ${rounded}`,
                            viewType === value
                              ? "bg-[#038EE2] border-[#038EE2] text-white"
                              : "bg-white border-[#D0D3D9]",
                          )}
                        >
                          {label}
                        </p>
                      ))}
                    </div>
                    {viewType === "tasks" && selected.length > 0 && (
                      <div
                        className="flex items-center gap-3 font-[600] cursor-pointer text-[#0076BD] text-[14px]"
                        onClick={() => setReallocateForm(!reallocateForm)}
                      >
                        <PenLine className="w-4 h-4" />
                        Reallocate Tasks
                      </div>
                    )}
                  </div>
                  <div className="pt-2 space-y-3 max-h-[80vh] overflow-y-scroll mt-4">
                    {viewType === "personal" && (
                      <div className="grid divide-y divide-gray-200">
                        {[
                          {
                            label: "Name",
                            value: `${selectedUser?.full_name || ""}`.trim(),
                            key: "full_name",
                          },
                          {
                            label: "Email",
                            value: selectedUser?.email,
                            key: "email",
                          },
                          {
                            label: "Phone number",
                            value: selectedUser?.phone,
                            key: "phone",
                          },
                          {
                            label: "Designation",
                            value: selectedUser?.designation,
                            key: "designation",
                          },
                          {
                            label: "Branch",
                            value:
                              selectedUser?.branch_name ||
                              selectedUser?.branch_id?.split("-")[0],
                            key: "branch_id",
                          },
                          {
                            label: "Department",
                            value:
                              selectedUser?.department_name ||
                              selectedUser?.department_id.split("-")[0],
                            key: "department_id",
                          },
                          {
                            label: "Cost per hour",
                            value: selectedUser?.cost_per_hour,
                            key: "cost_per_hour",
                          },
                          {
                            label: "CTC",
                            value: selectedUser?.ctc,
                            key: "CTC",
                          },
                          {
                            label: "User Role",
                            value:
                              selectedUser?.role?.replace(/^ROLE-/, "") || "",
                            key: "role",
                          },
                          // {
                          // 	label: "Reportee",
                          // 	value: selectupateUser?.reporter,
                          // 	// value:
                          // 	// 	superiorEmails.length > 0
                          // 	// 		? superiorEmails.join(", ")
                          // 	// 		: "No Superior",
                          // 	key: "reporter",
                          // },
                          {
                            label: "Report To",
                            //the value should be the full name of the user
                            //find the full name of the user
                            value:
                              superiorEmails.length > 0
                                ? superiorEmails
                                    .map((email) => {
                                      const superiorUser = TeammemberData.find(
                                        (user) => user.email === email,
                                      );
                                      return superiorUser?.full_name || email;
                                    })
                                    .join(", ")
                                : "No Superior",
                            key: "report_to",
                          },
                        ].map(({ label, value, key }, idx) => (
                          <div
                            key={idx}
                            className={`py-3 flex flex-col md:flex-row md:items-center justify-between w-full space-x-4 px-3 rounded-[8px] mb-2 ${editMode[key] ? "bg-[#F1F5FA]" : ""}`}
                            onMouseEnter={() => setHoveredField(key)}
                            onMouseLeave={() => setHoveredField(null)}
                          >
                            <div className="flex space-x-4">
                              <p className="w-40 text-sm font-semibold text-gray-600">
                                {label}
                              </p>
                              <div className="flex items-center space-x-1">
                                {!editMode[key] ? (
                                  <p className="text-sm">{value}</p>
                                ) : key === "full_name" ? (
                                  <div className="w-[500px] flex flex-col gap-2">
                                    <div className="flex items-center gap-4">
                                      <div className="w-1/2">
                                        <div className="flex flex-col gap-1 h-[50px]">
                                          <input
                                            id="first_name"
                                            {...register("first_name")}
                                            placeholder="First name"
                                            className="w-full border border-[#D0D3D9] rounded-[8px] px-3 py-2 focus:outline-none placeholder:text-[#ACABB2] transition-all duration-200 ease-in-out"
                                          />
                                        </div>
                                      </div>
                                      <div className="w-1/2">
                                        <div className="flex flex-col gap-1 h-[50px]">
                                          <input
                                            id="last_name"
                                            {...register("last_name")}
                                            placeholder="Last name"
                                            className="w-full border border-[#D0D3D9] rounded-[8px] px-3 py-2 focus:outline-none placeholder:text-[#ACABB2] transition-all duration-200 ease-in-out"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ) : key === "branch_id" ? (
                                  <CombinedDropDown
                                    className="border-none text-gray-700"
                                    DataType="isBranchData"
                                    value={watch("branch_id")}
                                    handleSelect={(selectedBranch) => {
                                      return setValue(
                                        "branch_id",
                                        selectedBranch.name,
                                      );
                                    }}
                                    placeholder="Select Branch"
                                    getKey={(item) => item.name}
                                    renderItem={(item) =>
                                      item?.branch_name || item?.name
                                    }
                                  />
                                ) : key === "department_id" ? (
                                  <CombinedDropDown
                                    className="border-none text-gray-700"
                                    DataType="isDepartmentData"
                                    value={watch("department_id")}
                                    handleSelect={(selectedDept) => {
                                      return setValue(
                                        "department_id",
                                        selectedDept.name,
                                      );
                                    }}
                                    placeholder="Select Department"
                                    getKey={(item) => item.name}
                                    renderItem={(item) =>
                                      item?.department_name || item?.name
                                    }
                                  />
                                ) : key === "role" ? (
                                  <CombinedDropDown
                                    className="border-none text-gray-700"
                                    DataType="isRoleData"
                                    value={watch("role")}
                                    handleSelect={(selectedRole) => {
                                      const roleName =
                                        typeof selectedRole === "string"
                                          ? selectedRole
                                          : selectedRole?.role_name || "";
                                      setValue("role", roleName);
                                    }}
                                    placeholder="Select Role"
                                    getKey={(item) => item.name}
                                    renderItem={(item) =>
                                      item?.role_name || item?.name
                                    }
                                  />
                                ) : key === "phone" ? (
                                  <>
                                    <PhoneInput
                                      onPhoneNumberChange={(phone: string) =>
                                        setValue("phone", phone)
                                      }
                                    />
                                    <input
                                      type="text"
                                      {...register("phone")}
                                      className="border px-2 py-2 text-sm rounded-[8px]"
                                    />
                                  </>
                                ) : key === "report_to" ? (
                                  <CombinedDropDown
                                    className="border-none text-gray-700"
                                    DataType="isEmployeeData"
                                    value={watch("report_to")}
                                    handleSelect={(selectedUser) => {
                                      // console.log("Selected user for report_to:", selectedUser);
                                      const email =
                                        typeof selectedUser === "string"
                                          ? selectedUser
                                          : selectedUser?.email || "";
                                      setValue("report_to", email);
                                    }}
                                    placeholder="Select Report To"
                                    getKey={(item) => {
                                      return item.email;
                                    }}
                                    // renderItem={(item) => item?.email || ""}
                                    //console log to see item structure
                                    renderItem={(item) => {
                                      return item?.email || "";
                                    }}
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    {...register(key as keyof CGUser)}
                                    defaultValue={
                                      watch(key as keyof CGUser) || ""
                                    }
                                    className="border px-2 py-2 text-sm rounded-[8px]"
                                  />
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center">
                                {hoveredField === key && (
                                  <EditToggle
                                    fieldKey={key}
                                    toggleEditMode={setEditMode}
                                    editMode={editMode}
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {viewType === "team" && (
                      <div className="flex justify-between border-b-[1px] border-[#F0F1F2]">
                        <div className="py-3 flex flex-col md:flex-row md:items-center max-md:gap-y-3 justify-start w-full">
                          <p className="w-[160px] text-[14px] font-[600] text-[#5B5967]">
                            Assigned To
                            <span className="text-[#D72727]">*</span>
                          </p>
                          <EmployeeDropDown
                            value={assignedTo}
                            handleSelect={(value) => setAssignedTo(value)}
                            placeholder="Select Member"
                            containerClassname="w-full md:w-[12vw]"
                            className="w-full border-none text-[#0076BD] p-0 font-[400]"
                          />
                        </div>
                        <div className="flex items-center gap-x-2 cursor-pointer">
                          <PlusCircleIcon
                            color="#038EE2"
                            width={"18px"}
                            height={"18px"}
                            className="bg-[#D4EFFF] rounded-full"
                          />
                          <p className="font-[400] text-nowrap text-[#0076BD] text-[14px]">
                            Add new members
                          </p>
                        </div>
                      </div>
                    )}
                    {viewType === "tasks" && (
                      <section>
                        {reallocateForm && selected.length > 0 && (
                          <div className="bg-[#f0f4fa] h-auto my-2 mb-4 rounded-[8px] border-b-[1px] border-[#0076BD] relative">
                            <img
                              src={Polygon}
                              className="absolute -top-[0.6rem] right-5"
                            />
                            <div className="flex flex-col gap-y-[20px] py-4 px-6">
                              <div className="w-full flex items-center">
                                <span className="text-[#5B5967] w-[100px] text-[14px] font-[600]">
                                  Type
                                </span>
                                <div className="w-[60%] mr-auto flex gap-x-5">
                                  <label className="flex font-[400] text-[14px] items-center gap-x-2">
                                    <input
                                      type="radio"
                                      name="type"
                                      value="Permanent"
                                      checked={type === "Permanent"}
                                      className="p-1.5 rounded-[8px] w-[20px] h-[20px] bg-transparent outline-none accent-[#0076BD]"
                                      onChange={() => setType("Permanent")}
                                    />
                                    Permanent
                                  </label>
                                  <label className="flex font-[400] text-[14px] items-center gap-x-2">
                                    <input
                                      type="radio"
                                      name="type"
                                      value="Temporary"
                                      checked={type === "Temporary"}
                                      className="p-1.5 rounded-[8px] w-[20px] h-[20px] bg-transparent outline-none accent-[#0076BD]"
                                      onChange={() => setType("Temporary")}
                                    />
                                    Temporary
                                  </label>
                                </div>
                              </div>
                              <div className="w-full flex items-center">
                                <span className="text-[#5B5967] w-[90px] text-[14px] font-[600]">
                                  Allocation
                                </span>
                                <div className="max-w-[60%] mr-auto flex gap-x-5">
                                  {/* <EmployeeDropDown
                                    value={assignedTo}
                                    handleSelect={(value) =>
                                      setAssignedTo(value)
                                    }
                                    placeholder="Select Assignee"
                                    containerClassname="w-full md:w-[10vw]"
                                    className="w-full border-none text-[#2D2C37] font-[600] bg-transparent p-0"
                                  /> */}
                                   <CombinedDropDown
                                    className="border-none text-gray-700 font-[600] bg-transparent"
                                    DataType="isEmployeeData"
                                    value={assignedTo}
                                    handleSelect={(selectedUser) => {
                                      const email =
                                        typeof selectedUser === "string"
                                          ? selectedUser
                                          : selectedUser?.email || "";
                                      setAssignedTo(email);
                                    }}
                                    placeholder="Select Assignee"
                                    // getKey={(item) => item.email}
                                    // renderItem={(item) =>
                                    //   item?.full_name || item?.email || ""
                                    // }
                                  />
                                </div>
                              </div>
                              {type === "Temporary" && (
                                <div className="w-full flex items-center gap-y-[20px]">
                                  <span className="text-[#5B5967] w-[100px] mb-auto text-[14px] font-[600]">
                                    Date
                                  </span>
                                  <div className="w-[100%] mr-auto flex flex-col items-start justify-start gap-x-5">
                                    <div className="flex gap-x-3 flex-row justify-start"> 
                                      <div className="max-w-[180px]">
                                      <CustomCalender
                                        onChange={(value) =>
                                          setTemporaryFrom(value)
                                        }
                                        containerClassName="w-full md:w-[10vw] cursor-pointer border-none text-[#0076BD] p-0 bg-transparent"
                                        text="Select Date (From)"
                                        format="yyyy-mm-dd"
                                      />
                                      </div>
                                      <p>-</p>
                                      <div className="max-w-[100px]">
                                      <CustomCalender
                                        onChange={(value) =>
                                          setTemporaryUntil(value)
                                        }
                                        containerClassName="w-full md:w-[10vw] cursor-pointer border-none text-[#0076BD] p-0 bg-transparent"
                                        text="Select Date (To)"
                                        format="yyyy-mm-dd"
                                      />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                              <div className="w-full flex items-center gap-y-[20px]">
                                <span className="text-[#5B5967] w-[98px] text-[14px] font-[600]">
                                  Status Filters
                                </span>
                                <div className="w-[60%] mr-auto flex gap-x-5 ml-1">
                                  <label className="flex font-[400] text-[14px] items-center gap-x-2">
                                    {/* <input
                                      type="checkbox"
                                      checked={dueToday}
                                      onChange={() => setDueToday(!dueToday)}
                                    /> */}
                                     <Checkbox
                                    checked={dueToday}
                                     onCheckedChange={() => setDueToday(!dueToday)}
                                     />
                                    Due Today
                                  </label>
                                  <label className="flex font-[400] text-[14px] items-center gap-x-2">
                                    {/* <input
                                      type="checkbox"
                                      checked={upcoming}
                                      onChange={() => setUpcoming(!upcoming)}
                                    /> */}
                                     <Checkbox
                                    checked={upcoming}
                                     onCheckedChange={() => setUpcoming(!upcoming)}
                                     />
                                    Upcoming
                                  </label>
                                  <label className="flex font-[400] text-[14px] items-center gap-x-2">
                                    {/* <input
                                      type="checkbox"
                                      checked={overdue}
                                      onChange={() => setOverdue(!overdue)}
                                    /> */}
                                     <Checkbox
                                    checked={overdue}
                                     onCheckedChange={() => setOverdue(!overdue)}
                                     />
                                    Overdue
                                  </label>
                                </div>
                              </div>
                              <div className="w-full flex items-center gap-y-[20px]">
                                <span className="text-[#5B5967] w-[100px] text-[14px] font-[600]">
                                  Reason
                                </span>
                                <div className="w-[60%] mr-auto">
                                  <input
                                    type="text"
                                    value={reallocationReason}
                                    onChange={(e) =>
                                      setReallocationReason(e.target.value)
                                    }
                                    placeholder="Enter reallocation reason"
                                    className="w-full border border-[#D0D3D9] rounded-[8px] px-3 py-2 focus:outline-none placeholder:text-[#ACABB2]"
                                  />
                                </div>
                              </div>
                              <button
                                className="bg-[#038EE2] mr-auto px-[36px] py-[9.5px] mb-[16px] w-fit rounded-[8px] text-white font-[600] text-[14px]"
                                onClick={handleReallocate}
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        )}
                        <AGComponent
                          tableData={combinedTasks}
                          columnDefsMemo={columnTaskMemo}
                          // onRowClicked={(event) => {
                          //   TaskDetailsFunc(event);
                          // }}
                          tableType={null}
                          TableHeight="700px"
                        />
                        {/* <div className="h-[70vh] flex flex-row">
                        <DoctypeList
                        doctype="CG Task Instance"
                        showModifiedColumn={false}
                        mandatoryFilters={mandatoryFilters}
                       columnDefs={selectedColumnsDefs}
                       showCheckboxColumn={false}
                        />
                        </div> */}
                      </section>
                    )}
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 flex items-center justify-between gap-x-3 bg-white w-full border-t border-[#bbbbbb] px-[30px] py-[24px]">
                  <button
                    onClick={handleSubmit(onSubmit)}
                    disabled={isSubmitting}
                    className={`bg-[#038EE2] px-4 py-1.5 w-fit rounded-[8px] text-white font-[600] text-[14px] ml-auto ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {isSubmitting ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </SheetContent>
          )}
        </Sheet>
        <Dialog
          open={isDisableDialogOpen}
          onOpenChange={setIsDisableDialogOpen}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Confirm Delete User</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the user{" "}
                {userToDisable?.full_name || userToDisable?.name}?
                <br />
                <br />
                All tasks assigned to them as assignee will be moved to:{" "}
                <strong>{superiorName}</strong>
                <br />
                {isTeamLead && teamMemberCount > 0 && (
                  <>
                    <br />
                    Additionally, {teamMemberCount} team member(s) under their
                    leadership will be reassigned to:{" "}
                    <strong>{superiorName}</strong>
                  </>
                )}
                {/* {isTeamLead && teamMemberCount === 0 && (
									<>
										<br />
										Their empty team will be removed.
									</>
								)} */}
                <br />
                All users who report to them will now report to:{" "}
                <strong>{superiorName}</strong>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDisableDialogOpen(false);
                  setUserToDisable(null);
                  setSuperiorName("No Superior");
                  setIsTeamLead(false);
                  setTeamMemberCount(0);
                }}
                disabled={isDeactivating}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDisable}
                disabled={isDeactivating}
                className={`${isDeactivating ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {isDeactivating ? (
                  <>
                    <SpinnerLoader className="mr-2" />
                    Deleting...
                  </>
                ) : (
                  "Delete User"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {/* <Pagination
				setCurrentPage={setCurrentPage}
				totalRecords={totalRecords || 0}
				recordsPerPage={recordsPerPage}
				currentPage={currentPage}
			/> */}
    </div>
  );
};

export default TeamMembersTable;

import { UserContext } from "@/utils/auth/UserProvider";
import { useContext, useEffect, useMemo, useState } from "react";
import { useFrappeGetDocList } from "frappe-react-sdk";
import CreateRoleSheet from "./CreateRoleSheet";
import EditRoleSheet from "./EditRoleSheet";
import AGComponent from "../AGComponent";
import { ColumnProps } from "../common/DataGrid/DataGridComponent";
import { debounce } from "lodash";
import DoctypeList from "../common/DataGrid/DataGridWithMeta";

// export interface RoleData {
//   role: string;
//   assignTasksTo: string;
//   canCreate: string;
//   settings: string;
//   access: string;
//   backendRole: string;
// }

export interface RoleData {
  name: string;
  role_name: string;
  assign_team_member: boolean;
  assign_team_lead: boolean;
  assign_admin: boolean;
  assign_self: boolean;
  create_onetime_task: boolean;
  create_recurring_task: boolean;
  create_fms: boolean;
  create_help_ticket: boolean;
  branches_create: boolean;
  branches_delete: boolean;
  branches_read: boolean;
  branches_write: boolean;
  holiday_create: boolean;
  holiday_delete: boolean;
  holiday_read: boolean;
  holiday_write: boolean;
  team_members_create: boolean;
  team_members_delete: boolean;
  team_members_read: boolean;
  team_members_write: boolean;
  notifications_create: boolean;
  notifications_delete: boolean;
  notifications_read: boolean;
  notifications_write: boolean;
  tags_create: boolean;
  tags_delete: boolean;
  tags_read: boolean;
  tags_write: boolean;
  roles_create: boolean;
  roles_delete: boolean;
  roles_read: boolean;
  roles_write: boolean;
  mis: boolean;
  smart_insights: boolean;
  backendRole?: string;
  assignTasksTo?: string;
  canCreate?: string;
  settings?: string;
  access?: string;
}

const HierarchyComponent = () => {
  const { roleBaseName } = useContext(UserContext);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleData | null>(null);

  // Fetch CG Role documents
  const {
    data: roles,
    isLoading,
    mutate,
    error,
  } = useFrappeGetDocList<RoleData>("CG Role", {
    fields: [
      "name",
      "role_name",
      "assign_team_member",
      "assign_team_lead",
      "assign_admin",
      "assign_self",
      "create_onetime_task",
      "create_recurring_task",
      "create_fms",
      "create_help_ticket",
      "branches_create",
      "branches_delete",
      "branches_read",
      "branches_write",
      "holiday_create",
      "holiday_delete",
      "holiday_read",
      "holiday_write",
      "team_members_create",
      "team_members_delete",
      "team_members_read",
      "team_members_write",
      "notifications_create",
      "notifications_delete",
      "notifications_read",
      "notifications_write",
      "tags_create",
      "tags_delete",
      "tags_read",
      "tags_write",
      "roles_create",
      "roles_delete",
      "roles_read",
      "roles_write",
      "mis",
      "smart_insights",
    ],
  });


  // Map backend role names to display names
  const roleDisplayMap: Record<string, string> = {
    "ROLE-Admin": "Admin",
    "ROLE-Member": "Member",
    "ROLE-Team Lead": "Team Lead",
  };

  // Map roles to table data
  const roleData: RoleData[] =
    roles?.map((role) => {
      const assignTasksTo =
        [
          role.assign_team_member ? "Team Member" : "",
          role.assign_team_lead ? "Team Lead" : "",
          role.assign_admin ? "Admin" : "",
          role.assign_self ? "Self" : "",
        ]
          .filter(Boolean)
          .join(", ") || "None";

      const canCreate =
        [
          role.create_onetime_task ? "One-time Task" : "",
          role.create_recurring_task ? "Recurring Task" : "",
          role.create_fms ? "FMS" : "",
          role.create_help_ticket ? "Help Ticket" : "",
        ]
          .filter(Boolean)
          .join(", ") || "None";

      const settings =
        [
          role.branches_create ||
          role.branches_delete ||
          role.branches_read ||
          role.branches_write
            ? "Branches"
            : "",
          role.holiday_create ||
          role.holiday_delete ||
          role.holiday_read ||
          role.holiday_write
            ? "Holiday"
            : "",
          role.team_members_create ||
          role.team_members_delete ||
          role.team_members_read ||
          role.team_members_write
            ? "Team Members"
            : "",
          role.notifications_create ||
          role.notifications_delete ||
          role.notifications_read ||
          role.notifications_write
            ? "Notifications"
            : "",
          role.tags_create ||
          role.tags_delete ||
          role.tags_read ||
          role.tags_write
            ? "Tags"
            : "",
          role.roles_create ||
          role.roles_delete ||
          role.roles_read ||
          role.roles_write
            ? "Roles"
            : "",
        ]
          .filter(Boolean)
          .join(", ") || "None";

      const access =
        [role.mis ? "MIS" : "", role.smart_insights ? "Smart Insights" : ""]
          .filter(Boolean)
          .join(", ") || "None";

      return {
        role: roleDisplayMap[role.role_name] || role.role_name,
        assignTasksTo,
        canCreate,
        settings,
        access,
        backendRole: role.name,
      };
    }) || [];

  const columns = [
    {
      headerName: "Roles",
      field: "role",
      width: 270,
      filter: true,
      cellRenderer: (params: any) => (
        <p className="truncate text-[14px] text-[#5B5967] font-[400]">
          {params.data?.role}
        </p>
      ),
    },
    {
      headerName: "Assign Tasks to",
      field: "assignTasksTo",
      width: 270,
      filter: true,
      cellRenderer: (params: any) => (
        <p className="truncate text-[14px] text-[#5B5967] font-[400]">
          {params.data?.assignTasksTo}
        </p>
      ),
    },
    {
      headerName: "Can Create",
      field: "canCreate",
      width: 270,
      filter: true,
      cellRenderer: (params: any) => (
        <p className="truncate text-[14px] text-[#5B5967] font-[400]">
          {params.data?.canCreate}
        </p>
      ),
    },
    {
      headerName: "Settings",
      field: "settings",
      width: 270,
      filter: true,
      cellRenderer: (params: any) => (
        <p className="truncate text-[14px] text-[#5B5967] font-[400]">
          {params.data?.settings}
        </p>
      ),
    },
    {
      headerName: "Access",
      field: "access",
      width: 270,
      filter: true,
      cellRenderer: (params: any) => (
        <p className="truncate text-[14px] text-[#5B5967] font-[400]">
          {params.data?.access}
        </p>
      ),
    },
  ];

  // Handle row click to open edit sheet
  const handleRowClick = (role: RoleData) => {
	// console.log("role in handleRowClick",role);
    setSelectedRole({
	  backendRole: role?.name?.toString() || "",
	});
    setEditSheetOpen(true);
  };

  const columnDefs: ColumnProps[] = useMemo(() => {
    const columns: ColumnProps[] = [
      {
        fieldname: "role_name",
        label: "Roles",
        fieldtype: "Data",
        hidden: false,
        overrideProps: {
          filter: "agTextColumnFilter",
          maxWidth: 200,
          flex: 1,
          filterParams: {
            debounceMS: 500,
            supressMiniFilter: true,
          },
          onCellClicked: ({ data }: { data: RoleData }) => {
			// console.log("onclick role",data);
            handleRowClick(data);
          },
          cellRenderer: ({ data }: { data: RoleData }) => (
            <p
              className="truncate text-[14px] text-[#5B5967] font-[400] cursor-pointer"
              onClick={() => handleRowClick(data)}
            >
              {roleDisplayMap[data.role_name] || data.role_name}
            </p>
          ),
        },
      },
      {
        fieldname: undefined,
        label: "Assign Tasks to",
        fieldtype: "Data",
        hidden: false,
        overrideProps: {
          filter: "false",
          minWidth: 270,
          flex: 1,
          filterParams: {
            debounceMs: 200,
            suppressMiniFilter: true,
          },
          cellRenderer: ({ data }: { data: RoleData }) => {
			const { data: roleData } = useFrappeGetDocList<RoleData>(
        "CG Role",
        {
          fields: [
            "assign_team_member",
            "assign_team_lead",
            "assign_admin",
            "assign_self",
          ],
          filters: [["name", "=", data.name]], // Filter by the current row's name
          limit: 1,
        }
      );
	  if (isLoading || !roleData || roleData.length === 0) {
        return <p className="truncate text-[14px] text-[#5B5967] font-[400]">Loading...</p>;
      }
          const assignTasksTo = [
            roleData[0]?.assign_team_member ? "Team Member" : "",
            roleData[0]?.assign_team_lead ? "Team Lead" : "",
             roleData[0]?.assign_admin ? "Admin" : "",
             roleData[0]?.assign_self ? "Self" : "",
          ]
            .filter(Boolean)
            .join(", ") || "None";

          return (
            <p className="truncate text-[14px] text-[#5B5967] font-[400]">
              {assignTasksTo}
            </p>
          );
        },
        },
      },
      {
        fieldname: undefined,
        label: "Can Create",
        fieldtype: "Data",
        hidden: false,
        overrideProps: {
          filter: "false",
          minWidth: 270,
          flex: 1,
          filterParams: {
            debounceMs: 200,
            suppressMiniFilter: true,
          },
          cellRenderer: ({ data }: { data: RoleData }) => {
			const { data: roleData } = useFrappeGetDocList<RoleData>(
		"CG Role",
		{
			fields: [
				"create_onetime_task",
				"create_recurring_task",
				"create_fms",
				"create_help_ticket",
			],
			filters: [["name", "=", data.name]], // Filter by the current row's name
			limit: 1,
		}
	);
	if (isLoading || !roleData || roleData.length === 0) {
        return <p className="truncate text-[14px] text-[#5B5967] font-[400]">Loading...</p>;
      }
            const canCreate =
              [
                roleData[0].create_onetime_task ? "One-time Task" : "",
                roleData[0].create_recurring_task ? "Recurring Task" : "",
                roleData[0].create_fms ? "FMS" : "",
                roleData[0].create_help_ticket ? "Help Ticket" : "",
              ]
                .filter(Boolean)
                .join(", ") || "None";
            return (
              <p className="truncate text-[14px] text-[#5B5967] font-[400]">
                {canCreate}
              </p>
            );
          },
        },
      },
      {
        fieldname: undefined,
        label: "Settings",
        fieldtype: "Data",
        hidden: false,
        overrideProps: {
          filter: "false",
          minWidth: 270,
          flex: 1,
          filterParams: {
            debounceMs: 200,
            suppressMiniFilter: true,
          },
          cellRenderer: ({ data }: { data: RoleData }) => {
			const { data: roleData } = useFrappeGetDocList<RoleData>(
		"CG Role",
		{
			fields: [
				"branches_create",
				"branches_delete",
				"branches_read",
				"branches_write",
				"holiday_create",
				"holiday_delete",
				"holiday_read",
				"holiday_write",
				"team_members_create",
				"team_members_delete",
				"team_members_read",
				"team_members_write",
				"notifications_create",
				"notifications_delete",
				"notifications_read",
				"notifications_write",
				"tags_create",
				"tags_delete",
				"tags_read",
				"tags_write",
				"roles_create",
				"roles_delete",
				"roles_read",
				"roles_write",
			],
			filters: [["name", "=", data.name]], // Filter by the current row's name
			limit: 1,
		}
	);
	if (isLoading || !roleData || roleData.length === 0) {
        return <p className="truncate text-[14px] text-[#5B5967] font-[400]">Loading...</p>;
      }
            const settings =
              [
                roleData[0].branches_create ||
                roleData[0].branches_delete ||
                roleData[0].branches_read ||
                roleData[0].branches_write
                  ? "Branches"
                  : "",
                roleData[0].holiday_create ||
                roleData[0].holiday_delete ||
                roleData[0].holiday_read ||
                roleData[0].holiday_write
                  ? "Holiday"
                  : "",
                roleData[0].team_members_create ||
                roleData[0].team_members_delete ||
                roleData[0].team_members_read ||
                roleData[0].team_members_write
                  ? "Team Members"
                  : "",
                roleData[0].notifications_create ||
                roleData[0].notifications_delete ||
                roleData[0].notifications_read ||
                roleData[0].notifications_write
                  ? "Notifications"
                  : "",
                roleData[0].tags_create ||
                roleData[0].tags_delete ||
                roleData[0].tags_read ||
                roleData[0].tags_write
                  ? "Tags"
                  : "",
                roleData[0].roles_create ||
                roleData[0].roles_delete ||
                roleData[0].roles_read ||
                roleData[0].roles_write
                  ? "Roles"
                  : "",
              ]
                .filter(Boolean)
                .join(", ") || "None";
            return (
              <p className="truncate text-[14px] text-[#5B5967] font-[400]">
                {settings}
              </p>
            );
          },
        },
      },
      {
        fieldname: undefined,
        label: "Access",
        fieldtype: "Data",
        hidden: false,
        overrideProps: {
          filter: "false",
          minWidth: 270,
          flex: 1,
          filterParams: {
            debounceMs: 200,
            suppressMiniFilter: true,
          },
          cellRenderer: ({ data }: { data: RoleData }) => {
			const { data: roleData } = useFrappeGetDocList<RoleData>(
		"CG Role",
		{
			fields: [
				"mis",
				"smart_insights",
			],
			filters: [["name", "=", data.name]], // Filter by the current row's name
			limit: 1,
		}
	);

	if (isLoading || !roleData || roleData.length === 0) {
        return <p className="truncate text-[14px] text-[#5B5967] font-[400]">Loading...</p>;
      }
            const access =
              [
                roleData[0].mis ? "MIS" : "",
                roleData[0].smart_insights ? "Smart Insights" : "",
              ]
                .filter(Boolean)
                .join(", ") || "None";
            return (
              <p className="truncate text-[14px] text-[#5B5967] font-[400]">
                {access}
              </p>
            );
          },
        },
      },
    ];

    return columns;
  }, [roles]);

  useEffect(() => {
    mutate();
  }, [mutate]);

  if (error) {
    console.error("Failed to fetch role data:", error);
  }

  function TaskDetailsFunc(event: any) {
  	setSelectedRole(event);
  	setEditSheetOpen(true);
  }

  return (
    <div className="w-full px-[16px]">
      <div className="flex flex-row items-center justify-between">
        <span className="text-[#2D2C37] font-[600] text-[16px]">Roles</span>
        {/* <div className="flex flex-row items-center gap-x-3">
          {roleBaseName === "ROLE-Admin" && <CreateRoleSheet />}
        </div> */}
      </div>
      <div className="rounded-[15px] overflow-x-auto border-[1px] border-[#F0F1F2] mt-3">
        {/* <AGComponent
					tableData={roleData}
					columnDefsMemo={columns}
					onRowClicked={(event) => {
						TaskDetailsFunc(event);
					}}
					tableType="RoleSheet"
					TableHeight="500px"
				/> */}
        <div className="h-[90vh] flex flex-row">
          <DoctypeList
            doctype="CG Role"
            key={1}
            columnDefs={columnDefs}
            showCheckboxColumn={false}
            showModifiedColumn={false}
          />
        </div>
      </div>
      {selectedRole && (
        <EditRoleSheet
          isOpenSheet={editSheetOpen}
          setIsOpenSheet={setEditSheetOpen}
          initialRole={selectedRole.backendRole}
          mutate={mutate}
        />
      )}
    </div>
  );
};

export default HierarchyComponent;

export interface ChecklistItem {
  checklist_item: string;
  is_checked: number;
}
export interface TaskFormData {
  task_name: string;
  is_help_ticket: number;
  assignee: string;
  assigned_to: {
    email: string;
  };
  frequency: { name: string };
  due_date: string;
  priority: { value: string };
  // status: string;
  description: string;
  checker: {
    email: string;
  };
  tags?: { tag_name?: string | null; name?: string }[];
  restrict: number;
  upload_required: number;
  is_completed: number;
  task_type: string;
  attach_file?: Array<{ file_url: string }>;
  submit_file?: Array<{ file_url: string }>;
  subtask: {
    task_name: string;
    assigned_to: { email: string };
    due_date: Date;
  }[];
  checklist?: ChecklistItem[];
  company_id: string;
}
export interface EditModeOfTask {
  task_name: boolean;
  temporaryReallocation: boolean;
  checker: boolean;
  task_type: boolean;
  due_date: boolean;
  priority: boolean;
  tags: boolean;
  description: boolean;
  subTasks: boolean;
  attach_file: boolean;
}
// export interface FormData {
//   first_name: string;
//   last_name: string;
//   email: string;
//   phone: string;
//   designation: string;
//   // branch_id: {branch_name:""};
//   // department_id: {department_name:""};
//   branch_id: ""; // ✅ Change to a string
//   department_id: ""; // ✅ Change to a string
//   role: ""; // ✅ Change to a string

//   ctc: number;
//   cost_per_hour: number;
//   // role: {role_name:string};
//   reportTo: {
//     full_name: string;
//     user_image: string;
//     first_name: string;
//     last_name: string;
//     email: string;
//   };
//   reporter: {
//     full_name: string;
//     user_image: string;
//     first_name: string;
//     last_name: string;
//     email: string;
//   };

//   password: string;
//   confirmPassword: string;
//   accessList: string[];
// }

export interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  designation: string;
  branch_id: { name: string };
  department_id: { name: string };
  role: { role_name: string };
  ctc: number;
  cost_per_hour: number;
  report_to: {
    email: string;
    full_name?: string;
    user_image?: string;
    first_name?: string;
    last_name?: string;
  };
  reporter: {
    full_name: string;
    user_image: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  password: string;
  confirmPassword: string;
  accessList: string[];
}

export interface TaskUpdate {
  branch: null;
  department: null;
  recurrence_type_id: any;
  tag: string;
  task_definition_id: any;
  submit_file: any;
  upload_required: number;
  assigned_to: string;
  task_name: string;
  assignee: string;
  assignedTo: {
    email: string;
    first_name: string;
    full_name: string;
    last_name: string;
    user_image: string;
  } | null;
  checker: {
    email: string;
    first_name: string;
    full_name: string;
    last_name: string;
    user_image: string;
  } | null;
  frequency: string;
  due_date: string;
  priority: string;
  description: string;
  subtask: string[];
  attach_file: string;
  is_help_ticket: 0 | 1;
  is_completed: 0 | 1;
  completion_platform: "Mobile" | "Web";
  name: string;
  creation: string;
  restrict: 0 | 1;
  task_type: string;
  owner: string;
}
export interface TaskList {
  task_type: string;
  assigned_to_email: string;
  assigned_to_first_name: string;
  assigned_to_full_name: string;
  assigned_to_image: string;
  assigned_to_last_name: string;
  assignee_email: string;
  assignee_first_name: string;
  assignee_full_name: string;
  assignee_image: string;
  assignee_last_name: string;
  attach_file: string;
  checker_email: string;
  checker_first_name: string;
  checker_full_name: string;
  checker_image: string;
  checker_last_name: string;
  company_id: string;
  description: string;
  due_date: string;
  is_completed: boolean;
  name: string;
  priority: string;
  status: string;
  task_name: string;
  _comments: [];
  _user_tags: [];
}
export interface TeamMember {
  user_image: string | null;
  first_name: string;
  last_name: string | null;
  user_name: string;
  email: string;
}
export interface TaskInsight {
  team_member: TeamMember;
  department: string;
  KRA: string;
  KPI: string;
  current_week_planned: number;
  current_week_actual: number;
  // team_member_projected: number;
  current_actual_percentage: number;
  current_week_actual_percentage: number;
  fromDate: string;
  toDate: string;
}

export type Column<T> = {
  key: keyof T | string;
  header: string;
  width: string;
  icon: string;
};
export interface SortConfig {
  key: string;
  direction: "asc" | "desc";
}

export interface RolePermissions {
  assign_admin: number;
  assign_self: number;
  assign_team_lead: number;
  assign_team_member: number;
  branches_create: number;
  branches_delete: number;
  branches_read: number;
  branches_write: number;
  create_fms: number;
  create_help_ticket: number;
  create_onetime_task: number;
  create_recurring_task: number;
  docstatus: number;
  doctype: string;
  holiday_create: number;
  holiday_delete: number;
  holiday_read: number;
  holiday_write: number;
  mis: number;
  notifications_create: number;
  notifications_delete: number;
  notifications_read: number;
  notifications_write: number;
  roles_create: number;
  roles_delete: number;
  roles_read: number;
  roles_write: number;
  smart_insights: number;
  tags_create: number;
  tags_delete: number;
  tags_read: number;
  tags_write: number;
  team_members_create: number;
  team_members_delete: number;
  team_members_read: number;
  team_members_write: number;
}

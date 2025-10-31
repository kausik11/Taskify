export interface UserProfile {
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  designation?: string;
  role?: string | { name: string };
  department_id?: string | { name: string; department_name: string };
  branch_id?: string | { name: string; branch_name: string };
  user_image?: string;
}

export interface PasswordForm {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface PasswordStrength {
  score: number;
  feedback: {
    password_policy_validation_passed: boolean;
    suggestions?: string[];
    warning?: string;
  };
}

export interface ProfileField {
  label: string;
  type: string;
  key: keyof UserProfile;
  disabled?: boolean;
  isDropdown?: boolean;
}

// constants/profileFields.ts
export const PROFILE_FIELDS: ProfileField[] = [
	{ label: "First Name", type: "text", key: "first_name" },
	{ label: "Last Name", type: "text", key: "last_name" },
	{ label: "Email ID", type: "email", key: "email", disabled: true },
	{ label: "Phone", type: "text", key: "phone" },
	{ label: "Designation", type: "text", key: "designation", disabled: true },
	{ label: "Role", type: "text", key: "role", disabled: true, isDropdown: true },
	{ label: "Department", type: "text", key: "department_id", disabled: true, isDropdown: true },
	{ label: "Branch", type: "text", key: "branch_id", disabled: true, isDropdown: true },
];
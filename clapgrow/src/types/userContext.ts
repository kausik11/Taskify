// userContext.ts - Enhanced types with better safety
import { CGBranch } from "./ClapgrowApp/CGBranch";
import { CGCompany } from "./ClapgrowApp/CGCompany";
import { CGDepartment } from "./ClapgrowApp/CGDepartment";
import { CGRole } from "./ClapgrowApp/CGRole";
import { CGUser } from "./ClapgrowApp/CGUser";

export interface UserState {
  details: CGUser[] | null;
  roleBaseName: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface CompanyState {
  details: CGCompany[] | null;
  isLoading: boolean;
  error: string | null;
}

export interface RoleState {
  permissions: CGRole | null;
  isLoading: boolean;
  error: string | null;
}

export interface OrganizationState {
  branch: CGBranch[] | null;
  department: CGDepartment[] | null;
  isLoading: boolean;
  error: string | null;
}

// Enhanced UserContextProps with helper methods and better type safety
export interface UserContextProps {
  // Authentication
  currentUser: string;
  isLoading: boolean;
  logout: () => Promise<void>;
  updateCurrentUser: VoidFunction;

  // User data
  userDetails: CGUser[] | null;
  roleBaseName: string | null;
  isAdmin: boolean;

  // Company data
  companyDetails: CGCompany[] | null;
  setCompanyDetails: React.Dispatch<React.SetStateAction<CGCompany[] | null>>;

  // Enhanced company helper methods
  getCurrentCompany: () => CGCompany | null;
  getCompanyId: () => string | null;
  getCompanyName: () => string | null;
  isTrialCompany: () => boolean;
  hasCompanyLogo: () => boolean;

  // Role permissions
  rolePermissions: CGRole | null;

  // Organization data
  branchDetails: CGBranch[] | null;
  departmentDetails: CGDepartment[] | null;

  // Enhanced user helper methods
  getCurrentUser: () => CGUser | null;
  hasValidUserData: () => boolean;

  // Error states
  hasErrors: () => boolean;
  getErrors: () => string[];
}

// Default context value with proper typing
export const defaultUserContext: UserContextProps = {
	currentUser: "",
	isLoading: false,
	logout: () => Promise.resolve(),
	updateCurrentUser: () => { },
	userDetails: null,
	roleBaseName: null,
	companyDetails: null,
	setCompanyDetails: () => { },
	rolePermissions: null,
	branchDetails: null,
	departmentDetails: null,
	isAdmin: false,

	// Helper methods with safe defaults
	getCurrentCompany: () => null,
	getCompanyId: () => null,
	getCompanyName: () => null,
	isTrialCompany: () => false,
	hasCompanyLogo: () => false,
	getCurrentUser: () => null,
	hasValidUserData: () => false,
	hasErrors: () => false,
	getErrors: () => [],
};
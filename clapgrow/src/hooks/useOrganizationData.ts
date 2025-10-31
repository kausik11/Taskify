import { useMemo } from "react";
import { useFrappeGetDocList } from "frappe-react-sdk";
import { CGBranch } from "@/types/ClapgrowApp/CGBranch";
import { CGDepartment } from "@/types/ClapgrowApp/CGDepartment";
import { CGUser } from "@/types/ClapgrowApp/CGUser";
import { OrganizationState } from "@/types/userContext";

export const useOrganizationData = (userDetails: CGUser[] | null) => {
  // Branch filters
  const branchFilters = useMemo(() => {
    if (userDetails?.[0]?.branch_id) {
      return [["name", "=", userDetails[0].branch_id]] as const;
    }
    return [];
  }, [userDetails]);

  // Department filters
  const departmentFilters = useMemo(() => {
    if (userDetails?.[0]?.department_id) {
      return [["name", "=", userDetails[0].department_id]] as const;
    }
    return [];
  }, [userDetails]);

  const shouldFetchBranch = !!branchFilters.length;
  const shouldFetchDepartment = !!departmentFilters.length;

  // Fetch branch data
  const {
    data: branchData,
    error: branchError,
    isLoading: branchLoading,
  } = useFrappeGetDocList<CGBranch>(
    "CG Branch",
    {
      fields: ["name", "branch_name", "company_id"],
      filters: branchFilters as any,
    },
    shouldFetchBranch ? undefined : null,
  );

  // Fetch department data
  const {
    data: departmentData,
    error: departmentError,
    isLoading: departmentLoading,
  } = useFrappeGetDocList<CGDepartment>(
    "CG Department",
    {
      fields: ["name", "department_name", "company_id"],
      filters: departmentFilters as any,
    },
    shouldFetchDepartment ? undefined : null,
  );

  const orgState: OrganizationState = useMemo(() => {
    const errors = [branchError, departmentError].filter(Boolean);
    return {
      branch: branchData || null,
      department: departmentData || null,
      isLoading: branchLoading || departmentLoading,
      error:
        errors.length > 0
          ? errors[0]?.message || "Failed to fetch organization data"
          : null,
    };
  }, [
    branchData,
    departmentData,
    branchError,
    departmentError,
    branchLoading,
    departmentLoading,
  ]);

  return { orgState };
};

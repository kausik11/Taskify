import { useEffect, useMemo } from "react";
import { useFrappeGetDocList, useSWRConfig } from "frappe-react-sdk";
import { CGRole } from "@/types/ClapgrowApp/CGRole";
import { RoleState } from "@/types/userContext";

export const useRoleData = (roleBaseName: string | null) => {
  const { mutate } = useSWRConfig();

  const roleName = useMemo(
    () => roleBaseName?.replace(/^ROLE-/, "") || null,
    [roleBaseName],
  );

  const roleFilters = useMemo(() => {
    if (roleName) {
      return [["role_name", "=", roleName]] as const;
    }
    return [];
  }, [roleName]);

  const shouldFetch = !!roleName && roleName !== "";

  const {
    data: roleDataList,
    error: roleError,
    isLoading,
  } = useFrappeGetDocList<CGRole>(
    "CG Role",
    {
      fields: ["*"],
      filters: roleFilters as any,
      limit: 1,
    },
    shouldFetch ? undefined : null,
  );

  const roleState: RoleState = useMemo(
    () => ({
      permissions: roleDataList?.[0] || null,
      isLoading,
      error: roleError
        ? roleError.message || "Failed to fetch role data"
        : null,
    }),
    [roleDataList, roleError, isLoading],
  );

  useEffect(() => {
    if (roleName) {
      mutate(`frappe.client.get_list/CG Role`);
    }
  }, [roleName, mutate]);

  return { roleState };
};

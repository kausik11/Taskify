import { useMemo } from "react";
import { useFrappeGetDocList } from "frappe-react-sdk";
import { CGUser } from "@/types/ClapgrowApp/CGUser";
import { UserState } from "@/types/userContext";

export const useUserData = (currentUser: string) => {
  const userFilters = useMemo(
    () => (currentUser ? ([["email", "=", currentUser]] as const) : []),
    [currentUser],
  );

  const {
    data: userData,
    error: userError,
    isLoading,
  } = useFrappeGetDocList<CGUser>("CG User", {
    fields: ["*"],
    filters: userFilters as any,
  });

  const userState: UserState = useMemo(
    () => ({
      details: userData || null,
      roleBaseName: userData?.[0]?.role || null,
      isLoading,
      error: userError
        ? userError.message || "Failed to fetch user data"
        : null,
    }),
    [userData, userError, isLoading],
  );

  const isAdmin = useMemo(
    () => userState.roleBaseName === "ROLE-Admin",
    [userState.roleBaseName],
  );

  return { userState, isAdmin };
};

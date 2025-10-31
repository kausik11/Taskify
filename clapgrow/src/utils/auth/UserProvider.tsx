import React, {
  createContext,
  FC,
  PropsWithChildren,
  useContext,
  useCallback,
  useMemo,
} from "react";
import { useFrappeAuth } from "frappe-react-sdk";

// Import types
import { UserContextProps, defaultUserContext } from "@/types/userContext";
import { CGUser } from "@/types/ClapgrowApp/CGUser";
import { CGCompany } from "@/types/ClapgrowApp/CGCompany";

// Import custom hooks
import { useUserData } from "@/hooks/useUserData";
import { useCompanyData } from "@/hooks/useCompanyData";
import { useRoleData } from "@/hooks/useRoleData";
import { useOrganizationData } from "@/hooks/useOrganizationData";

// Create context with enhanced default values
export const UserContext = createContext<UserContextProps>(defaultUserContext);

// Custom hook for consuming the context
export const useAuth = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useAuth must be used within a UserProvider");
  }
  return context;
};

// Enhanced UserProvider with helper methods and optimizations
export const UserProvider: FC<PropsWithChildren> = ({ children }) => {
  const {
    logout,
    currentUser,
    updateCurrentUser,
    isLoading: authLoading,
  } = useFrappeAuth();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  // Custom hooks for data management
  const { userState, isAdmin } = useUserData(currentUser ?? "");
  const { companyState, setCompanyDetails } = useCompanyData(userState.details);
  const { roleState } = useRoleData(userState.roleBaseName);
  const { orgState } = useOrganizationData(userState.details);

  // Memoized loading state - include logout state to prevent flicker
  const isLoading = useMemo(
    () =>
      authLoading ||
      userState.isLoading ||
      companyState.isLoading ||
      roleState.isLoading ||
      orgState.isLoading ||
      isLoggingOut,
    [
      authLoading,
      userState.isLoading,
      companyState.isLoading,
      roleState.isLoading,
      orgState.isLoading,
      isLoggingOut,
    ],
  );

  // Memoized company helper methods
  const getCurrentCompany = useCallback((): CGCompany | null => {
    return companyState.details && companyState.details.length > 0
      ? companyState.details[0]
      : null;
  }, [companyState.details]);

  const getCompanyId = useCallback((): string | null => {
    const company = getCurrentCompany();
    return company?.name || null;
  }, [getCurrentCompany]);

  const getCompanyName = useCallback((): string | null => {
    const company = getCurrentCompany();
    return company?.company_name || company?.name || null;
  }, [getCurrentCompany]);

  const isTrialCompany = useCallback((): boolean => {
    const company = getCurrentCompany();
    return company?.is_trial === 1;
  }, [getCurrentCompany]);

  const hasCompanyLogo = useCallback((): boolean => {
    const company = getCurrentCompany();
    return Boolean(company?.company_logo);
  }, [getCurrentCompany]);

  // Memoized user helper methods
  const getCurrentUser = useCallback((): CGUser | null => {
    return userState.details && userState.details.length > 0
      ? userState.details[0]
      : null;
  }, [userState.details]);

  const hasValidUserData = useCallback((): boolean => {
    return Boolean(userState.details?.length && userState.details[0]);
  }, [userState.details]);

  // Memoized error helper methods
  const getErrors = useCallback((): string[] => {
    return [
      userState.error,
      companyState.error,
      roleState.error,
      orgState.error,
    ].filter((error): error is string => Boolean(error));
  }, [userState.error, companyState.error, roleState.error, orgState.error]);

  const hasErrors = useCallback((): boolean => {
    return getErrors().length > 0;
  }, [getErrors]);

  // Optimized logout function
  const handleLogout = useCallback(async () => {
    // Set logging out state to show loader and prevent flicker
    setIsLoggingOut(true);

    const cleanupLocalStorage = () => {
      try {
        localStorage.removeItem("clapgrow");
        localStorage.removeItem("app-cache");
      } catch (error) {
        console.warn("Failed to clear localStorage:", error);
      }
    };

    const navigateToLogin = () => {
      const basePath = import.meta.env.VITE_BASE_NAME || "";
      const loginUrl = `${basePath ? `/${basePath}` : ""}/login`;
      // Use replace instead of href to avoid adding to history
      window.location.replace(loginUrl);
    };

    try {
      // Call logout API first without waiting
      logout().catch((error) => {
        console.error("Logout API failed:", error);
      });

      // Clean up local storage
      cleanupLocalStorage();

      // Redirect immediately without clearing cache to prevent flicker
      // The page reload will handle clearing everything
      navigateToLogin();
    } catch (error) {
      console.error("Logout failed:", error);
      // Even if logout fails, clean up and redirect
      cleanupLocalStorage();
      navigateToLogin();
    }
  }, [logout]);

  // Log errors for debugging (remove in production)
  if (import.meta.env.NODE_ENV === "development") {
    const errors = getErrors();
    if (errors.length > 0) {
      console.warn("UserProvider errors:", errors);
    }
  }

  // Memoized context value to prevent unnecessary re-renders
  const contextValue: UserContextProps = useMemo(
    () => ({
      // Authentication
      isLoading,
      updateCurrentUser,
      logout: handleLogout,
      currentUser: currentUser ?? "",

      // User data
      userDetails: userState.details,
      roleBaseName: userState.roleBaseName,
      isAdmin,

      // Company data
      companyDetails: companyState.details,
      setCompanyDetails,

      // Company helper methods
      getCurrentCompany,
      getCompanyId,
      getCompanyName,
      isTrialCompany,
      hasCompanyLogo,

      // Role permissions
      rolePermissions: roleState.permissions,

      // Organization data
      branchDetails: orgState.branch,
      departmentDetails: orgState.department,

      // User helper methods
      getCurrentUser,
      hasValidUserData,

      // Error helper methods
      hasErrors,
      getErrors,
    }),
    [
      // Dependencies for memoization
      isLoading,
      updateCurrentUser,
      handleLogout,
      currentUser,
      userState.details,
      userState.roleBaseName,
      isAdmin,
      companyState.details,
      setCompanyDetails,
      getCurrentCompany,
      getCompanyId,
      getCompanyName,
      isTrialCompany,
      hasCompanyLogo,
      roleState.permissions,
      orgState.branch,
      orgState.department,
      getCurrentUser,
      hasValidUserData,
      hasErrors,
      getErrors,
    ],
  );

  return (
    <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
  );
};

// Enhanced Error Boundary with better error handling
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class UserProviderErrorBoundary extends React.Component<
  PropsWithChildren<object>,
  ErrorBoundaryState
> {
  constructor(props: PropsWithChildren<object>) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("UserProvider Error:", error);
    console.error("Error Info:", errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Log to error reporting service in production
    if (import.meta.env.NODE_ENV === "production") {
      // Example: logErrorToService(error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8 max-w-md mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Authentication Error
              </h2>
              <p className="text-gray-600 mb-4">
                Something went wrong while loading user data.
              </p>

              {/* Show error details in development */}
              {import.meta.env.NODE_ENV === "development" &&
                this.state.error && (
                  <div className="text-left bg-red-50 border border-red-200 rounded p-4 mb-4">
                    <p className="text-sm font-mono text-red-800">
                      {this.state.error.message}
                    </p>
                  </div>
                )}
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper component that combines Provider and Error Boundary
export const UserProviderWithErrorBoundary: FC<PropsWithChildren> = ({
  children,
}) => (
  <UserProviderErrorBoundary>
    <UserProvider>{children}</UserProvider>
  </UserProviderErrorBoundary>
);

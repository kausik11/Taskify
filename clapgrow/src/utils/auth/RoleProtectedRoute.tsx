import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { UserContext } from "@/utils/auth/UserProvider";
import { AccessDenied } from "@/components/common/AccessDenied";
import { Loader } from "@/layouts/Loader";

interface RoleProtectedRouteProps {
	children: React.ReactNode;
	allowedRoles?: string[];
	restrictedRoles?: string[];
	fallbackPath?: string;
	showAccessDenied?: boolean;
}

export const RoleProtectedRoute = ({ 
	children, 
	allowedRoles, 
	restrictedRoles,
	fallbackPath = "/dashboard",
	showAccessDenied = true 
}: RoleProtectedRouteProps) => {
	const { roleBaseName, isLoading } = useContext(UserContext);

	// Show loading while role is being determined
	if (isLoading) {
		return <Loader size={45} speed={1.75} color="blue" />;
	}

	// If no role is available, redirect to dashboard
	if (!roleBaseName) {
		return <Navigate to={fallbackPath} replace />;
	}

	// Check if user's role is in restricted roles
	if (restrictedRoles && restrictedRoles.includes(roleBaseName)) {
		if (showAccessDenied) {
			return (
				<AccessDenied 
					title="Access Denied"
					message="Please contact your administrator for access."
				/>
			);
		}
		return <Navigate to={fallbackPath} replace />;
	}

	// Check if user's role is in allowed roles (if specified)
	if (allowedRoles && !allowedRoles.includes(roleBaseName)) {
		if (showAccessDenied) {
			return (
				<AccessDenied 
					title="Access Denied"
					message="Please contact your administrator for access."
				/>
			);
		}
		return <Navigate to={fallbackPath} replace />;
	}

	// If all checks pass, render the children
	return <>{children}</>;
};
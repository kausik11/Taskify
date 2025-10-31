import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { UserContext } from "./UserProvider";
import { Loader } from "@/layouts/Loader";
// import { Loader } from "@/components/layout/AlertBanner/CommonDesign";

export const ProtectedRoute = () => {
	const { currentUser, isLoading } = useContext(UserContext);

	if (isLoading) {
		return <Loader size={45} speed={1.75} color="blue" />;
	} else if (!currentUser || currentUser === "Guest") {
		return <Navigate to="/login" />;
	}
	return <Outlet />;
};

import React, { createContext, useContext, useState, useEffect } from "react";
import {
	FrappeConfig,
	FrappeContext,
	useFrappeAuth,
	useFrappeGetDoc,
	useFrappeGetDocCount,
	useFrappeGetDocList,
} from "frappe-react-sdk";
import { UserContext } from "../auth/UserProvider";
import { toast } from "sonner";
import { RolePermissions } from "@/components/common/CommonTypes";

type FrappeDataContextType = {
	employeeData: any[] | null;
	branchData: any[] | null;
	filterbyUserBranchData: any[] | null;
	departmentData: any[] | null;
	roleData: any[] | null;
	rawTagData: any[] | undefined;
	loading: boolean;
	deleteTagByName: (tagName: string) => Promise<boolean>;
	filteredRolePermissions: RolePermissions | null;
	refetchTags: () => void;
};

const FrappeDataContext = createContext<FrappeDataContextType | undefined>(
	undefined,
);

export const FrappeApiProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const { call } = useContext(FrappeContext) as FrappeConfig;
	const [loading, setLoading] = useState(true);
	const { userDetails, roleBaseName, companyDetails } = useContext(UserContext);
	const { currentUser } = useFrappeAuth();
	const [roleBaseNameId, setRoleBaseNameId] = useState<string | null>(null);
	const [filteredPermissions, setFilteredPermissions] = useState<any>(null);
	const [employeeData, setEmployeeData] = useState<any[] | null>(null);

	const roleName = roleBaseName?.replace(/^ROLE-/, "");
	const userCompanyId = userDetails?.[0]?.company_id || companyDetails?.[0]?.name || companyDetails?.[1]?.name;

	// Fetch role data to get role_name and role_permission
	const { data: roleListData } = useFrappeGetDocList("CG Role", {
		filters: [["role_name", "=", roleName || ""]],
		fields: ["name"],
		limit: 1,
	});

	const { data: roleDoc } = useFrappeGetDoc("CG Role", roleBaseNameId || "", {
		revalidateOnMount: true,
		revalidateIfStale: false,
		revalidateOnFocus: false,
	});

	useEffect(() => {
		if (roleListData && roleListData.length > 0) {
			setRoleBaseNameId(roleListData[0].name);
		}
	}, [roleListData]);

	useEffect(() => {
		if (roleDoc?.role_permission) {
			const fieldsToIgnore = [
				"name",
				"owner",
				"creation",
				"modified",
				"modified_by",
				"parent",
				"parentfield",
				"parenttype",
				"idx",
			];

			const permDict: Record<string, any> = {};
			roleDoc.role_permission.forEach((perm: any) => {
				Object.entries(perm).forEach(([field, value]) => {
					if (!fieldsToIgnore.includes(field)) {
						permDict[field] = value;
					}
				});
			});

			setFilteredPermissions(permDict);
		}
	}, [roleDoc]);

	// Fetch filtered employees using the get_filtered_employees API
	useEffect(() => {
		const fetchEmployees = async () => {
			if (!currentUser || !roleBaseName || !userDetails?.[0]?.company_id) {
				setEmployeeData([]);
				return;
			}

			try {
				const response = await call.post(
					"clapgrow_app.api.role_employees.get_filtered_employees",
					{
						company_id: userDetails[0].company_id,
						role_name: roleBaseName,
						current_user: currentUser,
					},
				);

				setEmployeeData(response.message || []);
			} catch (error) {
				console.error("Error fetching employees:", error);
				setEmployeeData([]);
				toast.error("Failed to load employees.");
			}
		};

		fetchEmployees();
	}, [call, currentUser, roleBaseName, userDetails]);

	const { data: branchCount } = useFrappeGetDocCount(
		"CG Branch",
		userCompanyId ? [["company_id", "=", userCompanyId]] : []
	);

	const { data: rawBranchData } = useFrappeGetDocList("CG Branch", {
		fields: ["name", "branch_name"],
		orderBy: {
			field: "name",
			order: "asc",
		},
		filters: [["company_id", "=", `${userDetails?.[0]?.company_id}`]],
		limit: branchCount
	});

	const filtersCompany =
		currentUser && userDetails?.[0]?.branch_id
			? [
				["branch_name", "=", userDetails[0].branch_id],
				["company_id", "=", `${userDetails?.[0]?.company_id}`],
			]
			: undefined;

	const { data: FilterrawBranchData } = useFrappeGetDocList("CG Branch", {
		fields: ["*"],
		filters: filtersCompany,
		orderBy: {
			field: "name",
			order: "asc",
		},
		limit: branchCount
	});

	const { data: departmentCount } = useFrappeGetDocCount(
		"CG Department",
		userCompanyId ? [["company_id", "=", userCompanyId]] : []
	);
	const { data: rawDepartmentData } = useFrappeGetDocList("CG Department", {
		fields: ["name", "department_name"],
		orderBy: {
			field: "name",
			order: "asc",
		},
		filters: [["company_id", "=", `${userDetails?.[0]?.company_id}`]],
		limit: departmentCount
	});

	const { data: rawRoleData } = useFrappeGetDocList("CG Role", {
		fields: ["name", "role_name"],
		orderBy: {
			field: "name",
			order: "asc",
		},
		// filters:[ ["company_id", "=", `"${userDetails?.[0]?.company_id}`]],
	});
	const { data: tagCount } = useFrappeGetDocCount("CG Tags",
		userCompanyId ? [["company_id", "=", userCompanyId]] : []
	);
	const { data: rawTagData, mutate: mutateTagData } = useFrappeGetDocList("CG Tags", {
		fields: ["name", "tag_name"],
		orderBy: { field: "creation", order: "desc" },
		filters: [["company_id", "=", userDetails?.[0]?.company_id || ""]],
		limit: tagCount || 1000,
	}, { 
		revalidateOnMount: true,
		revalidateOnFocus: true,
		revalidateIfStale: true,
	});

	const deleteTagByName = async (tagName: string): Promise<boolean> => {
		try {
			const response = await call.delete(
				`clapgrow_app.api.tasks.delete_tasks.delete_tag_by_name`,
				{
					data: { name: tagName },
				},
			);

			if (response.message?.[1] === 200) {
				toast.success(response.message?.[0]?.message);
				// Refetch tags after successful deletion
				mutateTagData();
				return true;
			}

			if (response.message?.[1] === 400) {
				toast.error(response.message?.[0]?.message);
				return true;
			}

			return false;
		} catch (e) {
			const errorMessage =
				e.response?.message?.[0]?.message || "An unexpected error occurred.";
			toast.error(errorMessage);
			return false;
		}
	};

	const branchData = rawBranchData || null;
	const departmentData = rawDepartmentData || null;
	const filterbyUserBranchData = FilterrawBranchData || null;
	const roleData = rawRoleData || null;
	const filteredRolePermissions = filteredPermissions || null;

	useEffect(() => {
		if (employeeData && branchData && departmentData && roleData) {
			setLoading(false);
		}
	}, [employeeData, branchData, departmentData, roleData]);

	return (
		<FrappeDataContext.Provider
			value={{
				employeeData,
				branchData,
				filterbyUserBranchData,
				departmentData,
				roleData,
				rawTagData,
				deleteTagByName,
				loading,
				filteredRolePermissions,
				refetchTags: () => mutateTagData(),
			}}
		>
			{children}
		</FrappeDataContext.Provider>
	);
};

export const useFrappeData = () => {
	const context = useContext(FrappeDataContext);
	if (!context) {
		throw new Error("useFrappeData must be used within a FrappeApiProvider");
	}
	return context;
};

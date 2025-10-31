import React, { useEffect, useState } from "react";
import { useFrappeGetDocList, useFrappeGetDoc } from "frappe-react-sdk";

const FetchRolePermissions = ({ roleBaseName }: { roleBaseName: string }) => {
	const [roleBaseNameId, setroleBaseNameId] = useState<string | null>(null);
	const [filteredPermissions, setFilteredPermissions] = useState<any>(null);

	// Step 1: Get the "name" of the role with matching role_name
	const { data: roleListData, error: roleListError } = useFrappeGetDocList(
		"CG Role",
		{
			filters: [["role_name", "=", roleBaseName]],
			fields: ["name"],
			limit: 1,
		},
	);

	// Step 2: Once roleBaseNameId is available, fetch full doc
	const { data: roleDoc, error: roleDocError } = useFrappeGetDoc(
		"CG Role",
		roleBaseNameId || "",
		{
			revalidateOnMount: true,
			revalidateIfStale: false,
			revalidateOnFocus: false,
		},
	);

	useEffect(() => {
		if (roleListData && roleListData.length > 0) {
			setroleBaseNameId(roleListData[0].name);
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

	if (roleListError || roleDocError) {
		return <p style={{ color: "red" }}>Error fetching role or permissions</p>;
	}

	return (
		<div>
			{filteredPermissions ? (
				<pre>{JSON.stringify(filteredPermissions, null, 2)}</pre>
			) : (
				<p>Loading permissions...</p>
			)}
		</div>
	);
};

export default FetchRolePermissions;

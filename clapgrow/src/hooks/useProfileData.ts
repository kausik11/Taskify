import { useEffect } from 'react';
import { useFrappeAuth, useFrappeGetDocList } from 'frappe-react-sdk';
import { CGUser } from '@/types/ClapgrowApp/CGUser';
import { UserProfile } from '@/types/profile';


export const useProfileData = (setValue: (key: keyof UserProfile, value: any) => void) => {
	const { currentUser } = useFrappeAuth();
	const { data: userDetails, mutate } = useFrappeGetDocList<CGUser>("CG User", {
		fields: ["*"],
		filters: currentUser ? [["email", "like", `%${currentUser}%`]] : [],
	});

	const isAdmin = userDetails?.[0]?.role === "ROLE-Admin";

	useEffect(() => {
		if (userDetails?.[0]) {
			const { email, role, ...userData } = userDetails[0];
			Object.entries(userData).forEach(([key, value]) => {
				setValue(key as keyof UserProfile, value);
			});
			setValue("email", email);
			if (role) setValue("role", role.replace(/^ROLE-/, ""));
		}
	}, [userDetails, setValue]);

	return { userDetails, mutate, isAdmin, currentUser };
};
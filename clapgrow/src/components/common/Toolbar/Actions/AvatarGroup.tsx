import { useFrappeGetCall } from "frappe-react-sdk";
import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/utils/auth/UserProvider";

export interface UserInfo {
  fullname: string;
  email: string;
  image: string;
  name: string;
  timestamp: string;
}

export interface AvatarGroupElementProps {
  users: string[];
  userInfo: Record<string, UserInfo>;
  max?: number;
}

export const AvatarGroupElement = ({
	users,
	userInfo,
	max = 3,
}: AvatarGroupElementProps) => {
	if (!users?.length) return null;

	// Show up to `max` avatars, rest as "+N"
	const visibleUsers = users.slice(0, max);
	const extraCount = users.length - max;

	return (
		<div className="flex -space-x-2">
			<TooltipProvider>
				{visibleUsers.map((user) => (
					<Tooltip key={user}>
						<TooltipTrigger asChild>
							<Avatar>
								<AvatarImage
									src={userInfo?.[user]?.image}
									alt={userInfo?.[user]?.fullname}
								/>
								<AvatarFallback>
									{userInfo?.[user]?.fullname?.[0] || "?"}
								</AvatarFallback>
							</Avatar>
						</TooltipTrigger>
						<TooltipContent>
							<div className="flex flex-col">
								<span className="font-medium">
									{userInfo?.[user]?.fullname}
								</span>
								<span className="text-xs text-gray-500">
									{userInfo?.[user]?.email}
								</span>
							</div>
						</TooltipContent>
					</Tooltip>
				))}
				{extraCount > 0 && (
					<div className="flex items-center justify-center h-7 w-7 rounded-full bg-gray-200 text-xs font-semibold border-2 border-white shadow">
            +{extraCount}
					</div>
				)}
			</TooltipProvider>
		</div>
	);
};

export const ViewerAvatarGroupElement = ({ users }: { users: string[] }) => {
	const { currentUser } = useAuth();

	const userWithoutCurrentUsers = useMemo(() => {
		return users.filter((user) => user !== currentUser);
	}, [users, currentUser]);

	const { data } = useFrappeGetCall<{ message: Record<string, UserInfo> }>(
		"frappe.desk.form.load.get_user_info_for_viewers",
		{ users: JSON.stringify(users) },
		users.length > 0 ? undefined : null,
		{
			revalidateOnFocus: false,
			shouldRetryOnError: false,
		},
	);

	if (data && data.message) {
		return (
			<AvatarGroupElement
				users={userWithoutCurrentUsers}
				userInfo={data.message}
			/>
		);
	}

	return null;
};

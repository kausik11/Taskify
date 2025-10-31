import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "../common/CommonFunction";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "../ui/tooltip";
import { Portal } from "@radix-ui/react-tooltip";
import { useFrappeGetDoc, useFrappeGetDocList } from "frappe-react-sdk";
import { userInfo } from "os";

type UserInfo = {
  email?: string;
  first_name?: string;
  full_name?: string;
  user_image?: string;
  last_name?: string;
};

type Props = {
  users: UserInfo[];
  className?: string;
};

// Function to generate a random background color based on the user's email or name
const getRandomColor = (identifier: string) => {
	const colors = [
		"bg-blue-500",
		"bg-green-500",
		"bg-purple-500",
		"bg-indigo-500",
		"bg-teal-500",
	];
	const index =
    identifier.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    colors.length;
	return colors[index];
};

//fetch user details from userInfo email



const UserAssignees = ({ users, className }: Props) => {
	
	return (
		<TooltipProvider>
			<div className="flex items-center gap-2">
				{users.map((user, index) => {
					const hasImage = !!user?.user_image;
					const bgColor = getRandomColor(
						user?.email || user?.full_name || "default",
					);
					return (
						<Tooltip key={index}>
							<TooltipTrigger asChild>
								<Avatar className={className || "h-6 w-6"}>
									{hasImage ? (
										<AvatarImage src={user?.user_image} alt={user?.full_name} />
									) : (
										<AvatarFallback
											className={`${bgColor} text-white font-medium flex items-center justify-center`}
										>
											{getInitials(
												user?.first_name,
												user?.last_name,
											).toUpperCase()}
										</AvatarFallback>
									)}
								</Avatar>
							</TooltipTrigger>
							<Portal>
								<TooltipContent
									side="bottom"
									className="text-white text-sm rounded-md" // High z-index to appear above AG Grid rows
								>
									<p>{user?.full_name || "No name available"}</p>
								</TooltipContent>
							</Portal>
						</Tooltip>
					);
				})}
			</div>
		</TooltipProvider>
	);
};

export default UserAssignees;

import Placeholder from "@/assets/icons/placeholder-profile.svg";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

import { CGUser } from "@/types/ClapgrowApp/CGUser";
import { useFrappeGetDocList } from "frappe-react-sdk";
import { Dispatch, SetStateAction, useContext } from "react";
import { getInitials } from "../common/CommonFunction";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { UserContext } from "@/utils/auth/UserProvider";

interface EmployeeDropDownProps {
  label?: string;
  value: any;
  handleSelect: Dispatch<SetStateAction<any>>;
  placeholder?: string;
  containerClassname?: string;
  labelClassname?: string;
  for?: string;
  disabled?: boolean;
  className?: string;
  nameVisible?: boolean;
}

export default function EmployeeDropDown({
	label,
	value,
	handleSelect,
	placeholder = "",
	containerClassname,
	labelClassname,
	disabled,
	className,
	for: htmlFor,
	nameVisible,
}: EmployeeDropDownProps) {
	const { userDetails } = useContext(UserContext);
	const { data: tasksData } = useFrappeGetDocList<CGUser>("CG User", {
		fields: ["full_name", "user_image", "first_name", "last_name", "email"],
		filters: [["company_id", "=", `${userDetails?.[0]?.company_id}`], ["enabled", "=", 1]],
	});

	return (
		<div className={containerClassname ? containerClassname : "w-full"}>
			{label && (
				<span
					className={cn(
						`text-[#5B5967] text-[12px] font-[600] ${
							labelClassname ? labelClassname : ""
						}`,
					)}
				>
					{label}
				</span>
			)}
			<DropdownMenu>
				<DropdownMenuTrigger
					className="w-full"
					disabled={disabled ? disabled : false}
				>
					<div
						className={cn(
							"w-full rounded-[8px] p-[8px] px-[15px] border-[#D0D3D9] text-[14px] font-[500] border-[1px] bg-[#FFFFFF] outline-none flex flex-row items-center justify-start",
							"text-[#0076BD]",
							className ? className : "",
						)}
					>
						<div className="flex items-center gap-[5px]">
							{value?.user_image || value?.first_name || value?.last_name ? (
								<Avatar className="h-[20px] w-[20px]">
									<AvatarImage src={value?.user_image} />
									<AvatarFallback className="h-[20px] w-[20px]">
										{getInitials(
											value?.first_name?.charAt(0),
											value?.last_name?.charAt(0),
										)}
									</AvatarFallback>
								</Avatar>
							) : (
								<Avatar className="h-[20px] w-[20px]">
									<AvatarImage src={Placeholder} />
								</Avatar>
							)}
							{placeholder === ""
								? ""
								: value?.full_name
									? value?.full_name
									: placeholder}
						</div>

						<ChevronDown className="w-[20px] h-[20px]" />
					</div>
				</DropdownMenuTrigger>
				<DropdownMenuContent>
					{tasksData?.length === 0 && (
						<DropdownMenuItem disabled>
              No {htmlFor ? htmlFor : "data"} available.
						</DropdownMenuItem>
					)}
					{(tasksData || []).length > 0 &&
            tasksData?.map((each, index) => (
            	<DropdownMenuItem
            		onClick={() => {
            			handleSelect(each);
            		}}
            		key={index + "dropdown-item-" + each}
            		className="flex items-center gap-[10px]"
            	>
            		<Avatar className="h-[15px] w-[15px]">
            			<AvatarImage src={each?.user_image} />
            			<AvatarFallback>
            				{getInitials(
            					each?.first_name ? each?.first_name : "",
            					each?.last_name ? each?.last_name : "",
            				)}
            			</AvatarFallback>
            		</Avatar>
            		{each.full_name}
            	</DropdownMenuItem>
            ))}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

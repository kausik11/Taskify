import Placeholder from "@/assets/icons/placeholder-profile.svg";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	CurrentDAYS_DATA,
	days_data,
	FREQUENCY_DATA,
	PRIORITY_DATA,
	projectList,
	weeks_data,
} from "@/data/common";
import { CGBranch } from "@/types/ClapgrowApp/CGBranch";
import { CGDepartment } from "@/types/ClapgrowApp/CGDepartment";
import { CGUser } from "@/types/ClapgrowApp/CGUser";
import { useFrappeData } from "@/utils/frappeapi/FrappeApiProvider";
import { Check, ChevronDown, UserCircle } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { getInitials } from "../common/CommonFunction";
import CombinedUserAvtar from "./CombinedUserAvtar";

type DropdownData =
	| CGUser
	| (typeof FREQUENCY_DATA)[number]
	| (typeof PRIORITY_DATA)[number]
	| CGBranch
	| CGDepartment;

interface CombinedDropDownProps {
	label?: string;
	value: any;
	handleSelect: (value: any) => void;
	placeholder?: string;
	labelClassname?: string;
	disabled?: boolean;
	className?: string;
	DataType?: string;
	isSubtaskData?: boolean;
	getKey?: (item: DropdownData) => string;
	renderItem?: (item: DropdownData) => React.ReactNode;
	hasError?: boolean;
	multiple?: boolean;
}

export default function CombinedDropDown({
	label,
	value,
	handleSelect,
	placeholder = "",
	labelClassname,
	className,
	DataType,
	isSubtaskData,
	getKey,
	renderItem,
	hasError,
	multiple = false,
}: CombinedDropDownProps) {
	const { employeeData, branchData, departmentData, roleData, rawTagData } =
		useFrappeData();

	const [open, setOpen] = useState(false);
	const [selectedItems, setSelectedItems] = useState<any[]>([]);
	const [avatarColor, setAvatrColor] = useState<boolean>(false);

	// Helper function to generate random colors for avatar fallbacks
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

	let data: DropdownData[] = [];
	const frequencyOptions = [{ name: "Week" }, { name: "Month" }];

	switch (DataType) {
		case "isEmployeeData":
			data = employeeData || [];
			break;
		case "isBranchData":
			data = branchData || [];
			break;
		case "isDepartmentData":
			data = departmentData || [];
			break;
		case "isPriorityData":
			data = PRIORITY_DATA;
			break;
		case "isFrequencyData":
			data = FREQUENCY_DATA;
			break;
		case "isTagsData":
			data = rawTagData || [];
			break;
		case "isRoleData":
			data = roleData || [];
			break;
		case "isWeekData":
			data = weeks_data || [];
			break;
		case "isDaysData":
			data = days_data || [];
			break;
		case "isCurrentDaysData":
			data = CurrentDAYS_DATA || [];
			break;
		case "isIntervalData":
			data = CurrentDAYS_DATA || [];
			break;
		case "isCustomData":
			data = frequencyOptions || [];
			break;
		case "isProjectData":
			data = projectList || [];
			break;
		default:
			data = [];
	}

	const selectedValues = useMemo(() => {
		if (!value) return placeholder;

		if (placeholder === "Add Reportee") {
			return value ? selectedItems : value || placeholder;
		}
		if (multiple) return placeholder;

		// if (DataType === "isEmployeeData")
		// 	return (value as CGUser).full_name || placeholder;
		if (DataType === "isEmployeeData") {
			// If value is a string (email), find the corresponding user in employeeData
			if (typeof value === "string" && employeeData) {
				const selectedUser = employeeData.find((user) => user.email === value);
				return selectedUser?.full_name || selectedUser?.email || value || placeholder;
			}
			// If value is a CGUser object, use its full_name or email
			return (value as CGUser).full_name || (value as CGUser).email || placeholder;
		}

		if (DataType === "isPriorityData") {
			const priorityName = typeof value === "string" ? value : value?.value;
			const priority = PRIORITY_DATA.find((p) => p.value === priorityName);

			return (
				<div className="flex items-center gap-2">
					{priority?.image && (
						<img src={priority.image} alt={priority.name} className="w-4 h-4" />
					)}
					<span style={{ color: priority?.color }}>
						{priority?.name || placeholder}
					</span>
				</div>
			);
		}

		if (DataType === "isBranchData") {
			const branchName = typeof value === "string" ? value.split("-")[0] : value?.name?.split("-")[0] || value?.name;
			return branchName || placeholder;
		}

		if (DataType === "isDepartmentData") {
			const departmentName = typeof value === "string" ? value.split("-")[0] : value?.name?.split("-")[0] || value?.name;
			return departmentName || placeholder;
		}

		if (DataType === "isRoleData")
			return value?.role_name ? value?.role_name : value || placeholder;

		if (DataType === "isTagsData")
			return value?.tag_name || placeholder;

		if (DataType === "isDaysData")
			return value?.name ? value?.name : value || placeholder;

		if (DataType === "isProjectData")
			return value?.name ? value?.name : value || placeholder;

		if (DataType === "isIntervalData") {
			return value?.name ? value?.name : (typeof value === "string" ? value : placeholder);
		}

		if (DataType === "isWeekData") {
			return value?.name ? value?.name : (typeof value === "string" ? value : placeholder);
		}

		if (DataType === "isCustomData") {
			return value?.name ? value?.name : (typeof value === "string" ? value : placeholder);
		}

		if (getKey) return getKey(value);
		if (renderItem) return renderItem(value);

		return (value as any)?.name?.replace(/^ROLE-/, "") || placeholder;
	}, [
		value,
		DataType,
		placeholder,
		getKey,
		renderItem,
		multiple,
		selectedItems,
	]);

	// console.log("selectedValues", selectedValues);

	const handleItemSelect = (item: DropdownData) => {
		const itemKey = getKey ? getKey(item) : item;
		if (placeholder === "Add Reportee") {
			const userItem = item as CGUser;

			const isSelected = selectedItems.some(
				(selected) => selected.email === userItem.email,
			);

			const newSelectedItems = isSelected
				? selectedItems.filter((u) => u.email !== userItem.email)
				: [...selectedItems, userItem];

			setSelectedItems(newSelectedItems);
			handleSelect(newSelectedItems);
			return;
		}
		if (multiple) {
			const isSelected = selectedItems.includes(itemKey);
			let newSelectedItems;
			if (isSelected) {
				newSelectedItems = selectedItems.filter(
					(selected) => selected !== itemKey,
				);
			} else {
				newSelectedItems = [...selectedItems, itemKey];
			}

			setSelectedItems(newSelectedItems);
			handleSelect(newSelectedItems);
		} else {
			if (selectedItems.includes(itemKey)) {
				setSelectedItems([]);
				handleSelect(null);
				setAvatrColor(false);
			} else {
				setSelectedItems([itemKey]);
				handleSelect(item);
				setAvatrColor(true);
			}
			setOpen(false);
		}
	};

	// Determine text color based on whether value is selected
	const getTextColor = () => {
		if (DataType === "isPriorityData") {
			return value?.name ? "text-gray-900" : "text-blue-600";
		}

		const hasValue = typeof value === "string"
			? value.trim()
			: value?.full_name || value?.name || value?.tag_name;

		return hasValue ? "text-gray-900" : "text-blue-600";
	};

	// Determine if disabled state
	const isDisabled = false;

	const getSearchValue = (item: DropdownData) => {
		if (DataType === "isEmployeeData") {
			return (item as CGUser).full_name || "";
		}
		if (DataType === "isTagsData") {
			return (item as any).tag_name || "";
		}
		return (item as any)?.name || "";
	};

	// Find full user data from employeeData if we only have email
	const getFullUserData = () => {
		if (!value) return null;

		// If value already has full user data, return it
		if (value.user_image !== undefined || value.first_name !== undefined) {
			return value;
		}

		// If we only have email, find the full user data
		const userEmail = typeof value === 'string' ? value : value.email;
		if (userEmail && employeeData) {
			return employeeData.find(user => user.email === userEmail) || value;
		}

		return value;
	};

	// Special render for subtask data - shows avatar with chevron
	const renderSubtaskContent = () => {
		if (DataType === "isEmployeeData") {
			const userData = getFullUserData();

			if (userData && (userData.full_name || userData.email)) {
				const hasImage = !!userData?.user_image;
				const bgColor = getRandomColor(userData?.email || userData?.full_name || "default");

				return (
					<div className="flex items-center justify-between w-full">
						{/* Avatar Container */}
						<div
							className="flex items-center justify-center"
							title={userData.full_name || userData.email} // Tooltip
						>
							<Avatar className="h-7 w-7">
								{hasImage ? (
									<AvatarImage
										src={userData?.user_image}
										alt={userData?.full_name || userData?.email}
									/>
								) : (
									<AvatarFallback
										className={`${bgColor} text-white font-medium flex items-center justify-center text-xs`}
									>
										{getInitials(userData?.first_name, userData?.last_name).toUpperCase()}
									</AvatarFallback>
								)}
							</Avatar>
						</div>

						{/* Chevron Down */}
						<ChevronDown className={`
							w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ml-2
							${open ? "transform rotate-180" : ""}
						`} />
					</div>
				);
			}
		}

		// Fallback for when no user is selected
		return (
			<div className="flex items-center justify-between w-full">
				<div className="flex items-center justify-center">
					<UserCircle className="h-7 w-7 text-blue-500 " />
				</div>
				<ChevronDown className={`
					w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200
					${open ? "transform rotate-180" : ""}
				`} />
			</div>
		);
	};

	return (
		<div className="w-full">
			{label && (
				<label className={`block text-sm font-medium text-gray-700 mb-2 ${labelClassname || ""}`}>
					{label}
				</label>
			)}

			<Popover open={open} onOpenChange={setOpen} modal={true}>
				<PopoverTrigger asChild>
					<button
						type="button"
						disabled={isDisabled}
						className={`
							w-full min-h-[40px] px-3 py-2 text-sm font-medium
							flex items-center justify-between gap-2
							focus:outline-none
							${getTextColor()}
							${hasError ? "border-red-300 focus:border-red-500 focus:ring-red-500" : ""}
							${isDisabled ? "opacity-50 cursor-not-allowed bg-gray-50" : "cursor-pointer hover:border-[#0076BE]"}
							${className || "border border-gray-300 rounded-md bg-white"}
						`}
					>
						{/* Content Container */}
						{isSubtaskData ? (
							// For subtask data, renderSubtaskContent handles both content and chevron
							renderSubtaskContent()
						) : (
							<>
								{/* Original content for non-subtask data */}
								<div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
									{/* Employee Avatar for non-subtask */}
									{DataType === "isEmployeeData" && placeholder !== "Add Reportee" && value && (
										<Avatar className="h-6 w-6 flex-shrink-0">
											<AvatarImage
												src={value?.user_image || Placeholder}
												className={`w-full h-full ${avatarColor ? (value?.user_image ? "" : "filter grayscale brightness-0") : ""
													}`}
											/>
											<AvatarFallback className="h-5 w-5 text-xs bg-gray-100 text-gray-600">
												{getInitials(value?.first_name, value?.last_name)}
											</AvatarFallback>
										</Avatar>
									)}

									{/* Multiple User Avatars for Reportee */}
									{placeholder === "Add Reportee" && Array.isArray(selectedValues) && selectedValues.length > 0 && (
										<div className="flex -space-x-1">
											<CombinedUserAvtar imageData={selectedValues} />
										</div>
									)}

									{/* Display Text */}
									{placeholder !== "Add Reportee" && (
										<span className="truncate text-left">
											{selectedValues}
										</span>
									)}

									{/* Placeholder for reportee when no selection */}
									{placeholder === "Add Reportee" && (!selectedValues || selectedValues.length === 0) && (
										<span className="text-blue-600 text-left">
											{placeholder}
										</span>
									)}
								</div>

								{/* ChevronDown for non-subtask data */}
								<ChevronDown className={`
									w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200
									${open ? "transform rotate-180" : ""}
								`} />
							</>
						)}
					</button>
				</PopoverTrigger>

				<PopoverContent
					className="w-full min-w-[var(--radix-popover-trigger-width)] max-w-[400px] p-0"
					align="start"
					side="bottom"
					sideOffset={4}
				>
					<Command className="w-full">
						<CommandInput
							placeholder={`Search ${label || "items"}...`}
							className="border-none focus:ring-0"
						/>
						<CommandList className="max-h-60">
							<CommandEmpty className="py-6 text-center text-sm text-gray-500">
								No {label ? label.toLowerCase() : "items"} found.
							</CommandEmpty>
							<CommandGroup>
								{data?.map((item, index) => {
									const itemKey = getKey ? getKey(item) : item;
									const itemValue = typeof itemKey === 'object' ? JSON.stringify(itemKey) : itemKey;
									const isSelected = selectedItems.includes(itemKey);
									const searchValue = getSearchValue(item);

									return (
										<CommandItem
											key={index}
											onSelect={() => handleItemSelect(item)}
											value={searchValue}
											className="
												flex items-center justify-between w-full px-3 py-2
												cursor-pointer hover:bg-gray-50
												data-[selected]:bg-gray-50
											"
										>
											<div className="flex items-center gap-3 min-w-0 flex-1">
												{(() => {
													if (DataType === "isPriorityData") {
														const priorityItem = item as (typeof PRIORITY_DATA)[number];
														return (
															<>
																<img
																	src={priorityItem.image}
																	alt={priorityItem.name}
																	className="w-4 h-4 flex-shrink-0"
																/>
																<span
																	style={{ color: priorityItem.color }}
																	className="truncate"
																>
																	{priorityItem.name}
																</span>
															</>
														);
													}

													if (DataType === "isEmployeeData") {
														const userItem = item as CGUser;
														const hasImage = !!userItem?.user_image;
														const bgColor = getRandomColor(
						                          userItem?.email || userItem?.full_name || "default",
					                                );
														return (
															<>
																<Avatar className="h-6 w-6 flex-shrink-0">
																{hasImage ? (
										                  <AvatarImage
																		src={userItem.user_image || Placeholder}
																		alt={userItem.full_name}
																	/>
									) : (
										<AvatarFallback
											className={`${bgColor} text-white font-small flex items-center justify-center text-xs`}
										> 
											{getInitials(
												userItem?.first_name,
												userItem?.last_name,
											).toUpperCase()}
										</AvatarFallback>
									)}
									</Avatar>
																<span className="truncate">{userItem.full_name}</span>
															</>
														);
													}

													if (DataType === "isTagsData") {
														return <span className="truncate">{(item as any).tag_name}</span>;
													}

													if (DataType === "isBranchData") {
														const branchItem = item as CGBranch;
														return (
															<span className="truncate">
																{branchItem?.name?.split("-")[0] || branchItem?.branch_name}
															</span>
														);
													}

													if (DataType === "isDepartmentData") {
														const deptItem = item as CGDepartment;
														return (
															<span className="truncate">
																{deptItem?.department_name?.split("-")[0] || deptItem?.department_name}
															</span>
														);
													}

													return (
														<span className="truncate">
															{(item as any)?.name?.replace(/^ROLE-/, "") || (item as any)?.name || item}
														</span>
													);
												})()}
											</div>

											<Check className={`
												h-4 w-4 flex-shrink-0 text-blue-600 transition-opacity duration-200
												${isSelected ? "opacity-100" : "opacity-0"}
											`} />
										</CommandItem>
									);
								})}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
		</div>
	);
}
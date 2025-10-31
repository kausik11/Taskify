import { RoutingSettings } from "@/components/pages/RoutingSettings/RoutingSettings";
import BranchesComponent from "@/components/settings/BranchesComponent";
import DepartmentsComponent from "@/components/settings/DepartmentsComponent";
import DisplayComponent from "@/components/settings/DisplayComponent";
import HeirarchyComponent from "@/components/settings/HeirarchyComponent";
import HolidayComponent from "@/components/settings/HolidayComponent";
import NotificationComponent from "@/components/settings/NotificationComponent";
import OthersComponent from "@/components/settings/OthersComponent";
import Tabs from "@/components/settings/Tabs";
import TagsComponent from "@/components/settings/TagsComponent";
import TeamMembersComponent from "@/components/settings/TeamMembersComponent";
import { UserContext } from "@/utils/auth/UserProvider";
import { useContext, useEffect, useState } from "react";

const SettingContainer = () => {
	const { roleBaseName, rolePermissions } = useContext(UserContext);
	const [selectedTab, setSelectedTab] = useState("display");

	// Map tabs to their required read permissions
	const tabPermissions = [
		{
			title: "Display",
			value: "display",
			permission: roleBaseName === "ROLE-Admin",
		},
		{
			title: "Branches",
			value: "branches",
			permission: rolePermissions?.branches_read === 1,
		},
		{
			title: "Departments",
			value: "departments",
			permission: rolePermissions?.department_read === 1,
		},
		{
			title: "Team Members",
			value: "members",
			permission: rolePermissions?.team_members_read === 1,
		},
		{
			title: "Notifications",
			value: "notification",
			permission: rolePermissions?.notifications_read === 1,
		},
		{
			title: "Holidays",
			value: "holiday",
			permission: rolePermissions?.holiday_read === 1,
		},
		{ title: "Tags", value: "tag", permission: roleBaseName === "ROLE-Admin" },
		{
			title: "Roles",
			value: "roles",
			permission: roleBaseName === "ROLE-Admin",
		},
		{
			title: "Others",
			value: "others",
			permission: roleBaseName === "ROLE-Admin",
		},
		{
			title: "Routing Settings",
			value: "routing",
			permission: roleBaseName === "ROLE-Admin",
		},
	];

	// Filter tabs based on permissions
	const visibleTabs = tabPermissions.filter((tab) => tab.permission);

	// Ensure selectedTab is valid; fallback to "display" if the current selectedTab is not visible
	useEffect(() => {
		const isSelectedTabVisible = visibleTabs.some(
			(tab) => tab.value === selectedTab,
		);
		if (!isSelectedTabVisible && visibleTabs.length > 0) {
			setSelectedTab(visibleTabs[0].value);
		}
	}, [visibleTabs, selectedTab]);

	return (
		<div className="relative">
			<div className="bg-[#FFFFFF] rounded-[10px] min-w-[1200px] md:min-w-full overflow-x-scroll h-[calc(100vh-50px)] pt-[16px] pb-[50px]">
				<div className="flex flex-col w-full">
					<div className="flex flex-row text-nowrap items-center gap-x-4 px-[16px]">
						{visibleTabs.map((tab) => (
							<Tabs
								key={tab.value}
								title={tab.title}
								value={tab.value}
								selectedTab={selectedTab}
								changeSelectedTab={setSelectedTab}
							/>
						))}
					</div>
					<div
						className="flex flex-1 border-[1px] rounded-[2px] mt-[4px]"
						style={{
							borderColor: "#F0F1F2",
						}}
					/>
				</div>
				<div className="w-full h-full mt-5">
					{selectedTab === "display" && roleBaseName === "ROLE-Admin" && (
						<DisplayComponent />
					)}
					{selectedTab === "branches" &&
            rolePermissions?.branches_read === 1 && <BranchesComponent />}
					{selectedTab === "departments" &&
            rolePermissions?.department_read === 1 && <DepartmentsComponent />}
					{selectedTab === "members" &&
            rolePermissions?.team_members_read === 1 && (
						<TeamMembersComponent />
					)}
					{selectedTab === "notification" &&
            rolePermissions?.notifications_read === 1 && (
						<NotificationComponent />
					)}
					{selectedTab === "holiday" && rolePermissions?.holiday_read === 1 && (
						<HolidayComponent />
					)}
					{selectedTab === "tag" && rolePermissions?.tags_read === 1 && (
						<TagsComponent />
					)}
					{selectedTab === "roles" && rolePermissions?.roles_read === 1 && (
						<HeirarchyComponent />
					)}
					{selectedTab === "others" && roleBaseName === "ROLE-Admin" && (
						<OthersComponent />
					)}
					{selectedTab === "routing" && roleBaseName === "ROLE-Admin" && (
						<RoutingSettings />
					)}
				</div>
			</div>
		</div>
	);
};

export default SettingContainer;

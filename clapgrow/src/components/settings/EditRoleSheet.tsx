import { useFrappeGetDoc, useFrappeUpdateDoc } from "frappe-react-sdk";
import { Label } from "@/components/ui/label";
import { useForm, Controller } from "react-hook-form";
import SheetWrapper from "../common/SheetWrapper";
import { useState, useEffect, useContext } from "react";
import { Loader } from "../layout/AlertBanner/CommonDesign";
import { Checkbox } from "../ui/checkbox";
import { toast } from "sonner";
import { UserContext } from "@/utils/auth/UserProvider";

interface EditRoleFormData {
  role: string;
  permissions: Record<string, boolean>;
}

interface EditRoleSheetProps {
  isOpenSheet: boolean;
  setIsOpenSheet: (isOpen: boolean) => void;
  initialRole?: string;
  mutate?: () => void;
}

const permissionFieldMap: Record<string, string> = {
	"team-member": "assign_team_member",
	"team-lead": "assign_team_lead",
	admin: "assign_admin",
	self: "assign_self",
	"one-time": "create_onetime_task",
	recurring: "create_recurring_task",
	fms: "create_fms",
	"help-ticket": "create_help_ticket",
	"branches/create": "branches_create",
	"branches/delete": "branches_delete",
	"branches/read": "branches_read",
	"branches/update": "branches_write",
	"holiday/create": "holiday_create",
	"holiday/delete": "holiday_delete",
	"holiday/read": "holiday_read",
	"holiday/update": "holiday_write",
	"team-members/create": "team_members_create",
	"team-members/delete": "team_members_delete",
	"team-members/read": "team_members_read",
	"team-members/update": "team_members_write",
	"notifications/read": "notifications_read",
	"notifications/update": "notifications_write",
	"tags/create": "tags_create",
	"tags/delete": "tags_delete",
	"tags/read": "tags_read",
	"tags/update": "tags_write",
	"roles/read": "roles_read",
	"roles/update": "roles_write",
	mis: "mis",
	"smart-insights": "smart_insights",
};

type Permission = {
  id: string;
  label: string;
  children?: Permission[];
};

type PermissionSection = {
  title: string;
  permissions: Permission[];
};

const getPermissionSections = (roleBaseName: string): PermissionSection[] => [
	{
		title: "Assign tasks",
		permissions: [
			{ id: "team-member", label: "Team Member" },
			{ id: "team-lead", label: "Team Lead" },
			{ id: "admin", label: "Admin" },
			{ id: "self", label: "Self" },
		],
	},
	{
		title: "Can Create",
		permissions: [
			{ id: "one-time", label: "One time task" },
			{ id: "recurring", label: "Recurring Task" },
			{ id: "fms", label: "FMS" },
			{ id: "help-ticket", label: "Help Ticket" },
		],
	},
	{
		title: "Settings Access",
		permissions: [
			{
				id: "branches",
				label: "Branches",
				children: [
					{ id: "branches/create", label: "Create" },
					{ id: "branches/delete", label: "Delete" },
					{ id: "branches/read", label: "Read" },
					{ id: "branches/update", label: "Update" },
				],
			},
			{
				id: "holiday",
				label: "Holiday",
				children: [
					{ id: "holiday/create", label: "Create" },
					{ id: "holiday/delete", label: "Delete" },
					{ id: "holiday/read", label: "Read" },
					{ id: "holiday/update", label: "Update" },
				],
			},
			{
				id: "team-members",
				label: "Team Members",
				children: [
					{ id: "team-members/create", label: "Create" },
					{ id: "team-members/delete", label: "Delete" },
					{ id: "team-members/read", label: "Read" },
					{ id: "team-members/update", label: "Update" },
				],
			},
			...(roleBaseName === "ROLE-Admin"
				? [
					{
						id: "notifications",
						label: "Notifications",
						children: [
							{ id: "notifications/update", label: "Update" },
							{ id: "notifications/read", label: "Read" },
						],
					},
				]
				: [
					{
						id: "notifications",
						label: "Notifications",
						children: [{ id: "notifications/read", label: "Read" }],
					},
				]),
			{
				id: "tags",
				label: "Tags",
				children: [
					{ id: "tags/create", label: "Create" },
					{ id: "tags/delete", label: "Delete" },
					{ id: "tags/read", label: "Read" },
					{ id: "tags/update", label: "Update" },
				],
			},
			{
				id: "roles",
				label: "Roles",
				children: [
					{ id: "roles/read", label: "Read" },
					{ id: "roles/update", label: "Update" },
				],
			},
		],
	},
	{
		title: "Access",
		permissions: [
			{ id: "mis", label: "MIS" },
			{ id: "smart-insights", label: "Smart Insights" },
		],
	},
];

const NestedCheckbox = ({
	permission,
	control,
	setValue,
	getValues,
	isSettingsAccess = false,
}: {
  permission: Permission;
  control: any;
  setValue: any;
  getValues: any;
  isSettingsAccess?: boolean;
}) => {
	const [isExpanded, setIsExpanded] = useState(false);

	useEffect(() => {
		if (permission.children) {
			const anyChildChecked = permission.children.some((child) =>
				getValues(`permissions.${child.id}`),
			);
			setIsExpanded(anyChildChecked);
		}
	}, [permission.children, getValues]);

	const handleParentCheckboxChange = (checked: boolean) => {
		if (permission.children) {
			permission.children.forEach((child) => {
				setValue(`permissions.${child.id}`, checked, { shouldDirty: true });
			});
		}
	};

	return (
		<div className="space-y-2">
			<div className="flex items-center space-x-2">
				{permission.children ? (
					<Checkbox
						className="text-[#ACABB2]"
						id={permission.id}
						checked={permission.children.every((child) =>
							getValues(`permissions.${child.id}`),
						)}
						onCheckedChange={handleParentCheckboxChange}
					/>
				) : (
					<Controller
						control={control}
						name={`permissions.${permission.id}`}
						render={({ field }) => (
							<Checkbox
								className="text-[#ACABB2]"
								id={permission.id}
								checked={field.value}
								onCheckedChange={(checked) => {
									field.onChange(checked);
									setValue(`permissions.${child.id}`, checked, {
										shouldDirty: true,
									});
								}}
							/>
						)}
					/>
				)}
				<Label
					className="text-[#5B5967] text-sm cursor-pointer"
					onClick={() => permission.children && setIsExpanded(!isExpanded)}
				>
					{permission.label}
				</Label>
			</div>
			{isExpanded && permission.children && (
				<div className="ml-6 space-y-2">
					{permission.children.map((child) => (
						<NestedCheckbox
							key={child.id}
							permission={child}
							control={control}
							setValue={setValue}
							getValues={getValues}
							isSettingsAccess={isSettingsAccess}
						/>
					))}
				</div>
			)}
		</div>
	);
};

const PermissionGroup = ({
	title,
	permissions,
	control,
	setValue,
	getValues,
}: {
  title: string;
  permissions: Permission[];
  control: any;
  setValue: any;
  getValues: any;
}) => (
	<div className="flex items-start justify-between w-full border-b border-b-[#F0F1F2] pb-2">
		<div className="text-sm font-medium text-[#5B5967] text-muted-foreground w-1/4">
			{title}
		</div>
		<div className="space-y-3 w-3/4">
			{permissions.map((permission) => (
				<NestedCheckbox
					key={permission.id}
					permission={permission}
					control={control}
					setValue={setValue}
					getValues={getValues}
					isSettingsAccess={title === "Settings Access"}
				/>
			))}
		</div>
	</div>
);

export default function EditRoleSheet({
	isOpenSheet,
	setIsOpenSheet,
	initialRole = "Member",
	mutate,
}: EditRoleSheetProps) {
	const { data: doc, isLoading } = useFrappeGetDoc("CG Role", initialRole);
	const { updateDoc, loading: isUpdating } = useFrappeUpdateDoc();
	const { roleBaseName } = useContext(UserContext);
	const { register, handleSubmit, reset, setValue, getValues, control } =
    useForm<EditRoleFormData>({
    	defaultValues: {
    		role: "",
    		permissions: Object.keys(permissionFieldMap).reduce(
    			(acc, key) => ({ ...acc, [key]: false }),
          {} as Record<string, boolean>,
    		),
    	},
    });

	useEffect(() => {
		if (doc) {
			const permissions = Object.entries(permissionFieldMap).reduce(
				(acc, [reactId, fieldName]) => ({
					...acc,
					[reactId]: doc[fieldName] === 1,
				}),
        {} as Record<string, boolean>,
			);
			reset({
				role: doc.role_name.replace(/^ROLE-/, ""),
				permissions,
			});
		}
	}, [doc, reset]);

	const onSubmit = async (data: EditRoleFormData) => {
		if (!doc) return;

		const mappedPermissions = Object.entries(data.permissions).reduce(
			(acc, [reactId, value]) => {
				const fieldName = permissionFieldMap[reactId];
				if (fieldName) {
					acc[fieldName] = value ? 1 : 0;
				}
				return acc;
			},
      {} as Record<string, 0 | 1>,
		);

		try {
			await updateDoc("CG Role", doc.name, {
				role_name: `${data.role}`,
				...mappedPermissions,
			});
			if (mutate) {
				mutate();
			}
			setIsOpenSheet(false);
			toast.success("Role updated successfully.");
		} catch (error) {
			console.error("Error updating role:", error);
			toast.error(
				"Failed to update role. Please check permissions or try again.",
			);
		}
	};

	return (
		<SheetWrapper
			heading="Edit Role"
			isOpenSheet={isOpenSheet}
			setIsOpenSheet={setIsOpenSheet}
		>
			{isLoading ? (
				<Loader />
			) : (
				<form
					className="overflow-y-scroll h-[80vh]"
					onSubmit={handleSubmit(onSubmit)}
				>
					<div className="w-full max-w-2xl pl-0">
						<div className="flex items-center justify-between">
							<div className="space-y-1 flex items-center gap-32 border-b border-b-[#F0F1F2] w-full pb-2">
								<h2 className="text-sm font-medium text-muted-foreground text-[#5B5967]">
                  Role
								</h2>
								<input
									className="text-lg font-semibold text-[#2D2C37]"
									{...register("role", { required: "Role name is required" })}
								/>
							</div>
						</div>
						<div className="space-y-6 pt-6">
							{getPermissionSections(roleBaseName).map((section) => (
								<PermissionGroup
									key={section.title}
									title={section.title}
									permissions={section.permissions}
									control={control}
									setValue={setValue}
									getValues={getValues}
								/>
							))}
						</div>
					</div>
					<div className="sticky bottom-0 left-0 flex items-center justify-end gap-x-3 bg-white w-full border-t border-[#bbbbbb] px-[30px] py-[24px]">
						<button
							type="submit"
							disabled={isUpdating}
							className="bg-[#038EE2] px-4 py-1.5 w-fit rounded-[8px] text-white font-[600] text-[14px]"
						>
							{isUpdating ? "Saving..." : "Save"}
						</button>
					</div>
				</form>
			)}
		</SheetWrapper>
	);
}

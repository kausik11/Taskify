import { ReactNode, useContext, useState } from "react";
import { EditToggle } from "../layout/AlertBanner/CommonDesign";
import { TaskUpdate } from "./CommonTypes";
import { UserContext } from "@/utils/auth/UserProvider";

interface FormDropdownProps {
	label?: string;
	required?: boolean;
	children?: ReactNode;
	width?: string;
	disabled?: boolean;
	helpTicketType?: number;
	nameField?: string;
	editMode?: {
		task_name?: boolean;
		temporaryReallocation?: boolean;
		checker?: boolean;
		task_type?: boolean;
		frequency?: boolean;
		due_date?: boolean;
		priority?: boolean;
		tag?: boolean;
		description?: boolean;
		subTasks?: boolean;
		attach_file?: boolean;
	};
	sublabel?: string;
	setEditMode?: React.Dispatch<
		React.SetStateAction<{
			task_name?: boolean;
			temporaryReallocation?: boolean;
			checker?: boolean;
			task_type?: boolean;
			frequency?: boolean;
			due_date?: boolean;
			priority?: boolean;
			tag?: boolean;
			description?: boolean;
			subTasks?: boolean;
			attach_file?: boolean;
		}>
	>;
	fieldKey?: keyof {
		task_name: boolean;
		temporaryReallocation: boolean;
		checker: boolean;
		task_type: boolean;
		frequency: boolean;
		due_date: boolean;
		priority: boolean;
		tag: boolean;
		description: boolean;
		subTasks: boolean;
		attach_file: boolean;
		parent_task: string;
	};
	userEmail?: string;
	taskupdate?: TaskUpdate;
}

const FormDropdown: React.FC<FormDropdownProps> = ({
	label,
	required = false,
	children,
	setEditMode,
	sublabel,
	editMode,
	fieldKey,
	userEmail,
	taskupdate,
}) => {
	const [isHovered, setIsHovered] = useState(false);
	const { roleBaseName } = useContext(UserContext);

	// Check if EditToggle should be available for this field
	const shouldShowEditToggle = (roleBaseName === "ROLE-Admin" ||
		userEmail === taskupdate?.assignee) &&
		!taskupdate?.is_completed &&
		fieldKey !== "task_type" &&
		!taskupdate?.is_help_ticket;

	return (
		<div
			className={`px-3 py-3 mt-1 flex flex-col md:flex-row md:items-center max-md:gap-y-3 justify-between w-full space-x-4 ${fieldKey && editMode?.[fieldKey]
				? `rounded-[8px] bg-[#F1F5FA] p-6 ${fieldKey === "checker" ? "bg-[#E0E0E0] pointer-events-none" : ""
				}`
				: ""
				}`}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			<div className="sm:flex sm:space-x-4 max-md:flex max-md:flex-col">
				<p className="w-[160px] text-[14px] font-[600] text-[#5B5967]">
					{label} {required && <span className="text-[#D72727]">*</span>}
					{label == "Description" && (
						<p className="text-xs font-[500] text-[#5B5967] leading-snug mt-1">
							{sublabel}
						</p>
					)}
				</p>
				<div>{children}</div>
			</div>

			<div
				className={`w-8 flex justify-center items-center ${fieldKey === "checker" &&
					"text-[#A0A0A0] cursor-not-allowed pointer-events-none"
					}`}
			>
				{shouldShowEditToggle && (
					<div
						className={`transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'
							}`}
					>
						<EditToggle
							fieldKey={fieldKey as keyof typeof editMode}
							toggleEditMode={setEditMode!}
							editMode={editMode!}
						/>
					</div>
				)}
			</div>
		</div>
	);
};

export default FormDropdown;
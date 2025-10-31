import React from "react";
import { Controller } from "react-hook-form";
import CombinedDropDown from "@/components/dashboard/CombinedDropDown";
import { ProfileField } from "@/types/profile";

interface ProfileFormFieldProps {
  field: ProfileField;
  control: any; // Ideally: Control<YourFormType>
  register: any; // Ideally: UseFormRegister<YourFormType>
  isAdmin: boolean;
}

export const ProfileFormField: React.FC<ProfileFormFieldProps> = ({
	field,
	control,
	register,
	isAdmin,
}) => {
	const baseKey = field.key.replace(/_id$/, "");
	const dataType = `is${baseKey.charAt(0).toUpperCase()}${baseKey.slice(1)}Data`;

	const inputId = `field-${field.key}`;

	return (
		<div className="space-y-1">
			<label
				htmlFor={inputId}
				className="text-[#5B5967] font-semibold text-sm"
			>
				{field.label}
			</label>

			{field.isDropdown && isAdmin ? (
				<Controller
					name={field.key}
					control={control}
					render={({ field: controllerField }) => (
						<CombinedDropDown
							value={controllerField.value}
							handleSelect={controllerField.onChange}
							placeholder={`Select ${field.label}`}
							DataType={dataType}
							getKey={(item) => item.name}
							renderItem={(item) => item?.name}
							className="p-[8px]"
						/>
					)}
				/>
			) : (
				<input
					id={inputId}
					{...register(field.key)}
					type={field.type}
					disabled={field.disabled || !isAdmin}
					className={`w-full text-sm px-3 py-2 rounded-lg border ${
						field.disabled || !isAdmin
							? "bg-gray-100 text-gray-500 cursor-not-allowed"
							: "bg-white text-black focus:ring-2 focus:ring-blue-500"
					}`}
				/>
			)}
		</div>
	);
};

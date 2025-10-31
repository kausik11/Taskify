import React from "react";
import { Button } from "@/components/ui/button";
import { ProfileFormField } from "./ProfileFormField";
import { PROFILE_FIELDS, UserProfile } from "@/types/profile";
import { Control, UseFormRegister, UseFormHandleSubmit } from "react-hook-form";

interface ProfileFormProps {
  control: Control<UserProfile>;
  handleSubmit: UseFormHandleSubmit<UserProfile>;
  onSubmit: (data: UserProfile) => void;
  register: UseFormRegister<UserProfile>;
  isAdmin: boolean;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({
	control,
	handleSubmit,
	onSubmit,
	register,
	isAdmin,
}) => (
	<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
		{PROFILE_FIELDS.map((field) => (
			<ProfileFormField
				key={field.key}
				field={field}
				control={control}
				register={register}
				isAdmin={isAdmin}
			/>
		))}

		<div className="flex justify-end gap-2 pt-4">
			<Button variant="outline" type="button" onClick={() => window.history.back()}>
        Cancel
			</Button>
			<Button type="submit">Save Changes</Button>
		</div>
	</form>
);

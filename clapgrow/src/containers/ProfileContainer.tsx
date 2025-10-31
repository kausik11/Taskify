import { useState, useContext, useEffect, RefObject, useRef } from 'react';
import { FrappeConfig, FrappeContext } from 'frappe-react-sdk';
import { useForm } from 'react-hook-form';
import { useFrappeCreateDoc, useFrappeUpdateDoc } from 'frappe-react-sdk';
import { toast } from 'sonner';
import Logo from '@/assets/images/clapgrow-logo.svg';
import Profile from '@/assets/images/profile.svg';
import edit from '@/assets/icons/editProfile.svg';
import { PasswordForm, PasswordStrength, PROFILE_FIELDS, ProfileField, UserProfile } from '@/types/profile';
import { useProfileData } from '@/hooks/useProfileData';
import { usePasswordStrength } from '@/hooks/usePasswordStrength';
import { useImageCropping } from '@/hooks/useImageCropping';
import { useOutsideClick } from '@/hooks/useOutsideClick';
import { ProfileHeader } from '@/components/ProfileHeader';
import { ProfileImage } from '@/components/ProfileImage';
import { Button } from '@/components/ui/button';
import { ProfileForm } from '@/components/ProfileForm';
import { CropModal } from '@/components/CropModal';
import { PasswordDialog } from '@/components/PasswordDialog';

export const ProfileContainer: React.FC = () => {
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const editDropdownRef = useRef<HTMLDivElement>(null);
	const [showEditOptions, setShowEditOptions] = useState(false);
	const [showPasswordDialog, setShowPasswordDialog] = useState(false);

	const {
		register: registerProfile,
		control,
		handleSubmit: handleProfileSubmit,
		setValue,
		watch,
	} = useForm<UserProfile>({
		defaultValues: { name: "", first_name: "", last_name: "" },
	});

	const {
		register: registerPassword,
		handleSubmit: handlePasswordSubmit,
		formState: { errors: passwordErrors },
		watch: watchPassword,
		reset: resetPassword,
	} = useForm<PasswordForm>({
		defaultValues: {
			current_password: "",
			new_password: "",
			confirm_password: "",
		},
	});

	const { userDetails, mutate, isAdmin, currentUser } = useProfileData(setValue);
	const { updateDoc } = useFrappeUpdateDoc();
	const { createDoc } = useFrappeCreateDoc();
	const { call } = useContext(FrappeContext) as FrappeConfig;

	const userProfile = watch();
	const passwordForm = watchPassword();
	const { passwordStrength, passwordStrengthMessage } = usePasswordStrength(
		passwordForm.new_password,
		passwordForm.current_password
	);

	const {
		imgRef,
		imageSrc,
		crop,
		setCrop,
		completedCrop,
		setCompletedCrop,
		showCropModal,
		setShowCropModal,
		handleImageUpdate,
		getCroppedImg,
		setImageSrc,
	} = useImageCropping();

	useOutsideClick(editDropdownRef, () => setShowEditOptions(false));

	const handleCropSave = async () => {
		if (imgRef.current && completedCrop) {
			const croppedImageUrl = await getCroppedImg(imgRef.current, completedCrop);
			const base64 = croppedImageUrl.split(",")[1];

			if (base64 && userProfile.name) {
				try {
					const filePayload = {
						file_name: `user_image_${userProfile.name}.png`,
						is_private: 1,
						content: base64,
						decode: true,
						attached_to_doctype: "CG User",
						attached_to_name: userProfile.name,
					};

					const { file_url } = await createDoc("File", filePayload);
					await updateDoc("CG User", userProfile.name, { user_image: file_url });
					mutate();
					toast.success("Profile picture updated successfully");
				} catch (error) {
					toast.error("Failed to update profile picture");
					console.error("Crop save error:", error);
				}
			}
			setShowCropModal(false);
			setImageSrc(null);
		}
	};

	const handleRemovePhoto = async () => {
		if (!userProfile.name) return;

		try {
			await updateDoc("CG User", userProfile.name, { user_image: null });
			mutate();
			toast.success("Profile picture removed successfully");
		} catch (error) {
			toast.error("Failed to remove profile picture");
			console.error("Remove photo error:", error);
		}
		setShowEditOptions(false);
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			handleImageUpdate(file);
			setShowEditOptions(false);
		}
	};

	const onProfileSubmit = async (data: UserProfile) => {
		if (!userProfile.name) return;

		try {
			const updateData = {
				...data,
				department_id: typeof data.department_id === "object"
					? data.department_id.department_name
					: data.department_id,
				branch_id: typeof data.branch_id === "object"
					? data.branch_id.branch_name
					: data.branch_id,
				role: typeof data.role === "object" && data.role !== null
					? data.role.name
					: String(data.role || ""),
			};

			if (updateData.role && !updateData.role.startsWith("ROLE-")) {
				updateData.role = `ROLE-${updateData.role}`;
			}

			await updateDoc("CG User", userProfile.name, updateData);
			mutate();
			toast.success("Profile updated successfully");
		} catch (error) {
			toast.error("Failed to update profile");
			console.error("Profile update error:", error);
		}
	};

	const onPasswordSubmit = async (data: PasswordForm) => {
		try {
			if (!passwordStrength?.feedback.password_policy_validation_passed) {
				toast.error("Please choose a stronger password.");
				return;
			}

			await call.post("frappe.core.doctype.user.user.update_password", {
				old_password: data.current_password,
				new_password: data.new_password,
				user: currentUser,
				logout_all_sessions: 1,
			});

			toast.success("Password updated successfully");
			setShowPasswordDialog(false);
			resetPassword();
		} catch (error: any) {
			console.error("Password update error:", error);
			const errorMessage = error?.exception?.includes("Incorrect password")
				? "Current password is incorrect"
				: error?.message?.includes("Multiple logins found")
					? "Multiple login accounts detected. Please contact the administrator."
					: error?.message || "Failed to update password. Please try again.";
			toast.error(errorMessage);
		}
	};

	return (
		<div className="w-full relative">
			<ProfileHeader logoSrc={Logo} />
      
			<div className="w-full absolute top-0 left-0 z-10 bg-transparent max-h-[90vh] overflow-y-scroll pt-5 py-12">
				<div className="w-[45%] bg-white rounded-xl p-5 mx-auto shadow-lg">
					<ProfileImage
						userImage={userProfile?.user_image}
						defaultImage={Profile}
						showEditOptions={showEditOptions}
						onToggleEditOptions={() => setShowEditOptions(!showEditOptions)}
						onChangePhoto={() => fileInputRef.current?.click()}
						onRemovePhoto={handleRemovePhoto}
						onFileChange={handleFileChange}
						editDropdownRef={editDropdownRef}
						fileInputRef={fileInputRef}
						editIcon={edit}
					/>
          
					<div className="flex justify-end gap-2 mt-6">
						<Button
							type="button"
							variant="outline"
							onClick={() => setShowPasswordDialog(true)}
						>
              Change Password
						</Button>
					</div>
          
					<ProfileForm
						control={control}
						handleSubmit={handleProfileSubmit}
						onSubmit={onProfileSubmit}
						register={registerProfile}
						isAdmin={isAdmin}
					/>
				</div>

				<CropModal
					showCropModal={showCropModal}
					onClose={() => setShowCropModal(false)}
					imageSrc={imageSrc}
					crop={crop}
					onCropChange={setCrop}
					onCropComplete={setCompletedCrop}
					imgRef={imgRef}
					onSave={handleCropSave}
				/>

				<PasswordDialog
					showPasswordDialog={showPasswordDialog}
					onClose={() => setShowPasswordDialog(false)}
					onSubmit={handlePasswordSubmit(onPasswordSubmit)}
					register={registerPassword}
					errors={passwordErrors}
					newPassword={passwordForm.new_password}
					passwordStrength={passwordStrength}
					passwordStrengthMessage={passwordStrengthMessage}
				/>
			</div>
		</div>
	);
};

export default ProfileContainer;
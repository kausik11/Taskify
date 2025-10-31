import React, { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { PasswordStrength } from "@/types/profile";
import {
	UseFormRegister,
	FieldErrors,
	SubmitHandler,
} from "react-hook-form";

interface PasswordFormValues {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface PasswordDialogProps {
  showPasswordDialog: boolean;
  onClose: () => void;
  onSubmit: SubmitHandler<PasswordFormValues>;
  register: UseFormRegister<PasswordFormValues>;
  errors: FieldErrors<PasswordFormValues>;
  newPassword: string;
  passwordStrength: PasswordStrength | null;
  passwordStrengthMessage: string;
}

export const PasswordDialog: React.FC<PasswordDialogProps> = ({
	showPasswordDialog,
	onClose,
	onSubmit,
	register,
	errors,
	newPassword,
	passwordStrength,
	passwordStrengthMessage,
}) => {
	const [showCurrent, setShowCurrent] = useState(false);
	const [showNew, setShowNew] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);

	const indicatorColor = passwordStrength
		? passwordStrength.feedback.password_policy_validation_passed
			? "bg-green-500"
			: "bg-red-500"
		: "bg-gray-300";

	return (
		<Dialog open={showPasswordDialog} onOpenChange={onClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Change Password</DialogTitle>
				</DialogHeader>
				<form onSubmit={onSubmit} className="space-y-4">
					{/* Current Password */}
					<div className="space-y-2">
						<Label htmlFor="current_password">Current Password</Label>
						<div className="relative">
							<Input
								id="current_password"
								type={showCurrent ? "text" : "password"}
								{...register("current_password", {
									required: "Current password is required",
								})}
								className={errors.current_password ? "border-red-500 pr-10" : "pr-10"}
							/>
							<button
								type="button"
								onClick={() => setShowCurrent((prev) => !prev)}
								className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
								aria-label={showCurrent ? "Hide password" : "Show password"}
							>
								{showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
							</button>
						</div>
						{errors.current_password && (
							<p className="text-red-500 text-sm">
								{errors.current_password.message}
							</p>
						)}
					</div>

					{/* New Password */}
					<div className="space-y-2">
						<Label htmlFor="new_password">New Password</Label>
						<div className="relative">
							<Input
								id="new_password"
								type={showNew ? "text" : "password"}
								{...register("new_password", {
									required: "New password is required",
									minLength: {
										value: 8,
										message: "Password must be at least 8 characters",
									},
									validate: {
										notSameAsOld: (value, { current_password }) =>
											value !== current_password ||
                      "New password cannot be the same as the old password",
									},
								})}
								className={errors.new_password ? "border-red-500 pr-10" : "pr-10"}
							/>
							<span
								className={`absolute right-8 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${indicatorColor}`}
							/>
							<button
								type="button"
								onClick={() => setShowNew((prev) => !prev)}
								className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
								aria-label={showNew ? "Hide password" : "Show password"}
							>
								{showNew ? <EyeOff size={18} /> : <Eye size={18} />}
							</button>
						</div>
						{errors.new_password && (
							<p className="text-red-500 text-sm">
								{errors.new_password.message}
							</p>
						)}
						{passwordStrengthMessage && (
							<p
								className={`text-sm mt-2 ${
									passwordStrength?.feedback.password_policy_validation_passed
										? "text-green-500"
										: "text-red-500"
								}`}
							>
								{passwordStrengthMessage}
							</p>
						)}
					</div>

					{/* Confirm Password */}
					<div className="space-y-2">
						<Label htmlFor="confirm_password">Confirm New Password</Label>
						<div className="relative">
							<Input
								id="confirm_password"
								type={showConfirm ? "text" : "password"}
								{...register("confirm_password", {
									required: "Please confirm your new password",
									validate: (value) =>
										value === newPassword || "Passwords do not match",
								})}
								className={errors.confirm_password ? "border-red-500 pr-10" : "pr-10"}
							/>
							<button
								type="button"
								onClick={() => setShowConfirm((prev) => !prev)}
								className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
								aria-label={showConfirm ? "Hide password" : "Show password"}
							>
								{showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
							</button>
						</div>
						{errors.confirm_password && (
							<p className="text-red-500 text-sm">
								{errors.confirm_password.message}
							</p>
						)}
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={onClose}>
              Cancel
						</Button>
						<Button
							type="submit"
							disabled={
								!newPassword ||
                !passwordStrength?.feedback.password_policy_validation_passed
							}
						>
              Save Password
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
};

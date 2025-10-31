import { useState, useEffect, useContext } from 'react';
import { FrappeConfig, FrappeContext } from 'frappe-react-sdk';
import { PasswordStrength } from '@/types/profile';


export const usePasswordStrength = (newPassword: string, currentPassword: string) => {
	const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);
	const [passwordStrengthMessage, setPasswordStrengthMessage] = useState<string>("");
	const { call } = useContext(FrappeContext) as FrappeConfig;

	useEffect(() => {
		let timeout: NodeJS.Timeout | null = null;

		const testPasswordStrength = async () => {
			if (!newPassword) {
				setPasswordStrength(null);
				setPasswordStrengthMessage("Please enter a new password");
				return;
			}

			try {
				const response = await call.post(
					"frappe.core.doctype.user.user.test_password_strength",
					{ new_password: newPassword, old_password: currentPassword }
				);

				const { score, feedback } = response.message;
				setPasswordStrength({ score, feedback });

				let message = feedback.password_policy_validation_passed
					? "Success! Your password is strong 👍"
					: [
						feedback.warning || "",
						...(feedback.suggestions || []),
						"Hint: Include symbols, numbers, and capital letters in the password."
					].filter(Boolean).join(" ");

				setPasswordStrengthMessage(message.trim());
			} catch (error) {
				console.error("Password strength check error:", error);
				setPasswordStrength(null);
				setPasswordStrengthMessage("Failed to check password strength. Please try again.");
			}
		};

		if (newPassword) {
			timeout = setTimeout(testPasswordStrength, 500);
		}

		return () => {
			if (timeout) clearTimeout(timeout);
		};
	}, [newPassword, currentPassword, call]);

	return { passwordStrength, passwordStrengthMessage };
};
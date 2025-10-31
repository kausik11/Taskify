import { Mail, Lock, LogIn } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import {
	BiHide,
	BiLogoGoogle,
	BiLogoMicrosoft,
	BiMailSend,
	BiShow,
} from "react-icons/bi";
import { FrappeError, useFrappeAuth, useFrappeGetCall, useFrappePostCall } from "frappe-react-sdk";
import { LoginContext, LoginInputs } from "@/types/Auth/Login";
import { Loader } from "@/layouts/Loader";
import { useForm } from "react-hook-form";
import { ErrorBanner } from "@/components/layout/AlertBanner/ErrorBanner";
import { ErrorText } from "@/components/common/Form";
import clapgrow from "@/assets/images/clapgrow.png";
import { useNavigate } from "react-router-dom";
import AuthLayout from "./AuthLayout";

const SocialProviderIcons = {
	google: <BiLogoGoogle size="18" />,
	microsoft: <BiLogoMicrosoft size="18" />,
};

interface SocialProvider {
	name: "google" | "microsoft";
	provider_name: string;
	auth_url: string;
	redirect_to: string;
	icon: {
		src: string;
		alt: string;
	};
}

const Login = () => {
	const [error, setError] = useState<FrappeError | null>(null);
	const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
	const navigate = useNavigate();

	const base_name = import.meta.env.VITE_BASE_NAME || "";
	const redirect_url = import.meta.env.VITE_LOGIN_REDIRECT_URL
		? `/${base_name}/${import.meta.env.VITE_LOGIN_REDIRECT_URL}`
		: `/${base_name}/dashboard`;

	const { data: loginContext } = useFrappeGetCall<LoginContext>(
		"clapgrow_app.api.login.get_context",
		{
			"redirect-to": redirect_url,
		},
		"clapgrow_app.api.login.get_context",
		{
			revalidateOnMount: true,
			revalidateOnReconnect: false,
			revalidateOnFocus: false,
		},
	);

	const { login } = useFrappeAuth();
	const { call: getUserRedirectUrl } = useFrappePostCall('clapgrow_app.api.login.get_user_redirect_url');

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<LoginInputs>();

	const togglePasswordVisibility = () =>
		setIsPasswordVisible(!isPasswordVisible);

	async function onSubmit(values: LoginInputs) {
		setError(null);

		try {
			await login({ username: values.email, password: values.password });
			
			// After successful login, get the redirect URL based on user roles
			try {
				const redirectResponse = await getUserRedirectUrl({});
				const base_name = import.meta.env.VITE_BASE_NAME || "";
				// Extract the actual URL from the response message property
				const redirect_url = redirectResponse?.message || redirectResponse || "/dashboard";
				
				// Redirect to the appropriate page
				window.location.replace(`${base_name}${redirect_url}`);
			} catch (redirectError) {
				console.error("Error getting redirect URL:", redirectError);
				
				// Fallback: Check roles manually if the dedicated endpoint fails
				try {
					const rolesResponse = await fetch('/api/method/frappe.core.doctype.user.user.get_user_roles', {
						method: 'GET',
						headers: {
							'Accept': 'application/json'
						}
					});
					
					if (rolesResponse.ok) {
						const rolesData = await rolesResponse.json();
						const userRoles = rolesData.message || [];
						
						// Check if user has CG roles
						const hasCgRole = userRoles.some((role: string) => role.startsWith('CG-ROLE-'));
						
						const base_name = import.meta.env.VITE_BASE_NAME || "";
						const redirect_url = hasCgRole ? "/dashboard" : "/app";
						
						window.location.replace(`${base_name}${redirect_url}`);
					} else {
						// Ultimate fallback
						const base_name = import.meta.env.VITE_BASE_NAME || "";
						window.location.replace(`${base_name}/dashboard`);
					}
				} catch (fallbackError) {
					console.error("Fallback redirect also failed:", fallbackError);
					// Final fallback
					const base_name = import.meta.env.VITE_BASE_NAME || "";
					window.location.replace(`${base_name}/dashboard`);
				}
			}
			
		} catch (loginError) {
			// Handle login errors properly
			if (loginError && typeof loginError === 'object') {
				setError(loginError as FrappeError);
			} else {
				// Create a properly formatted error object
				setError({
					exception: "Authentication Error",
					_server_messages: JSON.stringify([{
						message: "Invalid login credentials"
					}]),
					httpStatus: 401,
					httpStatusText: "Unauthorized",
					message: "Invalid login credentials"
				} as FrappeError);
			}
		}
	}

	if (isSubmitting) {
		return (
			<AuthLayout>
				<div className="flex items-center justify-center">
					<div className="text-center">
						<Loader size={45} speed={1.75} color="blue" />
						<p className="mt-4 text-gray-600">Signing you in...</p>
					</div>
				</div>
			</AuthLayout>
		);
	}

	return (
		<AuthLayout>
			<div className="w-full max-w-md">
				{/* Logo and Brand Section */}
				<div className="flex flex-col items-center mb-10">
					<div className="flex items-center space-x-3 mb-3">
						<img
							src={clapgrow}
							className="w-12 h-12 rounded-lg shadow-sm"
							alt="Clapgrow logo"
						/>
						<span className="text-3xl font-bold cal-sans">
							<span className="text-blue-600">Clap</span>
							<span className="text-gray-800">grow</span>
						</span>
					</div>
					<p className="text-gray-600 text-center">
						Organize, track, and manage your tasks efficiently
					</p>
				</div>

				{/* Login Card */}
				<Card className="shadow-lg border-0 bg-white overflow-hidden">
					<CardHeader className="text-center pb-6 bg-gradient-to-r from-blue-50 to-indigo-50 mb-2">
						<CardTitle className="text-2xl font-semibold text-gray-800">
							Welcome back
						</CardTitle>
						<CardDescription className="text-gray-600">
							Enter your credentials to access your account
						</CardDescription>
					</CardHeader>

					{/* Error Banner */}
					{error && (
						<div className="px-6 py-4">
							<ErrorBanner error={error} />
						</div>
					)}

					<form onSubmit={handleSubmit(onSubmit)}>
						<CardContent className="space-y-6 px-6">
							{/* Email Field */}
							<div className="space-y-2">
								<Label
									htmlFor="email"
									className="text-sm font-medium text-gray-700"
								>
									{loginContext?.message?.login_label || "Email Address"}
								</Label>
								<div className="relative">
									<Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
									<Input
										{...register("email", {
											required: `${loginContext?.message?.login_label || "Email address"} is required.`,
										})}
										id="email"
										name="email"
										type="email"
										autoComplete="username"
										placeholder="jane@example.com"
										className="pl-10 h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-all"
									/>
								</div>
								{errors?.email && <ErrorText>{errors.email.message}</ErrorText>}
							</div>

							{/* Password Field */}
							<div className="space-y-2">
								<div className="flex justify-between items-center">
									<Label
										htmlFor="password"
										className="text-sm font-medium text-gray-700"
									>
										Password
									</Label>
									<button
										type="button"
										onClick={() => navigate("/forgot-password")}
										className="text-xs text-blue-600 hover:text-blue-700 hover:underline transition-colors"
									>
										Forgot password?
									</button>
								</div>
								<div className="relative">
									<Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
									<Input
										{...register("password", {
											required: "Password is required.",
										})}
										id="password"
										name="password"
										type={isPasswordVisible ? "text" : "password"}
										autoComplete="current-password"
										placeholder="Enter your password"
										className="pl-10 pr-10 h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-all"
									/>
									<button
										type="button"
										className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
										aria-label={
											isPasswordVisible ? "Hide password" : "Show password"
										}
										onClick={togglePasswordVisibility}
										tabIndex={-1}
									>
										{isPasswordVisible ? (
											<BiHide size={16} />
										) : (
											<BiShow size={16} />
										)}
									</button>
								</div>
								{errors?.password && (
									<ErrorText>{errors.password.message}</ErrorText>
								)}
							</div>
						</CardContent>

						{/* Form Actions */}
						<div className="px-6 pb-6 space-y-4">
							{/* Primary Login Button */}
							<Button
								type="submit"
								className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
								disabled={isSubmitting}
							>
								{isSubmitting ? (
									<span className="flex items-center">
										<svg
											className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
										>
											<circle
												className="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												strokeWidth="4"
											/>
											<path
												className="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											/>
										</svg>
										Signing in...
									</span>
								) : (
									<span className="flex items-center">
										<LogIn className="mr-2 h-4 w-4" />
										Sign in
									</span>
								)}
							</Button>

							{/* Alternative Login Methods */}
							{(loginContext?.message?.login_with_email_link ||
								loginContext?.message?.social_login) && (
									<>
										<div className="relative">
											<div className="absolute inset-0 flex items-center">
												<div className="w-full border-t border-gray-300" />
											</div>
											<div className="relative flex justify-center text-sm">
												<span className="bg-white px-2 text-gray-500">
													Or continue with
												</span>
											</div>
										</div>

										<div className="space-y-3">
											{/* Social Login Buttons */}
											{loginContext?.message?.social_login &&
												loginContext?.message?.provider_logins.map(
													(provider: SocialProvider) => (
														<Button
															key={provider.name}
															asChild
															variant="outline"
															disabled={isSubmitting}
															className="w-full h-11 border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
														>
															<a
																href={provider.auth_url}
																aria-label={`Sign in with ${provider.provider_name}`}
																className="flex items-center justify-center space-x-2"
																onClick={(e) => {
																	if (isSubmitting) {
																		e.preventDefault();
																	}
																}}
															>
																{SocialProviderIcons[provider.name] || (
																	<img
																		src={provider.icon.src}
																		alt={provider.icon.alt}
																		className="h-4 w-4"
																	/>
																)}
																<span>
																	Continue with {provider.provider_name}
																</span>
															</a>
														</Button>
													),
												)}

											{/* Email Link Login */}
											{loginContext?.message?.login_with_email_link && (
												<Button
													type="button"
													variant="outline"
													disabled={isSubmitting}
													onClick={() => navigate("/login-with-email")}
													className="w-full h-11 border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
												>
													<BiMailSend size={16} className="mr-2" />
													<span>Sign in with Email Link</span>
												</Button>
											)}
										</div>
									</>
								)}
						</div>
					</form>
				</Card>
			</div>
		</AuthLayout>
	);
};

export default Login;
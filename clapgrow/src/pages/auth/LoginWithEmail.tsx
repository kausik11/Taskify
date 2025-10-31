import { CalloutObject } from "@/components/common/Callouts/CustomCallouts";
import { ErrorText, Label } from "@/components/common/Form";
import { ErrorBanner } from "@/components/layout/AlertBanner/ErrorBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { LoginInputs } from "@/types/Auth/Login";
import { isEmailValid } from "@/utils/validations";
import { useFrappePostCall } from "frappe-react-sdk";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Mail, ArrowLeft, Send, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Loader } from "@/layouts/Loader";
import clapgrow from "@/assets/images/clapgrow.png";
import AuthLayout from "./AuthLayout";

const LoginWithEmail = () => {
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<LoginInputs>();
	const [callout, setCallout] = useState<CalloutObject | null>(null);

	// POST Call to send login link
	const { call, error } = useFrappePostCall("frappe.www.login.send_login_link");

	async function sendEmailLink(values: LoginInputs) {
		return call({
			email: values.email,
		})
			.then(() => {
				setCallout({
					state: true,
					message: "Login link has been sent to your email address",
				});
			})
			.catch(() => {
				setCallout(null);
			});
	}

	if (isSubmitting) {
		return (
			<AuthLayout>
				<div className="flex items-center justify-center">
					<div className="text-center">
						<Loader size={45} speed={1.75} color="blue" />
						<p className="mt-4 text-gray-600">
              Sending your secure login link...
						</p>
					</div>
				</div>
			</AuthLayout>
		);
	}

	return (
		<AuthLayout>
			<div className="w-full max-w-md mb-[37px]">
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

				{/* Main Card */}
				<Card className="shadow-lg border-0 bg-white overflow-hidden">
					<CardHeader className="text-center pb-6 bg-gradient-to-r from-blue-50 to-indigo-50 mb-2">
						<CardTitle className="text-2xl font-semibold text-gray-800">
              Sign in with Email Link
						</CardTitle>
						<CardDescription className="text-gray-600">
              Enter your email address and we'll send you a secure login link
						</CardDescription>
					</CardHeader>

					{/* Error Banner */}
					{error && (
						<div className="px-6 py-4">
							<ErrorBanner error={error} />
						</div>
					)}

					{/* Success State */}
					{callout && (
						<div className="px-6 py-4">
							<div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
								<div className="flex items-start">
									<div className="flex-shrink-0">
										<div className="p-2 bg-green-100 rounded-full">
											<CheckCircle className="h-5 w-5 text-green-600" />
										</div>
									</div>
									<div className="ml-4">
										<h3 className="text-lg font-medium text-green-800 mb-2">
                      Email Sent Successfully!
										</h3>
										<p className="text-sm text-green-700 mb-3">
											{callout.message}
										</p>
										<div className="space-y-2 text-sm text-green-600">
											<div className="flex items-center">
												<div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2"></div>
                        Check your inbox and spam folder
											</div>
											<div className="flex items-center">
												<div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2"></div>
                        Click the login link to sign in automatically
											</div>
											<div className="flex items-center">
												<div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2"></div>
                        The link expires in 30 minutes for security
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					)}

					<form onSubmit={handleSubmit(sendEmailLink)}>
						<CardContent className="space-y-6 px-6">
							{/* Email Input Field */}
							<div className="space-y-2">
								<Label
									htmlFor="email"
									className="text-sm font-medium text-gray-700"
								>
                  Email Address
								</Label>
								<div className="relative">
									<Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
									<Input
										{...register("email", {
											validate: (email) =>
												isEmailValid(email) ||
                        "Please enter a valid email address.",
											required: "Email address is required.",
										})}
										id="email"
										name="email"
										type="email"
										autoComplete="email"
										placeholder="jane@example.com"
										className="pl-10 h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-all"
										disabled={!!callout}
									/>
								</div>
								{errors?.email && <ErrorText>{errors.email.message}</ErrorText>}
							</div>

							{/* Benefits Section */}
							{!callout && (
								<div className="space-y-4">
									<div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
										<div className="flex items-start">
											<div className="flex-shrink-0">
												<Send className="h-4 w-4 text-gray-500 mt-0.5" />
											</div>
											<div className="ml-3">
												<h4 className="text-sm font-medium text-gray-800 mb-1">
                          How it works
												</h4>
												<p className="text-sm text-gray-600">
                          We'll send a secure, time-limited login link to your
                          email address. Simply click the link to sign in
                          automatically without entering a password.
												</p>
											</div>
										</div>
									</div>
								</div>
							)}
						</CardContent>

						{/* Form Actions */}
						<div className="px-6 pb-6 space-y-4">
							{!callout ? (
								<Button
									type="submit"
									className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
									disabled={isSubmitting}
								>
									<Send className="mr-2 h-4 w-4" />
                  Send Secure Login Link
								</Button>
							) : (
								<div className="space-y-3">
									<Button
										type="button"
										onClick={() => setCallout(null)}
										variant="outline"
										className="w-full h-11 border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
									>
										<Mail className="mr-2 h-4 w-4" />
                    Send Another Link
									</Button>
									<div className="text-center">
										<p className="text-xs text-gray-500">
                      Didn't receive the email? Check your spam folder or try
                      again
										</p>
									</div>
								</div>
							)}

							{/* Back to Login Link */}
							<div className="flex justify-center pt-2">
								<Link
									to="/login"
									className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors group"
								>
									<ArrowLeft className="mr-1 h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                  Back to Login
								</Link>
							</div>
						</div>
					</form>
				</Card>
			</div>
		</AuthLayout>
	);
};

export default LoginWithEmail;

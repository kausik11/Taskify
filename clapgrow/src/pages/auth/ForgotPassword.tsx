// import AuthContainer from "@/components/AuthContainer";
// import { CalloutObject } from "@/components/common/Callouts/CustomCallouts";
// import { ErrorCallout } from "@/components/common/Callouts/ErrorCallouts";
// import { SuccessCallout } from "@/components/common/Callouts/SuccessCallouts";
// // import { Loader } from "@/components/layout/AlertBanner/CommonDesign";
// import { ErrorText, Label } from "@/components/common/Form";

// import { Button } from "@/components/ui/button";
// import { Loader } from "@/layouts/Loader";
// import { ForgotPasswordInput } from "@/types/Auth/Login";
// import { isEmailValid } from "@/utils/validations";
// import { FrappeError, useFrappePostCall } from "frappe-react-sdk";
// import { useState } from "react";
// import { useForm } from "react-hook-form";
// import { AiOutlineMail } from "react-icons/ai"; // Importing react-icon for email icon
// import { Link } from "react-router-dom";

// const ForgotPassword = () => {
//     const {
//         register,
//         handleSubmit,
//         formState: { errors, isSubmitting },
//     } = useForm<ForgotPasswordInput>();
//     const [callout, setCallout] = useState<CalloutObject | null>(null);

//     // POST Call to send reset password instructions on email
//     const { call, error } = useFrappePostCall("frappe.core.doctype.user.user.reset_password");

//     async function resetPassword(values: ForgotPasswordInput) {
//         return call({
//             user: values.user,
//         })
//             .then((res) => {
//                 setCallout({
//                     state: true,
//                     message: "Password reset instructions have been sent to your email.",
//                 });
//             })
//             .catch((err) => {
//                 setCallout(null);
//             });
//     }

//     // TO-DO: To be removed once ErrorBanner/ ErrorCallout is fixed.
//     const generateErrorMessage = (error: FrappeError) => {
//         if (error.exc_type === "ValidationError") return "Too many requests. Please try after some time.";
//         return "User does not exist. Please Sign Up.";
//     };

//     return (
//         <AuthContainer>
//             {error && <ErrorCallout message={generateErrorMessage(error)} />}
//             {callout && <SuccessCallout message={callout.message} />}

//             <div className="max-w-md mx-auto p-6 bg-white rounded-lg">
//                 <form onSubmit={handleSubmit(resetPassword)}>
//                     <div className="flex flex-col space-y-4">
//                         <div className="flex flex-col space-y-2">
//                             <Label htmlFor="user" isRequired>
//                                 Email
//                             </Label>
//                             <div className="relative">
//                                 <AiOutlineMail className="absolute left-3 top-4 text-gray-400" />
//                                 <input
//                                     {...register("user", {
//                                         validate: (user) =>
//                                             isEmailValid(user) || "Please enter a valid email address.",
//                                         required: "Email is required.",
//                                     })}
//                                     name="user"
//                                     type="email"
//                                     placeholder="jane@example.com"
//                                     className="pl-10 p-3 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-600"
//                                     tabIndex={0}
//                                     autoFocus
//                                 />
//                             </div>
//                             {errors?.user && <ErrorText>{errors?.user?.message}</ErrorText>}
//                         </div>
//                         <div className="flex flex-col space-y-2">
//                             <Button
//                                 type="submit"
//                                 className="w-full p-3 rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
//                                 disabled={isSubmitting}
//                             >
//                                 {isSubmitting ?
//         <Loader size={45} speed={1.75} color="blue"/> : "Reset Password"}
//                             </Button>
//                         </div>
//                         <div className="flex justify-center">
//                             <Link to="/login" className="text-cyan-600 hover:underline">
//                                 Back to Login
//                             </Link>
//                         </div>
//                     </div>
//                 </form>
//             </div>
//         </AuthContainer>
//     );
// };

// export default ForgotPassword;
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
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
import { useForm } from "react-hook-form";
import { useFrappePostCall } from "frappe-react-sdk";
import { FrappeError } from "frappe-react-sdk";
import { ErrorBanner } from "@/components/layout/AlertBanner/ErrorBanner";
import { ErrorText } from "@/components/common/Form";
import { Loader } from "@/layouts/Loader";
import clapgrow from "@/assets/images/clapgrow.png";
import { useNavigate } from "react-router-dom";
import AuthLayout from "./AuthLayout";

interface ForgotPasswordInputs {
  email: string;
}

interface ResetPasswordResponse {
  message: string;
}

const ForgotPassword = () => {
	const [error, setError] = useState<FrappeError | null>(null);
	const [isSuccess, setIsSuccess] = useState<boolean>(false);
	const [successMessage, setSuccessMessage] = useState<string>("");
	const navigate = useNavigate();

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		watch,
	} = useForm<ForgotPasswordInputs>();

	const { call: resetPassword } = useFrappePostCall<ResetPasswordResponse>(
		"frappe.core.doctype.user.user.reset_password",
	);

	const email = watch("email");

	async function onSubmit(values: ForgotPasswordInputs) {
		setError(null);
		setIsSuccess(false);

		try {
			const response = await resetPassword({
				user: values.email,
			});

			setIsSuccess(true);
			setSuccessMessage(
				response?.message ||
          "Password reset instructions have been sent to your email address.",
			);
		} catch (error) {
			setError(error as FrappeError);
		}
	}

	const handleBackToLogin = () => {
		navigate("/login");
	};

	if (isSubmitting) {
		return (
			<AuthLayout>
				<div className="flex items-center justify-center">
					<div className="text-center">
						<Loader size={45} speed={1.75} color="blue" />
						<p className="mt-4 text-gray-600">Sending reset instructions...</p>
					</div>
				</div>
			</AuthLayout>
		);
	}

	if (isSuccess) {
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

					{/* Success Card */}
					<Card className="shadow-lg border-0 bg-white overflow-hidden">
						<CardHeader className="text-center pb-6 bg-gradient-to-r from-green-50 to-emerald-50 mb-2">
							<CardTitle className="text-2xl font-semibold text-gray-800">
                Check your email
							</CardTitle>
							<CardDescription className="text-gray-600">
                Password reset instructions sent
							</CardDescription>
						</CardHeader>

						<CardContent className="px-6 pb-6 space-y-6">
							<div className="text-center space-y-4">
								<p className="text-gray-700">{successMessage}</p>
								<p className="text-sm text-gray-700">
                  We’ve sent reset instructions to{" "}
									<span className="font-medium text-gray-800">{email}</span>.
                  Please check your inbox and follow the link to reset your
                  password.
								</p>
								<p className="text-xs text-gray-500 mt-2">
                  Didn’t get the email? Check your spam folder, or try again
                  with a different address.
								</p>
							</div>

							<div className="space-y-3">
								<Button
									onClick={handleBackToLogin}
									className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
								>
									<ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sign In
								</Button>

								<Button
									onClick={() => {
										setIsSuccess(true);
										setError(null);
									}}
									variant="outline"
									className="w-full h-11 border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
								>
                  Try Different Email
								</Button>
							</div>
						</CardContent>
					</Card>
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

				{/* Reset Password Card */}
				<Card className="shadow-lg border-0 bg-white overflow-hidden">
					<CardHeader className="text-center pb-6 bg-gradient-to-r from-blue-50 to-indigo-50 mb-2">
						<CardTitle className="text-2xl font-semibold text-gray-800">
              Forgot your password?
						</CardTitle>
						<CardDescription className="text-gray-600">
              Enter your email address and we'll send you instructions to reset
              your password
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
                  Email Address
								</Label>
								<div className="relative">
									<Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
									<Input
										{...register("email", {
											required: "Email address is required.",
											pattern: {
												value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
												message: "Please enter a valid email address.",
											},
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
						</CardContent>

						{/* Form Actions */}
						<div className="px-6 pb-6 space-y-4">
							{/* Send Reset Instructions Button */}
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
                    Sending instructions...
									</span>
								) : (
									<span className="flex items-center">
										<Mail className="mr-2 h-4 w-4" />
                    Send Reset Instructions
									</span>
								)}
							</Button>

							{/* Back to Login Button */}
							<Button
								type="button"
								variant="outline"
								onClick={handleBackToLogin}
								className="w-full h-11 border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
								disabled={isSubmitting}
							>
								<ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
							</Button>
						</div>
					</form>
				</Card>
			</div>
		</AuthLayout>
	);
};

export default ForgotPassword;

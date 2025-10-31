import { useNavigate } from "react-router-dom";
import { Shield, ArrowLeft } from "lucide-react";

interface AccessDeniedProps {
	title?: string;
	message?: string;
	showBackButton?: boolean;
}

export const AccessDenied = ({ 
	title = "Access Denied", 
	message = "You don't have permission to access this page. Please contact your administrator if you believe this is an error.",
	showBackButton = true 
}: AccessDeniedProps) => {
	const navigate = useNavigate();

	return (
		<div className="min-h-[60vh] flex items-center justify-center p-4">
			<div className="text-center max-w-md mx-auto">
				<div className="mb-6">
					<div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
						<Shield className="w-8 h-8 text-gray-400" />
					</div>
					<h1 className="text-2xl font-bold text-gray-900 mb-2">
						{title}
					</h1>
					<p className="text-gray-600 leading-relaxed">
						{message}
					</p>
				</div>

				{showBackButton && (
					<div className="flex gap-3 justify-center">
						<button
							onClick={() => navigate(-1)}
							className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
						>
							<ArrowLeft size={16} />
							Go Back
						</button>
						<button
							onClick={() => navigate("/dashboard")}
							className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
						>
							Go to Dashboard
						</button>
					</div>
				)}
			</div>
		</div>
	);
};
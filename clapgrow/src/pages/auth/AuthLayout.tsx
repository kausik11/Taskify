import { CheckCircle, CheckSquare, ListChecks } from "lucide-react";
import { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
	const featureItems = [
		"Task Management",
		"Team Collaboration",
		"Priority Tracking",
		"Deadline Alerts",
	];

	return (
		<div className="flex min-h-screen">
			{/* Left Panel - Brand Showcase (Consistent across all auth pages) */}
			<div className="hidden lg:flex w-1/2 items-center justify-center bg-gradient-to-br from-blue-800 to-blue-500 text-white p-12">
				<div className="flex flex-col items-center text-center max-w-lg">
					{/* Animated Icons Section */}
					<div className="relative mb-8">
						<div className="absolute -top-12 -left-12 w-24 h-24 bg-white/10 rounded-xl flex items-center justify-center transform rotate-12 animate-pulse">
							<CheckCircle size={34} />
						</div>
						<div className="absolute -bottom-16 -right-10 w-28 h-28 bg-white/10 rounded-xl flex items-center justify-center transform -rotate-6 animate-pulse delay-300">
							<CheckSquare size={38} />
						</div>
						<div className="w-36 h-36 bg-white/20 rounded-2xl flex items-center justify-center shadow-2xl backdrop-blur-sm">
							<ListChecks size={66} />
						</div>
					</div>

					{/* Main Headline */}
					<h1 className="text-3xl font-bold mb-6 animate-fadeInUp">
            Organize, track, and manage your tasks efficiently
					</h1>

					{/* Feature Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
						{featureItems.map((text, index) => (
							<div
								key={text}
								className="bg-white/10 backdrop-blur-sm p-4 rounded-xl flex items-center opacity-0 animate-fadeInUp transition-all hover:bg-white/20"
								style={{
									animationDelay: `${index * 0.2 + 0.6}s`,
									animationFillMode: "forwards",
								}}
							>
								<CheckCircle className="mr-3 flex-shrink-0" size={20} />
								<span className="text-sm font-medium">{text}</span>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Right Panel - Dynamic Content */}
			<div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50/50">
				{children}
			</div>
		</div>
	);
};

export default AuthLayout;

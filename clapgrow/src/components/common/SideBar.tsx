import sparkles from "@/assets/icons/sparkles.svg";
import byCG from "@/assets/images/byCg.svg";
import logo from "@/assets/images/Logo.png";
import { cn } from "@/lib/utils";
import { UserContext } from "@/utils/auth/UserProvider";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useContext, useState, useEffect } from "react";
import SidebarSubItem from "./SidebarSubItem";
import { useSidebarData } from "./commonColumns";

export default function SideBar() {
	const [isOpen, setOpen] = useState(false); // Start closed by default
	const [isMobile, setIsMobile] = useState(false);
	const { companyDetails, userDetails } = useContext(UserContext);
	const [trialProgress, setTrialProgress] = useState(0);
	const [daysLeft, setDaysLeft] = useState(0);
	const [companyLogo, setCompanyLogo] = useState<string | undefined>("");

	const SIDEBAR_DATA = useSidebarData();

	// Detect mobile screen size and set initial sidebar state
	useEffect(() => {
		const checkMobile = () => {
			const mobile = window.matchMedia("(max-width: 768px)").matches;
			setIsMobile(mobile);
			
			// Only set initial state, don't override user interactions
			if (!mobile) {
				setOpen(true); // Open by default on desktop
			}
			// Keep closed on mobile (already false by default)
		};

		checkMobile();
		window.addEventListener('resize', checkMobile);
		
		return () => window.removeEventListener('resize', checkMobile);
	}, []);

	useEffect(() => {
		if (companyDetails && companyDetails.length > 0) {
			const company = companyDetails[0];

			if (company?.is_trial === 1 && company.creation) {
				const createdDate = new Date(company.creation);

				if (isNaN(createdDate.getTime())) {
					console.error("Invalid creation date");
					return;
				}

				const currentDate = new Date();
				const timeDiff = currentDate.getTime() - createdDate.getTime();
				const daysSinceCreation = Math.floor(timeDiff / (1000 * 3600 * 24));

				const trialLength = 15;
				const remainingDays = trialLength - daysSinceCreation;
				setDaysLeft(remainingDays > 0 ? remainingDays : 0);

				const trialProgressPercentage = (daysSinceCreation / trialLength) * 100;
				setTrialProgress(
					trialProgressPercentage > 100 ? 100 : trialProgressPercentage,
				);

				if (daysSinceCreation > trialLength) {
					blockUserAPI();
				}
			}
		}
	}, [companyDetails]);

	const blockUserAPI = async () => {
		try {
			if (companyDetails?.[0]?.name) {
				const response = await fetch(
					`/api/method/clapgrow_app.api.login.block_user?company_id=${companyDetails[0].name}`,
				);

				const data = await response.json();

				if (response.ok) {
					alert("Your trial account has expired.Kindly upgrade.");
				} else {
					console.error("Failed to block user:", data.message);
				}
			} else {
				console.error(
					"Company details are missing or company name is unavailable.",
				);
			}
		} catch (error) {
			console.error("Error blocking user:", error);
		}
	};

	useEffect(() => {
		if (companyDetails && companyDetails.length > 0) {
			const company = companyDetails[0];

			if (company?.company_logo) {
				setCompanyLogo(company.company_logo);
			} else {
				setCompanyLogo(logo);
			}
		}
	}, [companyDetails]);

	return (
		<>
			{/* Mobile Backdrop */}
			{isMobile && isOpen && (
				<div 
					className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
					onClick={() => setOpen(false)}
				/>
			)}
			
			<div
				className={cn(
					"text-black h-full pb-4 md:rounded-lg rounded-r-2xl transition-all duration-300 bg-white flex flex-col shadow-sm relative",
					// Mobile styles - fixed positioning and z-index
					"max-md:fixed max-md:z-50 max-md:h-screen",
					// Enhanced responsive width scaling
					isOpen 
						? "w-[280px] max-md:w-[75vw] max-sm:w-[85vw]" 
						: "w-[80px] max-md:w-[70px]", // Slightly wider on mobile when closed for better icon visibility
					// Mobile positioning - slide out from left when closed
					isMobile && !isOpen && "-translate-x-2 max-md:-translate-x-2"
				)}
			>
				{/* Toggle Button */}
				<button
					onClick={() => setOpen((prev) => !prev)}
					className={cn(
						"absolute top-4 z-10 p-1 rounded-full bg-white border border-gray-300 shadow-sm hover:shadow-md transition-all duration-200",
						isOpen ? "-right-3" : "right-2 max-md:right-1"
					)}
				>
					{isOpen ? (
						<ChevronLeft className="text-gray-500" size={16} />
					) : (
						<ChevronRight className="text-gray-500" size={16} />
					)}
				</button>

				{/* Main Content Container */}
				<div className="flex-grow flex flex-col p-4 max-md:p-3">
					{/* Logo Section */}
					<div className={cn(
						"flex flex-col items-center gap-3 mb-8 max-md:mb-6",
						!isOpen && "mb-6 max-md:mb-4"
					)}>
						<img
							src={companyLogo || logo}
							alt="Company Logo"
							className={cn(
								"object-contain transition-all duration-300",
								isOpen 
									? "w-32 h-auto max-w-[120px] max-md:w-28" 
									: "w-12 h-12 max-md:w-10 max-md:h-10"
							)}
						/>
						{isOpen && (
							<img
								src={byCG}
								alt="CG Logo"
								className="w-14 h-auto opacity-80 transition-opacity duration-300 max-md:w-12"
							/>
						)}
					</div>

					{/* Navigation Items */}
					<div className={cn(
						"flex flex-col w-full space-y-2 max-md:space-y-1",
						isOpen ? "items-center" : "items-center"
					)}>
						{!isMobile ? SIDEBAR_DATA.map((item, index) => (
							<SidebarSubItem
								key={`sidebar-item-${index}`}
								item={item}
								index={index}
								isOpen={isOpen}
							/>
						)): SIDEBAR_DATA.map((item, index) => (
							item.label !== "Settings" && (<SidebarSubItem
								key={`sidebar-item-${index}`}
								item={item}
								index={index}
								isOpen={isOpen}
							/>)
						))}
					</div>
				</div>

				{/* Trial Upgrade Section - Only show when open */}
				{isOpen && companyDetails?.[0]?.is_trial === 1 && (
					<div className="bg-[#2D2C37] text-white p-4 rounded-xl mx-4 mb-4 space-y-3 transition-all duration-300 max-md:mx-3 max-md:p-3">
						<div className="flex justify-between items-center">
							<h2 className="text-lg font-medium max-md:text-base">Upgrade your Plan</h2>
							<img src={sparkles} alt="sparkles" className="w-6 h-6 max-md:w-5 max-md:h-5" />
						</div>
						
						{/* Progress Bar */}
						<div className="w-full bg-gray-700 rounded-full h-2">
							<div
								className="bg-[#57D974] h-2 rounded-full transition-all duration-500"
								style={{ width: `${trialProgress}%` }}
							></div>
						</div>
						
						{/* Trial Info */}
						<div className="flex justify-between items-center text-sm max-md:text-xs">
							<span className="font-medium">
								{daysLeft > 0 ? `${daysLeft} days left` : "Trial Expired"}
							</span>
							<button className="bg-[#038EE2] hover:bg-[#0276CC] text-white font-semibold px-3 py-1.5 rounded-md transition-colors duration-200 max-md:px-2 max-md:py-1 max-md:text-xs">
								Go Premium
							</button>
						</div>
					</div>
				)}
			</div>
		</>
	);
}
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "../ui/accordion";

interface SidebarSubItemProps {
	item: any;
	index: number;
	isOpen: boolean;
}

const SidebarSubItem = ({ item: link, index, isOpen }: SidebarSubItemProps) => {
	const navigate = useNavigate();
	const location = useLocation();
	const [selectedValue, setSelected] = useState(null);
	const [openItems, setOpenItems] = useState<string[]>([]);
	const [isMobile, setIsMobile] = useState(false);
	const isSelected = selectedValue === link.label;

	// Detect mobile screen size
	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.matchMedia("(max-width: 768px)").matches);
		};

		checkMobile();
		window.addEventListener('resize', checkMobile);
		
		return () => window.removeEventListener('resize', checkMobile);
	}, []);

	useEffect(() => {
		if (!isOpen) {
			setOpenItems([]);
			setSelected(null);
		}
	}, [isOpen]);

	// Handle navigation - external vs internal
	const handleNavigation = (href: string, external?: boolean, disabled?: boolean) => {
		// Prevent navigation if item is disabled
		if (disabled) {
			return;
		}

		if (external) {
			window.location.href = href;
		} else {
			navigate(href);
		}
	};

	// For items without sub-items
	if (link.subItems.length === 0) {
		const isDisabled = link.disabled;
		
		return (
			<div
				key={"sidebar-item-link-" + index}
				className={cn(
					"flex items-center gap-3 w-full py-2 px-3 rounded-lg transition-colors duration-200 relative group",
					isDisabled 
						? "opacity-50 cursor-not-allowed" 
						: "cursor-pointer",
					!isDisabled && location.pathname === link.href
						? "bg-[#D4EFFF]"
						: !isDisabled && "hover:bg-gray-100",
					!isOpen && "px-2 max-md:px-1 justify-center"
				)}
				onClick={() => handleNavigation(link.href, link.external, isDisabled)}
			>
				<link.Icon
					size={isOpen ? 20 : (isMobile ? 18 : 20)}
					color={
						isDisabled 
							? "#9CA3AF" 
							: location.pathname === link.href 
								? "#038EE2" 
								: "#5B5967"
					}
					className="flex-shrink-0"
				/>
				{isOpen && (
					<div className="flex items-center gap-2 overflow-hidden">
						<span
							className={cn(
								"text-sm font-medium truncate max-md:text-xs",
								isDisabled
									? "text-gray-400"
									: location.pathname === link.href
										? "text-[#038EE2]"
										: "text-[#5B5967]",
							)}
						>
							{link.label}
						</span>
						{link.beta && (
							<span className="text-xs bg-[#D0F2D7] text-[#5B5967] rounded-full px-2 py-0.5 max-md:px-1">
								Beta
							</span>
						)}
					</div>
				)}
				
				{/* Tooltip for closed state on mobile */}
				{!isOpen && isMobile && (
					<div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
						{isDisabled && "Access Denied"}
					</div>
				)}
			</div>
		);
	}

	// For items with sub-items
	return (
		<Accordion
			key={"sidebar-item-link-" + index}
			className="w-full"
			type="multiple"
			value={isOpen ? openItems : []}
			onValueChange={setOpenItems}
		>
			<AccordionItem className="border-none" value={link.label}>
				<AccordionTrigger
					onClick={() => {
						// If sidebar is closed on mobile, just open the sidebar
						if (!isOpen && isMobile) {
							return;
						}
						
						if (isSelected) {
							setSelected(null);
							setOpenItems(openItems.filter((item) => item !== link.label));
						} else {
							setSelected(link.label);
							setOpenItems([...openItems, link.label]);
						}
					}}
					className={cn(
						"flex justify-center content-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 w-full mb-1 relative group min-h-10 min-w-10",
						isSelected ? "bg-[#D4EFFF]" : "hover:bg-gray-100",
						!isOpen && "px-2 max-md:px-1 flex justify-center content-center gap-0",
					)}
				>
					
					{isOpen && (
						<div className="flex items-center justify-start w-full gap-4">
							<link.Icon 
								size={isOpen ? 20 : (isMobile ? 18 : 20)}
								color={isSelected ? "#038EE2" : "#5B5967"}
								className="flex-shrink-0"
							/>
							<span
								className={cn(
									"text-sm font-medium max-md:text-xs",
									isSelected ? "text-[#038EE2]" : "text-[#5B5967]",
								)}
							>
								{link.label}
							</span>
							{link.label === "Form" && link.subItems.length > 0 && (
								<span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full ml-auto max-md:px-1">
									{link.subItems.length}
								</span>
							)}
						</div>
					)}
					
					{/* Tooltip for closed state */}
					{!isOpen && (
						<div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
							{link.label}
							{link.subItems.length > 0 && ` (${link.subItems.length})`}
						</div>
					)}
				</AccordionTrigger>

				{isOpen && (
					<AccordionContent>
						<div
							className={cn(
								"space-y-1 px-3 max-md:px-2",
								link.scrollable && link.subItems.length > 6
									? "max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
									: "",
							)}
						>
							{link.subItems.map((subLink: any, subIndex: number) => {
								const isSubItemDisabled = subLink.disabled;
								
								return (
									<div
										key={"sidebar-subLink-" + subIndex}
										className={cn(
											"flex items-center gap-2 py-2 px-2 rounded-md transition-colors max-md:py-1.5 max-md:px-1",
											isSubItemDisabled 
												? "opacity-50 cursor-not-allowed" 
												: "cursor-pointer hover:bg-gray-100"
										)}
										onClick={() => handleNavigation(subLink.href, subLink.external, isSubItemDisabled)}
									>
										{subLink.Icon ? (
											<subLink.Icon
												size={18}
												color={
													isSubItemDisabled
														? "#9CA3AF"
														: location.pathname === subLink.href 
															? "#038EE2" 
															: "#6B7280"
												}
												className="flex-shrink-0"
											/>
										) : link.label === "Form" ? (
											<div className={cn(
												"h-4 w-4 rounded-full flex-shrink-0",
												isSubItemDisabled ? "bg-gray-300" : "bg-gray-300"
											)} />
										) : (
											<></>
										)}
										<span
											className={cn(
												"text-sm font-medium truncate max-md:text-xs",
												isSubItemDisabled
													? "text-gray-600"
													: location.pathname === subLink.href
														? "text-[#038EE2]"
														: "text-gray-600",
											)}
											title={`${isSubItemDisabled ? ' Access Denied' : ''}`}
										>
											{subLink.label}
										</span>
									</div>
								);
							})}
						</div>
					</AccordionContent>
				)}
			</AccordionItem>
		</Accordion>
	);
};

export default SidebarSubItem;
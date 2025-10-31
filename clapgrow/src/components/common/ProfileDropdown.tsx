import { AppWindow, CircleUser, LogOut } from "lucide-react";
import logoutSvg from "@/assets/icons/logout.svg";

interface ProfileDropdownProps {
	onNavigate: (path: string) => void;
	onBackToDashboard: () => void;
	onLogout: () => void;
}

interface MenuItemProps {
	icon: React.ReactNode;
	label: string;
	onClick: () => void;
	variant?: 'default' | 'danger';
}

const MenuItem = ({ icon, label, onClick, variant = 'default' }: MenuItemProps) => {
	const baseClasses = "flex items-center gap-3 p-2 text-sm rounded-md transition-colors w-full text-left";
	const variantClasses = {
		default: "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
		danger: "text-red-600 hover:bg-red-50 hover:text-red-700"
	};

	return (
		<button
			onClick={onClick}
			className={`${baseClasses} ${variantClasses[variant]}`}
		>
			<span className={`${variant === 'danger' ? 'text-red-500' : 'text-gray-500'} transition-colors`}>
				{icon}
			</span>
			<span className="font-medium">{label}</span>
		</button>
	);
};

export default function ProfileDropdown({ 
	onNavigate, 
	onBackToDashboard, 
	onLogout 
}: ProfileDropdownProps) {
	return (
		<div className="absolute top-9 right-0 w-48 bg-white rounded-lg border border-gray-200 shadow-lg z-50 py-1">
			<div className="flex flex-col gap-1 p-1">
				<MenuItem
					icon={<CircleUser className="w-4 h-4" />}
					label="My Profile"
					onClick={() => onNavigate("/profile")}
				/>
				<MenuItem
					icon={<AppWindow className="w-4 h-4" />}
					label="Desk"
					onClick={onBackToDashboard}
				/>
				<div className="border-t border-gray-100 my-1" />
				<MenuItem
					icon={<LogOut className="w-4 h-4" />}
					label="Logout"
					onClick={onLogout}
					variant="danger"
				/>
			</div>
		</div>
	);
}
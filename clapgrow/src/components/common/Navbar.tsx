import { memo, useContext, useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useFrappeGetDocList } from "frappe-react-sdk";

import AddTaskSheet from "./AddTask/AddTaskSheet";
import CreateProject from "../Projects/CreateProject";
import ProjectBreadcrumbs from "../Projects/ProjectBreadcrumbs";
import ProjectAddTaskSheet from "../Projects/ProjectAddTaskSheet";
import NotificationDropdown from "./NotificationDropdown";
import ProfileDropdown from "./ProfileDropdown";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronDown } from "lucide-react";
import notificationIcon from "@/assets/icons/notification-icon.svg";
import { UserContext } from "@/utils/auth/UserProvider";

// ==================== TYPES ====================
interface Notification {
	name: string;
	subject: string;
	type: string;
	owner: string;
	read: 0 | 1;
	creation: string;
}

interface NavbarProps {
	onTaskCreated: () => void;
	title?: string;
}

type PageTitleKey = keyof typeof PAGE_TITLES;

// ==================== CONSTANTS ====================
const DESK_URL = import.meta.env.VITE_CLAPGROW_DESK_URL;

const PAGE_TITLES = {
	"/dashboard": "Dashboard",
	"/settings": "Settings", 
	"/profile": "My Profile",
	"/member-insights": "Member Insights",
	"/recurring-task": "Recurring Task",
	"/mis-score": "Team Member Score",
	"/projectsDashoard": "Projects",
	"/selectedprojectsDashoard": "SelectedProjects",
} as const;

const NOTIFICATION_QUERY_CONFIG = {
	fields: ["*"] as const,
	filters: [["type", "=", "alert"]] as const,
	limit: 20,
	orderBy: { field: "creation", order: "desc" } as const,
};

// ==================== CUSTOM HOOKS ====================
const useClickOutside = (
	refs: readonly React.RefObject<HTMLElement>[],
	callback: () => void
) => {
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node;
			const clickedOutside = refs.every(ref => 
				ref.current && !ref.current.contains(target)
			);
			
			if (clickedOutside) {
				callback();
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [refs, callback]);
};

const useNotifications = (isOpen: boolean) => {
	const [notifications, setNotifications] = useState<Notification[]>([]);
	
	const { data, mutate, error } = useFrappeGetDocList<Notification>(
		"Notification Log",
		NOTIFICATION_QUERY_CONFIG,
		{ enabled: isOpen }
	);

	useEffect(() => {
		if (data) {
			setNotifications(data);
		}
	}, [data]);

	const unreadCount = useMemo(() => 
		notifications.filter(notification => notification.read === 0).length, 
	[notifications]
	);

	const markAsRead = useCallback((notificationId: string) => {
		setNotifications(prevNotifications =>
			prevNotifications.map(notification => 
				notification.name === notificationId 
					? { ...notification, read: 1 as const } 
					: notification
			)
		);
	}, []);

	return { 
		notifications, 
		unreadCount, 
		markAsRead, 
		mutate, 
		error,
		isLoading: !data && !error && isOpen 
	};
};

// ==================== COMPONENTS ====================
const ActionButton = memo(({ displayTitle,onTaskCreated}: { displayTitle: string; onTaskCreated: () => void }) => {
	const actionComponents = useMemo(() => ({
		Projects: <CreateProject />,
		SelectedProjects: <ProjectAddTaskSheet />,
	}), []);

	if (displayTitle === "Projects") {
		return actionComponents.Projects;
	}
	
	if (displayTitle === "SelectedProjects") {
		return actionComponents.SelectedProjects;
	}
	
	return <AddTaskSheet onTaskCreated={() => {}} />;
});

ActionButton.displayName = "ActionButton";

const NavbarTitle = memo(({ displayTitle }: { displayTitle: string}) => {
	if (displayTitle === "SelectedProjects") {
		return <ProjectBreadcrumbs />;
	}
	
	if (displayTitle === "Projects") {
		return null;
	}
	
	return (
		<h1 className="font-semibold text-xl text-gray-800">
			{displayTitle}
		</h1>
	);
});

NavbarTitle.displayName = "NavbarTitle";

const NotificationButton = memo(({ 
	unreadCount, 
	onClick, 
	isOpen 
}: { 
	unreadCount: number; 
	onClick: () => void;
	isOpen: boolean;
}) => (
	<button
		onClick={onClick}
		className="relative p-1 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
		aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
		aria-expanded={isOpen}
		type="button"
	>
		<img
			src={notificationIcon}
			alt=""
			className="h-5 w-5"
			role="presentation"
		/>
		{unreadCount > 0 && (
			<span 
				className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-xs text-white"
				aria-label={`${unreadCount} unread notifications`}
			>
				{unreadCount > 9 ? '9+' : unreadCount}
			</span>
		)}
	</button>
));

NotificationButton.displayName = "NotificationButton";

const ProfileButton = memo(({ 
	userDetails, 
	isOpen, 
	onClick 
}: { 
	userDetails: any[];
	isOpen: boolean;
	onClick: () => void;
}) => (
	<button
		onClick={onClick}
		className="flex items-center gap-1 transition-all hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg p-1"
		aria-label="User menu"
		aria-expanded={isOpen}
		type="button"
	>
		{userDetails?.map((user, index) => (
			<Avatar key={index} className="h-[35px] w-[35px]">
				<AvatarImage 
					src={user.user_image} 
					alt={`${user.first_name} ${user.last_name}`} 
				/>
				<AvatarFallback className="bg-blue-600 text-white">
					{user.first_name?.charAt(0)}
					{user.last_name?.charAt(0)}
				</AvatarFallback>
			</Avatar>
		))}
		<ChevronDown 
			className={`h-4 w-4 text-zinc-500 transition-transform ${
				isOpen ? 'rotate-180' : ''
			}`} 
		/>
	</button>
));

ProfileButton.displayName = "ProfileButton";

// ==================== MAIN COMPONENT ====================
const Navbar = memo(({ onTaskCreated, title }: NavbarProps) => {
	const location = useLocation();
	const navigate = useNavigate();
	const { userDetails, logout } = useContext(UserContext);

	// State
	const [isNotificationOpen, setIsNotificationOpen] = useState(false);
	const [isProfileOpen, setIsProfileOpen] = useState(false);
	
	// Refs
	const notificationRef = useRef<HTMLDivElement>(null);
	const profileRef = useRef<HTMLDivElement>(null);

	// Custom hooks
	const { notifications, unreadCount, markAsRead, mutate } = useNotifications(isNotificationOpen);
	
	// Close dropdowns when clicking outside
	const closeDropdowns = useCallback(() => {
		setIsNotificationOpen(false);
		setIsProfileOpen(false);
	}, []);

	useClickOutside([notificationRef, profileRef], closeDropdowns);

	// Computed values
	const pageTitle = useMemo(() => {
		const pathKey = location.pathname as PageTitleKey;
		return PAGE_TITLES[pathKey] || "";
	}, [location.pathname]);

	const displayTitle = useMemo(() => 
		title || pageTitle || "",
	[title, pageTitle]
	);

	// Event handlers
	const handleBackToDashboard = useCallback(() => {
		window.location.assign(DESK_URL);
	}, []);

	const toggleNotification = useCallback(() => {
		setIsNotificationOpen(prev => {
			const newState = !prev;
			if (newState) {
				mutate();
				setIsProfileOpen(false);
			}
			return newState;
		});
	}, [mutate]);

	const toggleProfile = useCallback(() => {
		setIsProfileOpen(prev => {
			const newState = !prev;
			if (newState) {
				setIsNotificationOpen(false);
			}
			return newState;
		});
	}, []);

	const handleLogout = useCallback(() => {
		logout();
		closeDropdowns();
	}, [logout, closeDropdowns]);

	const handleProfileNavigate = useCallback((path: string) => {
		navigate(path);
		closeDropdowns();
	}, [navigate, closeDropdowns]);

	// Keyboard event handlers for accessibility
	useEffect(() => {
		const handleEscapeKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				closeDropdowns();
			}
		};

		if (isNotificationOpen || isProfileOpen) {
			document.addEventListener('keydown', handleEscapeKey);
			return () => document.removeEventListener('keydown', handleEscapeKey);
		}
	}, [isNotificationOpen, isProfileOpen, closeDropdowns]);

	return (
		<header 
			className="flex flex-col-reverse gap-y-2 py-2 md:flex-row md:items-center md:justify-between md:gap-y-0"
			role="banner"
		>
			{/* Title Section */}
			<div className="flex items-center gap-2 hidden md:block">
				<NavbarTitle displayTitle={displayTitle} />
			</div>

			{/* Actions Section */}
			<div className="flex items-center gap-5 max-md:justify-end">
				{/* Action Button */}
				<ActionButton displayTitle={displayTitle} onTaskCreated={onTaskCreated} />

				{/* Notification Dropdown */}
				<div className="relative" ref={notificationRef}>
					<NotificationButton
						unreadCount={unreadCount}
						onClick={toggleNotification}
						isOpen={isNotificationOpen}
					/>
					
					{isNotificationOpen && (
						<NotificationDropdown
							notifications={notifications}
							markAsRead={markAsRead}
						/>
					)}
				</div>

				{/* Profile Dropdown */}
				<div className="relative" ref={profileRef}>
					<ProfileButton
						userDetails={userDetails || []}
						isOpen={isProfileOpen}
						onClick={toggleProfile}
					/>
					
					{isProfileOpen && (
						<ProfileDropdown
							onNavigate={handleProfileNavigate}
							onBackToDashboard={handleBackToDashboard}
							onLogout={handleLogout}
						/>
					)}
				</div>
			</div>
		</header>
	);
});

Navbar.displayName = "Navbar";

export default Navbar;
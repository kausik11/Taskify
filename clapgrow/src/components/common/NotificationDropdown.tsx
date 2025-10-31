import { useContext, useState, useMemo } from "react";
import { FrappeConfig, FrappeContext, useFrappeGetDocList } from "frappe-react-sdk";
import { formatDistanceToNow } from "date-fns";
import { CheckCheck } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import UserAssignees from "../dashboard/UserAssignees";
import { CGUser } from "@/types/ClapgrowApp/CGUser";
import { UserContext } from "@/utils/auth/UserProvider";

interface Notification {
	name: string;
	subject: string;
	type: string;
	owner: string;
	read: 0 | 1;
	creation: string;
}

interface NotificationDropdownProps {
	notifications: Notification[];
	markAsRead: (notificationId: string) => void;
}

const INITIAL_DISPLAY_COUNT = 3;

export default function NotificationDropdown({ 
	notifications, 
	markAsRead 
}: NotificationDropdownProps) {
	const { call } = useContext(FrappeContext) as FrappeConfig;
	const { userDetails } = useContext(UserContext);
	const [showAll, setShowAll] = useState(false);
	const [isProcessing, setIsProcessing] = useState<Set<string>>(new Set());

	// Get unique emails for user data fetching
	const uniqueEmails = useMemo(() => 
		Array.from(new Set(notifications.map(n => n.owner))), 
	[notifications]
	);

	// Fetch user data for notification owners
	const { data: usersData = [] } = useFrappeGetDocList<CGUser>("CG User", {
		fields: [
			"name", "full_name", "first_name", "last_name", 
			"email", "user_image", "role", "designation"
		],
		filters: [
			["email", "in", uniqueEmails],
			["company_id", "=", userDetails?.[0]?.company_id || ""],
		],
	});

	// Memoized user lookup
	const getUserForEmail = useMemo(() => {
		const userMap = new Map(usersData.map(user => [user.email, user]));
		return (email: string) => userMap.get(email);
	}, [usersData]);

	// Visible notifications based on show all state
	const visibleNotifications = useMemo(() => 
		showAll ? notifications : notifications.slice(0, INITIAL_DISPLAY_COUNT),
	[notifications, showAll]
	);

	// Unread notifications for bulk actions
	const unreadNotifications = useMemo(() => 
		notifications.filter(item => item.read === 0),
	[notifications]
	);

	const handleNotificationClick = async (notificationId: string) => {
		if (isProcessing.has(notificationId)) return;

		setIsProcessing(prev => new Set(prev).add(notificationId));
		
		try {
			await call.post(
				`frappe.desk.doctype.notification_log.notification_log.mark_as_read`,
				{ docname: notificationId }
			);
			markAsRead(notificationId);
		} catch (error) {
			console.error("Error marking notification as read:", error);
		} finally {
			setIsProcessing(prev => {
				const newSet = new Set(prev);
				newSet.delete(notificationId);
				return newSet;
			});
		}
	};

	const markAllAsRead = async () => {
		if (unreadNotifications.length === 0) return;

		// Process all unread notifications
		const promises = unreadNotifications.map(item => 
			handleNotificationClick(item.name)
		);
		
		await Promise.allSettled(promises);
	};

	const formatNotificationSubject = (subject: string) => {
		if (!subject.includes(":")) {
			return <span className="text-sm text-gray-600">{subject}</span>;
		}

		const [type, ...rest] = subject.split(":");
		return (
			<p className="text-xs text-gray-600 mt-1">
				<span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs font-medium">
					{type}
				</span>
				<span className="ml-1">{rest.join(":").trim()}</span>
			</p>
		);
	};

	if (notifications.length === 0) {
		return (
			<div className="absolute top-9 right-0 w-80 bg-white rounded-lg border border-gray-200 shadow-lg z-50">
				<div className="p-4 text-center text-gray-500">
					<p className="text-sm">No notifications</p>
				</div>
			</div>
		);
	}

	return (
		<div className="absolute top-9 right-0 w-80 bg-white rounded-lg border border-gray-200 shadow-lg z-50 max-h-96 flex flex-col">
			{/* Header */}
			<div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-lg">
				<h2 className="text-sm font-semibold text-gray-800">
					Notifications {unreadNotifications.length > 0 && (
						<span className="ml-1 text-xs text-blue-600">
							({unreadNotifications.length} unread)
						</span>
					)}
				</h2>
				{unreadNotifications.length > 0 && (
					<button
						onClick={markAllAsRead}
						className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
						disabled={isProcessing.size > 0}
					>
						<CheckCheck className="w-3 h-3" />
						<span>Mark all read</span>
					</button>
				)}
			</div>

			{/* Notification Items */}
			<div className="flex-1 overflow-y-auto">
				<ul className="divide-y divide-gray-100">
					{visibleNotifications.map((item) => {
						const user = getUserForEmail(item.owner);
						const isUnread = item.read === 0;
						const isBeingProcessed = isProcessing.has(item.name);

						return (
							<li
								key={item.name}
								className={`flex items-start p-3 gap-3 cursor-pointer transition-colors ${
									isUnread 
										? "bg-blue-50 hover:bg-blue-100" 
										: "hover:bg-gray-50"
								} ${isBeingProcessed ? "opacity-50" : ""}`}
								onClick={() => handleNotificationClick(item.name)}
							>
								{/* User Avatar */}
								{user && user.full_name !== "Administrator" ? (
									<UserAssignees users={[user]} className="shrink-0 w-7 h-7" />
								) : (
									<Avatar className="w-7 h-7 shrink-0">
										<AvatarFallback className="text-white bg-red-600 font-medium text-sm">
											S
										</AvatarFallback>
									</Avatar>
								)}

								{/* Notification Content */}
								<div className="flex-1 min-w-0">
									<div className="flex items-start justify-between gap-2">
										<p className="text-xs font-medium text-gray-900">
											{user?.full_name || "System"}
										</p>
										<span className="text-xs text-gray-500 whitespace-nowrap shrink-0">
											{formatDistanceToNow(new Date(item.creation), {
												addSuffix: true,
											})}
										</span>
									</div>
									{formatNotificationSubject(item.subject)}
								</div>

								{/* Unread Indicator */}
								{isUnread && (
									<div className="shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-1" />
								)}
							</li>
						);
					})}
				</ul>
			</div>

			{/* Footer */}
			{notifications.length > INITIAL_DISPLAY_COUNT && (
				<div className="p-2 border-t border-gray-100 text-center bg-gray-50 rounded-b-lg">
					<button
						className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
						onClick={() => setShowAll(!showAll)}
					>
						{showAll ? "Show less" : `View all (${notifications.length})`}
					</button>
				</div>
			)}
		</div>
	);
}
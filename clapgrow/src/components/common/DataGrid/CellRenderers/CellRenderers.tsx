import { MarkdownRenderer } from "../../MarkdownRenderer/MarkdownRenderer";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { maskPhoneNumber } from "@/utils/masking";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

export const getCellRenderer = (fieldtype: string) => {
	if (fieldtype === "Check") {
		return (p: any) => <CheckCellRenderer {...p} />;
	} else if (fieldtype === "Data" || fieldtype === "Read Only") {
		return (p: any) => {
			if (p.options) {
				const options = p.options.replace(/ /g, '"');
				if (options === "Email") {
					return <EmailCellRenderer {...p} />;
				} else if (options === "Phone") {
					return <PhoneCellRenderer {...p} />;
				} else {
					return p.value;
				}
			} else {
				return p.value;
			}
		};
	} else if (fieldtype === "Email") {
		return (p: any) => <EmailCellRenderer {...p} />;
	} else if (fieldtype === "Phone") {
		return (p: any) => <PhoneCellRenderer {...p} />;
	} else if (fieldtype === "tag" || fieldtype === "Select") {
		return (p: any) => <TagCellRenderer {...p} />;
	} else if (fieldtype === "badge") {
		return (p: any) => <BadgeCellRenderer {...p} />;
	} else if (fieldtype === "HTML") {
		return (p: any) => <HTMLCellRenderer {...p} />;
	} else if (fieldtype === "Text Editor") {
		return (p: any) => <HTMLCellRenderer {...p} />;
	} else if (fieldtype === "Code") {
		return (p: any) => {
			if (p.options === "HTML") {
				return <HTMLCellRenderer {...p} />;
			} else if (p.options === "Jinja") {
				return <HTMLCellRenderer {...p} />;
			} else {
				return p.value;
			}
		};
	} else if (fieldtype === "Image" || fieldtype === "Attach Image") {
		return (p: any) => <ImageCellRenderer {...p} />;
	} else if (fieldtype === "Link") {
		return (p: any) => <LinkCellRenderer {...p} />;
	} else if (fieldtype === "user-avatar") {
		return (p: any) => <UserAvatarCellRenderer {...p} />;
	} else if (fieldtype === "assignment") {
		return (p: any) => <AvatarGroupCellRenderer {...p} />;
	} else if (fieldtype === "user-tag") {
		return (p: any) => <UserTag {...p} />;
	} else if (fieldtype === "custom-link") {
		return (p: any) => <CustomLinkCellRenderer {...p} />;
	} else if (fieldtype === "Attach") {
		return (p: any) => <AttachCellRenderer {...p} />;
	} else if (fieldtype === "JSON Attachment") {
		return (p: any) => <JSONAttachmentCellRenderer {...p} />;
	} else {
		return undefined;
	}
};

export const CheckCellRenderer = (p: any) => {
	return (
		<Checkbox
			checked={p.value === 1 ? true : false}
			{...p.cellRenderComponentProps}
			disabled={true}
		/>
	);
};

export const EmailCellRenderer = (p: any) => {
	return (
		<a
			href={`mailto:${p.value}`}
			target="_blank"
			rel="noopener noreferrer"
			style={{ textDecoration: "underline" }}
			{...p.cellRenderComponentProps}
		>
			{p.value}
		</a>
	);
};

export const PhoneCellRenderer = (p: any) => {
	return (
		<a
			href={`tel:${p.value}`}
			target="_blank"
			rel="noopener noreferrer"
			style={{ textDecoration: "underline" }}
			{...p.cellRenderComponentProps}
		>
			{maskPhoneNumber(p.value)}
		</a>
	);
};

export const TagCellRenderer = (p: any) => {
	if (p.colorMaps) {
		const color = p.colorMaps[p.value] || "gray";
		return p.value ? (
			<Badge
				className={`
       px-2 py-1 rounded-full
      bg-${color}-100 text-${color}-800 border border-${color}-200
        hover:bg-${color}-200 hover:text-${color}-900 hover:border-${color}-300
      max-w-full overflow-x-hidden
    `}
				{...p.cellRenderComponentProps}
			>
				{p.value}
			</Badge>
		) : (
			p.value
		);
	}
	return p.value ? (
		<Badge
			className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 border border-gray-200 max-w-full overflow-x-hidden hover:bg-gray-200 hover:text-gray-900 hover:border-gray-300"
			{...p.cellRenderComponentProps}
		>
			{p.value}
		</Badge>
	) : (
		p.value
	);
};

export const BadgeCellRenderer = (p: any) => {
	const value = p.valueFormatted ? p.valueFormatted : p.value;
	const color = p.colorMaps?.[p.value] || "gray";
	return value ? (
		<Badge
			className={`
      px-2 py-1 rounded-full
      bg-${color}-100 text-${color}-800 border border-${color}-200 :hover:bg-${color}-200
      hover:text-${color}-900 hover:border-${color}-300
      max-w-full overflow-x-hidden
    `}
			{...p.cellRenderComponentProps}
		>
			{value}
		</Badge>
	) : (
		value
	);
};

export const HTMLCellRenderer = (p: any) => {
	return <MarkdownRenderer content={p.value} className="grid-markdown" />;
};

export const ImageCellRenderer = (p: any) => {
	if (!p.value) return null;
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<img
						src={p.value ?? ""}
						alt=""
						className="w-6 h-6 object-cover rounded"
						{...p.cellRenderComponentProps}
					/>
				</TooltipTrigger>
				<TooltipContent
					side="bottom"
					className="p-0 bg-transparent border-none shadow-lg"
				>
					<img
						src={p.value ?? ""}
						alt=""
						className="w-40 h-40 object-cover rounded"
					/>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
};

export const getWorkflowStateColor = (workflowState: string) => {
	switch (workflowState) {
	case "Approved":
		return "green";
	case "Completed":
		return "green";
	case "Cancelled":
		return "red";
	case "Rejected":
		return "red";
	case "Progress":
		return "blue";
	case "Nurturing":
		return "blue";
	case "Lost":
		return "red";
	default:
		return "gray";
	}
};

export const LinkCellRenderer = (p: any) => {
	const { getRoute } = useGetRouting();
	if (p.value && p.fieldname && p.fieldname === "workflow_state") {
		const value = p.valueFormatted ? p.valueFormatted : p.value;
		const color = p.colorMaps?.[p.value] || getWorkflowStateColor(p.value);
		return (
			<Badge
				className={`px-2 py-1 rounded-full bg-${color}-100 text-${color}-800 border border-${color}-200 max-w-full overflow-x-hidden hover:bg-${color}-200 hover:text-${color}-900 hover:border-${color}-300`}
			>
				{value}
			</Badge>
		);
	} else if (p.doctype && p.value) {
		const route = getRoute(p.doctype as never, p.value);
		return route ? (
			<Link
				to={route}
				style={{ textDecoration: "underline" }}
				{...p.cellRenderComponentProps}
			>
				{p.value}
			</Link>
		) : (
			p.value
		);
	}
	return p.value;
};

export const UserAvatarCellRenderer = (p: any) => {
	const { data } = useFrappeGetDoc<CGUser>("CG User", p.value, p.value ? undefined : null, {
		revalidateOnFocus: false,
		revalidateIfStale: false,
		revalidateOnReconnect: false,
	});
	if (p.doctype) {
		const imageFieldName = p?.cellRendererParams?.image ?? "image";
		const image = p.data[imageFieldName] ?? data?.user_image;
		if (!p.value) return null;
		return (
			<div className="flex items-center pt-1 gap-2" {...p.cellRenderComponentProps}>
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Avatar className="h-8 w-8">
								<AvatarImage
									src={image}
									alt={p.value}
									className="w-full h-full object-cover rounded-full"
								/>
								<AvatarFallback>{p.value?.[0]}</AvatarFallback>
							</Avatar>
						</TooltipTrigger>
						<TooltipContent side="right" className="p-2">
							<div className="flex flex-col gap-0">
								<span className="text-xs font-medium">{data?.full_name ?? p.value}</span>
								<span className="text-xs underline">{p.value}</span>
							</div>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
		);
	}
	return p.value;
};

export const AvatarGroupCellRenderer = (p: any) => {
	const userID =
		p.value && typeof p.value === "string"
			? [p.value]
			: JSON.parse(p.value ?? "[]");
	const userInfo = p.data._user_info;
	if (userID?.length && Object.keys(userInfo).length) {
		return <AvatarGroupCellElement users={userID} userInfo={userInfo} />;
	}
	return null;
};

export const CustomLinkCellRenderer = (p: any) => {
	// return it should look like a link
	return <div className="underline cursor-pointer" {...p.cellRenderComponentProps}>{p.value}</div>;
};

export const AttachCellRenderer = (p: any) => {
	// show file name with download button which will open Link in new tab
	if (!p.value) return null;

	const fileName = p.value.split("/").pop();

	return (
		<Badge
			className="px-2 rounded-md bg-gray-100 text-gray-800 border border-gray-200 overflow-x-hidden hover:bg-gray-200 hover:text-gray-900 hover:border-gray-300"
			{...p.cellRenderComponentProps}
		>
			<span className="text-sm font-normal pr-2">{fileName}</span>
			<a
				href={p.value}
				target="_blank"
				rel="noopener noreferrer"
				className="text-blue-500 hover:underline"
			>
				<DownloadIcon className="w-4 h-4" />
			</a>
		</Badge>
	);
}

export const AvatarGroupCellElement = ({
	users,
	userInfo,
}: {
		users: string[];
		userInfo: Record<string, UserInfo>;
}) => {
	if (!users?.length) return null;

	// Show up to 3 avatars, rest as "+N"
	const max = 3;
	const visibleUsers = users.slice(0, max);
	const extraCount = users.length - max;

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<div className="flex -space-x-2 items-center cursor-pointer">
						{visibleUsers.map((user, idx) => (
							<Avatar
								key={idx}
								className="w-6 h-6 border-2 border-white shadow"
							>
								<AvatarImage
									src={userInfo?.[user]?.image}
									alt={userInfo?.[user]?.fullname}
								/>
								<AvatarFallback>
									{userInfo?.[user]?.fullname?.[0] || "?"}
								</AvatarFallback>
							</Avatar>
						))}
						{extraCount > 0 && (
							<span className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 text-xs border-2 border-white shadow">
								+{extraCount}
							</span>
						)}
					</div>
				</TooltipTrigger>
				<TooltipContent
					side="bottom"
					className="rounded-md p-2 bg-white shadow-md border min-w-[120px]"
				>
					<UserInfoTooltip userID={users} userInfo={userInfo} />
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
};

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const UserInfoTooltip = ({
	userID,
	userInfo,
}: {
		userID: string[];
		userInfo: Record<string, UserInfo>;
}) => {
	const users = [...new Set(userID)];
	return (
		<div className="flex flex-col gap-2 py-1">
			{users.map((user: string, index) => (
				<div key={index} className="flex items-center gap-2">
					<Avatar className="w-5 h-5">
						<AvatarImage
							src={userInfo?.[user]?.image}
							alt={userInfo?.[user]?.fullname}
						/>
						<AvatarFallback>
							{userInfo?.[user]?.fullname?.[0] || "?"}
						</AvatarFallback>
					</Avatar>
					<span className="text-xs">{userInfo?.[user]?.fullname}</span>
				</div>
			))}
		</div>
	);
};

import { Badge } from "@/components/ui/badge";
import { UserInfo } from "../DataGridWithMeta";
import { useGetRouting } from "@/hooks/useGetRouting";
import { DownloadIcon } from "lucide-react";
import { useFrappeGetDoc } from "frappe-react-sdk";
import { User } from "@/types/Core/User";
import { CGUser } from "@/types/ClapgrowApp/CGUser";

export const UserTag = (p: any) => {
	if (p.value) {
		const userTags = p.value.split(",").filter(Boolean);

		if (userTags.length) {
			return (
				<div className="flex flex-row gap-1">
					{userTags.map((tag: string, index: number) => (
						<Badge
							key={index}
							className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 border border-gray-200 max-w-full overflow-x-hidden"
							{...p.cellRenderComponentProps}
						>
							{tag}
						</Badge>
					))}
				</div>
			);
		}
		return p.value;
	}
	return p.value;
};

const JSONAttachmentCellRenderer = (p: any) => {
	if (!p.value) return null;

	let attachments = [];
	if (typeof p.value === "string") {
		try {
			attachments = JSON.parse(p.value);
		} catch (error) {
			console.error("Error parsing JSON attachments:", error);
			return null;
		}
	} else if (Array.isArray(p.value)) {
		attachments = p.value;
	} else if (typeof p.value === "object") {
		attachments = [p.value];
	}

	return (
		<div className="flex flex-nowrap gap-1 pt-1 items-center overflow-x-auto">
			{attachments.map((attachment: any, index: number) => {
				const fileUrl = attachment.file_url;
				if (!fileUrl) return null;

				const fileName = fileUrl.split("/").pop();

				return (
					<Badge
						key={index}
						className="px-1 py-0 h-8 rounded bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200 hover:text-gray-900 hover:border-gray-300 text-[10px] flex items-center"
						{...p.cellRenderComponentProps}
					>
						<span className="pr-1 truncate max-w-[80px]">{fileName}</span>
						<a
							href={fileUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="text-blue-500 hover:underline"
						>
							<DownloadIcon className="w-3 h-3" />
						</a>
					</Badge>
				);
			})}
		</div>
	);
};
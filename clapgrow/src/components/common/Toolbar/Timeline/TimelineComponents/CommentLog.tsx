import { MarkdownRenderer } from "@/components/common/MarkdownRenderer/MarkdownRenderer";
import { useFrappePostCall, useFrappeDeleteDoc } from "frappe-react-sdk";
import { useState } from "react";
import { AiOutlineSave, AiOutlineDelete, AiOutlineEdit } from "react-icons/ai";
import { MdOutlineCancel } from "react-icons/md";
import { GetInfoCommonInterface } from "./type";
import "../documentlog.css";
import { useAuth } from "@/utils/auth/UserProvider";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { UserInfo } from "@/components/common/DataGrid/DataGridWithMeta";

export const CommentLog = ({
	data,
	mutate,
	userInfo,
	isNote = false,
}: {
  data: GetInfoCommonInterface;
  mutate: VoidFunction;
  userInfo: Record<string, UserInfo>;
  isNote?: boolean;
}) => {
	const [text, setText] = useState<string>(
		data.content?.replace(/(<([^>]+)>)/gi, "") ?? "",
	);
	const [isEditing, setIsEditing] = useState<boolean>(false);
	const { call, reset, error, loading } = useFrappePostCall(
		"frappe.desk.form.utils.update_comment",
	);
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const { currentUser } = useAuth();
	const [showMore, setShowMore] = useState(false);

	const onOpen = () => setIsOpen(true);
	const onClose = () => {
		setIsOpen(false);
		reset();
		setText(data.content?.replace(/(<([^>]+)>)/gi, "") ?? "");
	};

	const onSubmit = () => {
		if (text === "") {
			toast.warning("Comment cannot be empty.");
			return;
		}
		call({
			name: data.name,
			content: text,
		}).then(() => {
			mutate();
			setIsEditing(false);
			reset();
			toast.success("Comment updated successfully.");
		});
	};

	const dataOwner = data.owner ?? "";

	return (
		<div className="bg-white rounded-md border p-2 w-full">
			<div className="flex flex-col gap-2 px-2">
				<div className="flex justify-between items-start">
					{/* ErrorBanner can be replaced with your own error display */}
					{error && <div className="text-red-500 text-xs">{error.message}</div>}
					<div className="flex items-start gap-2 pt-1">
						<Avatar className="h-8 w-8">
							<AvatarImage
								src={userInfo[dataOwner]?.image}
								alt={userInfo[dataOwner]?.fullname}
							/>
							<AvatarFallback>
								{userInfo[dataOwner]?.fullname
									?.split(" ")
									.map((name) => name.charAt(0).toUpperCase())
									.join("") || "U"}
							</AvatarFallback>
						</Avatar>
						<div className="flex flex-col items-start">
							<span
								className={cn(
									isNote ? "text-xs" : "text-sm",
									"font-normal leading-tight",
								)}
							>
								{userInfo[dataOwner]?.fullname}
							</span>
							<span className="text-[10px] text-gray-500">
								{userInfo[dataOwner]?.email}
							</span>
						</div>
					</div>
					{currentUser === dataOwner && (
						<div className="flex gap-1">
							{isEditing ? (
								<>
									<Button
										variant="ghost"
										size="sm"
										aria-label="Cancel"
										type="button"
										onClick={() => setIsEditing(false)}
									>
										<MdOutlineCancel />
									</Button>
									<Button
										variant="ghost"
										size="sm"
										aria-label="Save"
										onClick={onSubmit}
										type="button"
										disabled={loading}
									>
										<AiOutlineSave />
									</Button>
								</>
							) : (
								<>
									{data.name && (
										<Button
											variant="ghost"
											size="sm"
											aria-label="Delete"
											type="button"
											onClick={onOpen}
										>
											<AiOutlineDelete className="text-red-500" />
										</Button>
									)}
									<Button
										variant="ghost"
										size="sm"
										type="button"
										aria-label="Edit"
										onClick={() => setIsEditing(true)}
									>
										<AiOutlineEdit />
									</Button>
								</>
							)}
						</div>
					)}
				</div>
				{isEditing ? (
					<Textarea
						placeholder="Write a comment"
						className="rounded-md text-sm"
						rows={2}
						value={text}
						onChange={(e) => setText(e.target.value)}
					/>
				) : (
					<div>
						<div className={cn(isNote ? "text-[10px]" : "text-xs")}>
							<MarkdownRenderer
								content={
									data.content && data.content.length > 0
										? showMore
											? data.content
											: `${data.content?.substring(0, 100)}${data.content.length > 100 ? "..." : ""}`
										: "no note added"
								}
							/>
						</div>
						{data.content && data.content.length > 100 && (
							<Button
								variant="link"
								size="sm"
								className="px-1 h-4 text-xs font-normal"
								onClick={() => setShowMore(!showMore)}
							>
								{showMore ? "Less" : "More"}
							</Button>
						)}
					</div>
				)}
				<span
					className={cn(
						"min-w-[20ch] text-right italic text-xs text-gray-500 font-normal",
						isNote ? "text-[10px]" : "text-xs",
					)}
				>
					{data.creation}
				</span>
			</div>
			{data.name && (
				<DeleteCommentModal
					isOpen={isOpen}
					onClose={onClose}
					name={data.name}
					mutate={mutate}
				/>
			)}
		</div>
	);
};

export const DeleteCommentModal = ({
	isOpen,
	onClose,
	name,
	mutate,
}: {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  mutate: VoidFunction;
}) => {
	const { deleteDoc, error, loading, reset } = useFrappeDeleteDoc();

	const onSubmit = () => {
		deleteDoc("Comment", name).then(() => {
			mutate();
			onClose();
			reset();
			toast.success("Comment deleted successfully.");
		});
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete Comment</DialogTitle>
				</DialogHeader>
				<DialogClose />
				<div className="py-2">
					{error && <div className="text-red-500 text-xs">{error.message}</div>}
					<div className="py-1">
            Are you sure you want to delete this comment?
					</div>
				</div>
				<DialogFooter className="flex gap-2 justify-end">
					<Button variant="ghost" onClick={onClose}>
            Cancel
					</Button>
					<Button variant="destructive" onClick={onSubmit} disabled={loading}>
            Delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

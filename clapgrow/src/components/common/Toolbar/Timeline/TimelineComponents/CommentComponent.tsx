import { useRef, useState } from "react";
import { useFrappePostCall } from "frappe-react-sdk";
import { BiSolidCommentDetail } from "react-icons/bi";
import { useAuth } from "@/utils/auth/UserProvider";
import { toast } from "sonner";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ErrorBanner } from "@/components/layout/AlertBanner/ErrorBanner";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export interface Props {
  doctype: string;
  docname: string;
  mutate: VoidFunction;
}
export const CommentComponent = ({ doctype, docname, mutate }: Props) => {
	const [text, setText] = useState<string>("");
	const { currentUser } = useAuth();

	const inputRef = useRef<HTMLTextAreaElement>(null);

	const { call, reset, error, loading } = useFrappePostCall(
		"frappe.desk.form.utils.add_comment",
	);

	const onSubmit = () => {
		if (text === "") {
			toast.warning("Comment cannot be empty.");
			return;
		}
		call({
			reference_doctype: doctype,
			reference_name: docname,
			content: text,
			comment_email: currentUser,
			comment_by: currentUser,
		}).then(() => {
			mutate();
			setText("");
			reset();
			toast.success("Comment added successfully.");
			onClose();
		});
	};
	const [isOpen, setIsOpen] = useState(false);
	const onOpen = () => {
		setIsOpen(true);
	};
	const onClose = () => {
		setIsOpen(false);
		if (inputRef.current) {
			inputRef.current.value = "";
			setText("");
		}
	};

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen} modal>
			<PopoverTrigger asChild>
				<Button
					variant={"outline"}
					className="h-4 px-3 py-4 text-xs"
					onClick={onOpen}
				>
					<BiSolidCommentDetail />
          Comment
				</Button>
			</PopoverTrigger>
			<PopoverContent className="z-50 w-80 ml-6 p-4">
				<div className="flex flex-col gap-4">
					<div className="text-lg font-semibold">Add Comment</div>
					<ErrorBanner error={error} />
					<Textarea
						placeholder="Write a comment"
						rows={3}
						ref={inputRef}
						value={text}
						onChange={(e) => setText(e.target.value)}
					/>
					<div className="flex justify-end">
						<Button
							size="sm"
							onClick={onSubmit}
							type="button"
							className="flex items-center bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
							disabled={loading || text.trim() === ""}
						>
              Comment
						</Button>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
};

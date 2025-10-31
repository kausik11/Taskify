import React, { useState, useRef, useEffect, useContext } from "react";
import { Avatar, AvatarImage } from "../ui/avatar";
import { AvatarFallback } from "@radix-ui/react-avatar";
import { getInitials } from "../common/CommonFunction";

import { toast } from "sonner";
import {
	FrappeConfig,
	FrappeContext,
	useFrappeUpdateDoc,
	useFrappeCreateDoc,
} from "frappe-react-sdk";
import {mutate} from 'swr'

interface ReopenReasonPopupProps {
  isOpen: boolean;
  onClose: () => void;
  buttonRef: React.RefObject<HTMLButtonElement>;
  UserImage: string | undefined; // Capitalized here
  firstName: string | undefined;
  lastName: string | undefined;

  setReopenReason: React.Dispatch<
    React.SetStateAction<
      {
        reason: string;
        by: {
          first_name: string;
          last_name: string;
          full_name: string;
          user_image: string;
        };
      }[]
    >
  >;
  taskid: string;
  setTaskUpdate: React.Dispatch<React.SetStateAction<any>>;
  setcommentboxreload: React.Dispatch<React.SetStateAction<boolean>>;
}
const ReopenReasonPopup: React.FC<ReopenReasonPopupProps> = ({
	isOpen,
	onClose,

	buttonRef,
	UserImage, // Matches the interface
	firstName,
	lastName,
	setReopenReason,
	taskid,
	setTaskUpdate,
	setcommentboxreload,
}) => {

	
	const { call } = useContext(FrappeContext) as FrappeConfig;
	const { createDoc } = useFrappeCreateDoc();
	const { updateDoc,loading: isUpdating } = useFrappeUpdateDoc();

	const [reason, setReason] = useState("");
	const [isProcessing, setIsProcessing] = useState(false); // Add loading state
	const popupRef = useRef<HTMLDivElement>(null);
	const arrowRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (isOpen && popupRef.current && buttonRef.current && arrowRef.current) {
			const buttonRect = buttonRef.current.getBoundingClientRect();
			if (!buttonRect) return;
			const popupWidth = popupRef.current.offsetWidth;
			const arrowWidth = arrowRef.current.offsetWidth;
			// Position the popup
			popupRef.current.style.bottom = `${
				window.innerHeight - buttonRect.top + 10
			}px`;
			popupRef.current.style.right = `${
				window.innerWidth -
        buttonRect.right -
        popupWidth / 2 +
        buttonRect.width / 2
			}px`;
			// Position the arrow
			arrowRef.current.style.right = `${popupWidth / 2 - arrowWidth / 2}px`;
		}
	}, [isOpen, buttonRef]);

	// if (!isOpen) return null;

	const handleAddReason = async () => {
		if (reason.trim() === "") return;
		setIsProcessing(true); // Set loading state
		const newReason = {
			reason,
			by: {
				first_name: firstName || "",
				last_name: lastName || "",
				full_name: `${firstName || ""} ${lastName || ""}`.trim(),
				user_image: UserImage || "",
			},
		};

		try {
			const response = await updateDoc("CG Task Instance", taskid, {
				is_completed: 0,
				reopened: 1,
			});
			if (response.reopened == 1) {
				// await createDoc("Comment", {
				// 	comment_type: "Comment",
				// 	reference_doctype: "CG Task Instance",
				// 	reference_name: taskid,
				// 	comment_email: newReason.by.full_name || "",
				// 	content: reason,
				// 	subject: "Reopen",
				// });
				 // Create comment for reopen reason
        const newComment = await createDoc("Comment", {
          comment_type: "Comment",
          reference_doctype: "CG Task Instance",
          reference_name: taskid,
          comment_email: newReason.by.full_name || "",
          content: reason,
          subject: "Reopen",
        });

		 // Optimistically update comments cache
        mutate(
          ["comments", taskid],
          (currentComments: any[] | undefined) => {
            if (!currentComments) return [newComment];
            return [newComment, ...currentComments];
          },
          false // Do not revalidate immediately
        );

		 // Optimistically update task details cache
        mutate(
          ["task", taskid],
          (currentTask: any) => ({
            ...currentTask,
            is_completed: 0,
            reopened: 1,
          }),
          false // Do not revalidate immediately
        );

				setTaskUpdate((prev: any) => ({
					...prev,
					is_completed: 0,
					reopened: 1,
				}));
				setReopenReason((prev) => [...prev, newReason]);

				// Trigger comment reload
				setcommentboxreload(true);
				setReason("");
				onClose();
				toast.success("Task reopened successfully");
				return true;
				

				// Revalidate comments and task details caches in the background
        await Promise.all([
          mutate(["comments", taskid]),
          mutate(["task", taskid]),
        ]);
			} else {
				toast.warning("Task Opend, click once more to add comments")
				return false;
			}
		} catch (error: any) {
			const serverMessages = error._server_messages
				? JSON.parse(error._server_messages)
				: null;
			const msgObj = serverMessages ? JSON.parse(serverMessages[0]) : null;
			const errorMessage = msgObj?.message
				? msgObj.message.replace(/<[^>]*>/g, "")
				: "An error occurred while reopening the task";
			toast.error(errorMessage);
			console.error("Error occurred while reopening the task:", error);
		} finally{
			setIsProcessing(false); // Reset loading state
		}
	};

	const handleCancel = () => {
		setReason(""); // Clear the input
		onClose(); // Simply close the popup without modifying task state
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50">
			<div
				ref={popupRef}
				className="absolute bg-white rounded-lg p-6 w-full max-w-md shadow-lg"
			>
				<div
					ref={arrowRef}
					className="absolute -bottom-2 right-1/2 transform translate-x-1/2"
				>
					<svg
						width="16"
						height="9"
						viewBox="0 0 16 9"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path d="M8 9L0.205772 0L15.7942 0L8 9Z" fill="white" />
					</svg>
				</div>
				<div className="flex items-start mb-4">
					<Avatar className="w-[24px] h-[24px] rounded-full mr-3">
						<AvatarImage src={UserImage} alt="Profile Img" />
						<AvatarFallback>{getInitials(firstName, lastName)}</AvatarFallback>
					</Avatar>
					<textarea
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						placeholder="Add reason"
						className="flex-grow p-2 border text-[14px] border-gray-300 rounded-lg resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
						disabled={isProcessing} // Disable input during processing
					/>
				</div>
				<div className="flex justify-end items-center">
					<button
						className="text-[#038EE2] font-[600] text-[12px] border-[1px] border-[#038EE2] rounded-[8px] px-3 py-2  mr-3"
						// onClick={() => {
						//   onClose();
						// }}
						onClick={handleCancel}
						disabled={isProcessing} // Disable button during processing
					>
            Cancel
					</button>
					<button
						// className="bg-[#038EE2] text-white px-4 py-2 rounded-lg font-semibold text-sm"
						className={`bg-[#038EE2] text-white px-4 py-2 rounded-lg font-semibold text-sm ${
              isProcessing ? "opacity-50 cursor-not-allowed" : ""
            }`}
						onClick={handleAddReason}
						disabled={isProcessing} // Disable button during processing
					>
            {isProcessing ? "Processing..." : "Add"}
					</button>
				</div>
			</div>
		</div>
	);
};
export default ReopenReasonPopup;

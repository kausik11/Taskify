import React, { useContext, useState } from "react";

import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { Input } from "@/components/ui/input";
import { UserContext } from "@/utils/auth/UserProvider";
interface Comment {
  comment: string;
  comment_date: string;
  by: {
    user_image: string | undefined;
    first_name: string | undefined;
    last_name: string | undefined;
    full_name: string | undefined;
  };
}

interface CommentSectionProps {
  allComments: Comment[];
  demoProfileImg: string;
  handleCommentSubmit: (e: React.FormEvent<HTMLFormElement>) => void; // Match the type
  getInitials: (firstName: string, lastName: string) => string;
}

const CommentSection: React.FC<CommentSectionProps> = ({
	allComments,
	demoProfileImg,
	handleCommentSubmit,
	getInitials,
}) => {
	const [showAllComments, setShowAllComments] = useState(false);
	const { userDetails } = useContext(UserContext);
	const displayedComments = showAllComments
		? allComments
		: allComments.slice(0, 2);

	const currentDate = new Date().toISOString();

	return (
		<div className="py-[16px] px-[12px] mt-2 flex flex-col max-md:gap-y-3 justify-start w-full space-y-2">
			{/* Header Section */}
			<div className="flex items-center justify-between">
				<p className="min-w-[160px] text-[14px] text-[#5B5967]">Comments</p>
				{allComments.length > 2 && (
					<button
						onClick={() => setShowAllComments((prev) => !prev)}
						className="text-[#007BFF] text-[14px] hover:underline"
					>
						{showAllComments ? "View Less" : "View All"}
					</button>
				)}
			</div>

			{/* Comment Form */}
			<form
				onSubmit={handleCommentSubmit}
				className="w-full flex items-center space-x-3"
			>
				<Avatar className="h-[25px] w-[25px] mx-auto">
					<AvatarImage src={userDetails?.[0]?.user_image} alt="Profile Img" />
					<AvatarFallback>
						{getInitials(
							userDetails?.[0]?.first_name || "",
							userDetails?.[0]?.last_name || "",
						)}
					</AvatarFallback>
				</Avatar>
				<div className="relative w-full">
					<Input
						name="commentInput"
						type="text"
						placeholder="Add a comment..."
						className="w-full pr-16 border border-gray-300 rounded-md"
					/>
					<button
						className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#038EE2] cursor-pointer"
						type="submit"
					>
            Add
					</button>
				</div>
			</form>

			{/* Render Comments */}
			{displayedComments.map((comment, index) => (
				<div className="flex pt-2 items-start space-x-4" key={index}>
					<div className="flex-shrink-0">
						<Avatar className="h-[25px] w-[25px] mx-auto">
							<AvatarImage
								src={comment.by?.user_image || demoProfileImg}
								alt="Profile Img"
							/>
							<AvatarFallback>
								{getInitials(
									comment.by?.first_name || "",
									comment.by?.last_name || "",
								)}
							</AvatarFallback>
						</Avatar>
					</div>
					<div className="flex-1">
						<div className="flex gap-x-2 items-center">
							<h4 className="font-[400] text-[#2D2C37] text-[12px]">
								{comment.by?.full_name || "Unknown User"}
							</h4>
							<p className="text-[#ACABB2] font-[400] text-[12px]">
								{formatDistanceToNow(
									new Date(comment.comment_date || currentDate),
									{
										addSuffix: true,
									},
								)}
							</p>
						</div>
						<p className="text-[#2D2C37] font-[400] text-[14px]">
							{comment.comment}
						</p>
					</div>
				</div>
			))}
		</div>
	);
};

export default CommentSection;

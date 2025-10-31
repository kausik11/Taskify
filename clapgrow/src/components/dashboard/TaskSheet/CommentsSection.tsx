import React from "react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { CommentSkeletonLoader, getInitials } from "@/components/common/CommonFunction";
import UserAssignees from "../UserAssignees";

interface Comment {
  content: string;
  comment_date?: string;
  creation: string;
  owner: string;
  userDetails?: {
    first_name: string;
    last_name: string;
    full_name: string;
    user_image?: string;
  } | null;
}

interface CommentsSectionProps {
  allComments: Comment[];
  showAllComments: boolean;
  setShowAllComments: (show: boolean) => void;
  pendingComment: string;
  setPendingComment: (comment: string) => void;
  isLoading: boolean;
  canEdit: boolean;
  usersDetails: any[];
}

const CommentsSection: React.FC<CommentsSectionProps> = ({
  allComments,
  showAllComments,
  setShowAllComments,
  pendingComment,
  setPendingComment,
  isLoading,
  canEdit,
  usersDetails,
}) => {
  const displayedComments = showAllComments
    ? allComments
    : allComments.slice(0, 5);

  return (
    <div className="py-[16px] px-[12px] mt-4 flex flex-col max-md:gap-y-4 justify-start w-full space-y-3">
      <div className="flex items-center justify-between">
        <p className="min-w-[150px] text-sm text-[#4B4B4F] font-medium">
          Comments
        </p>
        {allComments.length > 5 && (
          <button
            onClick={() => setShowAllComments(!showAllComments)}
            className="text-[#007BFF] text-sm hover:underline transition-colors"
          >
            {showAllComments ? "View Less" : "View All"}
          </button>
        )}
      </div>

      {canEdit && (
        <form className="w-full flex items-center space-x-4">
          <UserAssignees users={usersDetails || []} />
          <div className="relative w-full">
            <Input
              type="text"
              placeholder="Add a comment..."
              className="w-full pr-[16px] border border-[#E5E7EB] rounded-md text-[14px] focus:border-[#0076BE] focus:ring-1 focus:ring-[#0076BE]"
              value={pendingComment}
              onChange={(e) => setPendingComment(e.target.value)}
            />
          </div>
        </form>
      )}

      {isLoading ? (
        <CommentSkeletonLoader />
      ) : (
        <div className="space-y-4">
          {displayedComments.map((comment, index) => (
            <div
              className="flex pt-3 items-start space-x-3"
              key={`comment-${index}`}
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage
                  src={comment?.userDetails?.user_image || ""}
                  alt={comment?.userDetails?.full_name || "User"}
                />
                <AvatarFallback className="text-[12px]">
                  {getInitials(
                    comment?.userDetails?.first_name || "",
                    comment?.userDetails?.last_name || "",
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex gap-x-3 items-center mb-1">
                  <h4 className="font-[500] text-[#1F2937] text-[14px] truncate">
                    {comment?.userDetails?.full_name || "Unknown User"}
                  </h4>
                  <p className="text-[#6B7280] font-[400] text-[12px] flex-shrink-0">
                    {formatDistanceToNow(
                      new Date(comment.comment_date || comment.creation),
                      { addSuffix: true },
                    )}
                  </p>
                </div>
                <p className="text-[#374151] font-[400] text-[14px] leading-relaxed">
                  {comment.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentsSection;
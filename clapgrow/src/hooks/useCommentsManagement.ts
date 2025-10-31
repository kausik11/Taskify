import { useState, useEffect, useContext } from 'react';
import { useFrappeGetDocList, useFrappeCreateDoc } from 'frappe-react-sdk';
import { UserContext } from '@/utils/auth/UserProvider';
import { CGUser } from '@/types/ClapgrowApp/CGUser';
import { toast } from 'sonner';
import {mutate} from 'swr';

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

interface UseCommentsManagementProps {
  taskName: string;
}

interface UseCommentsManagementReturn {
  allComments: Comment[];
  showAllComments: boolean;
  setShowAllComments: (show: boolean) => void;
  pendingComment: string;
  setPendingComment: (comment: string) => void;
  isLoading: boolean;
  reopenComment: string;
  submitComment: () => Promise<void>;
  mutateComments: () => void;
}

export const useCommentsManagement = ({ 
  taskName 
}: UseCommentsManagementProps): UseCommentsManagementReturn => {
  const { createDoc } = useFrappeCreateDoc();
  const { userDetails } = useContext(UserContext);
  const userEmail = userDetails?.[0]?.email || "";

  const [allComments, setAllComments] = useState<Comment[]>([]);
  const [showAllComments, setShowAllComments] = useState(false);
  const [pendingComment, setPendingComment] = useState<string>("");
  const [userDetailsMap, setUserDetailsMap] = useState<{
    [email: string]: CGUser | null;
  }>({});
  const [reopenComment, setReopenComment] = useState("");

  // Fetch comments
  const { 
    data: commentsList, 
    mutate: mutateComments,
    isLoading 
  } = useFrappeGetDocList("Comment", {
    fields: ["*"],
    filters: [
      ["comment_type", "=", "Comment"],
      ["reference_doctype", "=", "CG Task Instance"],
      ["reference_name", "=", taskName],
    ],
    
  });

  // console.log("Task Name for comments:", commentsList);

  // Fetch reopen comments
  const { data: reopenComments } = useFrappeGetDocList("Comment", {
    fields: ["*"],
    filters: [
      ["reference_doctype", "=", "CG Task Instance"],
      ["reference_name", "=", taskName],
    ],
  });

  // Fetch user details for comment owners
  const { data: userDetailsArray } = useFrappeGetDocList<CGUser>("CG User", {
    fields: ["name", "full_name", "first_name", "last_name", "email", "user_image", "role"],
    filters: [["email", "in", allComments?.map((comment) => comment.owner) || []]],
  });

  // Process reopen comments
  useEffect(() => {
    if (reopenComments) {
      const newComments = reopenComments.filter((comment) =>
        comment?.subject?.includes("Reopen"),
      );
      const finalComment = newComments[newComments.length - 1]?.content;
      setReopenComment(finalComment || "");
    }
  }, [reopenComments]);

  // Process comments list
  useEffect(() => {
  // console.log("commentsList:", commentsList); // Debug the value
  if (Array.isArray(commentsList)) {
    setAllComments([...commentsList].reverse());
  } else {
    setAllComments([]);
  }
}, [commentsList]);

  // Create user details map
  useEffect(() => {
    if (userDetailsArray) {
      const userDetailsObject = userDetailsArray.reduce(
        (acc, user) => {
          acc[user.email] = user;
          return acc;
        },
        {} as { [email: string]: CGUser },
      );
      setUserDetailsMap(userDetailsObject);
    }
  }, [userDetailsArray]);

  // Attach user details to comments
  const commentsWithUserDetails = allComments.map((comment) => ({
    ...comment,
    userDetails: userDetailsMap[comment.owner] || null,
  }));

  const submitComment = async () => {
    if (!pendingComment.trim()) {
      return;
    }

    try {
      await createDoc("Comment", {
        comment_type: "Comment",
        reference_doctype: "CG Task Instance",
        reference_name: taskName,
        reference_owner: taskName, // Assuming taskName as reference_owner
        comment_email: userEmail,
        company_id: userDetails?.[0]?.company_id || "",
        content: pendingComment,
      });
      
      setPendingComment("");
      mutateComments();
      toast.success("Comment added successfully");
    } catch (error) {
      console.error("Error submitting comment:", error);
      toast.error("Failed to submit comment");
      throw error; // Re-throw to allow caller to handle
    }
  };

  return {
    allComments: commentsWithUserDetails,
    showAllComments,
    setShowAllComments,
    pendingComment,
    setPendingComment,
    isLoading,
    reopenComment,
    submitComment,
    mutateComments,
  };
};
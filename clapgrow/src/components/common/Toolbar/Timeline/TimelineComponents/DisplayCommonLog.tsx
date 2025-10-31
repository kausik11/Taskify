import { AiOutlineInfoCircle, AiOutlineHistory } from "react-icons/ai";
import { BiCommentDetail } from "react-icons/bi";
import { GoWorkflow } from "react-icons/go";
import { MdAssignmentInd, MdOutlineAttachFile } from "react-icons/md";
import "../documentlog.css";
import { MarkdownRenderer } from "@/components/common/MarkdownRenderer/MarkdownRenderer";
import { GetInfoCommonInterface } from "./type";
import { CommentLog } from "./CommentLog";
import { CiStar } from "react-icons/ci";
import { useAuth } from "@/utils/auth/UserProvider";
import { convertFrappeTimestampToReadableDateTime } from "@/utils/dateconversion";
import { UserInfo } from "@/components/common/DataGrid/DataGridWithMeta";

export const DisplayCommonLog = ({
	data,
	mutate,
	userInfo,
}: {
  data: GetInfoCommonInterface;
  mutate: VoidFunction;
  userInfo: Record<string, UserInfo>;
}) => {
	const { currentUser } = useAuth();

	const getIcon = () => {
		switch (data.type) {
		case "Comment":
			return <BiCommentDetail />;
		case "Assignment":
			return <MdAssignmentInd />;
		case "Attachment":
			return <MdOutlineAttachFile />;
		case "Info":
			return <AiOutlineInfoCircle />;
		case "Like":
			return <CiStar />;
		case "Workflow":
			return <GoWorkflow />;
		default:
			return <AiOutlineHistory />;
		}
	};

	return (
		<div className="flex items-center justify-start w-full z-[1] gap-2">
			<div className="flex items-center justify-center rounded-full p-2 border border-gray-200 bg-white">
				{getIcon()}
			</div>
			{data.type === "Comment" ? (
				<CommentLog data={data} mutate={mutate} userInfo={userInfo} />
			) : (
				<div className="flex items-start justify-between w-full font-medium text-sm log-markdown">
					{data.type === "Like" ? (
						<span className="font-normal text-sm">
							{data.owner === currentUser ? (
								<strong>You</strong>
							) : (
								<strong>
									{userInfo[data.owner as keyof UserInfo]?.fullname}
								</strong>
							)}{" "}
              liked this document.
						</span>
					) : data.type === "Info" ? (
						<MarkdownRenderer
							content={`${
								data.owner === currentUser
									? "You"
									: userInfo[data.owner as keyof UserInfo]?.fullname
							} ${data.content}.`}
						/>
					) : data.type === "Workflow" ? (
						<span className="font-normal text-sm">
              Workflow action applied,{" "}
							{data.owner === currentUser ? (
								<strong>You</strong>
							) : (
								<strong>
									{userInfo[data.owner as keyof UserInfo]?.fullname}
								</strong>
							)}{" "}
              changed status to {data.content}.
						</span>
					) : data.type === "Attachment" ? (
						<MarkdownRenderer
							content={`${
								data.owner === currentUser
									? "You"
									: userInfo[data.owner as keyof UserInfo]?.fullname
							} ${data.content}.`}
						/>
					) : (
						<MarkdownRenderer content={data.content ?? ""} />
					)}
					<span className="min-w-[10ch] w-[20ch] text-right italic text-xs text-gray-500 font-normal">
						{convertFrappeTimestampToReadableDateTime(data.creation)}
					</span>
				</div>
			)}
		</div>
	);
};

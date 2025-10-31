import { MarkdownRenderer } from "@/components/common/MarkdownRenderer/MarkdownRenderer";
import { AiOutlineMail, AiFillLock } from "react-icons/ai";
import { BiLocationPlus } from "react-icons/bi";
import { BsThreeDots, BsChatDots } from "react-icons/bs";
import { MdOutlineTextsms } from "react-icons/md";
import { CiCalendarDate, CiPhone, CiVideoOn } from "react-icons/ci";
import { RiAttachment2 } from "react-icons/ri";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Attachment, CommunicationLogData } from "./type";
import { convertFrappeTimestampToReadableDateTime } from "@/utils/dateconversion";
import { UserInfo } from "@/components/common/DataGrid/DataGridWithMeta";
import { Link } from "react-router-dom";

export const DisplayCommunicationLog = ({
	data,
	userInfo,
	mutate,
}: {
  data: CommunicationLogData;
  userInfo: Record<string, UserInfo>;
  mutate: VoidFunction;
}) => {
	const getIcon = () => {
		switch (data.communication_medium) {
		case "Email":
			return <AiOutlineMail className="w-5 h-5 text-gray-800" />;
		case "Chat":
			return <BsChatDots className="w-5 h-5 text-gray-800" />;
		case "SMS":
			return <MdOutlineTextsms className="w-5 h-5 text-gray-800" />;
		case "Phone":
			return <CiPhone className="w-5 h-5 text-gray-800" />;
		case "Event":
			return <CiCalendarDate className="w-5 h-5 text-gray-800" />;
		case "Meeting":
			return <CiVideoOn className="w-5 h-5 text-gray-800" />;
		case "Visit":
			return <BiLocationPlus className="w-5 h-5 text-gray-800" />;
		case "Other":
			return <BsThreeDots className="w-5 h-5 text-gray-800" />;
		default:
			return <BsThreeDots className="w-5 h-5 text-gray-800" />;
		}
	};

	return (
		<div className="flex items-center justify-start w-full z-[1] gap-2">
			<div className="flex items-center justify-center rounded-full p-2 border border-gray-200 bg-white">
				{getIcon()}
			</div>
			<Card className="p-2 w-full bg-white">
				<div className="flex flex-col gap-1 px-2 w-full">
					<div className="flex justify-between items-start gap-2 pt-1">
						<div className="flex items-start gap-2">
							<Avatar className="h-8 w-8">
								<AvatarImage
									src={userInfo[data.sender]?.image}
									alt={userInfo[data.sender]?.fullname}
								/>
								<AvatarFallback>
									{userInfo[data.sender]?.fullname
										?.split(" ")
										.map((name) => name.charAt(0).toUpperCase())
										.join("") || "U"}
								</AvatarFallback>
							</Avatar>
							<div className="flex flex-col items-start">
								<span className="text-sm font-normal leading-tight">
									{data.sender_full_name}
								</span>
								<span className="text-[10px] text-gray-500">
									{userInfo[data.sender]?.email}
								</span>
							</div>
						</div>
						<span className="text-[10px] text-gray-500">
							{convertFrappeTimestampToReadableDateTime(data.creation)}
						</span>
					</div>

					{data.subject ? (
						<div className="text-xs font-normal">{data.subject}</div>
					) : (
						<div className="text-xs font-normal">
							<MarkdownRenderer content={data.content} />
						</div>
					)}

					<div className="flex flex-col gap-0">
						{data.attachments &&
              JSON.parse(data.attachments).length > 0 &&
              JSON.parse(data.attachments).map(
              	(attachment: Attachment, index: number) => (
              		<div className="flex items-center gap-2" key={index}>
              			<RiAttachment2 className="w-4 h-4" />
              			<Link
              				to={attachment.file_url}
              				target="_blank"
              				rel="noopener noreferrer"
              				className="text-xs text-blue-600 underline"
              			>
              				{attachment.file_url.split("/").pop()}
              			</Link>
              			{attachment.is_private ? (
              				<AiFillLock className="w-3 h-3" />
              			) : null}
              		</div>
              	),
              )}
					</div>
				</div>
			</Card>
		</div>
	);
};

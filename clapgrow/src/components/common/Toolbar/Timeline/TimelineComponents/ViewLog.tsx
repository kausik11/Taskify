import { AiOutlineEye } from "react-icons/ai";
import { Views } from "./type";
import { useAuth } from "@/utils/auth/UserProvider";
import { UserInfo } from "@/components/common/DataGrid/DataGridWithMeta";
import { convertFrappeTimestampToReadableDateTime } from "@/utils/dateconversion";

export const ViewLog = ({
	data,
	userInfo,
}: {
  data: Views;
  userInfo: Record<string, UserInfo>;
}) => {
	const { currentUser } = useAuth();

	return (
		<div className="flex items-center gap-2 w-full z-[1]">
			<div className="flex items-center justify-center rounded-full p-2 border border-gray-200 bg-white">
				<AiOutlineEye className="w-5 h-5 text-gray-800" />
			</div>
			<div className="flex items-start justify-between w-full font-medium log-markdown">
				<span className="font-normal text-sm">
					{data.owner === currentUser ? (
						<strong>You</strong>
					) : (
						<strong>
							{userInfo?.[data.owner as keyof UserInfo]?.fullname ?? data.owner}
						</strong>
					)}{" "}
          viewed this document.
				</span>
				<span className="min-w-[20ch] text-right italic text-xs text-gray-500 font-normal">
					{convertFrappeTimestampToReadableDateTime(data.creation)}
				</span>
			</div>
		</div>
	);
};

import { MarkdownRenderer } from "@/components/common/MarkdownRenderer/MarkdownRenderer";
import { CreationModification } from "./type";
import { IoCreateOutline } from "react-icons/io5";
import { convertFrappeTimestampToReadableDateTime } from "@/utils/dateconversion";

export const CreationModificationLog = ({
	data,
}: {
  data: CreationModification;
}) => {
	return (
		<div className="flex items-center gap-2 w-full z-[1]">
			<div className="flex items-center justify-center rounded-full p-2 border border-gray-200 bg-white">
				<IoCreateOutline className="w-5 h-5 text-gray-800" />
			</div>
			<div className="flex items-start justify-between w-full text-sm font-normal">
				<MarkdownRenderer content={data.content} />
				<span className="min-w-[20ch] text-right italic text-xs text-gray-500">
					{convertFrappeTimestampToReadableDateTime(data.creation)}
				</span>
			</div>
		</div>
	);
};

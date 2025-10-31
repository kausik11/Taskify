import { VscVersions } from "react-icons/vsc";
import { MarkdownRenderer } from "@/components/common/MarkdownRenderer/MarkdownRenderer";
import { convertFrappeTimestampToReadableDateTime } from "@/utils/dateconversion";
import { Versions } from "./type";
import React, { Dispatch } from "react";

export const VersionLog = ({
	data,
	onOpen,
	setVersionData,
}: {
  data: Versions;
  onOpen: VoidFunction;
  setVersionData: Dispatch<React.SetStateAction<string>>;
}) => {
	if (data.content === "") return null;

	const onVersionClick = () => {
		setVersionData(data?.data ?? "");
		onOpen();
	};

	return (
		<div className="flex items-center justify-start w-full z-[1] gap-2">
			<div className="flex items-center justify-center rounded-full p-2 border border-gray-200 bg-white">
				<VscVersions className="w-5 h-5 text-gray-800" />
			</div>
			<div className="flex items-start justify-between w-full font-normal text-sm log-markdown gap-2">
				<div onClick={onVersionClick} className="cursor-pointer">
					<MarkdownRenderer
						content={data.content ?? ""}
						className="undeline-markdown"
					/>
				</div>
				<span className="min-w-[18ch] text-right italic text-xs text-gray-500 font-normal">
					{convertFrappeTimestampToReadableDateTime(data.creation)}
				</span>
			</div>
		</div>
	);
};

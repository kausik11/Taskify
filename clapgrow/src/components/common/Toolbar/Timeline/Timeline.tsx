import "./documentlog.css";
import { DocumentLogDataFilter } from "./getDocumentLogDataFilter";
import { DisplayLogByType } from "./DisplayLogByType";
import { FullPageLoader } from "../../FullPageLoader/FullPageLoader";
import { ErrorBanner } from "@/components/layout/AlertBanner/ErrorBanner";

export const Timeline = ({
	data,
	error,
	doctype,
	isLoading,
	mutate,
	onOpen,
	setVersionData,
}: DocumentLogDataFilter) => {
	// 56px = top-14 = height of filters/header above timeline
	return (
		<div className="w-full h-full flex flex-col">
			{!data && isLoading && <FullPageLoader />}
			<ErrorBanner error={error} />
			<div className="flex-1 p-2 pt-4 pb-8 h-0 overflow-y-auto">
				{/* Timeline content wrapper */}
				<div className="relative w-full">
					{/* Vertical line: matches content height */}
					<div className="absolute top-14 left-4 h-[calc(100%-94px)] w-[1px] bg-gray-200 pointer-events-none z-0" />
					{/* Timeline items */}
					<div className="flex flex-col gap-6 w-full relative z-10">
						{data &&
              data.docinfo.merge_list.map((item, index) => (
              	<DisplayLogByType
              		key={index}
              		data={item}
              		userInfo={data.docinfo.user_info}
              		mutate={mutate}
              		doctype={doctype}
              		onOpen={onOpen}
              		setVersionData={setVersionData}
              	/>
              ))}
					</div>
				</div>
			</div>
		</div>
	);
};

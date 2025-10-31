// import { UserInfo } from "@/pages/modules/CRM/leads/LeadsList"
import { Dispatch } from "react";
import { DisplayCommonLog } from "./TimelineComponents/DisplayCommonLog";
import { DisplayCommunicationLog } from "./TimelineComponents/DisplayCommunicationLog";
import { VersionLog } from "./TimelineComponents/VersionLog";
import { ViewLog } from "./TimelineComponents/ViewLog";
import "./documentlog.css";
import { MergeListObject } from "./TimelineComponents/type";
import { CreationModificationLog } from "./TimelineComponents/CreationModifiedLog";
import { UserInfo } from "../../DataGrid/DataGridWithMeta";

export const DisplayLogByType = ({
	data,
	userInfo,
	mutate,
	doctype,
	isNote = false,
	onOpen,
	setVersionData,
}: {
  data: MergeListObject;
  userInfo: Record<string, UserInfo>;
  mutate: VoidFunction;
  doctype: string;
  isNote?: boolean;
  onOpen?: VoidFunction;
  setVersionData?: Dispatch<React.SetStateAction<string>>;
}) => {
	if (
		(data.type === "Comment" ||
      data.type === "Assignment" ||
      data.type === "Attachment" ||
      data.type === "Info" ||
      data.type === "Like" ||
      data.type === "Workflow") &&
    !isNote
	) {
		return <DisplayCommonLog data={data} mutate={mutate} userInfo={userInfo} />;
	}
	if (data.type === "Communication" || data.type === "Automated Message") {
		return (
			<DisplayCommunicationLog
				data={data}
				userInfo={userInfo}
				mutate={mutate}
			/>
		);
	}
	if (data.type === "Version" && onOpen && setVersionData) {
		return (
			<VersionLog data={data} onOpen={onOpen} setVersionData={setVersionData} />
		);
	}
	if (data.type === "View") {
		return <ViewLog data={data} userInfo={userInfo} />;
	}

	if (data.type === "Creation" || data.type === "Modified") {
		return <CreationModificationLog data={data} />;
	}

	return null;
};

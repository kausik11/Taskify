import {
	useFrappeGetCall,
	useFrappeEventListener,
	FrappeError,
} from "frappe-react-sdk";
import { Dispatch } from "react";
import { DocumentLogData } from "./TimelineComponents/type";

export interface DocumentLogDataFilter {
  data: { docinfo: DocumentLogData } | undefined;
  error?: FrappeError | null;
  isLoading: boolean;
  mutate: VoidFunction;
  doctype: string;
  onOpen: VoidFunction;
  setVersionData: Dispatch<React.SetStateAction<string>>;
}

export const getDocumentLogDataFilter = (
	doctype: string,
	docname: string,
	onUpdate?: VoidFunction,
) => {
	const {
		data,
		error,
		isLoading,
		mutate: callMutate,
	} = useFrappeGetCall<{ docinfo: DocumentLogData }>(
		"clapgrow_app.api.timeline.timeline.get_timeline_data",
		{
			doctype: doctype,
			docname: docname,
		},
		undefined,
		{
			revalidateOnFocus: false,
			keepPreviousData: true,
		},
	);

	useFrappeEventListener(
		"docinfo_update",
		(data: {
      doc: {
        reference_doctype: string;
        reference_name: string;
      };
    }) => {
			if (
				data.doc.reference_doctype === doctype &&
        data.doc.reference_name === docname
			) {
				callMutate();
			}
		},
	);

	const mutate = () => {
		callMutate();
		onUpdate && onUpdate();
	};

	return {
		// get call fields
		data,
		error,
		isLoading,
		mutate,
	};
};

import {
	FrappeDoc,
	SWRConfiguration,
	useFrappeGetCall,
} from "frappe-react-sdk";
import { useAtom } from "jotai";
import { setLinkTitleAtom } from "./LinkTitles";

export type FormDoc<T> = FrappeDoc<T> & {
  __onload?: Record<string, any>;
};

export interface FormGetDocResponse<T> {
  docs: FormDoc<T>[];
  docinfo?: Record<string, any>;
  /** Link title for link fields */
  _link_titles: Record<string, string>;
}

const useFrappeGetFormDoc = <T>(
	doctype: string,
	docname: string,
	shouldFetch: boolean = true,
	swrConfig?: SWRConfiguration,
) => {
	const [, setLinkTitle] = useAtom(setLinkTitleAtom);

	const res = useFrappeGetCall<FormGetDocResponse<T>>(
		"frappe.desk.form.load.getdoc",
		{
			doctype,
			name: docname,
		},
		shouldFetch && docname ? `doc:${doctype}:${docname}` : null,
		{
			shouldRetryOnError: false,
			revalidateOnFocus: false,
			...swrConfig,
			onSuccess: (res: FormGetDocResponse<T>, key, config) => {
				// Update the link titles in the atom
				if (res?._link_titles) {
					Object.entries(res._link_titles).forEach(([field, title]) => {
						const [document_type, document_name] = field.split("::");
						setLinkTitle(document_type, document_name, title);
					});
				}

				if (swrConfig && swrConfig.onSuccess) {
					swrConfig.onSuccess(res, key, config);
				}
			},
		},
	);

	return res;
};

export default useFrappeGetFormDoc;

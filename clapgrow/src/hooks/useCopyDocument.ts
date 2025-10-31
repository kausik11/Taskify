import { useAuth } from "@/utils/auth/UserProvider";
import { useGetDoctypeMetaOnCall } from "./useGetDoctypeMeta";

const TABLE_FIELDS = ["Table", "Table Multiselect"];
const NO_COPY_FIELDS = [
	"name",
	"amended_from",
	"amendment_date",
	"cancel_reason",
];

/**
 * makeid - generates a random string of length l
 * @param l - length of the string
 * @returns a random string of length l
 */
export const makeid = (l: number, add_date = true): string => {
	let text = "";
	const char_list =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < l; i++) {
		text += char_list.charAt(Math.floor(Math.random() * char_list.length));
	}

	if (!add_date) return text;
	return text + Date.now();
};

export const useCopyDocument = () => {
	const getDoctypeMeta = useGetDoctypeMetaOnCall();

	const { currentUser } = useAuth();

	// Function to copy a document
	const copyDocument = async (
		doc: Record<string, any>,
		fromAmend: any = "",
		parentDoc: any = null,
		parentField: string = "",
		newParentName: string = "",
	) => {
		// Initialize object to store the new document fields
		const copiedDoc: Record<string, any> = {};

		// Get the meta for the doctype
		const meta = await getDoctypeMeta(doc.doctype).then((res) => {
			if (res) return res;
		});

		// Get the fields for the doctype
		const fields = meta?.fields;

		const keys = Object.keys(doc);

		copiedDoc.name =
      "new-" + doc.doctype.toLowerCase().replaceAll(" ", "-") + "-" + makeid(6);

		// Loop over the keys in the document and see if they need to be copied
		for (const key of keys) {
			// If the key starts with __, it is a system field and should not be copied
			if (key.startsWith("__")) {
				continue;
			}

			// If the key is in the NO_COPY_FIELDS array, it should not be copied
			if (NO_COPY_FIELDS.includes(key)) {
				continue;
			}

			const field = fields.find((f: any) => f.fieldname === key);
			if (field) {
				let copied_value = doc[key];
				// If the key is a No-copy field, skip it
				if (field.no_copy === 1 && !fromAmend) {
					continue;
				}

				// If the key is a Table Field, loop over the array and copy each document
				if (TABLE_FIELDS.includes(field.fieldtype)) {
					copied_value = [];

					const copyPromises = doc[key].map(async (childDoc: any) => {
						return copyDocument(childDoc, fromAmend, doc, key, copiedDoc.name);
					});

					copied_value = await Promise.all(copyPromises);
				}

				copiedDoc[key] = copied_value;
			}
		}

		if (parentDoc && newParentName) {
			copiedDoc.parent = newParentName;
		}

		copiedDoc.__islocal = 1;
		copiedDoc.docstatus = 0;
		copiedDoc.owner = currentUser;
		copiedDoc.creation = "";
		copiedDoc.modified_by = currentUser;
		copiedDoc.modified = "";
		copiedDoc.lft = null;
		copiedDoc.rgt = null;

		if (fromAmend) {
			copiedDoc._amended_from = fromAmend;
		}

		return copiedDoc;
	};

	return {
		copyDocument,
	};
};

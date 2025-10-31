import { FormDoc } from "./useFrappeGetFormDoc";
import { useFrappePostCall } from "frappe-react-sdk";
import { toast } from "sonner";

type SaveDocAction = "Save" | "Update";

interface FormUpdateDocResponse<T> {
  docs: FormDoc<T>[];
  _server_messages: string;
}

type SaveDocPayload<T> = FormDoc<T> & {
  __unsaved?: 0 | 1;
  __islocal?: 0 | 1;
};

const useFrappeSaveFormDoc = <T>(action: SaveDocAction = "Save") => {
	const {
		call: updateDoc,
		loading,
		reset,
		error,
	} = useFrappePostCall<FormUpdateDocResponse<T>>(
		"frappe.desk.form.save.savedocs",
	);

	const saveDoc = async (doc: SaveDocPayload<T>) => {
		return updateDoc({
			doc: JSON.stringify(doc),
			action,
		})
			.then((response) => {
				// Reset the hook
				reset();

				// Show toasts for server messages
				const { _server_messages, ...res } = response;

				if (_server_messages) {
					const parsedMessage = JSON.parse(_server_messages);
					// Add multiple toasts for multiple messages
					parsedMessage.forEach((message: string, idx: number) => {
						const toastMessage = JSON.parse(message);

						if (toastMessage.alert !== 0) {
							let status = "info";

							if (toastMessage.indicator) {
								if (toastMessage.indicator === "red") status = "error";
								if (toastMessage.indicator === "green") status = "success";
								if (
									toastMessage.indicator === "yellow" ||
                  toastMessage.indicator === "orange"
								)
									status = "warning";
							}

							// Use a unique id for each toast
							const uniqueId = `${status}-${idx}-${Date.now()}`;

							if (status === "info") {
								toast.info(toastMessage.message, { id: uniqueId });
							} else if (status === "error") {
								toast.error(toastMessage.message, { id: uniqueId });
							} else if (status === "success") {
								toast.success(toastMessage.message, { id: uniqueId });
							} else if (status === "warning") {
								toast.warning(toastMessage.message, { id: uniqueId });
							}
						}
					});
				}

				return res;
			})
			.catch((error) => {
				// Show a toast for the error
				toast.error(error.message);

				// Pass the error to the caller
				throw error;
			});
	};

	return { saveDoc, loading, reset, error };
};

export default useFrappeSaveFormDoc;

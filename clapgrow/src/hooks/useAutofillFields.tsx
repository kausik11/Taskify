import { useLocation } from "react-router-dom";

export const useAutofillFields = () => {
	const { state } = useLocation();

	if (state?.autoFillFields) {
		return state.autoFillFields?.state?.autoFillFields;
	} else {
		return {};
	}
};

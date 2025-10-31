import { FrappeContext, FrappeConfig, Filter } from "frappe-react-sdk";
import { useContext } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useGetRouting } from "./useGetRouting";
import { getTableLayoutAndState } from "@/components/common/DataGrid/utils";

/**
 *
 * @param doctype
 * @param docname
 * @param apiPath
 * @returns next, getNext, getPrevious
 */

export const useGetNext = (
	doctype: string,
	docname: string,
	apiPath = "frappe.desk.form.utils.get_next",
	additionalFilters?: Filter[],
) => {
	const location = useLocation();
	const { localSortModel, sessionFilters } = getTableLayoutAndState(doctype);
	const sortModel = localSortModel;
	const sortField = sortModel?.[0]?.colId ?? "modified";
	const sortDirection = sortModel?.[0]?.sort ?? "desc";
	const filters = sessionFilters;

	const filtersToUse = filters;

	const { call } = useContext(FrappeContext) as FrappeConfig;

	const { navigateToRecord } = useGetRouting();
	const getRecord = (prev = 0) => {
		call
			.get(apiPath, {
				doctype,
				value: docname,
				filters: JSON.stringify([
					...filtersToUse,
					...(additionalFilters ?? []),
				]), // [...filters, ...filter ?? []
				sort_order: sortDirection,
				sort_field: sortField,
				prev,
			})
			.then((r: any) => {
				if (r.message) {
					navigateToRecord(doctype as never, r.message, undefined, {
						state: {
							previousSearchParams: location.state?.previousSearchParams,
							replaceTab: undefined,
						},
						replace: true,
					});
				} else if (r._server_messages) {
					toast.info("No further records");
				}
			})
			.catch((e) => {
				toast.error("There was an error");
			});
	};

	const onPreviousClick = () => {
		getRecord(1);
	};

	const onNextClick = () => {
		getRecord(0);
	};

	return {
		onNextClick,
		onPreviousClick,
		//   sortField
	};
};

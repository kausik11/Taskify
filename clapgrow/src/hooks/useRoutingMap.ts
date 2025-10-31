import { useFrappeGetCall } from "frappe-react-sdk";
import { useMemo } from "react";
import { RoutingMap } from "./useGetRouting";

export const getRouting = () => {
	// This function retrieves the routing map from the global `frappe` object.
	// @ts-expect-error
	const bootData = window?.frappe?.boot?.clapgrow_routing_map;

	const { data, error, isLoading } = useFrappeGetCall(
		"clapgrow_app.api.form.create_form.get_doctype_routing_map",
		undefined,
		bootData && bootData?.length ? null : undefined,
		{
			revalidateIfStale: false,
			revalidateOnFocus: false,
			revalidateOnReconnect: false,
		},
	);

	const routingMap: RoutingMap = useMemo(() => {
		return bootData || data?.message || {};
	}, [data, bootData]);

	return {
		routingMap: routingMap,
		error: error,
		isLoading: bootData ? false : isLoading,
	};
};

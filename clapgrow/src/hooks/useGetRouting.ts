import {
	NavigateOptions,
	URLSearchParamsInit,
	createSearchParams,
	useNavigate,
} from "react-router-dom";
import { getRoutingMapGlobal } from "@/components/common/RoutingContext/RoutingMapProvider";

export interface RoutingMap {
  [doctype: string]: RoutingMapElement;
}

interface RoutingMapElement {
  doctype: string;
  label: string;
  url: string;
  list_props?: any;
}

/**
 * makeid - generates a random string of length l
 * @param l - length of the string
 * @returns a random string of length l
 */
export const makeid = (l: number, add_date = true): string => {
	var text = "";
	var char_list =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (var i = 0; i < l; i++) {
		text += char_list.charAt(Math.floor(Math.random() * char_list.length));
	}

	if (!add_date) return text;
	return text + Date.now();
};

const getDocTypeRandomHash = (doctype: string) => {
	return `new-${doctype.replace(" ", "-").toLowerCase()}-${makeid(5, false)}`;
};

export const useGetRouting = () => {
	const navigation = useNavigate();

	const routingMap = getRoutingMapGlobal();

	const navigate = (
		doctype: keyof typeof routingMap,
		docname?: string,
		title?: string,
		options?: NavigateOptions,
		sendSearchParamsInLocationState: boolean = false,
		searchParams?: URLSearchParamsInit,
		autoFillFields?: any,
	) => {
		let opts = options;
		if (sendSearchParamsInLocationState) {
			opts = {
				...options,
				state: {
					...options?.state,
					previousSearchParams: window.location.search,
					autoFillFields: autoFillFields,
				},
			};
		}

		const path = getPath(
			doctype,
			encodeURIComponent(docname ?? ""),
			title,
			searchParams,
		);
		if (path) {
			return navigation(path, opts);
		} else {
			return;
		}
	};

	/**
   * Used to navigate to main record from list view - sends the pagination state in location state
   * @param doctype
   * @param docname
   * @param title
   * @param options
   */
	const navigateToRecord = (
		doctype: keyof typeof routingMap,
		docname: string,
		title?: string,
		options?: NavigateOptions,
	) => {
		return navigate(doctype, docname, title, options, true);
	};

	/**
   * Used to navigate to create new record from list view
   * @param doctype doctype of the new record
   * @param autoFillFields fields to be auto filled in the new record in react-hook-form format
   * @param options
   * @returns
   * */
	const navigateToCreate = (
		doctype: keyof typeof routingMap,
		autoFillFields?: any,
		title?: string,
		options?: NavigateOptions,
		searchParams?: URLSearchParamsInit,
	) => {
		let createPath = "create";

		if (!routingMap?.[doctype]) {
			return navigate(
				doctype,
				getDocTypeRandomHash(doctype as string),
				title,
				options,
				true,
				searchParams,
				autoFillFields,
			);
		}

		return navigate(
			doctype,
			createPath,
			title,
			options,
			true,
			searchParams,
			autoFillFields,
		);
	};

	const getRoute = (
		doctype: keyof typeof routingMap,
		docname?: string,
		title?: string,
	) => {
		return getPath(doctype, encodeURIComponent(docname ?? ""), title);
	};

	const getCreateRoute = (doctype: keyof typeof routingMap, title?: string) => {
		let createPath = "create";

		if (!routingMap?.[doctype]) {
			return `/${doctype}/${getDocTypeRandomHash(doctype as string)}`;
		}

		return getPath(doctype, createPath, title);
	};

	return {
		navigate,
		getRoute,
		navigateToRecord,
		navigateToCreate,
		getCreateRoute,
	};
};

/** Common function to get path of a record */
export const getPath = (
	doctype: string,
	docname?: string,
	title?: string,
	searchParams?: URLSearchParamsInit,
) => {
	const routingMap = getRoutingMapGlobal();

	const route: RoutingMapElement | undefined = routingMap?.[doctype];

	if (doctype === "DocType") {
		return `/form/${docname}`;
	}
	if (!route) {
		return "";
	}
	if (docname) {
		if (searchParams) {
			return `/${route.url}/${docname}?${createSearchParams(searchParams)}`;
		} else {
			return `/${route.url}/${docname}`;
		}
	} else {
		return `/${route.url}`;
	}
};

export const getAbsolutePath = (
	doctype: string,
	docname?: string,
	title?: string,
	searchParams?: URLSearchParamsInit,
) => {
	const path = getPath(
		doctype,
		encodeURIComponent(docname ?? ""),
		title,
		searchParams,
	);
	if (import.meta.env.PROD) {
		return `/${import.meta.env.VITE_BASE_PATH}${path}`;
	} else {
		return path;
	}
};

export const toAbsolutePath = (path: string) => {
	if (import.meta.env.PROD) {
		return `/${import.meta.env.VITE_BASE_PATH}${path}`;
	} else {
		return path;
	}
};

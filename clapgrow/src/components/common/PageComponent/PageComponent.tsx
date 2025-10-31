import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { CreatePage } from "./CreatePage";
import { useGetDoctypeMeta } from "@/hooks/useGetDoctypeMeta";
import { ViewPage } from "./ViewPage";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ListPage } from "./ListPage";
import PageNotFound from "../PageNotFound/PageNotFound";
import { useGetRouting } from "@/hooks/useGetRouting";
import { getRoutingMapGlobal } from "../RoutingContext/RoutingMapProvider";
import { getRouting } from "@/hooks/useRoutingMap";
import { FullPageLoader } from "../FullPageLoader/FullPageLoader";

const isIDForCreate = (ID: string, doctype: string) => {
	if (ID === "create") {
		return true;
	}

	const hyphenedDoctype = doctype.replace(/ /g, "-").toLowerCase();

	if (ID.startsWith(`new-${hyphenedDoctype}`)) {
		return true;
	}

	return false;
};

export const PageComponent = () => {
	const { doctype, ID } = useParams();

	const { routingMap, isLoading } = getRouting();

	const DOCTYPE = useMemo(() => {
		if (doctype && routingMap) {
			const key = Object.keys(routingMap).find(
				(key) => routingMap[key].url === doctype,
			);
			if (key) {
				return key;
			}
		}
		return "";
	}, [doctype, routingMap]);

	const autoFillFields = useAutofillFields(DOCTYPE ?? "");

	if (isLoading) {
		return <FullPageLoader />;
	}

	if (routingMap && DOCTYPE in routingMap) {
		if (ID && autoFillFields) {
			if (isIDForCreate(ID, DOCTYPE ?? "")) {
				return (
					<CreatePage
						doctype={DOCTYPE ?? ""}
						name={ID}
						defaultValues={autoFillFields}
						title={routingMap[DOCTYPE].label}
					/>
				);
			} else {
				return (
					<ViewPage doctype={DOCTYPE ?? ""} title={routingMap[DOCTYPE].label} />
				);
			}
		}
		if (DOCTYPE) {
			const listProps = JSON.parse(routingMap[DOCTYPE].list_props ?? "{}");
			return (
				<ListPage
					doctype={DOCTYPE ?? ""}
					rightChild={ListRightComponent}
					key={DOCTYPE}
					{...listProps}
				/>
			);
		}
	}

	return <PageNotFound />;
};

const useAutofillFields = (doctype: string) => {
	const { data, isLoading } = useGetDoctypeMeta(doctype);

	const autoFillFields = useMemo(() => {
		if (isLoading) return undefined;
		if (data?.fields) {
			const map = data.fields
				.filter(
					(field: any) =>
						field.default &&
            field.fieldtype !== "Table" &&
            field.fieldtype !== "Section Break",
				)
				.map((field: any) => ({
					fieldname: field.fieldname,
					default: field.default,
				}));
			// convert to object
			const obj = map.reduce((acc: any, field: any) => {
				acc[field.fieldname] = field.default;
				return acc;
			}, {});
			return obj;
		}
		return {};
	}, [data, isLoading]);

	return autoFillFields;
};

const ListRightComponent = ({ doctype }: { doctype: string }) => {
	const routingMap = getRoutingMapGlobal();
	const { navigateToCreate } = useGetRouting();

	const routeToCreate = () => {
		navigateToCreate(doctype as keyof typeof routingMap);
	};

	return (
		<Button
			type="button"
			onClick={routeToCreate}
			className="bg-blue-500 text-white hover:bg-blue-600"
		>
			{`Add`} <Plus />
		</Button>
	);
};

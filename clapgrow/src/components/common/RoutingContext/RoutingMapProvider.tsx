import { getRouting } from "@/hooks/useRoutingMap";
import { useEffect } from "react";

import { RoutingMap } from "@/hooks/useGetRouting";

export function RoutingMapProvider({
	children,
}: {
  children: React.ReactNode;
}) {
	const { routingMap } = getRouting(); // Call hook at top level

	// Set atom when routingMap changes
	useEffect(() => {
		if (routingMap) setRoutingMapGlobal(routingMap);
	}, [routingMap]);
	// Optionally handle loading/error UI here
	return <>{children}</>;
}

// routingMapStore.ts
let routingMap: RoutingMap | null = null;

export function setRoutingMapGlobal(map: RoutingMap) {
	routingMap = map;
}

export function getRoutingMapGlobal(): RoutingMap | null {
	return routingMap;
}

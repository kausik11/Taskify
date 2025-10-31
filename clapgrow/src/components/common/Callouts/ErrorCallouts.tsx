import { PropsWithChildren } from "react";
import { FiAlertTriangle } from "react-icons/fi";
import { CustomCallout } from "./CustomCallouts";

export const ErrorCallout = ({
	children,
	...props
}: PropsWithChildren<{ message?: string }>) => {
	return (
		<CustomCallout
			rootProps={{
				className:
					"border-red-500 bg-red-50 rounded-md min-h-8 p-2 content-center mr-2 ml-2 ",
			}}
			iconChildren={<FiAlertTriangle size="18" className="text-red-500" />}
			textChildren={children || props.message || "An error occurred"}
		/>
	);
};

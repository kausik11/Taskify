import { PropsWithChildren } from "react";
import { BiCheckCircle } from "react-icons/bi";
import { CustomCallout } from "./CustomCallouts";

export const SuccessCallout = ({
	children,
	...props
}: PropsWithChildren<{ message?: string }>) => {
	return (
		<CustomCallout
			rootProps={{ color: "green" }}
			iconChildren={<BiCheckCircle size="18" />}
			textChildren={props.message}
		/>
	);
};

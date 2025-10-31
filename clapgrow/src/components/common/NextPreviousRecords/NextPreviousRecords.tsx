import { NextPreviousButtons } from "./NextPreviousButton";
import { useMemo } from "react";
import { Filter } from "frappe-react-sdk";
import { useGetNext } from "@/hooks/useGetNext";

export interface NextPreviousButtonsProps
  extends React.HTMLAttributes<HTMLDivElement> {
  doctype: string;
  docname: string;
  allowedSortFields?: string[];
  apiPath?: string;
  additionalFilters?: Filter[];
}

export const NextPreviousRecord = ({
	doctype,
	docname,
	allowedSortFields,
	apiPath,
	additionalFilters,
	...props
}: NextPreviousButtonsProps) => {
	const { onNextClick, onPreviousClick } = useGetNext(
		doctype,
		docname,
		apiPath,
		additionalFilters,
	);

	const allowNextPrevious = useMemo(() => {
		// const allowed = ['name', 'modified', 'creation'].concat(allowedSortFields ?? [])
		// return allowed.includes(sortField)
		return true;
	}, []);

	return (
		<NextPreviousButtons
			onNextClick={onNextClick}
			onPreviousClick={onPreviousClick}
			{...props}
			key={docname}
			allow={allowNextPrevious}
		/>
	);
};

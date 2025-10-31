import { useGetDoctypeMeta } from "@/hooks/useGetDoctypeMeta";
import { CustomCellEditorProps } from "ag-grid-react";
import { useAtom } from "jotai";
import { forwardRef, useMemo } from "react";
import {
	AsyncDropdownWithoutForm,
	AsyncDropdownWithoutFormProps,
} from "../../AsyncDropdown/AsyncDropdown";
import { getAbsolutePath } from "@/hooks/useGetRouting";
import { getLinkTitleAtom } from "@/hooks/LinkTitles";

interface AsyncDropdownEditorProps extends CustomCellEditorProps {
  props: Omit<
    AsyncDropdownWithoutFormProps,
    "selected" | "setSelectedValue" | "name"
  >;
}

export const AsyncDropdownEditor = forwardRef(
	(props: AsyncDropdownEditorProps, ref) => {
		const onValueChange = (v: string) => {
			props.onValueChange(v);
			// Can't stop editing because it will close the dropdown if the input is cleared or if the create modal opens
			// props.stopEditing()
		};

		return (
			<div className="bg-white h-[40px]">
				<AsyncDropdownWithoutForm
					name={props.colDef.field}
					// @ts-expect-error
					doctype={props.doctype}
					autoFocus
					openMenuOnFocus
					// boxProps={{ width: props.column.getActualWidth(), height: '30px' }}
					className={`w-[${props.column.getActualWidth()}px] h-[40px]`}
					selectedValue={props.value}
					setSelectedValue={onValueChange}
					{...props.props}
				/>
			</div>
		);
	},
);

export const AsyncDropdownRenderer = (params: any) => {
	const getCellEditorParams = (params: any) => {
		const cellEditorParams = params?.colDef?.cellEditorParams;
		return typeof cellEditorParams === "function"
			? cellEditorParams(params)
			: cellEditorParams;
	};

	const cellEditorParams = getCellEditorParams(params);
	const doctype = cellEditorParams?.props?.doctype;

	const value = params?.value;

	const disableLink = cellEditorParams?.props?.disableLink;

	// No path if the link is disabled
	const path = disableLink
		? ""
		: doctype && value
			? getAbsolutePath(doctype, value)
			: "";

	const Renderer = ({ doctype }: { doctype: string }) => {
		/** Load the Doctype meta so that we can determine the search fields + the name of the title field */
		const { data: meta, isLoading: isMetaLoading } = useGetDoctypeMeta(doctype);

		// Maintain link titles in an Atom
		const [getLinkTitle] = useAtom(getLinkTitleAtom);

		// const [, setLinkTitle] = useAtom(setLinkTitleAtom)

		// const { call: linkTitleCall } = useFrappePostCall('emotive_app.api.utils.link.get_link_title')

		const titleField = useMemo(() => {
			if (meta?.show_title_field_in_link && params.value) {
				const t = getLinkTitle(doctype, params.value);
				if (t) {
					return t;
				} else {
					return params.value;
				}
			}

			return params.value;
		}, [meta, params]);

		if (path) {
			return (
				<a href={path} target="_blank" rel="noopener noreferrer">
					{titleField}
				</a>
			);
		}

		return <div>{titleField}</div>;
	};

	if (doctype && value) {
		return <Renderer doctype={doctype} />;
	}

	if (path) {
		return (
			<a href={path} target="_blank" rel="noopener noreferrer">
				{value}
			</a>
		);
	}

	return <div>{value}</div>;
};

import { useGetDoctypeMeta } from "@/hooks/useGetDoctypeMeta";
import { FullPageLoader } from "../FullPageLoader/FullPageLoader";
import { useMemo } from "react";
import { DocField } from "@/types/Core/DocField";
import { DynamicField } from "./FormComponents";
import { ErrorBanner } from "@/components/layout/AlertBanner/ErrorBanner";

export const DocumentFormPage = ({
	doctype,
	isEdit,
}: {
  doctype: string;
  isEdit?: boolean;
}) => {
	const { data, error, isLoading } = useGetDoctypeMeta(doctype);

	const fields = useMemo(() => {
		if (data?.fields) {
			return data?.fields;
		}
	}, [data]);

	const autoname = useMemo(() => {
		if (isEdit && data?.autoname && data?.naming_rule === "By fieldname") {
			return data?.autoname?.split(":")[1]?.trim();
		}
		return undefined;
	}, [data, isEdit]);

	return (
		<div className="flex flex-col gap-4">
			<ErrorBanner error={error} />
			{isLoading && <FullPageLoader />}
			{fields && fields.length > 0 ? (
				<FormComponent fields={fields} autoname={autoname} />
			) : (
				<div className="text-center text-gray-500">
          No fields available for this doctype.
				</div>
			)}
		</div>
	);
};

export const FormComponent = ({
	fields,
	autoname,
}: {
  fields: DocField[];
  autoname?: string;
}) => {
	// Split fields into columns at every "Column Break"
	const columns: DocField[][] = [];
	let currentCol: DocField[] = [];

	fields.forEach((field) => {
		if (field.fieldtype === "Column Break") {
			columns.push(currentCol);
			currentCol = [];
		} else {
			currentCol.push(field);
		}
	});
	// Push the last column (even if empty)
	columns.push(currentCol);

	return (
		<div className={`grid grid-cols-${columns.length} gap-6 w-full`}>
			{columns.map((colFields, colIdx) => (
				<div
					className="flex flex-col gap-4 p-6 rounded-md shadow-md border border-gray-200"
					key={colIdx}
				>
					{colFields.map((field) => (
						<DynamicField
							key={field.fieldname}
							field={field}
							fieldProps={{
								readOnly: field.fieldname === autoname,
							}}
						/>
					))}
				</div>
			))}
		</div>
	);
};

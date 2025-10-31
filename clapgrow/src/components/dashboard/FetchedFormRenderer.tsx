import { useFrappeGetDoc } from "frappe-react-sdk";
import { useForm, FormProvider } from "react-hook-form";
import { useGetDoctypeMeta } from "@/hooks/useGetDoctypeMeta";
import { ErrorBanner } from "../layout/AlertBanner/ErrorBanner";
import { DynamicField } from "../common/FormComponent/FormComponents";
import { DocField } from "@/types/Core/DocField";
import { ChevronDown, ChevronUp, Edit } from "lucide-react";
import { useState, useEffect } from "react";

type FetchedFormRendererProps = {
  doctype: string;
  docname: string;
  initiallyCollapsed?: boolean;
};

export const FetchedFormRenderer = ({
	doctype,
	docname,
	initiallyCollapsed = true,
}: FetchedFormRendererProps) => {
	const [isCollapsed, setIsCollapsed] = useState(initiallyCollapsed);
	const {
		data: meta,
		error: metaError,
		isLoading: metaLoading,
	} = useGetDoctypeMeta(doctype);
	const {
		data: docData,
		error: docError,
		isLoading: docLoading,
	} = useFrappeGetDoc(doctype, docname);

	;
	const methods = useForm({
		defaultValues: docData || {},
		mode: "onChange",
	});

	const { reset } = methods;

	useEffect(() => {
		if (docData) {
		  reset(docData);
		}
	  }, [docData, reset]);
	  
	const fields: DocField[] =
    meta?.fields?.filter(
    	(f) => !["Section Break", "Column Break"].includes(f.fieldtype),
    ) || [];

	// ;
	if (metaLoading || docLoading) {
		return (
		  <div className="border rounded-lg overflow-hidden mb-4 mt-2">
				<button
			  type="button"
			  className="w-full flex justify-start gap-3 items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
			  onClick={() => setIsCollapsed(!isCollapsed)}
				>
			  {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
			  <h5 className="font-medium text-md">{doctype}</h5>
				</button>
				{!isCollapsed && (
			  <div className="p-6 bg-white text-center">
						<p className="text-gray-500">Loading...</p>
			  </div>
				)}
		  </div>
		);
	  }

	if (metaError || docError){
		return <ErrorBanner error={metaError || docError} />;
	}

	return (
		<div className="border rounded-lg overflow-hidden mb-4 mt-2">
			<button
				type="button"
				className="w-full flex justify-start gap-3 items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
				onClick={() => setIsCollapsed(!isCollapsed)}
			>
				{isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
				<h5 className="font-medium text-md">{doctype}</h5>
			</button>
      
			{!isCollapsed && (
				<FormProvider {...methods}>
					<form className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white" noValidate>
						{fields.map((field) => (
							<DynamicField 
								key={field.fieldname} 
								field={field} 
								fieldProps={{ 
									readOnly: true,
									disabled: true,
								}} 
							/>
						))}
					</form>
				</FormProvider>
			)}
		</div>
	);
};

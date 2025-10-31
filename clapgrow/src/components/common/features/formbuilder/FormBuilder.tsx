import { useMemo, useState } from "react";
import { Elements, formElements } from "./FormElements";
import { FormScreen } from "./elements/FormScreen";
import { Plus } from "lucide-react";
import { DocType } from "@/types/Core/DocType";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";

const FormBuilder = () => {
	// ...other state...
	const { setValue, watch } = useFormContext<DocType>();
	const fields = watch("fields") || [];

	const handleAddField = (type: string, name: string, options?: string) => {
		if (name === "Override Creation Date") {
			const newField = {
				fieldtype: "Datetime",
				label: "Override Creation Date",
				fieldname: "override_creation_date",
				idx: fields.length + 1,
				options: "",
				default: "",
				description: "Override the creation date of the document",
			};
			// @ts-expect-error expected to be a DocField
			setValue("fields", [...fields, newField], { shouldDirty: true });
		} else if (name === "Proceed to Next Step") {
			const newField = {
				fieldtype: "Select",
				label: "Proceed to Next Step",
				fieldname: "proceed_to_next_step",
				idx: fields.length + 1,
				options: "Approve\nReject",
				default: "Approve",
				description:
          "Approve or Reject the current step, fieldname: proceed_to_next_step",
			};
			// @ts-expect-error expected to be a DocField
			setValue("fields", [...fields, newField], { shouldDirty: true });
		} else {
			const newField = {
				fieldtype: type,
				label: "",
				idx: fields.length + 1,
				options: options || "",
			};
			// @ts-expect-error expected to be a DocField
			setValue("fields", [...fields, newField], { shouldDirty: true });
		}
	};

	return (
		<div className="grid grid-cols-[25%_75%] gap-4 pr-4 overflow-x-hidden w-full h-full overflow-y-scroll">
			<div className="overflow-auto h-full">
				<FormElements onAddField={handleAddField} />
			</div>
			<div className="overflow-auto h-full">
				<FormScreen />
			</div>
		</div>
	);
};

const FormElements = ({
	onAddField,
}: {
  onAddField: (type: string, name: string, option?: string) => void;
}) => {
	const [elements] = useState<Elements[]>(formElements);

	return (
		<div className="flex flex-col gap-3 border border-gray-200 rounded-lg p-4 overflow-y-auto w-full bg-gray-50">
			<h1 className="text-sm text-gray-600">Form Elements</h1>
			<div className="flex flex-col gap-3">
				{elements.map((element) => (
					<DraggableElement
						key={element.id}
						element={element}
						onAddField={onAddField}
					/>
				))}
			</div>
		</div>
	);
};

const DraggableElement = ({
	element,
	onAddField,
}: {
  element: Elements;
  onAddField: (type: string, name: string, option?: string) => void;
}) => {
	const { watch } = useFormContext<DocType>();

	const module = watch("module");

	const isDisabled = useMemo(() => {
		if (
			element.name === "Override Creation Date" &&
      module !== "Clapgrow App"
		) {
			return true; // Disable if not in Clapgrow App module
		} else if (
			element.name === "Proceed to Next Step" &&
      module !== "Clapgrow Step"
		) {
			return true; // Disable if not in Clapgrow Step module
		}
		return false; // Enable for all other elements
	}, [module, element]);

	return (
		<div className="flex items-center justify-between p-3 border border-gray-200 rounded-md bg-white">
			<div className="flex items-center gap-2">
				{element.icon}
				<span className="text-sm text-gray-700">{element.name}</span>
			</div>
			<Button
				variant="outline"
				size="icon"
				disabled={isDisabled}
				className="h-6 w-6 rounded-sm flex items-center justify-center"
				onClick={() => onAddField(element.value, element.name, element.options)}
				title="Add field"
				type="button"
			>
				<Plus className="h-5 w-5" />
			</Button>
		</div>
	);
};

export default FormBuilder;

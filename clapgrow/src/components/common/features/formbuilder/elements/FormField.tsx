import { useContext, useEffect, useState } from "react";
import { DocField } from "@/types/Core/DocField";
import { Pencil, Plus, Save, Trash, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useFormContext } from "react-hook-form";
import { FieldType, formElements } from "../FormElements";
import { Button } from "@/components/ui/button";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AsyncDropdownWithoutForm } from "@/components/common/AsyncDropdown/AsyncDropdown";
import { FrappeConfig, FrappeContext } from "frappe-react-sdk";
import { HelperText } from "@/components/common/Form";

export const FormField = ({
	field,
	isOverlay = false,
}: {
  field: DocField;
  isOverlay?: boolean;
}) => {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: field.fieldname ?? "" });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
		zIndex: isDragging ? 10 : "auto",
	};

	const [isEditing, setIsEditing] = useState(false);
	const [localField, setLocalField] = useState({ ...field });

	// State for select options and the new option input
	const [selectOptions, setSelectOptions] = useState<string[]>(
		localField.fieldtype === "Select" && localField.options
			? localField.options.split("\n").filter(Boolean)
			: [],
	);
	const [newOption, setNewOption] = useState("");

	const handleFieldChange = (key: keyof DocField, value: any) => {
		setLocalField((prev) => ({ ...prev, [key]: value }));
	};

	const { getValues, setValue } = useFormContext();

	const onSave = () => {
		const fields = getValues("fields") as DocField[];
		// here update fieldname as label.toLowerCase().split(" ").join("_")
		const updatedField = {
			...localField,
			fieldname: localField.label
				? localField.label.toLowerCase().split(" ").join("_")
				: localField.fieldname,
		};
		const updatedFields = fields.map((f) =>
			f.fieldname === localField.fieldname ? updatedField : f,
		);
		setValue("fields", updatedFields, {
			shouldValidate: true,
			shouldDirty: true,
		});
		setIsEditing(false);
	};

	const onDelete = () => {
		const fields = getValues("fields") as DocField[];
		const updatedFields = fields.filter(
			(f) => f.fieldname !== localField.fieldname,
		);
		setValue("fields", updatedFields, {
			shouldValidate: true,
			shouldDirty: true,
		});
	};

	// Keep selectOptions in sync with localField.options
	useEffect(() => {
		if (localField.fieldtype === "Select") {
			setSelectOptions(
				localField.options
					? localField.options.split("\n").filter(Boolean)
					: [],
			);
		}
	}, [localField.fieldtype, localField.options]);

	// Add a new option from the input
	const handleAddOption = () => {
		const trimmed = newOption.trim();
		if (trimmed && !selectOptions.includes(trimmed)) {
			const newOptions = [...selectOptions, trimmed];
			setSelectOptions(newOptions);
			handleFieldChange("options", newOptions.join("\n"));
			setNewOption("");
		}
	};

	// Remove an option by index
	const handleRemoveOption = (index: number) => {
		const newOptions = selectOptions.filter((_, i) => i !== index);
		setSelectOptions(newOptions);
		handleFieldChange("options", newOptions.join("\n"));
	};

	// Handle editing an option, remove if cleared
	const handleOptionChange = (value: string, index: number) => {
		if (value.trim() === "") {
			handleRemoveOption(index);
		} else {
			const newOptions = [...selectOptions];
			newOptions[index] = value;
			setSelectOptions(newOptions);
			handleFieldChange("options", newOptions.join("\n"));
		}
	};

	// Add this helper to get all Link fields except the current one
	const getLinkFields = (fields: DocField[], currentFieldname: string) =>
		fields.filter(
			(f) =>
				f.fieldtype === "Link" && f.options && f.fieldname !== currentFieldname,
		);

	const { db } = useContext(FrappeContext) as FrappeConfig;

	// Add at the top inside your component
	const [targetFields, setTargetFields] = useState<
    { label: string; value: string }[]
  >([]);

	// Simulate fetching fields for a given doctype (replace with real fetch if needed)
	const getFieldsForDoctype = async (doctype: string) => {
		return db.getDoc("DocType", doctype).then((doc) => {
			if (doc && doc.fields) {
				return doc.fields
					.filter(
						(f: DocField) =>
							f.fieldtype !== "Section Break" && f.fieldtype !== "Column Break",
					)
					.map((f: DocField) => ({
						label: `${f.label || f.fieldname} (${f.fieldtype})`,
						value: f.fieldname,
					}));
			}
			return [];
		});
	};

	useEffect(() => {
		const fetchFields = async () => {
			const linkField = localField.fetch_from?.split(".")[0];
			if (linkField) {
				const doctype =
          getValues("fields").find((f: DocField) => f.fieldname === linkField)
          	?.options || "";
				if (doctype) {
					const fields = await getFieldsForDoctype(doctype);
					setTargetFields(fields);
				} else {
					setTargetFields([]);
				}
			} else {
				setTargetFields([]);
			}
		};
		fetchFields();
	}, [localField.fetch_from, getValues]);

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`
                ${isEditing ? "bg-blue-50" : "bg-white"}
                p-4 flex flex-col gap-2 rounded-md cursor-grab border border-gray-200
                ${isDragging || isOverlay ? "shadow-2xl ring-2 ring-blue-400" : ""}
            `}
		>
			{/* Header Row */}
			<div className="flex justify-between items-center rounded">
				<div className="font-semibold text-sm text-gray-500 flex items-center gap-2">
					<button
						{...attributes}
						{...listeners}
						type="button"
						className="text-gray-500 hover:text-gray-700 h-6 w-6 rounded-sm flex items-center justify-center cursor-grab"
					>
						<GripVertical className="h-4 w-4" />
					</button>
					{localField.label || "Label"}
					{localField.fieldtype && (
						<span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
							{
								formElements.find((el) =>
									localField?.options === "Phone"
										? el.value === localField.fieldtype &&
                      el.options === "Phone"
										: el.value === localField.fieldtype,
								)?.name
							}
						</span>
					)}
				</div>
				<div className="flex gap-2">
					{isEditing ? (
						<Button
							variant={"link"}
							className="w-4 h-4 text-blue-500 cursor-pointer"
							onClick={onSave}
							type="button"
							disabled={localField.fieldname === "override_creation_date"}
						>
							<Save className="w-4 h-4 text-blue-500 cursor-pointer" />
						</Button>
					) : (
						<Button
							variant={"link"}
							className="w-4 h-4 text-gray-500 cursor-pointer"
							onClick={() => setIsEditing(!isEditing)}
							type="button"
							disabled={
								localField.fieldname === "override_creation_date" ||
                localField.fieldname === "proceed_to_next_step"
							}
						>
							<Pencil className="w-4 h-4 text-gray-500 cursor-pointer" />
						</Button>
					)}
					<Trash
						className="w-4 h-4 text-red-500 cursor-pointer"
						onClick={onDelete}
					/>
				</div>
			</div>

			{/* Edit Form */}
			{isEditing ? (
				<div className="flex flex-col gap-4 py-2">
					<div className="space-y-1">
						<label className="text-sm font-medium text-gray-500">Label</label>
						<Input
							value={localField.label || ""}
							onChange={(e) => handleFieldChange("label", e.target.value)}
							placeholder="Enter label"
							className="bg-white"
						/>
					</div>
					<FieldType
						value={localField.fieldtype}
						onClick={handleFieldChange}
						options={localField.options}
					/>
					{localField.fieldtype === "Select" && (
						<div className="space-y-1">
							<label className="text-sm font-medium text-gray-500">
                Options
							</label>
							<div className="flex flex-col gap-2">
								{selectOptions.map((option, index) => (
									<div key={index} className="flex items-center gap-2">
										<Input
											value={option}
											onChange={(e) =>
												handleOptionChange(e.target.value, index)
											}
											placeholder="Enter option"
											className="bg-white"
										/>
										<Button
											variant="destructive"
											size="icon"
											onClick={() => handleRemoveOption(index)}
											className="bg-red-500 text-white hover:bg-red-600"
										>
											<Trash className="w-4 h-4" />
										</Button>
									</div>
								))}
								<div className="flex items-center gap-2">
									<Input
										value={newOption}
										onChange={(e) => setNewOption(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === "Enter") handleAddOption();
										}}
										placeholder="Add new option"
										className="bg-white"
									/>
									<Button
										variant="outline"
										size="sm"
										type="button"
										onClick={handleAddOption}
										className="bg-blue-400 text-white hover:bg-blue-500 w-fit"
										disabled={!newOption.trim()}
									>
                    Add <Plus className="w-4 h-4 ml-1" />
									</Button>
								</div>
							</div>
						</div>
					)}
					{localField.fieldtype === "Link" && (
						<div className="space-y-1">
							<label className="text-sm font-medium text-gray-500">
                Doctype Name
							</label>
							<AsyncDropdownWithoutForm
								doctype="DocType"
								placeholder="Select Doctype"
								selectedValue={localField.options || ""}
								setSelectedValue={(value) =>
									handleFieldChange("options", value)
								}
								className="bg-white"
							/>
						</div>
					)}

					<div className="space-y-1">
						<label className="text-sm font-medium text-gray-500">
              Fetch From
						</label>
						<div className="flex flex-col gap-2">
							{/* Link Field Dropdown */}
							<select
								className="border rounded p-2 text-sm"
								value={localField.fetch_from?.split(".")[0] || ""}
								onChange={(e) => {
									const linkField = e.target.value;
									handleFieldChange(
										"fetch_from",
										linkField ? `${linkField}.` : "",
									);
								}}
							>
								<option value="">Select Link Field</option>
								{getLinkFields(
									getValues("fields"),
									localField.fieldname ?? "",
								).map((f) => (
									<option key={f.fieldname} value={f.fieldname}>
										{f.label} ({f.options})
									</option>
								))}
							</select>
							{/* Target Field Dropdown */}
							{localField.fetch_from?.split(".")[0] && (
								<select
									className="border rounded p-2 text-sm"
									value={localField.fetch_from?.split(".")[1] || ""}
									onChange={(e) => {
										const linkField = localField.fetch_from?.split(".")[0];
										handleFieldChange(
											"fetch_from",
											`${linkField}.${e.target.value}`,
										);
									}}
								>
									<option value="">Select Field</option>
									{targetFields.map((f) => (
										<option key={f.value} value={f.value}>
											{f.label}
										</option>
									))}
								</select>
							)}
						</div>
					</div>
					<div className="flex gap-4">
						<div className="flex items-center gap-2">
							<Checkbox
								checked={!!localField.reqd}
								onCheckedChange={(checked) =>
									handleFieldChange("reqd", checked ? 1 : 0)
								}
								className="bg-white"
							/>
							<label className="text-sm text-gray-500">Mandatory</label>
						</div>
						<div className="flex items-center gap-2">
							<Checkbox
								checked={!!localField.in_list_view}
								onCheckedChange={(checked) =>
									handleFieldChange("in_list_view", checked ? 1 : 0)
								}
								className="bg-white"
							/>
							<label className="text-sm text-gray-500">In List View</label>
						</div>
						<div className="flex items-center gap-2">
							<Checkbox
								checked={!!localField.read_only}
								onCheckedChange={(checked) =>
									handleFieldChange("read_only", checked ? 1 : 0)
								}
								className="bg-white"
							/>
							<label className="text-sm text-gray-500">Read Only</label>
						</div>
					</div>
					{localField?.fieldtype !== "Attach" && (
						<div className="space-y-1">
							<label className="text-sm font-medium text-gray-500">
                Default Value
							</label>
							<Input
								value={localField.default || ""}
								onChange={(e) => handleFieldChange("default", e.target.value)}
								placeholder="Default value"
								className="bg-white"
							/>
						</div>
					)}

					{localField?.fetch_from && (
						<div className="flex flex-col items-start gap-1">
							<div className="flex items-center gap-2">
								<Checkbox
									checked={!!localField.fetch_if_empty}
									onCheckedChange={(checked) =>
										handleFieldChange("fetch_if_empty", checked ? 1 : 0)
									}
									className="bg-white"
								/>
								<label className="text-sm text-gray-500">
                  Fetch on Save if Empty
								</label>
							</div>
							<HelperText>
                If unchecked, the value will always be re-fetched on save.
							</HelperText>
						</div>
					)}

					<div className="space-y-1">
						<label className="text-sm font-medium text-gray-500">
              Description
						</label>
						<Input
							value={localField.description || ""}
							onChange={(e) => handleFieldChange("description", e.target.value)}
							placeholder="Field description"
							className="bg-white"
						/>
					</div>
				</div>
			) : (
				<Input
					placeholder={localField.description || "Empty state"}
					className="bg-white"
					readOnly
					hidden={!localField.description}
				/>
			)}
		</div>
	);
};

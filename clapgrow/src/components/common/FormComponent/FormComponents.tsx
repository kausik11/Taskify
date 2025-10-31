import { DocField } from "@/types/Core/DocField";
import { Controller, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Check } from "../Checkbox/Check";
import { FormElement } from "../FormControl";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "../Select/Select";
import { DatePickerComponent, DateTimePicker } from "../AirDatePicker";
import { AsyncDropdown } from "../AsyncDropdown/AsyncDropdown";
import { PhoneInput } from "../PhoneInput/PhoneInputField";
import { Button } from "@/components/ui/button";
import { File } from "@/types/Core/File";
import { useContext, useMemo, useState } from "react";
import { DocumentUploadModal } from "../FileUploader/DocumentUploadModal";
import { Link, useParams } from "react-router-dom";
import { useGetDoctypeMeta } from "@/hooks/useGetDoctypeMeta";
import { FrappeConfig, FrappeContext } from "frappe-react-sdk";
import { getRouting } from "@/hooks/useRoutingMap";

export const DynamicField = ({
	field,
	fieldProps,
}: {
  field: DocField;
  fieldProps?: any;
}) => {
	switch (field.fieldtype) {
	case "Data":
		return <InputAndPhoneField field={field} fieldProps={fieldProps} />;
	case "Small Text":
		return <TextareaField field={field} fieldProps={fieldProps} />;
	case "Check":
		return <CheckField field={field} fieldProps={fieldProps} />;
	case "Select":
		return <SelectDropdownField field={field} fieldProps={fieldProps} />;
	case "Date":
		return <DateField field={field} fieldProps={fieldProps} />;
	case "Int":
		return <NumberField field={field} fieldProps={fieldProps} />;
	case "Link":
		return <LinkField field={field} fieldProps={fieldProps} />;
	case "Attach":
		return <UploadFileField field={field} fieldProps={fieldProps} />;
	case "Datetime":
		return <DateTimeField field={field} fieldProps={fieldProps} />;
	default:
		return <InputField field={field} fieldProps={fieldProps} />;
	}
};

export const InputAndPhoneField = ({
	field,
	fieldProps,
}: {
  field: DocField;
  fieldProps?: any;
}) => {
	if (field.options?.trim() === "Phone") {
		return <PhoneInputField field={field} fieldProps={fieldProps} />;
	}
	return <InputField field={field} fieldProps={fieldProps} />;
};

export const InputField = ({
	field,
	fieldProps,
}: {
  field: DocField;
  fieldProps?: any;
}) => {
	const { register } = useFormContext();

	return (
		<FormElement
			name={field.fieldname as string}
			label={field.label as string}
			aria-required={field.reqd ? true : false}
			tooltip={field.description as string}
		>
			<Input
				type={field.fieldtype}
				id={field.fieldname}
				{...register(field.fieldname as string, {
					required: field.reqd ? `${field.label} is required` : false,
				})}
				className="border border-gray-300 rounded-md p-2"
				{...fieldProps}
			/>
		</FormElement>
	);
};

export const TextareaField = ({
	field,
	fieldProps,
}: {
  field: DocField;
  fieldProps?: any;
}) => {
	const { register } = useFormContext();

	return (
		<FormElement
			name={field.fieldname as string}
			label={field.label as string}
			aria-required={field.reqd ? true : false}
			tooltip={field.description as string}
		>
			<Textarea
				id={field.fieldname}
				{...register(field.fieldname as string, {
					required: field.reqd ? `${field.label} is required` : false,
				})}
				className="border border-gray-300 rounded-md p-2"
				{...fieldProps}
			/>
		</FormElement>
	);
};

export const CheckField = ({
	field,
	fieldProps,
}: {
  field: DocField;
  fieldProps?: any;
}) => {
	return (
		<FormElement
			name={field.fieldname as string}
			aria-required={field.reqd ? true : false}
			tooltip={field.description as string}
		>
			<Check
				name={field.fieldname as string}
				label={field.label as string}
				className="text-sm font-medium text-gray-700"
				rules={{
					required: field.reqd ? `${field.label} is required` : false,
				}}
				disabled={fieldProps?.readOnly}
				{...fieldProps}
			/>
		</FormElement>
	);
};

export const SelectDropdownField = ({
	field,
	fieldProps,
}: {
  field: DocField;
  fieldProps?: any;
}) => {
	const options =
    field?.options
    	?.split("\n")
    	.map((option) => option.trim())
    	.filter((option) => option !== "") || [];

	return (
		<FormElement
			name={field.fieldname as string}
			label={field.label as string}
			aria-required={field.reqd ? true : false}
			tooltip={field.description as string}
		>
			<SelectField
				name={field.fieldname as string}
				label={field.label as string}
				options={options}
				rules={{
					required: field.reqd ? `${field.label} is required` : false,
				}}
				{...fieldProps}
			/>
		</FormElement>
	);
};

export const DateField = ({
	field,
	fieldProps,
}: {
  field: DocField;
  fieldProps?: any;
}) => {
	return (
		<FormElement
			name={field.fieldname as string}
			label={field.label as string}
			aria-required={field.reqd ? true : false}
			tooltip={field.description as string}
		>
			<DatePickerComponent
				name={field.fieldname as string}
				rules={{
					required: field.reqd ? `${field.label} is required` : false,
				}}
				{...fieldProps}
			/>
		</FormElement>
	);
};

export const DateTimeField = ({
	field,
	fieldProps,
}: {
  field: DocField;
  fieldProps?: any;
}) => {
	return (
		<FormElement
			name={field.fieldname as string}
			label={field.label as string}
			aria-required={field.reqd ? true : false}
			tooltip={field.description as string}
		>
			<DateTimePicker
				name={field.fieldname as string}
				rules={{
					required: field.reqd ? `${field.label} is required` : false,
				}}
				showTimeSelect
				{...fieldProps}
			/>
		</FormElement>
	);
};

export const NumberField = ({
	field,
	fieldProps,
}: {
  field: DocField;
  fieldProps?: any;
}) => {
	const { register } = useFormContext();

	return (
		<FormElement
			name={field.fieldname as string}
			label={field.label as string}
			aria-required={field.reqd ? true : false}
			tooltip={field.description as string}
		>
			<Input
				type="number"
				id={field.fieldname}
				{...register(field.fieldname as string, {
					required: field.reqd ? `${field.label} is required` : false,
				})}
				className="border border-gray-300 rounded-md p-2"
				{...fieldProps}
			/>
		</FormElement>
	);
};

export const LinkField = ({
	field,
	fieldProps,
}: {
  field: DocField;
  fieldProps?: any;
}) => {
	const { doctype } = useParams();

	const { routingMap } = getRouting();

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

	const { data } = useGetDoctypeMeta(DOCTYPE);

	// Fetch All the fields which have fetch_from and fetch from syntax is like `fieldname.fieldname` , so check first fieldname is same as field.fieldname
	// if yes then return second fieldname as options
	const fetchFields = useMemo(() => {
		if (data?.fields) {
			return data.fields
				.filter(
					(f: DocField) =>
						f.fetch_from && f.fetch_from.startsWith(field.fieldname + "."),
				)
				.map((field: DocField) => {
					const fetchFieldname = field.fetch_from?.split(".")[1];
					return fetchFieldname;
				});
		}
		return [];
	}, [data]);

	const { call } = useContext(FrappeContext) as FrappeConfig;

	const { setValue } = useFormContext();

	const onLinkChange = async (value: string) => {
		call
			.get("frappe.client.get_value", {
				doctype: field.options?.trim() || "",
				filters: {
					name: value,
				},
				fieldname: fetchFields,
			})
			.then((response: any) => {
				// Handle the response here
				// respose will be like { fieldname: value, fieldname2: value2 }
				if (response && response.message) {
					Object.keys(response.message).forEach((key) => {
						setValue(key, response.message[key], {
							shouldValidate: false,
							shouldDirty: true,
						});
					});
				}
			});
	};

	return (
		<FormElement
			name={field.fieldname as string}
			label={field.label as string}
			aria-required={field.reqd ? true : false}
			tooltip={field.description as string}
		>
			<AsyncDropdown
				name={field.fieldname as string}
				doctype={field.options?.trim() || ""}
				rules={{
					required: field.reqd ? `${field.label} is required` : false,
					onChange: (e) => onLinkChange(e.target.value),
				}}
				{...fieldProps}
			/>
		</FormElement>
	);
};

export const PhoneInputField = ({
	field,
	fieldProps,
}: {
  field: DocField;
  fieldProps?: any;
}) => {
	const { control } = useFormContext();
	return (
		<FormElement
			name={field.fieldname as string}
			label={field.label as string}
			aria-required={field.reqd ? true : false}
			tooltip={field.description as string}
		>
			<Controller
				control={control}
				name={field.fieldname as string}
				rules={{
					required: field.reqd ? `${field.label} is required` : false,
				}}
				render={({ field }) => <PhoneInput {...field} defaultCountry={"IN"} />}
			/>
		</FormElement>
	);
};

export const UploadFileField = ({
	field,
	fieldProps,
}: {
  field: DocField;
  fieldProps?: any;
}) => {
	const { watch, register, setValue } = useFormContext();

	const fileUrl = watch(field.fieldname as string);

	const onUpload = (files: File[]) => {
		setValue(field.fieldname as string, files[0].file_url, {
			shouldValidate: false,
			shouldDirty: true,
		});
	};

	const clearField = () => {
		setValue(field.fieldname as string, "", {
			shouldValidate: false,
			shouldDirty: true,
		});
	};

	const [isOpen, setOpen] = useState(false);

	const name = watch("name");

	const onCloseModal = () => {
		setOpen(false);
	};

	const { doctype } = useParams();

	const { routingMap } = getRouting();

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

	return (
		<FormElement
			name={field.fieldname as string}
			label={field.label as string}
			aria-required={field.reqd ? true : false}
			tooltip={field.description as string}
		>
			{fileUrl ? (
				<div className="flex items-center gap-0">
					<Link
						to={fileUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="rounded-md h-9 text-sm rounded-r-none border-r-0 border p-2  hover:underline w-full truncate cursor-pointer"
						title={fileUrl}
					>
						{fileUrl}
					</Link>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="border-l-0 rounded-l-none bg-gray-200 hover:bg-gray-300"
						onClick={() => clearField()}
					>
            Clear
					</Button>
				</div>
			) : (
				<Button
					variant="outline"
					type="button"
					size="sm"
					className="w-fit mt-0.5"
					onClick={() => setOpen(true)}
				>
          Attach
				</Button>
			)}
			<DocumentUploadModal
				maxFiles={1}
				open={isOpen}
				onClose={onCloseModal}
				fieldname={field.fieldname}
				onUpdate={onUpload}
				doctype={DOCTYPE}
				docname={name}
			/>
		</FormElement>
	);
};

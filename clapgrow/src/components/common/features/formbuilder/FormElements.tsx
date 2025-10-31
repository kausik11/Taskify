import {
	Calendar,
	CalendarSync,
	FileDigit,
	Link,
	Phone,
	RectangleHorizontal,
	SendToBack,
	SquareCheck,
	SquareMenu,
	TypeOutline,
	Upload,
} from "lucide-react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { DocField } from "@/types/Core/DocField";
import { JSX } from "react";

export interface Elements {
  id: string;
  name: string;
  icon: JSX.Element;
  value: string;
  options?: string; // Optional field for specific element options
}
export const formElements: Elements[] = [
	{
		id: "1",
		name: "Text Field",
		icon: <TypeOutline className="text-blue-500" />,
		value: "Data",
	},
	{
		id: "2",
		name: "Text Area",
		icon: <RectangleHorizontal className="text-green-500" />,
		value: "Small Text",
	},
	{
		id: "3",
		name: "Checkbox",
		icon: <SquareCheck className="text-purple-500" />,
		value: "Check",
	},
	{
		id: "4",
		name: "Dropdown",
		icon: <SquareMenu className="text-orange-500" />,
		value: "Select",
	},
	{
		id: "5",
		name: "Date",
		icon: <Calendar className="text-yellow-500" />,
		value: "Date",
	},
	{
		id: "6",
		name: "Number",
		icon: <FileDigit className="text-rose-500" />,
		value: "Int",
	},
	{
		id: "7",
		name: "Link",
		icon: <Link className="text-teal-500" />,
		value: "Link",
	},
	{
		id: "8",
		name: "Phone",
		icon: <Phone className="text-cyan-500" />,
		value: "Data",
		options: "Phone",
	},
	{
		id: "9",
		name: "Upload",
		icon: <Upload className="text-gray-500" />,
		value: "Attach",
	},
	{
		id: "10",
		name: "Override Creation Date",
		icon: <CalendarSync className="text-violet-500" />,
		value: "Datetime",
	},
	{
		id: "11",
		name: "Proceed to Next Step",
		icon: <SendToBack className="text-lime-500" />,
		value: "Select",
	},
];

export const FieldType = ({
	value,
	onClick,
	options,
}: {
  value: string;
  onClick: (key: keyof DocField, value: any) => void;
  options?: string;
}) => {
	let selectValue = options?.trim() === "Phone" ? "Phone" : value;

	const onSelectChange = (e: string) => {
		if (e === "Phone") {
			onClick("fieldtype", "Data");
			onClick("options", "Phone");
		} else {
			onClick("fieldtype", e);
			onClick("options", "");
		}
	};

	return (
		<div className="flex flex-col space-y-1">
			<label className="text-sm font-medium text-gray-500">Fieldtype</label>
			<Select onValueChange={(e) => onSelectChange(e)} value={selectValue}>
				<SelectTrigger className="w-full bg-white">
					<SelectValue placeholder="Field Type" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="Data">Text</SelectItem>
					<SelectItem value="Small Text">Text Area</SelectItem>
					<SelectItem value="Check">Checkbox</SelectItem>
					<SelectItem value="Select">Select</SelectItem>
					<SelectItem value="Date">Date</SelectItem>
					<SelectItem value="Int">Number</SelectItem>
					<SelectItem value="Link">Link</SelectItem>
					<SelectItem value="Phone">Phone</SelectItem>
					<SelectItem value="Attach">Upload</SelectItem>
				</SelectContent>
			</Select>
		</div>
	);
};

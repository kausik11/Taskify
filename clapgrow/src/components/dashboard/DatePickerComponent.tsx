import { useController } from "react-hook-form";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CIcon } from "lucide-react";
import { useState } from "react";
import { DocField } from "@/types/Core/DocField";
import CustomCalender from "../common/CustomCalender";

interface DatePickerComponentProps {
  field: DocField;
}

export const DatePickerComponent = ({ field }: DatePickerComponentProps) => {
	const [isOpen, setIsOpen] = useState(false);
	const { field: controllerField } = useController({
		name: field.fieldname,
	});

	const selectedDate = controllerField.value
		? new Date(controllerField.value)
		: null;

	const handleDateChange = (date: Date) => {
		// Format the date as YYYY-MM-DD (Frappe/ERPNext standard format)
		const formattedDate = format(date, "yyyy-MM-dd");
		controllerField.onChange(formattedDate);
		setIsOpen(false);
	};

	//if require is true and not select any value will show a warning under the input
	const showWarning = field.reqd && !selectedDate;
	const warningMessage = field.reqd ? `${field.label} is required` : "";
	const warningClass = field.reqd ? "text-red-500 text-[13px]" : "";
	const className = cn("flex items-center", {
		"text-red-500": showWarning,
	});
	// return (
	// 	<div className="flex flex-col gap-2">
	// 		<div className={className}>
	// 			<CustomCalender
	// 				date={selectedDate}
	// 				onChange={(date) => {
	// 					if (date) handleDateChange(date);
	// 				}}
	// 				isTimeVisible={false}
	// 			/>
	// 		</div>
	// 		{showWarning && (
	// 			<p className={warningClass}>{warningMessage}</p>
	// 			)}
	// 	</div>
	// );
	// };

	return (
		<div className="flex flex-col gap-2 relative">
			<label
				htmlFor={field.fieldname}
				className="text-sm font-medium text-gray-700"
			>
				{field.label}
				{field.reqd ? <span className="text-red-500"> *</span> : ""}
			</label>

			{/* <Popover open={isOpen} onOpenChange={setIsOpen}>
				<PopoverTrigger asChild>
					<button
						type="button"
						onClick={() => setIsOpen(true)}
						className={cn(
							"w-full flex items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm",
							"focus:outline-none focus:ring-1 focus:ring-blue-500",
							"hover:bg-gray-50",
							!selectedDate && "text-gray-500"
						)}
					>
						<span>
							{selectedDate ? format(selectedDate, 'PPP') : "Select a date"}
						</span>
						<CIcon className="h-4 w-4 opacity-50" />
					</button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<CustomCalender
						date={selectedDate|| undefined}
						onChange={(date) => {
							if (date) handleDateChange(date);
						}}
						isTimeVisible={false}
						containerClassName="w-full"
					/>
				</PopoverContent>
			</Popover> */}
			{/* <Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<button
				type="button"
				onClick={() => setIsOpen(true)}
				className={cn(
					"w-full flex items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm",
					"focus:outline-none focus:ring-1 focus:ring-blue-500",
					"hover:bg-gray-50",
					!selectedDate && "text-gray-500"
				)}>
						<span>
							{selectedDate ? format(selectedDate, 'PPP') : "Select a date"}
						</span>
						<CIcon className="h-4 w-4 opacity-50" />
					</button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="start">
					<CustomCalender
						date={selectedDate || undefined}
						onChange={(date) => {
							if (date) handleDateChange(date);
						}}
						isTimeVisible={false}
						containerClassName="w-full"
					/>
					</PopoverContent>
					</Popover> */}

			<button
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				className={cn(
					"w-full flex items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm",
					"focus:outline-none focus:ring-1 focus:ring-blue-500",
					"hover:bg-gray-50",
					!selectedDate && "text-gray-500",
				)}
			>
				<span>
					{selectedDate ? format(selectedDate, "PPP") : "Select a date"}
				</span>
				<CIcon className="h-4 w-4 opacity-50" />
			</button>

			{/* open the customCalender */}
			{isOpen && (
				<div className="relative z-50 bg-white border border-gray-200 rounded shadow-md w-fit">
					<CustomCalender
						date={selectedDate || undefined}
						onChange={(date) => {
							if (date) handleDateChange(date);
						}}
						isTimeVisible={false}
						containerClassName="w-full"
					/>
				</div>
			)}
			{showWarning ? <p className={warningClass}>{warningMessage}</p> : ""}
		</div>
	);
};

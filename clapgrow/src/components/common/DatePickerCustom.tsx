import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CIcon } from "lucide-react";
import { Calendar } from "../ui/calendar";
import { Dispatch, SetStateAction } from "react";

interface DatePickerCustomProps {
  date: Date;
  onChange: Dispatch<SetStateAction<Date | undefined>>;
  text?: string;
  disabled?: boolean;
  containerClassName?: string;
}

export default function DatePickerCustom({
	date,
	onChange,
	text,
	disabled = false,
	containerClassName = "",
}: DatePickerCustomProps) {
	return (
		<Popover>
			<PopoverTrigger asChild disabled={disabled}>
				<div
					className={cn(
						"w-full flex flex-row items-center font-normal text-[14px] justify-start bg-transparent text-[#0076BD] border-none p-0 hover:bg-transparent shadow-none hover:text-[#0076BD]",
						containerClassName,
					)}
				>
					<CIcon className="mr-2 h-4 w-4" />
					{date ? (
						format(date, "PPP")
					) : (
						<span>{text ? text : "Pick a date"}</span>
					)}
				</div>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="single"
					selected={date}
					onSelect={onChange}
					initialFocus
				/>
			</PopoverContent>
		</Popover>
	);
}

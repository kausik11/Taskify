import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
	addDays,
	endOfMonth,
	endOfWeek,
	format,
	getMonth,
	isSameDay,
	isSameMonth,
	startOfMonth,
	startOfWeek,
} from "date-fns";
import { Calendar as CIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import CustomMonthPicker from "./CustomMonthPicker";
import CustomTimePicker from "./CustomTimePicker";

interface CustomCalenderProps {
  date: Date | null;
  onChange: (date: Date | null) => void;
  text?: string;
  disabled?: boolean;
  containerClassName?: string;
}

const CustomCalenderFilter = ({
	date,
	onChange,
	text = "Pick a date",
	disabled = false,
	containerClassName = "",
}: CustomCalenderProps) => {
	const [currentMonth, setCurrentMonth] = useState(new Date());
	const [selectedDate, setSelectedDate] = useState<Date | null>(date);
	const [selectedTime, setSelectedTime] = useState(new Date());

	// Update selected date and time when `date` prop changes
	useEffect(() => {
		if (date) {
			setSelectedDate(date);
			setSelectedTime(date);
			// Also update currentMonth to show the correct month/year in the picker
			setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
		} else {
			setSelectedDate(null);
			setSelectedTime(new Date());
		}
	}, [date]);

	const handleDateTimeChange = (date: Date | null, time: Date) => {
		if (date) {
			const newDate = new Date(
				date.getFullYear(),
				date.getMonth(),
				date.getDate(),
				time.getHours(),
				time.getMinutes(),
			);
			onChange(newDate);
		} else {
			onChange(null);
		}
	};

	// Updated to properly handle month/year changes from CustomMonthPicker
	const handleMonthYearChange = ({ month, year }: { month: number; year: number }) => {
		const newDate = new Date(year, month, 1);
		setCurrentMonth(newDate);
	};

	const renderHeader = () => (
		<div className="flex justify-between items-center mb-4">
			<CustomMonthPicker
				selectedMonth={getMonth(currentMonth)}
				currentMonth={currentMonth}
				onChange={handleMonthYearChange}
			/>
			<CustomTimePicker
				selectedTime={selectedTime}
				onChange={setSelectedTime}
			/>
		</div>
	);

	const renderDays = () => {
		const dateFormat = "EEE";
		const days: JSX.Element[] = [];
		const startDate = startOfWeek(currentMonth);

		for (let i = 0; i < 7; i++) {
			days.push(
				<div className="text-center py-2 font-normal text-sm" key={i}>
					{format(addDays(startDate, i), dateFormat).slice(0, 2)}
				</div>,
			);
		}

		return <div className="grid grid-cols-7">{days}</div>;
	};

	const renderCells = () => {
		const monthStart = startOfMonth(currentMonth);
		const monthEnd = endOfMonth(monthStart);
		const startDate = startOfWeek(monthStart);
		const endDate = endOfWeek(monthEnd);

		const dateFormat = "d";
		const rows: JSX.Element[] = [];

		let days: JSX.Element[] = [];
		let day = startDate;

		while (day <= endDate) {
			for (let i = 0; i < 7; i++) {
				const formattedDate = format(day, dateFormat);
				const cloneDay = day;

				days.push(
					<div
						className={`p-2 text-center text-sm font-normal border border-gray-300 cursor-pointer ${!isSameMonth(day, monthStart)
							? "text-gray-400"
							: isSameDay(day, selectedDate || new Date())
								? "bg-blue-500 text-white"
								: "hover:bg-gray-100"
						}`}
						key={"day-" + day.toISOString()}
						onClick={() => onDateClick(cloneDay)}
					>
						<span>{formattedDate}</span>
					</div>,
				);
				day = addDays(day, 1);
			}
			rows.push(
				<div className="grid grid-cols-7" key={"row-day-" + day.toISOString()}>
					{days}
				</div>,
			);
			days = [];
		}

		return <div>{rows}</div>;
	};

	const onDateClick = (day: Date) => {
		setSelectedDate(day);
		handleDateTimeChange(day, selectedTime);
	};

	// Enhanced date formatting to ensure proper display
	const getDisplayText = () => {
		if (!date) return text;

		try {
			return format(date, "PPP"); // This will show "January 1, 2024" format
		} catch (error) {
			// Fallback formatting if date is invalid
			return date.toLocaleDateString();
		}
	};

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					className={cn(
						"w-full justify-between text-left font-normal",
						!date && "text-muted-foreground",
						disabled && "cursor-not-allowed opacity-50",
						containerClassName,
					)}
					disabled={disabled}
				>
					<span className="truncate">{getDisplayText()}</span>
					<CIcon className="ml-2 h-4 w-4 flex-shrink-0" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[340px] p-4">
				{renderHeader()}
				{renderDays()}
				{renderCells()}

				{/* Optional: Add clear button for better UX */}
				{selectedDate && (
					<div className="mt-4 pt-4 border-t border-gray-200">
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								setSelectedDate(null);
								onChange(null);
							}}
							className="w-full"
						>
              Clear Selection
						</Button>
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
};

export default CustomCalenderFilter;
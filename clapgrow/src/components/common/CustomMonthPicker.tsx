import { addMonths, getYear, subMonths } from "date-fns";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface CustomMonthPickerProps {
	selectedMonth: number;
	currentMonth: Date;
	onChange: ({ month, year }: { month: number; year: number }) => void;
}

const CustomMonthPicker = ({
	selectedMonth,
	currentMonth,
	onChange,
}: CustomMonthPickerProps) => {
	const MONTHS = [
		"January", "February", "March", "April", "May", "June",
		"July", "August", "September", "October", "November", "December",
	];

	const currentDate = new Date();
	const currentYear = getYear(currentMonth);

	// Generate month options for current year and next year
	const generateMonthOptions = () => {
		const options = [];
		const startYear = getYear(currentDate);

		// Add months for current year and next 2 years
		for (let yearOffset = 0; yearOffset < 3; yearOffset++) {
			const year = startYear + yearOffset;
			MONTHS.forEach((monthName, monthIndex) => {
				const monthDate = new Date(year, monthIndex, 1);
				// Only show months from current month onwards for current year
				if (year === startYear && monthIndex < currentDate.getMonth()) {
					return;
				}
				options.push({
					month: monthName,
					monthIndex,
					year,
					display: `${monthName} ${year}`
				});
			});
		}
		return options;
	};

	const monthOptions = generateMonthOptions();

	const handlePreviousMonth = () => {
		const newMonth = subMonths(currentMonth, 1);
		// Don't go before current month
		if (newMonth >= new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)) {
			onChange({
				month: newMonth.getMonth(),
				year: getYear(newMonth),
			});
		}
	};

	const handleNextMonth = () => {
		const newMonth = addMonths(currentMonth, 1);
		onChange({
			month: newMonth.getMonth(),
			year: getYear(newMonth),
		});
	};

	const isPreviousDisabled = () => {
		const prevMonth = subMonths(currentMonth, 1);
		return prevMonth < new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
	};

	return (
		<div className="flex items-center justify-between w-full">
			{/* Navigation buttons */}
			<div className="flex items-center">
				<button
					onClick={handlePreviousMonth}
					disabled={isPreviousDisabled()}
					className=" rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
					aria-label="Previous Month"
				>
					<ChevronLeft className="w-4 h-4" />
				</button>
				<button
					onClick={handleNextMonth}
					className="rounded-lg hover:bg-gray-100 transition-colors"
					aria-label="Next Month"
				>
					<ChevronRight className="w-4 h-4" />
				</button>
			</div>

			{/* Month/Year dropdown */}
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button className="flex items-center justify-between gap-1 px-1 py-1 rounded-lg hover:bg-gray-100 transition-colors">
						<span className="text-center text-gray-900 font-thin truncate overflow-hidden text-ellipsis max-w-[120px] text-sm">
							{MONTHS[selectedMonth]} {currentYear}
						</span>
						<ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					className="max-h-80 overflow-y-auto w-48"
					align="end"
				>
					{monthOptions.map(({ month, monthIndex, year, display }, index) => (
						<DropdownMenuItem
							key={index}
							onClick={() => onChange({ month: monthIndex, year })}
							className={`cursor-pointer px-3 py-2 ${monthIndex === selectedMonth && year === currentYear
								? 'bg-blue-50 text-blue-700 font-medium'
								: 'text-gray-700 hover:bg-gray-50'
							}`}
						>
							{display}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
};

export default CustomMonthPicker;
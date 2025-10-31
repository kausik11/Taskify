import { format, parse } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Input } from "../ui/input";
import React from "react";

interface CustomTimePickerProps {
  selectedTime: Date;
  onChange: (time: Date) => void;
  startTime?: Date;
  endTime?: Date;
}

const CustomTimePicker = React.forwardRef<HTMLButtonElement, CustomTimePickerProps>(({
	selectedTime,
	onChange,
	startTime,
	endTime,
}, ref) => {
	const [time, setTime] = useState<Date>(selectedTime || new Date());
	const [searchQuery, setSearchQuery] = useState("");
	const [isOpen, setIsOpen] = useState(false);

	useEffect(() => {
		setTime(selectedTime);
	}, [selectedTime]);

	// Generate time slots every 15 minutes
	const times = Array.from({ length: 24 * 4 }, (_, index) => {
		const hours = Math.floor(index / 4);
		const minutes = (index % 4) * 15;
		return new Date(2023, 0, 1, hours, minutes);
	});

	const currentDateTime = new Date();
	const isSelectedDateToday =
		selectedTime.getDate() === currentDateTime.getDate() &&
		selectedTime.getMonth() === currentDateTime.getMonth() &&
		selectedTime.getFullYear() === currentDateTime.getFullYear();

	// Filter times based on constraints and search
	const filteredTimes = useMemo(() => {
		let filtered = times;

		// Apply time constraints
		filtered = filtered.filter((timeSlot) => {
			const slotDateTime = new Date(
				selectedTime.getFullYear(),
				selectedTime.getMonth(),
				selectedTime.getDate(),
				timeSlot.getHours(),
				timeSlot.getMinutes()
			);
			
			// Check if time is in the past (for today only)
			const isPast = slotDateTime < currentDateTime;
			if (isSelectedDateToday && isPast) return false;
			
			// Check start/end time constraints
			if (startTime && slotDateTime < startTime) return false;
			if (endTime && slotDateTime > endTime) return false;
			
			return true;
		});

		// Apply search filter
		if (searchQuery.trim()) {
			const lowerQuery = searchQuery.toLowerCase().trim();
			filtered = filtered.filter((timeSlot) => {
				const time12Hour = format(timeSlot, "h:mm a").toLowerCase();
				const time12HourNoSpace = format(timeSlot, "h:mma").toLowerCase();
				const time24Hour = format(timeSlot, "HH:mm").toLowerCase();
				const timeHourOnly = format(timeSlot, "h a").toLowerCase();

				return (
					time12Hour.includes(lowerQuery) ||
					time12HourNoSpace.includes(lowerQuery) ||
					time24Hour.includes(lowerQuery) ||
					timeHourOnly.includes(lowerQuery)
				);
			});
		}

		return filtered;
	}, [
		searchQuery,
		times,
		selectedTime,
		currentDateTime,
		startTime,
		endTime,
		isSelectedDateToday,
	]);

	const handleTimeClick = (selected: Date) => {
		const newTime = new Date(selectedTime);
		newTime.setHours(selected.getHours());
		newTime.setMinutes(selected.getMinutes());
		newTime.setSeconds(0);
		newTime.setMilliseconds(0);
		setTime(newTime);
		onChange(newTime);
		setSearchQuery("");
		setIsOpen(false);
	};

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const query = e.target.value;
		setSearchQuery(query);
		
		// Try parsing the input as a valid time
		try {
			const formats = ["h:mm a", "h:mma", "HH:mm", "H:mm"];
			let parsedTime: Date | null = null;
			
			for (const formatStr of formats) {
				try {
					parsedTime = parse(query, formatStr, new Date());
					if (!isNaN(parsedTime.getTime())) break;
				} catch {
					continue;
				}
			}

			if (parsedTime && !isNaN(parsedTime.getTime())) {
				const newTime = new Date(selectedTime);
				newTime.setHours(parsedTime.getHours());
				newTime.setMinutes(parsedTime.getMinutes());
				newTime.setSeconds(0);
				newTime.setMilliseconds(0);

				// Validate against constraints
				const isPast = isSelectedDateToday && newTime < currentDateTime;
				const isBeforeStart = startTime && newTime < startTime;
				const isAfterEnd = endTime && newTime > endTime;

				if (!isPast && !isBeforeStart && !isAfterEnd) {
					setTime(newTime);
					onChange(newTime);
				}
			}
		} catch (error) {
			// Ignore parsing errors
		}
	};

	const getCurrentTimeLabel = () => {
		return format(time, "h:mm a");
	};

	const getQuickTimeOptions = () => {
		const quickTimes = [
			{ label: "9:00 AM", hours: 9, minutes: 0 },
			{ label: "12:00 PM", hours: 12, minutes: 0 },
			{ label: "1:00 PM", hours: 13, minutes: 0 },
			{ label: "5:00 PM", hours: 17, minutes: 0 },
			{ label: "6:00 PM", hours: 18, minutes: 0 },
		];

		return quickTimes.filter(quickTime => {
			const quickDateTime = new Date(
				selectedTime.getFullYear(),
				selectedTime.getMonth(),
				selectedTime.getDate(),
				quickTime.hours,
				quickTime.minutes
			);

			const isPast = isSelectedDateToday && quickDateTime < currentDateTime;
			const isBeforeStart = startTime && quickDateTime < startTime;
			const isAfterEnd = endTime && quickDateTime > endTime;

			return !isPast && !isBeforeStart && !isAfterEnd;
		});
	};

	const quickTimeOptions = getQuickTimeOptions();

	return (
		<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
			<DropdownMenuTrigger asChild>
				<button 
					ref={ref}
					className="flex items-center gap-2 px-1.5 py-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors bg-white"
				>
					<Clock className="w-4 h-4 text-gray-500" />
					<span className="font-medium text-gray-900 text-sm">
						{getCurrentTimeLabel()}
					</span>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="w-64 p-2"
				align="end"
				side="bottom"
				sideOffset={4}
			>
				{/* Search Input */}
				<div className="mb-3">
					<Input
						placeholder="Type time (e.g., 2:30 PM)"
						value={searchQuery}
						onChange={handleSearchChange}
						className="w-full text-sm border-gray-200 focus:border-blue-500 focus:ring-blue-500"
						autoFocus
					/>
				</div>

				{/* Quick Time Options */}
				{!searchQuery && quickTimeOptions.length > 0 && (
					<div className="mb-3">
						<div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 px-1">
							Quick Select
						</div>
						<div className="grid grid-cols-2 gap-1">
							{quickTimeOptions.map((quickTime) => (
								<button
									key={quickTime.label}
									onClick={() => {
										const quickDateTime = new Date(selectedTime);
										quickDateTime.setHours(quickTime.hours, quickTime.minutes, 0, 0);
										handleTimeClick(quickDateTime);
									}}
									className="px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded transition-colors"
								>
									{quickTime.label}
								</button>
							))}
						</div>
						<hr className="my-3 border-gray-100" />
					</div>
				)}

				{/* Time List */}
				<div className="max-h-48 overflow-y-auto">
					{filteredTimes.length > 0 ? (
						<div className="space-y-0.5">
							{filteredTimes.map((timeSlot, index) => {
								const isSelected = format(timeSlot, "HH:mm") === format(time, "HH:mm");
								return (
									<DropdownMenuItem
										key={index}
										onClick={() => handleTimeClick(timeSlot)}
										className={`px-3 py-2 cursor-pointer rounded-md transition-colors ${
											isSelected
												? "bg-blue-50 text-blue-700 font-medium"
												: "text-gray-700 hover:bg-gray-50"
										}`}
									>
										<div className="flex items-center justify-between w-full">
											<span className="text-sm">
												{format(timeSlot, "h:mm a")}
											</span>
											<span className="text-xs text-gray-400">
												{format(timeSlot, "HH:mm")}
											</span>
										</div>
									</DropdownMenuItem>
								);
							})}
						</div>
					) : (
						<div className="px-2 py-4 text-center">
							<Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
							<p className="text-sm text-gray-500">
								{searchQuery ? "No times match your search" : "No available times"}
							</p>
						</div>
					)}
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
});

CustomTimePicker.displayName = "CustomTimePicker";

export default CustomTimePicker;
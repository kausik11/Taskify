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
	getYear,
	isSameDay,
	isSameMonth,
	startOfMonth,
	startOfWeek,
} from "date-fns";
import { Calendar, RefreshCw } from "lucide-react";
import React, { useEffect, useState } from "react";
import CustomMonthPicker from "./CustomMonthPicker";
import CustomTimePicker from "./CustomTimePicker";
import AsanaStyleDatePicker from "../member-insights/AsanaStyleDatePicker";
import { useEmployeeHolidays } from "@/hooks/useEmployeeHolidays";

interface Holiday {
	date: string;
	holiday_name: string;
	holiday_type: string;
	source: string;
	is_optional: boolean;
	color: string;
	day_name: string;
}

interface CustomCalenderProps {
	date?: Date | undefined;
	onChange?: React.Dispatch<React.SetStateAction<Date | undefined>>;
	text?: string;
	disabled?: boolean;
	containerClassName?: string;
	isTimeVisible?: boolean;
	TaskType?: string;
	Style?: string;
	frequency?: { name: string };
	setFrequency?: React.Dispatch<React.SetStateAction<{ name: string }>>;
	weekDays?: string[];
	setWeekDays?: React.Dispatch<React.SetStateAction<string[]>>;
	custom?: { name: string };
	setCustom?: React.Dispatch<React.SetStateAction<{ name: string }>>;
	monthDay?: { name: string };
	setMonthDay?: React.Dispatch<React.SetStateAction<{ name: string }>>;
	recurrenceInterval?: { name: string };
	setRecurrenceInterval?: React.Dispatch<React.SetStateAction<{ name: string }>>;
	nthValue?: { name: string };
	setNthValue?: React.Dispatch<React.SetStateAction<{ name: string }>>;
	employeeId?: string;
}

export default function CustomCalender({
	date,
	onChange,
	text,
	disabled = false,
	containerClassName = "",
	isTimeVisible = true,
	TaskType,
	Style,
	frequency,
	setFrequency,
	custom,
	setCustom,
	weekDays,
	setWeekDays,
	monthDay,
	setMonthDay,
	recurrenceInterval,
	setRecurrenceInterval,
	nthValue,
	setNthValue,
	employeeId,
}: CustomCalenderProps) {
	const [currentMonth, setCurrentMonth] = useState(
		date ? new Date(date.getFullYear(), date.getMonth()) : new Date(),
	);
	const [selectedDate, setSelectedDate] = useState(() => {
		const defaultTime = new Date();
		defaultTime.setHours(18, 0, 0, 0);
		return date ? new Date(date) : defaultTime;
	});

	const [selectedTime, setSelectedTime] = useState(() => {
		const defaultTime = new Date();
		defaultTime.setHours(18, 0, 0, 0);
		return date ? new Date(date) : defaultTime;
	});

	const [isOpen, setIsOpen] = useState(false);
	const [clearFrequency, setClearFrequency] = useState(false);
	const [holidayConfirmDate, setHolidayConfirmDate] = useState<Date | null>(null);

	// Use the custom hook to fetch holidays with optional employeeId
	const { holidays, isLoadingHolidays } = useEmployeeHolidays(
		getMonth(currentMonth),
		getYear(currentMonth),
		employeeId
	);

	useEffect(() => {
		if (date) {
			const newDate = new Date(date);
			setSelectedTime(newDate);
			setSelectedDate(newDate);
			setCurrentMonth(new Date(newDate.getFullYear(), newDate.getMonth()));
		}
	}, [date]);

	const handleSetTime = (date: Date, time: Date) => {
		const newDate = new Date(
			date.getFullYear(),
			date.getMonth(),
			date.getDate(),
			time.getHours(),
			time.getMinutes(),
		);
		onChange?.(newDate);
		setSelectedDate(newDate);
	};

	// Handle date selection from AsanaStyleDatePicker calendar
	const handleDateSelectFromRecurrence = (date: Date) => {
		const newDate = new Date(
			date.getFullYear(),
			date.getMonth(),
			date.getDate(),
			selectedTime.getHours(),
			selectedTime.getMinutes(),
		);
		onChange?.(newDate);
		setSelectedDate(newDate);
	};

	useEffect(() => {
		if (clearFrequency) {
			setFrequency?.({ name: "Weekly" });
			setWeekDays?.([]);
			setCustom?.({ name: "" });
			setClearFrequency(false);
		}
	}, [clearFrequency, setFrequency, setWeekDays, setCustom]);

	// Helper function to check if a date should be highlighted based on recurrence pattern
	const isRecurrenceDate = (day: Date) => {
		if (!frequency?.name) return false;

		const dayOfWeek = format(day, "EEEE");

		switch (frequency.name) {
			case "Daily":
				return true;

			case "Weekly":
				return weekDays?.includes(dayOfWeek) || false;

			case "Monthly":
				// This is handled in the main calendar logic
				return false;

			case "Custom":
				if (custom?.name === "Day") {
					const interval = parseInt(recurrenceInterval?.name || "1");
					const daysDiff = Math.floor((day.getTime() - selectedDate.getTime()) / (1000 * 60 * 60 * 24));
					return daysDiff >= 0 && daysDiff % interval === 0;
				} else if (custom?.name === "Week") {
					return weekDays?.includes(dayOfWeek) || false;
				}
				return false;

			default:
				return false;
		}
	};

	const renderHeader = () => (
		<div className="flex flex-wrap items-left mb-4 bg-white rounded-xl shadow-sm">
			<div className="flex items-center gap-1 w-full">
				<div className="min-w-[170px] max-w-[210px]">
					<CustomMonthPicker
						selectedMonth={getMonth(currentMonth)}
						currentMonth={currentMonth}
						onChange={({ month, year }: { month: number; year: number }) => {
							const newMonth = new Date(year, month, 1);
							if (!isNaN(newMonth.getTime())) {
								setCurrentMonth(newMonth);
							} else {
								console.error("Invalid date created:", { year, month });
							}
						}}
					/>
				</div>

				{isTimeVisible && (
					<div className="ml-auto min-w-[120px] max-w-[150px] pb-1">
						<CustomTimePicker
							selectedTime={selectedTime}
							onChange={(time: Date) => {
								setSelectedTime(time);
								handleSetTime(selectedDate, time);
								setIsOpen(false);
							}}
						/>
					</div>
				)}
			</div>
		</div>
	);

	const renderDays = () => {
		const startDate = startOfWeek(currentMonth);
		return (
			<div className="grid grid-cols-7">
				{Array.from({ length: 7 }).map((_, i) => (
					<div
						key={i}
						className="w-6 h-6 flex justify-center text-[12px] font-[400]"
					>
						{format(addDays(startDate, i), "EEEEE")}
					</div>
				))}
			</div>
		);
	};

	const renderCells = () => {
		const monthStart = startOfMonth(currentMonth);
		const monthEnd = endOfMonth(monthStart);
		const startDate = startOfWeek(monthStart);
		const endDate = endOfWeek(monthEnd);
		const today = new Date().setHours(0, 0, 0, 0);
		const rows: JSX.Element[] = [];
		let day = startDate;

		while (day <= endDate) {
			const AllweekDays = Array.from({ length: 7 }).map(() => {
				const currentDay = new Date(day);
				const dayTimestamp = currentDay.setHours(0, 0, 0, 0);
				const isPastDay = dayTimestamp < today;
				const isSelected = isSameDay(currentDay, selectedDate);
				const isCurrentMonth = isSameMonth(currentDay, monthStart);
				const currentWeekday = format(currentDay, "EEEE");

				// Check recurrence highlighting
				const isRecurrence = isRecurrenceDate(currentDay);

				// Check if this day is a holiday
				const holidayForDay = holidays.find((holiday: Holiday) => {
					let holidayDate: Date;
					if (typeof holiday.date === "string") {
						const [y, m, d] = holiday.date.split("-").map(Number);
						holidayDate = new Date(y, m - 1, d);
					} else {
						holidayDate = new Date(holiday.date);
					}
					return isSameDay(holidayDate, currentDay);
				});

				const isHoliday = !!holidayForDay;
				const holidayInfo = holidayForDay ? {
					name: holidayForDay.holiday_name,
					type: holidayForDay.holiday_type,
					color: "#EF4444",
					isOptional: holidayForDay.is_optional,
					source: holidayForDay.source
				} : null;

				const showConfirmation = isHoliday && isSameDay(currentDay, holidayConfirmDate);

				const getCellStyle = () => {
					if (isHoliday && isCurrentMonth && !isPastDay) {
						return {
							backgroundColor: holidayInfo!.color,
							color: 'white'
						};
					}
					if (isSelected) {
						return {
							backgroundColor: '#3B82F6',
							color: 'white'
						};
					}
					if (isRecurrence && isCurrentMonth && !isPastDay) {
						return {
							backgroundColor: "#DBEAFE",
							color: '#1F2937'
						};
					}
					return {
						backgroundColor: "transparent",
						color: !isCurrentMonth || isPastDay ? '#9CA3AF' : '#1F2937'
					};
				};

				const cellStyle = getCellStyle();

				const cell = (
					<div key={day.toString()} className="relative group">
						{isHoliday ? (
							<Popover
								open={showConfirmation}
								onOpenChange={(open) => !open && setHolidayConfirmDate(null)}
							>
								<PopoverTrigger asChild>
									<div
										className={`w-6 h-6 m-0.5 flex items-center justify-center text-center text-[12px] font-[400] cursor-pointer rounded-full transition-all
                      ${!isCurrentMonth || isPastDay
												? "cursor-not-allowed opacity-60"
												: isSelected
													? "ring-2 ring-blue-600 ring-offset-1"
													: ""
											}`}
										style={cellStyle}
										onClick={() => {
											if (!isPastDay && isCurrentMonth)
												setHolidayConfirmDate(currentDay);
										}}
									>
										{format(currentDay, "d")}
										{isHoliday && (
											<div className="absolute -top-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap px-3 py-2 text-xs text-white bg-gray-800 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
												<div className="font-semibold">{holidayInfo!.name}</div>
												<div className="absolute bottom-[-6px] left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-l-transparent border-r-transparent border-t-[6px] border-t-gray-800" />
											</div>
										)}
									</div>
								</PopoverTrigger>

								{showConfirmation && (
									<PopoverContent className="w-72 z-50 bg-white rounded-lg shadow-xl p-4 border border-gray-200">
										<div className="space-y-3">
											<div>
												<h4 className="font-semibold text-gray-900">{holidayInfo!.name}</h4>
											</div>
											<p className="text-sm text-gray-700">
												Do you want to schedule work on this holiday?
											</p>
											<div className="flex justify-end gap-2 pt-2">
												<button
													className="px-4 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
													onClick={() => setHolidayConfirmDate(null)}
												>
													Cancel
												</button>
												<button
													className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
													onClick={() => {
														handleSetTime(currentDay, selectedTime);
														if (!isTimeVisible) setIsOpen(false);
														setHolidayConfirmDate(null);
													}}
												>
													Yes, Schedule
												</button>
											</div>
										</div>
									</PopoverContent>
								)}
							</Popover>
						) : (
							<div
								className={`w-6 h-6 m-0.5 flex items-center justify-center text-center text-[12px] font-[400] cursor-pointer rounded-full transition-all
                  ${!isCurrentMonth || isPastDay
										? "cursor-not-allowed"
										: isSelected
											? "ring-2 ring-blue-600 ring-offset-1"
											: "hover:bg-gray-100"
									}`}
								style={cellStyle}
								onClick={
									!isPastDay && isCurrentMonth
										? () => {
											handleSetTime(currentDay, selectedTime);
											if (!isTimeVisible) setIsOpen(false);
										}
										: undefined
								}
							>
								{format(currentDay, "d")}
							</div>
						)}
					</div>
				);

				day = addDays(day, 1);
				return cell;
			});

			rows.push(
				<div className="grid grid-cols-7" key={day.toString()}>
					{AllweekDays}
				</div>,
			);
		}

		return (
			<div className="rounded-[10px]">
				{isLoadingHolidays && (
					<div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-40 rounded-[10px]">
						<div className="text-sm text-gray-500">Loading holidays...</div>
					</div>
				)}
				{rows}

				{TaskType === "Recurring" && (
					<>
						<AsanaStyleDatePicker
							clearFrequency={clearFrequency}
							setClearFrequency={setClearFrequency}
							frequency={frequency}
							setFrequency={setFrequency}
							weekDays={weekDays}
							setWeekDays={setWeekDays}
							custom={custom}
							setCustom={setCustom}
							monthDay={monthDay}
							setMonthDay={setMonthDay}
							recurrenceInterval={recurrenceInterval}
							setRecurrenceInterval={setRecurrenceInterval}
							nthValue={nthValue}
							setNthValue={setNthValue}
							selectedDate={selectedDate}
							onDateSelect={handleDateSelectFromRecurrence}
						/>
					</>
				)}
			</div>
		);
	};

	React.useEffect(() => { }, [selectedDate]);

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild disabled={disabled}>
				<button
					className={cn(
						`w-full flex flex-row items-center font-normal text-[14px] justify-start bg-transparent hover:text-[#0076BD] border-none p-0 ml-3 hover:bg-transparent shadow-none`,
						selectedDate ? "md:w-[20vw] border-none p-0 bg-transparent text-black" : containerClassName,
					)}
				>
					<Calendar className="mr-2 h-4 w-4" />
					{selectedDate
						? format(selectedDate, `d MMMM${isTimeVisible ? ", h:mm a" : ""}`)
						: text || "Pick a date"}
				</button>
			</PopoverTrigger>
			<PopoverContent
				side="right"
				align="center"
				sideOffset={1}
				className={`w-[290px] rounded-[10px] transform mt-5 ${Style} -ml-40`}
			>
				{renderHeader()}
				{renderDays()}
				{renderCells()}
			</PopoverContent>
		</Popover>
	);
}
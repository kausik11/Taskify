import { useState, useEffect } from "react";
import "react-day-picker/dist/style.css";
import CombinedDropDown from "../dashboard/CombinedDropDown";
import { RotateCcw, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface AsanaStyleDatePickerProps {
	clearFrequency?: boolean;
	setClearFrequency?: React.Dispatch<React.SetStateAction<boolean>>;
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
	selectedDate?: Date;
	onDateSelect?: (date: Date) => void;
}

const AsanaStyleDatePicker: React.FC<AsanaStyleDatePickerProps> = ({
	clearFrequency,
	setClearFrequency,
	frequency,
	setFrequency,
	weekDays,
	setWeekDays,
	custom,
	setCustom,
	monthDay,
	setMonthDay,
	recurrenceInterval,
	setRecurrenceInterval,
	nthValue,
	setNthValue,
	selectedDate,
	onDateSelect,
}) => {
	const [monthlyFeature, setMonthlyFeature] = useState<"onThe" | "onDay">("onThe");

	const weekdays = [
		{ label: "S", value: "Sunday" },
		{ label: "M", value: "Monday" },
		{ label: "T", value: "Tuesday" },
		{ label: "W", value: "Wednesday" },
		{ label: "T", value: "Thursday" },
		{ label: "F", value: "Friday" },
		{ label: "S", value: "Saturday" },
	];

	// Auto-update monthDay when selectedDate changes and "onDay" is selected
	useEffect(() => {
		if (monthlyFeature === "onDay" && selectedDate && setMonthDay) {
			setMonthDay({ name: selectedDate.getDate().toString() });
		}
	}, [selectedDate, monthlyFeature, setMonthDay]);

	const toggleDay = (day: string) => {
		if (!setWeekDays) return;

		setWeekDays((prev) => {
			const currentDays = prev || [];

			if (currentDays.includes(day)) {
				return currentDays.filter((d) => d !== day);
			} else {
				// For Weekly or Custom Week, allow multiple selections
				if (
					frequency?.name === "Weekly" ||
					(frequency?.name === "Custom" && custom?.name === "Week")
				) {
					return [...currentDays, day];
				} else {
					// For Monthly "on the", only allow single selection
					return [day];
				}
			}
		});
	};

	const WeekdaySelector = ({ disabled = false }: { disabled?: boolean }) => (
		<div className="flex flex-col space-y-3">
			<label className="text-sm font-medium text-gray-700">Select Days</label>
			<div className="grid grid-cols-7 gap-2">
				{weekdays.map(({ label, value }) => {
					const isSelected = weekDays?.includes(value);
					return (
						<button
							key={value}
							type="button"
							onClick={() => !disabled && toggleDay(value)}
							disabled={disabled}
							className={`
								h-10 w-10 rounded-lg text-sm font-medium 
								transition-all duration-200 ease-in-out
								border border-gray-200
								${
						isSelected
							? "bg-blue-500 text-white border-blue-500 shadow-sm"
							: "bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300"
						}
								${
						disabled
							? "opacity-50 cursor-not-allowed"
							: "cursor-pointer hover:scale-105 active:scale-95"
						}
								focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
							`}
						>
							{label}
						</button>
					);
				})}
			</div>
			{weekDays && weekDays.length > 0 && (
				<p className="text-xs text-gray-500 text-center">
					Selected: {weekDays.join(", ")}
				</p>
			)}
		</div>
	);

	// Reset function
	const handleReset = () => {
		setFrequency?.({ name: "Weekly" });
		setWeekDays?.([]);
		setCustom?.({ name: "" });
		setMonthDay?.({ name: "" });
		setRecurrenceInterval?.({ name: "" });
		setNthValue?.({ name: "" });
		setMonthlyFeature("onThe");
		setClearFrequency?.(!clearFrequency);
	};

	return (
		<div className="p-2 mt-4 bg-white rounded-lg border border-gray-200">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
				<div className="flex items-center">
					<span className="text-sm font-medium text-gray-700">Frequency</span>
				</div>
				<CombinedDropDown
					value={frequency}
					handleSelect={(value) => setFrequency?.(value)}
					placeholder="Select frequency"
					DataType="isFrequencyData"
					className="
						w-full sm:w-auto sm:min-w-[140px]
						border border-gray-200 rounded-lg px-3 py-2 
						text-sm font-medium text-gray-700 
						hover:border-gray-300 duration-200
					"
				/>
			</div>

			{/* Weekly Configuration */}
			{frequency?.name === "Weekly" && (
				<div className="p-2 rounded-lg">
					<WeekdaySelector />
				</div>
			)}

			{/* Monthly Configuration */}
			{frequency?.name === "Monthly" && (
				<div className="p-4 rounded-lg border border-purple-200 space-y-5">
					{/* On The Option */}
					<div className="space-y-3">
						<label className="flex items-center gap-3 cursor-pointer">
							<input
								type="radio"
								name="monthlyType"
								checked={monthlyFeature === "onThe"}
								onChange={() => setMonthlyFeature("onThe")}
								className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
							/>
							<span className="text-sm font-medium text-gray-800">On the</span>
						</label>

						{monthlyFeature === "onThe" && (
							<div className="ml-7 flex flex-wrap gap-2">
								<CombinedDropDown
									value={nthValue}
									handleSelect={(value) => setNthValue?.(value)}
									placeholder="Week"
									DataType="isWeekData"
									className="
										min-w-[80px] border border-gray-300 rounded-lg px-3 py-2 
										text-sm bg-white hover:border-gray-400 
										focus:border-purple-500 transition-colors duration-200
									"
								/>
								<CombinedDropDown
									value={weekDays && weekDays.length > 0 ? { name: weekDays[0] } : null}
									handleSelect={(value) => toggleDay(value.name)}
									placeholder="Day"
									DataType="isDaysData"
									className="
										min-w-[100px] border border-gray-300 rounded-lg px-3 py-2 
										text-sm bg-white hover:border-gray-400 
										focus:border-purple-500 transition-colors duration-200
									"
								/>
							</div>
						)}
					</div>

					{/* On Day Option */}
					<div className="space-y-3">
						<label className="flex items-center gap-3 cursor-pointer">
							<input
								type="radio"
								name="monthlyType"
								checked={monthlyFeature === "onDay"}
								onChange={() => setMonthlyFeature("onDay")}
								className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
							/>
							<span className="text-sm font-medium text-gray-800">On day</span>
						</label>

						{monthlyFeature === "onDay" && (
							<div className="ml-7 space-y-2">
								<div className="
									flex items-center gap-3 
									border border-gray-300 rounded-lg px-3 py-2 
									text-sm bg-gray-50 max-w-[200px]
								">
									<CalendarIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
									<span className="text-gray-700 truncate">
										{selectedDate ? `Day ${selectedDate.getDate()}` : "No date selected"}
									</span>
								</div>
								{selectedDate && (
									<p className="text-xs text-gray-500">
										Using day from selected due date: {format(selectedDate, "d MMM yyyy")}
									</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* Custom Configuration */}
			{frequency?.name === "Custom" && (
				<div className="p-3 rounded-lg space-y-4">
					<div className="flex flex-col gap-2">
						<span className="text-sm font-medium text-gray-700">Every</span>
						<div className="flex gap-2 mt-1">
							<CombinedDropDown
								value={recurrenceInterval}
								handleSelect={(value) => setRecurrenceInterval?.(value)}
								placeholder="Interval"
								DataType="isIntervalData"
								className="
									border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white 
									hover:border-gray-300 min-w-[80px]
								"
							/>
							<CombinedDropDown
								value={custom}
								handleSelect={(value) => setCustom?.(value)}
								placeholder="Period"
								DataType="isCustomData"
								className="
									border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white 
									hover:border-gray-300 focus:border-green-500 
									transition-colors duration-200 min-w-[100px]
								"
							/>
						</div>
					</div>

					{/* Weekly Part for Custom */}
					{custom?.name === "Week" && (
						<div className="mt-4">
							<WeekdaySelector />
						</div>
					)}

					{/* Monthly Part for Custom */}
					{custom?.name === "Month" && (
						<div className="space-y-4">
							{/* On The Option */}
							<div className="space-y-3">
								<label className="flex items-center gap-3 cursor-pointer">
									<input
										type="radio"
										name="customMonthlyType"
										checked={monthlyFeature === "onThe"}
										onChange={() => setMonthlyFeature("onThe")}
										className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
									/>
									<span className="text-sm font-medium text-gray-700">On the</span>
								</label>

								{monthlyFeature === "onThe" && (
									<div className="ml-7 flex flex-wrap gap-2">
										<CombinedDropDown
											value={nthValue}
											handleSelect={(value) => setNthValue?.(value)}
											placeholder="Week"
											DataType="isWeekData"
											className="
												min-w-[80px] border border-gray-300 rounded-lg px-3 py-2 
												text-sm bg-white hover:border-gray-400 
											"
										/>
										<CombinedDropDown
											value={weekDays && weekDays.length > 0 ? { name: weekDays[0] } : null}
											handleSelect={(value) => toggleDay(value.name)}
											placeholder="Day"
											DataType="isDaysData"
											className="
												min-w-[120px] border border-gray-200 rounded-lg px-3 py-2 
												text-sm bg-white hover:border-gray-300
											"
										/>
									</div>
								)}
							</div>

							{/* On Day Option for Custom Month */}
							<div className="space-y-3">
								<label className="flex items-center gap-3 cursor-pointer">
									<input
										type="radio"
										name="customMonthlyType"
										checked={monthlyFeature === "onDay"}
										onChange={() => setMonthlyFeature("onDay")}
										className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
									/>
									<span className="text-sm font-medium text-gray-700">On day</span>
								</label>

								{monthlyFeature === "onDay" && (
									<div className="ml-7 space-y-2">
										<div className="
											flex items-center gap-3 
											border border-gray-200 rounded-lg px-3 py-2 
											text-sm bg-gray-50 max-w-[200px]
										">
											<CalendarIcon className="w-4 h-4 text-gray-500" />
											<span className="text-gray-700">
												{selectedDate ? `Day ${selectedDate.getDate()}` : "No date selected"}
											</span>
										</div>
										{selectedDate && (
											<p className="text-xs text-gray-500">
												Using day from selected due date: {format(selectedDate, "d MMM yyyy")}
											</p>
										)}
									</div>
								)}
							</div>
						</div>
					)}

					{/* Daily Part for Custom */}
					{custom?.name === "Day" && (
						<div className="p-3 rounded-lg border border-yellow-200">
							<p className="text-sm text-gray-700">
								Task will repeat every{" "}
								<span className="font-medium text-yellow-800">
									{recurrenceInterval?.name || "N"}
								</span>{" "}
								day(s).
							</p>
						</div>
					)}

					{/* Yearly Part for Custom */}
					{custom?.name === "Year" && (
						<div className="p-3 rounded-lg border border-indigo-200">
							<p className="text-sm text-gray-700">
								Task will repeat every{" "}
								<span className="font-medium text-indigo-800">
									{recurrenceInterval?.name || "N"}
								</span>{" "}
								year(s) on the selected date.
							</p>
							{selectedDate && (
								<p className="text-xs text-gray-500 mt-2">
									Selected date: {format(selectedDate, "d MMM yyyy")}
								</p>
							)}
						</div>
					)}
				</div>
			)}

			{/* Reset Button */}
			<div className="flex justify-end pt-2 border-t border-gray-100">
				<button
					onClick={handleReset}
					className="
						flex items-center gap-2 px-4 py-2 
						text-sm font-medium text-gray-600 
						hover:text-gray-900 hover:bg-gray-100 
						rounded-lg transition-all duration-200 
						focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50
					"
				>
					<RotateCcw className="w-4 h-4" />
					Reset Pattern
				</button>
			</div>
		</div>
	);
};

export default AsanaStyleDatePicker;
import React, { useContext, useEffect, useState } from "react";
import { Trash2, Calendar, AlertCircle, Clock, Plus, Info, Repeat, Users } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import SheetWrapper from "../common/SheetWrapper";
import CustomCalender from "../common/CustomCalender";
import CombinedDropDown from "../dashboard/CombinedDropDown";
import {
	useFrappeGetDocList,
	useFrappeCreateDoc,
} from "frappe-react-sdk";
import { UserContext } from "@/utils/auth/UserProvider";
import { toast } from "sonner";
import { CGBranch } from "@/types/ClapgrowApp/CGBranch";
import { CGHoliday } from "@/types/ClapgrowApp/CGHoliday";

interface HolidayFormData {
	holidays: {
		holiday_name: string;
		date?: Date | string;
		description: string;
		is_recurring: boolean;
		recurrence_type?: string;
		days_of_week?: string;
		week_occurrence?: string;
		interval_value?: number;
		start_date?: Date | string;
		end_date?: Date | string;
		applicable_for: string;
		departments?: string[];
		employees?: string[];
		is_optional: boolean;
		color: string;
	}[];
}

interface ExistingRecurringHoliday {
	name: string;
	holiday_name: string;
	recurrence_type: string;
	days_of_week?: string;
	week_occurrence?: string;
	recurrence_interval?: number;
	start_date: string;
	end_date?: string;
	color: string;
	is_active: boolean;
	auto_generated: boolean;
}

const RECURRENCE_TYPES = [
	{ value: "Weekly", label: "Weekly" },
	{ value: "Monthly", label: "Monthly" },
	{ value: "Quarterly", label: "Quarterly" },
	{ value: "Yearly", label: "Yearly" },
];

const WEEK_OCCURRENCES = [
	{ value: "Every", label: "Every" },
	{ value: "1st", label: "1st" },
	{ value: "2nd", label: "2nd" },
	{ value: "3rd", label: "3rd" },
	{ value: "4th", label: "4th" },
	{ value: "Last", label: "Last" },
];

const APPLICABILITY_OPTIONS = [
	{ value: "All Employees", label: "All Employees" },
	{ value: "Specific Departments", label: "Specific Departments" },
	{ value: "Specific Employees", label: "Specific Employees" },
];

const PRESET_COLORS = [
	"#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#F97316",
	"#EF4444", "#06B6D4", "#84CC16", "#F472B6", "#6366F1"
];

// Utility function to convert Date to local YYYY-MM-DD format
const formatLocalDate = (date: Date | string | undefined | null): string | null => {
	if (!date) return null;

	try {
		const dateObj = date instanceof Date ? date : new Date(date);
		if (isNaN(dateObj.getTime())) return null;

		// Get local date components to avoid timezone issues
		const year = dateObj.getFullYear();
		const month = String(dateObj.getMonth() + 1).padStart(2, '0');
		const day = String(dateObj.getDate()).padStart(2, '0');

		return `${year}-${month}-${day}`;
	} catch (error) {
		console.error("Error formatting date:", error);
		return null;
	}
};

// Utility function to parse date string to local Date object
const parseLocalDate = (dateString: string): Date | null => {
	if (!dateString || typeof dateString !== 'string') return null;

	try {
		// Split the date string and create a Date object using local timezone
		const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
		if (!year || !month || !day) return null;

		// Create date in local timezone (month is 0-indexed)
		return new Date(year, month - 1, day);
	} catch (error) {
		console.error("Error parsing date:", error);
		return null;
	}
};

// Fixed ordinal suffix function (handles 11-13 special case)
const getOrdinalSuffix = (n: number) => {
	const j = n % 10;
	const k = n % 100;
	if (k >= 11 && k <= 13) return "th";
	if (j === 1) return "st";
	if (j === 2) return "nd";
	if (j === 3) return "rd";
	return "th";
};

const WeekdaySelector = ({
	selectedDays,
	onChange,
	disabled = false
}: {
	selectedDays: string[],
	onChange: (days: string[]) => void,
	disabled?: boolean
}) => {
	const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

	const toggleDay = (day: string) => {
		if (disabled) return;
		const updated = selectedDays.includes(day)
			? selectedDays.filter(d => d !== day)
			: [...selectedDays, day];
		onChange(updated);
	};

	return (
		<div className="grid grid-cols-7 gap-2">
			{weekdays.map((day) => (
				<button
					key={day}
					type="button"
					disabled={disabled}
					className={`h-9 text-xs font-medium rounded-lg transition-all duration-200 ${selectedDays.includes(day)
						? "bg-blue-600 text-white shadow-sm"
						: "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
					} ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:scale-105"}`}
					onClick={() => toggleDay(day)}
				>
					{day}
				</button>
			))}
		</div>
	);
};

const ExistingRecurringHolidayCard = ({ holiday }: { holiday: ExistingRecurringHoliday }) => {
	const getIntervalText = () => {
		if (!holiday.recurrence_interval || holiday.recurrence_interval === 1) return "";
		const baseType = holiday.recurrence_type.toLowerCase().replace(/s$/, "");
		return `Every ${holiday.recurrence_interval}${getOrdinalSuffix(holiday.recurrence_interval)} ${baseType}`;
	};

	return (
		<div className="w-full max-w-[600px] bg-white border border-gray-200 rounded-lg p-3 space-y-4">
			<div className="flex flex-row items-start gap-4">
				{/* Holiday Name */}
				<div className="flex items-center gap-2 flex-[3] min-w-0 mt-4">
					<div
						className="w-2 h-2 rounded-full border-2 shrink-0"
						style={{ backgroundColor: holiday.color, borderColor: holiday.color }}
					/>
					<h6 className="font-medium text-gray-900 truncate">{holiday.holiday_name}</h6>
				</div>

				{/* Recurrence Info */}
				<div className="flex flex-col justify-center text-sm font-medium text-gray-900 flex-[1] min-w-0 mt-4">
					{holiday.recurrence_interval && holiday.recurrence_interval > 1 ? (
						<span className="text-xs text-gray-600">{getIntervalText()}</span>
					) : (
						<span className="text-xs text-gray-600">{holiday.recurrence_type}</span>
					)}
					{holiday.recurrence_type === "Monthly" && holiday.week_occurrence && (
						<span className="text-xs text-gray-600">{holiday.week_occurrence}</span>
					)}
				</div>

				{/* Weekday Selector */}
				{holiday.days_of_week && (
					<div className="flex-[4] min-w-0">
						<label className="text-xs font-medium text-gray-600 block mb-1">Selected Days</label>
						<WeekdaySelector
							selectedDays={holiday.days_of_week.split(",").filter(day => day.trim())}
							onChange={() => { }}
							disabled={true}
						/>
					</div>
				)}
			</div>
		</div>
	);
};

const ExistingRecurringHolidays = ({ holidays }: { holidays: ExistingRecurringHoliday[] }) => {
	if (holidays.length === 0) {
		return (
			<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
				<div className="flex items-center gap-2 text-blue-700">
					<Info className="w-4 h-4" />
					<span className="text-sm font-medium">No recurring holidays configured for this branch</span>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2 text-gray-700">
				<Repeat className="w-4 h-4" />
				<span className="text-sm font-semibold">Existing Recurring Holidays</span>
			</div>
			<div className="space-y-3 max-h-100 overflow-y-auto">
				{holidays.map((holiday) => (
					<ExistingRecurringHolidayCard key={holiday.name} holiday={holiday} />
				))}
			</div>
		</div>
	);
};

const AddHolidaySheet = ({ mutate }: { mutate: () => void }) => {
	const { userDetails } = useContext(UserContext);
	const { createDoc, loading } = useFrappeCreateDoc();
	const [branch, setBranch] = useState<{ name: string } | null>(null);
	const [isOpen, setIsOpen] = useState(false);
	const [existingRecurringHolidays, setExistingRecurringHolidays] = useState<ExistingRecurringHoliday[]>([]);

	const { data: branchData } = useFrappeGetDocList<CGBranch>("CG Branch", {
		fields: ["*"],
		filters: [["company_id", "=", `${userDetails?.[0]?.company_id}`]],
	});

	const { data: recurringHolidays } = useFrappeGetDocList<CGHoliday>("CG Holiday", {
		fields: ["name", "holiday_name", "recurrence_type", "days_of_week", "week_occurrence", "recurrence_interval", "start_date", "end_date", "color", "is_active", "auto_generated", "branch_id"],
		filters: [["is_recurring", "=", 1]],
	});

	// Only expose recurring holidays for the selected branch to avoid showing unrelated data
	useEffect(() => {
		if (recurringHolidays && branch) {
			const filtered = (recurringHolidays as any[])
				.filter(h => h.branch_id === branch.name)
				.map(h => ({ ...h } as ExistingRecurringHoliday));
			setExistingRecurringHolidays(filtered as ExistingRecurringHoliday[]);
		} else {
			setExistingRecurringHolidays([]);
		}
	}, [recurringHolidays, branch]);

	const selectedBranchObj = branchData?.find((b) => b.name === branch?.name);

	const { register, control, handleSubmit, watch, reset, setValue, formState: { errors } } =
		useForm<HolidayFormData>({
			defaultValues: {
				holidays: [{
					holiday_name: "",
					date: new Date(),
					description: "",
					is_recurring: false,
					applicable_for: "All Employees",
					is_optional: false,
					color: "#3B82F6",
					interval_value: 1,
				}],
			},
		});

	const { fields, append, remove } = useFieldArray({
		control,
		name: "holidays",
	});

	useEffect(() => {
		if (isOpen) {
			reset({
				holidays: [{
					holiday_name: "",
					date: new Date(),
					description: "",
					is_recurring: false,
					applicable_for: "All Employees",
					is_optional: false,
					color: "#3B82F6",
					interval_value: 1,
				}],
			});
			// Do not clear branch on open — keep user's selection
		}
	}, [isOpen, reset]);

	const addNewHoliday = () => {
		append({
			holiday_name: "",
			date: new Date(),
			description: "",
			is_recurring: false,
			applicable_for: "All Employees",
			is_optional: false,
			color: PRESET_COLORS[fields.length % PRESET_COLORS.length],
			interval_value: 1,
		});
	};

	const toggleRecurring = (index: number, isRecurring: boolean) => {
		setValue(`holidays.${index}.is_recurring`, isRecurring);
		if (isRecurring) {
			setValue(`holidays.${index}.recurrence_type`, "Weekly");
			setValue(`holidays.${index}.start_date`, new Date());
			setValue(`holidays.${index}.days_of_week`, "Sat,Sun");
			setValue(`holidays.${index}.interval_value`, 1);
		} else {
			setValue(`holidays.${index}.recurrence_type`, undefined);
			setValue(`holidays.${index}.days_of_week`, undefined);
			setValue(`holidays.${index}.start_date`, undefined);
			setValue(`holidays.${index}.end_date`, undefined);
			setValue(`holidays.${index}.interval_value`, undefined);
		}
	};

	const updateWeekdays = (index: number, days: string[]) => {
		const cleanDays = days.filter(day => day && day.trim()).map(day => day.trim());
		const daysString = cleanDays.length > 0 ? cleanDays.join(",") : "";
		setValue(`holidays.${index}.days_of_week`, daysString);
	};

	const isValidDate = (d: any) => {
		if (!d && d !== 0) return false;
		if (d instanceof Date && !isNaN(d.getTime())) return true;
		const parsed = Date.parse(String(d));
		return !isNaN(parsed);
	};

	const validateHolidayData = (holiday: any) => {
		const errors: string[] = [];

		if (!holiday.holiday_name || !String(holiday.holiday_name).trim()) {
			errors.push("Holiday name is required");
		}

		if (holiday.is_recurring) {
			if (!holiday.recurrence_type) {
				errors.push("Recurrence type is required for recurring holidays");
			}

			if (holiday.recurrence_type === "Weekly" && (!holiday.days_of_week || String(holiday.days_of_week).trim() === "")) {
				errors.push("Please select at least one day for weekly recurring holidays");
			}

			if (holiday.recurrence_type === "Monthly") {
				if (!holiday.days_of_week || String(holiday.days_of_week).trim() === "") {
					errors.push("Please select at least one day for monthly recurring holidays");
				}
				if (!holiday.week_occurrence) {
					errors.push("Week occurrence is required for monthly recurring holidays");
				}
			}

			if (!isValidDate(holiday.start_date)) {
				errors.push("Start date is required for recurring holidays");
			}
		} else {
			if (!isValidDate(holiday.date)) {
				errors.push("Holiday date is required for non-recurring holidays");
			}
		}

		return errors;
	};

	const onSubmit = async (data: HolidayFormData) => {
		if (!branch) {
			toast.error("Please select a branch to add holidays");
			return;
		}

		// Validate all holidays before submission
		const allErrors: string[] = [];
		data.holidays.forEach((holiday, index) => {
			const errors = validateHolidayData(holiday);
			if (errors.length > 0) {
				allErrors.push(`Holiday ${index + 1}: ${errors.join(", ")}`);
			}
		});

		if (allErrors.length > 0) {
			toast.error(`Please fix the following errors:\n${allErrors.join("\n")}`);
			return;
		}

		try {
			const promises = data.holidays.map(async (holiday, index) => {
				;

				const holidayData: any = {
					branch_id: branch.name,
					holiday_name: String(holiday.holiday_name).trim(),
					description: holiday.description ? String(holiday.description).trim() : "",
					is_recurring: holiday.is_recurring ? 1 : 0,
					is_optional: holiday.is_optional ? 1 : 0,
					color: holiday.color || "#3B82F6",
					applicable_for: holiday.applicable_for || "All Employees",
					is_active: 1,
					holiday_type: "Company Holiday",
				};

				if (holiday.is_recurring) {
					holidayData.recurrence_type = holiday.recurrence_type;

					if (holiday.days_of_week) {
						const cleanDays = String(holiday.days_of_week)
							.split(",")
							.map((d: string) => d.trim())
							.filter((d: string) => d.length > 0);
						holidayData.days_of_week = cleanDays.join(",");
					}

					if (holiday.week_occurrence) {
						holidayData.week_occurrence = holiday.week_occurrence;
					}

					if (holiday.interval_value && holiday.interval_value > 1) {
						holidayData.recurrence_interval = holiday.interval_value;
					}

					// Convert start_date to local YYYY-MM-DD format
					if (isValidDate(holiday.start_date)) {
						const localDateStr = formatLocalDate(holiday.start_date);
						if (localDateStr) {
							holidayData.start_date = localDateStr;
						}
					}

					// Convert end_date to local YYYY-MM-DD format
					if (holiday.end_date && isValidDate(holiday.end_date)) {
						const localDateStr = formatLocalDate(holiday.end_date);
						if (localDateStr) {
							holidayData.end_date = localDateStr;
						}
					}
				} else {
					// non-recurring -> specific holiday date
					if (isValidDate(holiday.date)) {
						const localDateStr = formatLocalDate(holiday.date);
						if (localDateStr) {
							holidayData.holiday_date = localDateStr;
						}
					}
					// optional: set start_date same as holiday_date for consistency
					if (!holidayData.start_date && holidayData.holiday_date) {
						holidayData.start_date = holidayData.holiday_date;
					}
				}

				;
				return createDoc("CG Holiday", holidayData);
			});

			const results = await Promise.all(promises);
			;

			mutate();
			setIsOpen(false);
			toast.success(`Successfully created ${data.holidays.length} holiday${data.holidays.length > 1 ? 's' : ''}!`);
			reset();
		} catch (error) {
			console.error("Error creating holidays:", error);
			toast.error("Failed to create holidays. Please check the console for details.");
		}
	};

	const watchedHolidays = watch("holidays");

	return (
		<SheetWrapper
			trigger="Add Holiday +"
			heading="Holiday Management"
			isOpenSheet={isOpen}
			setIsOpenSheet={setIsOpen}
		>
			<div className="relative h-full max-h-screen">
				{/* Scrollable Content Area */}
				<div
					className="overflow-y-auto pb-28"
					style={{
						height: 'calc(100vh - 160px)',
						minHeight: '400px'
					}}
				>
					<div className="p-6 space-y-6">
						{/* Branch Selection */}
						<div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-5 rounded-xl">
							<div className="flex items-center gap-3 mb-3">
								<span className="text-blue-900 text-sm font-semibold">Select Branch</span>
							</div>
							<CombinedDropDown
								label=""
								DataType="isBranchData"
								value={branch}
								handleSelect={(value) => setBranch(value)}
								placeholder="Choose a branch to manage holidays"
								getKey={(item) => item.name}
								renderItem={(item) => `${item?.branch_name} (${item?.name})`}
								className="w-full p-3 rounded-lg border-gray-200 bg-white"
								data={branchData || []}
							/>
							{selectedBranchObj && (
								<div className="mt-3 p-3 bg-white bg-opacity-60 rounded-lg">
									<p className="text-xs text-blue-800 font-medium">
										📍 {selectedBranchObj.branch_name} • ⏰ {selectedBranchObj.timeline}
									</p>
									{selectedBranchObj.enable_holidays === 0 && (
										<p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
											<AlertCircle className="w-3 h-3" />
											Holiday management is disabled for this branch
										</p>
									)}
								</div>
							)}
						</div>

						{/* Show existing recurring holidays when recurring is selected and branch is chosen */}
						{branch && watchedHolidays.some(h => h?.is_recurring) && (
							<div className="bg-gray-50 border border-gray-200 p-5 rounded-xl">
								<ExistingRecurringHolidays holidays={existingRecurringHolidays} />
							</div>
						)}

						{/* Holiday Configuration */}
						<div className="space-y-5">
							<div className="flex items-center justify-between">
								<h3 className="text-gray-900 text-lg font-semibold flex items-center gap-2">
									<Plus className="w-5 h-5 text-blue-600" />
									Holiday Configuration
								</h3>
							</div>

							{fields.map((field, index) => (
								<div key={field.id} className="bg-white border border-gray-200 rounded-xl p-5 space-y-5 shadow-sm">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div
												className="w-4 h-4 rounded-full border-2"
												style={{ backgroundColor: watchedHolidays[index]?.color }}
											/>
											<label className="flex items-center gap-2 cursor-pointer">
												<input
													type="checkbox"
													checked={watchedHolidays[index]?.is_recurring || false}
													onChange={(e) => toggleRecurring(index, e.target.checked)}
													className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
												/>
												<span className="text-sm font-medium text-gray-700">Recurring Pattern</span>
											</label>
										</div>
										{fields.length > 1 && (
											<button
												type="button"
												onClick={() => remove(index)}
												className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
											>
												<Trash2 className="w-4 h-4" />
											</button>
										)}
									</div>

									{/* Basic Information */}
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="space-y-2">
											<label className="text-sm font-medium text-gray-700">Holiday Name *</label>
											<input
												type="text"
												placeholder="Enter holiday name"
												className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
												{...register(`holidays.${index}.holiday_name`, {
													required: "Holiday name is required",
												})}
											/>
											{errors.holidays?.[index]?.holiday_name && (
												<p className="text-xs text-red-600 flex items-center gap-1">
													<AlertCircle className="w-3 h-3" />
													{errors.holidays[index]?.holiday_name?.message}
												</p>
											)}
										</div>

										{/* <div className="space-y-2">
											<label className="text-sm font-medium text-gray-700">Description</label>
											<input
												type="text"
												placeholder="Optional description"
												className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
												{...register(`holidays.${index}.description`)}
											/>
										</div> */}
									</div>

									{/* Date Configuration */}
									{!watchedHolidays[index]?.is_recurring ? (
										<div className="space-y-2">
											<label className="text-sm font-medium text-gray-700">Holiday Date *</label>
											<CustomCalender
												date={watchedHolidays[index]?.date}
												onChange={(value) => setValue(`holidays.${index}.date`, value as Date)}
												containerClassName="w-full border border-gray-300 rounded-lg text-sm p-3 bg-white"
												text="Select holiday date"
												isTimeVisible={false}
												TaskType=""
												Style="absolute z-50"
												frequency={{ name: "" }}
												setFrequency={() => { }}
												weekDays={[]}
												setWeekDays={() => { }}
												custom={{ name: "" }}
												setCustom={() => { }}
												monthDay={{ name: "" }}
												setMonthDay={() => { }}
												intervalWeek={{ name: "" }}
												setIntervalWeek={() => { }}
												nthValue={{ name: "" }}
												setNthValue={() => { }}
											/>
										</div>
									) : (
										<div className="space-y-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
											<h4 className="text-sm font-semibold text-purple-900 flex items-center gap-2">
												<Clock className="w-4 h-4" />
												Recurring Pattern Configuration
											</h4>

											{/* Recurrence Type, Interval and Validity */}
											<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
												<div className="space-y-2">
													<label className="text-sm font-medium text-gray-700">Recurrence Type</label>
													<select
														className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
														{...register(`holidays.${index}.recurrence_type`)}
													>
														{RECURRENCE_TYPES.map((type) => (
															<option key={type.value} value={type.value}>
																{type.label}
															</option>
														))}
													</select>
												</div>

												<div className="space-y-2">
													<label className="text-sm font-medium text-gray-700">
														Repeats Every
													</label>
													<input
														type="number"
														min={1}
														max={52}
														className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
														{...register(`holidays.${index}.interval_value`, { valueAsNumber: true })}
													/>
												</div>

												<div className="space-y-2">
													<label className="text-sm font-medium text-gray-700">Valid From</label>
													<CustomCalender
														date={watchedHolidays[index]?.start_date}
														onChange={(value) => setValue(`holidays.${index}.start_date`, value as Date)}
														containerClassName="w-full border border-gray-300 rounded-lg text-sm p-3 bg-white"
														text="Select start date"
														isTimeVisible={false}
														TaskType=""
														Style="absolute z-50"
														frequency={{ name: "" }}
														setFrequency={() => { }}
														weekDays={[]}
														setWeekDays={() => { }}
														custom={{ name: "" }}
														setCustom={() => { }}
														monthDay={{ name: "" }}
														setMonthDay={() => { }}
														intervalWeek={{ name: "" }}
														setIntervalWeek={() => { }}
														nthValue={{ name: "" }}
														setNthValue={() => { }}
													/>
												</div>
											</div>

											{/* Days of Week Selection */}
											{(watchedHolidays[index]?.recurrence_type === "Weekly" ||
												watchedHolidays[index]?.recurrence_type === "Monthly") && (
												<div className="space-y-3">
													<label className="text-sm font-medium text-gray-700">Select Days *</label>
													<WeekdaySelector
														selectedDays={watchedHolidays[index]?.days_of_week?.split(",").filter((day: string) => day.trim()) || []}
														onChange={(days) => updateWeekdays(index, days)}
													/>
													{watchedHolidays[index]?.is_recurring &&
															(!watchedHolidays[index]?.days_of_week || watchedHolidays[index]?.days_of_week?.trim() === "") && (
														<p className="text-xs text-red-600 flex items-center gap-1">
															<AlertCircle className="w-3 h-3" />
																	Please select at least one day
														</p>
													)}
												</div>
											)}

											{/* Monthly Specific Options */}
											{watchedHolidays[index]?.recurrence_type === "Monthly" && (
												<div className="space-y-2">
													<label className="text-sm font-medium text-gray-700">Week Occurrence</label>
													<select
														className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
														{...register(`holidays.${index}.week_occurrence`)}
													>
														{WEEK_OCCURRENCES.map((occurrence) => (
															<option key={occurrence.value} value={occurrence.value}>
																{occurrence.label}
															</option>
														))}
													</select>
												</div>
											)}

											{/* End Date (Optional) */}
											{/* <div className="space-y-2">
												<label className="text-sm font-medium text-gray-700">Valid Until (Optional)</label>
												<CustomCalender
													date={watchedHolidays[index]?.end_date}
													onChange={(value) => setValue(`holidays.${index}.end_date`, value as Date)}
													containerClassName="w-full border border-gray-300 rounded-lg text-sm p-3 bg-white"
													text="Select end date (leave empty for no end)"
													isTimeVisible={false}
													TaskType=""
													Style="absolute z-50"
													frequency={{ name: "" }}
													setFrequency={() => { }}
													weekDays={[]}
													setWeekDays={() => { }}
													custom={{ name: "" }}
													setCustom={() => { }}
													monthDay={{ name: "" }}
													setMonthDay={() => { }}
													intervalWeek={{ name: "" }}
													setIntervalWeek={() => { }}
													nthValue={{ name: "" }}
													setNthValue={() => { }}
												/>
											</div> */}
										</div>
									)}

									{/* Additional Options */}
									{/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="space-y-2">
											<label className="text-sm font-medium text-gray-700">Applicable For</label>
											<select
												className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
												{...register(`holidays.${index}.applicable_for`)}
											>
												{APPLICABILITY_OPTIONS.map((option) => (
													<option key={option.value} value={option.value}>
														{option.label}
													</option>
												))}
											</select>
										</div>

										<div className="space-y-2">
											<label className="text-sm font-medium text-gray-700">Holiday Color</label>
											<div className="flex items-center gap-3">
												<input
													type="color"
													className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
													{...register(`holidays.${index}.color`)}
												/>
												<div className="flex gap-2 flex-wrap">
													{PRESET_COLORS.slice(0, 5).map((color) => (
														<button
															key={color}
															type="button"
															className="w-6 h-6 rounded-full border-2 border-gray-200 hover:scale-110 transition-transform"
															style={{ backgroundColor: color }}
															onClick={() => setValue(`holidays.${index}.color`, color)}
														/>
													))}
												</div>
											</div>
										</div>
									</div> */}

									{/* Optional Holiday Checkbox */}
									{/* <div className="flex items-center gap-2">
										<input
											type="checkbox"
											id={`optional-${index}`}
											className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
											{...register(`holidays.${index}.is_optional`)}
										/>
										<label htmlFor={`optional-${index}`} className="text-sm text-gray-700">
											This is an optional holiday (employees can choose to work)
										</label>
									</div> */}
								</div>
							))}

							<button
								type="button"
								onClick={addNewHoliday}
								className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
							>
								<Plus className="w-5 h-5" />
								Add Another Holiday
							</button>
						</div>
					</div>
				</div>

				{/* Fixed Footer */}
				<div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 p-6 bg-gray-50 z-10"
					style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)' }}
				>
					<div className="flex justify-end">
						<button
							onClick={handleSubmit(onSubmit)}
							disabled={loading || !branch}
							className={`px-8 py-3 rounded-lg text-white font-medium text-sm transition-all duration-200 ${loading || !branch
								? "bg-gray-400 cursor-not-allowed"
								: "bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md"
							}`}
						>
							{loading ? "Creating..." : `Create ${fields.length} Holiday${fields.length > 1 ? 's' : ''}`}
						</button>
					</div>
				</div>
			</div>
		</SheetWrapper>
	);
};

export default AddHolidaySheet;
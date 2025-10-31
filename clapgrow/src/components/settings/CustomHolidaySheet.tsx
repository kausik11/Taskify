import React, { useState, useEffect, useContext } from "react";
import { Trash2, Clock, AlertCircle, Plus } from "lucide-react";
import CombinedDropDown from "../dashboard/CombinedDropDown";
import {
	useFrappeGetDoc,
	useFrappeGetDocList,
	useFrappeUpdateDoc,
} from "frappe-react-sdk";
import { toast } from "sonner";
import { CGBranch } from "@/types/ClapgrowApp/CGBranch";
import { UserContext } from "@/utils/auth/UserProvider";
import SheetWrapper from "../common/SheetWrapper";

interface RecurringHoliday {
	pattern_name: string;
	repeat_every: "Weekly" | "Monthly" | "Yearly";
	repeat_unit: number;
	days_of_week: string;
	week_number?: string;
}

const FREQUENCY_OPTIONS = [
	{ value: "Weekly", label: "Weekly" },
	{ value: "Monthly", label: "Monthly" },
	{ value: "Yearly", label: "Yearly" },
];

const WEEK_NUMBERS = [
	{ value: "1st", label: "1st Week" },
	{ value: "2nd", label: "2nd Week" },
	{ value: "3rd", label: "3rd Week" },
	{ value: "4th", label: "4th Week" },
	{ value: "Last", label: "Last Week" },
];

const WeekdayButton = ({
	day,
	isSelected,
	onClick,
}: {
	day: string;
	isSelected: boolean;
	onClick: (day: string) => void;
}) => (
	<button
		type="button"
		className={`flex-1 min-w-[40px] h-[36px] rounded-md text-xs font-medium transition-colors ${isSelected
			? "bg-blue-600 text-white border border-blue-600"
			: "bg-white border border-gray-300 text-gray-700 hover:border-gray-400"
		}`}
		onClick={() => onClick(day)}
	>
		{day}
	</button>
);

const RecurringHolidayBlock = ({
	holiday,
	index,
	onUpdate,
	onDelete,
	canDelete,
}: {
	holiday: RecurringHoliday;
	index: number;
	onUpdate: (index: number, holiday: RecurringHoliday) => void;
	onDelete: (index: number) => void;
	canDelete: boolean;
}) => {
	const [selectedDays, setSelectedDays] = useState<string[]>(
		holiday.days_of_week ? holiday.days_of_week.split(",") : []
	);

	const toggleDay = (day: string) => {
		const updatedDays = selectedDays.includes(day)
			? selectedDays.filter((d) => d !== day)
			: [...selectedDays, day];

		setSelectedDays(updatedDays);
		onUpdate(index, { ...holiday, days_of_week: updatedDays.join(",") });
	};

	const updateField = (field: keyof RecurringHoliday, value: any) => {
		onUpdate(index, { ...holiday, [field]: value });
	};

	return (
		<div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-gray-200 relative">
			{canDelete && (
				<button
					type="button"
					onClick={() => onDelete(index)}
					className="absolute -top-2 -right-2 bg-white border border-gray-300 rounded-full p-1 shadow-sm hover:bg-red-50 hover:border-red-300 transition-colors"
				>
					<Trash2 size={16} className="text-red-600" />
				</button>
			)}

			<div className="space-y-4">
				{/* Pattern Name */}
				<div className="space-y-2">
					<label className="text-sm font-medium text-gray-700 flex items-center gap-2">
						<Clock className="w-4 h-4" />
						Holiday Name *
					</label>
					<input
						type="text"
						value={holiday.pattern_name}
						onChange={(e) => updateField("pattern_name", e.target.value)}
						placeholder="e.g., Weekend Offs, Monthly Team Meeting"
						className="w-full p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
					/>
				</div>

				{/* Frequency and Interval */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="space-y-2">
						<label className="text-sm font-medium text-gray-700">Frequency</label>
						<select
							value={holiday.repeat_every}
							onChange={(e) => updateField("repeat_every", e.target.value as any)}
							className="w-full p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
						>
							{FREQUENCY_OPTIONS.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</div>

					<div className="space-y-2">
						<label className="text-sm font-medium text-gray-700">Every</label>
						<div className="flex items-center gap-2">
							<input
								type="number"
								value={holiday.repeat_unit}
								onChange={(e) => updateField("repeat_unit", parseInt(e.target.value) || 1)}
								className="w-20 p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
								min="1"
								max="12"
							/>
							<span className="text-sm text-gray-600">
								{holiday.repeat_every.toLowerCase().slice(0, -2)}(s)
							</span>
						</div>
					</div>
				</div>

				{/* Week Number for Monthly */}
				{holiday.repeat_every === "Monthly" && (
					<div className="space-y-2">
						<label className="text-sm font-medium text-gray-700">Week of Month</label>
						<select
							value={holiday.week_number || ""}
							onChange={(e) => updateField("week_number", e.target.value || undefined)}
							className="w-full p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
						>
							<option value="">Select week</option>
							{WEEK_NUMBERS.map((week) => (
								<option key={week.value} value={week.value}>
									{week.label}
								</option>
							))}
						</select>
					</div>
				)}

				{/* Days of Week (for Weekly and Monthly) */}
				{(holiday.repeat_every === "Weekly" || holiday.repeat_every === "Monthly") && (
					<div className="space-y-2">
						<label className="text-sm font-medium text-gray-700">Select Days</label>
						<div className="grid grid-cols-7 gap-1">
							{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
								<WeekdayButton
									key={day}
									day={day}
									isSelected={selectedDays.includes(day)}
									onClick={toggleDay}
								/>
							))}
						</div>
						{selectedDays.length === 0 && (
							<p className="text-xs text-red-600 flex items-center gap-1">
								<AlertCircle className="w-3 h-3" />
								Please select at least one day
							</p>
						)}
					</div>
				)}

				{/* Pattern Preview */}
				<div className="bg-white p-3 rounded border border-gray-200">
					<p className="text-xs text-gray-600 font-medium mb-1">Pattern Preview:
						<span className="text-xs text-gray-600"> Every {holiday.repeat_unit} {holiday.repeat_every.toLowerCase().slice(0, -2)}
							{selectedDays.length > 0 && ` on ${selectedDays.join(", ")}`}
							{holiday.week_number && ` (${holiday.week_number} week of month)`}
						</span>
					</p>
				</div>
			</div>
		</div>
	);
};

const CustomHolidaySheet = ({ mutate }: { mutate: () => void }) => {
	const { userDetails } = useContext(UserContext);
	const [holidays, setHolidays] = useState<RecurringHoliday[]>([
		{
			pattern_name: "",
			repeat_every: "Weekly",
			repeat_unit: 1,
			days_of_week: "Sat,Sun",
		},
	]);
	const [branch, setBranch] = useState<{ name: string } | null>(null);
	const [isOpen, setIsOpen] = useState(false);

	const { data: branchData } = useFrappeGetDocList<CGBranch>("CG Branch", {
		fields: ["name", "branch_name", "company_id", "timeline"],
		filters: [["company_id", "=", `${userDetails?.[0]?.company_id}`]],
	});

	const { data: branchDoc, isLoading: branchLoading } = useFrappeGetDoc<CGBranch>(
		"CG Branch",
		branch?.name || "",
		{
			fields: ["name", "holidays", "recurring_holiday", "branch_name", "company_id"],
		},
		{
			enabled: !!branch?.name,
		}
	);

	const { updateDoc, loading } = useFrappeUpdateDoc();

	useEffect(() => {
		if (isOpen) {
			setHolidays([
				{
					pattern_name: "",
					repeat_every: "Weekly",
					repeat_unit: 1,
					days_of_week: "Sat,Sun",
				},
			]);
			setBranch(null);
		}
	}, [isOpen]);

	const addHoliday = () => {
		setHolidays((prev) => [
			...prev,
			{
				pattern_name: "",
				repeat_every: "Weekly",
				repeat_unit: 1,
				days_of_week: "",
			},
		]);
	};

	const removeHoliday = (index: number) => {
		setHolidays((prev) => prev.filter((_, i) => i !== index));
	};

	const updateHoliday = (index: number, holidayData: RecurringHoliday) => {
		setHolidays((prev) =>
			prev.map((holiday, i) => (i === index ? holidayData : holiday))
		);
	};

	const validateForm = () => {
		if (!branch) {
			toast.warning("Please select a branch");
			return false;
		}

		for (const holiday of holidays) {
			if (!holiday.pattern_name.trim()) {
				toast.warning("Please provide names for all recurring patterns");
				return false;
			}

			if (holiday.repeat_every === "Monthly" && !holiday.week_number) {
				toast.warning("Week number is required for monthly patterns");
				return false;
			}

			if ((holiday.repeat_every === "Weekly" || holiday.repeat_every === "Monthly") && !holiday.days_of_week) {
				toast.warning("Please select at least one day for each pattern");
				return false;
			}
		}

		return true;
	};

	const saveHolidays = async () => {
		if (!validateForm()) return;

		try {
			const existingRecurringHolidays = branchDoc?.recurring_holiday || [];

			// Format new holidays - backend will handle date defaults
			const formattedHolidays = holidays.map((holiday) => ({
				pattern_name: holiday.pattern_name.trim(),
				repeat_every: holiday.repeat_every,
				repeat_unit: holiday.repeat_unit,
				days_of_week: holiday.days_of_week,
				week_number: holiday.week_number,
				// No start_date/end_date - let backend use sensible defaults
			}));

			const updatedRecurringHolidays = [...existingRecurringHolidays, ...formattedHolidays];

			await updateDoc("CG Branch", branch.name, {
				custom_holiday: 1,
				recurring_holiday: updatedRecurringHolidays,
				total_recurring_patterns: updatedRecurringHolidays.length,
			});

			mutate();
			setIsOpen(false);
			toast.success(`Successfully added ${holidays.length} recurring pattern(s)!`);
		} catch (error: any) {
			console.error("Error saving recurring holidays:", error);
			toast.error(`Failed to save patterns: ${error.message || "Please try again"}`);
		}
	};

	const selectedBranchObj = branchData?.find((b) => b.name === branch?.name);

	return (
		<SheetWrapper
			trigger="Add Custom +"
			heading="Recurring Holiday Patterns"
			isOpenSheet={isOpen}
			setIsOpenSheet={setIsOpen}
		>
			<div className="flex flex-col h-full">
				{/* Branch Selection */}
				<div className="bg-[#EFF6FF] p-4 rounded-lg mb-4">
					<div className="flex items-center gap-3 mb-2">
						<span className="text-[#2873a1] text-sm font-semibold">Branch Selection</span>
					</div>
					<CombinedDropDown
						label=""
						DataType="isBranchData"
						value={branch}
						handleSelect={(value) => setBranch(value)}
						placeholder="Select a branch"
						getKey={(item) => item.name}
						renderItem={(item) => `${item?.branch_name} (${item?.name})`}
						className="w-full p-2"
						data={branchData || []}
					/>
					{selectedBranchObj && (
						<p className="text-xs text-purple-700 mt-2">
							Selected: {selectedBranchObj.branch_name} • {selectedBranchObj.timeline || "No schedule set"}
						</p>
					)}
				</div>

				{/* Recurring Patterns */}
				<div className="flex-1 space-y-4">
					<div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
						{holidays.map((holiday, index) => (
							<RecurringHolidayBlock
								key={index}
								holiday={holiday}
								index={index}
								onUpdate={updateHoliday}
								onDelete={removeHoliday}
								canDelete={holidays.length > 1}
							/>
						))}
					</div>

					<button
						type="button"
						onClick={addHoliday}
						className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-purple-600 hover:border-purple-400 hover:bg-purple-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
					>
						<Plus className="w-4 h-4" />
						Add Another Recurring Pattern
					</button>
				</div>

				{/* Footer */}
				<div className="border-t border-gray-200 p-4 bg-white">
					<div className="flex items-center justify-between">
						<div className="text-xs text-gray-500">
							{branch
								? `Adding ${holidays.length} recurring pattern(s) to ${selectedBranchObj?.branch_name}`
								: "Select a branch to continue"
							}
						</div>
						<button
							onClick={saveHolidays}
							disabled={loading || branchLoading || !branch}
							className={`px-6 py-2 rounded-md text-white font-medium text-sm transition-colors ${loading || branchLoading || !branch
								? "bg-gray-400 cursor-not-allowed"
								: "bg-purple-600 hover:bg-purple-700"
							}`}
						>
							{loading || branchLoading ? "Saving..." : `Save ${holidays.length} Pattern(s)`}
						</button>
					</div>
				</div>
			</div>
		</SheetWrapper>
	);
};

export default CustomHolidaySheet;
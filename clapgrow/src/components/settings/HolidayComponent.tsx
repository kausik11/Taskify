import { ChevronDown } from "lucide-react";
import AddHolidaySheet from "./AddHolidaySheet";
import CustomHolidaySheet from "./CustomHolidaySheet";
import HolidayTable from "./HolidayTable";
import { useContext, useEffect, useState, useMemo } from "react";
import { UserContext } from "@/utils/auth/UserProvider";
import ImportDialog from "../common/ImportDialog";
import { useFrappeGetDocCount, useFrappeGetDocList } from "frappe-react-sdk";
import { CGBranch } from "@/types/ClapgrowApp/CGBranch";
import { CGHoliday } from "@/types/ClapgrowApp/CGHoliday";

interface Holiday {
	name: string;
	date: string;
	description?: string;
}

interface RecurringHoliday {
	repeat: string;
	unit: number;
	day: string;
	week_number?: string;
}

interface CityHolidays {
	city: string;
	holidays: Holiday[];
	recurringHolidays: RecurringHoliday[];
}

const HolidayComponent = () => {
	const { userDetails, rolePermissions, companyDetails } = useContext(UserContext);

	const companyId = useMemo(() => {
		return companyDetails && companyDetails.length > 0
			? companyDetails[0].name
			: userDetails?.[0]?.company_id;
	}, [companyDetails, userDetails]);

	const { data: branchData, mutate: mutateBranches } = useFrappeGetDocList<CGBranch>(
		"CG Branch",
		{
			fields: ["*"],
			filters: [["company_id", "=", companyId]],
		},
	);

	const {data:totalHolidayCount} = useFrappeGetDocCount("CG Holiday"
		
	);
    console.log("totalHolidayCount",totalHolidayCount);
	// Move holiday data fetching to parent component
	const { data: holidayData, mutate: mutateHolidays, isLoading: holidaysLoading } = useFrappeGetDocList<CGHoliday>("CG Holiday", {
		fields: ["*"],
		filters: [
			["branch_id", "in", branchData?.map(b => b.name) || []]
		],
		limit: totalHolidayCount,
	});

	const [cityHolidays, setCityHolidays] = useState<CityHolidays[]>([]);

	useEffect(() => {
		const fetchBranchHolidayData = async () => {
			if (!branchData) return;

			const results = await Promise.all(
				branchData.map(async (branch) => {
					try {
						const res = await fetch(`/api/resource/CG Branch/${branch.name}`);
						const json = await res.json();
						const holidays =
							json?.data?.holidays?.map((h: any) => ({
								name: h.holiday_name,
								date: h.date,
								description: h.description,
							})) || [];

						const recurringHolidays =
							json?.data?.recurring_holiday?.map((h: any) => ({
								repeat: h.repeat_every,
								unit: h.repeat_unit,
								day: h.days_of_week,
								week_number: h.week_number,
							})) || [];

						return {
							city: json.data.branch_name,
							holidays,
							recurringHolidays,
						};
					} catch (error) {
						console.error("Failed to fetch branch holidays", error);
						return null;
					}
				}),
			);

			const validResults = results.filter(
				(item): item is CityHolidays => item !== null,
			);
			setCityHolidays(validResults);
		};

		fetchBranchHolidayData();
	}, [branchData, mutateBranches]);

	// Check if user has permission to create holidays
	const canCreateHolidays = rolePermissions?.holiday_create === 1;

	// Create a combined mutate function that refreshes both branches and holidays
	const handleMutate = () => {
		mutateBranches();
		mutateHolidays();
	};

	return (
		<div className="w-full bg-white px-[16px]">
			<div className="flex flex-row items-center px-[5px] justify-between mt-3 mb-10">
				<span className="text-[#2D2C37] font-[600] text-[16px]">Holidays</span>

				{canCreateHolidays && (
					<div className="flex flex-row items-center gap-x-3">
						<ImportDialog name={"Holiday"} />
						<AddHolidaySheet mutate={handleMutate} />
					</div>
				)}
			</div>
			<div className="mt-4">
				<HolidayTable
					cities={cityHolidays}
					holidayData={holidayData}
					branchData={branchData}
					holidaysLoading={holidaysLoading}
					mutateHolidays={mutateHolidays}
				/>
			</div>
		</div>
	);
};

export default HolidayComponent;
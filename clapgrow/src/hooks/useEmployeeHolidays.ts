import { useContext, useEffect, useState } from "react";
import { FrappeConfig, FrappeContext } from "frappe-react-sdk";

interface Holiday {
  date: string;
  holiday_name: string;
  holiday_type: string;
  source: string;
  is_optional: boolean;
  color: string;
  day_name: string;
}

interface UseEmployeeHolidays {
  holidays: Holiday[];
  isLoadingHolidays: boolean;
  error: Error | null;
}

export const useEmployeeHolidays = (
	month: number, 
	year: number, 
	employeeId?: string
): UseEmployeeHolidays => {
	const { call } = useContext(FrappeContext) as FrappeConfig;
	const [holidays, setHolidays] = useState<Holiday[]>([]);
	const [isLoadingHolidays, setIsLoadingHolidays] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		const fetchHolidays = async () => {
			setIsLoadingHolidays(true);
			setError(null);
			try {
				const requestBody: any = {
					month: month + 1, // JavaScript months are 0-based
					year,
				};

				if (employeeId) {
					requestBody.employee_id = employeeId;
				}

				const response = await call.post(
					"clapgrow_app.api.holidays.get_employee_holidays_by_month",
					requestBody
				);

				// Handle both wrapped and unwrapped responses
				let responseData;
				if (response.message) {
					// Frappe-wrapped response
					responseData = response.message;
				} else {
					// Direct response
					responseData = response;
				}

				console.log("API Response:", responseData); // Debug log

				if (responseData && responseData.success) {
					setHolidays(responseData.holidays || []);
				} else {
					const errorMessage = responseData?.message || "Failed to fetch holidays: Invalid response structure";
					throw new Error(errorMessage);
				}
			} catch (err) {
				console.error("Error fetching holidays:", err);
				setError(err instanceof Error ? err : new Error("Unknown error occurred"));
				setHolidays([]);
			} finally {
				setIsLoadingHolidays(false);
			}
		};

		fetchHolidays();
	}, [call, month, year, employeeId]);

	return { holidays, isLoadingHolidays, error };
};
// hooks/useFrappeAPI.ts
import { useState, useCallback } from 'react';

interface FrappeAPIOptions {
  method: string;
  args?: Record<string, any>;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

interface FrappeAPIResponse<T = any> {
  message?: T;
  exc?: string;
  _server_messages?: string;
}

export const useFrappeAPI = () => {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Get CSRF token from cookie or meta tag
	const getCSRFToken = (): string => {
		// Try meta tag first
		const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
		if (metaToken) return metaToken;

		// Try cookie
		const cookieToken = document.cookie
			.split('; ')
			.find(row => row.startsWith('csrf_token='))
			?.split('=')[1];
    
		return cookieToken || '';
	};

	const call = useCallback(async <T = any>(options: FrappeAPIOptions): Promise<T | null> => {
		setLoading(true);
		setError(null);

		try {
			const response = await fetch(`/api/method/${options.method}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Frappe-CSRF-Token': getCSRFToken(),
				},
				body: JSON.stringify(options.args || {}),
			});

			const data: FrappeAPIResponse<T> = await response.json();

			if (data.exc || data._server_messages) {
				const errorMessage = data.exc || 'Server error occurred';
				setError(errorMessage);
				options.onError?.(errorMessage);
				return null;
			}

			options.onSuccess?.(data.message);
			return data.message || null;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
			setError(errorMessage);
			options.onError?.(err);
			return null;
		} finally {
			setLoading(false);
		}
	}, []);

	return {
		call,
		loading,
		error,
	};
};

// Specific hook for holiday API
export const useEmployeeHolidays = () => {
	const [holidays, setHolidays] = useState<any[]>([]);
	const { call, loading, error } = useFrappeAPI();

	const fetchHolidaysByMonth = async (month: number, year: number) => {
		const result = await call({
			method: 'clapgrow_app.api.holidays.get_employee_holidays_by_month',
			args: { month, year },
			onSuccess: (data) => {
				if (data?.success && data?.holidays) {
					setHolidays(data.holidays);
				}
			},
		});
		return result;
	};

	const fetchHolidaysByDateRange = async (fromDate: string, toDate: string) => {
		const result = await call({
			method: 'clapgrow_app.api.holidays.get_employee_holidays',
			args: { from_date: fromDate, to_date: toDate },
			onSuccess: (data) => {
				if (data?.success && data?.holidays) {
					setHolidays(data.holidays);
				}
			},
		});
		return result;
	};

	const refreshHolidays = async () => {
		const result = await call({
			method: 'clapgrow_app.api.holidays.refresh_employee_holidays',
			args: {},
		});
		return result;
	};

	return {
		holidays,
		fetchHolidaysByMonth,
		fetchHolidaysByDateRange,
		refreshHolidays,
		loading,
		error,
	};
};
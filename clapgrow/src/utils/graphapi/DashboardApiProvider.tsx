import React, { createContext, useContext } from "react";
import { addDays, format, isBefore, isEqual, parseISO } from "date-fns";
import { FrappeConfig, FrappeContext } from "frappe-react-sdk";

interface DashboardContextProps {
  fetchDashboardTasksCompletedGraph: (
    trend: string,
  ) => Promise<{ completionStatus: any } | null>;
}

const DashboardGraphContext = createContext<DashboardContextProps | undefined>(
	undefined,
);

export const DashboardGraphProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
	const { call } = useContext(FrappeContext) as FrappeConfig;

	const fetchDashboardTasksCompletedGraph = async (
		trend: string,
	): Promise<{ completionStatus: any } | null> => {
		try {
			const response = await call.post(
				`clapgrow_app.api.insights.member_insights.completed_task_insights`,
				{ trend },
			);
			if (response.message?.[1] === 200) {
				const data = response?.message?.[0]?.data;
				const { completed, on_time, start_date, end_date } = data;
				// Generate dates between start_date and end_date
				const dates = [];
				let currentDate = parseISO(start_date);
				const finalDate = parseISO(end_date);
				while (
					isBefore(currentDate, finalDate) ||
          isEqual(currentDate, finalDate)
				) {
					dates.push(format(currentDate, "yyyy-MM-dd"));
					currentDate = addDays(currentDate, 1);
				}
				return {
					completionStatus: { completed, on_time, dates },
				};
			} else {
				console.error("Unexpected response structure:", response);
				return null;
			}
		} catch (error) {
			console.error("Error fetching tasks:", error);
			return null;
		}
	};

	return (
		<DashboardGraphContext.Provider
			value={{
				fetchDashboardTasksCompletedGraph,
			}}
		>
			{children}
		</DashboardGraphContext.Provider>
	);
};

export const useDashboardGraphContext = (): DashboardContextProps => {
	const context = useContext(DashboardGraphContext);
	if (!context) {
		throw new Error(
			"useSmartInsightContext must be used within a DashboardGraphProvider",
		);
	}
	return context;
};

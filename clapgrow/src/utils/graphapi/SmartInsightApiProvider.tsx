import React, { createContext, useContext } from "react";
import { addDays, format, isBefore, isEqual, parseISO } from "date-fns";
import { FrappeConfig, FrappeContext } from "frappe-react-sdk";

interface OverAllInsightContextProps {
  fetchOverAllInsightGraph: (
    selectedTrend: string,
    branch: {
      branch_name: string;
    } | null,
    currentPage: number,
    recordsPerPage: number,
  ) => Promise<{
    task_statistics: any;
    performance_of_completed_tasks: any;
    task_completed_graph: any;
    department_data_counts: any;
    task_breakdown_counts: any;
    totalRecords: number;
  } | null>;

  fetchRecurringTaskGraph: (
    trend: string,
  ) => Promise<{ recurringTask: any; taskStatus: any[] } | null>;
  fetchMemberInsightGraph: (
    email: string,
    trend: string,
  ) => Promise<{
    completionStatus: any;
    taskStatusCounts: any;
    dates: any;
  } | null>;
}

const OverAllInsightsContext = createContext<
  OverAllInsightContextProps | undefined
>(undefined);

export const OverAllInsightsProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
	const { call } = useContext(FrappeContext) as FrappeConfig;

	const fetchOverAllInsightGraph = async (
		selectedTrend: string,
		branch: {
      branch_name: string;
    } | null,
		currentPage: number,
		recordsPerPage: number,
	): Promise<{
    task_statistics: any;
    performance_of_completed_tasks: any;
    task_completed_graph: any;
    department_data_counts: any;
    task_breakdown_counts: any;
    totalRecords: number;
  } | null> => {
		try {
			const response = await call.post(
				`clapgrow_app.api.insights.overall_insights.overall_insights?page=${currentPage}&page_size=${recordsPerPage}`,
				{
					trend: selectedTrend,
					branch: branch?.branch_name,
				},
			);

			if (response.message?.[1] === 200) {
				return {
					totalRecords: response.message?.[0]?.data?.data?.total_count || 0,
					task_statistics: response.message?.[0]?.data?.task_statistics || {},
					performance_of_completed_tasks:
            response.message?.[0]?.data?.performance_of_completed_tasks || {},
					task_completed_graph:
            response.message?.[0]?.data?.task_completed_graph || {},
					department_data_counts:
            response.message?.[0]?.data?.data?.department_data_counts || {},
					task_breakdown_counts:
            response.message?.[0]?.data?.task_breakdown_counts || {},
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

	const fetchRecurringTaskGraph = async (
		trend: string,
	): Promise<{ recurringTask: any; taskStatus: any } | null> => {
		try {
			const response = await call.post(
				`clapgrow_app.api.insights.recurring_insights.recurring_task_insights`,
				{
					params: { trend },
				},
			);

			if (response.message?.[1] === 200) {
				return {
					recurringTask:
            response.message?.[0]?.data?.recurring_task_status || [],
					taskStatus: response.message?.[0]?.data.aggregated_data,
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

	const fetchMemberInsightGraph = async (
		email: string,
		trend: string,
	): Promise<{
    completionStatus: any;
    taskStatusCounts: any;
    dates: any;
  } | null> => {
		try {
			const response = await call.post(
				`clapgrow_app.api.insights.member_insights.user_task_statistics`,
				{
					trend,
					user_email: email,
				},
			);
			if (response.message?.[1] === 200) {
				const datesValue = response?.message?.[0]?.data;
				const { start_date, end_date } = datesValue;
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
					completionStatus: response.message?.[0]?.data?.completion_stats || [],
					taskStatusCounts: response.message?.[0]?.data.task_status_counts,
					dates: dates,
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
		<OverAllInsightsContext.Provider
			value={{
				fetchOverAllInsightGraph,
				fetchRecurringTaskGraph,
				fetchMemberInsightGraph,
			}}
		>
			{children}
		</OverAllInsightsContext.Provider>
	);
};

export const useSmartInsightGrapghContext = (): OverAllInsightContextProps => {
	const context = useContext(OverAllInsightsContext);
	if (!context) {
		throw new Error(
			"useSmartInsightContext must be used within a OverAllInsightsProvider",
		);
	}
	return context;
};

import React, { createContext, useContext } from "react";
import { FrappeConfig, FrappeContext } from "frappe-react-sdk";
import { TaskInsight } from "@/components/common/CommonTypes";
import { UserContext } from "@/utils/auth/UserProvider";

interface SmartInsightContextProps {
  fetchMemberInsight: (
    currentPage: number,
    recordsPerPage: number,
    filters: Record<string, any>,
  ) => Promise<{ insights: any[]; totalRecords: number } | null>;
  fetchMisScore: (
    currentPage: number,
    recordsPerPage: number,
    payload: any,
  ) => Promise<{ misscore: any[]; totalRecords: number } | null>;
  fetchMemberDetails: (
    email: string,
    currentPage: number,
    recordsPerPage: number,
  ) => Promise<{
    memberTasksDetails: any;
    memberTasksDetailsTable: any;
    totalRecords: any;
  } | null>;
  fetchRecurringTask: (
    currentPage: number,
    recordsPerPage: number,
    filters?: Record<string, any>,
  ) => Promise<{ recurringTask: TaskInsight[]; totalRecords: number } | null>;
}

const SmartInsightsContext = createContext<
  SmartInsightContextProps | undefined
>(undefined);

export const SmartInsightsProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const { call } = useContext(FrappeContext) as FrappeConfig;
	const { companyDetails } = useContext(UserContext);

	const companyId =
    companyDetails && companyDetails.length > 0 ? companyDetails?.[0]?.name : null;

	const fetchMemberInsight = async (
		currentPage: number,
		recordsPerPage: number,
		filters: Record<string, any>,
	): Promise<{ insights: any[]; totalRecords: number } | null> => {
		try {
			const requestFilters = JSON.stringify({
				...filters,
				currentPage,
				recordsPerPage,
			});
			const response = await call.get(
				`frappe.desk.query_report.run?report_name=${encodeURIComponent("Member Insights Table")}` +
          `&filters=${encodeURIComponent(requestFilters)}` +
          `&ignore_prepared_report=false&are_default_filters=true`,
			);
			const { result = [] } = response?.message || {};
			return {
				insights: result,
				totalRecords: result.length,
			};
		} catch (error) {
			console.error("Error fetching member insights:", error);
			return null;
		}
	};

	const fetchMisScore = async (
		currentPage: number,
		recordsPerPage: number,
		payload: any[],
	): Promise<{ misscore: any[]; totalRecords: number } | null> => {
		try {
			const response = await call.post(
				`clapgrow_app.api.insights.member_insights.generate_task_insights?page=${currentPage}&page_size=${recordsPerPage}`,
				payload,
			);
			if (response.message?.[1] === 200) {
				return {
					misscore: response.message?.[0]?.data?.insights || [],
					totalRecords: response.message?.[0]?.data.total_count,
				};
			} else {
				console.error("Unexpected response structure:", response.data);
				return null;
			}
		} catch (error) {
			console.error("Error fetching tasks:", error);
			return null;
		}
	};

	const fetchMemberDetails = async (
		email: string,
		currentPage: number,
		recordsPerPage: number,
	): Promise<{
    memberTasksDetails: any;
    memberTasksDetailsTable: any;
    totalRecords: any;
  } | null> => {
		try {
			const response = await call.post(
				`clapgrow_app.api.insights.member_insights.get_user_tasks?page=${currentPage}&page_size=${recordsPerPage}`,
				{ user_email: email },
			);
			if (response?.message?.[1] === 200) {
				return {
					memberTasksDetails: response.message?.[0]?.data?.user_details || [],
					memberTasksDetailsTable:
            response.message?.[0]?.data?.user_details?.tasks || [],
					totalRecords:
            response.message?.[0]?.data?.user_details?.task_counts || [],
				};
			} else {
				console.error("Unexpected response structure:", response.data);
				return null;
			}
		} catch (error) {
			console.error("Error fetching tasks:", error);
			return null;
		}
	};

	const fetchRecurringTask = async (
		currentPage: number,
		recordsPerPage: number,
		filters: Record<string, any> = {},
	): Promise<{ recurringTask: TaskInsight[]; totalRecords: number } | null> => {
		try {
			const appliedFilters: Record<string, any> = {};
			if (companyId) {
				appliedFilters.company_id = companyId;
			} else {
				throw new Error("No company ID available; Please select a company.");
			}

			// Process and clean filters
			Object.entries(filters).forEach(([key, value]) => {
				// Skip empty, null, undefined, or "All" values
				if (value && value !== "All" && value !== "" && 
				    !(Array.isArray(value) && value.length === 0)) {
					
					// Handle array values (for assigned_to, assignee, tags)
					if (Array.isArray(value)) {
						if (value.length > 0) {
							appliedFilters[key] = value;
						}
					} else {
						appliedFilters[key] = value;
					}
				}
			});

			// console.log("Sending filters to recurring task report:", appliedFilters);

			const response = await call.post(`frappe.desk.query_report.run`, {
				report_name: "Recurring Table Report",
				filters: appliedFilters,
			});

			const message = response?.message;
			if (message && Array.isArray(message.result)) {
				const mappedTasks = message.result.map((task: any) => ({
					recurring_task_id: task.recurring_task_id,
					recurring_tasks: task.recurring_tasks,
					frequency: task.frequency,
					// Map assigned_to details
					assigned_to: {
						email: task.assigned_to_email || "",
						full_name: task.assigned_to_full_name || "",
						first_name: task.assigned_to_first_name || "",
						last_name: task.assigned_to_last_name || "",
						user_image: task.assigned_to_user_image || null,
					},
					// Map assignee details
					assignee: {
						email: task.assignee_email || "",
						full_name: task.assignee_full_name || "",
						first_name: task.assignee_first_name || "",
						last_name: task.assignee_last_name || "",
						user_image: task.assignee_user_image || null,
					},
					on_time_percent:
            typeof task.on_time_percent === "object"
            	? task.on_time_percent.parsedValue
            	: task.on_time_percent,
					completion_score:
            typeof task.completion_score === "object"
            	? task.completion_score.parsedValue
            	: task.completion_score,
					priority: task.priority,
				}));

				return {
					recurringTask: mappedTasks,
					totalRecords: message.result.length,
				};
			} else {
				console.error("Unexpected response structure:", response);
				return null;
			}
		} catch (error) {
			console.error("Error fetching recurring tasks:", error);
			return null;
		}
	};

	return (
		<SmartInsightsContext.Provider
			value={{
				fetchMemberInsight,
				fetchMisScore,
				fetchMemberDetails,
				fetchRecurringTask,
			}}
		>
			{children}
		</SmartInsightsContext.Provider>
	);
};

export const useSmartInsightContext = (): SmartInsightContextProps => {
	const context = useContext(SmartInsightsContext);
	if (!context) {
		throw new Error(
			"useSmartInsightContext must be used within a SmartInsightsProvider",
		);
	}
	return context;
};
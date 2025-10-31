import React, { createContext, useContext, useState } from "react";
import { toast } from "sonner";
import { customToast } from "@/components/common/CustomToastMessage";
import { FrappeConfig, FrappeContext } from "frappe-react-sdk";
interface TaskContextProps {
  TaskUpdateAPI: (
    name: string,
    formData: any,
    task: string,
  ) => Promise<boolean>;
  fetchTasks: (
    currentPage: number,
    recordsPerPage: number,
  ) => Promise<{ tasks: any[]; totalRecords: number } | null>;
  FilteredTasks: (
    payload: any,
  ) => Promise<{ tasks: any[]; totalRecords: number } | null>;
  CreateTaskAPI: (formData: FormData) => Promise<boolean>;
  tablerefreshKeys: number;
  updateRefreshKey: () => void;
}
const TaskContext = createContext<TaskContextProps | undefined>(undefined);

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [refresh, setRefresh] = useState(false);
	const [tablerefreshKeys, settableRefreshKey] = useState<number>(0);

	const { call } = useContext(FrappeContext) as FrappeConfig;

	const fetchTasks = async (
		currentPage: number,
		recordsPerPage: number,
	): Promise<{ tasks: any[]; totalRecords: number } | null> => {
		try {
			const response = await call.get(
				`clapgrow_app.api.tasks.fetch_task.fetch_task?page=${currentPage}&page_size=${recordsPerPage}`,
			);

			if (response?.data.message?.[1] === 200) {
				return {
					tasks: response?.data.message?.[0]?.data.tasks || [],
					totalRecords: response.data.message?.[0]?.data.total_count,
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
	const TaskUpdateAPI = async (
		name: string,
		formData: any,
		task: string,
	): Promise<boolean> => {
		let updateData: any;

		if (task === "completed") {
			updateData = new FormData();
			updateData.append(
				"data",
				JSON.stringify({
					is_completed: 1,
				}),
			);
		} else {
			updateData = formData;
		}
		// Convert FormData to a JSON object
		const formDataObj: Record<string, any> = {};

		updateData.forEach((value: any, key: any) => {
			formDataObj[key] = value;
		});

		try {
			const response = await call.put(
				"clapgrow_app.api.tasks.update_tasks.update_task",
				{ name: name, data: formDataObj.data },
			);

			if (response?.message?.[0]?.status === "success") {
				toast.success(response?.message?.[0]?.message);
				setRefresh((prev) => !prev);
				await fetchTasks(1, 10);
				return true;
			} else if (response?.message?.[0]?.status === "error") {
				toast.warning(response?.message?.[0]?.errors.details);
				return false;
			}
			return false;
		} catch (error: any) {
			console.error("Unexpected error:", error);

			if (error.response?.data?.message?.[0]?.errors?.details) {
				toast.error(error.response.data.message[0].errors.details);
			} else {
				toast.error("An unexpected error occurred.");
			}
			return false;
		}
	};
	const FilteredTasks = async (
		payload: Record<string, any>,
	): Promise<{ tasks: any[]; totalRecords: number } | null> => {
		try {
			const response = await call.post(
				"clapgrow_app.api.tasks.fetch_task.fetch_filtered_tasks",
				payload,
			);

			if (response?.message?.[1] === 200) {
				return {
					tasks: response?.message?.[0]?.data?.tasks || [],
					totalRecords: response?.message?.[0]?.data?.total_count || 0,
				};
			} else {
				console.error("Unexpected response structure:", response);
				return null;
			}
		} catch (error) {
			console.error("Error fetching filtered tasks:", error);
			return null;
		}
	};

	const CreateTaskAPI = async (formData: FormData): Promise<boolean> => {
		try {
			// Convert FormData to a JSON object
			const formDataObj: Record<string, any> = {};
			formData.forEach((value, key) => {
				formDataObj[key] = value;
			});

			const response = await call.post(
				"clapgrow_app.api.tasks.create_task.create_task",
				formDataObj, // Sending JSON instead of FormData
			);

			if (
				response.message?.[1] === 201 &&
        response.message?.[0].status === "success"
			) {
				toast.success(response.message?.[0]?.message, { duration: 1000 });
				setRefresh((prev) => !prev);

				const payload = {
					task_type: [],
					status: [],
					priority: [],
					assignee: [],
					assigned_to: [],
					dept: null,
					branch: null,
					_user_tags: [],
					search: "",
					from_date: null,
					to_date: null,
				};

				await FilteredTasks(payload);
				return true;
			} else {
				toast.error(response.message?.[0]?.message);
				return false;
			}
		} catch (error: any) {
			console.error("Error creating task:", error);
			let errorMessage = "An error occurred while creating the task.";

			if (error.response?.data?.message?.[0]?.message) {
				errorMessage = error.response.data.message[0].message;
			}

			customToast.warning(errorMessage);
			return false;
		}
	};

	const updateRefreshKey = () => {
		settableRefreshKey(prev => prev + 1);
	};

	return (
		<TaskContext.Provider
			value={{ TaskUpdateAPI, fetchTasks, FilteredTasks, CreateTaskAPI,tablerefreshKeys,updateRefreshKey }}
		>
			{children}
		</TaskContext.Provider>
	);
};

export const useTaskContext = (): TaskContextProps => {
	const context = useContext(TaskContext);
	if (!context) {
		throw new Error("useTaskContext must be used within a TaskProvider");
	}
	return context;
};

import TrendSelector from "@/components/common/TrendSelector";
import CombinedDropDown from "@/components/dashboard/CombinedDropDown";
import PerformanceDashboard from "@/components/details/Performance";
import TaskBreakdownTable from "@/components/details/TaskBreakdown";
import TaskCompletionGraphCard from "@/components/details/TaskCompletionGraphCard";
import DepartmentPerformanceTable from "@/components/details/TaskPerformanceTable";
import TaskStatistics from "@/components/details/TaskStatsComponent";
import { useSmartInsightGrapghContext } from "@/utils/graphapi/SmartInsightApiProvider";
import { useEffect, useState } from "react";

type TaskStatisticsType = {
  total_task: number;
  completed: number;
  not_completed: number;
  on_time: number;
  delayed: number;
  on_time_performance: string;
  including_delay_performance: string;
  tags_performance: number;
  completed_tasks: string[];
  on_time_tasks: string[];
  start_date: string;
  end_date: string;
};

type PerformanceMetrics = {
  complete_tasks: number;
  "increase_%": number;
  "performance_%": number;
  remaining_tasks: number;
  total: number;
};

type PerformanceOfCompletedTasks = {
  including_delay_performance: PerformanceMetrics;
  on_time_performance: PerformanceMetrics;
};
type TaskCompletedGraph = {
  completed_tasks: [];
  on_time_tasks: [];
};

type taskBreakdownCounts = {
  help_tickets: number;
  onetime_tasks: number;
  process: number;
  recurring_tasks: number;
};
const DetailsContainer = () => {
	const [branch, setBranch] = useState<{ branch_name: string } | null>(null);
	const [selectedTrend, setSelectedTrend] = useState<string>("Weekly");
	const [currentPage, setCurrentPage] = useState(1);
	const recordsPerPage = 4;

	const { fetchOverAllInsightGraph } = useSmartInsightGrapghContext();

	const [fetchSmartValue, setFetchSmartValue] = useState({
		totalRecords: 0,
		task_statistics: {} as TaskStatisticsType,
		performance_of_completed_tasks: {} as PerformanceOfCompletedTasks,
		task_completed_graph: {} as TaskCompletedGraph,
		department_data_counts: [] as any[],
		task_breakdown_counts: {} as taskBreakdownCounts,
	});

	useEffect(() => {
		const OverAllInsightList = async () => {
			try {
				const result = await fetchOverAllInsightGraph(
					selectedTrend,
					branch,
					currentPage,
					recordsPerPage,
				);
				if (result) {
					setFetchSmartValue({
						totalRecords: result.totalRecords || 0,
						task_statistics: result.task_statistics || {},
						performance_of_completed_tasks:
              result.performance_of_completed_tasks || {},
						task_completed_graph: result.task_completed_graph || [],
						department_data_counts: result.department_data_counts || [],
						task_breakdown_counts: result.task_breakdown_counts || [],
					});
				}
			} catch (error) {
				console.error("Error fetching tasks:", error);
			}
		};

		OverAllInsightList();
	}, [selectedTrend, branch, currentPage, recordsPerPage]);

	return (
		<section className="w-full h-full mb-10">
			<header className="flex flex-col md:flex-row items-center mt-2 justify-between w-full max-md:gap-2">
				<h1 className="font-semibold text-lg text-gray-900">Report</h1>
				<div className="flex items-center gap-4">
					<TrendSelector
						value={selectedTrend}
						onChange={setSelectedTrend}
						pageName="OverAll"
					/>
					<CombinedDropDown
						className="bg-white border-none text-gray-700"
						DataType="isBranchData"
						value={branch}
						handleSelect={setBranch}
						placeholder="Select Branch"
						getKey={(item) => item.name}
						renderItem={(item) => item?.name}
					/>
				</div>
			</header>

			<TaskStatistics fetchSmartValue={fetchSmartValue.task_statistics} />
			<div className="flex flex-col lg:flex-row lg:gap-6">
				<PerformanceDashboard
					performance_of_completed_tasks={
						fetchSmartValue.performance_of_completed_tasks
					}
				/>
				<TaskCompletionGraphCard
					isTableOpen={false}
					task_completed_graph={fetchSmartValue.task_completed_graph}
				/>
			</div>
			<div className="flex flex-col lg:flex-row lg:gap-6 pb-10">
				<DepartmentPerformanceTable
					department_data_counts={fetchSmartValue?.department_data_counts}
					totalRecords={fetchSmartValue?.totalRecords}
					currentPage={currentPage}
					setCurrentPage={setCurrentPage}
					recordsPerPage={recordsPerPage}
				/>
				<TaskBreakdownTable
					task_breakdown_counts={fetchSmartValue?.task_breakdown_counts}
				/>
			</div>
		</section>
	);
};

export default DetailsContainer;

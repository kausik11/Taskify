import { ChevronUp } from "lucide-react";
import { useState } from "react";
import { Cell, Pie, PieChart, Tooltip } from "recharts";
import Tabs from "../settings/Tabs";

type PerformanceMetrics = {
  complete_tasks: number;
  "increase_%": number;
  "performance_%": number;
  remaining_tasks: number;
  total: number;
};

interface PerformanceOfCompletedTasks {
  including_delay_performance: PerformanceMetrics;
  on_time_performance: PerformanceMetrics;
}

interface PerformanceTaskProps {
  performance_of_completed_tasks: PerformanceOfCompletedTasks;
}

const PerformanceDashboard: React.FC<PerformanceTaskProps> = ({
	performance_of_completed_tasks,
}) => {
	const COLORS = ["#10B981", "#E5E7EB"];

	const [selectedTab, setSelectedTab] = useState("onTime");

	// Determine data based on selected tab
	const selectedData =
    selectedTab === "onTime"
    	? performance_of_completed_tasks.on_time_performance
    	: performance_of_completed_tasks.including_delay_performance;

	const taskPercentage = selectedData?.["increase_%"] ?? 0;
	const percentageIncrease = selectedData?.["performance_%"] ?? 0;

	const completeTasks = selectedData?.complete_tasks;
	const remainingTasks = selectedData?.remaining_tasks;
	const totalTasks = selectedData?.total;

	const data = [
		{ name: "Completed", value: completeTasks },
		{ name: "Remaining", value: remainingTasks },
	];

	const CustomTooltip = ({ active, payload }: any) => {
		if (active && payload && payload.length && payload[0].value !== 1) {
			return (
				<div className="bg-white p-2 rounded shadow" style={{ zIndex: 1000 }}>
					<p className="text-sm">{`${payload[0].name}: ${payload[0].value}`}</p>
				</div>
			);
		}
		return null;
	};

	return (
		<div className="bg-white p-6 mt-6 rounded-[16px] w-sm">
			<h2 className="text-[18px] mb-4 text-gray-700">
        Performance of Completed Tasks
			</h2>

			<div className="flex flex-col w-full pb-8">
				<div className="flex flex-row w-full items-center justify-between gap-x-4 px-[16px]">
					<Tabs
						title="On Time"
						value="onTime"
						selectedTab={selectedTab}
						changeSelectedTab={setSelectedTab}
					/>
					<Tabs
						title="Including Delay"
						value="includingDelay"
						selectedTab={selectedTab}
						changeSelectedTab={setSelectedTab}
					/>
				</div>
				<div
					className="flex flex-1 border-[1px] rounded-[2px] mt-[4px]"
					style={{ borderColor: "#F0F1F2" }}
				/>
			</div>

			<div className="flex items-center px-5 justify-between mb-4">
				<div>
					<span className="text-4xl font-bold text-gray-700">
						{percentageIncrease}%
					</span>
					<div className="flex items-center text-green-500">
						<ChevronUp size={20} />
						<span className="ml-1">{taskPercentage}%</span>
					</div>
				</div>

				<div className="relative mt-6">
					<PieChart width={140} height={140}>
						<Pie
							data={data}
							cx={60}
							cy={60}
							innerRadius={40}
							outerRadius={60}
							fill="#8884d8"
							paddingAngle={0}
							dataKey="value"
							startAngle={90}
							endAngle={-270}
						>
							{data.map((_, index: number) => (
								<Cell
									key={`cell-${index}`}
									fill={COLORS[index % COLORS.length]}
								/>
							))}
						</Pie>
						<Tooltip
							content={<CustomTooltip />}
							wrapperStyle={{ zIndex: 1000 }}
						/>
					</PieChart>
					<div className="absolute top-16 left-16 transform -translate-x-1/2 -translate-y-1/2 text-center">
						<span className="text-xl font-semibold text-green-500">
							{totalTasks}
						</span>
						<p className="text-xs text-gray-500">Total</p>
					</div>
				</div>
			</div>
		</div>
	);
};

export default PerformanceDashboard;

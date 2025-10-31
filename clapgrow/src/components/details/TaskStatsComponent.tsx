import Tick from "@/assets/icons/Tick.svg";
import TotalTasks from "@/assets/icons/TotalTasks.svg";
import clock from "@/assets/icons/clocktasks.svg";
import clockyellow from "@/assets/icons/clockyellow.svg";
import cross from "@/assets/icons/cross.svg";

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

type StatCardProps = {
  icon: string | any; // Fix for SVG imports
  value: number;
  label: string;
  color: string;
};

interface TaskStatisticsProps {
  fetchSmartValue: TaskStatisticsType; // Ensure this is an arra
}

const StatCard = ({ icon, value, label, color }: StatCardProps) => (
	<div className="flex items-center space-x-16 md:space-x-4 p-4">
		<div className={`p-3 rounded-full ${color}`}>
			<img src={icon} alt={label} className="w-6 h-6" />
		</div>
		<div>
			<p className="text-[18px] text-[#4B465C] font-semibold">{value}</p>
			<p className="text-[#4B465C] text-[16px]">{label}</p>
		</div>
	</div>
);

const TaskStatistics: React.FC<TaskStatisticsProps> = ({ fetchSmartValue }) => {
	const stats = [
		{
			icon: TotalTasks,
			value: fetchSmartValue?.total_task ?? 0,
			label: "Total Task",
			color: "bg-blue-100",
		},
		{
			icon: Tick,
			value: fetchSmartValue?.completed ?? 0,
			label: "Completed",
			color: "bg-green-100",
		},
		{
			icon: cross,
			value: fetchSmartValue?.not_completed ?? 0,
			label: "Not Completed",
			color: "bg-red-100",
		},
		{
			icon: clock,
			value: fetchSmartValue?.on_time ?? 0,
			label: "On Time",
			color: "bg-indigo-100",
		},
		{
			icon: clockyellow,
			value: fetchSmartValue?.delayed ?? 0,
			label: "Delayed",
			color: "bg-yellow-100",
		},
	];

	return (
		<div className="p-6 bg-white mt-6 rounded-[16px]">
			<div className="flex justify-between items-center mb-6">
				<h2 className="text-xl text-[#2D2C37] font-medium">Task Statistics</h2>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
				{stats.map((stat, index) => (
					<StatCard key={index} {...stat} />
				))}
			</div>
		</div>
	);
};

export default TaskStatistics;

import { MoveUpRight } from "lucide-react";
import { Cell, Pie, PieChart, Tooltip } from "recharts";

interface TaskCompleteGraphValueProps {
  graphValue: { color: string; label: string; value: any }[];
  completedPercentage: { completed_percentage: number; total_Task: number };
}
const TaskStatusChart: React.FC<TaskCompleteGraphValueProps> = ({
	graphValue,
	completedPercentage,
}) => {

	const CustomTooltip = ({ payload }: any) => {
		return (
			<div className="bg-gray-800 p-3 rounded shadow">
				<p className="text-sm text-white">{`${payload?.[0]?.payload?.payload?.label}: ${payload[0]?.value}`}</p>
			</div>
		);
	};
	const COLORS = ["#9397F6", "#0CA866", "#E0BF10", "#D72727"];
	return (
		<div className="py-5 px-3 rounded-[16px] bg-white size-full border h-[340px]">
			<div className="flex flex-col md:flex-row gap-y-3 md:items-center justify-between">
				<h1 className="text-[14px] font-[600]">Tasks Completed</h1>
			</div>

			<div className="flex items-center justify-center gap-2 bg-[#EEFDF1] w-full py-1.5 rounded-xl text-[#5B5967] text-[12px] mt-3">
				<MoveUpRight
					className="text-emerald-500 p-1 rounded-full bg-[#D0F2D7]"
					size={23}
				/>
				<span className="font-[600] text-emerald-500">Up 4 %</span>
				<span className="text-[#5B5967] font-[400]">from previous week</span>
			</div>
			<div className="flex flex-col  gap-y-3 items-center justify-between gap-8 mt-3">
				<div className="relative">
					<PieChart width={120} height={125}>
						<Pie
							data={[{ value: 1 }]}
							cx={55}
							cy={60}
							innerRadius={48}
							outerRadius={58}
							startAngle={-90}
							endAngle={270}
							fill="#F0F0F0"
							paddingAngle={1}
							dataKey="value"
							stroke="#F0F0F0"
							strokeWidth={1}
							isAnimationActive={false}
						/>
						<Pie
							data={graphValue}
							cx={55}
							cy={60}
							innerRadius={45}
							cornerRadius={40}
							outerRadius={55}
							startAngle={-90}
							endAngle={270}
							fill="#F0F0F0"
							paddingAngle={1}
							dataKey="value"
						>
							{graphValue.map((_, index: number) => (
								<Cell
									key={`cell-${index}`}
									fill={COLORS[index % COLORS.length]}
									stroke="none"
								/>
							))}
						</Pie>
						<Tooltip
							content={<CustomTooltip />}
							wrapperStyle={{ zIndex: 1000 }}
						/>
					</PieChart>
					<div className="absolute top-[4rem] left-[3.9rem] -translate-x-1/2 -translate-y-1/2 text-center text-[#2D2C37]">
						<p className="font-[600] text-[16px]">
							{completedPercentage.completed_percentage.toFixed()}%
						</p>
						<p className="font-[400] text-[12px] ">Completed</p>
					</div>
				</div>
				<div className="space-y-[6px]">
					{graphValue?.map((item, index) => (
						<div key={index} className={`flex items-center gap-2`}>
							<div className={`${item.color} size-2 rounded-full`} />
							<p className="font-[600] text-[12px] text-[#5B5967]">
								{item.value}/{completedPercentage.total_Task}
							</p>
							<p className="text-[#5B5967] font-[400] text-[12px]">
								{item.label}
							</p>
						</div>
					))}
					{/* <div className="flex items-center gap-2 max-md:hidden">
            <div className="bg-[#9397F6] size-2 rounded-full" />
            <p className="font-[600] text-[12px] text-[#5B5967]">6/52</p>
            <p className="text-[#5B5967] font-[400] text-[12px]">Completed</p>
          </div> */}
				</div>
			</div>
		</div>
	);
};

export default TaskStatusChart;

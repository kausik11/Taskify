import { MoveUpRight } from "lucide-react";
import { Cell, Pie, PieChart } from "recharts";

const NotApprovedChart = () => {
	const data = [{ name: "Section 1", value: 23 }];
	const COLORS = ["#2D2C37"];
	return (
		<div className="py-5 px-3 rounded-[16px] bg-white size-full border h-[340px] opacity-50 cursor-not-allowed">
			<div className="flex flex-col md:flex-row gap-y-3 md:items-center justify-between">
				<h1 className="text-[14px] font-[600]">Tasks Not Approved</h1>
			</div>
			<span className="text-red-500 font-semibold text-[12px]">
        (Coming Soon)
			</span>

			<div className="flex items-center justify-center gap-2 bg-[#EEFDF1] w-full py-1.5 rounded-xl text-[#5B5967] text-[12px] mt-3">
				<MoveUpRight
					className="text-emerald-500 p-1 rounded-full bg-[#D0F2D7]"
					size={23}
				/>
				<span className="font-[600] text-emerald-500">Up 4 %</span>
				<span className="text-[#5B5967] font-[400]">from previous week</span>
			</div>

			<div className="flex flex-col gap-y-3 items-center justify-between gap-8 mt-3">
				<div className="relative">
					<PieChart width={150} height={150}>
						<Pie
							data={[{ value: 100 }]}
							cx={80}
							cy={80}
							innerRadius={50}
							outerRadius={60}
							startAngle={-90}
							endAngle={270}
							fill="#F0F0F0"
							paddingAngle={1}
							dataKey="value"
							stroke="#F0F0F0"
							isAnimationActive={false}
						/>
						<Pie
							data={data}
							cx={80}
							cy={80}
							innerRadius={50}
							cornerRadius={50}
							outerRadius={60}
							startAngle={-90}
							endAngle={-90 + 360 * (45 / 100)}
							fill="#F0F0F0"
							paddingAngle={1}
							dataKey="value"
						>
							{data.map((_, index: number) => (
								<Cell
									key={`cell-${index}`}
									fill={COLORS[index % COLORS.length]}
									stroke="none"
								/>
							))}
						</Pie>
					</PieChart>
					<div className="absolute bottom-[30%] left-[30%] text-center text-[#2D2C37]">
						<p className="font-[600] text-[16px]">23%</p>
						<p className="font-[400] text-[12px]">Not Approved</p>
					</div>
				</div>

				<div className="space-y-[6px]">
					<div className="flex items-center gap-2">
						<div className="bg-black size-2 rounded-full" />
						<p className="font-[600] text-[12px] text-[#5B5967]">12/23</p>
						<p className="text-[#5B5967] font-[400] text-[12px]">
              Not Approved
						</p>
					</div>
				</div>
			</div>
		</div>
	);
};

export default NotApprovedChart;

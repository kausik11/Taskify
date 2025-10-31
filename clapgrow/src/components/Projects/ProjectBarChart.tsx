import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	Rectangle,
	ResponsiveContainer,
} from "recharts";

const data = [
	{
		name: "Project name 1",
		pv: 2400,
		amt: 2400,
		heightValue: 10,
	},
	{
		name: "Project name 2",
		uv: 3000,
		pv: 1398,
		amt: 2210,
		heightValue: 20,
	},
	{
		name: "Project name 3",
		uv: 2000,
		pv: 9800,
		amt: 2290,
		heightValue: 15,
	},
];

const ProjectBarChart = () => {
	//function to truncate the project name
	const TruncatedTick = ({ x, y, payload }) => {
		const name = payload.value;
		const word = name.split(" ");
		const firstWord = word[0];
		const secondword = word[1];
		const displayName =
      secondword.length > 2 ? `${secondword.slice(0, 4)}...` : secondword;

		return (
			<g transform={`translate(${x},${y})`}>
				<text x={0} y={10} dy={16} textAnchor="end" fill="#444" width="20px">
					<tspan x={25} dy={2} fontSize="12px" fontWeight="400" fill="#ACABB2">
						{firstWord}
					</tspan>
					<tspan x={28} dy={14} fontSize="12px" fontWeight="400" fill="#ACABB2">
						{displayName}
					</tspan>
				</text>
			</g>
		);
	};

	return (
		<div className="p-5 rounded-[16px] bg-white size-full md:col-span-2 border-[1px] border-gray-300">
			<div className="flex items-center justify-between">
				<h1 className="text-[14px] font-[600] my-2">
          Overdue Tasks by Projects
				</h1>
			</div>
			<ResponsiveContainer width={"100%"} height={300}>
				<BarChart
					data={data}
					margin={{
						top: 5,
						right: 30,
						left: 20,
						bottom: 5,
					}}
				>
          //how the lines start with some space from the left
					<CartesianGrid stroke="#ccc" vertical={false} />
					<XAxis dataKey="name" interval={0} tick={<TruncatedTick />} />
					<YAxis
						domain={[0, "dataMax + 5"]}
						ticks={[0, 5, 10, 15, 20, 25]}
						tickMargin={20}
						tickLine={false}
						color="#ACABB2"
						label={{
							value: "No. of Tasks",
							angle: -90,
							position: "insideLeft",
							style: {
								fontSize: 12,
								fontWeight: 400,
							},
							dy: 30,
							dx: -15,
							fill: "#ACABB2",
						}}
					/>
					<Bar
						dataKey="heightValue"
						fill="#0076BD"
						stackId="a"
						barSize={15}
						radius={[10, 10, 0, 0]}
						// background={{ fill: "#0076BD" }}
					/>
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
};

export default ProjectBarChart;

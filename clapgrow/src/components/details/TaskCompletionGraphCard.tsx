import Chart from "react-apexcharts";

type TaskCompletedGraph = {
  completed_tasks: [];
  on_time_tasks: [];
};
type TaskCompletedGraphProps = {
  isTableOpen: boolean;
  task_completed_graph: TaskCompletedGraph;
};
const TaskCompletionGraphCard: React.FC<TaskCompletedGraphProps> = ({
	isTableOpen,
	task_completed_graph,
}) => {
	const chartOptions = {
		series: [
			{
				name: "Completed",
				data: task_completed_graph?.completed_tasks ?? [], // Ensure fallback to an empty array
			},
			{
				name: "On time",
				data: task_completed_graph?.on_time_tasks ?? [], // Ensure fallback to an empty array
			},
		],
		options: {
			chart: {
				height: 350,
				type: "area",
				toolbar: {
					show: false,
				},
				animations: {
					enabled: false,
				},
				zoom: {
					enabled: false,
				},
				sparkline: {
					enabled: false,
				},
			},
			colors: ["#0CA866", "#038EE2"],
			dataLabels: {
				enabled: false,
			},
			stroke: {
				curve: "smooth",
				width: 1,
			},
			grid: {
				show: false,
			},
			markers: {
				size: 4,
			},
			xaxis: {
				type: "datetime",
				categories: [
					"2018-09-19T00:00:00.000Z",
					"2018-09-20T00:00:00.000Z",
					"2018-09-21T00:00:00.000Z",
					"2018-09-22T00:00:00.000Z",
					"2018-09-23T00:00:00.000Z",
					"2018-09-24T00:00:00.000Z",
					"2018-09-25T00:00:00.000Z",
				],
				axisBorder: {
					show: true,
					color: "#ACABB2",
				},
				axisTicks: {
					show: true,
					color: "#ACABB2",
				},
				labels: {
					style: {
						colors: "#ACABB2",
					},
					format: "dd MMM",
				},
			},
			yaxis: {
				show: true,
				title: {
					text: "Tasks Completed (%)",
					style: {
						color: "#ACABB2",
						fontSize: "12px",
						fontWeight: 400,
					},
				},

				labels: {
					formatter: function (value: number) {
						return value;
					},
					style: {
						colors: "#ACABB2",
					},
				},
				axisBorder: {
					show: true,
					color: "#ACABB2",
				},
				axisTicks: {
					show: true,
					color: "#ACABB2",
				},
			},
			tooltip: {
				x: {
					format: "dd MMM",
				},
			},
			legend: {
				show: false,
			},
		},
	};
	return (
		<div className="pt-5 px-5 mt-6 rounded-[16px] bg-white size-full md:col-span-2">
			<div className="flex items-center justify-between">
				<h1 className="text-[14px] font-[600]">Tasks Completed (%)</h1>
				<div className="flex flex-row items-center gap-x-3">
					<div className="flex items-center gap-1 text-[10px] text-[#5B5967]">
						<div className="bg-[#0CA866] size-2 rounded-full" />
            Completed
					</div>
					<div className="flex items-center gap-1 text-[10px] text-[#5B5967]">
						<div className="bg-[#038EE2] size-2 rounded-full" />
            On time
					</div>
				</div>
			</div>
			{!isTableOpen && (
				<Chart
					options={chartOptions.options as any}
					series={chartOptions.series}
					type="area"
					height="280"
				/>
			)}
		</div>
	);
};

export default TaskCompletionGraphCard;

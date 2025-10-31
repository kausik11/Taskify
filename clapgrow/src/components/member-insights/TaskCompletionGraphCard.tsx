import { Calendar, ChevronDown } from "lucide-react";
import Chart from "react-apexcharts";

interface GraphValueProps {
  graphValue: {
    completed_tasks: number[];
    on_time_tasks: number[];
    dates: string;
  };
}
const TaskCompletionGraphCard: React.FC<GraphValueProps> = ({ graphValue }) => {
	const chartOptions = {
		series: [
			{
				name: "Completed",
				data: graphValue.completed_tasks ?? [],
			},
			{
				name: "On time",
				data: graphValue.on_time_tasks ?? [],
			},
		],
		options: {
			chart: {
				height: 350,
				type: "area",
				toolbar: { show: false },
				animations: { enabled: false },
				zoom: { enabled: false },
				sparkline: { enabled: false },
			},
			colors: ["#0CA866", "#038EE2"],
			dataLabels: { enabled: false },
			stroke: { curve: "smooth", width: 1 },
			grid: { show: false },
			markers: { size: 4 },
			xaxis: {
				type: "datetime",
				categories: graphValue.dates,
				axisBorder: { show: true, color: "#ACABB2" },
				axisTicks: { show: true, color: "#ACABB2" },
				labels: {
					style: { colors: "#ACABB2" },
					format: "dd MMM",
				},
			},
			yaxis: {
				show: true,
				title: {
					text: "Tasks Completed (%)",
					style: { color: "#ACABB2", fontSize: "12px", fontWeight: 400 },
				},
				labels: {
					formatter: (value: number) => {
						return Number.isInteger(value) ? value.toString() : "";
					},
					style: { colors: "#ACABB2" },
				},
				axisBorder: { show: true, color: "#ACABB2" },
				axisTicks: { show: true, color: "#ACABB2" },
				tickAmount: 5, // Ensure only two ticks (0 and 5)
				min: 0, // Minimum value on the y-axis
				max: 100, // Maximum value on the y-axis
				forceNiceScale: false, // Avoid intermediate ticks
			},
			tooltip: {
				custom: function ({ series, seriesIndex, dataPointIndex, w }: any) {
					const date = new Date(w.config.xaxis.categories[dataPointIndex]);
					const formattedDate = date.toLocaleDateString("en-US", {
						day: "numeric",
						month: "short",
						year: "numeric",
					});

					// Determine the series name
					const seriesName =
            seriesIndex === 0
            	? "% of Tasks Completed"
            	: "% of Tasks Completed on Time";

					return `<div class="custom-tooltip" style="
            background: #2D2C37;
            border-radius: 8px;
            padding: 12px;
            color: white;
            font-family: system-ui, sans-serif;
          ">
            <div style="
              font-size: 14px;
              font-weight: 600;
              margin-bottom: 4px;
            ">
              ${Math.round(series[seriesIndex][dataPointIndex])}${seriesName}
            </div>
            <div style="
              color: #ACABB2;
              font-size: 12px;
              font-weight:400;
            ">
              ${formattedDate}
            </div>
          </div>`;
				},
				marker: { show: false },
				fixed: { enabled: true, position: "topRight", offsetY: 10 },
				intersect: false,
				shared: false,
			},
			legend: { show: false },
		},
	};

	return (
		<div className="py-5 px-3 rounded-[16px] bg-white size-full md:col-span-2 border h-[340px]">
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
					{/* <div className="flex items-center gap-1 text-[10px] text-[#5B5967] bg-[#F3F4F6] py-[5px] px-[6px] rounded-[10px] w-fit">
            <Calendar className="w-[15px] h-[15px]" />
            This weeks Trend
            <ChevronDown className="w-[15px] h-[15px]" />
          </div> */}
				</div>
			</div>
			<Chart
				options={chartOptions.options as any}
				series={chartOptions.series}
				type="area"
				height={280}
			/>
		</div>
	);
};
export default TaskCompletionGraphCard;

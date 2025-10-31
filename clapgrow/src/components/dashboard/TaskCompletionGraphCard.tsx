import { useContext, useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import TrendSelector from "../common/TrendSelector";
import { FrappeConfig, FrappeContext } from "frappe-react-sdk";

interface TaskCompletionGraphCardProps {
  isTableOpen: boolean;
}
interface GraphData {
  completed: number[];
  on_time: number[];
  dates: string[];
}
interface TaskEntry {
  date: string;
  completed: number;
  on_time: number;
}

export default function TaskCompletionGraphCard({
	isTableOpen,
}: TaskCompletionGraphCardProps) {
	const { call } = useContext(FrappeContext) as FrappeConfig;
	const [trendsGraph, setTrendsGraph] = useState<string>("This Week");
	const [graphData, setGraphData] = useState<GraphData>({
		completed: [],
		on_time: [],
		dates: [],
	});
	const [loading, setLoading] = useState<boolean>(false);


	useEffect(() => {
		(async () => {
			try {
				setLoading(true);
				const response = await call.post(
					"clapgrow_app.api.insights.member_insights.completed_task_insights",
					{ trend: trendsGraph },
				);
              console.log("response",response)
				if (response?.message?.[0]?.status === "success") {
					const result = response.message[0].data.result as TaskEntry[];

					const dates = result.map((entry) => entry.date);
					const completed = result.map((entry) => entry.completed);
					const on_time = result.map((entry) => entry.on_time);

					setGraphData({ completed, on_time, dates });
				} else {
					console.error(
						"Error in response status:",
						response?.message?.[0]?.status,
					);
				}
			} catch (error) {
				console.error("Error fetching tasks:", error);
			} finally {
				setLoading(false);
			}
		})();
	}, [trendsGraph, isTableOpen]);

	const chartOptions = useMemo(
		() => ({
			series: [
				{
					name: "Completed",
					data: graphData.completed,
				},
				{
					name: "On time",
					data: graphData.on_time,
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
					categories: graphData.dates,
					axisBorder: { show: true, color: "#ACABB2" },
					axisTicks: { show: true, color: "#ACABB2" },
					labels: {
						style: { colors: "#ACABB2" },
						format: trendsGraph === "Last 30 Days" ? "MMM dd" : "dd MMM",
						datetimeFormatter: {
							year: "yyyy",
							month: trendsGraph === "Last 30 Days" ? "MMM" : "MMM dd",
							day: trendsGraph === "Last 30 Days" ? "MMM dd" : "dd MMM",
						},
					},
				},
				yaxis: {
					show: true,
					title: {
						text: "Tasks Completed (%)",
						style: { color: "#ACABB2", fontSize: "12px", fontWeight: 400 },
					},
					labels: {
						formatter: (value: number) =>
							Number.isInteger(value) ? `${value}` : "",
						style: { colors: "#ACABB2" },
					},
					axisBorder: { show: true, color: "#ACABB2" },
					axisTicks: { show: true, color: "#ACABB2" },
					tickAmount: 5,
					min: 0,
					max: 100,
					forceNiceScale: false,
				},
				tooltip: {
					shared: false,
					custom: function ({ series, seriesIndex, dataPointIndex, w }: any) {
						const date = new Date(w.config.xaxis.categories[dataPointIndex]);
						const formattedDate =
              trendsGraph === "Last 30 Days"
              	? `Week of ${date.toLocaleDateString("en-US", {
              		day: "numeric",
              		month: "short",
              		year: "numeric",
              	})}`
              	: date.toLocaleDateString("en-US", {
              		day: "numeric",
              		month: "short",
              		year: "numeric",
              	});

						const currentValue = series[seriesIndex][dataPointIndex];
						const otherSeriesIndex = seriesIndex === 0 ? 1 : 0;
						const otherValue = series[otherSeriesIndex][dataPointIndex];

						const showBoth = currentValue === otherValue;

						let tooltipHtml = "";

						if (showBoth) {
							[0, 1].forEach((idx) => {
								const value = Math.round(series[idx][dataPointIndex]);
								const name =
                  w.config.series[idx].name === "Completed"
                  	? " of Tasks Completed"
                  	: " of Tasks Completed On Time";
								const color = w.config.colors[idx];

								tooltipHtml += `
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                  <div style="background: ${color}; width: 10px; height: 10px; border-radius: 2px;"></div>
                  <div style="font-size: 14px; font-weight: 600;">
                    ${value}% ${name}
                  </div>
                </div>
              `;
							});
						} else {
							const value = Math.round(currentValue);
							const name =
                w.config.series[seriesIndex].name === "Completed"
                	? " of Tasks Completed"
                	: " of Tasks Completed On Time";
							const color = w.config.colors[seriesIndex];

							tooltipHtml += `
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <div style="background: ${color}; width: 10px; height: 10px; border-radius: 2px;"></div>
                <div style="font-size: 14px; font-weight: 600;">
                  ${value}% ${name}
                </div>
              </div>
            `;
						}

						return `
            <div class="custom-tooltip" style="
              background: #2D2C37;
              border-radius: 8px;
              padding: 12px;
              color: white;
              font-family: system-ui, sans-serif;
            ">
              ${tooltipHtml}
              <div style="
                color: #ACABB2;
                font-size: 12px;
                font-weight:400;
                margin-top: 8px;
              ">
                ${formattedDate}
              </div>
            </div>`;
					},
					marker: { show: false },
					fixed: { enabled: true, position: "topRight", offsetY: 10 },
					intersect: true,
				},
				legend: { show: false },
			},
		}),
		[graphData, trendsGraph],
	);

	return isTableOpen ? null : (
		<div className="p-7 rounded-[16px] bg-white min-h-[305px] md:col-span-2">
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
					<TrendSelector
						value={trendsGraph}
						onChange={setTrendsGraph}
						pageName=""
					/>
				</div>
			</div>

			{loading ? (
				<p className="text-center text-sm text-gray-400 py-10">Loading...</p>
			) : graphData.completed.length === 0 ? (
				<p className="text-center text-sm text-gray-400 py-10">
          No data available for the selected trend.
				</p>
			) : (
				<Chart
					options={chartOptions.options as any}
					series={chartOptions.series}
					type="area"
					height="100%"
				/>
			)}
		</div>
	);
}

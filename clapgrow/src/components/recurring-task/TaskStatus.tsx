import { useContext, useEffect, useMemo, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import TrendSelector from "../common/TrendSelector";
import { FrappeConfig, FrappeContext } from "frappe-react-sdk";
import { UserContext } from "@/utils/auth/UserProvider";

export default function TaskStatus(props: { isTableOpen: boolean }) {
	const { call } = useContext(FrappeContext) as FrappeConfig;
	const { companyDetails } = useContext(UserContext);
	const [trendsGraph, setTrendsGraph] = useState<string>("This Week");
	const [data, setData] = useState<any[]>([]);

	const companyId = useMemo(() => {
		return companyDetails && companyDetails.length > 0
			? companyDetails[0].name
			: null;
	}, [companyDetails]);

	useEffect(() => {
		const fetchTasks = async () => {
			try {
				const filters: { trend: string; company_id?: string } = {
					trend: trendsGraph,
				};

				// Determine bar positioning based on data length
				if (companyId) {
					filters.company_id = companyId;
				} else {
					throw new Error("No company ID available; please select a company.");
				}

				const response = await call.post(`frappe.desk.query_report.run`, {
					report_name: "Recurring Task Status Graph",
					filters,
				});

				const resultData = response.message.result || [];
				setData(resultData);
			} catch (error) {
				console.error("Error fetching tasks:", error);
				setData([]);
			}
		};

		fetchTasks();
	}, [trendsGraph, companyId, call]);

	const CustomTick = (props: any) => {
		const { x, y, payload } = props;
		const maxLength = 3; // Set the maximum length for department names
		const text = payload.value.split(" ")[0]; // Take only the first word

		const truncatedText = text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
		return (
			<text x={x} y={y + 10} textAnchor="middle" fill="#ACABB2" fontSize={12}>
				{/* {truncatedText.map((line: string, index: number) => (
					<tspan key={index} x={x} dy={index * 14}>
						{line}
					</tspan>
				))} */}
				<tspan x={x} dy={0}>
				{truncatedText}
			</tspan>
			</text>
		);
	};

	const CustomTooltip = ({ active, payload, label }: any) => {
		if (active && payload && payload.length) {
			const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);

			const statusLabels: Record<string, string> = {
				completed: "Completed",
				due_today: "Due Today",
				upcoming: "Upcoming",
				overdue: "Overdue"
			};

			return (
				<div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg max-w-[250px] min-w-[180px]">
					<p className="font-semibold text-gray-800 mb-2 text-sm break-words">{`${label}`}</p>
					<div className="space-y-1.5">
						{payload
							.filter((entry: any) => entry.value > 0)
							.map((entry: any, index: number) => (
								<div key={index} className="flex items-center justify-between gap-3">
									<div className="flex items-center gap-2 min-w-0 flex-1">
										<div
											className="w-3 h-3 rounded-full flex-shrink-0"
											style={{ backgroundColor: entry.color }}
										/>
										<span className="text-xs text-gray-600 truncate">
											{statusLabels[entry.dataKey] || entry.dataKey}
										</span>
									</div>
									<span className="text-xs font-medium text-gray-800 flex-shrink-0">
										{entry.value}
									</span>
								</div>
							))}
					</div>
					{total > 0 && (
						<div className="border-t border-gray-200 mt-2 pt-2">
							<div className="flex items-center justify-between">
								<span className="text-xs font-semibold text-gray-800">Total:</span>
								<span className="text-xs font-bold text-gray-900">{total}</span>
							</div>
						</div>
					)}
				</div>
			);
		}
		return null;
	};
	const barCategoryGap = data.length < 5 ? 20 : "20%";

	return (
		<div className="p-5 rounded-[16px] bg-white size-full md:col-span-2 border-[1px] border-gray-300">
			<div className="flex items-center justify-between">
				<h1 className="font-[600] font-inter text-[16px] leading-[100%] tracking-[0]">Recurring Tasks Status</h1>

				<div className="flex justify-end items-center gap-x-4">
					<div className="md:flex flex-row hidden items-center gap-x-2">
						<div className="flex items-center gap-1 text-[10px] text-[#5B5967]">
							<div className="bg-[#0CA866] size-2 rounded-full font-inter font-normal text-[12px] leading-[100%] tracking-[0]" />
							Completed
						</div>
						<div className="flex items-center gap-1 text-[10px] text-[#5B5967]">
							<div className="bg-[#E0BF10] size-2 rounded-full font-inter font-normal text-[12px] leading-[100%] tracking-[0]" />
							Due Today
						</div>
						<div className="flex items-center gap-1 text-[10px] text-[#5B5967]">
							<div className="bg-[#9397F6] size-2 rounded-full font-inter font-normal text-[12px] leading-[100%] tracking-[0]" />
							Upcoming
						</div>
						<div className="flex items-center gap-1 text-[10px] text-[#5B5967]">
							<div className="bg-[#D72727] size-2 rounded-full" />
							Overdue
						</div>
					</div>
					<TrendSelector
						value={trendsGraph}
						onChange={setTrendsGraph}
						pageName=""
					/>
				</div>
			</div>
			{!props.isTableOpen && (
				<div className="w-full h-64">
					<ResponsiveContainer>
						<BarChart
							data={data}
							margin={{ top: 30, right: 0, left: 0, bottom: 0 }}
							barCategoryGap={barCategoryGap}
						>
							{/* <CartesianGrid strokeDasharray="3 3" vertical={false} /> */}
							<XAxis
								dataKey="department"
								tick={<CustomTick />}
								angle={-45}
								textAnchor="end"
							/>
							<YAxis
								domain={[0, "auto"]}
								tick={{ fontSize: 12, fill: "#ACABB2" }}
								label={{
									value: "No. of Tasks",
									angle: -90,
									position: "insideLeft",
									style: {
										fontSize: 14,
									},
									dy: 20,
									dx: 5,
									fill: "#ACABB2",
								}}
							/>
							<Tooltip
								content={<CustomTooltip />}
								cursor={false}
							/>
							<Bar
								dataKey="completed"
								fill="#0ca866"
								stackId="a"
								barSize={15}
							/>
							<Bar dataKey="upcoming" fill="#9397f6" stackId="a" />
							<Bar dataKey="overdue" fill="#d72727" stackId="a" />
							<Bar dataKey="due_today" fill="#e0bf10" stackId="a" />
						</BarChart>
					</ResponsiveContainer>
					<div className="flex flex-row md:hidden items-center gap-x-3 mt-3 flex-wrap">
						<div className="flex items-center gap-1 text-[10px] text-[#5B5967]">
							<div className="bg-[#0CA866] size-2 rounded-full" />
							Completed
						</div>
						<div className="flex items-center gap-1 text-[10px] text-[#5B5967]">
							<div className="bg-[#E0BF10] size-2 rounded-full" />
							Due Today
						</div>
						<div className="flex items-center gap-1 text-[10px] text-[#5B5967]">
							<div className="bg-[#9397F6] size-2 rounded-full" />
							Upcoming
						</div>
						<div className="flex items-center gap-1 text-[10px] text-[#5B5967]">
							<div className="bg-[#D72727] size-2 rounded-full" />
							Overdue
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
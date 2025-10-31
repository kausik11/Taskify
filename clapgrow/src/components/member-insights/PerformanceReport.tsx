import { useContext, useEffect, useMemo, useState, useCallback } from "react";
import PropTypes from "prop-types";
import {
	Bar,
	BarChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import TrendSelector from "../common/TrendSelector";
import { FrappeConfig, FrappeContext } from "frappe-react-sdk";
import { UserContext } from "@/utils/auth/UserProvider";

PerformanceReport.propTypes = {
	isTableOpen: PropTypes.bool.isRequired,
};

interface PerformanceData {
  name: string;
  value: number;
  percentage?: number;
}

function CustomTooltip({
	payload,
	active,
}: {
  payload?: any[];
  active?: boolean;
}) {
	if (active && payload && payload.length) {
		const data = payload[0].payload;
		return (
			<div
				className="custom-tooltip"
				style={{
					backgroundColor: "#fff",
					border: "1px solid #e0e0e0",
					padding: "12px 16px",
					borderRadius: "8px",
					boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
					fontSize: "13px",
				}}
			>
				<p
					className="label"
					style={{
						fontSize: "13px",
						color: "#333",
						margin: 0,
						fontWeight: 600,
					}}
				>
					{data.name}
				</p>
				<p style={{ fontSize: "12px", color: "#666", margin: "4px 0 0 0" }}>
					{data.value} team members
					{data.percentage !== undefined && (
						<span style={{ color: "#0DA866", fontWeight: 500 }}>
							{" "}
              ({data.percentage.toFixed(1)}%)
						</span>
					)}
				</p>
			</div>
		);
	}
	return null;
}

function LoadingSkeleton() {
	return (
		<div className="w-full h-[350px] flex justify-center items-center">
			<div className="w-full h-full relative px-[20px] pt-[10px] pb-0 pr-[25px]">
				<div className="animate-pulse h-full flex flex-col relative">
					{/* Y-axis label */}
					<div className="absolute left-0 top-1/2 transform -translate-y-1/2 -rotate-90">
						<div className="w-20 h-3 bg-gray-200 rounded"></div>
					</div>

					{/* Chart bars area */}
					<div className="flex-1 flex items-end justify-center gap-20 pb-6 pl-8 relative">
						{/* Y-axis line */}
						<div className="absolute left-8 top-0 bottom-6 w-px bg-gray-200"></div>

						{/* Bar placeholders with proportional heights */}
						<div className="flex flex-col items-center">
							<div className="w-5 h-16 bg-gray-200 rounded-t-lg mb-2"></div>
						</div>
						<div className="flex flex-col items-center">
							<div className="w-5 h-24 bg-gray-200 rounded-t-lg mb-2"></div>
						</div>
						<div className="flex flex-col items-center">
							<div className="w-5 h-12 bg-gray-200 rounded-t-lg mb-2"></div>
						</div>
					</div>

					{/* X-axis line */}
					<div className="h-px bg-gray-200 ml-8 mb-4"></div>

					{/* X-axis label placeholders */}
					<div className="flex justify-center gap-20 mb-4 pl-8">
						<div className="w-6 h-3 bg-gray-200 rounded"></div>
						<div className="w-8 h-3 bg-gray-200 rounded"></div>
						<div className="w-10 h-3 bg-gray-200 rounded"></div>
					</div>
				</div>
			</div>
		</div>
	);
}

// Error component
function ErrorDisplay({
	message,
	onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
	return (
		<div className="w-full h-80 flex flex-col justify-center items-center text-center px-4">
			<div className="mb-4">
				<svg
					className="w-16 h-16 text-gray-300 mx-auto mb-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={1.5}
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
					/>
				</svg>
			</div>
			<p className="text-gray-600 text-sm mb-4 max-w-sm">{message}</p>
			<button
				onClick={onRetry}
				className="px-4 py-2 bg-blue-500 text-white text-sm rounded-md  transition-colors duration-200 "
			>
        Try Again
			</button>
		</div>
	);
}

const RoundedBackgroundBar = (props: any) => {
	const { x, y, width, height, fill } = props;
	const radius = 8;

	if (height === 0) return null;

	const right = x + width;
	const bottom = y + height;

	return (
		<path
			d={`
        M${x},${bottom}
        L${x},${y + radius}
        Q${x},${y} ${x + radius},${y}
        L${right - radius},${y}
        Q${right},${y} ${right},${y + radius}
        L${right},${bottom}
        Z
      `}
			fill={fill}
		/>
	);
};

function EmptyState() {
	return (
		<div className="w-full h-[350px] flex flex-col justify-center items-center text-center px-4 bg-white rounded-[16px] border border-dashed border-gray-200">
			<div className="mb-4">
				<svg
					className="w-16 h-16 text-gray-300"
					fill="none"
					stroke="currentColor"
					strokeWidth={1.5}
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M3 3v18h18M3 15l4-4 4 4 4-4 4 4"
					/>
				</svg>
			</div>
			<h2 className="text-sm font-semibold text-gray-600 mb-1">
        No Performance Data Yet
			</h2>
			<p className="text-xs text-gray-500 max-w-sm">
        Performance metrics will be displayed once team members begin
        interacting with the system.
			</p>
		</div>
	);
}

export default function PerformanceReport({
	isTableOpen,
}: {
  isTableOpen: boolean;
}) {
	const { call } = useContext(FrappeContext) as FrappeConfig;
	const { companyDetails } = useContext(UserContext);
	const [trendsGraph, setTrendsGraph] = useState<string>("This Week");
	const [data, setData] = useState<PerformanceData[]>([
		{ name: "> 20%", value: 0 },
		{ name: "20%-80%", value: 0 },
		{ name: "80%-100%", value: 0 },
	]);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const companyId = useMemo(() => {
		return companyDetails && companyDetails.length > 0
			? companyDetails[0].name
			: null;
	}, [companyDetails]);

	const fetchData = useCallback(async () => {
		setError(null);
		setIsLoading(true);

		try {
			const filters: { trend: string; company_id?: string } = {
				trend: trendsGraph,
			};
			if (companyId) {
				filters.company_id = companyId;
			}

			const response = await call.post("frappe.desk.query_report.run", {
				report_name: "Performance Report",
				filters,
			});

			const apiMessage = response.message;
			const result = apiMessage.result[0];

			// Calculate total for percentages
			const total =
        (result["users_below_20"] || 0) +
        (result["users_20_80"] || 0) +
        (result["users_80_100"] || 0);

			const mappedData = [
				{
					name: "> 20%",
					value: result["users_below_20"] || 0,
					percentage:
            total > 0 ? ((result["users_below_20"] || 0) / total) * 100 : 0,
				},
				{
					name: "20%-80%",
					value: result["users_20_80"] || 0,
					percentage:
            total > 0 ? ((result["users_20_80"] || 0) / total) * 100 : 0,
				},
				{
					name: "80%-100%",
					value: result["users_80_100"] || 0,
					percentage:
            total > 0 ? ((result["users_80_100"] || 0) / total) * 100 : 0,
				},
			];

			setData(mappedData);
		} catch (error: any) {
			console.error("Performance Report Error:", error);
			setError(
				error.response?.data?.message ||
          error.message ||
          "Unable to load performance data. Please check your connection and try again.",
			);
		} finally {
			setIsLoading(false);
		}
	}, [call, trendsGraph, companyId]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	// Calculate if data is empty
	const isEmpty = data.every((item) => item.value === 0);
	const totalMembers = data.reduce((sum, item) => sum + item.value, 0);

	return (
		<div className="rounded-[16px] bg-white size-full">
			<div className="flex flex-col md:flex-row gap-y-3 md:items-center justify-between pb-4 mb-10 border-b p-5">
				<div className="flex items-center gap-3">
					<h1 className="text-[14px] font-[600]">Performance Report</h1>
					{/* {totalMembers > 0 && !isLoading && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
              {totalMembers} total members
            </span>
          )} */}
				</div>
				<TrendSelector
					value={trendsGraph}
					onChange={setTrendsGraph}
					pageName=""
				/>
			</div>

			{error ? (
				<ErrorDisplay message={error} onRetry={fetchData} />
			) : isLoading ? (
				<LoadingSkeleton />
			) : isEmpty ? (
				<EmptyState />
			) : (
				!isTableOpen && (
					<div className="w-full h-[350px] flex justify-center items-center">
						<ResponsiveContainer>
							<BarChart
								data={data}
								margin={{ top: 10, right: 25, left: 20, bottom: 0 }}
							>
								<XAxis
									dataKey="name"
									tick={{ fontSize: 12, fill: "#ACABB2" }}
									axisLine={{ stroke: "#E5E7EB", strokeWidth: 1 }} // light gray line
									tickLine={false}
								/>
								<YAxis
									tick={{ fontSize: 12, fill: "#ACABB2" }}
									axisLine={{ stroke: "#E5E7EB", strokeWidth: 1 }}
									tickLine={false}
									label={{
										value: "Team Members",
										angle: -90,
										position: "insideLeft",
										style: { fontSize: 14, fill: "#ACABB2" },
										dy: 40,
										dx: 0,
									}}
								/>
								<Tooltip
									content={<CustomTooltip />}
									cursor={{ fill: "transparent" }}
								/>

								<Bar
									dataKey="value"
									fill="#0DA866"
									barSize={20}
									// shape={<RoundedTopBar />}
									radius={[8, 8, 0, 0]}
									background={<RoundedBackgroundBar fill="#F5F5F5" />}
								/>
							</BarChart>
						</ResponsiveContainer>
					</div>
				)
			)}
		</div>
	);
}

import { useContext, useEffect, useState, useCallback } from "react";
import { debounce } from "lodash";
import { MoveDownLeft, MoveUpRight } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import TrendSelector from "../common/TrendSelector";
import { FrappeConfig, FrappeContext } from "frappe-react-sdk";
import { UserContext } from "@/utils/auth/UserProvider";

interface PriorityItem {
  color: string;
  label: string;
  value: number;
}

interface TaskStatusCardProps {
  isTableOpen: boolean;
  sendfromProject?: boolean;
  title?: string;
  allproject?: string;
  priorityWise?: PriorityItem[];
  selectedTask?: string;
}

export default function TaskStatusCard({
	isTableOpen,
	sendfromProject,
	title,
	allproject,
	priorityWise,
	selectedTask,
}: TaskStatusCardProps) {
	const { call, socket } = useContext(FrappeContext) as FrappeConfig;
	const { companyDetails, currentUser } = useContext(UserContext);
	const COLORS = ["#9397F6", "#0CA866", "#E0BF10", "#D72727"];

	const [statusData, setStatusData] = useState([
		{ color: "bg-[#9397F6]", label: "Upcoming", value: 0 },
		{ color: "bg-[#0CA866]", label: "Completed", value: 0 },
		{ color: "bg-[#E0BF10]", label: "Due today", value: 0 },
		{ color: "bg-[#D72727]", label: "Overdue", value: 0 },
	]);
	const [trendsGraph, setTrendsGraph] = useState<string>("This Week");
	const [taskScope, setTaskScope] = useState<string>("My Task");
	const [selectedUser, setSelectedUser] = useState<string | null>(null);
	const [company, setCompany] = useState<string | null>(null);
	const [users, setUsers] = useState<{ label: string; value: string }[]>([]);
	const [totalRecords, setTotalRecords] = useState<number>(0);
	const [completedPercentage, setCompletedPercentage] = useState<number>(0);
	const [changePercentage, setChangePercentage] = useState<number>(0);
	const [error, setError] = useState<string | null>(null);
	const [isMounted, setIsMounted] = useState(false);
	const [isLoading, setIsLoading] = useState<boolean>(true);

	// Sync taskScope with selectedTask
	useEffect(() => {
		if (selectedTask) {
			setTaskScope(selectedTask === "myTask" ? "My Task" : "Team Tasks");
		}
	}, [selectedTask]);

	// Fetch default company
	useEffect(() => {
		const fetchDefaultCompany = () => {
			try {
				const response = companyDetails?.[0].name;
				setCompany(response || null);
			} catch (err) {
				console.error("Error fetching default company:", err);
			}
		};
		fetchDefaultCompany();
	}, [companyDetails]);

	// Fetch users based on company
	useEffect(() => {
		const fetchUsers = async () => {
			if (!currentUser) return;
			try {
				const response = await call.get("frappe.client.get_list", {
					doctype: "CG User",
					fields: ["name", "full_name"],
					filters: { enabled: 1, ...(company ? { company_id: company } : {}) },
				});
				const userOptions = response.message.map((user: any) => ({
					label: user.full_name || user.name,
					value: user.name,
				}));
				setUsers(userOptions);
				setSelectedUser(currentUser);
			} catch (err) {
				console.error("Error fetching users:", err);
			}
		};
		fetchUsers();
	}, [call, currentUser, company]);

	// Fetch tasks based on filters
	const fetchTasks = useCallback(async () => {
		if (!selectedUser || !currentUser) return;
		setIsLoading(true);
		try {
			setError(null);
			const response = await call.post(`frappe.desk.query_report.run`, {
				report_name: "Total Task Status Report",
				filters: {
					trend: trendsGraph,
					user: currentUser,
					task_scope: taskScope,
					...(company ? { company } : {}),
				},
			});

			const resultData = response.message.result[0] || {
				upcoming: 0,
				completed: 0,
				due_today: 0,
				overdue: 0,
				total_tasks: 0,
				completed_percentage: 0,
				change_percentage: 0,
			};

			setStatusData([
				{
					color: "bg-[#9397F6]",
					label: "Upcoming",
					value: resultData.upcoming || 0,
				},
				{
					color: "bg-[#0CA866]",
					label: "Completed",
					value: resultData.completed || 0,
				},
				{
					color: "bg-[#E0BF10]",
					label: "Due today",
					value: resultData.due_today || 0,
				},
				{
					color: "bg-[#D72727]",
					label: "Overdue",
					value: resultData.overdue || 0,
				},
			]);

			setTotalRecords(resultData.total_tasks || 0);
			setCompletedPercentage(resultData.completed_percentage || 0);
			setChangePercentage(resultData.change_percentage || 0);
		} catch (error: any) {
			console.error("Error fetching tasks:", error);
			setError(error.message || "Failed to fetch task data.");
		} finally {
			setIsLoading(false);
		}
	}, [trendsGraph, taskScope, selectedUser, company, call, currentUser]);

	// Debounced fetchTasks to prevent excessive API calls
	const debouncedFetchTasks = useCallback(debounce(fetchTasks, 1000), [
		fetchTasks,
	]);

	// Set isMounted and fetch initial tasks
	useEffect(() => {
		setIsMounted(true);
		fetchTasks();
	}, [fetchTasks]);

	// Listen for report_updated event
	useEffect(() => {
		if (!socket) return;

		const handleReportUpdate = (data: { report_name: string }) => {
			if (data.report_name === "Total Task Status Report") {
				// ;
				debouncedFetchTasks();
			}
		};

		socket.on("report_updated", handleReportUpdate);

		return () => {
			socket.off("report_updated", handleReportUpdate);
		};
	}, [socket, debouncedFetchTasks]);

	const CustomTooltip = ({ active, payload }: any) => {
		if (
			active &&
      payload &&
      payload.length &&
      payload[0]?.name !== "backgroundPie"
		) {
			return (
				<div className="bg-gray-800 p-3 rounded shadow">
					<p className="text-sm text-white">
						{`${payload?.[0]?.payload.label}: ${payload[0].value}`}
					</p>
				</div>
			);
		}
		return null;
	};

	return !isTableOpen && isMounted ? (
		<div className="p-7 rounded-[16px] bg-white min-w-[370px] min-h-[324px] flex flex-col">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
				<h1 className="text-[14px] font-[600] w-[179px] h-[19px]">
					{title || "Total Task Status"}
				</h1>
				{!allproject && (
					<TrendSelector
						value={trendsGraph}
						onChange={(trendsGraph) => {
							setTrendsGraph(trendsGraph);
							setIsLoading(true);
						}}
						pageName=""
					/>
				)}
			</div>

			<div className="flex-grow flex flex-col">
				{sendfromProject ? null : changePercentage >= 0 ? (
					<div className="flex items-center justify-center gap-2 bg-[#EEFDF1] w-full py-1.5 rounded-xl text-[#5B5967] text-[12px] mb-3">
						<MoveUpRight
							className="text-emerald-500 p-1 rounded-full bg-[#D0F2D7]"
							size={23}
						/>
						<span className="font-semibold text-emerald-500">
              Up{" "}
							{Number.isInteger(Math.abs(changePercentage))
								? Math.abs(changePercentage).toFixed(0)
								: Math.abs(changePercentage).toFixed(2)}
              %
						</span>

						<span className="text-[#5B5967] font-normal">
              from previous week
						</span>
					</div>
				) : (
					<div className="flex items-center justify-center gap-2 bg-[#f5e6e5] w-full py-1.5 my-[20px] rounded-xl text-[#5B5967] text-[12px] mb-3">
						<MoveDownLeft
							className="text-red-500 p-1 rounded-full bg-[#f0d0c6]"
							size={23}
						/>
						<span className="font-[600] text-red-500">
              Down {Math.abs(changePercentage)}%
						</span>
						<span className="text-[#5B5967] font-[400]">
              from previous week
						</span>
					</div>
				)}

				<div className="flex flex-col sm:flex-row items-center justify-center xl:gap-8 flex-grow">
					<div
						className={`relative w-[169px] h-[169px] ml-5 ${isLoading ? "animate-pulse opacity-70" : ""}`}
					>
						<ResponsiveContainer width="100%" height="100%">
							<PieChart>
								<Pie
									name="backgroundPie"
									data={[{ value: 1 }]}
									cx="50%"
									cy="50%"
									innerRadius="76%"
									outerRadius="100%"
									startAngle={-90}
									endAngle={270}
									fill="#F0F0F0"
									paddingAngle={0}
									dataKey="value"
									stroke="none"
									isAnimationActive={false}
								/>
								<Pie
									name="statusPie"
									data={statusData ? statusData : priorityWise}
									cx="50%"
									cy="50%"
									innerRadius="80%"
									outerRadius="96%"
									cornerRadius={40}
									startAngle={-90}
									endAngle={270}
									paddingAngle={1}
									dataKey="value"
									isAnimationActive={true}
									animationDuration={600}
									animationEasing="ease-in-out"
								>
									{(priorityWise?.length ? priorityWise : statusData).map(
										(entry, index) => (
											<Cell
												key={`cell-${index}`}
												fill={COLORS[index % COLORS.length]}
												stroke="none"
											/>
										),
									)}
								</Pie>
								<Tooltip
									content={<CustomTooltip />}
									wrapperStyle={{ zIndex: 1000 }}
								/>
							</PieChart>
						</ResponsiveContainer>

						<div
							className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center text-[#2D2C37]"
							style={{ zIndex: 1 }}
						>
							{priorityWise?.length ? (
								<p className="font-[600] text-[16px]">
									{priorityWise.reduce((acc, cur) => acc + cur.value, 0)}/
									{totalRecords}
								</p>
							) : (
								<p className="font-[600] text-[16px]">{completedPercentage}%</p>
							)}
							<p className="font-[400] text-[12px] text-[#5B5967]">Completed</p>
						</div>
					</div>

					<div className="space-y-2 w-full sm:w-auto">
						{(priorityWise?.length ? priorityWise : statusData).map(
							(item, index) => (
								<div key={index} className="flex items-center gap-2">
									<div className={`${item.color} size-2 rounded-full`} />
									<p className="font-[600] text-[12px] text-[#5B5967]">
										{priorityWise?.length
											? item.value
											: `${item.value}/${totalRecords}`}
									</p>
									<p className="text-[#5B5967] font-[400] text-[12px]">
										{item.label}
									</p>
								</div>
							),
						)}
					</div>
				</div>
			</div>
		</div>
	) : null;
}

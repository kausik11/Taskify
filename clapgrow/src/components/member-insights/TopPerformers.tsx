import React, { useEffect, useState, useContext, useMemo } from "react";
import PropTypes from "prop-types";
import { useUserDetailsByEmailsArray } from "../common/CommonFunction";
import { FrappeConfig, FrappeContext } from "frappe-react-sdk";
import { UserContext } from "../../utils/auth/UserProvider";
import UserAssignees from "../dashboard/UserAssignees";
import TrendSelector from "../common/TrendSelector";

TopPerformers.propTypes = {
	isTableOpen: PropTypes.bool.isRequired,
};

interface Performer {
  email: string;
  first_name: string;
  last_name: string;
  user_name: string;
  full_name: string | null;
  weekly_score: number;
  department: string | null;
  current_actual_on_time_percentage: string;
}

function TopPerformers({ isTableOpen }: { isTableOpen: boolean }) {
	const { call } = useContext(FrappeContext) as FrappeConfig;
	const { companyDetails } = useContext(UserContext);
	const [trendsGraph, setTrendsGraph] = useState<string>("This Week");
	const [data, setData] = useState<Performer[]>([]);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const companyId = useMemo(
		() => (companyDetails?.length > 0 ? companyDetails[0].name : null),
		[companyDetails],
	);

	useEffect(() => {
		const fetchTasks = async () => {
			setLoading(true);
			try {
				const filters: { trend: string; company_id?: string } = {
					trend: trendsGraph,
				};
				if (companyId) filters.company_id = companyId;

				const response = await call.post(`frappe.desk.query_report.run`, {
					report_name: "Top Performers",
					filters,
				});

				setData(response.message.result || []);
				setError(null);
			} catch (error) {
				console.error("Error fetching tasks:", error);
				setError("Failed to load performers.");
			} finally {
				setLoading(false);
			}
		};

		fetchTasks();
	}, [trendsGraph, companyId, call]);

	const emails = useMemo(() => data.map((p) => p?.email), [data]);
	const { data: usersData } = useUserDetailsByEmailsArray(emails);

	const renderPerformers = useMemo(() => {
		if (loading)
			return (
				<div className="text-center py-6 text-sm text-gray-400 animate-pulse">
          Loading top performers...
				</div>
			);

		if (error) return <p className="text-red-500 text-center">{error}</p>;

		if (data.length === 0)
			return (
				<p className="text-[#5B5967] text-center text-sm py-6">
          No performers available
				</p>
			);

		return data.map((performer) => {
			const userDetail = usersData?.find(
				(user) =>
					user.email.trim().toLowerCase() ===
          performer?.email.trim().toLowerCase(),
			);

			return (
				<div
					className="grid grid-cols-6 gap-x-4 py-3 px-3 items-center hover:bg-gray-50 transition rounded-md"
					key={performer?.email}
					role="listitem"
				>
					<div className="col-span-5 flex items-center gap-4 overflow-hidden">
						<UserAssignees
							users={userDetail ? [userDetail] : []}
							className="h-[35px] w-[35px]"
						/>
						<div className="flex flex-col text-base truncate">
							<p className="text-[14px] font-medium truncate">
								{performer?.full_name}
							</p>
							<p className="text-[#ACABB2] text-sm truncate">
								{performer?.department?.split("-")[0] || "-"}
							</p>
						</div>
					</div>
					<div className="text-[#5B5967] font-semibold text-right">
						{performer?.weekly_score}%
					</div>
				</div>
			);
		});
	}, [data, error, usersData, loading]);

	return (
		<div className="rounded-[16px] bg-white size-full shadow-sm border border-gray-100">
			<div className="flex flex-col md:flex-row gap-y-3 md:items-center justify-between pb-4 border-b p-5">
				<h1 className="text-[14px] font-semibold text-[#333]">
          Top Performers
				</h1>
				<TrendSelector
					value={trendsGraph}
					onChange={setTrendsGraph}
					pageName=""
				/>
			</div>

			{!isTableOpen && (
				<div
					className="p-5 space-y-2"
					role="list"
					aria-label="Top performers list"
				>
					{renderPerformers}
				</div>
			)}
		</div>
	);
}

export default React.memo(TopPerformers);

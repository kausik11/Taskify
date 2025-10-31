import BottomPerformers from "@/components/member-insights/BottomPerformers";
import MembersTable from "@/components/member-insights/MembersTable";
import PerformanceReport from "@/components/member-insights/PerformanceReport";
import TopPerformers from "@/components/member-insights/TopPerformers";
import { useState } from "react";

const MemberInsightsContainer = () => {
	const [isTableOpen, setTableOpen] = useState(false);

	return (
		<section className="w-full h-full">
			<section className="grid grid-cols-1 md:grid-cols-3 items-center justify-center place-items-center gap-3 transition-all ease-out duration-150 w-full">
				<PerformanceReport isTableOpen={isTableOpen} />
				<TopPerformers isTableOpen={isTableOpen} />
				<BottomPerformers isTableOpen={isTableOpen} />
			</section>
			<MembersTable setTableOpen={setTableOpen} isTableOpen={isTableOpen} />
		</section>
	);
};

export default MemberInsightsContainer;

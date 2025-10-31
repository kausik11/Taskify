import RecurringTaskChart from "@/components/recurring-task/RecurringTaskChart";
import RecurringTaskTable from "@/components/recurring-task/RecurringTaskTable";
import TaskStatus from "@/components/recurring-task/TaskStatus";
import { useState } from "react";

const RecurringTaskContainer = () => {
	const [isTableOpen, setTableOpen] = useState(false);
	
	return (
		<section className="w-full h-full">
			{/* Only show charts when table is not expanded */}
			{!isTableOpen && (
				<section className="grid grid-cols-1 max-md:grid-rows-2 md:grid-cols-3 items-start justify-start place-items-start gap-3 transition-all ease-out duration-150 w-full">
					<RecurringTaskChart isTableOpen={isTableOpen} />
					<TaskStatus isTableOpen={isTableOpen} />
				</section>
			)}
			
			{/* Table takes full width when expanded */}
			<div className={`${isTableOpen ? 'w-full' : ''} transition-all ease-out duration-150`}>
				<RecurringTaskTable setTableOpen={setTableOpen} isTableOpen={isTableOpen} />
			</div>
		</section>
	);
};

export default RecurringTaskContainer;
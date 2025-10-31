import TaskCompletionGraphCard from "@/components/dashboard/TaskCompletionGraphCard";
import TaskStatusCard from "@/components/dashboard/TaskStatusCard";
import TaskTable from "@/components/dashboard/TaskTable";
import { useState } from "react";

const DashBoardContainer = ({ refreshKey }) => {
	const [isTableOpen, setTableOpen] = useState(false);
	const [selectedTask, setSelectedTask] = useState("myTask");
	const [listSize, setListSize] = useState(20);

	return (
		<section className="w-full h-full md:h-[75vh]">
			{/* Desktop/Tablet Layout - Show graphs */}
			<section className="hidden md:grid md:grid-cols-3 items-center justify-center place-items-left gap-[24px] transition-all ease-out duration-150 pt-[16px]">
				<TaskStatusCard
					sendfromProject={false}
					title="Total Task Status"
					selectedTask={selectedTask}
					isTableOpen={isTableOpen}
				/>
				<TaskCompletionGraphCard isTableOpen={isTableOpen} />
			</section>
			
			<TaskTable
				setSelectedTask={setSelectedTask}
				selectedTask={selectedTask}
				setTableOpen={setTableOpen}
				isTableOpen={isTableOpen}
				refreshKey={refreshKey}
				listSize={listSize}
				setListSize={setListSize}
			/>
		</section>
	);
};

export default DashBoardContainer;
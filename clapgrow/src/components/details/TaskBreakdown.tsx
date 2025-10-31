import React from "react";

type taskBreakdownCounts = {
  help_tickets: number;
  onetime_tasks: number;
  process: number;
  recurring_tasks: number;
};
interface TaskBreakdownCountsProps {
  task_breakdown_counts: taskBreakdownCounts;
}
const TaskBreakdownTable: React.FC<TaskBreakdownCountsProps> = ({
	task_breakdown_counts,
}) => {
	const tasks = [
		{ type: "One Time", count: task_breakdown_counts?.onetime_tasks || 0 },
		{
			type: "Recurring Task",
			count: task_breakdown_counts?.recurring_tasks || 0,
		},
		{ type: "Help Ticket", count: task_breakdown_counts?.help_tickets || 0 },
		{ type: "Process", count: task_breakdown_counts?.process || 0 },
	];

	return (
		<div className="bg-white p-6 mt-6 rounded-[16px] min-w-[33%]">
			<h2 className="text-xl font-medium mb-4 text-[#2D2C37]">
        Task BreakDown
			</h2>
			<table className="w-full">
				<tbody>
					{tasks.map((task, index) => (
						<React.Fragment key={task.type}>
							<tr className=" ">
								<td className="py-3 text-gray-600">{task.type}</td>
								<td className="py-3 text-right text-gray-600">{task.count}</td>
							</tr>
							{index < tasks.length - 1 && (
								<tr className="h-px">
									<td colSpan={2} className="p-0">
										<div className="border-b border-[#E8E7EE]"></div>
									</td>
								</tr>
							)}
						</React.Fragment>
					))}
				</tbody>
			</table>
		</div>
	);
};

export default TaskBreakdownTable;

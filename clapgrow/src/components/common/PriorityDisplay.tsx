import { PRIORITY_DATA } from "@/data/common";

export const PriorityDisplay = ({ priority }: { priority?: string }) => {
	const priorityData = PRIORITY_DATA.find((p) => p.name === priority);

	if (!priorityData) return null;

	return (
		<div className="flex items-center w-full space-x-1">
			<img src={priorityData.image} alt={priority} />
			<p className="text-[14px]" style={{ color: priorityData.color }}>
				{priority}
			</p>
		</div>
	);
};

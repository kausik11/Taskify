import { ReactNode } from "react";
import { Circle } from "lucide-react";

type StatusType = "Completed" | "Overdue" | "Upcoming" | "Due Today";

interface StatusProps {
  status: StatusType;
}

const statusMap: Record<
  StatusType,
  {
    icon: ReactNode;
    textColor: string;
    bgColor: string;
  }
> = {
	Completed: {
		icon: <Circle className="w-4 h-4 text-green-600 fill-green-600" />,
		textColor: "text-green-600",
		bgColor: "bg-green-100",
	},
	Overdue: {
		icon: (
			<svg viewBox="0 0 24 24" className="w-4 h-4">
				<circle cx="12" cy="12" r="10" className="fill-red-600" />
				<path
					d="M12,2 
             A10,10 0 0,1 21.5,7.5 
             L12,12 Z"
					className="fill-white"
				/>
			</svg>
		),
		textColor: "text-red-600",
		bgColor: "bg-red-100",
	},
	"Due Today": {
		icon: (
			<svg viewBox="0 0 24 24" className="w-4 h-4">
				<circle cx="12" cy="12" r="10" className="fill-yellow-600" />
				<path
					d="M12,2 
           A10, 10 0 0,1 21.5,15.5
           L12,12 Z"
					className="fill-white"
				/>
			</svg>
		),
		textColor: "text-yellow-600",
		bgColor: "bg-yellow-100",
	},
	Upcoming: {
		icon: (
			<span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-blue-600"></span>
		),
		textColor: "text-blue-600",
		bgColor: "bg-transparent",
	},
};

const StatusBadge = ({ status }: StatusProps) => {
	const { icon, textColor, bgColor } = statusMap[status];
	return (
		<span
			className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full ${textColor} ${bgColor}`}
		>
			<span className="flex items-center">{icon}</span>
			{status}
		</span>
	);
};

export default StatusBadge;

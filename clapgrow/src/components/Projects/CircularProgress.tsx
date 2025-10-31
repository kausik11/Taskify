interface CircularProgressProps {
  progress: number; // 0 - 100
  size?: number; // size in pixels (default: 32)
  strokeWidth?: number; // thickness of the ring
}

const CircularProgress = ({
	progress,
	size = 32,
	strokeWidth = 4,
}: CircularProgressProps) => {
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;
	const offset = circumference - (progress / 100) * circumference;
	return (
		<svg width={size} height={size} className="block">
			<circle
				stroke="#e5e7eb" // Tailwind gray-200 for background
				fill="white"
				cx={size / 2}
				cy={size / 2}
				r={radius}
				strokeWidth={strokeWidth}
			/>
			<circle
				stroke="#10b981" // Tailwind green-500
				fill="transparent"
				cx={size / 2}
				cy={size / 2}
				r={radius}
				strokeWidth={strokeWidth}
				strokeDasharray={circumference}
				strokeDashoffset={offset}
				strokeLinecap="round"
				transform={`rotate(-90 ${size / 2} ${size / 2})`} // Start at top
			/>
		</svg>
	);
};

export default CircularProgress;

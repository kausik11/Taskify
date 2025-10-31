import "./loader.css";

export const Loader = ({
	size = 45,
	speed = 1.75,
	color = "blue",
}: {
  size?: number;
  speed?: number;
  color?: string;
}) => {
	const dotSize = size / 5;

	return (
		<div className="fixed inset-0 z-50 bg-white bg-opacity-95 flex items-center justify-center">
			<div className="dot-pulse-loader" style={{ height: dotSize * 2 }}>
				{[...Array(3)].map((_, i) => (
					<div
						key={i}
						className="dot"
						style={{
							width: dotSize,
							height: dotSize,
							backgroundColor: color,
							animationDelay: `${i * (speed / 5)}s`,
							animationDuration: `${speed}s`,
						}}
					/>
				))}
			</div>
		</div>
	);
};

export const DotStreamLoader = () => {
	return (
		<div className="dot-stream-loader">
			<span></span>
			<span></span>
			<span></span>
			<span></span>
			<span></span>
			<span></span>
			<span></span>
		</div>
	);
};

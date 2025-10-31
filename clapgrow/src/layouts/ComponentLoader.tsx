import React from "react";

const ComponentLoader: React.FC = () => {
	return (
		<div className="flex items-center justify-center">
			<div
				className="w-5 h-5 border-2 border-t-[#0076BD] border-gray-300 rounded-full animate-spin"
				role="status"
				aria-label="Loading"
			></div>
		</div>
	);
};

export default ComponentLoader;

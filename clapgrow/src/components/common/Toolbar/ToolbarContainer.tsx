import React from "react";

export interface ToolbarContainerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Container for the toolbar
 * @param props
 * @returns A ToolbarContainer component
 */
export const ToolbarContainer = ({
	children,
	className = "",
	...props
}: ToolbarContainerProps) => {
	return (
		<div
			className={`flex flex-row w-full justify-between items-center ${className}`}
			{...props}
		>
			{children}
		</div>
	);
};

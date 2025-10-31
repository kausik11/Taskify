import React, { PropsWithChildren } from "react";
import { AiOutlineInfoCircle } from "react-icons/ai";
export type CalloutObject = {
  state: boolean;
  message: string;
};

export type CustomCalloutProps = {
  rootProps?: React.HTMLProps<HTMLDivElement>;
  iconProps?: React.SVGProps<SVGSVGElement>;
  iconChildren?: React.ReactNode;
  textProps?: React.HTMLProps<HTMLParagraphElement>;
  textChildren?: React.ReactNode;
};

export const CustomCallout = ({
	rootProps,
	iconProps,
	textProps,
	textChildren,
	iconChildren = <AiOutlineInfoCircle className="text-blue-500 w-6 h-6" />,
}: PropsWithChildren<CustomCalloutProps>) => {
	return (
		<div
			className="flex items-center p-4 border-l-4 border-blue-500 bg-blue-50"
			{...rootProps}
		>
			<div className="flex flex-row justify-center">
				<div className="mr-2 mt-0.5">
					{React.cloneElement(<span>{iconChildren}</span>, iconProps)}
				</div>
				<div>
					<p className="font-semibold text-blue-700" {...textProps}>
						{textChildren}
					</p>
				</div>
			</div>
		</div>
	);
};

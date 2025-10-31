import { ReactNode } from "react";

type LabelProps = {
  children: ReactNode;
  isRequired?: boolean;
  htmlFor?: string;
};

export const Label = ({ children, isRequired, htmlFor }: LabelProps) => {
	return (
		<label htmlFor={htmlFor} className="block pb-1 font-medium">
			{children} {isRequired && <span className="text-red-500">*</span>}
		</label>
	);
};

export const HelperText = ({ children }: { children: ReactNode }) => {
	return <span className="text-sm text-gray-500">{children}</span>;
};

export const ErrorText = ({ children }: { children: ReactNode }) => {
	return <p className="text-sm text-red-500">{children}</p>;
};

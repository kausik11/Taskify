// components/Accordion.tsx
import React, { useState, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { ArrowRight } from "lucide-react";
import edit from "@/assets/icons/editProfile.svg";

type AccordionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
};

export const ProjectsAccordion: React.FC<AccordionProps> = ({
	title,
	description,
	children,
	defaultOpen = true,
}) => {
	const [isOpen, setIsOpen] = useState(defaultOpen);

	return (
		<div className="border rounded-lg shadow-sm mb-4">
			{/* Header */}
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="flex w-full items-start justify-between bg-gray-100 px-4 py-3 hover:bg-gray-200 transition"
			>
				<div className="flex items-start gap-2 text-left">
					<span className="text-xl pt-0.5">
						{isOpen ? <ChevronDown /> : <ArrowRight />}
					</span>
					<div>
						<h3 className="text-lg font-semibold text-gray-800">{title}</h3>
						{description && (
							<p className="text-sm text-gray-500">{description}</p>
						)}
					</div>
				</div>
				<span className="text-gray-500">
					<img src={edit} alt="Edit" className="w-7 h-7" />
				</span>
				<span></span>
			</button>

			{/* Content */}
			{isOpen && <div className="p-4">{children}</div>}
		</div>
	);
};

"use client";
import React from "react";
import { Calendar } from "lucide-react";
import { Week_Trend } from "@/data/common";

interface TrendSelectorProps {
  value: string;
  onChange: (value: string) => void;
  pageName: string;
}

const TrendSelector: React.FC<TrendSelectorProps> = ({
	value,
	onChange,
	pageName,
}) => {
	const Style =
    pageName == "OverAll"
    	? "bg-[#ffffff] py-[12px] px-[14px] rounded-[8px]"
    	: "bg-[#F3F4F6] py-[4px] px-[8px] gap-[5px] rounded-[10px]";
	return (
		<div
			className={`flex items-center gap-1 text-[10px] text-[#2D2C37] rounded-[10px] w-fit ${Style}`}
		>
			<Calendar className="w-[15px] h-[15px]" />
			<select
				name="trend"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="bg-transparent border-none outline-none text-[#5B5967] text-[10px]"
			>
				{Week_Trend.map((trend) => (
					<option key={trend.value} value={trend.value}>
						{trend.name}
					</option>
				))}
			</select>
		</div>
	);
};

export default TrendSelector;

import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import PropTypes from "prop-types";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";

DropDown.propTypes = {
	label: PropTypes.string,
	data: PropTypes.array.isRequired,
	value: PropTypes.string.isRequired,
	handleSelect: PropTypes.func.isRequired,
	placeholder: PropTypes.string.isRequired,
	containerClassname: PropTypes.string,
	labelClassname: PropTypes.string,
	for: PropTypes.string.isRequired,
	disabled: PropTypes.bool,
	className: PropTypes.string,
};

export default function DropDown({
	label,
	data,
	value,
	handleSelect,
	placeholder,
	containerClassname,
	labelClassname,
	disabled,
	className,
	for: htmlFor,
}) {
	return (
		<div className={containerClassname ? containerClassname : "w-full"}>
			{label && (
				<span
					className={cn(
						`text-[#5B5967] text-[12px] font-[600] ${
							labelClassname ? labelClassname : ""
						}`,
					)}
				>
					{label}
				</span>
			)}
			<DropdownMenu>
				<DropdownMenuTrigger
					className="w-full"
					disabled={disabled ? disabled : false}
				>
					<div
						className={cn(
							"w-full rounded-[8px] p-[8px] px-[15px] border-[#D0D3D9] text-[14px] font-[500] border-[1px] bg-[#FFFFFF] outline-none flex flex-row items-center justify-between",
							value && value !== "" ? "text-[#000000]" : "text-[#ACABB2]",
							className ? className : "",
						)}
					>
						<span>{value && value !== "" ? value : placeholder}</span>
						<ChevronDown className="w-[20px] h-[20px]" />
					</div>
				</DropdownMenuTrigger>
				<DropdownMenuContent>
					{data.length === 0 && (
						<DropdownMenuItem disabled>
              No {htmlFor} available.
						</DropdownMenuItem>
					)}
					{data.length > 0 &&
            data.map((each, index) => (
            	<DropdownMenuItem
            		onClick={() => {
            			handleSelect(each);
            		}}
            		key={index + "dropdown-item-" + each}
            	>
            		{each}
            	</DropdownMenuItem>
            ))}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

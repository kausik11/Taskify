import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { X } from "lucide-react";
import { forwardRef, useState, useImperativeHandle } from "react";

export interface ChildTableFilterCountRef {
  updateFilterCount: (filters: any) => void;
}

export const ChildTableFilterCount = forwardRef<
  ChildTableFilterCountRef,
  { refreshGrid: () => void; doctype: string }
  	>((props, ref) => {
  		const [filters, setFilters] = useState<any>([]);

  		const updateFilterCount = (filters: any) => {
  			setFilters(filters);
  		};

  		useImperativeHandle(ref, () => ({
  			updateFilterCount,
  		}));

  		const onClearFilters = () => {
  			window.sessionStorage.setItem(`${props.doctype}-child-table-filters`, "[]");
  			props.refreshGrid();
  			updateFilterCount([]);
  		};

  		if (filters.length > 0) {
  			return (
  				<TooltipProvider>
  					<Tooltip>
  						<TooltipTrigger asChild>
  							<div className="inline-flex">
  								<span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium border border-blue-200 cursor-default">
  									{`Additional Filters Applied (${filters.length})`}
  									<button
  										type="button"
  										onClick={onClearFilters}
  										className="ml-2 rounded-full hover:bg-blue-200 p-1 transition-colors"
  										tabIndex={0}
  										aria-label="Clear filters"
  									>
  										<X className="w-4 h-4" />
  									</button>
  								</span>
  							</div>
  						</TooltipTrigger>
  						<TooltipContent
  							side="bottom"
  							className="rounded-md p-2 bg-white shadow-md border"
  						>
  							<AdditionalFiltersTooltip filters={filters} />
  						</TooltipContent>
  					</Tooltip>
  				</TooltipProvider>
  			);
  		}
  		return null;
  	});

export const AdditionalFiltersTooltip = ({ filters }: { filters: any }) => {
	const getOperatorValue = (operator: string) => {
		switch (operator) {
		case (operator = "="):
			return "Equals";
		case (operator = "!="):
			return "Not Equals";
		case (operator = "like"):
			return "Like";
		case (operator = "not like"):
			return "Not Like";
		case (operator = "in"):
			return "In";
		case (operator = "not in"):
			return "Not In";
		case (operator = "between"):
			return "Between";
		case (operator = "not between"):
			return "Not Between";
		case (operator = ">"):
			return "Greater Than";
		case (operator = ">="):
			return "Greater Than Equals";
		case (operator = "<"):
			return "Less Than";
		case (operator = "<="):
			return "Less Than Equals";
		default:
			return "Equals";
		}
	};

	return (
		<div className="flex flex-col gap-2 p-2">
			{filters.map((filter: any, index: number) => {
				return (
				// <Text key={index} fontSize={'sm'} p={1} fontWeight={'medium'} rounded={'md'} >{`${filter[0]} (${filter[1]}) ${getOperatorValue(filter[2])} ${filter[3]}`}</Text>
					<div
						key={index}
						className="flex items-center gap-2 p-1 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
					>
						<span className="font-medium">{filter[0]}</span>
						<span className="text-gray-500">({filter[1]})</span>
						<span className="text-blue-600">{getOperatorValue(filter[2])}</span>
						<span className="text-gray-700">{filter[3]}</span>
					</div>
				);
			})}
		</div>
	);
};

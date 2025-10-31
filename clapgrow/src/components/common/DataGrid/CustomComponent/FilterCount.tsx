import React, { forwardRef, useImperativeHandle } from "react";
import { LuFilterX } from "react-icons/lu";

export interface FilterCountRef {
  updateFilterCount: (filterCount: number) => void;
}

export const FilterCount = forwardRef<
  FilterCountRef,
  { clearFilters: () => void }
  	>((props, ref) => {
  		const [filterCount, setFilterCount] = React.useState(0);

  		const updateFilterCount = (filterCount: number) => {
  			setFilterCount(filterCount);
  		};

  		useImperativeHandle(ref, () => ({
  			updateFilterCount,
  		}));

  		const onClearFilters = () => {
  			props.clearFilters();
  			updateFilterCount(0);
  		};

  		if (filterCount > 0) {
  			return (
  				<div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium border border-blue-200 cursor-default">
  					{`Filter (${filterCount})`}
  					<button
  						type="button"
  						onClick={onClearFilters}
  						className="ml-2 rounded-full hover:bg-blue-200 p-1 transition-colors"
  						tabIndex={0}
  						aria-label="Clear filters"
  					>
  						<LuFilterX className="w-4 h-4" />
  					</button>
  				</div>
  			);
  		}
  		return null;
  	});

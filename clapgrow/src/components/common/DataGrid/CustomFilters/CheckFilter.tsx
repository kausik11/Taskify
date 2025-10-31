import { CustomFilterProps, useGridFilter } from "ag-grid-react";
import { useCallback, useEffect, useState } from "react";

export interface CheckFilterProps extends CustomFilterProps {
  headerName?: string;
}

export const CheckFilters = (props: CheckFilterProps) => {
	const [check, setCheck] = useState<string>(
		props?.model?.filter === 1
			? "true"
			: props?.model?.filter === 0
				? "false"
				: "",
	);

	useEffect(() => {
		if (props?.model) {
			if (props?.model?.filter === 1) {
				setCheck("true");
			} else {
				setCheck("false");
			}
		} else {
			setCheck("");
		}
	}, [props?.model]);

	useEffect(() => {
		if (check) {
			const model = {
				filterType: "check",
				filter: check === "true" ? 1 : 0,
				type: "equals",
			};
			props.onModelChange(model);
		} else {
			props?.onModelChange(null);
		}
	}, [check]);

	const doesFilterPass = useCallback(
		(params: any) => {
			if (check) {
				return true;
			}
			return false;
		},
		[check],
	);

	const getModelAsString = useCallback((model: any) => {
		return check;
	}, []);

	useGridFilter({
		doesFilterPass,
		getModelAsString,
	});

	return (
		<div className="ag-filter">
			<div className="ag-filter-body-wrapper ag-simple-filter-body-wrapper">
				<select
					className="ag-wrapper ag-picker-field-wrapper ag-picker-collapsed"
					value={check}
					onChange={(e) => setCheck(e.target.value)}
					style={{
						height: "28px",
						paddingLeft: "4px",
					}}
				>
					<option value="">All</option>
					<option value="false">False</option>
					<option value="true">True</option>
				</select>
			</div>
		</div>
	);
};

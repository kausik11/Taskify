import { useCallback, useEffect, useState } from "react";
import "./dateFilterCss.css";
import { CustomFilterProps, useGridFilter } from "ag-grid-react";
import {
	DatePickerValueComponent,
	DateTimePickerValueComponent,
	TimePickerValueComponent,
} from "../../AirDatePicker/DatePickerValueComponent";
import { convertFrappeDateStringToReadableDate, convertFrappeTimestampToReadableDateTime, convertTimeStringToDate } from "@/utils/dateconversion";
interface DateFilterProps extends CustomFilterProps {
  format: "date" | "datetime" | "time";
  headerName?: string;
}

export const DateFilters = (props: DateFilterProps) => {
	const [min, setMin] = useState<string>("");
	const [max, setMax] = useState<string>("");
	const [operator, setOperator] = useState<string>("equals");
	const [timespan, setTimespan] = useState<string>("last week");

	const onClearFilter = () => {
		// Clear the filter and reset the values
		setMin("");
		setMax("");
		setOperator("equals");
		setTimespan("last week");

		props?.onModelChange(null);
	};

	useEffect(() => {
		if (props?.model) {
			setOperator(props?.model?.type);
			if (props?.model?.type === "Timespan") {
				setOperator("Timespan");
				setTimespan(props?.model?.filter);
			} else {
				setMin(props?.model?.filter);
				setMax(props?.model?.filterTo);
			}
		} else {
			setOperator("equals");
			setTimespan("last week");
			setMin("");
			setMax("");
		}
	}, [props?.model, setOperator, setTimespan, setMin, setMax]);

	useEffect(() => {
		// create filterModel and pass it to the grid
		if (operator !== "Timespan" && min) {
			const model = {
				type: operator,
				filterType: "date",
				filter: min,
				filterTo: max,
			};
			props.onModelChange(model);
		} else if (operator === "Timespan" && timespan) {
			const model = { type: operator, filterType: "date", filter: timespan };
			props.onModelChange(model);
		}
	}, [min, max, operator, timespan]);

	const doesFilterPass = useCallback(
		(params: any) => {
			const { column } = props;
			const { node } = params;

			let passed = true;
			if (min && max) {
				const filterValue = props.getValue(node, column);

				if (filterValue !== undefined && filterValue !== null) {
					if (filterValue.toString().toLowerCase().indexOf(min) < 0) {
						passed = false;
					}
				}
			}
			return passed;
		},
		[min, max, operator, timespan],
	);

	const getModelAsString = useCallback(
		(model: any) => {
			const formattedMin = min ? props?.format === "date" ? convertFrappeDateStringToReadableDate(min) : props?.format === "datetime" ? convertFrappeTimestampToReadableDateTime(min) : props?.format === "time" ? convertTimeStringToDate(min) : min : "";
			const formattedMax = max ? props?.format === "date" ? convertFrappeDateStringToReadableDate(max) : props?.format === "datetime" ? convertFrappeTimestampToReadableDateTime(max) : props?.format === "time" ? convertTimeStringToDate(max) : max : "";
			const buttonText = props.headerName
				? operator === "between"
					? `${props.headerName} between ${formattedMin} and ${formattedMax}`
					: operator === "Timespan"
						? `${props.headerName} from ${timespan}`
						: `${props.headerName} ${operator} ${formattedMin}`
				: operator === "between"
					? `between ${formattedMin} and ${formattedMax}`
					: operator === "Timespan"
						? `from ${timespan}`
						: `${operator} ${formattedMin}`;
			return buttonText;
		},
		[operator, min, max, timespan],
	);

	useGridFilter({
		doesFilterPass,
		getModelAsString,
	});

	return (
		<div role="presentation" className="date-filters">
			<div className="ag-filter">
				<div
					className="ag-filter-body-wrapper ag-simple-filter-body-wrapper"
					style={{
						display: "flex",
						flex: "auto",
						gap: "4px",
						overflowY: "unset",
						// maxHeight: '402px'
					}}
				>
					<select
						className="ag-wrapper ag-picker-field-wrapper ag-picker-collapsed"
						value={operator}
						onChange={(e) => setOperator(e.target.value)}
						style={{
							height: "28px",
							paddingLeft: "4px",
						}}
					>
						<option value={"equals"}>Equals</option>
						<option value={"greaterThan"}>Greater Than</option>
						<option value={"lessThan"}>Less Than</option>
						<option value={"greaterThanOrEqual"}>Greater Than Or Equal</option>
						<option value={"lessThanOrEqual"}>Less Than Or Equal</option>
						<option value="between">Between</option>
						<option value="Timespan">Timespan</option>
					</select>
					{operator === "Timespan" ? (
						<select
							className="ag-wrapper ag-picker-field-wrapper ag-picker-collapsed"
							value={timespan}
							onChange={(e) => setTimespan(e.target.value)}
							style={{
								height: "28px",
								paddingLeft: "4px",
							}}
						>
							<option value={"last week"}>Last Week</option>
							<option value={"last month"}>Last Month</option>
							<option value={"last quarter"}>Last Quarter</option>
							<option value={"last 6 months"}>Last 6 Months</option>
							<option value={"last year"}>Last Year</option>
							<option value={"yesterday"}>Yesterday</option>
							<option value={"today"}>Today</option>
							<option value={"tomorrow"}>Tomorrow</option>
							<option value={"this week"}>This Week</option>
							<option value={"this month"}>This Month</option>
							<option value={"this quarter"}>This Quarter</option>
							<option value={"this year"}>This Year</option>
							<option value={"next week"}>Next Week</option>
							<option value={"next month"}>Next Month</option>
							<option value={"next quarter"}>Next Quarter</option>
							<option value={"next 6 months"}>Next 6 Months</option>
							<option value={"next year"}>Next Year</option>
						</select>
					) : (
						<div className="ag-filter-body">
							<div className="ag-filter-from ag-filter-date-from">
								{/* <DatePickerValueComponent value={min} onChange={(value) => setMin(value)} inputProps={{
                                    height: '28px',
                                    rounded: 'md',
                                }} /> */}
								<DateAndTimeFilters
									format={props.format}
									value={min}
									setValue={setMin}
								/>
							</div>
							{operator === "between" && (
								<div>
									<div className="ag-filter-separator ag-hidden" />
									<div
										className="ag-filter-and"
										style={{
											margin: "6px",
											justifyContent: "center",
											display: "flex",
											fontWeight: "bold",
										}}
									>
                    And
									</div>
									<div className="ag-filter-separator ag-hidden" />
									<div className="ag-filter-to ag-filter-date-to">
										{/* <DatePickerValueComponent value={max} onChange={(value) => setMax(value)} inputProps={{
                                        height: '28px',
                                        rounded: 'md',
                                    }} /> */}
										<DateAndTimeFilters
											format={props.format}
											value={max}
											setValue={setMax}
										/>
									</div>
								</div>
							)}
						</div>
					)}
				</div>
				<div className="ag-filter-apply-panel">
					<button
						onClick={onClearFilter}
						className="ag-button ag-standard-button ag-filter-apply-panel-button"
					>
            Clear
					</button>
				</div>
			</div>
		</div>
	);
};

export const DateAndTimeFilters = ({
	format,
	value,
	setValue,
}: {
  format: "date" | "datetime" | "time";
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
}) => {
	if (format === "date") {
		return (
			<DatePickerValueComponent
				value={value}
				onChange={setValue}
				id="ag-custom-component-popup"
				inputProps={{
					height: "28px",
					rounded: "md",
				}}
			/>
		);
	} else if (format === "datetime") {
		return (
			<DateTimePickerValueComponent
				value={value}
				onChange={setValue}
				inputProps={{
					height: "28px",
					rounded: "md",
				}}
				id="ag-custom-component-popup"
			/>
		);
	} else if (format === "time") {
		return <TimePickerValueComponent value={value} onChange={setValue} />;
	}
	return null;
};

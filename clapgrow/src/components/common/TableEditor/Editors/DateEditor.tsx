import { forwardRef, useEffect, useRef } from "react";
import "./timeEditor.css";
import { CustomCellEditorProps } from "ag-grid-react";
import {
	DatePickerValueComponentProps,
	DatePickerValueComponent,
	DateTimePickerValueComponent,
	TimePickerValueComponentProps,
	TimePickerValueComponent,
} from "../../AirDatePicker/DatePickerValueComponent";

interface DateEditorProps extends CustomCellEditorProps {
  props: Omit<
    Partial<Omit<DatePickerValueComponentProps, "value" | "onChange">>,
    "selected" | "setSelectedValue" | "name"
  >;
}

export const DateEditor = forwardRef((props: DateEditorProps, ref) => {
	return (
		<div className="bg-white h-[40px]">
			<DatePickerValueComponent
				value={props.value ?? props.props?.defaultValue}
				onChange={props.onValueChange}
				inputProps={{
					width: props.column.getActualWidth(),
					height: "30px",
				}}
				{...props.props}
			/>
		</div>
	);
});

export const DateTimeEditor = forwardRef((props: DateEditorProps, ref) => {
	return (
		<div className="bg-white h-[40px]">
			<DateTimePickerValueComponent
				value={props.value ?? props.props?.defaultValue}
				onChange={props.onValueChange}
				inputProps={{
					width: props.column.getActualWidth(),
					height: "30px",
				}}
				{...props.props}
			/>
		</div>
	);
});

interface TimeEditorProps extends CustomCellEditorProps {
  props?: TimePickerValueComponentProps;
}

export const TimeEditor = forwardRef((props: TimeEditorProps, ref) => {
	// const [value, setValue] = useState(props.value)

	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		// call the show method of the datePicker
		// @ts-ignore
		inputRef.current?.show();
	}, []);

	// useImperativeHandle(ref, () => {
	//     return {
	//         // the final value to send to the grid, on completion of editing
	//         getValue() {
	//             // this simple editor doubles any value entered into the input
	//             return value;
	//         },
	//     }
	// })
	return (
		<div className="bg-white h-[40px]">
			<div
				className="time-picker-value-component"
				style={{ width: props.column.getActualWidth() }}
			>
				<TimePickerValueComponent
					ref={inputRef}
					value={props.value}
					onChange={props.onValueChange}
					{...props.props}
				/>
			</div>
		</div>
	);
});

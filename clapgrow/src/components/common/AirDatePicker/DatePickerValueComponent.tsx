import AirDatepicker, {
	AirDatepickerOptions,
	AirDatepickerButton,
} from "air-datepicker";
import moment from "moment-timezone";
import {
	forwardRef,
	useRef,
	useState,
	useEffect,
	ChangeEvent,
	useImperativeHandle,
} from "react";
import localeEn from "air-datepicker/locale/en";
import "react-datepicker/dist/react-datepicker.css";
import DatePicker, { DatePickerProps } from "react-datepicker";
import { FiCalendar } from "react-icons/fi";
import {
	convertFrappeDateStringToReadableDate,
	FRAPPE_DATE_FORMAT,
	today,
	convertFrappeTimestampToReadableDateTime,
	FRAPPE_DATETIME_FORMAT,
	convertTimeStringToDate,
	convertDateToTimeString,
} from "@/utils/dateconversion";
import { toast } from "sonner";
import "./date-picker.css";

export interface DatePickerValueComponentProps extends AirDatepickerOptions {
  value?: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  required?: boolean;
  defaultValue?: string;
  disabled?: boolean;
  inputProps?: any;
  id?: string;
}

export const DatePickerValueComponent = ({
	value,
	onChange,
	minDate,
	maxDate,
	readOnly,
	defaultValue,
	disabled,
	required,
	inputProps,
	id,
	...props
}: DatePickerValueComponentProps) => {
	// inputRef for Input element and dp for AirDatepicker instance
	const inputRef = useRef<HTMLInputElement | null>(null);
	const dp = useRef<AirDatepicker | null>(null);

	// dateInput is the value of the Input element
	const [dateInput, setDateInput] = useState<string>(
		convertFrappeDateStringToReadableDate(value ?? defaultValue),
	);

	const onDateChange = (date?: string) => {
		if (date) {
			setDateInput(date);

			if (date.trim().length === 10) {
				const parsedDate = moment(date, "DD-MM-YYYY");
				if (minDate && parsedDate.isBefore(minDate)) {
					onChange("");
					return;
				}

				if (maxDate && parsedDate.isAfter(maxDate)) {
					onChange("");
					return;
				}

				const formattedDate = parsedDate.format(FRAPPE_DATE_FORMAT);
				if (formattedDate === "Invalid date") {
					onChange("");
				} else {
					onChange(formattedDate);
				}
			}
		} else {
			setDateInput("");
			onChange("");
		}
	};

	useEffect(() => {
		// custom button for AirDatepicker
		const button: AirDatepickerButton = {
			content: "Today",
			// className: 'custom-button-classname',
			attrs: {
				type: "button",
			},
			onClick: (dp) => {
				const date = today("obj");
				dp.selectDate(date);
				dp.setViewDate(date);
			},
		};

		if (inputRef.current) {
			// initialize AirDatepicker instance
			dp.current = new AirDatepicker(inputRef.current, {
				locale: localeEn,
				inline: false,
				buttons: button,
				keyboardNav: false,
				autoClose: true,
				classes: id,
				showEvent: "click",
				dateFormat: "dd-MM-yyyy",
				minDate,
				maxDate,
				container: `#datepicker-date-picker-value-component`,
				selectedDates: value
					? [moment(value, FRAPPE_DATE_FORMAT).toDate()]
					: defaultValue
						? [moment(defaultValue, FRAPPE_DATE_FORMAT).toDate()]
						: [],
				...props,
				onSelect: (formattedDate) => {
					onDateChange(formattedDate.formattedDate as string);
				},
			});
		}

		return () => {
			dp?.current?.destroy();
		};
	}, [minDate, maxDate, defaultValue, id]);

	useEffect(() => {
		if (dp.current) {
			const date = moment(value ?? defaultValue, FRAPPE_DATE_FORMAT);
			dp.current.selectDate(date.toDate(), {
				silent: true,
			});
		}
		setDateInput(
			convertFrappeDateStringToReadableDate(value ?? defaultValue)
		)
	}, [value, defaultValue]);

	const showCalendar = () => {
		if (!disabled && !readOnly) {
			inputRef.current?.focus();
			inputRef.current?.click();
		}
	};

	return (
		<div
			style={{
				position: "relative",
				display: "flex",
				alignItems: "center",
				width: "100%",
			}}
		>
			<div style={{ flex: 1 }}>
				<input
					type="text"
					autoCapitalize="off"
					autoComplete="off"
					autoCorrect="off"
					style={{
						width: "100%",
						padding: "8px 36px 8px 12px", // Add padding to leave space for the calendar icon
						border: "1px solid",
						borderColor: "#d1d5db", // Default border color
						borderRadius: "4px",
						outline: "none",
						fontSize: "14px",
						backgroundColor: readOnly ? "#f9fafb" : "white",
						pointerEvents: readOnly ? "none" : "auto",
					}}
					ref={inputRef}
					required={required}
					readOnly={readOnly}
					disabled={disabled}
					value={dateInput}
					placeholder="dd-mm-yyyy"
					onChange={(e) => onDateChange(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							inputRef.current?.blur();
						}
					}}
					{...inputProps}
				/>
			</div>
			<div
				style={{
					position: "absolute",
					right: "12px",
					cursor: "pointer",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
				onClick={showCalendar}
			>
				<FiCalendar color="gray.400" />
			</div>
		</div>
	);
};

export const DateTimePickerValueComponent = ({
	value,
	onChange,
	readOnly,
	defaultValue,
	disabled,
	required,
	inputProps,
	id,
	...props
}: DatePickerValueComponentProps) => {
	// inputRef for Input element and dp for AirDatepicker instance
	const inputRef = useRef<HTMLInputElement | null>(null);
	const dp = useRef<AirDatepicker | null>(null);

	// dateInput is the value of the Input element
	const [dateInput, setDateInput] = useState<string>(
		convertFrappeTimestampToReadableDateTime(value ?? defaultValue, "DD-MM-YYYY hh:mm A",),
	);

	useEffect(() => {
		if (value === "") {
			setDateInput("");
		} else {
			setDateInput(convertFrappeTimestampToReadableDateTime(value ?? defaultValue, "DD-MM-YYYY hh:mm A",));
		}
	}, [value]);

	useEffect(() => {
		// custom button for AirDatepicker
		const button: AirDatepickerButton = {
			content: "Today",
			// className: 'custom-button-classname',
			attrs: {
				type: "button",
			},
			onClick: (dp) => {
				const date = today("obj");
				dp.selectDate(date, {
					updateTime: true,
				});
				dp.setViewDate(date);
			},
		};

		if (inputRef.current) {
			// initialize AirDatepicker instance
			dp.current = new AirDatepicker(inputRef.current, {
				locale: localeEn,
				inline: false,
				buttons: button,
				keyboardNav: false,
				timepicker: true,
				classes: id,
				timeFormat: "hh:mm AA",
				showEvent: "click",
				dateFormat: "dd-MM-yyyy",
				autoClose: false,
				container: `#datepicker-date-time-picker-value-component`,
				...props,
				onSelect: (formattedDate) => {
					setDateInput(formattedDate.formattedDate as string);
				},
			});
		}

		return () => {
			dp?.current?.destroy();
		};
	}, [id]);

	useEffect(() => {
		if (dp.current && (value || defaultValue)) {
			dp.current.selectDate(value ?? defaultValue ?? "", {
				updateTime: true,
				silent: true,
			});
		}
	}, [value, defaultValue]);

	const validate = (value: string) => {
		const date = moment(value, "DD-MM-YYYY hh:mm A");
		return date.format(FRAPPE_DATETIME_FORMAT);
	};

	const onBlur = (e: ChangeEvent<HTMLInputElement>) => {
		if (e.target.value) {
			const date = validate(dateInput);

			if (date !== value) {
				// if date is valid, set the value of the field in the form else show error toast and set previous value of the field to the Input element
				if (date !== "Invalid date") {
					onChange(date);
				} else {
					setDateInput(
						convertFrappeTimestampToReadableDateTime(value ?? defaultValue),
					);
					toast("Invalid Date", {
						description: "Please enter a valid date",
						duration: 3000,
						cancel: true,
					});
				}
			}
		}
	};

	const showCalendar = () => {
		if (!disabled && !readOnly) {
			inputRef.current?.focus();
			inputRef.current?.click();
		}
	};

	return (
		<div
			style={{
				position: "relative",
				display: "flex",
				alignItems: "center",
				width: "100%",
			}}
			id={`datepicker-date-time-picker-value-component`}
		>
			<div style={{ flex: 1 }}>
				<input
					type="text"
					autoCapitalize="off"
					autoComplete="off"
					autoCorrect="off"
					style={{
						width: "100%",
						padding: "8px 36px 8px 12px", // Add padding to leave space for the calendar icon
						border: "1px solid",
						borderColor: "#d1d5db", // Default border color
						borderRadius: "4px",
						outline: "none",
						fontSize: "14px",
						backgroundColor: readOnly ? "#f9fafb" : "white",
						pointerEvents: readOnly ? "none" : "auto",
					}}
					ref={inputRef}
					onBlur={onBlur}
					required={required}
					readOnly={readOnly}
					disabled={disabled}
					value={dateInput}
					placeholder="dd-mm-yyyy hh:mm a"
					onChange={(e) => setDateInput(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							inputRef.current?.blur();
						}
					}}
					{...inputProps}
				/>
			</div>
			<div
				style={{
					position: "absolute",
					right: "12px",
					cursor: "pointer",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
				onClick={showCalendar}
			>
				<FiCalendar color="gray.400" />
			</div>
		</div>
	);
};

export interface TimePickerValueComponentProps
  extends Partial<
    Omit<DatePickerProps, "onChange" | "selectedValue" | "customInput">
  > {
  value: string;
  onChange: (value: string) => void;
}

export const TimePickerValueComponent = forwardRef(
	({ value, onChange, ...props }: TimePickerValueComponentProps, ref) => {
		const datePickerRef = useRef(null);

		const handleInputChange = (event: React.KeyboardEvent<HTMLDivElement>) => {
			if (event.key === "Enter") {
				// Close the date picker by clicking outside of it
				event.preventDefault();

				//@ts-expect-error handleInputChange
				datePickerRef?.current?.setOpen(false);
			}
			if (event.key === "Tab") {
				// @ts-expect-error handleInputChange
				datePickerRef?.current?.setOpen(false);
			}
		};

		const show = () => {
			if (datePickerRef.current) {
				//@ts-expect-error handleInputChange
				datePickerRef?.current?.setOpen(true);
			}
		};

		useImperativeHandle(ref, () => ({
			show,
		}));

		return (
			<div className={"light-theme"}>
				<DatePicker
					ref={datePickerRef}
					className="react-datapicker__input-text"
					selected={value ? convertTimeStringToDate(value) : null}
					onChange={(v) => onChange(convertDateToTimeString(v))}
					showTimeSelect
					placeholderText="hh:mm a"
					showTimeSelectOnly
					timeIntervals={15}
					timeCaption="Time"
					dateFormat="hh:mm aa"
					// @ts-expect-error handleInputChange
					onKeyDown={handleInputChange}
					{...props}
				/>
			</div>
		);
	},
);

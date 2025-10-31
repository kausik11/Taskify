import {
	Controller,
	RegisterOptions,
	UseControllerProps,
	useController,
	useFormContext,
	useWatch,
} from "react-hook-form";
import DatePicker, { DatePickerProps } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./date-picker.css";
import AirDatepicker, {
	AirDatepickerButton,
	AirDatepickerOptions,
} from "air-datepicker";
import "air-datepicker/air-datepicker.css";
import localeEn from "air-datepicker/locale/en";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import moment from "moment-timezone";
import { FiCalendar } from "react-icons/fi";
import { toast } from "sonner";
import {
	convertTimeStringToDate,
	convertDateToTimeString,
	SYSTEM_TIMEZONE,
	convertFrappeDateStringToReadableDate,
	today,
	FRAPPE_DATE_FORMAT,
	convertFrappeTimestampToReadableDateTime,
	FRAPPE_DATETIME_FORMAT,
} from "@/utils/dateconversion";
import { FormHelperText } from "../FormControl";
import { Input } from "@/components/ui/input";

export interface DatePickerComponentProps
  extends Partial<
    Omit<DatePickerProps, "onChange" | "selectedValue" | "customInput">
  > {
  name: string;
  rules?: RegisterOptions;
  defaultValue?: string;
  readOnly?: boolean;
  disabled?: boolean;
  showTimeZone?: boolean;
  controllerProps?: Partial<
    Omit<UseControllerProps, "name" | "rules" | "control">
  >;
}

export const TimePicker = ({
	name,
	rules,
	controllerProps,
	showTimeZone = true,
	readOnly = false,
	disabled,
	...props
}: DatePickerComponentProps) => {
	const { control } = useFormContext();

	const datePickerRef = useRef(null);

	const handleInputChange = (event: React.KeyboardEvent<HTMLElement>) => {
		if (event.key === "Enter") {
			// Close the date picker by clicking outside of it
			event.preventDefault();

			//@ts-expect-error datePickerRef is not a function
			datePickerRef?.current?.setOpen(false);
		}
		if (event.key === "Tab") {
			// @ts-expect-error datePickerRef is not a function
			datePickerRef?.current?.setOpen(false);
		}
	};

	return (
		<>
			<Controller
				control={control}
				name={name}
				rules={rules}
				render={({ field }) => (
					<div className={"light-theme"}>
						{/* @ts-expect-error okay */}
						<DatePicker
							ref={datePickerRef}
							// className="react-datapicker__input-text"
							selected={
								field.value ? convertTimeStringToDate(field.value) : null
							}
							onChange={(v) =>
								field.onChange(v ? convertDateToTimeString(v) : null)
							}
							showTimeSelect
							placeholderText="hh:mm a"
							preventOpenOnFocus
							showTimeSelectOnly
							timeIntervals={15}
							readOnly={readOnly}
							timeCaption="Time"
							disabled={disabled}
							customInput={
								<Input
									// px={0}
									className="px-0 border-0 :focus-visible:border-0 focus-visible:outline-none"
									readOnly={readOnly}
									disabled={disabled}
								/>
							}
							dateFormat="hh:mm aa"
							onKeyDown={handleInputChange}
							{...props}
						/>
					</div>
				)}
				{...controllerProps}
			/>
			{showTimeZone && <FormHelperText>{SYSTEM_TIMEZONE}</FormHelperText>}
		</>
	);
};

export interface DatepickerProps extends AirDatepickerOptions {
  name: string;
  id?: string;
  rules?: RegisterOptions;
  defaultValue?: string;
  showTimeZone?: boolean;
  readOnly?: boolean;
  required?: boolean;
  allowOnSubmit?: boolean;
  disabled?: boolean;
  controllerProps?: Partial<
    Omit<UseControllerProps, "name" | "rules" | "control">
  >;
  inputProps?: any;
  hideCalendarIcon?: boolean;
}

export const DatePickerComponent = ({
	name,
	id = "",
	rules,
	defaultValue,
	minDate,
	maxDate,
	hideCalendarIcon = false,
	controllerProps,
	allowOnSubmit = false,
	showTimeZone = false,
	readOnly,
	disabled,
	required,
	inputProps,
	...props
}: DatepickerProps) => {
	const { control, getValues, watch } = useFormContext();

	const docstatus = watch("docstatus");
	const isFieldReadOnly =
    (docstatus === 1 && !allowOnSubmit) || docstatus === 2 || readOnly;

	// inputRef for Input element and dp for AirDatepicker instance
	const inputRef = useRef<HTMLInputElement | null>(null);
	const dp = useRef<AirDatepicker | null>(null);

	const {
		field,
		fieldState: { invalid },
	} = useController({
		name,
		control,
		rules,
		defaultValue,
		...controllerProps,
	});

	// dateInput is the value of the Input element
	const [dateInput, setDateInput] = useState<string>(
		convertFrappeDateStringToReadableDate(field.value ?? defaultValue),
	);

	const watchValue = useWatch({
		name: name,
		control,
		defaultValue: defaultValue,
	});
	/**
   * This leads to a bug where the datepicker is not updated when the value of the field in the form changes due to a form reset
   * Date Input (the text in the field that is visible to the user) is set to the value of the field in the form
   * when the value of the field in the form changes. This does not happen automatically.
   */
	useEffect(() => {
		setDateInput(convertFrappeDateStringToReadableDate(watchValue));
	}, [watchValue]);

	useEffect(() => {
		// custom button for AirDatepicker
		const button: AirDatepickerButton = {
			content: "Today",
			// className: 'custom-button-classname',
			attrs: {
				type: "button",
			},
			onClick: (dp) => {
				// selectDate and setViewDate are used to set the date of the AirDatepicker instance
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
				minDate: minDate ?? undefined,
				maxDate: maxDate ?? undefined,
				keyboardNav: false,
				showEvent: isFieldReadOnly ? "none" : "click",
				autoClose: false,
				// container is the id of the div element that wraps the Input element
				container: `#datepicker-${name.split(".").join("-")}${id ? `-${id}` : ""}`,
				dateFormat: "dd-MM-yyyy",
				...props,
				onShow: () => {
					const selectedDate = getValues(name) ?? defaultValue;
					if (selectedDate) {
						// selectDate is used to set the date of the AirDatepicker instance which is the value of field in the form

						//Converting to date object to prevent timezone issues
						const dateObj = moment(selectedDate).toDate();
						dp.current?.selectDate(dateObj, {
							// updateTime is used to update the time of the AirDatepicker instance particular to minute and second
							updateTime: true,
						});
					}
				},
				onSelect: (formattedDate) => {
					setDateInput(formattedDate.formattedDate as string);
				},
			});
		}

		return () => {
			dp?.current?.destroy();
		};
	}, [name, id, getValues, minDate, setDateInput, maxDate, isFieldReadOnly]);

	const validate = (value: string) => {
		// validate the date string. The date string is valid if it is not before minDate and not after maxDate
		const date = moment(value, "DD-MM-YYYY");
		if (minDate) {
			const isMin = date.isBefore(minDate ?? null, "date");
			return isMin ? "Invalid date" : date.format(FRAPPE_DATE_FORMAT);
		}
		if (maxDate) {
			const isMax = date.isAfter(maxDate ?? null, "date");
			return isMax ? "Invalid date" : date.format(FRAPPE_DATE_FORMAT);
		}
		return date.format(FRAPPE_DATE_FORMAT);
	};

	const onBlur = (
		e: ChangeEvent<HTMLInputElement>,
		onChange: (value: string) => void,
	) => {
		if (e.target.value) {
			const date = validate(dateInput);
			// if date is valid, set the value of the field in the form else show error toast and set previous value of the field to the Input element
			if (date !== "Invalid date") {
				// Only call onChange if the date has changed
				if (date !== field.value) {
					onChange(date);
					setDateInput(convertFrappeDateStringToReadableDate(date));
				}
			} else {
				setDateInput(
					convertFrappeDateStringToReadableDate(
						getValues(name) ?? defaultValue,
					),
				);
				toast("Invalid Date", {
					description: "Please enter a valid date",
					duration: 3000,
				});
			}
		} else {
			onChange("");
			setDateInput("");
		}

		field.onBlur();
	};

	const showCalendar = () => {
		if (!disabled && !isFieldReadOnly) {
			inputRef.current?.focus();
			inputRef.current?.click();
		}
	};

	return (
		<>
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
							borderColor: invalid ? "red" : "#d1d5db", // Red border if invalid
							borderRadius: "4px",
							outline: "none",
							fontSize: "14px",
							backgroundColor: isFieldReadOnly ? "#f9fafb" : "white",
							pointerEvents: isFieldReadOnly ? "none" : "auto",
						}}
						ref={(e) => {
							inputRef.current = e;
							field.ref(e);
						}}
						onBlur={(e) => onBlur(e, field.onChange)}
						required={required}
						readOnly={isFieldReadOnly}
						disabled={disabled || field.disabled}
						value={dateInput ?? ""}
						placeholder="dd-mm-yyyy"
						onChange={(e) => setDateInput(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								inputRef.current?.blur();
							}
						}}
						{...inputProps}
					/>
				</div>
				{!hideCalendarIcon && (
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
						<FiCalendar color="gray" size={16} />
					</div>
				)}
			</div>
			{showTimeZone && <FormHelperText>{SYSTEM_TIMEZONE}</FormHelperText>}
		</>
	);
};

export const DateTimePicker = ({
	name,
	id,
	rules,
	defaultValue,
	minDate,
	maxDate,
	controllerProps,
	showTimeZone = false,
	readOnly,
	disabled,
	required,
	inputProps,
	...props
}: DatepickerProps) => {
	const { control, setValue, getValues } = useFormContext();

	// inputRef for Input element and dp for AirDatepicker instance
	const inputRef = useRef<HTMLInputElement | null>(null);
	const dp = useRef<AirDatepicker | null>(null);

	const {
		field,
		fieldState: { invalid },
	} = useController({
		name,
		control,
		rules,
		defaultValue,
		...controllerProps,
	});

	const [dateInput, setDateInput] = useState<string>(
		convertFrappeTimestampToReadableDateTime(
			field.value ?? defaultValue,
			"DD-MM-YYYY hh:mm A",
		),
	);

	/**
   * Date Input (the text in the field that is visible to the user) is set to the value of the field in the form
   * when the value of the field in the form changes. This does not happen automatically.
   */
	useEffect(() => {
		convertFrappeTimestampToReadableDateTime(field.value);
	}, [field.value]);

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
				minDate: minDate ?? undefined,
				maxDate: maxDate ?? undefined,
				showEvent: "click",
				keyboardNav: false,
				timepicker: true,
				timeFormat: "hh:mm AA",
				autoClose: false,
				container: `#datepicker-${name.split(".").join("-")}${id ? `-${id}` : ""}`,
				dateFormat: "dd-MM-yyyy",
				...props,
				onShow: () => {
					// selectDate is used to set the date of the AirDatepicker instance which is the value of field in the form
					const selectedDate = getValues(name) ?? defaultValue;
					if (selectedDate) {
						// Convert to date object to prevent timezone issues
						const dateObj = moment(selectedDate).toDate();
						dp.current?.selectDate(dateObj, {
							updateTime: true,
						});
					}
				},
				onSelect: (formattedDate) => {
					// setValue(name, convertDateTimeToString(formattedDate.date as Date), {
					setDateInput(formattedDate.formattedDate as string);
				},
			});
		}

		return () => {
			dp?.current?.destroy();
		};
	}, [name, setValue, minDate, maxDate, id, getValues]);

	const validate = (value: string) => {
		const date = moment(value, "DD-MM-YYYY hh:mm A");
		if (minDate) {
			const isMin = date.isBefore(minDate ?? null);
			return isMin ? "Invalid date" : date.format(FRAPPE_DATETIME_FORMAT);
		}
		if (maxDate) {
			const isMax = date.isAfter(maxDate ?? null);
			return isMax ? "Invalid date" : date.format(FRAPPE_DATETIME_FORMAT);
		}
		return date.format(FRAPPE_DATETIME_FORMAT);
	};

	const onBlur = (
		e: ChangeEvent<HTMLInputElement>,
		onChange: (value: string) => void,
	) => {
		if (e.target.value) {
			const date = validate(dateInput);

			// if date is valid, set the value of the field in the form else show error toast and set previous value of the field to the Input element
			if (date !== "Invalid date") {
				// Only call onChange if the date has changed
				if (date !== field.value) {
					onChange(date);
					setDateInput(
						convertFrappeTimestampToReadableDateTime(
							date,
							"DD-MM-YYYY hh:mm A",
						),
					);
				}
			} else {
				setDateInput(
					convertFrappeTimestampToReadableDateTime(
						getValues(name) ?? defaultValue,
						"DD-MM-YYYY hh:mm A",
					),
				);
				toast("Invalid Date", {
					description: "Please enter a valid date",
					duration: 3000,
				});
			}
		} else {
			onChange("");
			setDateInput("");
		}
	};

	const showCalendar = () => {
		if (!disabled && !readOnly) {
			inputRef.current?.focus();
			inputRef.current?.click();
		}
	};

	return (
		<>
			<div
				style={{
					position: "relative",
					display: "flex",
					alignItems: "center",
					width: "100%",
				}}
				id={`datepicker-${name.split(".").join("-")}${id ? `-${id}` : ""}`}
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
							borderColor: invalid ? "red" : "#d1d5db", // Red border if invalid
							borderRadius: "4px",
							outline: "none",
							fontSize: "14px",
							backgroundColor: readOnly ? "#f9fafb" : "white",
							pointerEvents: readOnly ? "none" : "auto",
						}}
						ref={(e) => {
							inputRef.current = e;
							field.ref(e);
						}}
						onBlur={(e) => onBlur(e, field.onChange)}
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
					<FiCalendar color="gray" size={16} />
				</div>
			</div>
			{showTimeZone && <FormHelperText>{SYSTEM_TIMEZONE}</FormHelperText>}
		</>
	);
};

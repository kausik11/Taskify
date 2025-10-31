import moment, { Moment } from "moment-timezone";

export const FRAPPE_DATETIME_FORMAT = "YYYY-MM-DD HH:mm:ss";
export const FRAPPE_DATE_FORMAT = "YYYY-MM-DD";
export const FRAPPE_TIME_FORMAT = "HH:mm:ss";
const DEFAULT_TIME_ZONE = "Asia/Kolkata";
// @ts-expect-error time zone
export const SYSTEM_TIMEZONE =
  window.frappe?.boot?.time_zone?.system || DEFAULT_TIME_ZONE;

/**
 * Utility to convert Date object to YYYY-MM-DD format
 * @param date takes Javascript Date object
 * @returns Date string in YYYY-MM-DD format
 */
export const convertMomentToStringDate = (moment: Moment) => {
	if (moment) {
		return moment.format("YYYY/MM/DD").replace(/\//g, "-");
	}
	return "";
};

/**
 * Utility to convert String date to Moment
 * @param date takes String date
 * @returns Moment
 */
export const convertStringDateToMoment = (
	date: string,
	format: string = "YYYY/MM/DD",
) => {
	if (date) {
		return moment(date, format);
	}
	return null;
};

/**
 * Utility to convert Date object to YYYY-MM-DD format
 * @param date takes Javascript Date object
 * @returns Date string in YYYY-MM-DD format
 */
export const convertMomentToStringDateTime = (moment: Moment) => {
	if (moment) {
		return moment.format("YYYY/MM/DD HH:mm:ss").replace(/\//g, "-");
	}
	return "";
};

/**
 * Utility to convert String date to Moment
 * @param date takes String date
 * @returns Moment
 */
export const convertStringDateTimeToMoment = (date: string) => {
	if (date) {
		return moment(date, "YYYY/MM/DD HH:mm:ss");
	}
	return null;
};

/**
 * Utility time string to 12 hour format
 * @param time takes time string
 * @returns time string in 12 hour format
 */
export const timeTo12HrFormat = (time: string) => {
	if (time) {
		const [hours, minutes] = time.split(":");
		const paddedHours = String(hours).padStart(2, "0");
		const paddedMinutes = String(minutes).padStart(2, "0");

		return `${paddedHours}:${paddedMinutes}`;
	}
	return "";
};

/**
 * Function to sort an array of object by date
 * @param arr Array to sort
 * @param field date field name
 * @returns
 */

export const sortByDate = (arr: any[], field: string) => {
	let array: any[] = [];
	array = arr.sort(
		(a, b) => moment(b[field]).valueOf() - moment(a[field]).valueOf(),
	);
	return array;
};

/**
 * Function to convert a date string (YYYY-MM-DD) to a date object
 */
export const convertStringToDate = (date?: string) => {
	if (date) {
		const dates = date.split("-");
		return new Date(
			parseInt(dates[0]),
			parseInt(dates[1]) - 1,
			parseInt(dates[2]),
		);
	}
	return null;
};

/**
 * Function to convert a date object to a date string (YYYY-MM-DD)
 */
export const convertDateToString = (date?: Date | null) => {
	if (date) {
		return moment(date).format("YYYY-MM-DD");
	}
	return "";
};
/**
 * Function to convert a date object to a time string (HH:mm:ss)
 */
export const convertDateToTimeString = (date?: Date | null) => {
	if (date) {
		return moment(date).format("HH:mm:ss");
	}
	return "";
};

/**
 *
 * @param date A frappe datetime string in the format YYYY-MM-DD HH:mm:ss
 */
export const convertDateTimeStringtoReadableDateString = (
	date?: string,
	format: string = "DD/MM/YYYY",
) => {
	if (date) {
		return moment(date).format(format);
	}
	return "";
};

/**
 * Function to convert a date time string to a date time object
 */
export const convertStringToDateTime = (date?: string) => {
	if (date) {
		return moment(date, "YYYY/MM/DD HH:mm:ss").toDate();
	}
	return null;
};

/**
 * Function to convert a date time object to a date time string
 */
export const convertDateTimeToString = (
	date?: Date | null,
	format: string = "YYYY-MM-DD HH:mm:ss",
) => {
	if (date) {
		return moment(date).format(format);
	}
	return "";
};

/**
 * Function to convert a time string to a time object
 * @param time A time string in the format HH:mm:ss
 * @returns
 */
export const convertTimeStringToDate = (time?: string) => {
	if (time) {
		return moment(time, "HH:mm:ss").toDate();
	}
	return null;
};

// NEW Functions to be used
// Functions to convert Frappe Timestamp (in string) to readable formats

/**
 * Converts Frappe datetime timestamp to readable string
 * @param timestamp A frappe timestamp string in the format YYYY-MM-DD HH:mm:ss
 * @param format Format can include both date and time formats
 * @returns
 */
export const convertFrappeTimestampToReadableDate = (
	timestamp?: string,
	format: string = "DD-MM-YYYY",
) => {
	if (timestamp) {
		return moment(timestamp, "YYYY-MM-DD HH:mm:ss").format(format);
	}
	return "";
};

/**
 * Converts Frappe datetime timestamp to readable string
 * @param timestamp A frappe timestamp string in the format YYYY-MM-DD HH:mm:ss
 * @param format Format can include both date and time formats
 * @returns
 */
export const convertFrappeTimestampToReadableDateTime = (
	timestamp?: string,
	format: string = "DD-MM-YYYY hh:mm A",
) => {
	if (timestamp) {
		return convertFrappeTimestampToReadableDate(timestamp, format);
	}
	return "";
};

export const convertFrappeTimestampToReadableTime = (
	timestamp?: string,
	format: string = "hh:mm A",
) => {
	if (timestamp) {
		return moment(timestamp, "YYYY-MM-DD HH:mm:ss").format(format);
	}
	return "";
};
/**
 * Converts Frappe date timestamp to readable string
 * @param date A frappe date string in the format YYYY-MM-DD
 * @param format Format can only include date formats
 * @returns
 */
export const convertFrappeDateStringToReadableDate = (
	date?: string,
	format: string = "DD-MM-YYYY",
) => {
	if (date) {
		return moment(date, "YYYY-MM-DD").format(format);
	}
	return "";
};

/**
 * Converts Frappe time timestamp to readable string
 * @param time A frappe time string in the format HH:mm:ss
 * @param format Format can only include time formats
 * @returns
 */
export const convertFrappeTimeStringToReadableTime = (
	time?: string,
	format: string = "hh:mm:ss A",
) => {
	if (time) {
		return moment(time, "HH:mm:ss").format(format);
	}
	return "";
};

/**
 * Converts a Frappe timestamp to a readable time ago string
 * @param timestamp A frappe timestamp string in the format YYYY-MM-DD HH:mm:ss
 * @param withoutSuffix remove the suffix from the time ago string
 * @returns
 */
export const convertFrappeTimestampToTimeAgo = (
	timestamp?: string,
	withoutSuffix?: boolean,
	showHours?: boolean // <-- add this param
) => {
	if (timestamp) {
		const date = convertFrappeTimestampToUserTimezone(timestamp);

		if (showHours) {
			const now = moment();
			const duration = moment.duration(now.diff(date));
			const days = Math.floor(duration.asDays());
			const hours = duration.hours();
			const minutes = duration.minutes();

			let result = [];
			if (days > 0) result.push(`${days} day${days > 1 ? "s" : ""}`);
			if (hours > 0) result.push(`${hours} hour${hours > 1 ? "s" : ""}`);
			if (days === 0 && hours === 0) result.push(`${minutes} minute${minutes !== 1 ? "s" : ""}`);

			return result.join(" ") + (withoutSuffix ? "" : " ago");
		}

		return date.fromNow(withoutSuffix);
	}
	return "";
};

export const convertFrappeTimestampToUserTimezone = (
	timestamp: string,
): Moment => {
	// @ts-expect-error time zone
	const systemTimezone = window.frappe?.boot?.time_zone?.system;
	// @ts-expect-error time zone
	const userTimezone = window.frappe?.boot?.time_zone?.user;

	if (systemTimezone && userTimezone) {
		return moment.tz(timestamp, systemTimezone).clone().tz(userTimezone);
	} else {
		return moment(timestamp);
	}
};

/**
 * Converts a Frappe date to a readable time ago string
 * @param date A frappe date string in the format YYYY-MM-DD
 * @param withoutSuffix remove the suffix from the time ago string
 * @returns
 */
export const convertFrappeDateStringToTimeAgo = (
	date?: string,
	withoutSuffix?: boolean,
) => {
	if (date) {
		const userDate = convertFrappeTimestampToUserTimezone(date);
		return userDate.fromNow(withoutSuffix);
	}
	return "";
};

export const getAgeFromFrappeTimestamp = (
	date?: string,
	diff: moment.unitOfTime.Diff = "days",
) => {
	if (date) {
		const userDate = convertFrappeTimestampToUserTimezone(date);
		return moment().diff(userDate, diff);
	}
	return "";
};

/** Get the difference (date1 - date2) */
export const getDifferenceBetweenDates = (
	date1: string,
	date2: string,
	diff: moment.unitOfTime.Diff = "days",
) => {
	const d1 = moment(date1, FRAPPE_DATE_FORMAT);
	const d2 = moment(date2, FRAPPE_DATE_FORMAT);

	return d1.diff(d2, diff);
};

/**
 * Function returns today's date in various formats
 * @param return_form
 * @returns
 */
function getToday(return_form: "obj"): Date;
function getToday(return_form: "moment"): Moment;
function getToday(return_form?: "datetime"): string;
function getToday(return_form?: "date"): string;
function getToday(return_form?: "time"): string;
function getToday(return_form = "datetime") {
	if (return_form === "moment") {
		return moment().tz(SYSTEM_TIMEZONE);
	} else if (return_form === "obj") {
		return moment().tz(SYSTEM_TIMEZONE).toDate();
	} else if (return_form === "date") {
		return moment().tz(SYSTEM_TIMEZONE).format(FRAPPE_DATE_FORMAT);
	} else if (return_form === "time") {
		return moment().tz(SYSTEM_TIMEZONE).format(FRAPPE_TIME_FORMAT);
	} else {
		return moment().tz(SYSTEM_TIMEZONE).format(FRAPPE_DATETIME_FORMAT);
	}
}

export const today = getToday;

/**
 * Function returns difference between two dates in years, months and days
 * @param date1
 * @param date2
 * @returns { years: number, months: number, days: number}
 */
export const getDifference = (date1: string, date2: string) => {
	const d1 = moment(date1, FRAPPE_DATE_FORMAT);
	const d2 = moment(date2, FRAPPE_DATE_FORMAT);

	const years = d2.diff(d1, "year");
	d1.add(years, "years");

	const months = d2.diff(d1, "months");
	d1.add(months, "months");

	const days = d2.diff(d1, "days");

	return { years, months, days };
};

/**
 * Validates a date string against multiple formats.
 * @param d The date string to validate.
 * @returns {boolean} True if the date is valid in any of the specified formats, false otherwise.
 */
export const isValidDate = (d?: string): boolean => {
	if (!d) {
		return false;
	}
	const date = d.split(".")[0];
	return moment(
		date,
		[FRAPPE_DATE_FORMAT, FRAPPE_DATETIME_FORMAT, FRAPPE_TIME_FORMAT],
		true,
	).isValid();
};

// Helper function to add days to a date
export const addDays = (dateStr: string, days: number): string => {
	const date = new Date(dateStr);
	date.setDate(date.getDate() + days);
	return date.toISOString().split("T")[0]; // Returns date in 'YYYY-MM-DD' format
};

export const addDateHours = (dateStr: Date | null, hours: number): string => {
	if (!dateStr) {
		return "";
	}
	const date = new Date(dateStr);
	date.setHours(date.getHours() + hours);
	return date.toISOString();
};

export const nextDay = (date: string): string => {
	const d = new Date(date);
	d.setDate(d.getDate() + 1);
	return d.toISOString();
};

/**
 * Utility to convert string to Frappe datetime format (YYYY-MM-DD HH:MM:SS)
 * Assumes the input string is a valid Date string recognizable by the Date constructor
 * @param dateString takes string that can be converted to a Javascript Date object
 * @returns Datetime string in Frappe format
 */
export const toFrappeDatetimeFormatFromString = (
	dateString: string,
): string => {
	const date = new Date(dateString);

	const datePart = [
		date.getFullYear(),
		(date.getMonth() + 1).toString().padStart(2, "0"), // Months are 0-based
		date.getDate().toString().padStart(2, "0"),
	].join("-");

	const timePart = [
		date.getHours().toString().padStart(2, "0"),
		date.getMinutes().toString().padStart(2, "0"),
		date.getSeconds().toString().padStart(2, "0"),
	].join(":");

	return `${datePart} ${timePart}`;
};

export const formatStringDateToFrappeFormat = (date?: string) => {
	if (!date) return "";
	// format date in from 'YYYY-MM-DD' to 'MM-DD-YYYY'
	const dates = date.split("-");
	return dates[1] + "-" + dates[2] + "-" + dates[0];
};

export const formatDuration = (duration: number) => {
	// Duration in number of seconds

	if (duration === 0) {
		return "0 seconds";
	}

	// Format it to sentence like '1 hour 2 minutes 3 seconds'
	const hours = Math.floor(duration / 3600);
	const minutes = Math.floor((duration % 3600) / 60);
	const seconds = duration % 60;

	// Remove 0s
	const formattedHours =
    hours > 0 ? `${hours} hour${hours > 1 ? "s" : ""} ` : "";
	const formattedMinutes =
    minutes > 0 ? `${minutes} minute${minutes > 1 ? "s" : ""} ` : "";
	const formattedSeconds =
    seconds > 0 ? `${seconds} second${seconds > 1 ? "s" : ""}` : "";

	return `${formattedHours}${formattedMinutes}${formattedSeconds}`;
};

/**
 * Returns the first day of the year for a given date string
 * @param dateString The date string
 */
export const getFirstDateOfYear = (dateString: string) => {
	// Parse the input date
	const date = moment(dateString);

	// Return the first day of that year
	return moment({ year: date.year(), month: 0, day: 1 }).format("YYYY-MM-DD");
};

export const convertFrappeTimestampToCalendarTime = (
	timestamp?: string
): string => {
	if (timestamp) {
		return moment(timestamp, "YYYY-MM-DD HH:mm:ss").format("D MMMM hh:mmA");
	}
	return "";
};
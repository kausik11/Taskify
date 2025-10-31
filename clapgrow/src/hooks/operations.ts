/**
 * Function to check if a string exists in a list
 * @param list
 * @param item
 * @returns
 */
export const in_list = (list: string[], item?: string): boolean => {
	if (item === undefined) return false;

	return list.includes(item);
};

/**
 * Function to check if an object is empty
 * @param obj
 * @returns
 */
export const isEmpty = (obj: object) => {
	return Object.keys(obj).length === 0;
};

export const flt = (
	value?: number | string | null,
	decimals?: number,
	rounding_method?: string,
) => {
	if (value === undefined || value === null || value === "") return 0;

	if (typeof value !== "number") {
		value = Number(
			typeof value === "string" ? value?.split(",")?.join("") : value,
		);

		if (isNaN(value)) return 0;
	}

	//TODO: We need to round the value here
	if (decimals !== undefined && decimals !== null) {
		return _round(value, decimals, rounding_method);
	}

	return value;
};

const _round = (num: number, precision: number, rounding_method?: string) => {
	// @ts-expect-error
	rounding_method =
    rounding_method ||
    window.frappe?.boot?.sysdefaults?.rounding_method ||
    "Banker's Rounding (legacy)";

	let is_negative = num < 0 ? true : false;

	if (rounding_method == "Banker's Rounding (legacy)") {
		var d = cint(precision);
		var m = Math.pow(10, d);
		var n = +(d ? Math.abs(num) * m : Math.abs(num)).toFixed(8); // Avoid rounding errors
		var i = Math.floor(n),
			f = n - i;
		var r = !precision && f == 0.5 ? (i % 2 == 0 ? i : i + 1) : Math.round(n);
		r = d ? r / m : r;
		return is_negative ? -r : r;
	} else if (rounding_method == "Banker's Rounding") {
		if (num == 0) return 0.0;
		precision = cint(precision);

		let multiplier = Math.pow(10, precision);
		num = Math.abs(num) * multiplier;

		let floor_num = Math.floor(num);
		let decimal_part = num - floor_num;

		// For explanation of this method read python flt implementation notes.
		let epsilon = 2.0 ** (Math.log2(Math.abs(num)) - 52.0);

		if (Math.abs(decimal_part - 0.5) < epsilon) {
			num = floor_num % 2 == 0 ? floor_num : floor_num + 1;
		} else {
			num = Math.round(num);
		}
		num = num / multiplier;
		return is_negative ? -num : num;
	} else if (rounding_method == "Commercial Rounding") {
		if (num == 0) return 0.0;

		let digits = cint(precision);
		let multiplier = Math.pow(10, digits);

		num = num * multiplier;

		// For explanation of this method read python flt implementation notes.
		let epsilon = 2.0 ** (Math.log2(Math.abs(num)) - 52.0);
		if (is_negative) {
			epsilon = -1 * epsilon;
		}

		num = Math.round(num + epsilon);
		return num / multiplier;
	} else {
		throw new Error(`Unknown rounding method ${rounding_method}`);
	}
};

export const cint = (v: any, def?: any) => {
	if (v === true) return 1;
	if (v === false) return 0;
	v = v + "";
	if (v !== "0") v = lstrip(v, ["0"]);
	v = parseInt(v); // eslint-ignore-line
	if (isNaN(v)) v = def === undefined ? 0 : def;
	return v;
};

export const lstrip = (s: string, chars?: string[]) => {
	if (!chars) chars = ["\n", "\t", " "];
	// strip left
	let first_char = s.substring(0, 1);
	while (chars.includes(first_char)) {
		s = s.substring(1);
		first_char = s.substring(0, 1);
	}
	return s;
};

/**
 * TODO: Add support for docfield by fetching precision per field from doctype meta
 * Utility function to get the precision of a field
 * @param fieldname
 * @param doctype
 * @param docname
 * @returns
 */
export const precision = (fieldname?: string, doc?: any) => {
	// if (cur_frm) {
	// 	if (!doc) doc = cur_frm.doc;
	// 	var df = frappe.meta.get_docfield(doc.doctype, fieldname, doc.parent || doc.name);
	// 	if (!df) ");
	// 	return frappe.meta.get_field_precision(df, doc);
	// } else {
	// @ts-expect-error
	return window.frappe?.boot?.sysdefaults?.float_precision ?? 3;
	// }
};

/**
 * makeid - generates a random string of length l
 * @param l - length of the string
 * @returns a random string of length l
 */
export const makeid = (l: number, add_date = true): string => {
	var text = "";
	var char_list =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (var i = 0; i < l; i++) {
		text += char_list.charAt(Math.floor(Math.random() * char_list.length));
	}

	if (!add_date) return text;
	return text + Date.now();
};

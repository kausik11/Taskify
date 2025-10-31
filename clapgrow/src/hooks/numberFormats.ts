export const formatCurrency = (
	value?: number,
	currency: string = "USD",
	returnPlaceholder = false,
) => {
	let CurrencyFormat = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
	if (value !== undefined && value !== null) {
		return CurrencyFormat.format(value);
	} else {
		return returnPlaceholder ? CurrencyFormat.format(0) : "";
	}
};

export const formatNumber = (
	value?: number,
	locale: string = "en-US",
	options?: Intl.NumberFormatOptions,
	defaultReturnValue: string = "",
) => {
	if (value !== undefined && value !== null) {
		return new Intl.NumberFormat(locale, options).format(value);
	} else {
		return defaultReturnValue;
	}
};

export const formatPercentage = (
	value?: number,
	returnPlaceholder = false,
	precision?: number,
) => {
	let PercentFormat = new Intl.NumberFormat("en-US", {
		style: "percent",
		minimumFractionDigits: 2,
		maximumFractionDigits: precision || 3,
	});
	if (value !== undefined && value !== null) {
		return PercentFormat.format(value / 100);
	} else {
		return returnPlaceholder ? PercentFormat.format(0) : "";
	}
};

export const formatMileage = (
	value?: number,
	locale: string = "en-US",
	options?: Intl.NumberFormatOptions,
	returnPlaceholder = false,
) => {
	if (value !== undefined && value !== null) {
		return formatNumber(value, locale, {
			style: "unit",
			unit: "mile",
			...options,
		});
	} else {
		return returnPlaceholder
			? formatNumber(0, locale, { style: "unit", unit: "mile", ...options })
			: "";
	}
};

export const formatFileSize = (value: number): string => {
	value = Math.floor(value);
	if (value > 1048576) {
		return (value / 1048576).toFixed(2) + "M";
	} else if (value > 1024) {
		return (value / 1024).toFixed(2) + "K";
	}
	return value.toString();
};

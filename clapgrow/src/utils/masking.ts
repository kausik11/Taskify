import { parsePhoneNumber, isPossiblePhoneNumber } from "libphonenumber-js";

export const maskPhoneNumber = (phoneNumber: string | undefined) => {
	// Remove all non-digit characters
	if (!phoneNumber || phoneNumber.length < 6) {
		return "";
	}

	if (phoneNumber.startsWith("+")) {
		return parsePhoneNumber(phoneNumber).formatInternational();
	} else if (isPossiblePhoneNumber(`+1${phoneNumber}`)) {
		return `+1 ${parsePhoneNumber(`+1${phoneNumber}`).formatNational()}`;
	}

	return phoneNumber;
};
export const unmaskPhoneNumber = (maskedPhoneNumber: string) => {
	if (maskedPhoneNumber && maskedPhoneNumber.length > 1) {
		const cleaned = maskedPhoneNumber.replace(/\D/g, "");
		return cleaned;
	}
	return "";
};

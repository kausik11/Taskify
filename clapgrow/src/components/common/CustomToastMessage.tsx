import { toast } from "sonner";

interface ToastStyles {
  background: string;
  borderLeft: string;
  color: string;
  padding: string;
  borderRadius: string;
  fontSize: string;
  fontWeight: string;
}

const baseToastStyles: Partial<ToastStyles> = {
	color: "#2D2C37",
	padding: "12px",
	borderRadius: "8px",
	fontSize: "14px",
	fontWeight: "500",
};

const TOAST_VARIANTS = {
	warning: {
		styles: {
			...baseToastStyles,
			background: "#FFEDED",
			borderLeft: "1px solid #D72727",
		},
		icon: (
			<svg
				width="20"
				height="20"
				viewBox="0 0 20 20"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M8.27628 4.93053C9.04958 3.61593 10.9507 3.61593 11.724 4.93052L18.2273 15.9859C19.0116 17.3192 18.0503 19 16.5034 19H3.49686C1.95002 19 0.988711 17.3192 1.773 15.9859L8.27628 4.93053Z"
					fill="#D72727"
				/>
				<path
					d="M10.7652 9.27344L10.6534 12.9666H9.3575L9.24578 9.27344H10.7652ZM10.0055 16.2734C9.7299 16.2734 9.49343 16.1748 9.29606 15.9774C9.09869 15.78 9 15.5435 9 15.268C9 14.9924 9.09869 14.7559 9.29606 14.5585C9.49343 14.3612 9.7299 14.2625 10.0055 14.2625C10.281 14.2625 10.5175 14.3612 10.7149 14.5585C10.9123 14.7559 11.0109 14.9924 11.0109 15.268C11.0109 15.4504 10.9644 15.618 10.8713 15.7707C10.7819 15.9234 10.6609 16.0463 10.5082 16.1394C10.3592 16.2288 10.1917 16.2734 10.0055 16.2734Z"
					fill="white"
				/>
			</svg>
		),
	},
	success: {
		styles: {
			...baseToastStyles,
			background: "#EEFDF1",
			borderLeft: "1px solid #0CA866",
		},
		icon: (
			<svg
				width="20"
				height="20"
				viewBox="0 0 20 20"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<rect width="20" height="20" rx="10" fill="#0CA866" />
				<path
					d="M6.38867 10.2778L8.61089 12.5L13.6109 7.5"
					stroke="#EFF9FF"
					strokeWidth="1.4"
					stroke-linecap="round"
				/>
			</svg>
		),
	},
	neutral: {
		styles: {
			...baseToastStyles,
			background: "#EFF9FF",
			borderLeft: "1px solid #0076BD",
		},
		icon: null,
	},
};

const DEFAULT_TOAST_CONFIG = {
	duration: 1000,
	position: "top-right" as const,
};

export const customToast = {
	warning: (message: string) => {
		toast.warning(message, {
			...DEFAULT_TOAST_CONFIG,
			style: TOAST_VARIANTS.warning.styles,
			icon: TOAST_VARIANTS.warning.icon,
		});
	},

	success: (message: string) => {
		toast.success(message, {
			...DEFAULT_TOAST_CONFIG,
			style: TOAST_VARIANTS.success.styles,
			icon: TOAST_VARIANTS.success.icon,
		});
	},

	neutral: (message: string) => {
		toast(message, {
			...DEFAULT_TOAST_CONFIG,
			style: TOAST_VARIANTS.neutral.styles,
			icon: TOAST_VARIANTS.neutral.icon,
		});
	},
};

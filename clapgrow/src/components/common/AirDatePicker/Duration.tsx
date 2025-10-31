import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils"; // Optional utility to combine classNames

interface DurationInputProps {
  value?: string; // total seconds
  onChange?: (totalSeconds: string) => void;
  className?: string;
}

export const DurationInput: React.FC<DurationInputProps> = ({
	value = 0,
	onChange,
	className,
}) => {
	const [days, setDays] = useState(0);
	const [hours, setHours] = useState(0);
	const [minutes, setMinutes] = useState(0);
	const [seconds, setSeconds] = useState(0);

	// Update input fields when external value changes
	useEffect(() => {
		const parsedValue = parseInt(value as string) || 0;
		const d = Math.floor(parsedValue / (24 * 3600));
		const h = Math.floor((parsedValue % (24 * 3600)) / 3600);
		const m = Math.floor((parsedValue % 3600) / 60);
		const s = parsedValue % 60;
		setDays(d);
		setHours(h);
		setMinutes(m);
		setSeconds(s);
	}, [value]);

	// Update total seconds and call onChange
	const updateDuration = (d: number, h: number, m: number, s: number) => {
		const total = d * 86400 + h * 3600 + m * 60 + s;
		onChange?.(total.toString());
	};

	const handleChange =
    (
    	setter: React.Dispatch<React.SetStateAction<number>>,
    	type: "days" | "hours" | "minutes" | "seconds",
    ) =>
    	(e: React.ChangeEvent<HTMLInputElement>) => {
    		const val = parseInt(e.target.value) || 0;
    		setter(val);
    		const newValues = {
    			days,
    			hours,
    			minutes,
    			seconds,
    			[type]: val,
    		};
    		updateDuration(
    			newValues.days,
    			newValues.hours,
    			newValues.minutes,
    			newValues.seconds,
    		);
    	};

	const inputClassName =
    "block w-full rounded-md bg-white px-4 py-2 text-base text-gray-900 outline -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6";

	return (
		<div className={cn("grid grid-cols-2 md:grid-cols-4 gap-2", className)}>
			<div className="flex flex-col items-center">
				<input
					type="number"
					value={days}
					onChange={handleChange(setDays, "days")}
					min={0}
					id="days"
					max={365}
					className={inputClassName}
				/>
				<label htmlFor="days" className="text-sm/6 font-medium text-gray-500">
          Days
				</label>
			</div>
			<div className="flex flex-col items-center">
				<input
					type="number"
					value={hours}
					onChange={handleChange(setHours, "hours")}
					min={0}
					max={23}
					id="hours"
					className={inputClassName}
				/>
				<label htmlFor="hours" className="text-sm/6 font-medium text-gray-500">
          Hours
				</label>
			</div>
			<div className="flex flex-col items-center">
				<input
					type="number"
					value={minutes}
					onChange={handleChange(setMinutes, "minutes")}
					min={0}
					max={59}
					id="minutes"
					className={inputClassName}
				/>
				<label
					htmlFor="minutes"
					className="text-sm/6 font-medium text-gray-500"
				>
          Minutes
				</label>
			</div>
			<div className="flex flex-col items-center">
				<input
					type="number"
					value={seconds}
					onChange={handleChange(setSeconds, "seconds")}
					min={0}
					max={59}
					id="seconds"
					className={inputClassName}
				/>
				<label
					htmlFor="seconds"
					className="text-sm/6 font-medium text-gray-500"
				>
          Seconds
				</label>
			</div>
		</div>
	);
};

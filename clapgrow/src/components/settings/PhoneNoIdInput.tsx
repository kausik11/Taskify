"use client";

import { Check } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

// we can extend this list with more countries
const countries = [
	{
		value: "in",
		label: "India",
		dialCode: "+91",
		flag: "🇮🇳",
	},
	{
		value: "us",
		label: "United States",
		dialCode: "+1",
		flag: "🇺🇸",
	},
	{
		value: "uk",
		label: "United Kingdom",
		dialCode: "+44",
		flag: "🇬🇧",
	},
	{
		value: "ca",
		label: "Canada",
		dialCode: "+1",
		flag: "🇨🇦",
	},
	{
		value: "au",
		label: "Australia",
		dialCode: "+61",
		flag: "🇦🇺",
	},
];

interface PhoneInputProps {
  onPhoneNumberChange?: (phoneNumber: string) => void;
  className?: string;
}

export default function PhoneInput({
	onPhoneNumberChange,
	className,
}: PhoneInputProps) {
	const [open, setOpen] = React.useState(false);
	const [selectedCountry, setSelectedCountry] = React.useState(countries[0]);

	return (
		<div className={cn("grid gap-2", className)}>
			<div className="flex gap-2">
				<Popover open={open} onOpenChange={setOpen}>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							role="combobox"
							aria-expanded={open}
							className="w-[110px] justify-between rounded-[8px] border-[1px] border-[#D0D3D9]"
						>
							<span className="flex items-center gap-2 truncate">
								<span>{selectedCountry.flag}</span>
								<span className="font-normal">{selectedCountry.dialCode}</span>
							</span>
							<ChevronDown className="text-[#2D2C37] h-4 w-4" />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-[200px] p-0">
						<Command>
							<CommandInput placeholder="Search country..." />
							<CommandList>
								<CommandEmpty>No country found.</CommandEmpty>
								<CommandGroup>
									{countries.map((country) => (
										<CommandItem
											key={country.value}
											value={country.value}
											onSelect={() => {
												setSelectedCountry(country);
												setOpen(false);
											}}
										>
											<Check
												className={cn(
													"mr-2 h-4 w-4",
													selectedCountry.value === country.value
														? "opacity-100"
														: "opacity-0",
												)}
											/>
											<span className="flex items-center gap-2">
												<span>{country.flag}</span>
												<span>{country.label}</span>
												<span className="ml-auto text-muted-foreground">
													{country.dialCode}
												</span>
											</span>
										</CommandItem>
									))}
								</CommandGroup>
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>
			</div>
		</div>
	);
}

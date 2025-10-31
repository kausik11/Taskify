import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Controller, useFormContext } from "react-hook-form";

export const Settings = () => {
	const { register, control, setValue, watch } = useFormContext();

	const description: any = {
		Autoincrement: "Uses Auto Increment feature of database.",
		"By fieldname": "Format: field:[fieldname]. Valid fieldname must exist",
		Expression:
      "Format: format:EXAMPLE-{MM}morewords{fieldname1}-{fieldname2}-{#####} - Replace all braced words (fieldnames, date words (DD, MM, YY), series) with their value. Outside braces, any characters can be used.",
		Random: "Generates a random string of hash.",
		UUID: "Generates a UUID string.",
	};

	const onNamingRuleChange = (value: string) => {
		if (value === "Autoincrement") {
			setValue("autoname", "autoincrement");
		} else if (value === "By fieldname") {
			setValue("autoname", "field:");
		} else if (value === "Expression") {
			setValue("autoname", "format:");
		} else if (value === "Random") {
			setValue("autoname", "hash");
		} else if (value === "UUID") {
			setValue("autoname", "UUID");
		}
	};

	const namingRule = watch("naming_rule");

	return (
		<div className="grid grid-cols-3 gap-4 h-full">
			<div className="border border-gray-200 w-full rounded-md p-4 flex flex-col gap-4">
				<div className="flex flex-col gap-1">
					<label htmlFor="naming_rule" className="text-sm text-gray-600">
            Naming Rule
					</label>
					<Controller
						control={control}
						name="naming_rule"
						rules={{
							onChange: (e) => onNamingRuleChange(e.target.value),
						}}
						render={({ field }) => (
							<Select onValueChange={field.onChange} value={field.value}>
								<SelectTrigger className="h-8 w-full">
									<SelectValue placeholder="Select Naming Rule">
										{field.value}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="Autoincrement">Auto Increment</SelectItem>
									<SelectItem value="By fieldname">By Field Name</SelectItem>
									<SelectItem value="Expression">Expression</SelectItem>
									<SelectItem value="Random">Random</SelectItem>
									<SelectItem value="UUID">UUID</SelectItem>
								</SelectContent>
							</Select>
						)}
					/>
				</div>
				<div className="flex flex-col gap-1">
					<label htmlFor="autoname" className="text-sm text-gray-600">
            Autoname
					</label>
					<Input
						type="text"
						id="autoname"
						{...register("autoname")}
						placeholder="Enter Autoname"
					/>
					<p className="text-xs text-gray-500">{description[namingRule]}</p>
				</div>
			</div>
		</div>
	);
};

import {
	Controller,
	UseControllerProps,
	useFormContext,
} from "react-hook-form";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export interface ShadSelectProps
  extends React.ComponentPropsWithoutRef<typeof Select> {
  name: string;
  label: string;
  options: string[];
  rules?: UseControllerProps["rules"];
  controllerProps?: Partial<
    Omit<UseControllerProps, "name" | "rules" | "control">
  >;
}

export const SelectField = ({
	name,
	options,
	rules,
	controllerProps,
	label = "Select...",
	...props
}: ShadSelectProps) => {
	const { control } = useFormContext();

	return (
		<Controller
			control={control}
			name={name}
			rules={rules}
			render={({ field: { name, onChange, value, ref } }) => (
				<Select value={value} onValueChange={onChange} name={name} {...props}>
					<SelectTrigger
						ref={ref}
						id={name}
						className="w-full"
						aria-readonly={props?.readOnly}
					>
						<SelectValue placeholder={label} />
					</SelectTrigger>
					<SelectContent>
						{options.map((option) => (
							<SelectItem key={option} value={option}>
								{option}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			)}
			{...controllerProps}
		/>
	);
};

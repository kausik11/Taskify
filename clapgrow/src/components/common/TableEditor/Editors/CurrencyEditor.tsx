import { Input } from "@/components/ui/input";
import { flt } from "@/hooks/operations";
import { CustomCellEditorProps } from "ag-grid-react";
import { forwardRef, useEffect, useRef } from "react";
import CurrencyInput, { CurrencyInputProps } from "react-currency-input-field";

interface CurrencyInputEditorProps extends CustomCellEditorProps {
  props?: {
    currency?: string;
    precision?: number;
  } & Partial<Omit<CurrencyInputProps, "name" | "onValueChange">>;
}
export const CurrencyEditor = forwardRef(
	(props: CurrencyInputEditorProps, ref) => {
		const inputRef = useRef<HTMLInputElement>(null);

		useEffect(() => {
			inputRef.current?.focus();
			inputRef.current?.select();
		}, []);

		const isNaN = Number.isNaN(Number(props.value));

		return (
			<div className="bg-white h-[40px]">
				<CurrencyInput
					name={props.colDef.field}
					ref={inputRef}
					className="chakra-input"
					width={props.column.getActualWidth()}
					height={"100%"}
					onValueChange={(v) => props.onValueChange(flt(v))}
					style={{ textAlign: "right" }}
					defaultValue={isNaN ? "" : props.value}
					customInput={Input}
					placeholder={`${props.props?.currency ?? "$"}0.00`}
					decimalsLimit={2}
					maxLength={12}
					allowDecimals={true}
					decimalScale={2}
					allowNegativeValue={true}
					{...props.props}
				/>
			</div>
		);
	},
);

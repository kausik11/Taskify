import { Textarea } from "@/components/ui/textarea";
import { CustomCellEditorProps } from "ag-grid-react";
import { forwardRef } from "react";

export interface SmallTextEditorProps extends CustomCellEditorProps {
  maxLength?: number;
  rows?: number;
  cols?: number;
}

export const SmallTextEditor = forwardRef(
	(props: SmallTextEditorProps, ref) => {
		const onValueChange = (v: string) => {
			props.onValueChange(v);
		};

		return (
			<div className="bg-white h-[40px]">
				<Textarea
					className={`${props.column.getActualWidth() ? "w-[" + props.column.getActualWidth() + "px]" : "w-[320px]"} min-h-[120px]`}
					value={props.value}
					rows={props.rows}
					autoFocus
					cols={props.cols}
					onChange={(e) => onValueChange(e.target.value)}
					tabIndex={1}
				/>
			</div>
		);
	},
);

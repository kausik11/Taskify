import { useCopyDocument } from "@/hooks/useCopyDocument";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { CopyPlus } from "lucide-react";
import { useGetRouting } from "@/hooks/useGetRouting";

export interface CopyDocumentButtonProps {
  doctype: string;
  data: any;
}

export const CopyDocumentButton = ({
	doctype,
	data,
	...props
}: CopyDocumentButtonProps) => {
	const { copyDocument } = useCopyDocument();

	const { navigateToCreate } = useGetRouting();

	const onClick = async () => {
		const copiedDoc = await copyDocument(data);

		if (copiedDoc) {
			navigateToCreate(doctype as never, {
				state: {
					autoFillFields: copiedDoc,
				},
			});
		}
	};

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						aria-label="Duplicate"
						onClick={onClick}
						{...props}
						type="button"
					>
						<CopyPlus className="h-6 w-6" />
					</Button>
				</TooltipTrigger>
				<TooltipContent>Copy Document</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
};

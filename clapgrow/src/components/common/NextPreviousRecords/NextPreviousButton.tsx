import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface NextPreviousButtonsProps
  extends React.HTMLAttributes<HTMLDivElement> {
  onNextClick: () => void;
  onPreviousClick: () => void;
  allow?: boolean;
}

export const NextPreviousButtons = ({
	onNextClick,
	onPreviousClick,
	allow = true,
	className = "",
	...props
}: NextPreviousButtonsProps) => {
	return (
		<TooltipProvider>
			<div className={`flex gap-2 ${className}`} {...props}>
				<Tooltip>
					<TooltipTrigger asChild>
						<span>
							<Button
								variant="ghost"
								size="sm"
								aria-label={"Previous Document"}
								title={"Previous Document"}
								onClick={onPreviousClick}
								disabled={!allow}
								type="button"
							>
								<ChevronLeft className="h-6 w-6" />
							</Button>
						</span>
					</TooltipTrigger>
					<TooltipContent>{"Previous Document"}</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger asChild>
						<span>
							<Button
								variant="ghost"
								size="sm"
								aria-label={"Next Document"}
								title={"Next Document"}
								onClick={onNextClick}
								disabled={!allow}
								type="button"
							>
								<ChevronRight className="h-6 w-6" />
							</Button>
						</span>
					</TooltipTrigger>
					<TooltipContent>{"Next Document"}</TooltipContent>
				</Tooltip>
				{!allow && (
					<Tooltip open>
						<TooltipTrigger asChild>
							<span />
						</TooltipTrigger>
						<TooltipContent>
							{"Please change the sorting on the list to navigate."}
						</TooltipContent>
					</Tooltip>
				)}
			</div>
		</TooltipProvider>
	);
};

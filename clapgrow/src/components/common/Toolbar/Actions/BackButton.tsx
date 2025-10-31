import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowLeft } from "lucide-react";

export const BackButton = () => {
	const navigate = useNavigate();

	const translatedLabel = useMemo(() => "Back", []);

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						aria-label={translatedLabel}
						onClick={() => navigate(-1)}
						tabIndex={0}
						className="h-8 w-8"
						type="button"
					>
						<ArrowLeft className="h-5 w-5" />
					</Button>
				</TooltipTrigger>
				<TooltipContent>{translatedLabel}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
};

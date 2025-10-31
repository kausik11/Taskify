import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGetRouting } from "@/hooks/useGetRouting";
import { useCreateHotkey } from "@/hooks/useReactHotKeys";
import { canCreateDocument } from "@/utils/permissions";
import { ChevronUp, Command, SquarePlus } from "lucide-react";

interface AddRecordButtonProps extends React.ComponentProps<typeof Button> {
  doctype: string;
  title?: string;
  onClick?: () => void;
}

export const AddRecordButton = ({
	doctype,
	title,
	onClick,
	...props
}: AddRecordButtonProps) => {
	const showAddRecordButton = canCreateDocument(doctype);
	if (!showAddRecordButton) return null;
	return (
		<AddButton doctype={doctype} title={title} onClick={onClick} {...props} />
	);
};

export interface AddRecordButtonComponentProps
  extends React.ComponentProps<typeof Button> {
  doctype: string;
  title?: string;
  onClick?: () => void;
}

export const AddButton = ({
	doctype,
	title,
	onClick,
	...props
}: AddRecordButtonComponentProps) => {
	const { navigateToCreate } = useGetRouting();

	useCreateHotkey(() => onButtonClick());

	function onButtonClick() {
		if (onClick) {
			onClick();
		} else {
			navigateToCreate(doctype as never);
		}
	}
	const getKeyboardMetaKeyIcon = () => {
		if (navigator.platform.toUpperCase().indexOf("MAC") >= 0) {
			return <Command className="h-3 w-3" />;
		} else {
			return <ChevronUp className="h-3 w-3" />;
		}
	};

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						aria-label="Add Record"
						onClick={onButtonClick}
						{...props}
						type="button"
					>
						<SquarePlus className="h-6 w-6" />
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<span className="flex flex-col items-center gap-1">
						{/* {(`New {0}`, [(title ? title : doctype)])}{" "} */}
						{`New ${title ? title : doctype}`}
						<div className="flex items-center gap-1">
							<kbd className="flex bg-gray-500 text-white h-5 w-5 items-center justify-center">
								{getKeyboardMetaKeyIcon()}
							</kbd>
							<kbd className="flex bg-gray-500 text-white h-5 w-5 items-center justify-center">
                B
							</kbd>
						</div>
					</span>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
};

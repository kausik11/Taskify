import { Timeline } from "./Timeline";
import { useRef, useState } from "react";
import { getDocumentLogDataFilter } from "./getDocumentLogDataFilter";
import { VersionTableModal } from "./TimelineComponents/VersionTableModal";
import { CommentComponent } from "./TimelineComponents/CommentComponent";
import { TimelineProps } from "./TimelineComponents/type";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileClock } from "lucide-react";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";

export const TimelineButton = ({
	doctype,
	docname,
	onUpdate,
	...props
}: TimelineProps) => {
	const [isOpen, setIsOpen] = useState(false);
	const btnRef = useRef<HTMLButtonElement>(null);

	const handleOpen = () => setIsOpen(true);
	const handleClose = () => setIsOpen(false);

	return (
		<>
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							aria-label="Document Log"
							variant="ghost"
							size={"sm"}
							onClick={handleOpen}
							ref={btnRef}
							type="button"
						>
							<FileClock />
							Timeline
						</Button>
					</TooltipTrigger>
					<TooltipContent>Timeline</TooltipContent>
				</Tooltip>
			</TooltipProvider>
			<Sheet open={isOpen} onOpenChange={setIsOpen}>
				<SheetContent
					className="w-full sm:max-w-3xl h-full"
					onCloseAutoFocus={(e) => {
						e.preventDefault();
						handleClose();
					}}
					side="right"
				>
					<DrawerContentLogData
						doctype={doctype}
						docname={docname}
						onUpdate={onUpdate}
						{...props}
					/>
				</SheetContent>
			</Sheet>
		</>
	);
};

export const DrawerContentLogData = ({
	doctype,
	docname,
	onUpdate,
}: TimelineProps) => {
	const { data, error, isLoading, mutate } = getDocumentLogDataFilter(
		doctype,
		docname,
		onUpdate,
	);

	const [isVersionOpen, setVersionOpen] = useState(false);
	const [versionData, setVersionData] = useState<string>("");

	const handleVersionClose = () => {
		setVersionOpen(false);
		setVersionData("");
	};

	return (
		<>
			<SheetHeader className="border-b border-gray-200 pb-2 flex text-center">
				<div className="flex items-center gap-4">
					<span className="font-medium text-lg">Timeline</span>
					<CommentComponent
						doctype={doctype}
						docname={docname}
						mutate={mutate}
					/>
				</div>
			</SheetHeader>
			<Timeline
				data={data}
				error={error}
				isLoading={isLoading}
				mutate={mutate}
				doctype={doctype}
				onOpen={() => setVersionOpen(true)}
				setVersionData={setVersionData}
			/>
			{versionData && (
				<VersionTableModal
					data={versionData}
					isOpen={isVersionOpen}
					onClose={handleVersionClose}
				/>
			)}
		</>
	);
};

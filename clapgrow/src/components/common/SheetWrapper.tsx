import React from "react";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";

interface SheetWrapperProps {
  trigger?: string;
  heading: string;
  children: React.ReactNode;
  className?: string;
  isOpenSheet?: boolean;
  setIsOpenSheet?: (isOpen: boolean) => void;
}

const SheetWrapper = ({
	trigger,
	heading,
	children,
	className = "w-[95vw] md:min-w-[700px]",
	isOpenSheet,
	setIsOpenSheet,
}: SheetWrapperProps) => {
	const sheetProps =
    typeof isOpenSheet !== "undefined"
    	? {
    		open: isOpenSheet,
    		onOpenChange: (isOpen: boolean) => {
    			setIsOpenSheet?.(isOpen);
    		},
    		modal: true,
    	}
    	: {};

	return (
		<Sheet {...sheetProps}>
			{trigger && (
				<SheetTrigger>
					<button className="bg-[#038EE2] py-2 px-4 rounded-[8px] hover:bg-[#0265a1] font-[600] text-white text-[14px] w-fit">
						{trigger}
					</button>
				</SheetTrigger>
			)}
			<SheetContent className={className}>
				<SheetHeader>
					<SheetTitle>{heading}</SheetTitle>
				</SheetHeader>
				<div className="space-y-2 py-4">{children}</div>
			</SheetContent>
		</Sheet>
	);
};

export default SheetWrapper;

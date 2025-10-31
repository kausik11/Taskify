import { useState } from "react"
import { Trash2 } from "lucide-react"
import { AgGridActionProps } from "../Menu"
import { DeleteListItems } from "./DeleteListItems"
import { Button } from "@/components/ui/button"


// export interface AgGridDeleteButtonProps extends AgGridActionProps { }

export const DeleteButton = ({
	doctype,
	onRowSelectionCleared,
	refreshPage,
	getSelectedRows,
}: AgGridActionProps) => {
	const [isOpen, setIsOpen] = useState(false)

	// console.log("delete button");

	return (
		<div>
			{/* <DropdownMenuItem
				className="flex items-center gap-2 cursor-pointer"
				onSelect={(e) => {
					e.preventDefault() // <-- Prevent menu from closing first
					setIsOpen(true)
				}}
			>
				<Trash2 className="h-4 w-4" />
                Delete
			</DropdownMenuItem> */}
			<Button variant={'outline'} size={'icon'} onClick={() => setIsOpen(true)} className=" bg-white border border-[#ACABB2] h-[36px] w-[40px] rounded-[8px] items-center justify-center">
				<Trash2 className="w-[18px] h-[18px]" color="#5B5967" />
			</Button>
			<DeleteListItems
				isOpen={isOpen}
				onClose={setIsOpen}
				refreshPage={refreshPage}
				doctype={doctype}
				onRowSelectionCleared={onRowSelectionCleared}
				getSelectedRows={getSelectedRows}
			/>
		</div>
	)
}

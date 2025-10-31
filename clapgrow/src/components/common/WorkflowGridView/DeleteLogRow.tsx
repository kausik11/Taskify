import { Button } from '@/components/ui/button'
import { GridApi } from 'ag-grid-enterprise'
import { ReactNode, forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { Trash2 } from 'lucide-react'
import React from 'react'
import { cn } from '@/lib/utils'
import { AgGridDeleteButtonProps } from '../DataGrid/Menu/DeleteAction/DeleteButton'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { FrappeError, useFrappePostCall, useSWRConfig } from 'frappe-react-sdk'
import { ErrorBanner } from '@/components/layout/AlertBanner/ErrorBanner'
import { toast } from "sonner"

export interface AgGridActionProps {
    gridApi: GridApi<any> | undefined
    doctype: string
    refreshPage: () => void
    onRowSelectionCleared: () => void
    getSelectedRows: () => any[]
    children?: ReactNode
}

export interface ActionsMenuRef {
    updateState: (value: boolean) => void
}

export const DeleteLogRow = forwardRef<ActionsMenuRef, AgGridActionProps>((props, ref) => {
	const [state, setState] = useState(false)

	useImperativeHandle(ref, () => ({
		updateState: (value: boolean) => {
			setState(value)
		},
	}))
	if (state) {

		return (
			<DeleteButton
				doctype={props.doctype}
				refreshPage={props.refreshPage}
				gridApi={props.gridApi}
				onRowSelectionCleared={props.onRowSelectionCleared}
				getSelectedRows={props.getSelectedRows}
			/>

		)
	}
	return null
})

export const DeleteButton = ({
	doctype,
	onRowSelectionCleared,
	refreshPage,
	getSelectedRows,
}: AgGridDeleteButtonProps) => {
	const [isOpen, setIsOpen] = useState(false)

	return (
		<div>
			<Button variant={'outline'} size={'icon'} onClick={() => setIsOpen(true)} className='h-8 w-8'>
				<Trash2 className="h-4 w-4" />
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



interface Props {
    isOpen: boolean
    onClose: React.Dispatch<React.SetStateAction<boolean>>
    refreshPage: () => void
    doctype: string
    onRowSelectionCleared: () => void
    getSelectedRows: () => any[]
}

export const DeleteListItems = ({
	isOpen,
	onClose,
	doctype,
	getSelectedRows,
	onRowSelectionCleared,
	refreshPage,
}: Props) => {
	const { call, error, loading, reset } = useFrappePostCall('clapgrow_workflow.clapgrow_workflow.api.workflow_logs.delete_logs')
	const [err, setErr] = useState<FrappeError | null>(null)
	const { mutate } = useSWRConfig()

	useEffect(() => {
		reset()
		setErr(null)
	}, [isOpen, reset])

	const deleteItems = () => {
		let rows = getSelectedRows()
		const items = rows.map(row => row.name || null).filter(Boolean)

		call({
			workflow_name: doctype,
			event_docnames: JSON.stringify(items)
		}).then((res) => {
			if (res.exc_type || res._server_messages) {
				console.error("Error deleting items:", res)
				setErr(res)
			} else {
				// Clear selected rows and refresh page
				onRowSelectionCleared()
				refreshPage()

				// Check for server-side errors

				toast.success("Items deleted successfully")

				// Close the modal if successful
				onClose(false)
			}
		})
	}

	return (
		<AlertDialog onOpenChange={onClose} open={isOpen}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle className="text-lg font-bold">
                        Delete Item(s)
					</AlertDialogTitle>
				</AlertDialogHeader>

				<AlertDialogDescription>
					<div className="flex flex-col gap-3">
						<ErrorBanner error={error} />
						<ErrorBanner error={err} />
						<p
							className={cn(
								"text-sm text-muted-foreground",
								err !== null && "hidden"
							)}
						>
                            Are you sure you want to delete the selected rows?
						</p>
					</div>
				</AlertDialogDescription>

				<AlertDialogFooter className="flex gap-2">
					<AlertDialogCancel asChild>
						<Button variant="ghost" disabled={loading}>
							{err === null ? "Cancel" : "Close"}
						</Button>
					</AlertDialogCancel>

					<AlertDialogAction asChild>
						<Button
							variant="destructive"
							disabled={loading || err !== null}
							onClick={(e) => {
								e.preventDefault()
								deleteItems()
							}}
							className={cn(err !== null && "hidden")}
						>
							{loading ? "Deleting..." : "Delete"}
						</Button>
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}


DeleteLogRow.displayName = "DeleteLogRow"
import { GridApi } from 'ag-grid-enterprise'
import { ReactNode, forwardRef, useImperativeHandle, useState } from 'react'
import { DeleteButton } from './DeleteAction/DeleteButton'
import { haveTableNameValue } from '../DataGridWithMeta'

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

export const ActionsMenu = forwardRef<ActionsMenuRef, AgGridActionProps>((props, ref) => {

	// console.log("havetablename in menu",haveTableNameValue)
	const [state, setState] = useState(false)

	useImperativeHandle(ref, () => ({
		updateState: (value: boolean) => {
			setState(value)
		},
	}))
	if (state) {
		// Use the imported haveTableNameValue to set positioning
  const buttonContainerClass = haveTableNameValue? "absolute top-[-56px] right-[192px] z-10":""

		return (
			<div className={buttonContainerClass}>
			<DeleteButton
				doctype={props.doctype}
				refreshPage={props.refreshPage}
				gridApi={props.gridApi}
				onRowSelectionCleared={props.onRowSelectionCleared}
				getSelectedRows={props.getSelectedRows}
			/>
			</div>
		)
	}
	return null
})

ActionsMenu.displayName = "ActionsMenu"
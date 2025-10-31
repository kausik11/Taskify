import { useState } from "react";

export const getSelectedRows = () => {
	/** State to manage row selection */
	const [selectedRows, setSelectedRows] = useState<number[]>([]);

	const onRowSelectionChange = (selectedRowKeys: number[]) => {
		setSelectedRows(selectedRowKeys);
	};

	const onRowSelectionClear = () => {
		setSelectedRows([]);
	};

	return {
		selectedRows,
		onRowSelectionChange,
		onRowSelectionClear,
	};
};

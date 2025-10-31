import { DocType } from "@/types/Core/DocType";
import {
	DragEndEvent,
	DndContext,
	closestCenter,
	DragOverlay,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SquareMousePointer, Plus } from "lucide-react";
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { FormField } from "./FormField";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DocField } from "@/types/Core/DocField";
import { Button } from "@/components/ui/button";

// Helper to split fields into columns at every Column Break
function splitFieldsByColumnBreak(fields: DocField[]) {
	const columns: DocField[][] = [];
	let current: DocField[] = [];
	for (const field of fields) {
		if (field.fieldtype === "Column Break") {
			columns.push(current);
			current = [];
		} else {
			current.push(field);
		}
	}
	columns.push(current);
	return columns;
}

// DummySortable: a drop zone for empty columns
const DummySortable = ({
	id,
	onRemove,
}: {
  id: string;
  onRemove: () => void;
}) => {
	const { setNodeRef, isOver, transition, transform } = useSortable({
		id,
		disabled: true,
	});
	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isOver ? 0.7 : 1,
		borderColor: isOver ? "#ef4444" : "#d1d5db",
		background: isOver ? "#fee2e2" : "#f9fafb",
		cursor: "pointer",
	};
	return (
		<button
			ref={setNodeRef}
			type="button"
			style={style}
			className="flex items-center justify-center text-red-500 h-16 border-2 border-dashed border-red-300 rounded bg-red-50 select-none font-semibold"
			onClick={onRemove}
		>
      Remove Column
		</button>
	);
};
export const FormScreen = () => {
	const { watch, setValue } = useFormContext<DocType>();
	const fields = watch("fields") || [];

	// Track the active field for overlay
	const [activeId, setActiveId] = useState<string | null>(null);

	// Find the active field object
	const activeField = fields.find((f) => f.fieldname === activeId);

	// Split fields into columns at every Column Break
	const columns = splitFieldsByColumnBreak(fields);

	// Add a dummy id for each empty column
	const dummyIds = columns
		.map((col, idx) => (col.length === 0 ? `__empty_col_${idx}` : null))
		.filter(Boolean);

	// For drag-and-drop, flatten all fieldnames (excluding Column Breaks) + dummy ids
	const sortableFieldNames = [
		...fields
			.filter((f) => f.fieldtype !== "Column Break")
			.map((f) => f.fieldname)
			.filter((name): name is string => typeof name === "string"),
		...dummyIds,
	];

	// Handle drag end to reorder fields and update idx
	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		setActiveId(null);
		if (!over) return;
		if (active.id === over.id) return;

		// If dropped on a dummy, move to the end of that column
		if (over.id.toString().startsWith("__empty_col_")) {
			const colIdx = Number(over.id.toString().replace("__empty_col_", ""));
			// Find the index in the fields array after the column break for this column
			let insertIdx = 0;
			let colCount = 0;
			for (let i = 0; i < fields.length; i++) {
				if (fields[i].fieldtype === "Column Break") {
					colCount++;
				}
				if (colCount > colIdx) {
					insertIdx = i;
					break;
				}
				// If it's the last column, insert at the end
				if (colCount === colIdx && i === fields.length - 1) {
					insertIdx = fields.length;
				}
			}
			const oldIndex = fields.findIndex((f) => f.fieldname === active.id);
			if (oldIndex === -1) return;
			let newFields = [...fields];
			const [removed] = newFields.splice(oldIndex, 1);
			newFields.splice(insertIdx, 0, removed);
			newFields = newFields.map((field, idx) => ({
				...field,
				idx: idx + 1,
			}));
			setValue("fields", newFields, { shouldDirty: true });
			return;
		}

		// Normal move
		const oldIndex = fields.findIndex((f) => f.fieldname === active.id);
		const newIndex = fields.findIndex((f) => f.fieldname === over.id);
		let newFields = arrayMove(fields, oldIndex, newIndex);
		newFields = newFields.map((field, idx) => ({
			...field,
			idx: idx + 1,
		}));
		setValue("fields", newFields, { shouldDirty: true });
	};

	// Add a new column (Column Break)
	const handleAddColumn = () => {
		// const newFieldname = `column_break_${Math.random().toString(36).slice(2, 8)}`;
		const newColumnBreak = {
			fieldtype: "Column Break",
			label: "New Column",
			fieldname: `column_break_${fields.length + 1}`,
			idx: fields.length + 1,
			__islocal: 1,
			__unsaved: 1,
		};
		// @ts-expect-error expected to be a DocField
		setValue("fields", [...fields, newColumnBreak], { shouldDirty: true });
	};

	const onColumnRemove = (idx: number) => {
		// Find the index of the column break for this column
		let colCount = 0;
		for (let i = 0; i < fields.length; i++) {
			if (fields[i].fieldtype === "Column Break") {
				if (colCount === idx - 1) {
					// Remove this column break
					const newFields = fields.filter((_, j) => j !== i);
					setValue("fields", newFields, { shouldDirty: true });
					break;
				}
				colCount++;
			}
		}
	};

	return (
		<div className="flex flex-col gap-2 border h-full border-gray-200 rounded-lg p-4 overflow-y-auto bg-gray-50 w-full">
			{/* Add Column Button */}
			<div className="flex justify-end w-full">
				<Button
					type="button"
					onClick={handleAddColumn}
					size={"sm"}
					variant={"outline"}
				>
					<Plus className="w-4 h-4" />
          Add Column
				</Button>
			</div>
			<div className="flex flex-row gap-4 w-full h-full">
				{fields.length > 0 ? (
					<DndContext
						collisionDetection={closestCenter}
						onDragStart={(e) => setActiveId(String(e.active.id))}
						onDragEnd={handleDragEnd}
						onDragCancel={() => setActiveId(null)}
					>
						{/* @ts-expect-error expected*/}
						<SortableContext
							items={sortableFieldNames}
							strategy={verticalListSortingStrategy}
						>
							<div className="flex w-full gap-4">
								{columns.map((columnFields, idx) => (
									<div
										key={idx}
										className="flex flex-col gap-4 w-full border border-dashed rounded-md p-4 border-gray-300"
									>
										{columnFields.length === 0 ? (
											<DummySortable
												id={`__empty_col_${idx}`}
												onRemove={() => onColumnRemove(idx)}
											/>
										) : (
											columnFields.map((field) => (
												<FormField field={field} key={field.fieldname} />
											))
										)}
									</div>
								))}
							</div>
						</SortableContext>
						<DragOverlay>
							{activeField ? <FormField field={activeField} isOverlay /> : null}
						</DragOverlay>
					</DndContext>
				) : (
					<div className="flex flex-col items-center w-full justify-center h-full gap-2">
						<SquareMousePointer className="text-gray-600" />
						<p className="text-center text-gray-600 text-sm">
              To start creating a form, drag and
							<br />
              drop elements here
						</p>
					</div>
				)}
			</div>
		</div>
	);
};

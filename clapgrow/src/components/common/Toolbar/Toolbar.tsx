import { isEmpty } from "@/hooks/checks";
import { Filter } from "frappe-react-sdk";
import { useFormState } from "react-hook-form";
import {
	NextPreviousButtonsProps,
	NextPreviousRecord,
} from "../NextPreviousRecords";
import { ViewerAvatarGroupElement } from "./Actions/AvatarGroup";
import { DeleteRecordButton } from "./Actions/DeleteRecordButton";
import { CopyDocumentButton } from "./Actions/CopyDocumentButton";
import { AddRecordButton } from "./Actions/AddRecordButton";
import { SaveButton } from "./Actions/SaveButton";
import { TimelineButton } from "./Timeline/TimelineButton";

export interface ToolbarProps {
  /** The doctype of the current document */
  doctype: string;
  /** The name of the current document */
  docname: string;
  /** The current document */
  doc: any;
  /** The list of viewers for the current document */
  docViewers?: string[];
  /** The endpoint to use for the NextPreviousRecord component */
  nextPrevAPI?: string;
  /** The function to call when the document is saved */
  saveButtonProps: {
    /** Whether the save button is loading */
    loading: boolean;
    /** The ref for the save button */
    saveButtonRef: any;
  };
  /** The function to call when the form is reset */
  additionalFilters?: Filter[];
  /** Triggered before deletion */
  beforeDelete?: () => void;
  /** Key to mutate when the document is deleted, or workflow is applied
   *
   * Important to pass - for example - deleting the document would clear the cache for the document
   *
   * Defaults to `doc:${doctype}:${docname}`
   */
  mutationKey?: string;
  nextPreviousProps?: Partial<NextPreviousButtonsProps>;
  /** Whether to show the delete button */
  onDelete?: () => void;
  /** The function to call when the add record button is clicked */

  /** The function to call when the add record button is clicked */
  addRecord?: () => void;
  addButtonTitle?: string;
  /** prop to update Timeline */
  onUpdate: VoidFunction;
}

/**
 * Toolbar for a document
 * @mandatoryprops doctype, docname, doc, mutate, onFormReset, onSaveAndReturn, saveButtonProps
 * @returns A Toolbar component that can be used in a document view
 * */
export const Toolbar = ({
	doctype,
	docname,
	doc,
	mutationKey,
	nextPreviousProps,
	beforeDelete,
	onDelete,
	docViewers,
	nextPrevAPI,
	saveButtonProps,
	additionalFilters,
	addRecord,
	addButtonTitle,
	onUpdate,
}: ToolbarProps) => {
	const { dirtyFields } = useFormState();

	const isDirty = !isEmpty(dirtyFields);

	const mutate_key = mutationKey ?? `doc:${doctype}:${docname}`;

	return (
		<div className="flex flex-row gap-2">
			<ViewerAvatarGroupElement users={docViewers ?? []} />

			<CopyDocumentButton doctype={doctype} data={doc} />

			<AddRecordButton
				doctype={doctype}
				onClick={addRecord}
				title={addButtonTitle}
			/>

			<DeleteRecordButton
				doctype={doctype}
				docname={docname}
				beforeDelete={beforeDelete}
				mutationKey={mutate_key}
				onDelete={onDelete}
			/>

			<NextPreviousRecord
				doctype={doctype}
				docname={docname}
				key={docname}
				apiPath={nextPrevAPI}
				additionalFilters={additionalFilters}
				{...nextPreviousProps}
			/>

			<TimelineButton doctype={doctype} docname={docname} onUpdate={onUpdate} />

			<SaveButton
				doctype={doctype}
				isDirty={isDirty}
				saveButtonRef={saveButtonProps?.saveButtonRef}
				loading={saveButtonProps?.loading ?? false}
			/>
		</div>
	);
};

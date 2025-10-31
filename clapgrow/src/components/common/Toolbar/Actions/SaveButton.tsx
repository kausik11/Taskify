import { Button } from "@/components/ui/button";
// import { canWriteDocument } from "@/utils/permissions";
import { SpinnerLoader } from "../../FullPageLoader/SpinnerLoader";

export interface SaveButtonProps extends React.ComponentProps<typeof Button> {
  doctype: string;
  saveButtonRef: any;
  loading: boolean;
  isDirty: boolean;
}

/**
 * Save button for a document
 * @param doctype doctype of the document
 * @param loading Whether the button is loading
 * @param isDirty Whether the document is dirty
 * @param saveButtonRef The ref for the button
 * @returns A SaveButton component
 */
export const SaveButton = ({
	doctype,
	saveButtonRef,
	loading,
	isDirty,
	...props
}: SaveButtonProps) => {
	// const showSaveButton = canWriteDocument(doctype);

	// if (!showSaveButton) return null;

	return (
		<Button
			size="sm"
			type="submit"
			ref={saveButtonRef}
			disabled={!isDirty || loading}
			aria-disabled={!isDirty || loading}
			{...props}
			className="flex w-14 items-center bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
		>
			{loading ? <SpinnerLoader className="mr-2" /> : "Save"}
		</Button>
	);
};

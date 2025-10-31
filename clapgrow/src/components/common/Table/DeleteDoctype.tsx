import { useFrappePostCall } from "frappe-react-sdk";
import { Button } from "@/components/ui/button";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogFooter,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { ErrorBanner } from "@/components/layout/AlertBanner/ErrorBanner";
import { SpinnerLoader } from "../FullPageLoader/SpinnerLoader";
import { toast } from "sonner";

export interface DeleteRecordButtonProps {
    docname: string;
    isOpen: boolean;
    onClose: () => void;
    onDeleteSuccess?: () => void;
}

export const DeleteRecordButton = ({
	docname,
	isOpen,
	onClose,
	onDeleteSuccess,
}: DeleteRecordButtonProps) => {

	const { call, error, loading } = useFrappePostCall('clapgrow_app.api.form.create_form.delete_form')

	const onDelete = () => {
		call({
			docname: docname,
		}).then(() => {
			toast.success(`Record ${docname} deleted successfully.`);
			onDeleteSuccess?.();
			onClose();
		})
	}

	return (
		<AlertDialog open={isOpen} onOpenChange={onClose}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{("Delete")}</AlertDialogTitle>
					<AlertDialogDescription>
						<ErrorBanner error={error} />
						<div className="my-2 flex flex-row gap-1">Permanently delete
							<div className="font-bold">{` ${docname} `}
							</div>?
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>
						<Button variant="ghost" disabled={loading} type="button">
							{("Cancel")}
						</Button>
					</AlertDialogCancel>
					<Button
						variant="destructive"
						onClick={onDelete}
						disabled={loading}
						type="button"
					>
						{loading && <SpinnerLoader />}
						{("Delete")}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
};
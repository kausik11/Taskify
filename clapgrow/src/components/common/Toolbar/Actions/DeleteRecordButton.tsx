import { useNavigate } from "react-router-dom";
import { useFrappeDeleteDoc, useSWRConfig } from "frappe-react-sdk";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogFooter,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogCancel,
	AlertDialogAction,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { canDeleteDocument } from "@/utils/permissions";
import { SpinnerLoader } from "../../FullPageLoader/SpinnerLoader";
import { ErrorBanner } from "@/components/layout/AlertBanner/ErrorBanner";

export interface DeleteRecordButtonProps {
  doctype: string;
  docname: string;
  beforeDelete?: () => void;
  alertHeader?: string;
  mutationKey?: string;
  onDelete?: () => void;
}

export const DeleteRecordButton = ({
	doctype,
	docname,
	beforeDelete,
	mutationKey,
	onDelete,
	...props
}: DeleteRecordButtonProps) => {
	const showDeleteButton = canDeleteDocument(doctype);

	return showDeleteButton ? (
		<DeleteButton
			doctype={doctype}
			beforeDelete={beforeDelete}
			onDelete={onDelete}
			docname={docname}
			mutationKey={mutationKey}
			{...props}
		/>
	) : null;
};

export interface DeleteButtonProps {
  doctype: string;
  docname: string;
  mutationKey?: string;
  beforeDelete?: () => void;
  onDelete?: () => void;
}

export const DeleteButton = ({
	doctype,
	docname,
	mutationKey,
	beforeDelete,
	onDelete,
	...props
}: DeleteButtonProps) => {
	const { deleteDoc, error, loading } = useFrappeDeleteDoc();
	const navigate = useNavigate();
	const { mutate } = useSWRConfig();

	const deleteRecord = () => {
		if (doctype && docname) {
			if (beforeDelete) {
				beforeDelete();
			}
			deleteDoc(doctype, docname).then(() => {
				mutate(mutationKey, undefined, false);
				//@ts-expect-error expected
				delete window.locals?.[doctype]?.[docname];
				toast.success(`${doctype} ${docname} deleted`);
				if (onDelete) {
					onDelete();
				} else {
					navigate(-1);
				}
			});
		}
	};

	return (
		<TooltipProvider>
			<AlertDialog>
				<Tooltip>
					<TooltipTrigger asChild>
						<AlertDialogTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								// className="h-8 w-8"
								aria-label={"Delete"}
								{...props}
								type="button"
							>
								<Trash2 size={18} />
							</Button>
						</AlertDialogTrigger>
					</TooltipTrigger>
					<TooltipContent>{"Delete"}</TooltipContent>
				</Tooltip>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{"Delete"}</AlertDialogTitle>
						<AlertDialogDescription>
							<ErrorBanner error={error} />
							<div className="my-2">{`Permanently delete ${docname}?`}</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel asChild>
							<Button variant="ghost" disabled={loading} type="button">
								{"Cancel"}
							</Button>
						</AlertDialogCancel>
						<AlertDialogAction asChild>
							<Button
								variant="destructive"
								onClick={deleteRecord}
								disabled={loading}
								type="button"
							>
								{loading && <SpinnerLoader />}
								{"Delete"}
							</Button>
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</TooltipProvider>
	);
};

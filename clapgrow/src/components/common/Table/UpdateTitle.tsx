import { useForm, FormProvider, useFormContext } from "react-hook-form";
import { useCallback, useState } from "react";
import { useSWRConfig } from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogFooter,
	DialogTitle,
	DialogDescription,
	DialogClose,
} from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { ErrorBanner } from "@/components/layout/AlertBanner/ErrorBanner";
import { useFrappePostCall } from "frappe-react-sdk";
import { useGetRouting } from "@/hooks/useGetRouting";
import { useNavigate } from "react-router-dom";

export interface UpdateTitleFieldProps {
  doctype: string;
  docname: string;
  name: string;
  mutate: any;
  isOpen: boolean;
  onClose: () => void;
  shouldNavigate?: boolean;
}

export interface UpdateTitleFieldFormFields {
  doctype: string;
  docname: string;
  name: string;
  merge: 1 | 0;
}

export const UpdateTitleField = ({
	doctype,
	docname,
	name,
	mutate,
	isOpen,
	onClose,
	shouldNavigate = true,
}: UpdateTitleFieldProps) => {
	const methods = useForm<UpdateTitleFieldFormFields>({
		defaultValues: {
			doctype,
			docname,
			name,
			merge: 0,
		},
	});

	const { handleSubmit, reset: formReset, watch } = methods;
	const { navigateToRecord } = useGetRouting();
	const { call, error, loading, reset } = useFrappePostCall<{ message: string }>(
		"clapgrow_app.api.form.create_form.update_title"
	);
	const newName = watch("name");
	const merge = watch("merge");
	const { mutate: globalMutate } = useSWRConfig();

	const [alertOpen, setAlertOpen] = useState(false);

	const navigate = useNavigate()

	const submit = (data: UpdateTitleFieldFormFields) => {
		call(data).then((res) => {
			if (res) {
				globalMutate(`doc:${doctype}:${docname}`, undefined, false);
				//@ts-expect-error
				delete window.locals?.[doctype]?.[docname];
				shouldNavigate
					? doctype == "DocType" ? navigate(`/form/${data.name}`) : navigateToRecord(doctype as never, data.name, undefined, { replace: true })
					: null;
				onClose();
				formReset();
				reset();
				toast.success("Title Field Updated");
			}
		});
	};

	const onSubmit = useCallback(
		(data: UpdateTitleFieldFormFields) => {
			if (merge) {
				setAlertOpen(true);
			} else {
				submit(data);
			}
		},
		[merge, submit]
	);

	const handleClose = () => {
		onClose();
		formReset();
		reset();
		setAlertOpen(false);
	};

	const onMergeSubmit = () => {
		submit({
			...methods.getValues(),
			merge: 1,
		});
		setAlertOpen(false);
	};

	return (
		<>
			<Dialog open={isOpen} onOpenChange={handleClose}>
				<DialogContent className="max-w-md">
					<FormProvider {...methods}>
						<form onSubmit={handleSubmit(onSubmit)}>
							<DialogHeader>
								<DialogTitle>{"Rename"}</DialogTitle>
								<DialogClose />
							</DialogHeader>
							<ErrorBanner error={error} />
							<UpdateTitleFieldForm />
							<DialogFooter className="flex gap-2 mt-4">
								<Button variant="ghost" type="button" onClick={handleClose}>
									{"Close"}
								</Button>
								<Button type="button" disabled={loading} onClick={handleSubmit(onSubmit)}>
									{loading ? "Renaming..." : "Rename"}
								</Button>
							</DialogFooter>
						</form>
					</FormProvider>
				</DialogContent>
			</Dialog>
			<MergeAlert
				isOpen={alertOpen}
				isLoading={loading}
				onClose={() => setAlertOpen(false)}
				onMergeSubmit={onMergeSubmit}
				error={error}
				name={name}
				newName={newName}
			/>
		</>
	);
};

export const UpdateTitleFieldForm = () => {
	const { register, formState: { errors } ,watch} = useFormContext<UpdateTitleFieldFormFields>();

	const doctype = watch("doctype");

	return (
		<div className="flex flex-col gap-4 py-2">
			<div>
				<label className="block text-sm font-medium mb-1" htmlFor="name">
          Field Name <span className="text-red-500">*</span>
				</label>
				<Input
					id="name"
					placeholder={"New Title"}
					{...register("name", {
						required: ("Field Name is required"),
						maxLength: {
							value: 140,
							message: ("Field Name should not exceed 140 characters"),
						},
					})}
					autoFocus
				/>
				{errors.name && (
					<span className="text-xs text-red-500">{errors.name.message}</span>
				)}
			</div>
			{doctype !== "DocType" && (
				<div>
					<label className="flex items-center gap-2 text-sm font-medium">
						<Checkbox {...register("merge")} id="merge" />
            Merge with existing
					</label>
				</div>
			)}
		</div>
	);
};

export interface MergeAlertProps {
  isOpen: boolean;
  onClose: () => void;
  onMergeSubmit: () => void;
  error: any;
  name: string;
  newName: string;
  isLoading: boolean;
}

export const MergeAlert = ({
	isOpen,
	onClose,
	onMergeSubmit,
	error,
	name,
	newName,
	isLoading,
}: MergeAlertProps) => {
	return (
		<AlertDialog open={isOpen} onOpenChange={onClose}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{("Merge with existing field")}</AlertDialogTitle>
				</AlertDialogHeader>
				<AlertDialogDescription>
					<ErrorBanner error={error} />
					<div className="my-2">
            Are you sure you want to merge <strong>{name}</strong> with <strong>{newName}</strong>? This action cannot be undone.
					</div>
				</AlertDialogDescription>
				<AlertDialogFooter className="flex gap-2">
					<AlertDialogCancel asChild>
						<Button variant="ghost" disabled={isLoading} type="button">
							{("No")}
						</Button>
					</AlertDialogCancel>
					<Button
						variant="destructive"
						onClick={onMergeSubmit}
						disabled={isLoading}
						type="button"
					>
						{isLoading ? "Merging..." : ("Yes")}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};
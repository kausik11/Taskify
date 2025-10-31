import { FormElement } from "@/components/common/FormControl";
import { ErrorBanner } from "@/components/layout/AlertBanner/ErrorBanner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DocType } from "@/types/Core/DocType";
import { useFrappePostCall } from "frappe-react-sdk";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const CreateForm = ({
	isOpen,
	onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
	const methods = useForm<DocType>({
		defaultValues: {
			module: "Clapgrow App",
			custom: 1,
			permissions: [
				{
					create: 1,
					delete: 1,
					email: 1,
					export: 1,
					print: 1,
					read: 1,
					report: 1,
					role: "System Manager",
					share: 1,
					write: 1,
					submit: 0,
				},
				{
					create: 1,
					delete: 1,
					email: 1,
					export: 1,
					print: 1,
					read: 1,
					report: 1,
					role: "CG-ROLE-MEMBER",
					share: 1,
					write: 1,
					submit: 0,
				},
				{
					create: 1,
					delete: 1,
					email: 1,
					export: 1,
					print: 1,
					read: 1,
					report: 1,
					role: "CG-ROLE-ADMIN",
					share: 1,
					write: 1,
					submit: 0,
				},
				{
					create: 1,
					delete: 1,
					email: 1,
					export: 1,
					print: 1,
					read: 1,
					report: 1,
					role: "CG-ROLE-TEAM-LEAD",
					share: 1,
					write: 1,
					submit: 0,
				},
			],
			track_changes: 1,
		},
	});

	const { register, reset } = methods;

	const {
		call,
		error,
		loading,
		reset: createReset,
	} = useFrappePostCall("clapgrow_app.api.form.create_form.create_form");

	const navigate = useNavigate();

	useEffect(() => {
		reset();
		createReset();
	}, [isOpen, reset, createReset]);

	const onSubmit = async (data: DocType) => {
		call({ data: data }).then((res) => {
			toast.success("Form Created Successfully");
			navigate(`./${res?.message?.name}`);
			onClose();
		});
	};

	const module = methods.watch("module");

	const onStepChange = (checked: boolean) => {
		// if true change module to Clapgrow Step
		if (checked) {
			methods.setValue("module", "Clapgrow Step");
		} else {
			// if false change module to Clapgrow App
			methods.setValue("module", "Clapgrow App");
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent>
				<FormProvider {...methods}>
					<form onSubmit={methods.handleSubmit(onSubmit)}>
						<DialogHeader>
							<DialogTitle>Create Form</DialogTitle>
						</DialogHeader>
						<ErrorBanner error={error} />
						<div className="flex flex-col gap-4 py-4">
							<FormElement
								name="name"
								label="Form Name"
								aria-required
								id="name"
							>
								<Input
									id="name"
									placeholder="Form Name"
									{...register("name", {
										required: true,
										validate: (value) => {
											if (value.length < 3) {
												return "Form name must be at least 3 characters long";
											}
											return true;
										},
									})}
								/>
							</FormElement>
							<div className="flex flex-row items-center">
								<Checkbox
									id="is_step"
									checked={module === "Clapgrow Step"}
									onCheckedChange={onStepChange}
								/>
								<label htmlFor="is_step" className="ml-2 text-sm">
                  Is Step Form?
								</label>
							</div>
						</div>
						<DialogFooter>
							<DialogClose asChild>
								<Button variant="outline">Close</Button>
							</DialogClose>
							<Button
								type="submit"
								onClick={methods.handleSubmit(onSubmit)}
								disabled={loading}
								className="bg-blue-500 text-white hover:bg-blue-600"
							>
                Save
							</Button>
						</DialogFooter>
					</form>
				</FormProvider>
			</DialogContent>
		</Dialog>
	);
};

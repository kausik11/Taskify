import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocType } from "@/types/Core/DocType";
import { FrappeDoc } from "frappe-react-sdk";
import { FieldValues, FormProvider, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import FormBuilder from "./FormBuilder";
import { useState } from "react";
import { KeyedMutator } from "swr";
import { ErrorBanner } from "@/components/layout/AlertBanner/ErrorBanner";
import { isEmpty } from "@/hooks/checks";
import useFrappeGetFormDoc, {
	FormDoc,
	FormGetDocResponse,
} from "@/hooks/useFrappeGetFormDoc";
import useFrappeSaveFormDoc from "@/hooks/useFrappeSaveFormDoc";
import { useSaveHotkey } from "@/hooks/useReactHotKeys";
import { FullPageLoader } from "@/components/common/FullPageLoader/FullPageLoader";
import { removeFrappeFields } from "@/utils/removeFrappeFields";
import { SpinnerLoader } from "@/components/common/FullPageLoader/SpinnerLoader";
import { Settings } from "./Settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteRecordButton } from "../../Table/DeleteDoctype";
import { Edit } from "lucide-react";
import { UpdateTitleField } from "../../Table/UpdateTitle";

export const ViewForm = () => {
	const { ID } = useParams();

	const { data, error, isLoading, mutate, isValidating } = useFrappeGetFormDoc(
		"DocType",
		ID ?? "",
	);

	return (
		<div className="flex flex-col w-full h-[92vh] overflow-hidden">
			{(isLoading || isValidating) && <FullPageLoader />}
			<ErrorBanner error={error} />
			{data && (
				<ViewFormScreen
					data={data.docs?.[0]}
					mutate={mutate}
					isValidating={isValidating}
				/>
			)}
		</div>
	);
};

interface PageEditFormProps<T> {
  data: FormDoc<T>;
  mutate: KeyedMutator<FormGetDocResponse<T>>;
  isValidating: boolean;
}

const ViewFormScreen = ({ data, mutate, isValidating }: PageEditFormProps<T>) => {
	const methods = useForm<FieldValues>({
		defaultValues: {
			doctype: "DocType",
			...removeFrappeFields(data as FrappeDoc<DocType>),
		},
	});

	const { formState: { dirtyFields } } = methods

	const isDirty = !isEmpty(dirtyFields)

	const { saveDoc, loading, error } = useFrappeSaveFormDoc<T>()


	const [formSubmitting, setFormSubmitting] = useState(false)


	const onSubmit = async (formData: FieldValues) => {
		setFormSubmitting(true)

		saveDoc(
			{
				...data,
				...formData,
				"__unsaved": 1,
			}
		)
			.then((res) => {
				// Mutate the data without revalidating
				mutate((d) => {
					if (!d) return d

					return {
						...d,
						...res
					}
				}, {
					revalidate: false
				})

				// Set form submitting to false after 1 second
				setTimeout(() => {
					setFormSubmitting(false)
				}, 1000)

				// Reset the form
				if (res) {
					const doc = res.docs?.[0]
					methods.reset({
						...doc,
						docstatus: doc.docstatus,
						__unsaved: 0
					})
				}
			})
			.catch(() => {
				setFormSubmitting(false)
			})
	};

	const { saveButtonRef } = useSaveHotkey()

	const [open, setOpen] = useState(false);

	const onOpen = () => {
		setOpen(true);
	};

	const onClose = () => {
		setOpen(false);
	};

	const [editOpen, setEditOpen] = useState(false);

	const onEditOpen = () => {
		setEditOpen(true);
	};

	const onEditClose = () => {
		setEditOpen(false);
	};

	const navigate = useNavigate();

	const onDeleteSuccess = () => {
		// Handle post-delete actions, like redirecting or showing a message
		navigate('/form');
	};

	return (
		<Card className="h-full w-full overflow-auto">
			<FormProvider {...methods}>
				<form
					onSubmit={methods.handleSubmit(onSubmit)}
				>
					<CardHeader className="border-b border-gray-200 py-4">
						<CardTitle className="flex flex-row items-center justify-between">
							<div className="flex flex-row items-center gap-2">
								<h2 className="text-lg font-medium text-gray-800">{data?.name}</h2>
								<Button type="button" variant={'ghost'} size={'icon'} onClick={onEditOpen} disabled={loading} className="h-8 w-8">
									<Edit className="h-4 w-4" />
								</Button>
							</div>
							<div className="flex items-center gap-2">
								<Button
									type="button"
									className="bg-red-500 hover:bg-red-600 text-white font-bold"
									size="sm"
									onClick={onOpen}
									disabled={loading}
								>
                                    Delete
								</Button>
								<Button
									type="submit"
									className="bg-blue-500 hover:bg-blue-600 text-white font-bold"
									size="sm"
									disabled={loading || !isDirty}
									ref={saveButtonRef}
								>
                                    Save
									{loading && <SpinnerLoader className="ml-2" />}
								</Button>
							</div>
						</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col h-full overflow-auto py-2">
						<ErrorBanner error={error} />
						<Tabs defaultValue="form" className="w-full">
							<TabsList>
								<TabsTrigger value="form">Form</TabsTrigger>
								<TabsTrigger value="settings">Settings</TabsTrigger>
							</TabsList>
							<TabsContent value="form" className="w-full py-2">
								<FormBuilder />
							</TabsContent>
							<TabsContent value="settings" className="w-full py-4">
								<Settings />
							</TabsContent>
						</Tabs>
					</CardContent>
				</form>
			</FormProvider>
			<DeleteRecordButton docname={data.name} isOpen={open} onClose={onClose} onDeleteSuccess={onDeleteSuccess} />
			<UpdateTitleField docname={data.name} isOpen={editOpen} onClose={onEditClose} mutate={mutate} name={data.name} doctype={data.doctype} />
		</Card>
	);

};

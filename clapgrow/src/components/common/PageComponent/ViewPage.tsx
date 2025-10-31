
import { useParams } from "react-router-dom"
import { FullPageLoader } from "../FullPageLoader/FullPageLoader"
import { KeyedMutator } from "swr"
import { FieldValues, FormProvider, useForm } from "react-hook-form"
import { isEmpty } from "@/hooks/checks"
import { useSaveHotkey } from "@/hooks/useReactHotKeys"
import { useFrappeDocumentEventListener } from "frappe-react-sdk"
import { useState, Suspense } from "react"
import DocumentContext from "./DocumentContext"
import { DocumentFormPage } from "../FormComponent/DocumentFormPage"
import RefreshEventAlert from "./RefreshAlert"
import { ToolbarBreadCrumbs } from "../Toolbar/ToolbarBreadCrumbs"
import { ToolbarContainer } from "../Toolbar/ToolbarContainer"
import { Toolbar } from "../Toolbar/Toolbar"
import { ErrorBanner } from "@/components/layout/AlertBanner/ErrorBanner"
import useFrappeGetFormDoc, { FormDoc, FormGetDocResponse } from "@/hooks/useFrappeGetFormDoc"
import useFrappeSaveFormDoc from "@/hooks/useFrappeSaveFormDoc"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit } from "lucide-react"
import { UpdateTitleField } from "../Table/UpdateTitle"

export const ViewPage = ({ doctype, title }: { doctype: string, title?: string }) => {

	const { ID } = useParams<{ ID: string }>()
	const { data, error, isLoading, mutate, isValidating } = useFrappeGetFormDoc(doctype, ID ?? '')
	return (
		<div>
			{(isLoading || isValidating) && <FullPageLoader className="w-full h-full" />}
			<ErrorBanner error={error} />
			{data && data.docs && <PageEditForm data={data.docs?.[0]} mutate={mutate} key={ID ?? ''}
				doctype={doctype} isValidating={isValidating} title={title ?? doctype} />}
		</div>
	)
}


interface PageEditFormProps<T> {
  data: FormDoc<T>;
  mutate: KeyedMutator<FormGetDocResponse<T>>;
  doctype: string;
  isValidating: boolean;
  title: string;
}

/**
 * PageEditForm is the form for the view page.
 * @param data data of the document
 * @param hasWorkflow whether the document has workflow flag
 * @param mutate mutate function from SWR
 * @param doctype doctype of the form
 * @param form form component to render
 * */

const PageEditForm = <T,>({ data, mutate, doctype, isValidating, title }: PageEditFormProps<T>) => {

	const methods = useForm<FieldValues>({
		defaultValues: {
			doctype: doctype,
			...data,
			docstatus: data?.docstatus,
			__onload: undefined,
		},
	})

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
				// @ts-expect-error expected
				delete window?.locals?.[doctype]?.[data.name]
			})
			.catch(() => {
				setFormSubmitting(false)
			})
	}

	const [newDataAvailable, setNewDataAvailable] = useState(false)

	const onReload = () => {
		mutate()
			.then(res => {
				if (res) {
					methods.reset({
						...res.docs[0],
						docstatus: res.docs[0].docstatus,
						__onload: undefined
					})
				}

				setNewDataAvailable(false)

			})
	}

	const eventData = useFrappeDocumentEventListener(doctype, data.name, () => {
		if (!isValidating && !formSubmitting) {
			setNewDataAvailable(true)
		}
	})

	const { saveButtonRef } = useSaveHotkey()

	const [editOpen, setEditOpen] = useState(false);

	const onEditOpen = () => {
		setEditOpen(true);
	};

	const onEditClose = () => {
		setEditOpen(false);
	};


	return (
		<Card className="p-2 w-full h-[90vh] overflow-auto">
			<DocumentContext.Provider value={{ onload: data.__onload ?? {} }}>

				<FormProvider {...methods}>
					<form onSubmit={methods.handleSubmit(onSubmit)}>
						<CardHeader className="p-6 pb-2">
							<ToolbarContainer>
								<ToolbarBreadCrumbs doctype={doctype} currentPage={data.name} customLabel={title} />
								<Toolbar
									doctype={doctype}
									docname={data.name}
									doc={data}
									beforeDelete={() => setFormSubmitting(true)}
									docViewers={eventData?.viewers ?? []}
									saveButtonProps={{
										loading,
										saveButtonRef
									}}
									onUpdate={onReload}
								/>
							</ToolbarContainer>
							<div className="flex items-center gap-2">
								<h1 className="text-xl font-semibold">{data.name}</h1>
								<Button type="button" variant={'ghost'} size={'icon'} onClick={onEditOpen} disabled={loading} className="h-8 w-8">
									<Edit className="h-4 w-4" />
								</Button>
								{isDirty && (
									<Badge variant="secondary" className="text-red-500 bg-red-50 border-red-100 mt-1">
                                        Not Saved
									</Badge>
								)}
							</div>

						</CardHeader>
						<CardContent className="p-6">
							{isDirty && <ErrorBanner error={error} />}
							{newDataAvailable && <RefreshEventAlert onReload={onReload} />}
							<Suspense fallback={<Skeleton className="w-full h-32" />}>
								<DocumentFormPage doctype={doctype} isEdit={true} />
							</Suspense>
						</CardContent>
					</form>
				</FormProvider>

			</DocumentContext.Provider>
			<UpdateTitleField docname={data.name} isOpen={editOpen} onClose={onEditClose} mutate={mutate} name={data.name} doctype={doctype} />
		</Card>
	)
}

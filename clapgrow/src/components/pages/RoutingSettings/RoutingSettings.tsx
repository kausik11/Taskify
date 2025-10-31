import { FullPageLoader } from "@/components/common/FullPageLoader/FullPageLoader";
import { SpinnerLoader } from "@/components/common/FullPageLoader/SpinnerLoader";
import DocumentContext from "@/components/common/PageComponent/DocumentContext";
import RefreshEventAlert from "@/components/common/PageComponent/RefreshAlert";
import { getEditor } from "@/components/common/TableEditor/getEditor";
import { TableEditor } from "@/components/common/TableEditor/TableEditor";
import { ViewerAvatarGroupElement } from "@/components/common/Toolbar/Actions/AvatarGroup";
import { ErrorBanner } from "@/components/layout/AlertBanner/ErrorBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { isEmpty } from "@/hooks/checks";
import useFrappeGetFormDoc, {
	FormDoc,
	FormGetDocResponse,
} from "@/hooks/useFrappeGetFormDoc";
import useFrappeSaveFormDoc from "@/hooks/useFrappeSaveFormDoc";
import { useSaveHotkey } from "@/hooks/useReactHotKeys";
import { ColDef } from "ag-grid-community";
import { useFrappeDocumentEventListener } from "frappe-react-sdk";
import { useMemo, useState } from "react";
import { useForm, FieldValues, FormProvider } from "react-hook-form";
import { KeyedMutator } from "swr";

export const RoutingSettings = () => {
	const { data, error, isLoading, mutate, isValidating } = useFrappeGetFormDoc(
		"Clapgrow Routing Configuration",
		"Clapgrow Routing Configuration",
	);
	return (
		<div>
			{(isLoading || isValidating) && (
				<FullPageLoader className="w-full h-full" />
			)}
			<ErrorBanner error={error} />
			{data && data.docs && (
				<PageEditForm
					data={data.docs?.[0]}
					mutate={mutate}
					key={data.docs?.[0].name}
					doctype={"Clapgrow Routing Configuration"}
					isValidating={isValidating}
					title={"Routing Settings"}
				/>
			)}
		</div>
	);
};

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
const PageEditForm = <T,>({
	data,
	mutate,
	doctype,
	isValidating,
	title,
}: PageEditFormProps<T>) => {
	const methods = useForm<FieldValues>({
		defaultValues: {
			doctype: doctype,
			...data,
			docstatus: data?.docstatus,
			__onload: undefined,
		},
	});

	const {
		formState: { dirtyFields },
	} = methods;

	const isDirty = !isEmpty(dirtyFields);

	const { saveDoc, loading, error } = useFrappeSaveFormDoc<T>();

	const [formSubmitting, setFormSubmitting] = useState(false);

	const onSubmit = async (formData: FieldValues) => {
		setFormSubmitting(true);
		saveDoc({
			...data,
			...formData,
			__unsaved: 1,
		})
			.then((res) => {
				// Mutate the data without revalidating
				mutate(
					(d) => {
						if (!d) return d;

						return {
							...d,
							...res,
						};
					},
					{
						revalidate: false,
					},
				);

				// Set form submitting to false after 1 second
				setTimeout(() => {
					setFormSubmitting(false);
				}, 1000);

				// Reset the form
				if (res) {
					const doc = res.docs?.[0];
					methods.reset({
						...doc,
						docstatus: doc.docstatus,
						__unsaved: 0,
					});
				}
				// @ts-expect-error expected
				delete window?.locals?.[doctype]?.[data.name];
			})
			.catch(() => {
				setFormSubmitting(false);
			});
	};

	const [newDataAvailable, setNewDataAvailable] = useState(false);

	const onReload = () => {
		mutate().then((res) => {
			if (res) {
				methods.reset({
					...res.docs[0],
					docstatus: res.docs[0].docstatus,
					__onload: undefined,
				});
			}

			setNewDataAvailable(false);
		});
	};

	const eventData = useFrappeDocumentEventListener(doctype, data.name, () => {
		if (!isValidating && !formSubmitting) {
			setNewDataAvailable(true);
		}
	});

	const { saveButtonRef } = useSaveHotkey();

	return (
		<DocumentContext.Provider value={{ onload: data.__onload ?? {} }}>
			<FormProvider {...methods}>
				<form onSubmit={methods.handleSubmit(onSubmit)}>
					<div className="flex items-center justify-between px-6 pt-4">
						<div className="flex items-center gap-2">
							<h1 className="text-xl font-semibold">{title ?? data.name}</h1>
							{isDirty && (
								<Badge
									variant="secondary"
									className="text-red-500 bg-red-50 border-red-100 mt-1"
								>
                  Not Saved
								</Badge>
							)}
						</div>
						<div className="flex items-center gap-2">
							{eventData &&
                eventData?.viewers &&
                eventData.viewers.length > 0 && (
								<ViewerAvatarGroupElement users={eventData.viewers} />
							)}
							<Button
								size="sm"
								type="submit"
								ref={saveButtonRef}
								disabled={!isDirty || loading}
								aria-disabled={!isDirty || loading}
								className="flex w-14 items-center bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{loading ? <SpinnerLoader className="mr-2" /> : "Save"}
							</Button>
						</div>
					</div>
					<CardContent className="p-6">
						{isDirty && <ErrorBanner error={error} />}
						{newDataAvailable && <RefreshEventAlert onReload={onReload} />}
						<RoutingFormPage />
						{/* Add other form components here as needed */}
					</CardContent>
				</form>
			</FormProvider>
		</DocumentContext.Provider>
	);
};

const RoutingFormPage = () => {
	const colDefs = useMemo(() => {
		return [
			{
				field: "label",
				headerName: "Label",
				...getEditor("Data"),
				width: 200,
			},
			{
				field: "doctype_name",
				headerName: "Doctype Name",
				...getEditor("Link", {
					props: {
						doctype: "DocType",
						filters: [
							["custom", "=", 1],
							["module", "=", "Clapgrow App"],
						],
					},
				}),
				width: 200,
			},
			{
				field: "url",
				headerName: "URL",
				...getEditor("Data"),
				width: 200,
			},
			{
				field: "hide",
				headerName: "Hide",
				...getEditor("Check"),
				width: 100,
			},
			{
				field: "list_props",
				headerName: "List Props",
				...getEditor("Small Text"),
				width: 250,
				flex: 1,
			},
		] as ColDef[];
	}, []);

	return (
		<TableEditor
			name="routing"
			doctype="Routing Configuration"
			defaultInitialValues={{}}
			colDefs={colDefs}
		/>
	);
};

import { isEmpty } from "@/hooks/checks";
import { useSaveHotkey } from "@/hooks/useReactHotKeys";
import { Suspense } from "react";
import { FieldValues, FormProvider, useForm } from "react-hook-form";
import { SpinnerLoader } from "../FullPageLoader/SpinnerLoader";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAutofillFields } from "@/hooks/useAutofillFields";
import useFrappeSaveFormDoc from "@/hooks/useFrappeSaveFormDoc";
import { ErrorBanner } from "@/components/layout/AlertBanner/ErrorBanner";
import { Badge } from "@/components/ui/badge";
import { DocumentFormPage } from "../FormComponent/DocumentFormPage";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useGetRouting } from "@/hooks/useGetRouting";
import { Link } from "react-router-dom";

interface CreatePageProps {
  doctype: string;
  name: string;
  defaultValues?: FieldValues;
  title?: string;
}

export const CreatePage = ({
	doctype,
	name,
	defaultValues,
	title,
}: CreatePageProps) => {
	const { navigateToRecord, getRoute } = useGetRouting();
	const autoFillFields = useAutofillFields();

	const methods = useForm({
		defaultValues: {
			doctype,
			name: name ?? "",
			...defaultValues,
			...(autoFillFields ?? {}),
		},
	});

	const {
		formState: { dirtyFields },
	} = methods;

	const isDirty = !isEmpty(dirtyFields);

	const { saveDoc, loading, error } = useFrappeSaveFormDoc<any>();

	const onSubmit = async (data: FieldValues) => {
		return saveDoc({
			doctype,
			...data,
			__unsaved: 1,
			__islocal: 1,
			name,
			docstatus: 0,
		}).then((res) => {
			const doc = res.docs?.[0];
			//@ts-expect-error expecting window to have locals
			if (window.locals?.[doctype]?.[name]) {
				//@ts-expect-error expecting window to have locals
				window.locals[doctype][name] = {
					...doc,
					__unsaved: 0,
					__islocal: 0,
					__created: 1,
				};
			}
			navigateToRecord(doctype as never, doc.name, undefined, {
				replace: true,
			});
		});
	};

	const { saveButtonRef } = useSaveHotkey();

	return (
		<Card className="p-2 w-full h-[90vh] overflow-auto">
			<FormProvider {...methods}>
				<form onSubmit={methods.handleSubmit(onSubmit)}>
					<CardHeader className="p-6 pb-2">
						<div className="flex justify-between items-center">
							<Breadcrumb>
								<BreadcrumbList>
									<BreadcrumbItem>
										<BreadcrumbLink
											asChild
											// href={getRoute(doctype as never)}
										>
											<Link to={getRoute(doctype as never)}>
												{title ?? doctype}
											</Link>
										</BreadcrumbLink>
									</BreadcrumbItem>
									<BreadcrumbSeparator />
									<BreadcrumbItem>
										<BreadcrumbPage>{`New ${title ?? doctype}`}</BreadcrumbPage>
									</BreadcrumbItem>
								</BreadcrumbList>
							</Breadcrumb>
							<Button
								ref={saveButtonRef}
								type="submit"
								disabled={loading}
								size={"sm"}
								className="flex items-center bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
							>
                Save
								{loading ? <SpinnerLoader className="ml-2" /> : null}
							</Button>
						</div>
						<div className="flex items-center gap-2">
							<h1 className="text-xl font-semibold">{`New ${doctype}`}</h1>
							{isDirty && (
								<Badge
									variant="secondary"
									className="text-red-500 bg-red-50 border-red-100 mt-1"
								>
                  Not Saved
								</Badge>
							)}
						</div>
					</CardHeader>
					<CardContent className="p-6">
						<ErrorBanner error={error} />
						<Suspense fallback={<Skeleton className="w-full h-32" />}>
							{/* {children} */}
							<DocumentFormPage doctype={doctype} />
						</Suspense>
					</CardContent>
				</form>
			</FormProvider>
		</Card>
	);
};

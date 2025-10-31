import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { CreateForm } from "@/components/common/features/formbuilder/CreateForm";
import { ExternalLink, Plus, Trash } from "lucide-react";
import DoctypeList from "../DataGrid/DataGridWithMeta";
import { ColumnProps } from "../DataGrid/DataGridComponent";
import { DeleteRecordButton } from "./DeleteDoctype";
import { useGetRouting } from "@/hooks/useGetRouting";

export const FormList = () => {

	const [createOpen, setCreateOpen] = useState(false);

	const onClose = () => {
		setCreateOpen(false);
	}

	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleteID, setDeleteID] = useState<string | null>(null);

	const onDeleteOpen = (id: string) => {
		setDeleteID(id);
		setDeleteOpen(true);
	}

	const onDeleteClose = () => {
		setDeleteOpen(false);
		setDeleteID(null);
	}

	const { navigate } = useGetRouting()

	const additionalColumns: ColumnProps[] = [
		{
			fieldname: 'creation',
			label: 'Actions',
			type: 'custom',
			overrideProps: {
				cellRenderer: (params: any) => (
					<div className="flex flex-row gap-2">
						<Button size={'icon'} variant={'link'} onClick={() => navigate(params.data.name as never)}>
							<ExternalLink className="h-4 w-4" />
						</Button>
						<Button size={'icon'} variant={'destructive'} onClick={() => onDeleteOpen(params.data.name)} className="h-6 w-6 items-center mt-1">
							<Trash className="h-4 w-4" />
						</Button>
					</div>
				),
			},
			hidden: false,

		},
	];

	const overrideColumns: Record<string, Omit<ColumnProps, "fieldname">> = {
		'module': {
			overrideProps: {
				valueGetter: (params: any) => {
					return params.data.module === "Clapgrow App" ? "Form" : params.data.module === "Clapgrow Step" ? "Step Form" : params.data.module
				}
			}
		}
	}

	return (
		<Card className="p-4 h-[90vh] w-full overflow-hidden">
			<CardHeader className="pb-0">
				<CardTitle className="flex items-center justify-between">
					<h1 className="text-2xl font-bold">{"Forms"}</h1>
					<Button type="button" onClick={() => setCreateOpen(true)} className="bg-blue-500 text-white hover:bg-blue-600">
						Add <Plus />
					</Button>
				</CardTitle>
				<CardDescription>
					Create and manage your forms here. Click on the form name to view or edit the form.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex  h-[76vh] overflow-hidden">
				<DoctypeList additionalColumns={additionalColumns} doctype="DocType" mandatoryFilters={[['custom', '=', 1], ['module', 'in', ['Clapgrow App', 'Clapgrow Step']]]} overrideColumns={overrideColumns} />
				<CreateForm isOpen={createOpen} onClose={onClose} />
			</CardContent>
			{deleteID && <DeleteRecordButton docname={deleteID} isOpen={deleteOpen} onClose={onDeleteClose} />}
		</Card>
	)
};

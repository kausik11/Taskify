import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DoctypeList from "../DataGrid/DataGridWithMeta";
import { ColumnProps } from "../DataGrid/DataGridComponent";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

const VITE_CLAPGROW_WORKFLOW_URL = import.meta.env.VITE_CLAPGROW_WORKFLOW_URL;


export const WorkflowGridList = () => {

	const navigate = useNavigate();

	const overrideColumns: Record<string, Omit<ColumnProps, 'fieldname'>> = {
		name: {
			type: 'custom-link',
			overrideProps: {
				onCellClicked: (rowData) => { 
					const name = rowData.data.name;
					navigate(`../workflow-grid/${name}`);
				}
			}
		}
	}

	const onViewClick = (ID: string) => {
		const URL = `${VITE_CLAPGROW_WORKFLOW_URL}/${ID}`;

		window.location.assign(URL);
	}

	const backTOList = () => {
		const URL = `${VITE_CLAPGROW_WORKFLOW_URL}`;

		window.location.assign(URL);
	}

	const additionalColumns: ColumnProps[] = [
		{
			fieldname: 'creation',
			label: 'Actions',
			type: 'custom',
			overrideProps: {
				cellRenderer: (params: any) => (
					<Button size={'icon'} variant={'ghost'} onClick={() => onViewClick(params.data.name)}  className="h-6 w-6 items-center mt-1">
						<Eye className="h-4 w-4" />
					</Button>

				),
			},
			hidden: false,

		},
	];

	return (
		<Card className="p-4 h-[90vh] w-full gap-0 overflow-hidden">
			<CardHeader className="pb-0">
				<CardTitle className="flex items-center justify-between">
					<h1 className="text-2xl font-bold">{"Workflow Grid"}</h1>
					<Button  size={'sm'} type="button" onClick={backTOList} className="bg-blue-500 text-white hover:bg-blue-600">
                        List View <ExternalLink className="ml-1 h-4 w-4" />
					</Button>
				</CardTitle>
			</CardHeader>
			<CardContent className="flex h-[82vh] overflow-hidden">
				<DoctypeList doctype="Clapgrow Workflow" overrideColumns={overrideColumns} additionalColumns={additionalColumns}/>
			</CardContent>
		</Card>
	)
};

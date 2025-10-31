import { Archive, Copy, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import TeamMembersTable from "../settings/TeamMembersTable";
import AGComponent from "../AGComponent";

interface MisData {
  TeamMember: string;
  Department: string;
  KRA: string;
  KPI: string;
  CurrentWeekPlan: number;
  CurrentWeekActual: number;
  TeamMemberProjected: number;
  CurrentWeekActualpercentage: number;
}

const misDummyData: MisData[] = [
	{
		TeamMember: "Alice Johnson",
		Department: "Marketing",
		KRA: "Lead Generation",
		KPI: "Number of Leads",
		CurrentWeekPlan: 50,
		CurrentWeekActual: 45,
		TeamMemberProjected: 55,
		CurrentWeekActualpercentage: 90,
	},
	{
		TeamMember: "Bob Smith",
		Department: "Sales",
		KRA: "Client Conversion",
		KPI: "Closed Deals",
		CurrentWeekPlan: 30,
		CurrentWeekActual: 32,
		TeamMemberProjected: 35,
		CurrentWeekActualpercentage: 106.67,
	},
	{
		TeamMember: "Cathy Nguyen",
		Department: "Product",
		KRA: "Feature Delivery",
		KPI: "Features Delivered",
		CurrentWeekPlan: 5,
		CurrentWeekActual: 4,
		TeamMemberProjected: 6,
		CurrentWeekActualpercentage: 80,
	},
	{
		TeamMember: "David Lee",
		Department: "Engineering",
		KRA: "Code Quality",
		KPI: "Bug-Free Deployments",
		CurrentWeekPlan: 10,
		CurrentWeekActual: 10,
		TeamMemberProjected: 10,
		CurrentWeekActualpercentage: 100,
	},
	{
		TeamMember: "Emma Patel",
		Department: "Design",
		KRA: "User Experience",
		KPI: "Mockups Delivered",
		CurrentWeekPlan: 8,
		CurrentWeekActual: 9,
		TeamMemberProjected: 7,
		CurrentWeekActualpercentage: 112.5,
	},
];
const ProjectMIS = () => {
	const [isProjectOpen, setIsProjectOpen] = useState(false);
	const [currentPage, setCurrentPage] = useState<number>(1);

	const columns = useMemo(
		() => [
			{
				headerName: "Team Member",
				field: "TeamMember",
				flex: 1,
				minWidth: 100,
				filter: true,
				cellRenderer: (params: any) => (
					<p className="truncate text-[14px] text-[#5B5967] font-[400] text-left">
						{params.data?.TeamMember}
					</p>
				),
			},
			{
				headerName: "Department",
				field: "Department",
				flex: 1,
				minWidth: 100,
				filter: true,
				cellRenderer: (params: any) => (
					<p className="truncate text-[14px] text-[#5B5967] font-[400] text-left">
						{params.data?.Department}
					</p>
				),
			},
			{
				headerName: "KRA",
				field: "KRA",
				flex: 1,
				minWidth: 100,
				filter: true,
				cellRenderer: (params: any) => (
					<p className="truncate text-[14px] text-[#5B5967] font-[400] text-left">
						{params.data?.KRA}
					</p>
				),
			},
			{
				headerName: "KPI",
				field: "KPI",
				flex: 1,
				minWidth: 100,
				filter: true,
				cellRenderer: (params: any) => (
					<p className="truncate text-[14px] text-[#5B5967] font-[400] text-left">
            % of {params.data?.KPI}
					</p>
				),
			},
			{
				headerName: "Current week Planned",
				field: "CurrentWeekPlan",
				flex: 1,
				maxWidth: 100,
				filter: true,
				cellRenderer: (params: any) => (
					<p className="truncate text-[14px] text-[#5B5967] font-[400] text-left">
						{params.data?.CurrentWeekPlan}
					</p>
				),
			},
			{
				headerName: "Current week Actual",
				field: "CurrentWeekActual",
				flex: 1,
				maxWidth: 100,
				filter: true,
				cellRenderer: (params: any) => (
					<p className="truncate text-[14px] text-[#5B5967] font-[400] text-left">
						{params.data?.CurrentWeekActual}
					</p>
				),
			},
			// {
			//   headerName: "Team Member Projected",
			//   field: "TeamMemberProjected",
			//   flex: 1,
			//   maxWidth: 100,
			//   filter: false,
			//   cellRenderer: (params: any) => (
			//     <p className="truncate text-[14px] text-[#5B5967] font-[400] text-left">
			//       {params.data?.CurrentWeekActual}
			//     </p>
			//   ),
			// },
			{
				headerName: "Current week Actual %",
				field: "CurrentWeekActualpercentage",
				flex: 1,
				maxWidth: 100,
				filter: false,
				cellRenderer: (params: any) => (
					<p className="truncate text-[14px] text-[#5B5967] font-[400] text-left">
						{params.data?.CurrentWeekActualpercentage}
					</p>
				),
			},
		],
		[],
	);

	return (
		<section className="w-full h-full">
			<div className=" flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
				<div className="flex flex-col sm:flex-row sm:items-center justify-left gap-3 mb-3">
					<h1 className="text-[14px] font-[600]">MIS Report</h1>
				</div>

				<div className="flex gap-2">
					<div className="flex items-center gap-2">
						<button className="bg-white border border-[#ACABB2] h-[36px] w-[36] rounded-[8px] px-[10px] py-[7px]">
							<Copy className="w-[18px] h-[18px]" />
						</button>

						<button className="bg-white border border-[#ACABB2] h-[36px] w-[36] rounded-[8px] px-[10px] py-[7px]">
							<Trash2 className="w-[18px] h-[18px]" />
						</button>
					</div>
				</div>
			</div>
			<AGComponent
				tableType="TaskTable"
				tableData={misDummyData || []}
				columnDefsMemo={columns}
				TableHeight="500px"
			/>
		</section>
	);
};

export default ProjectMIS;

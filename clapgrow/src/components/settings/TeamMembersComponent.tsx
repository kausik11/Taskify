import { CGUser } from "@/types/ClapgrowApp/CGUser";
import { useFrappeGetDocCount, useFrappeGetDocList } from "frappe-react-sdk";
import { useContext, useEffect, useMemo, useState } from "react";
import AddMemberSheet from "./AddMemberSheet";
import BulkUploadDialog from "./BulkUploadSheet";
import TeamMembersTable from "./TeamMembersTable";
import { UserContext } from "@/utils/auth/UserProvider";
import downloadIcon from "@/assets/icons/downloand-icon.svg";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

const TeamMembersComponent = () => {
	const { roleBaseName, userDetails, companyDetails } = useContext(UserContext);
	const [currentPage, setCurrentPage] = useState<number>(1);
	

	const { data: userListForDownload, error: downloadError } =
		useFrappeGetDocList<CGUser>("CG User", {
			fields: [
				"name",
				"full_name",
				"email",
				"phone",
				"branch_id",
				"department_id",
				"creation",
				"role",
				"report_to.superior",
			],
			filters: [
				["company_id", "=", `${userDetails?.[0]?.company_id}`],
				["enabled", "=", 1],
			],
			limit: 0,
			 orderBy: { field: "full_name", order: "asc" },
		});

		const recordsPerPage = userListForDownload?.length || 0;
	const downloadUsers = () => {
		try {
			if (!userListForDownload || userListForDownload.length === 0) {
				alert("No users found to download.");
				return;
			}

			// Define CSV headers
			const headers = [
				"Name",
				"Email",
				"Phone",
				"Branch",
				"Department",
				"Joined On",
				"Role",
				"Reports To",
			];
			// Map user data to CSV rows
			const csvRows = [
				headers.join(","), // Header row
				...userListForDownload.map((user) => {
					// Format the creation date as "DD MMMM, YYYY" (e.g., "04 July, 2025") using en-IN
					const formattedDate = user.creation
						? new Date(user.creation).toLocaleDateString("en-IN", {
							day: "2-digit",
							month: "long",
							year: "numeric",
						})
						: "";
					return [
						`"${user.full_name || ""}"`,
						`"${user.email || ""}"`,
						`"${user.phone || ""}"`,
						`"${user.branch_id?.split("-")[0] || ""}"`,
						`"${user.department_id?.split("-")[0] || ""}"`,
						`"${formattedDate}"`,
						`"${user.role?.split("-")[1] || ""}"`,
						`"${user.superior || ""}"`,
					].join(",");
				}),
			];

			// Create CSV content
			const csvContent = csvRows.join("\n");

			// Create a Blob for the CSV file
			const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
			const url = URL.createObjectURL(blob);

			// Create a link element to trigger the download
			const link = document.createElement("a");
			link.setAttribute("href", url);
			link.setAttribute(
				"download",
				`team_members_${new Date()
					.toLocaleDateString("en-IN", {
						day: "2-digit",
						month: "long",
						year: "numeric",
					})
					.replace(/ /g, "_")}.csv`,
			);
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error("Error downloading users:", error);
			alert("An error occurred while downloading the user list.");
		}
	};

	const companyId = useMemo(() => {
		return companyDetails && companyDetails.length > 0
			? companyDetails[0].name
			: null;
	}, [companyDetails]);

	const { data: totalRecords } = useFrappeGetDocCount("CG User", [
		["company_id", "=", companyId], ["enabled", "=", 1]

	]);

	const { data: TeammemberData, mutate } = useFrappeGetDocList<CGUser>(
		"CG User",
		{
			fields: ["*"],
			filters: [
				["company_id", "=", `${userDetails?.[0]?.company_id}`],
				["enabled", "=", 1],
			],
			limit: recordsPerPage,
			limit_start: (currentPage - 1) * recordsPerPage,
			orderBy: { field: "full_name", order: "asc" },
		},
		{ deps: [currentPage] },
	);

	useEffect(() => {
		if (downloadError) {
			console.error("Error fetching users for download:", downloadError);
			alert("An error occurred while fetching the user list for download.");
		}
	}, [downloadError]);

	useEffect(() => {
		mutate();
	}, []);

	return (
		<section className="mt-5 mx-5 space-y-5">
			<div className="flex items-center justify-between">
				<h1 className="font-[600] text-[18px] text-[#2D2C37]">Team Members</h1>
				<div className="flex items-center gap-x-2">
					{roleBaseName === "ROLE-Admin" && (
						<div className="flex flex-row gap-4">
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger>
										<div className="bg-white border border-[#ACABB2] rounded-[8px] px-[10px] py-[7px]">
											<img
												src={downloadIcon}
												alt="Download Users"
												className="w-[20px] h-[20px]"
												onClick={downloadUsers}
											/>
										</div>
									</TooltipTrigger>
									<TooltipContent className="font-medium text-sm">
										<p>Download Users</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
							{/* Add the BulkUploadDialog component */}
							<BulkUploadDialog onBulkUploadComplete={mutate} />
							<AddMemberSheet onTeamMemberAdded={mutate} />
						</div>
					)}
				</div>
			</div>
			<TeamMembersTable
				setCurrentPage={setCurrentPage}
				totalRecords={totalRecords || 0}
				recordsPerPage={recordsPerPage}
				currentPage={currentPage}
				TeammemberData={TeammemberData || []}
				onTeamMemberAdded={mutate}
			/>
		</section>
	);
};

export default TeamMembersComponent;
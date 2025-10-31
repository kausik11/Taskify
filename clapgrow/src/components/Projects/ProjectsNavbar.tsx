import { useState } from "react";
import DisplayProjectsTabs from "@/components/Projects/ProjectsNavItems";
import DisplayProjectsDashboard from "./DisplayProjectsDashboard";
import ProjectSection from "./ProjectAllTask";
import AllProjDashboard from "./AllProjects/AllProjDashboard";
import AllProjectList from "./AllProjects/AllProjectList";
import ProjectMIS from "./ProjectMIS";
import ProjectFiles from "./ProjectFiles";
import ProjectNotes from "./ProjectNotes";

type propsType = {
  props?: number;
};
const ProjectsContainer: React.FC<propsType> = ({ props }) => {
	const [selectedTab, setSelectedTab] = useState("Dashboard");

	return (
		<div className="bg-[#FFFFFF] rounded-[10px] min-w-[1200px] md:min-w-full overflow-x-scroll h-[calc(100vh-50px)] pt-[16px] pb-[50px]">
			{props ? (
				<div className="flex flex-row text-nowrap items-center gap-x-4 px-[16px]">
					<DisplayProjectsTabs
						title="Dashboard"
						value="Dashboard"
						selectedTab={selectedTab}
						changeSelectedTab={setSelectedTab}
					/>

					<DisplayProjectsTabs
						title="All Projects"
						value="Allprojectlist"
						selectedTab={selectedTab}
						changeSelectedTab={setSelectedTab}
					/>
				</div>
			) : (
				<div className="flex flex-row text-nowrap items-center gap-x-4 px-[16px]">
					<DisplayProjectsTabs
						title="Dashboard"
						value="Dashboard"
						selectedTab={selectedTab}
						changeSelectedTab={setSelectedTab}
					/>

					<DisplayProjectsTabs
						title="All Tasks"
						value="All Tasks"
						selectedTab={selectedTab}
						changeSelectedTab={setSelectedTab}
					/>
					<DisplayProjectsTabs
						title="MIS Report"
						value="MIS Report"
						selectedTab={selectedTab}
						changeSelectedTab={setSelectedTab}
					/>
					<DisplayProjectsTabs
						title="All Files"
						value="All Files"
						selectedTab={selectedTab}
						changeSelectedTab={setSelectedTab}
					/>

					<DisplayProjectsTabs
						title="Notes"
						value="Notes"
						selectedTab={selectedTab}
						changeSelectedTab={setSelectedTab}
					/>
					<DisplayProjectsTabs
						title="Activity Stream"
						value="Activity Stream"
						selectedTab={selectedTab}
						changeSelectedTab={setSelectedTab}
					/>
				</div>
			)}
			<div
				className="flex flex-1 border-[1px] rounded-[2px] mt-[4px]"
				style={{
					borderColor: "#F0F1F2",
				}}
			/>
			{props ? (
				<div className="flex flex-row text-nowrap items-center gap-x-4 px-[16px]">
					<div className="w-full h-full mt-5">
						{selectedTab === "Dashboard" && <AllProjDashboard />}
						{selectedTab === "Allprojectlist" && <AllProjectList />}
					</div>
				</div>
			) : (
				<div className="flex flex-row text-nowrap items-center gap-x-4 px-[16px]">
					<div className="w-full h-full mt-5">
						{selectedTab === "Dashboard" && <DisplayProjectsDashboard />}
						{selectedTab === "All Tasks" && <ProjectSection />}
						{selectedTab === "MIS Report" && <ProjectMIS />}
						{selectedTab === "All Files" && <ProjectFiles />}
						{selectedTab === "Notes" && <ProjectNotes />}
						{selectedTab === "Activity Stream" && "Coming soon Activity Stream"}
					</div>
				</div>
			)}
		</div>
	);
};

export default ProjectsContainer;

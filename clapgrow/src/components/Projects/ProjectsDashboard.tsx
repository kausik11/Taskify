import { useState } from "react";
import ProjectsContainer from "./ProjectsNavbar";

const ProjectsDashboard = () => {
	let [btnclicked, setbtnclicked] = useState<number>(1);

	// ;

	return (
		<div>
			<ProjectsContainer props={btnclicked} />
		</div>
	);
};

export default ProjectsDashboard;

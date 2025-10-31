import React from "react";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";

const ProjectAddTaskSheet = () => {
	return (
		<Sheet>
			<SheetTrigger>
				<button className="bg-[#038EE2] py-[9.5px] px-4 rounded-[8px] hover:bg-[#0265a1] text-white text-[14px]">
          Add Task +
				</button>
			</SheetTrigger>
			<SheetContent className="w-[120vw] md:min-w-[55vw] px-[30px] pt-1"></SheetContent>
		</Sheet>
	);
};

export default ProjectAddTaskSheet;

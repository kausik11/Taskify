import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import ProjectAvatar from "./ProjectAvatar";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { getInitials } from "../common/CommonFunction";

{
	/* <Avatar className="h-[18px] w-[18px]">
<AvatarImage src={taskName.checker_image || ""} />
<AvatarFallback>
  {taskName.checker_full_name}
</AvatarFallback>
</Avatar> */
}

const ProjectChampionCard = () => {
	const text =
    "Description about the project will appear here...Description about the project will appear here....Description about the project will appear here... Description about the project will appear here...Description about the project will appear here....Description about the project will appear here...";

	return (
		<Card className="w-full bg-[#F1F5FA]">
			<CardHeader>
				<CardTitle className="text-[16px]">
          Designing Project Experience
				</CardTitle>
				<CardDescription className="text-sm whitespace-pre-line">
					{text}
				</CardDescription>
			</CardHeader>
			<CardFooter className="flex justify-start items-center gap-5 ">
				<div>
					<span className="text-[#5B5967] text-[12px] font-[400]">
            Project Champion
					</span>
					{/* <ProjectAvatar name = "Priya Jain" src="https://github.com/shadcn.png"/> */}
					<div className="flex gap-2 justify-start items-center">
						<Avatar className="h-[24px] w-[24px] border-[1px]">
							<AvatarImage src={"https://github.com/shadcn.png"} />
							{/* <AvatarFallback>
                      {getInitials("Priya", "Jain")}  
                    </AvatarFallback> */}
						</Avatar>
						<p className="text-[#2D2C37] font-[400] text-[12px]">
							{"Priya Jain"}
						</p>
					</div>
				</div>

				<div>
					<span className="text-[#5B5967] text-[12px]">Collaboraters</span>
					<div className=" flex -space-x-1">
						<Avatar className="h-[24px] w-[24px] border-[1px]">
							<AvatarImage src={"https://github.com/shadcn.png"} />
						</Avatar>

						<Avatar className="h-[24px] w-[24px] border-[1px]">
							<AvatarFallback>{getInitials("Priya", "Jain")}</AvatarFallback>
						</Avatar>

						<Avatar className="h-[24px] w-[24px] border-[1px]">
							<AvatarImage src={"https://github.com/shadcn.png"} />
						</Avatar>
					</div>
				</div>
			</CardFooter>
		</Card>
	);
};

export default ProjectChampionCard;

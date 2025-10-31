import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProjectAvtarProps {
  name?: string;
  src?: string;
  showName?: boolean;
  size?: "sm" | "md";
}
const ProjectAvatar = ({
	name,
	src,
	showName = true,
	size = "md",
}: ProjectAvtarProps) => {
	const initials = name
		?.split(" ")
		.map((word) => word[0])
		.join("")
		.toUpperCase();

	const avatarSize = size === "sm" ? "text-xs" : "text-sm";

	return (
		<div className="flex items-center gap-2">
			<Avatar className={`${avatarSize} rounded-full bg-black`}>
				<AvatarImage src={src} alt={name} />
				<AvatarFallback>{initials}</AvatarFallback>
			</Avatar>
			{showName && (
				<span className="text-sm font-medium text-muted-foreground">
					{name}
				</span>
			)}
		</div>
	);
};

export default ProjectAvatar;

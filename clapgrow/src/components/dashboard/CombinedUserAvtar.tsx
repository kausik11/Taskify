type Member = {
  id: number;
};
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

function getInitials(firstName = "", lastName = "") {
	return `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();
}

type CombinedUserAvtarProps = {
  imageData: Member[];
};

export default function CombinedUserAvtar({
	imageData,
}: CombinedUserAvtarProps) {
	const fallbackColors = [
		"bg-pink-200 text-[#5B5967]",
		"bg-yellow-200 text-[#5B5967]",
		"bg-green-200 text-[#5B5967]",
		"bg-blue-200 text-[#5B5967]",
		"bg-purple-200 text-[#5B5967]",
	];

	return (
		<div className="flex items-center gap-2">
			<div className="flex -space-x-2">
				{imageData.map((user: any, index: number) => (
					<Avatar
						key={index}
						className="w-8 h-8 border-2 border-white ring-1 ring-gray-100"
					>
						<AvatarImage src={user.user_image || ""} alt={user.full_name} />
						<AvatarFallback
							className={`text-[12px] font-medium uppercase ${
								fallbackColors[index % fallbackColors.length]
							}`}
						>
							{getInitials(user.first_name, user.last_name)}
						</AvatarFallback>
					</Avatar>
				))}
			</div>
			<p className="font-normal text-[12px] text-[#5B5967] ml-2">
				{imageData?.length} Member{imageData?.length > 1 ? "s" : ""}
			</p>
		</div>
	);
}

// export default function CombinedUserAvtar({ imageData }: CombinedUserAvtarProps) {

//   const members = [
//     {
//       id: 1,
//       image:
//         "https://plus.unsplash.com/premium_photo-1683121366070-5ceb7e007a97?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8dXNlcnxlbnwwfHwwfHx8MA%3D%3D",
//     },
//     {
//       id: 2,
//       image:
//         "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8dXNlcnxlbnwwfHwwfHx8MA%3D%3D",
//     },
//   ];
//   return (
//     <div className="flex items-center gap-2">
//       <div className="flex -space-x-2">
//         {members.map((member) => (
//           <div
//             key={member.id}
//             className="relative h-8 w-8 rounded-full border-2 border-white overflow-hidden"
//           >
//             <img
//               src={member.image || "/placeholder.svg"}
//               alt={`Member ${member.id}`}
//               className="h-full w-full object-cover"
//             />
//           </div>
//         ))}
//       </div>
//       <p className="font-[400] text-[12px] text-[#5B5967] mr-2">
//         {members.length} Members
//       </p>
//     </div>
//   );
// }

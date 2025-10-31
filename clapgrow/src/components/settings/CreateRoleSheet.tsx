import { Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import SheetWrapper from "../common/SheetWrapper";

interface RoleFormData {
  role: string;
  canAssignTasks: string;
}

const CreateRoleSheet = () => {
	const { register, handleSubmit } = useForm<RoleFormData>({
		defaultValues: {
			role: "Member",
			canAssignTasks: "None",
		},
	});

	const onSubmit = (data: RoleFormData) => {
		// ;
		// Handle form submission here
	};

	return (
		<SheetWrapper trigger="Add Role +" heading="Add Role">
			<div className="flex flex-col h-full">
				<form onSubmit={handleSubmit(onSubmit)} className="flex-1">
					<div className="relative">
						<div className="bg-[#F1F5FA] py-8 px-8 rounded-lg w-full mt-4 flex flex-col gap-y-3">
							<div className="flex flex-row items-center justify-between">
								<div className="w-full grid grid-cols-[1fr,2fr] items-center gap-x-5">
									<span className="text-[#5B5967] text-[14px] font-[600]">
                    Role
									</span>
									<input
										type="text"
										placeholder="Enter Role Name"
										className="w-[60%] p-1.5 rounded-[8px] bg-transparent outline-none"
										{...register("role")}
									/>
								</div>
							</div>
							<div className="flex flex-row items-center justify-between">
								<div className="w-full grid grid-cols-[1fr,2fr] items-center gap-x-5">
									<span className="text-[#5B5967] text-[14px] font-[600]">
                    Can Assign Tasks to
									</span>
									<select
										className="w-[80%] p-1.5 rounded-[8px] border-[1px] border-[#D0D3D9] outline-none"
										{...register("canAssignTasks")}
									>
										<option value="None">None</option>
										<option value="Team">Team</option>
										<option value="All">All</option>
									</select>
								</div>
							</div>
						</div>
						<button type="button" className="absolute -top-2 -right-2">
							<Trash2 className="border border-black p-1 w-8 rounded-full h-8" />
						</button>
					</div>
				</form>
			</div>
			<div className="absolute bottom-0 right-0 border-t border-[#bbbbbb] flex items-center justify-end gap-x-3 bg-white w-full px-[30px] py-[24px]">
				<button
					type="button"
					onClick={handleSubmit(onSubmit)}
					className="bg-[#038EE2] px-4 py-1.5 w-fit rounded-[8px] text-white font-[600] text-[14px]"
				>
          Save
				</button>
			</div>
		</SheetWrapper>
	);
};

export default CreateRoleSheet;

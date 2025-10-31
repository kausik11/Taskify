import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import CombinedDropDown from "../dashboard/CombinedDropDown";
import { Trash2 } from "lucide-react";

interface CheckerPageProps {
  checker: string | null;
  setChecker: (value: string | null) => void;
  editMode: boolean;
  setEditMode: (editMode: boolean) => void;
  taskName: {
    checker_full_name: string | null;
    checker_image: string | null;
  };
  taskupdate: {
    checker: string | null;
  };
  handleSelect: (field: string, value: string) => void;
}

const CheckerPage = ({
	checker,
	setChecker,
	editMode,
	setEditMode,
	taskName,
	taskupdate,
	handleSelect,
}: CheckerPageProps) => {
	return (
		<div className="checker-page">
			{/* AddChecker logic */}
			{checker ? (
				<div className="flex items-center justify-start bg-[#F1F5FA] rounded-[8px] px-[8px] py-[3px] relative">
					<p className="w-[160px] text-[14px] font-[600] text-[#5B5967]">
            Checker
					</p>
					<CombinedDropDown
						value={checker}
						handleSelect={(value) => setChecker(value)}
						placeholder="Add Member"
						DataType="isEmployeeData"
						className="border-none p-0 bg-transparent"
					/>
					<div
						className="border-[1px] border-[#5B5967] rounded-full p-1 absolute top-0 right-0"
						onClick={() => setChecker(null)} // Remove the checker
					>
						<Trash2 color="#5B5967" className="w-[10px] h-[10px]" />
					</div>
				</div>
			) : (
				<div
					className="bg-[#F1F5FA] text-[#0076BD] rounded-[8px] px-[8px] py-[8.5px] text-[14px] font-[600]"
					onClick={() => setChecker("John Doe")} // Replace with your actual method to add a checker
				>
          + Add Checker
				</div>
			)}

			{/* EditChecker logic */}
			<div
				className={`py-3 flex flex-col md:flex-row md:items-center max-md:gap-y-3 justify-between w-full space-x-4 ${
					editMode && "rounded-[8px] bg-[#F1F5FA]"
				}`}
			>
				<div className="flex space-x-4 justify-start w-full">
					<p className="w-[160px] text-[14px] text-[#5B5967]">Checker</p>
					<div className="flex items-center space-x-1">
						{editMode ? (
							<CombinedDropDown
								disabled={true}
								DataType="isEmployeeData"
								value={taskupdate.checker ?? ""}
								handleSelect={(value: string) => handleSelect("checker", value)}
								placeholder="Add Member"
								className="w-full border-none text-[14px] bg-transparent text-[#0076BD] p-0 font-[400]"
							/>
						) : (
							taskName.checker_full_name && (
								<div className="rounded-full bg-[#FEDBDB] text-[#A16565] w-[18px] h-[18px] font-[400] text-[10px] flex items-center justify-center">
									<Avatar className="h-[18px] w-[18px]">
										<AvatarImage src={taskName.checker_image || ""} />
										<AvatarFallback>
											{taskName.checker_full_name}
										</AvatarFallback>
									</Avatar>
								</div>
							)
						)}
						{!editMode && (
							<p className="text-[14px]">
								{taskName.checker_full_name ? (
									`Assigned to ${taskName.checker_full_name}`
								) : (
									<p className="font-[400] text-[14px]">No checker assigned</p>
								)}
							</p>
						)}
					</div>
				</div>
				<div>
					<button
						onClick={() => setEditMode(!editMode)}
						className="text-[#0076BD] text-[14px] font-[600] cursor-pointer"
					>
						{editMode ? "Save" : "Edit"}
					</button>
				</div>
			</div>
		</div>
	);
};

export default CheckerPage;

import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@radix-ui/react-popover";
import listIcon from "@/assets/icons/list-view-icon.svg";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { ProjectsAccordion } from "./ProjectsAccordion";
import CommonHeader from "../common/CommonHeader";
import { CirclePlus } from "lucide-react";
import AllSectionTable from "./AllSectionTable";
import { useForm } from "react-hook-form";
import FormDropdown from "../common/FormDropdown";
import timeIcon from "@/assets/icons/timeIcon.svg";
import {
	Select,
	SelectContent,
	SelectTrigger,
	SelectValue,
} from "../ui/select";

type FormData = {
  sectionName: string;
  successCriteria: string;
  startDate: string | null;
  endDate: string | null;
};

const ProjectAllTask = () => {
	const [selectedTask, setSelectedTask] = useState("Active");
	const [isTableOpen, setTableOpen] = useState(false);
	const [viewType, setViewType] = useState<string>("Group By Sections");
	const [modalOpen, setModalOpen] = useState<boolean>(false);
	const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);

	const {
		register,
		handleSubmit,
		control,
		setValue,
		watch,
		formState: { errors },
	} = useForm<FormData>();

	return (
		<section className="w-full h-[75vh]">
			<CommonHeader
				TableName="All Projects"
				setTableOpen={setTableOpen}
				isTableOpen={isTableOpen}
				setSelectedTask={setSelectedTask}
				selectedTask={selectedTask}
				setViewType={setViewType}
				viewType={viewType}
				handleExport={() => {}}
				modalOpen={modalOpen}
				setModalOpen={setModalOpen}
				onBranchAdded={() => {}}
				selectedBranch={null}
				isSheetOpen={false}
				setIsSheetOpen={() => {}}
				selected={[]}
				setSelected={() => {}}
			/>
			<div className="mt-4 min-w-full md:min-w-[768px] bg-[#F1F5FA] p-3 flex gap-2 justify-start items-center border-[#E6EBF7] text-[14px] font-[600] text-[#0076BD]">
				<CirclePlus className="h-[16px] w-[16px]" />
				<Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
					<SheetTrigger asChild>
						<button onClick={() => setIsSheetOpen(true)} className="">
              Add New Section
						</button>
					</SheetTrigger>
					<SheetContent className="md:min-w-[51vw] px-[30px] pt-1">
						<div className="flex items-center justify-between pr-[20px]">
							<div className="flex-1">
								<input
									type="text"
									className="task-input text-[22px] w-full"
									id="taskInput"
									{...register("sectionName", {
										required: "Section name is required",
									})}
									placeholder={"Write Section Name Here"}
								/>
								{errors.sectionName && (
									<p className="text-red-500 text-xs ">
										{errors.sectionName.message}
									</p>
								)}
							</div>
						</div>

						<div className="w-full h-full mt-2">
							<div className="pt-2 space-y-3 max-h-[75vh] overflow-y-scroll">
								<div className="grid divide-y-2 divide-[#F0F1F2] pb-[40px]">
									<form className="grid divide-y-2 divide-[#F0F1F2] pb-[40px]">
										<FormDropdown
											key={1}
											label="Success Criteria"
											required={false}
											editMode={() => {}}
											setEditMode={() => {}}
										>
											<div className="flex-1">
												<textarea
													className={`border-[1px] w-full border-[#D0D3D9] rounded-[8px] placeholder:text-[14px] p-3 focus:outline-0 resize-none`}
													rows={4}
													cols={40}
													placeholder="write here..."
												/>
												{errors.successCriteria && (
													<p className="text-red-500 text-xs">
														{errors.successCriteria.message}
													</p>
												)}
											</div>
										</FormDropdown>

										<FormDropdown
											key={1}
											label="Start and Due Date"
											required={false}
											editMode={() => {}}
											setEditMode={() => {}}
										>
											<div className="flex justify-start items-center gap-2 ml-[-8px]">
												<Select value={""}>
													<SheetTrigger className="w-[120px] border-none font-[400] shadow-none focus:outline-none focus:ring-0 text-[#0076BD]">
														<div className="flex items-center gap-2">
															<img src={timeIcon} alt="Time" />
															<SelectValue placeholder="Start Date" />
														</div>
													</SheetTrigger>
												</Select>
												<span>-</span>
												<Select onValueChange={() => {}} value={""}>
													<SheetTrigger className="w-[120px] border-none font-[400] shadow-none focus:outline-none focus:ring-0 text-[#0076BD]">
														<div className="flex justify-start gap-x-2">
															<img src={timeIcon} alt="Time" />
															<SelectValue placeholder="End Date" />
														</div>
													</SheetTrigger>
												</Select>
											</div>
										</FormDropdown>

										<SheetFooter>
											<SheetClose asChild>
												<div className="border-t-[2px] h-[50px] bg-white border-[#F0F1F2] flex justify-end items-center absolute left-0 right-0 bottom-0 w-full px-[30px]">
													<Button
														className="bg-[#038EE2] px-4 py-2 w-fit rounded-[8px] text-white font-[600] text-[14px]"
														type="submit"
													>
                            Create Section
													</Button>
												</div>
											</SheetClose>
										</SheetFooter>
									</form>
								</div>
							</div>
						</div>
					</SheetContent>
				</Sheet>
			</div>
			<div className="mt-4">
				<AllSectionTable
					setSelectedTask={setSelectedTask}
					selectedTask={selectedTask}
				/>
				<AllSectionTable
					setSelectedTask={setSelectedTask}
					selectedTask={selectedTask}
				/>
			</div>
		</section>
	);
};

export default ProjectAllTask;

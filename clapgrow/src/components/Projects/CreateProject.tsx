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
import { useState } from "react";
// import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
// import { ChevronDown, Trash2 } from "lucide-react";
// import { SetStateAction, useContext, useEffect, useState } from "react";
// import CombinedDropDown from "../dashboard/CombinedDropDown";
// import { Loader } from "../layout/AlertBanner/CommonDesign";
// import { Checkbox } from "../ui/checkbox";
// import { TaskFields } from "./commonColumns";
// import { EditModeOfTask, TaskFormData } from "./CommonTypes";
// import CustomCalender from "./CustomCalender";
import FormDropdown from "../common/FormDropdown";
// import MultiFileUpload from "./MultiFileUpload";
// import { PRIORITY_DATA } from "@/data/common";
// import { DateFormat } from "./CommonFunction";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import CombinedDropDown from "../dashboard/CombinedDropDown";
import { Divider } from "../layout/AlertBanner/CommonDesign";
import { useFrappeFileUpload } from "frappe-react-sdk";
import {
	Select,
	SelectContent,
	SelectTrigger,
	SelectValue,
} from "../ui/select";
import timeIcon from "@/assets/icons/timeIcon.svg";
import MultiFileUpload from "../common/MultiFileUpload";
// import { SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

type FormData = {
  projectName: string;
  projectChampion: string[]; // could be IDs or names
  collaborators: string[];
  startDate: string | null;
  endDate: string | null;
  bufferTime: number;
  estimatedCost: number;
  description: string;
  attachment: FileList;
};

const CreateProject = () => {
	const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);
	const [fileData, setFileData] = useState({ name: "", task_id: "" });
	const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

	const { upload } = useFrappeFileUpload();
	const {
		register,
		handleSubmit,
		control,
		setValue,
		watch,
		formState: { errors },
	} = useForm<FormData>();

	const onSubmit = (data: FormData) => {
		// ;
	};

	const handleFilesSelected = async (files: File[]) => {
		setSelectedFiles(files);
		const uploadPromises = files.map(async (file) => {
			const response = await upload(file, {
				isPrivate: false,
			});
			return { file_url: response.file_url, name: response.name };
		});

		const uploadedFiles = await Promise.all(uploadPromises);
		const FilesData = uploadedFiles.map((file) => ({
			name: file.name,
		}))[0] || { name: "" }; // Take the first file's name or set an empty default

		setFileData((prev) => ({
			...prev,
			...FilesData, // Merge the name data
		}));
		setValue("attachment", uploadedFiles as any);
	};

	const members = ["Alice", "Bob", "Charlie", "Sophie"];

	return (
		<Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
			<SheetTrigger asChild>
				<button
					onClick={() => setIsSheetOpen(true)}
					className="bg-[#038EE2] py-2 px-4 hover:bg-[#0265a1] rounded-[8px] text-white text-[14px] font-[600]"
				>
          Add Project +
				</button>
			</SheetTrigger>
			<SheetContent className=" md:min-w-[51vw] px-[30px] pt-1">
				<div className="flex items-center justify-between pr-[20px]">
					<div className="flex-1">
						<input
							type="text"
							className="task-input text-[22px] w-full"
							id="taskInput"
							{...register("projectName", {
								required: "Project name is required",
							})}
							placeholder={"Write Project Name Here"}
						/>
						{errors.projectName && (
							<p className="text-red-500 text-xs ">
								{errors.projectName.message}
							</p>
						)}
					</div>
				</div>

				<div className="w-full h-full mt-2">
					<div className="pt-2 space-y-3 max-h-[75vh] overflow-y-scroll">
						<div className="grid divide-y-2 divide-[#F0F1F2] pb-[40px]">
							<form className="grid divide-y-2 divide-[#F0F1F2] pb-[40px]">
								{/* <FormDropdown
                  label="Name"
                  editMode={() => { }}
                  setEditMode={() => { }}
                >
                  <div className="w-[500px] flex flex-col gap-2">
                    <div className="flex items-center gap-4">
                      <div className="w-1/2">
                        <div className="flex flex-col gap-1 h-[50px]">
                          <Input
                            id="first_name"

                            placeholder="First name"
                            className={`w-full border ${errors
                              ? "border-red-500"
                              : "border-[#D0D3D9]"
                              } rounded-[8px] px-3 py-2 focus:outline-none placeholder:text-[#ACABB2] transition-all duration-200 ease-in-out`}
                          />
                          <p className="text-red-500 text-sm ml-1">
                            {}
                          </p>
                        </div>
                      </div>

                      <div className="w-1/2">
                        <div className="flex flex-col gap-1 h-[50px]">
                          <Input
                            id="last_name"
                            placeholder="Last name"
                            className={`w-full border ${errors
                              ? "border-red-500"
                              : "border-[#D0D3D9]"
                              } rounded-[8px] px-3 py-2 focus:outline-none placeholder:text-[#ACABB2] transition-all duration-200 ease-in-out`}
                          />
                          <p className="text-red-500 text-sm ml-1">
                            {}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </FormDropdown> */}
								<FormDropdown
									key={1}
									label="Project Champion"
									required={true}
									editMode={() => {}}
									setEditMode={() => {}}
								>
									<div className="flex flex-col gap-1">
										<CombinedDropDown
											value={""}
											handleSelect={() => {}}
											placeholder="Add Member"
											DataType="isEmployeeData"
											className="border-none p-0 w-[300px]"
											getKey={(item) => item.name}
											renderItem={(item) => item?.name}
										/>
									</div>
								</FormDropdown>

								<FormDropdown
									key={1}
									label="Collaboraters"
									required={false}
									editMode={() => {}}
									setEditMode={() => {}}
								>
									<div className="flex flex-col gap-1">
										<CombinedDropDown
											value={""}
											handleSelect={() => {}}
											placeholder="Add Member"
											DataType="isEmployeeData"
											className="border-none p-0 w-[300px]"
											getKey={(item) => item.name}
											renderItem={(item) => item?.name}
										/>
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
											<SelectTrigger className="w-[120px] border-none font-[400] shadow-none focus:outline-none focus:ring-0 text-[#0076BD]">
												<div className="flex items-center gap-2">
													<img src={timeIcon} alt="Time" />
													<SelectValue placeholder="Start Date" />
												</div>
											</SelectTrigger>
										</Select>
										<span>-</span>
										<Select onValueChange={() => {}} value={""}>
											<SelectTrigger className="w-[120px] border-none font-[400] shadow-none focus:outline-none focus:ring-0 text-[#0076BD]">
												<div className="flex justify-start gap-x-2">
													<img src={timeIcon} alt="Time" />
													<SelectValue placeholder="End Date" />
												</div>
											</SelectTrigger>
										</Select>
									</div>
								</FormDropdown>

								<FormDropdown
									key={1}
									label="Buffer Time"
									required={false}
									editMode={() => {}}
									setEditMode={() => {}}
								>
									<div className="relative w-[100px]">
										<Input
											type="number"
											className={`w-[95px] rounded-[8px] border-[1px] w-full border-[#D0D3D9] rounded-[8px] resize-none`}
										/>
										<span className="absolute right-5 top-3 -translate-y-2 w-[12px] h-[17px] font-[600] font-[14px] color-[#5B5967]">
                      %
										</span>
										<p className="w-[120px] h-[17px] color-[#2D2C37] font-[400] font-[14px] absolute top-1 left-40">
                      22 March 2025
										</p>
									</div>
								</FormDropdown>

								<FormDropdown
									key={1}
									label="Estimated Cost"
									required={false}
									editMode={() => {}}
									setEditMode={() => {}}
								>
									<div>
										<Input
											className={`w-full border rounded-md px-3 py-2 focus:outline-none`}
										/>
									</div>
								</FormDropdown>

								{/* <div className="flex justify-center gap-2 ml-3">
                  <p className="text-sm font-[700] text-[#5B5967]">
                    Estimated Cost <span className="text-[#D72727]">*</span>
                  </p>
                  </div> */}
								{/* <div>
                    <Input
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none ml-10`}
                    />
                  </div> */}
								<FormDropdown
									key={1}
									label="Description"
									sublabel="(Add additional details about Money, Raw Material, Labour, Information)"
									required={false}
									editMode={() => {}}
									setEditMode={() => {}}
								>
									<div className="flex-1">
										<textarea
											className={`border-[1px] w-full border-[#D0D3D9] rounded-[8px] placeholder:text-[14px] p-3 focus:outline-0 resize-none`}
											rows={4}
											cols={40}
											placeholder="write description"
										/>
										{errors.description && (
											<p className="text-red-500 text-xs">
												{errors.description.message}
											</p>
										)}
									</div>
									<MultiFileUpload
										onFilesSelected={handleFilesSelected}
										selectedFiles={selectedFiles}
									/>
								</FormDropdown>

								<SheetFooter>
									<SheetClose asChild>
										<div className="border-t-[2px] h-[50px] bg-white border-[#F0F1F2] flex justify-end items-center absolute left-0 right-0 bottom-0 w-full px-[30px]">
											<Button
												className="bg-[#038EE2] px-4 py-2 w-fit rounded-[8px] text-white font-[600] text-[14px]"
												type="submit"
											>
                        Add
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
	);
};
export default CreateProject;

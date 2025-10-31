import React, { useState } from "react";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetFooter,
	SheetTrigger,
} from "../ui/sheet";
import { Input } from "../ui/input";
import { useForm } from "react-hook-form";
import FormDropdown from "../common/FormDropdown";
import MultiFileUpload from "../common/MultiFileUpload";
import { useFrappeFileUpload } from "frappe-react-sdk";
import { Button } from "../ui/button";

type FormData = {
  notesName: string;
  description: string;
  attachment: FileList;
};

const AddNotesSheet = () => {
	const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);
	const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
	const [fileData, setFileData] = useState({ name: "", note_id: "" });
	const { upload } = useFrappeFileUpload();
	const {
		register,
		handleSubmit,
		control,
		setValue,
		watch,
		formState: { errors },
	} = useForm<FormData>();

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

	return (
		<Sheet>
			<SheetTrigger>
				<button
					onClick={() => setIsSheetOpen(true)}
					className="bg-[#038EE2] py-2 px-4 hover:bg-[#0265a1] rounded-[8px] text-white text-[14px] font-[600]"
				>
          Add Note +
				</button>
			</SheetTrigger>
			<SheetContent className=" md:min-w-[51vw] px-[30px] pt-1">
				<div>
					<div className="flex-1">
						<input
							type="text"
							className="task-input text-[22px] w-full"
							id="notesInput"
							{...register("notesName", {
								required: "Notes name is required",
							})}
							placeholder={"Write Note Heading Here"}
						/>
						{errors.notesName && (
							<p className="text-red-500 text-xs ">
								{errors?.notesName.message}
							</p>
						)}
					</div>
					<div>
						<form className="flex-row  pb-[40px]">
							<div>
								<textarea
									rows={10}
									className="w-full border border-gray-300 rounded-lg p-4 resize-none focus:outline-none placeholder:text-gray-400"
									placeholder="Write your note here..."
									{...register("description", {
										required: "Description is required",
									})}
								/>
								{errors.description && (
									<p className="text-red-500 text-xs">
										{errors.description.message}
									</p>
								)}
								<MultiFileUpload
									onFilesSelected={handleFilesSelected}
									selectedFiles={selectedFiles}
								/>
							</div>

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
			</SheetContent>
		</Sheet>
	);
};

export default AddNotesSheet;

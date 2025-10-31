import {
	Sheet,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { CGBranch } from "@/types/ClapgrowApp/CGBranch";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFrappeCreateDoc, useFrappeUpdateDoc } from "frappe-react-sdk";
import { useContext, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import timeIcon from "@/assets/icons/timeIcon.svg";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { timeOptions } from "@/data/common";
import { UserContext } from "@/utils/auth/UserProvider";
import {
	convertTo12HourFormat,
	showErrorToast,
} from "../common/CommonFunction";
import { Divider } from "../layout/AlertBanner/CommonDesign";
import { Input } from "../ui/input";
// const branchSchema = z.object({
//   branchName: z.string().min(1, "Branch Name is required"),
//   startTime: z.string().min(1, "Start Time is required"),
//   endTime: z.string().min(1, "End Time is required"),
// });

const branchSchema = z
	.object({
		branchName: z
			.string()
			.min(1, "Branch Name is required")
			.refine((val) => val.trim() !== "", {
				message: "Branch Name is required",
			}),
		startTime: z.string().min(1, "Start Time is required"),
		endTime: z.string().min(1, "End Time is required"),
	})
	.refine((data) => data.startTime !== data.endTime, {
		message: "Start and End Time cannot be the same",
		path: ["endTime"],
	});

type FormData = {
  startTime: string;
  endTime: string;
  branchName: string;
};

interface AddBranchSheet {
  onBranchAdded: React.Dispatch<React.SetStateAction<boolean>>;
  isSheetOpen: boolean;
  setIsSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  branchData?: CGBranch; // Change from CGBranch[] to CGBranch
}
const AddBranchSheet: React.FC<AddBranchSheet> = ({
	onBranchAdded,
	isSheetOpen,
	setIsSheetOpen,
	branchData,
}) => {
	const { userDetails } = useContext(UserContext);
	const { createDoc } = useFrappeCreateDoc<CGBranch>();
	const { updateDoc } = useFrappeUpdateDoc<CGBranch>();

	const {
		register,
		handleSubmit,
		setValue,
		control,
		watch,
		reset,
		formState: { errors },
	} = useForm<FormData>({
		resolver: zodResolver(branchSchema),
		defaultValues: {
			branchName: "",
			startTime: "", // Or set to a default time, e.g., "09:00 AM"
			endTime: "", // Or set to a default time, e.g., "05:00 PM"
		},
		mode: "onChange",
	});

	useEffect(() => {
		if (branchData) {
			setValue("branchName", branchData.branch_name || "");
			setValue("startTime", convertTo12HourFormat(branchData.start_time) || "");
			setValue("endTime", convertTo12HourFormat(branchData.end_time) || "");
		}
	}, [branchData, setValue]);

	const onSubmit = (data: FormData) => {
		if (branchData) {
			updateDoc("CG Branch", branchData.name, {
				start_time: data.startTime,
				end_time: data.endTime,
				branch_name: data.branchName,
				company_id: userDetails?.[0]?.company_id || "",
			})
				.then(() => {
					onBranchAdded(true);
					toast.success("Branch updated successfully");
					reset();
					setIsSheetOpen(false);
				})
				.catch((err: any) => {
					showErrorToast(err._server_messages);
				});
		} else {
			// Create a new branch
			createDoc("CG Branch", {
				start_time: data.startTime,
				end_time: data.endTime,
				branch_name: data.branchName,
				company_id: userDetails?.[0]?.company_id || "",
				name: "",
				creation: "",
				modified: "",
				owner: "",
				modified_by: "",
				docstatus: 0,
			})
				.then(() => {
					onBranchAdded(true);
					toast.success("Branch added successfully");
					reset();
					setIsSheetOpen(false);
				})
				.catch((err) => {
					showErrorToast(err._server_messages);
				});
		}
	};

	return (
		<Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
			{!branchData && (
				<SheetTrigger asChild>
					<button
						className="bg-[#038EE2] py-2 px-4 rounded-[8px] hover:bg-[#0265a1] font-[600] text-white text-[14px] w-fit"
						onClick={() => setIsSheetOpen(true)}
					>
            Add Branch +
					</button>
				</SheetTrigger>
			)}
			<SheetContent className="w-[95vw] md:min-w-[700px]">
				<SheetHeader>
					<SheetTitle>{branchData ? "Edit Branch" : "Add Branch"}</SheetTitle>
				</SheetHeader>
				<form
					onSubmit={handleSubmit(onSubmit)}
					className="pt-2 space-y-3 max-h-[85vh] overflow-y-scroll mt-4"
				>
					{}
					<div className="space-y-2 pb-60">
						<div className="grid grid-cols-5 items-center">
							<p className="text-sm font-[500]">
                Branch <span className="text-[#D72727]">*</span>
							</p>

							<div className="col-span-2">
								<Input
									{...register("branchName")}
									className={`w-full border ${
										errors.branchName ? "border-red-500" : "border-gray-300"
									} rounded-md px-3 py-2 focus:outline-none`}
								/>
								{errors.branchName && (
									<p className="text-red-500 text-sm">
										{errors.branchName.message}
									</p>
								)}
							</div>
						</div>
						<Divider />

						<div className="grid grid-cols-5 items-center">
							<p className="text-sm font-[500]">
                Working Hours <span className="text-[#D72727]">*</span>
							</p>
							<div className="col-span-2 flex flex-col gap-1">
								<div className="flex items-center gap-2 text-[12px] font-[600]">
									<Select
										onValueChange={(value) => setValue("startTime", value)}
										value={watch("startTime")}
									>
										<SelectTrigger
											className={`w-[120px] border-none shadow-none font-[400] focus:outline-none focus:ring-0 text-[#0076BD] ${
												errors.startTime ? "border border-red-500" : ""
											}`}
										>
											<div className="flex justify-start gap-x-2">
												<img src={timeIcon} alt="Time" />
												<SelectValue placeholder="Start Time" />
											</div>
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												{timeOptions.map((time) => (
													<SelectItem key={time} value={time}>
														{time}
													</SelectItem>
												))}
											</SelectGroup>
										</SelectContent>
									</Select>

									<span>-</span>

									<Select
										onValueChange={(value) => setValue("endTime", value)}
										value={watch("endTime")}
									>
										<SelectTrigger
											className={`w-[120px] border-none shadow-none font-[400] focus:outline-none focus:ring-0 text-[#0076BD] ${
												errors.endTime ? "border border-red-500" : ""
											}`}
										>
											<div className="flex justify-start gap-x-2">
												<img src={timeIcon} alt="Time" />
												<SelectValue placeholder="End Time" />
											</div>
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												{timeOptions.map((time) => (
													<SelectItem key={time} value={time}>
														{time}
													</SelectItem>
												))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</div>

								{/* Show validation messages under each time select */}
								<div className="flex gap-4 justify-center w-full text-center text-lg ml-2">
									<div className="w-[150px]">
										{errors.startTime && (
											<p className="text-red-500 text-xs">
												{errors.startTime.message}
											</p>
										)}
									</div>
									<div className="w-[150px]">
										{errors.endTime && (
											<p className="text-red-500 text-xs">
												{errors.endTime.message}
											</p>
										)}
									</div>
								</div>
							</div>
						</div>

						<Divider />
					</div>
					<SheetFooter>
						<div className="border-t-[2px] h-[50px] border-[#F0F1F2] flex items-center absolute left-0 right-0 bottom-0 w-full px-[30px] ">
							<button
								className="bg-[#038EE2] px-6 py-1.5 w-fit rounded-[8px] text-white font-[600] text-[14px] ml-auto"
								type="submit"
							>
								{branchData ? "Update" : "Save"}
							</button>
						</div>
					</SheetFooter>
				</form>
			</SheetContent>
		</Sheet>
	);
};

export default AddBranchSheet;

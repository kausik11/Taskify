import { CGDepartment } from "@/types/ClapgrowApp/CGDepartment";
import { UserContext } from "@/utils/auth/UserProvider";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFrappeCreateDoc, useFrappeUpdateDoc } from "frappe-react-sdk";
import { useContext, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { showErrorToast } from "../common/CommonFunction";
import {
	Sheet,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "../ui/input";

// Zod schema definition
const departmentSchema = z.object({
	department_name: z.string().min(1, "Department Name is required"), // Ensures the field is not empty
});

type AddDepartmentFormValues = {
  department_name: string;
};

type AddDepartmentSheetProps = {
  onDepartmentAdded: React.Dispatch<React.SetStateAction<boolean>>;
  isSheetOpen: boolean;
  setIsSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  deptData?: CGDepartment; // Change from CGBranch[] to CGBranch
};

const AddDepartmentSheet: React.FC<AddDepartmentSheetProps> = ({
	onDepartmentAdded,
	isSheetOpen,
	setIsSheetOpen,
	deptData,
}) => {
	const { userDetails } = useContext(UserContext);
	const { createDoc } = useFrappeCreateDoc<CGDepartment>();
	const { updateDoc } = useFrappeUpdateDoc<CGDepartment>();
	const {
		register,
		handleSubmit,
		formState: { errors },
		setValue,
		reset,
	} = useForm<AddDepartmentFormValues>({
		resolver: zodResolver(departmentSchema), // Ensure zodResolver works with schema
	});

	useEffect(() => {
		if (deptData) {
			setValue("department_name", deptData.department_name || "");
		}
	}, [deptData, setValue]);

	const onSubmit = (data: AddDepartmentFormValues) => {
		if (deptData?.name) {
			// Update existing department
			updateDoc("CG Department", deptData.name, {
				department_name: data.department_name,
				company_id: userDetails?.[0]?.company_id || "",
			})
				.then(() => {
					toast.success("Department updated successfully");
					onDepartmentAdded(true);
					reset();
					setIsSheetOpen(false);
				})
				.catch((err: any) => {
					showErrorToast(err._server_messages);
				});
		} else {
			// Create new department
			createDoc("CG Department", {
				department_name: data.department_name,
				company_id: userDetails?.[0]?.company_id || "",
				name: "",
				creation: "",
				modified: "",
				owner: "",
				modified_by: "",
				docstatus: 0,
			})
				.then(() => {
					toast.success("New Department Created Successfully!");
					onDepartmentAdded(true);
					reset();
				})
				.catch((error) => {
					showErrorToast(error._server_messages);
				});
		}
	};

	return (
		<Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
			{!deptData && (
				<SheetTrigger asChild>
					<button
						className="bg-[#038EE2] py-2 px-4 rounded-[8px] hover:bg-[#0265a1] font-[600] text-white text-[14px] w-fit"
						onClick={() => setIsSheetOpen(true)}
					>
            Add Department +
					</button>
				</SheetTrigger>
			)}
			<SheetContent className="w-[95vw] md:min-w-[700px]">
				<SheetHeader>
					<SheetTitle>
						{deptData ? "Edit Department" : "Add Department"}
					</SheetTitle>
				</SheetHeader>
				<div className="space-y-2 py-8">
					<div className="space-y-2">
						<form
							className="grid grid-cols-5 items-center"
							onSubmit={handleSubmit(onSubmit)}
						>
							<p className="text-[14px] font-[500]">
                Department<span className="text-[#D72727]">*</span>
							</p>
							<div className="relative col-span-3">
								<Input
									id="department_name"
									{...register("department_name")}
									aria-label="Department Name"
									className={`pr-8 w-full border ${
										errors.department_name
											? "border-red-500"
											: "border-gray-300"
									} rounded-md px-3 py-2 focus:outline-none`}
								/>
								{errors.department_name && (
									<p className="text-red-500 text-sm mt-1">
										{errors.department_name.message}
									</p>
								)}
							</div>
							<div className="border-t-[2px] h-[50px] border-[#F0F1F2] flex items-center absolute left-0 right-0 bottom-0 w-full px-[30px] ">
								<button
									className="bg-[#038EE2] px-6 py-1.5 w-fit rounded-[8px] text-white font-[600] text-[14px] ml-auto"
									type="submit"
								>
									{deptData ? "Update" : "Save"}
								</button>
							</div>
						</form>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
};

export default AddDepartmentSheet;

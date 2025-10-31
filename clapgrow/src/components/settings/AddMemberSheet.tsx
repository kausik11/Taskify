import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { CGUser } from "@/types/ClapgrowApp/CGUser";
import { UserContext } from "@/utils/auth/UserProvider";
import { zodResolver } from "@hookform/resolvers/zod";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useFrappeCreateDoc, useFrappeGetDocList } from "frappe-react-sdk";
import { useContext, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import "react-phone-input-2/lib/style.css";
import { toast } from "sonner";
import { z } from "zod";
import { TeamMemberFields } from "../common/commonColumns";
import { FormData } from "../common/CommonTypes";
import FormDropdown from "../common/FormDropdown";
import CombinedDropDown from "../dashboard/CombinedDropDown";
import { Input } from "../ui/input";
import PhoneInput from "./PhoneNoIdInput";

interface AddMemberSheet {
  onTeamMemberAdded: () => void;
}

export default function AddMemberSheet({ onTeamMemberAdded }: AddMemberSheet) {
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);
	const { userDetails } = useContext(UserContext);
	const [reportTo, setReportTo] = useState<{ superior: string } | null>(null);

	// Fetch branch data using useFrappeGetDocList
	const {
		data: branchData,
		error: branchError,
		isLoading: isBranchLoading,
	} = useFrappeGetDocList("CG Branch", {
		fields: ["branch_name", "company_id", "start_time", "end_time"],
	});

	if (branchError) {
		console.error("Error fetching branches:", branchError);
		toast.error("Failed to fetch branches. Please try again.");
	}

	const formDataSchema = z
		.object({
			first_name: z
				.string()
				.min(1, "First name is required")
				.regex(/^[a-zA-Z\s]+$/, "Invalid First Name"),
			last_name: z
				.string()
				.min(1, "Last name is required")
				.regex(/^[a-zA-Z\s]+$/, "Invalid Last Name"),
			email: z
				.string()
				.email("Email is required")
				.regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid Email Format"),
			phone: z
				.string()
				.min(10, "Phone number must be at least 10 digits")
				.max(10, "Phone number must be at most 10 digits")
				.regex(/^\+?[1-9]\d{9,14}$/, "Phone number must be numeric"),
			designation: z.string().optional(),
			branch_id: z
				.object({
					name: z.string().min(1, "Branch is required"),
				})
				.nullable()
				.refine((value) => value !== null, {
					message: "Branch is required",
				}),
			department_id: z
				.object({
					name: z.string().min(1, "Department is required"),
				})
				.nullable()
				.refine((value) => value !== null, {
					message: "Department is required",
				}),
			role: z
				.object({
					role_name: z.string().min(1, "Role is required"),
				})
				.nullable()
				.refine((value) => value !== null, {
					message: "Role is required",
				}),
			ctc: z.coerce
				.number()
				.min(0, "CTC must be a positive number")
				.max(100000000, "CTC cannot exceed 100,000,000"),
			cost_per_hour: z.coerce
				.number()
				.min(0, "Cost per hour must be a positive number")
				.max(10000, "Cost per hour cannot exceed 10,000"),
			report_to: z
				.object({
					email: z.string().email("Report To is required"),
				})
				.nullable()
				.refine((value) => value !== null, {
					message: "Report To is required",
				}),
		})
		.refine((data) => data.ctc >= data.cost_per_hour, {
			message: "CTC must be greater than or equal to the cost per hour",
			path: ["cost_per_hour"],
		});

	const {
		register,
		control,
		handleSubmit,
		formState: { errors },
		setValue,
		reset,
	} = useForm<FormData>({
		resolver: zodResolver(formDataSchema),
		defaultValues: {
			first_name: "",
			last_name: "",
			email: "",
			phone: "",
			designation: "",
			branch_id: null,
			department_id: null,
			role: null,
			ctc: 0,
			cost_per_hour: 0,
			report_to: null,
			password: "",
			confirmPassword: "",
			accessList: [] as string[],
		},
	});

	const handleDropdownChange = (nameField: keyof FormData, nameValue: any) => {
		setValue(nameField, nameValue, { shouldValidate: true });
		if (nameField === "report_to") {
			const formatted = nameValue ? { superior: nameValue.email } : null;
			setReportTo(formatted);
		}
	};

	const { createDoc } = useFrappeCreateDoc<CGUser>();
	const onSubmit = async (data: FormData) => {
		setIsLoading(true);
		try {
			const payload = {
				...data,
				phone: `+91-${data.phone}`,
				role: `ROLE-${data?.role?.role_name}`,
				branch_id: data.branch_id?.name || "",
				department_id: data.department_id?.name || "",
				reporter: "",
				company_id: userDetails?.[0]?.company_id || "",
				name: "",
				creation: "",
				modified: "",
				owner: "",
				modified_by: "",
				docstatus: 0 as 0 | 1 | 2,
				report_to: reportTo ? [{ superior: reportTo.superior }] : [],
			};

			const newUser = await createDoc("CG User", payload);

			if (newUser) {
				toast.success("New User Created Successfully!");
				onTeamMemberAdded();
				setIsSheetOpen(false);
				reset();
				setReportTo(null);
			}
		} catch (error: any) {
			const serverMessages = error._server_messages
				? JSON.parse(error._server_messages)
				: null;
			const msgObj = serverMessages ? JSON.parse(serverMessages[0]) : null;
			const errorMessage = msgObj?.message
				? msgObj.message.replace(/<[^>]*>/g, "")
				: "An error occurred while creating the user";
			toast.error(errorMessage);
			console.error("Error occurred while creating the user:", error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
			<SheetTrigger asChild>
				<button
					onClick={() => setIsSheetOpen(true)}
					className="bg-[#038EE2] py-2 px-4 hover:bg-[#0265a1] rounded-[8px] text-white text-[14px] font-[600]"
				>
          Add Member +
				</button>
			</SheetTrigger>
			<SheetContent className="md:min-w-[51vw] px-[30px] pt-1">
				<SheetTitle>
					<p className="text-xl text-[#304156] font-[600] mt-4 mb-6">
            Add Member
					</p>
				</SheetTitle>
				<VisuallyHidden>
					<SheetDescription>Add a New Team Member</SheetDescription>
				</VisuallyHidden>
				<div className="w-full h-full mt-2 relative">
					{isLoading && (
						<div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-10">
							<div className="w-8 h-8 border-4 border-[#038EE2] border-t-transparent rounded-full animate-spin"></div>
						</div>
					)}
					<div
						className={`pt-2 space-y-3 max-h-[75vh] overflow-y-scroll ${isLoading ? "opacity-50" : ""}`}
					>
						<div className="grid divide-y-2 divide-[#F0F1F2] pb-[40px]">
							<form
								onSubmit={handleSubmit(onSubmit)}
								className="grid divide-y-2 divide-[#F0F1F2] pb-[40px]"
							>
								<FormDropdown label="Name">
									<div className="w-[500px] flex flex-col gap-2">
										<div className="flex items-center gap-4">
											<div className="w-1/2">
												<div className="flex flex-col gap-1 h-[50px]">
													<Input
														id="first_name"
														{...register("first_name")}
														placeholder="First name"
														className={`w-full border ${
															errors.first_name
																? "border-red-500"
																: "border-[#D0D3D9]"
														} rounded-[8px] px-3 py-2 focus:outline-none placeholder:text-[#ACABB2] transition-all duration-200 ease-in-out`}
														disabled={isLoading}
													/>
													<p className="text-red-500 text-sm ml-1">
														{errors.first_name?.message ?? ""}
													</p>
												</div>
											</div>
											<div className="w-1/2">
												<div className="flex flex-col gap-1 h-[50px]">
													<Input
														id="last_name"
														{...register("last_name")}
														placeholder="Last name"
														className={`w-full border ${
															errors.last_name
																? "border-red-500"
																: "border-[#D0D3D9]"
														} rounded-[8px] px-3 py-2 focus:outline-none placeholder:text-[#ACABB2] transition-all duration-200 ease-in-out`}
														disabled={isLoading}
													/>
													<p className="text-red-500 text-sm ml-1">
														{errors.last_name?.message ?? ""}
													</p>
												</div>
											</div>
										</div>
									</div>
								</FormDropdown>

								{TeamMemberFields?.map(
									(
										{
											label,
											name,
											type,
											required,
											nameField,
											idField,
											datatype,
											selectFieldName,
										},
										index,
									) => {
										const safeName =
                      typeof name === "string" ? name : `field-${index}`;

										return (
											<FormDropdown
												key={safeName || `field-${index}`}
												label={label}
												required={required}
											>
												{!idField ? (
													<div className="flex flex-col gap-1">
														<div className="flex items-center gap-4">
															{name === "phone" && (
																<PhoneInput
																	onPhoneNumberChange={(phone: string) => {
																		setValue("phone", phone, {
																			shouldValidate: true,
																		});
																	}}
																	disabled={isLoading}
																/>
															)}
															<Input
																{...register(safeName as keyof FormData)}
																type={type}
																className={`w-[300px] rounded-[8px] border-[1px] ${
																	errors[safeName as keyof FormData]
																		? "border-red-500"
																		: "border-[#D0D3D9]"
																} px-2 py-1 focus:outline-none transition-all duration-200 ease-in-out`}
																disabled={isLoading}
															/>
														</div>
														{errors[safeName as keyof FormData] && (
															<p className="text-red-500 text-sm ml-1 mt-1">
																{errors[safeName as keyof FormData]?.message}
															</p>
														)}
													</div>
												) : (
													<div className="flex flex-col gap-1">
														<div className="flex items-center gap-4">
															<Controller
																name={idField as keyof FormData}
																control={control}
																render={({ field }) => (
																	<CombinedDropDown
																		value={field.value}
																		handleSelect={(selectedValues) => {
																			field.onChange(selectedValues);
																			handleDropdownChange(
																				nameField,
																				selectedValues,
																			);
																		}}
																		placeholder={`${selectFieldName}`}
																		DataType={datatype}
																		className="border-none p-0 w-[300px]"
																		getKey={(item) =>
																			datatype === "isEmployeeData"
																				? item.email
																				: item.name
																		}
																		renderItem={(item) => {
																			if (datatype === "isBranchData") {
																				return (
																					item?.name?.split("-")[0] ||
                                          item?.name ||
                                          ""
																				);
																			}
																			if (datatype === "isDepartmentData") {
																				return (
																					item?.name?.split("-")[0] ||
                                          item?.name ||
                                          ""
																				);
																			}
																			if (datatype === "isRoleData") {
																				return item?.role_name || "";
																			}
																			if (datatype === "isEmployeeData") {
																				return item?.email || "";
																			}
																			return item?.name || "";
																		}}
																		hasError={
																			!!errors[idField as keyof FormData]
																		}
																		disabled={isLoading || isBranchLoading}
																		singleSelect={
																			idField === "report_to" ||
                                      idField === "branch_id" ||
                                      idField === "department_id" ||
                                      idField === "role"
																		}
																	/>
																)}
															/>
														</div>
														{errors[idField as keyof FormData] && (
															<p className="text-red-500 text-sm ml-1 mt-1">
																{errors[idField as keyof FormData]?.name
																	?.message ||
                                  errors[idField as keyof FormData]?.role_name
                                  	?.message ||
                                  errors[idField as keyof FormData]?.email
                                  	?.message ||
                                  errors[idField as keyof FormData]?.message}
															</p>
														)}
													</div>
												)}
											</FormDropdown>
										);
									},
								)}

								<div className="absolute bottom-10 left-0 flex items-center justify-end gap-x-3 bg-white w-full border-t border-[#bbbbbb] px-[30px] py-[24px]">
									<button
										type="submit"
										disabled={isLoading}
										className={`bg-[#038EE2] px-4 py-1.5 w-fit rounded-[8px] text-white font-[600] text-[14px] ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
									>
                    Save
									</button>
								</div>
							</form>
						</div>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}

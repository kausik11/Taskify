import greenTick from "@/assets/icons/greenTick.svg";
import IconImage from "@/assets/icons/upload-image.svg";
import { CGCompany } from "@/types/ClapgrowApp/CGCompany";

import { useContext, useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2 } from "lucide-react";

import { useFrappeUpdateDoc } from "frappe-react-sdk";
import { toast } from "sonner";
import { UserContext } from "@/utils/auth/UserProvider";
import { Divider } from "../layout/AlertBanner/CommonDesign";

const DisplayComponent = () => {
	const { companyDetails, roleBaseName, setCompanyDetails, userDetails } = useContext(UserContext);
	const [companyName, setCompanyName] = useState("");
	const [previewLogo, setPreviewLogo] = useState("");
	const [file, setFile] = useState<File | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [blobUrl, setBlobUrl] = useState<string | null>(null); // Track blob URL separately
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const { updateDoc } = useFrappeUpdateDoc<CGCompany>();

	// Get current user's super admin status
	const currentUser = userDetails?.[0];
	const isSuperAdmin = currentUser?.is_super_admin === 1;
	const isAdmin = roleBaseName === "ROLE-Admin";

	// Check if user can edit (must be both admin role AND super admin)
	const canEdit = isAdmin || isSuperAdmin;

	// Cleanup blob URL when component unmounts or when blob URL changes
	useEffect(() => {
		return () => {
			if (blobUrl) {
				URL.revokeObjectURL(blobUrl);
			}
		};
	}, [blobUrl]);

	useEffect(() => {
		setIsLoading(true);

		if (companyDetails && companyDetails.length > 0) {
			const company = companyDetails[0];

			// Handle company name with fallbacks
			const name = company?.company_name || company?.name || "";
			setCompanyName(name);

			// Handle logo - only set if we don't have a pending file upload
			if (!file) {
				setPreviewLogo(company?.company_logo || "");
				// Clean up any existing blob URL since we're showing the actual logo
				if (blobUrl) {
					URL.revokeObjectURL(blobUrl);
					setBlobUrl(null);
				}
			}

		} else {
			setCompanyName("");
			setPreviewLogo("");
			setFile(null);
			if (blobUrl) {
				URL.revokeObjectURL(blobUrl);
				setBlobUrl(null);
			}
		}

		setIsLoading(false);
	}, [companyDetails, file, blobUrl]);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			const selectedFile = e.target.files[0];

			// Clean up previous blob URL
			if (blobUrl) {
				URL.revokeObjectURL(blobUrl);
			}

			// Create new blob URL for preview
			const newBlobUrl = URL.createObjectURL(selectedFile);
			setBlobUrl(newBlobUrl);
			setFile(selectedFile);
			setPreviewLogo(newBlobUrl);
		}
	};

	const handleDivClick = () => {
		if (fileInputRef.current && canEdit) {
			fileInputRef.current.click();
		}
	};

	const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setCompanyName(e.target.value);
	};

	const handleTrashClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (canEdit) {
			// Clean up blob URL if it exists
			if (blobUrl) {
				URL.revokeObjectURL(blobUrl);
				setBlobUrl(null);
			}
			setFile(null);
			setPreviewLogo("");
		}
	};

	const uploadFileToFrappe = async (file: File) => {
		const formData = new FormData();
		formData.append("file", file);
		formData.append("is_private", "0");

		const response = await fetch("/api/method/upload_file", {
			method: "POST",
			body: formData,
		});

		const data = await response.json();

		if (data.message.file_url) {
			return data.message.file_url;
		} else {
			throw new Error("File upload failed");
		}
	};

	const handleSubmit = async () => {
		if (!canEdit) {
			toast.error("You don't have permission to update company details.");
			return;
		}

		try {
			if (!companyDetails?.[0]) {
				throw new Error("No company details available");
			}

			const originalDoc = companyDetails[0];
			let values: Partial<CGCompany> = {};

			if (companyName !== (originalDoc.company_name || originalDoc.name)) {
				values.company_name = companyName;
			}

			let newLogoUrl = "";

			if (file) {
				// Upload new file
				newLogoUrl = await uploadFileToFrappe(file);
				values.company_logo = newLogoUrl;
			} else if (previewLogo === "" && originalDoc.company_logo) {
				// Logo was removed
				values.company_logo = "";
			}

			if (Object.keys(values).length === 0) {
				toast.info("No changes to save.");
				return;
			}

			await updateDoc("CG Company", originalDoc.name, values);

			// Update the company details state
			setCompanyDetails((prevDetails: CGCompany[]) => {
				const updatedDetails = [...prevDetails];
				updatedDetails[0] = {
					...updatedDetails[0],
					...values,
				};
				return updatedDetails;
			});

			// Clean up file state and blob URL
			if (blobUrl) {
				URL.revokeObjectURL(blobUrl);
				setBlobUrl(null);
			}
			setFile(null);

			// Set preview to the actual uploaded URL or empty string
			if (newLogoUrl) {
				setPreviewLogo(newLogoUrl);
			} else if (values.company_logo === "") {
				setPreviewLogo("");
			}

			toast.success("Company updated successfully!");
			window.location.reload();
		} catch (error) {
			console.error("Error updating company:", error);
			toast.error("Failed to update company.");
		}
	};

	// Show loading state
	if (isLoading) {
		return (
			<section className="mt-6 px-[16px]">
				<div className="animate-pulse">
					<div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
					<div className="h-10 bg-gray-200 rounded mb-4"></div>
				</div>
			</section>
		);
	}

	return (
		<section className="mt-6 px-[16px]">
			<CompanyNameInput
				companyName={companyName}
				handleCompanyNameChange={handleCompanyNameChange}
				setCompanyName={setCompanyName}
				canEdit={canEdit}
			/>
			<CompanyLogoInput
				previewLogo={previewLogo}
				fileInputRef={fileInputRef}
				handleDivClick={handleDivClick}
				handleFileChange={handleFileChange}
				handleTrashClick={handleTrashClick}
				canEdit={canEdit}
			/>
			<CompanyThemeInput />
			<CompanyLanguageInput />

			{canEdit && (
				<div className="flex justify-end mt-4">
					<button
						onClick={handleSubmit}
						className="bg-blue-500 text-white p-2 rounded px-6 hover:bg-blue-600 transition-colors"
					>
						Save
					</button>
				</div>
			)}
		</section>
	);
};

export default DisplayComponent;

const CompanyNameInput = ({
	companyName,
	setCompanyName,
	handleCompanyNameChange,
	canEdit,
}: {
	companyName: string;
	setCompanyName: React.Dispatch<React.SetStateAction<string>>;
	handleCompanyNameChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
	canEdit: boolean;
}) => {
	return (
		<div className="pb-[16px]">
			<div className="grid items-center grid-cols-6 md:grid-cols-7">
				<p className="text-[#5B5967] text-[14px] py-[16px] font-[600] col-span-2 md:col-span-1">
					Company Name
				</p>
				<div className="col-span-3 md:col-span-2 py-[10.5px]">
					{canEdit ? (
						<input
							placeholder="Company name here"
							type="text"
							value={companyName}
							onChange={handleCompanyNameChange}
							className="border-[1px] border-[#D0D3D9] py-[5.5px] font-[400] text-[14px] text-[#5B5967] rounded-[8px] px-[10px] w-full outline-none placeholder:text-[#ACABB2] placeholder:text-[14px]"
						/>
					) : (
						<div className="py-[5.5px] font-[400] text-[14px] text-[#5b5967] rounded-[8px] px-[10px] w-full min-h-[32px] flex items-center">
							{companyName || "No company name set"}
						</div>
					)}
				</div>
			</div>
			<Divider />
		</div>
	);
};

const CompanyLogoInput = ({
	handleDivClick,
	previewLogo,
	fileInputRef,
	handleTrashClick,
	handleFileChange,
	canEdit,
}: {
	handleDivClick: () => void;
	previewLogo: string;
	fileInputRef: React.RefObject<HTMLInputElement>;
	handleTrashClick: (event: React.MouseEvent) => void;
	handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
	canEdit: boolean;
}) => {
	return (
		<div className="space-y-2">
			<div className="grid items-center grid-cols-6 md:grid-cols-7">
				<p className="text-[#5B5967] text-[14px] font-[600] col-span-2 md:col-span-1">
					Company Logo
				</p>
				<div className="col-span-3 pb-[12px] pt-[2px] md:col-span-2">
					<div
						className={`border border-[#D4EFFF] h-[131px] w-[126px] rounded bg-[#EFF9FF] flex flex-col items-center justify-center ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'
						}`}
						onClick={(e) => {
							if ((e.target as HTMLElement).closest("svg")) return;
							if (canEdit) handleDivClick();
						}}
					>
						{previewLogo ? (
							<div className="relative">
								{canEdit && (
									<div className="trash-icon">
										<Trash2
											onClick={handleTrashClick}
											className="absolute -right-4 -top-2 cursor-pointer border-[#304156] border-[1px] rounded-full p-1"
										/>
									</div>
								)}
								<img
									src={previewLogo}
									alt="Company logo"
									className="h-[131px] w-[126px] rounded object-cover"
								/>
							</div>
						) : (
							<>
								<img
									src={IconImage}
									className="mx-[53px] mt-[44px] mb-[8px]"
									alt="upload_logo"
								/>
								<p className="text-[#0076BD] mb-[44px] text-[12px] font-[400]">
									{canEdit ? "Upload Logo" : "No Logo"}
								</p>
							</>
						)}
					</div>
					{canEdit && (
						<input
							type="file"
							ref={fileInputRef}
							style={{ display: "none" }}
							onChange={handleFileChange}
							accept="image/*"
						/>
					)}
				</div>
			</div>
			<Divider />
		</div>
	);
};

const CompanyThemeInput = () => {
	return (
		<div className="py-[16px]">
			<div className="grid items-center grid-cols-6 md:grid-cols-7">
				<p className="text-[#5B5967] text-[14px] font-[600] col-span-2 md:col-span-1">
					Theme
				</p>
				<div className="col-span-2 flex space-x-4">
					<div className="flex flex-col items-center space-y-1">
						<div className="border-2 relative border-[#79B8DE] h-[100px] w-[100px] rounded-xl bg-white flex flex-col gap-y-2 cursor-pointer shadow p-2">
							<img src={greenTick} className="absolute top-1 right-1" />
							<Skeleton className="h-3 w-2/3" />
							<Skeleton className="h-3 w-full" />
							<Skeleton className="h-3 w-1/3" />
							<Skeleton className="h-9 w-full" />
						</div>
						<p className="font-extralight text-[12px]">Light Theme</p>
					</div>
					<div className="flex flex-col items-center space-y-1">
						<div className="h-[100px] w-[100px] rounded-xl bg-[#0A0E13] flex flex-col gap-y-2 cursor-not-allowed shadow p-2 opacity-50 relative">
							<Skeleton className="h-3 w-2/3 bg-[#3E4956]" />
							<Skeleton className="h-3 w-full bg-[#3E4956]" />
							<Skeleton className="h-3 w-1/3 bg-[#3E4956]" />
							<Skeleton className="h-9 w-full bg-[#3E4956]" />
							<div className="absolute inset-0 bg-black bg-opacity-20 rounded-xl backdrop-blur-[1px]"></div>
						</div>
						<p className="font-extralight text-[12px] text-gray-400">Coming Soon</p>
					</div>
				</div>
			</div>
			<Divider />
		</div>
	);
};

const CompanyLanguageInput = () => {
	return (
		<div className="py-[16px]">
			<div className="grid items-center grid-cols-6 md:grid-cols-7">
				<p className="text-[#5B5967] text-[14px] font-[600] col-span-2 md:col-span-1">
					Language
				</p>
				<div className="col-span-2 flex space-x-4">
					<div className="flex flex-col items-center space-y-1">
						<div className="border-2 relative border-[#79B8DE] shadow h-[100px] w-[100px] rounded-xl bg-white gap-y-2 cursor-pointer p-2 flex items-center justify-center">
							<img src={greenTick} className="absolute top-1 right-1" />
							<p className="text-3xl font-semibold">Ag</p>
						</div>
						<p className="font-extralight text-[12px]">English</p>
					</div>
					<div className="flex flex-col items-center space-y-1">
						<div className="h-[100px] w-[100px] rounded-xl bg-white gap-y-2 cursor-not-allowed p-2 flex items-center justify-center border border-[#D0D3D9] opacity-50 relative">
							<p className="text-3xl font-semibold text-[#ACABB2]">एज</p>
							<div className="absolute inset-0 bg-black bg-opacity-20 rounded-xl backdrop-blur-[1px]"></div>
						</div>
						<p className="font-extralight text-[12px] text-gray-400">Coming Soon</p>
					</div>
				</div>
			</div>
			<Divider />
		</div>
	);
};
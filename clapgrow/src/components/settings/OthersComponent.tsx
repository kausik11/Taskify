import { useContext, useState } from "react";

import {
	DropdownMenu,
	DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import { ChevronDown, MessageCircleCode } from "lucide-react";
import { DropdownMenuContent, DropdownMenuItem } from "../ui/dropdown-menu";
import { Loader } from "../layout/AlertBanner/CommonDesign";
import DOMPurify from "dompurify";
import { FrappeConfig, FrappeContext } from "frappe-react-sdk";

const OthersComponent = () => {
	const { call } = useContext(FrappeContext) as FrappeConfig;
	const [days, setDays] = useState<string | undefined>();
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
	const [qrLoading, setQrLoading] = useState<boolean>(false);
	const [isQrScanned, setIsQrScanned] = useState<boolean>(false);
	const [pollingInstanceId, setPollingInstanceId] = useState<string | null>(
		null,
	);

	const resetMessages = () => {
		setError(null);
		setSuccessMessage(null);
	};

	const createInstance = async () => {
		setLoading(true);
		resetMessages();

		try {
			const response = await call.post(
				"clapgrow_app.api.whatsapp.utils.create_whatsapp_instance",
			);

			if (response?.message[0]?.status === "success") {
				const instanceId = response?.message[0]?.data?.instance_id;
				if (instanceId) {
					setSuccessMessage("WhatsApp instance created successfully!");
					setPollingInstanceId(instanceId);
					pollForQrCode(instanceId);
				} else {
					setError("Instance ID not found in response.");
				}
			} else {
				setError("Instance already logged in.");
			}
		} catch (err: any) {
			const errorMessage = DOMPurify.sanitize(
				err.response?.message?.[0]?.message,
			);
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	const fetchQrCodeImage = async () => {
		try {
			const qrResponse = await call.get(
				`clapgrow_app.api.whatsapp.utils.fetch_and_save_qr_code`,
			);

			const qrCodeImage = qrResponse?.message?.qr_code_image;

			if (qrCodeImage) {
				setQrCodeImage(qrCodeImage);
			} else {
				setError("Please click on Create Instance again.");
			}
		} catch (err) {
			console.error("Error fetching QR code image:", err);
			setError("An error occurred while fetching the QR code image.");
		}
	};

	const pollForQrCode = (instanceId: string) => {
		setQrLoading(true);
		resetMessages();

		const interval = setInterval(async () => {
			try {
				const response = await call.get(
					`clapgrow_app.api.whatsapp.utils.get_client_status?instance_id=${instanceId}`,
				);

				const instanceStatus = response?.message?.clientStatus?.instanceStatus;

				if (instanceStatus === "qr") {
					if (!qrCodeImage) {
						await fetchQrCodeImage();
					}
				} else if (instanceStatus === "ready") {
					setIsQrScanned(true);
					setQrCodeImage(null);
					setSuccessMessage("QR Code scanned successfully!");
					setPollingInstanceId(null);
					clearInterval(interval);
				}
			} catch (err) {
				console.error("Error polling for QR code:", err);
				setError("Error occurred while polling for client status.");
			} finally {
				setQrLoading(false);
			}
		}, 5000);

		return () => clearInterval(interval);
	};

	return (
		<div className="p-4">
			<div className="flex items-center justify-start gap-x-10 px-10">
				<div className="space-y-1">
					<h2 className="text-[14px] font-[600] text-[#5B5967]">
            Checker Review Timeline
					</h2>
					<p className="text-[12px] font-[400] text-[#5B5967]">
            Define review timeline after task due
					</p>
				</div>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button className="flex items-center justify-between gap-[4px] text-[14px] text-[#0076BD]">
							{days ? (
								<p className="flex items-center text-black">{days}</p>
							) : (
								"Select Days"
							)}
							<ChevronDown className="scale-140" size={15} />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent className="bg-white shadow-md rounded-md py-2">
						{[1, 2, 3, 4, 5].map((day) => (
							<DropdownMenuItem
								key={day}
								onSelect={() => setDays(`${day} Day${day > 1 ? "s" : ""}`)}
							>
								{day} Day{day > 1 ? "s" : ""}
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			<div className="border-b border-gray-200 mx-10 mt-3"></div>
			{/* <div className="flex items-center justify-start px-10 mt-4 space-y-1">
				{!isQrScanned && !qrCodeImage && (
					<div className="flex flex-row gap-20">
						<label htmlFor="WhatsApp">Login to WhatsApp</label>
						<div>
							<button
								onClick={createInstance}
								className="text-[#0076BD] px-4 py-2 rounded"
								disabled={loading}
							>
								{loading ? (
									"Creating Instance..."
								) : (
									<div className="flex flex-row -mt-2 gap-1">
										<MessageCircleCode color="#62a0ea" />
										<p>Create Instance</p>
									</div>
								)}
							</button>
						</div>
					</div>
				)}
			</div> */}
			{error && (
				<div className="mt-4 text-red-500">
					<p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(error) }} />
				</div>
			)}
			{successMessage && (
				<div className="mt-4 text-green-500">
					<p>{successMessage}</p>
				</div>
			)}
			{(qrLoading || loading) && <Loader message="Processing..." />}
			{qrCodeImage && !qrLoading && !isQrScanned && (
				<div className="mt-4 text-left">
					<h3 className="text-[14px] font-[600] text-[#5B5967]">QR Code</h3>
					<div className="inline-block p-2 bg-white rounded-lg shadow-lg mt-2">
						<div className="border-2 border-black p-2 bg-white rounded-lg">
							<img src={qrCodeImage} alt="QR Code" className="w-48 h-48" />
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default OthersComponent;

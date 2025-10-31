import React from "react";
import ReactCrop, { Crop, PixelCrop } from "react-image-crop";
import { Button } from "@/components/ui/button";
import "react-image-crop/dist/ReactCrop.css";

interface CropModalProps {
  showCropModal: boolean;
  onClose: () => void;
  imageSrc: string | null;
  crop: Crop;
  onCropChange: (crop: Crop) => void;
  onCropComplete: (crop: PixelCrop | null) => void;
  imgRef: React.RefObject<HTMLImageElement>;
  onSave: () => void;
}

export const CropModal: React.FC<CropModalProps> = ({
	showCropModal,
	onClose,
	imageSrc,
	crop,
	onCropChange,
	onCropComplete,
	imgRef,
	onSave,
}) => {
	if (!showCropModal || !imageSrc) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white p-4 rounded-xl shadow-xl max-w-[90vw] w-[400px]">
				<ReactCrop
					crop={crop}
					onChange={(_, percentCrop) => onCropChange(percentCrop)}
					onComplete={onCropComplete}
					aspect={1}
					circularCrop
				>
					<img
						ref={imgRef}
						src={imageSrc}
						alt="Crop me"
						className="max-w-full max-h-[60vh] object-contain"
					/>
				</ReactCrop>

				<div className="flex justify-end gap-2 mt-4">
					<Button variant="outline" onClick={onClose}>
            Cancel
					</Button>
					<Button onClick={onSave}>Save Crop</Button>
				</div>
			</div>
		</div>
	);
};

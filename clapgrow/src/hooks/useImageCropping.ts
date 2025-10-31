import { useState, useRef } from 'react';
import { Crop, PixelCrop } from 'react-image-crop';

export const useImageCropping = () => {
	const imgRef = useRef<HTMLImageElement | null>(null);
	const [imageSrc, setImageSrc] = useState<string | null>(null);
	const [crop, setCrop] = useState<Crop>({
		unit: "%",
		width: 50,
		height: 50,
		x: 25,
		y: 25,
	});
	const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
	const [showCropModal, setShowCropModal] = useState(false);

	const handleImageUpdate = (file: File) => {
		const reader = new FileReader();
		reader.addEventListener("load", () => {
			setImageSrc(reader.result?.toString() || null);
			setShowCropModal(true);
		});
		reader.readAsDataURL(file);
	};

	const getCroppedImg = (image: HTMLImageElement, crop: PixelCrop): Promise<string> => {
		const canvas = document.createElement("canvas");
		const scaleX = image.naturalWidth / image.width;
		const scaleY = image.naturalHeight / image.height;
		canvas.width = crop.width;
		canvas.height = crop.height;
		const ctx = canvas.getContext("2d");

		if (ctx) {
			ctx.drawImage(
				image,
				crop.x * scaleX,
				crop.y * scaleY,
				crop.width * scaleX,
				crop.height * scaleY,
				0,
				0,
				crop.width,
				crop.height
			);
		}

		return new Promise((resolve) => {
			canvas.toBlob((blob) => {
				if (blob) {
					const reader = new FileReader();
					reader.readAsDataURL(blob);
					reader.onloadend = () => resolve(reader.result as string);
				}
			}, "image/png");
		});
	};

	return {
		imgRef,
		imageSrc,
		crop,
		setCrop,
		completedCrop,
		setCompletedCrop,
		showCropModal,
		setShowCropModal,
		handleImageUpdate,
		getCroppedImg,
		setImageSrc,
	};
};

import React from "react";

interface ProfileImageProps {
  userImage: string | undefined;
  defaultImage: string;
  showEditOptions: boolean;
  onToggleEditOptions: () => void;
  onChangePhoto: () => void;
  onRemovePhoto: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  editDropdownRef: React.RefObject<HTMLDivElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  editIcon: string;
}

export const ProfileImage: React.FC<ProfileImageProps> = ({
	userImage,
	defaultImage,
	showEditOptions,
	onToggleEditOptions,
	onChangePhoto,
	onRemovePhoto,
	onFileChange,
	editDropdownRef,
	fileInputRef,
	editIcon,
}) => (
	<div className="h-[18vh] relative group">
		<img
			src={userImage || defaultImage}
			alt="User profile image"
			className={`h-full object-cover mx-auto rounded-full aspect-square transition-all duration-300 ${
				showEditOptions ? "blur-sm" : ""
			}`}
		/>

		{/* Edit button and dropdown wrapper */}
		<div
			ref={editDropdownRef}
			className="z-10 absolute right-[35%] bottom-[10%] flex flex-col items-center"
		>
			<button
				type="button"
				onClick={onToggleEditOptions}
				className="rounded-full shadow-md transition-colors cursor-pointer"
			>
				<img src={editIcon} alt="Edit profile" className="w-7 h-7" />
			</button>

			{showEditOptions && (
				<div className="absolute top-full mt-2 w-40 border border-gray-300 bg-white rounded-md shadow-lg">
					<button
						type="button"
						onClick={onChangePhoto}
						className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 rounded-t-md cursor-pointer"
					>
            Change Photo
					</button>
					<button
						type="button"
						onClick={onRemovePhoto}
						className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-gray-100 rounded-b-md cursor-pointer"
					>
            Remove Photo
					</button>
				</div>
			)}
		</div>

		<input
			type="file"
			ref={fileInputRef}
			hidden
			accept="image/*"
			onChange={onFileChange}
		/>
	</div>
);

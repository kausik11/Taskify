import { CircleX, FileX, PencilLine as Pencil } from "lucide-react";
import { useRouteError } from "react-router-dom";
import filterIcon from "@/assets/icons/sort.svg";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { Download } from "lucide-react";
import { useState } from "react";
interface LoaderProps {
  message?: string;
}
interface FilePreviewDialogProps {
  file: { file_name: string; file_url: string };
}

type EditToggleProps<T> = {
  fieldKey: keyof T; // Ensure fieldKey is one of the keys in T
  toggleEditMode: React.Dispatch<React.SetStateAction<T>>;
  editMode: T;
  roleBaseName?: string | null;
  editflag?: boolean;
};
export const Divider = () => {
	return (
		<div
			className="flex border-[1px] rounded-[2px]  bottom-[-6px] left-0 right-0 w-full mt-2"
			style={{
				borderColor: "#F0F1F2",
			}}
		/>
	);
};
export const Loader: React.FC<LoaderProps> = ({ message }) => {
	return (
		<div className="loader-overlay">
			<div className="loader-content">
				<div className="classic-spinner"></div>
				<p className="loader-text">{message}</p>
			</div>
		</div>
	);
};

// export const EditToggle = <T extends Record<string, boolean>>({
//   fieldKey,
//   toggleEditMode,
//   editMode,
// }: EditToggleProps<T>) => {
//   if (!editMode || !(fieldKey in editMode)) {
//     return null;
//   }

//   return (
//     <div className="relative flex items-center">
//       <div className="group flex items-center">
//         {!editMode[fieldKey] ? (
//           <Pencil
//             size={16}
//             className="text-[#0076BD] cursor-pointer ml-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
//             onClick={() =>
//               toggleEditMode((prev) => ({ ...prev, [fieldKey]: true }))
//             }
//           />
//         ) : (
//           <CircleX
//             className="text-[#0076BD] cursor-pointer w-[15px] h-[15px] ml-2"
//             onClick={() =>
//               toggleEditMode((prev) => ({ ...prev, [fieldKey]: false }))
//             }
//           />
//         )}
//       </div>
//     </div>
//   );
// };

export function ErrorPage() {
	const error: any = useRouteError();
	return (
		<div id="error-page">
			<h1>Oops!</h1>
			<p>Sorry, an unexpected error has occurred.</p>
			<p>
				<i>{error?.statusText || error?.message}</i>
			</p>
		</div>
	);
}

export const ColumnHeader = ({
	title,

	hasFilterIcon = true,

	additionalClasses = "",
}: {
  title: string;

  hasFilterIcon?: boolean;

  additionalClasses?: string;
}) => (
	<div
		className={`flex flex-row items-center gap-x-1 text-[12px] text-[#2D2C37] font-[400] ${additionalClasses}`}
	>
		{title}

		{hasFilterIcon && (
			<img
				src={filterIcon}
				alt="filter icon"
				className="w-[10px] h-[10px] cursor-pointer"
			/>
		)}
	</div>
);

export const EditToggle = <T extends Record<string, boolean>>({
	fieldKey,
	toggleEditMode,
	editMode,
	roleBaseName,
	editflag,
}: EditToggleProps<T>) => {
	if (!editMode || !(fieldKey in editMode)) {
		return null;
	}
	return (
		<div className="flex items-center">
			{roleBaseName === "ROLE-Admin" || editflag || !editMode[fieldKey] ? (
				<Pencil
					size={16}
					className="text-[#0076BD] mb-auto cursor-pointer ml-4 flex-shrink-0"
					onClick={(e) => {
						e.stopPropagation(); // Prevent closing TaskSheetContent
						toggleEditMode((prev) => ({ ...prev, [fieldKey]: true }));
					}}
				/>
			) : (
				<CircleX
					className="text-[#0076BD] cursor-pointer w-[15px] h-[15px] ml-2"
					onClick={(e) => {
						e.stopPropagation(); // Prevent closing TaskSheetContent
						toggleEditMode((prev) => ({ ...prev, [fieldKey]: false }));
					}}
				/>
			)}
		</div>
	);
};

export const getFilePreview = (file: {
  file_url: string;
  file_name: string;
}) => {
	const ext = file.file_name.split(".").pop()?.toLowerCase();

	if (["jpg", "jpeg", "png", "gif"].includes(ext!)) {
		return (
			<img
				src={file.file_url}
				alt="Preview"
				className="w-[400px] h-[450px] object-cover rounded-md"
			/>
		);
	} else if (ext === "pdf") {
		return (
			<iframe
				src={file.file_url}
				className="w-[550px] h-[450px] border rounded-md"
			/>
		);
	} else if (["txt", "csv"].includes(ext!)) {
		return (
			<iframe
				src={file.file_url}
				className="w-[550px] h-[450px] bg-gray-100 p-2 border rounded-md"
			/>
		);
	} else {
		return (
			<div className="w-[550px] h-[450px] flex flex-col items-center justify-center text-gray-500 border rounded-md">
				<FileX size={50} className="mb-2" />
				<span>Preview not available</span>
			</div>
		);
	}
};
export const FilePreviewDialog: React.FC<FilePreviewDialogProps> = ({
	file,
}) => {
	const [selectedFile, setSelectedFile] = useState(file);

	return (
		<>
			<Dialog>
				<DialogTrigger asChild>
					<button
						className="text-[12px] text-[#5B5967] font-medium"
						onClick={() => setSelectedFile(file)}
					>
						{file.file_name.split(" ")[0]}...
					</button>
				</DialogTrigger>

				<DialogContent className="max-w-xl p-4 flex flex-col items-center bg-[#F1F5FA] rounded-lg">
					<h3 className="text-lg font-semibold">{selectedFile?.file_name}</h3>

					{/* File Preview */}
					{selectedFile && getFilePreview(selectedFile)}

					{/* Download Button */}
					<a
						href={selectedFile?.file_url}
						download={selectedFile?.file_name}
						className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md flex items-center gap-2"
					>
						<Download size={18} />
            Download
					</a>
				</DialogContent>
			</Dialog>
		</>
	);
};

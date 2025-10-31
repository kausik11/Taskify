import { X } from "lucide-react";
import MultiFileUpload from "./MultiFileUpload";

interface FileUploadViewProps {
  attachedFiles: { file_name: string; file_url: string }[]; // Array of file objects
  editMode: { description: boolean }; // Assuming editMode contains a 'description' boolean
  selectedTask: string | null; // Task identifier
  handleFileRemove: (
    index: number,
    fileName: "attachFile" | "submitFile",
  ) => void;
  fileName: string;
  handleFilesSelected: (files: File[]) => void;
}

const FileUploadView: React.FC<FileUploadViewProps> = ({
	attachedFiles,
	editMode,
	selectedTask,
	handleFileRemove,
	fileName,
	handleFilesSelected,
}) => {
	return (
		<div>
			{attachedFiles?.map(
				(file: { file_name: string; file_url: string }, index: number) => (
					<div
						key={index}
						className={`flex items-center ${
							(fileName === "submitFile" && !editMode.description) ||
              (fileName === "attachFile" && editMode.description)
								? "bg-white"
								: "bg-[#F1F5FA]"
						} rounded-md px-2 py-1.5 mr-2 mt-2`}
					>
						<a
							href={file.file_url}
							target="_blank"
							rel="noopener noreferrer"
							className="text-[12px] text-[#0076BE] mr-2 cursor-pointer"
							download={
								!file.file_url.match(
									/\.(pdf|jpg|jpeg|png|gif|webp|json|csv|txt|xlsx)$/i,
								)
							}
						>
							{file.file_name}
						</a>

						{/* Remove File Button (if editing) */}
						{((fileName === "submitFile" && !editMode.description) ||
              (selectedTask === "myTask" &&
                fileName === "attachFile" &&
                editMode.description)) && (
							<button
								onClick={() =>
									handleFileRemove(
										index,
                    fileName as "attachFile" | "submitFile",
									)
								}
								className="text-[#5B5967] flex items-center"
							>
								<X size={16} className="text-red-500" />
							</button>
						)}
					</div>
				),
			)}
			{fileName === "submitFile" && (
				<MultiFileUpload
					onFilesSelected={handleFilesSelected}
					editMode={editMode}
					selectedTask={null}
					fileName="submitFile"
				/>
			)}
		</div>
	);
};

export default FileUploadView;

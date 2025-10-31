import React from "react";
import { X } from "lucide-react";
import MultiFileUpload from "@/components/common/MultiFileUpload";
import { FilePreviewDialog } from "@/components/layout/AlertBanner/CommonDesign";
import { DotStreamLoader } from "@/layouts/Loader";

interface FileProps {
  file_name: string;
  file_url: string;
}

interface FileUploadSectionProps {
  type: "attach_file" | "submit_file";
  label: string;
  required?: boolean;
  existingFiles: FileProps[];
  newFiles: File[];
  isLoading: boolean;
  canEdit: boolean;
  onFilesSelected: (files: File[], field: "attach_file" | "submit_file") => void;
  onFileRemove: (index: number, fileType: "attach_file" | "submit_file") => void;
  showUploadError?: string;
  className?: string;
}

const FileUploadSection: React.FC<FileUploadSectionProps> = ({
  type,
  label,
  required = false,
  existingFiles,
  newFiles,
  isLoading,
  canEdit,
  onFilesSelected,
  onFileRemove,
  showUploadError,
  className = "",
}) => {
  const layoutClass =
    type === "attach_file"
      ? "flex-col"
      : "flex-col sm:flex-row items-start sm:items-center bg-[#F1F5FA] items-center";

  return (
    <div
      className={`flex ${layoutClass} 
      justify-start w-full rounded-lg 
       ${type === "attach_file" ? "" :  "p-2 sm:p-4 gap-2 sm:gap-3"}
      ${showUploadError ? "border border-[#D72727]" : ""} ${className}`}
    >
      {/* Label */}
      <p className="text-sm text-[#5B5967] min-w-[140px] sm:min-w-[160px]">
        {label}
        {required && <span className="text-red-500">*</span>}
      </p>

      {/* File upload area */}
      <div className="flex flex-row flex-start items-center gap-2 w-full">
          {/* Existing files */}
        <div className="flex flex-wrap gap-2 mt-4">
          {isLoading ? (
            <DotStreamLoader />
          ) : (
            existingFiles?.map((file, index) => (
              <div
                key={index}
                className={`flex items-center w-fit border-2 border-gray-100 ${type === "attach_file" ? "bg-[#F1F5FA]" : "bg-white"} rounded-md px-3 py-2 gap-2 shadow-sm max-w-[250px] truncate`}
              >
                <FilePreviewDialog file={file} />
                {canEdit && (
                  <button
                    onClick={() => onFileRemove(index, type)}
                    className="text-[#5B5967] hover:text-red-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
        {canEdit && (
          <MultiFileUpload
            onFilesSelected={(files) => onFilesSelected(files, type)}
            selectedFiles={newFiles}
          />
        )}

        {showUploadError && (
          <p className="text-red-500 text-xs mt-1">{showUploadError}</p>
        )}

      
      </div>
    </div>
  );
};

export default FileUploadSection;

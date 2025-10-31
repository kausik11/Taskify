import { X } from "lucide-react";
import React, { useRef } from "react";

interface FileUploadProps {
  onFilesSelected: (
    files: File[],
    field: "attach_file" | "submit_file",
  ) => void;
  selectedFiles: File[];
}

const MultiFileUpload: React.FC<FileUploadProps> = ({
  onFilesSelected,
  selectedFiles,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(event.target.files || []);

    // Ensure uniqueness
    const uniqueFiles = [
      ...selectedFiles,
      ...newFiles.filter(
        (newFile) => !selectedFiles.some((file) => file.name === newFile.name),
      ),
    ];

    onFilesSelected(uniqueFiles, "attach_file");

    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    onFilesSelected(updatedFiles, "attach_file");
  };

  const handleAttachFileClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col">
      <div>
        <p
          className="text-[14px] font-[400] text-[#0076BD] cursor-pointer mt-3"
          onClick={handleAttachFileClick}
        >
          + Attach file
        </p>

        <input
          type="file"
          multiple
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: "none" }}
          accept=".pdf,.doc,.docx,.log,.mp3,.mp4,.json,.xls,.xlsx,.txt,.gz,.csv,.png,.jpeg,.jpg,.img,.sql,.word,.odt,.rtf,.ods,.ppt,.pptx,.odp,.key,.epub,.mobi,.azw,.ibooks,.html,.htm,.md,.xml,.yml"
        />
      </div>

      <div>
        {selectedFiles?.map((file, index) => (
          <div
            key={index}
            className="flex items-center bg-[#eff9ff] rounded-md px-[8px] py-[6.5px] mr-2 mb-1 mt-2"
          >
            <span className="text-[12px] font-[400] text-[#5B5967]">
              {file.name}
            </span>
            <button onClick={() => removeFile(index)} className="text-red-500">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MultiFileUpload;

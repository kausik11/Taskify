import { useState, useEffect } from "react";
import { useFrappeFileUpload, useFrappeUpdateDoc } from "frappe-react-sdk";
import { toast } from "sonner";

interface FileProps {
  file_name: string;
  file_url: string;
}

interface UseFileManagementProps {
  taskName: string;
  initialAttachFiles?: string;
  initialSubmitFiles?: string;
}

interface UseFileManagementReturn {
  // Attached files state
  existingAttachedFiles: FileProps[];
  newAttachedFiles: File[];
  setNewAttachedFiles: (files: File[]) => void;

  // Submit files state
  existingSubmitFiles: FileProps[];
  submitFiles: File[];
  setSubmitFiles: (files: File[]) => void;

  // Operations
  handleAttachFileSelected: (
    files: File[],
    field: "attach_file" | "submit_file",
  ) => Promise<void>;
  handleSubmitFileSelected: (
    files: File[],
    field: "attach_file" | "submit_file",
  ) => Promise<void>;
  handleFileRemove: (
    index: number,
    fileType: "attach_file" | "submit_file",
  ) => void;
  clearFileStates: () => void;

  // Status
  isLoading: boolean;
  showUploadError: string;
  setShowUploadError: (error: string) => void;
}

export const useFileManagement = ({
  taskName,
  initialAttachFiles,
  initialSubmitFiles,
}: UseFileManagementProps): UseFileManagementReturn => {
  const { upload } = useFrappeFileUpload();
  const { updateDoc } = useFrappeUpdateDoc();

  const [existingAttachedFiles, setExistingAttachedFiles] = useState<
    FileProps[]
  >([]);
  const [newAttachedFiles, setNewAttachedFiles] = useState<File[]>([]);
  const [existingSubmitFiles, setExistingSubmitFiles] = useState<FileProps[]>(
    [],
  );
  const [submitFiles, setSubmitFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showUploadError, setShowUploadError] = useState<string>("");

  // Process files from JSON string to FileProps array
  const processFiles = (
    fileData: string | undefined,
    setter: (files: FileProps[]) => void,
  ) => {
    if (fileData) {
      try {
        const parsedFiles = JSON.parse(fileData);
        const updatedFiles: FileProps[] = parsedFiles.map(
          (file: { file_url: string }) => ({
            ...file,
            file_name: file.file_url?.split("/").pop() || "",
          }),
        );
        setter(updatedFiles);
      } catch (err) {
        console.error("Failed to parse file data:", fileData, err);
        setter([]);
      }
    } else {
      setter([]);
    }
  };

  // Initialize files when data changes
  useEffect(() => {
    processFiles(initialAttachFiles, setExistingAttachedFiles);
    processFiles(initialSubmitFiles, setExistingSubmitFiles);
  }, [initialAttachFiles, initialSubmitFiles]);

  const handleAttachFileSelected = async (
    files: File[],
    field: "attach_file" | "submit_file",
  ) => {
    setIsLoading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const response = await upload(file, {
          isPrivate: true,
          doctype: "CG Task Instance",
          fieldname: field,
        });
        return { file_url: response.file_url, name: response.name };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      const updatedFiles: FileProps[] = uploadedFiles.map((file) => ({
        ...file,
        file_name: file.file_url?.split("/").pop() || "",
      }));

      const FilesData = uploadedFiles.map((file) => ({
        name: file.name,
      }))[0] || { name: "" };
      setExistingAttachedFiles((prevFiles) => [...prevFiles, ...updatedFiles]);

      await updateDoc("File", FilesData.name, {
        attached_to_name: taskName,
        attached_to_doctype: "CG Task Instance",
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitFileSelected = async (
    files: File[],
    field: "attach_file" | "submit_file",
  ) => {
    setIsLoading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const response = await upload(file, {
          isPrivate: true,
          doctype: "CG Task Instance",
          fieldname: field,
        });
        return { file_url: response.file_url, name: response.name };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      const updatedFiles: FileProps[] = uploadedFiles.map((file) => ({
        ...file,
        file_name: file.file_url?.split("/").pop() || "",
      }));

      const FilesData = uploadedFiles.map((file) => ({
        name: file.name,
      }))[0] || { name: "" };
      setExistingSubmitFiles((prevFiles) => [...prevFiles, ...updatedFiles]);

      await updateDoc("File", FilesData.name, {
        attached_to_name: taskName,
        attached_to_doctype: "CG Task Instance",
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileRemove = (
    indexToRemove: number,
    fileType: "attach_file" | "submit_file",
  ) => {
    if (fileType === "attach_file") {
      setExistingAttachedFiles((prevFiles) =>
        prevFiles.filter((_, index) => index !== indexToRemove),
      );
    } else if (fileType === "submit_file") {
      setExistingSubmitFiles((prevFiles) =>
        prevFiles.filter((_, index) => index !== indexToRemove),
      );
    }
  };

  const clearFileStates = () => {
    setExistingAttachedFiles([]);
    setExistingSubmitFiles([]);
    setNewAttachedFiles([]);
    setSubmitFiles([]);
    setShowUploadError("");
  };

  return {
    existingAttachedFiles,
    newAttachedFiles,
    setNewAttachedFiles,
    existingSubmitFiles,
    submitFiles,
    setSubmitFiles,
    handleAttachFileSelected,
    handleSubmitFileSelected,
    handleFileRemove,
    clearFileStates,
    isLoading,
    showUploadError,
    setShowUploadError,
  };
};

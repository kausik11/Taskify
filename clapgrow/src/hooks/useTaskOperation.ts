import { useState, useContext } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { 
  useFrappeCreateDoc, 
  useFrappeUpdateDoc, 
  useFrappeAuth 
} from 'frappe-react-sdk';
import { UserContext } from '@/utils/auth/UserProvider';
import { CGTaskInstance } from '@/types/ClapgrowApp/CGTaskInstance';

interface UseTaskOperationsProps {
  taskUpdate: CGTaskInstance;
  setTaskUpdate: React.Dispatch<React.SetStateAction<CGTaskInstance>>;
  selectedDueDate: Date | null;
  frequency: { name: string };
  weekDays: string[];
  monthDay: { name: string };
  intervalWeek: { name: string };
  nthValue: { name: string };
  dueWorkingDay: string;
  newAssignedTo: { email: string; full_name?: string } | null;
  selectedStartDate: Date;
  selectedEndDate: Date;
  existingAttachedFiles: any[];
  existingSubmitFiles: any[];
  mutateTask: () => void;
  resetEditModes: () => void;
  clearFileStates: () => void;
  submitComment: () => Promise<void>;
  pendingComment: string;
  onTaskCompleted?: () => void;
  //  formMetaRef?: React.RefObject<any>; // Added formMetaRef to props
  // formMetaState?: any; // Added formMetaState to props
  // triggerFormSubmit?: () => void; // Added triggerFormSubmit to props
  // formSubmissionResult?: any; // Added formSubmissionResult to props
  // clearFormSubmissionResult?: () => void;
  formMetaState?: {
    isValid: boolean;
    submitForm: (() => Promise<any>) | null;
  };
  triggerFormSubmit?: () => void;
  formSubmissionResult?: {
    success: boolean;
    data?: any;
    error?: any;
  } | null;
  clearFormSubmissionResult?: () => void;
  
}

interface UseTaskOperationsReturn {
  isLoading: boolean;
  handleSubmit: (e: React.FormEvent, action: string) => Promise<void>;
  handleStatusUpdate: (newStatus: string) => Promise<void>;
  handleUserSelect: (value: string) => Promise<void>;
  handleReallocation: () => Promise<void>;
  checkTaskCompletion: () => { isDisabled: boolean; tooltipMessage: string };
}

export const useTaskOperations = ({
  taskUpdate,
  setTaskUpdate,
  selectedDueDate,
  frequency,
  weekDays,
  monthDay,
  intervalWeek,
  nthValue,
  dueWorkingDay,
  newAssignedTo,
  selectedStartDate,
  selectedEndDate,
  existingAttachedFiles,
  existingSubmitFiles,
  mutateTask,
  resetEditModes,
  clearFileStates,
  submitComment,
  pendingComment,
  onTaskCompleted,
  //  formMetaRef, // Added to props

     formMetaState,
  triggerFormSubmit,
  formSubmissionResult,
  clearFormSubmissionResult,
  
}: UseTaskOperationsProps): UseTaskOperationsReturn => {
  const { createDoc } = useFrappeCreateDoc();
  const { updateDoc } = useFrappeUpdateDoc();
  const { currentUser } = useFrappeAuth();
  const { userDetails } = useContext(UserContext);
  
  const [isLoading, setIsLoading] = useState(false);

  const checkTaskCompletion = () => {
    const isAlreadyCompleted = taskUpdate?.status === "Completed" || taskUpdate?.is_completed === 1;
    const isRejected = taskUpdate?.status === "Rejected";

    if (isAlreadyCompleted) {
      return { isDisabled: true, tooltipMessage: "Task is already completed" };
    }

    if (isRejected) {
      return {
        isDisabled: true,
        tooltipMessage: "Rejected tasks cannot be completed",
      };
    }

    const req = taskUpdate?.upload_required === 1 && existingSubmitFiles.length === 0;
    const isDueDatePassed = taskUpdate?.due_date && new Date(taskUpdate.due_date) < new Date();
    const isRestricted = taskUpdate?.restrict === 1 && isDueDatePassed;
    const isDisabled = req || isRestricted;

    let tooltipMessage = "";
    if (isRestricted) {
      tooltipMessage = "Due date to mark this task complete has passed!";
    } else if (req) {
      tooltipMessage = "File Upload is required to complete the task";
    }
    
    return { isDisabled, tooltipMessage };
  };

  const handleReallocation = async () => {
    if (!newAssignedTo?.email) {
      throw new Error("Please select a new assignee for temporary reallocation.");
    }

    if (taskUpdate?.assigned_to === newAssignedTo?.email) {
      throw new Error("Current Assigned To and New Assigned To cannot be the same.");
    }

    if (taskUpdate?.task_type === "Recurring" && (!selectedStartDate || !selectedEndDate)) {
      throw new Error("Please select both start and end dates for temporary reallocation.");
    }

    const reallocationData = {
      task_definition_id: taskUpdate?.task_type === "Recurring" ? taskUpdate?.task_definition_id : "",
      recurring_task: taskUpdate?.task_type === "Recurring" ? 1 : 0,
      onetime_task: taskUpdate?.task_type === "Onetime" ? 1 : 0,
      instance_id: taskUpdate?.task_type === "Onetime" ? taskUpdate?.name : "",
      due_today: taskUpdate?.status === "Due Today" ? 1 : 0,
      upcoming: taskUpdate?.status === "Upcoming" ? 1 : 0,
      overdue: taskUpdate?.status === "Overdue" ? 1 : 0,
      new_assigned_to: newAssignedTo.email,
      reallocation_type: taskUpdate?.task_type === "Onetime" ? "Permanent" : "Temporary",
      temporary_from: taskUpdate?.task_type === "Recurring" && selectedStartDate
        ? format(selectedStartDate, "yyyy-MM-dd")
        : "",
      reallocation_status: "Approved",
      temporary_until: taskUpdate?.task_type === "Recurring" && selectedEndDate
        ? format(selectedEndDate, "yyyy-MM-dd")
        : "",
      company_id: userDetails?.[0]?.company_id,
    };

    await createDoc("CG Task Reallocation", reallocationData);
  };

  const handleStatusUpdate = async (newStatus: string) => {
    setIsLoading(true);
    try {
      const updatedTask = { ...taskUpdate, status: newStatus };
      const {updatedTaskResponse,mutate} = await updateDoc(
        "CG Task Instance",
        taskUpdate?.name,
        updatedTask,
      );

      if (updatedTaskResponse) {
        setTaskUpdate((prevState) => ({ ...prevState, status: newStatus }));
        mutateTask();

        if (newStatus === "Due Today" && taskUpdate?.status === "Paused") {
          toast.success("Task resumed successfully");
        } else {
          toast.success(`Task status updated to ${newStatus}`);
        }
      }
    } catch (error: any) {
      const serverMessages = error._server_messages
        ? JSON.parse(error._server_messages)
        : null;
      const msgObj = serverMessages ? JSON.parse(serverMessages[0]) : null;
      const errorMessage = msgObj?.message
        ? msgObj.message.replace(/<[^>]*>/g, "")
        : `An error occurred while updating task status to ${newStatus}`;
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSelect = async (value: string) => {
    if (!taskUpdate?.name) {
      toast.error("Task name is required to update the field.");
      return;
    }

    if (!value) {
      toast.error("Please select a user.");
      return;
    }

    setIsLoading(true);
    try {
      await updateDoc("CG Task Instance", taskUpdate.name, {
        next_task_assigned_to: value,
      });
      toast.success("Next Task Assigned To updated successfully.");
      await mutateTask();
      setTaskUpdate((prevState) => ({
        ...prevState,
        next_task_assigned_to: value,
      }));
    } catch (err: any) {
      toast.error(`Error updating Next Task Assigned To: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const hasRecurrenceChanged = () => {
    // Add logic to check if recurrence has changed
    // This would need access to previous recurrence data
    return false; // Simplified for now
  };

  const handleSubmit = async (e: React.FormEvent, action: string) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate next_task_assigned_to if select_next_task_doer === 1
      if (action === "Completed" && taskUpdate?.select_next_task_doer === 1 && !taskUpdate?.next_task_assigned_to) {
        toast.error("Please select a user for 'Next Task Assigned To' before marking the task as complete.");
        return;
      }

      const isUploadRequired = taskUpdate?.upload_required === 1 && existingSubmitFiles.length === 0;
      if (action === "Completed" && isUploadRequired) {
        toast.error("File upload is required to mark this task as complete.");
        return;
      }

      const isCompleted = action === "Completed" ? 1 : taskUpdate?.is_completed ? 1 : 0;

      const formattedAttachFiles = JSON.stringify(
        existingAttachedFiles?.map((file: { file_url: string }) => ({
          file_url: file.file_url,
        })) || [],
      );

      const formattedSubmitFiles = JSON.stringify(
        existingSubmitFiles?.map((file: { file_url: string }) => ({
          file_url: file.file_url,
        })) || [],
      );

      const updatedTask: any = {
        ...taskUpdate,
        tag: taskUpdate?.tag?.tag_name || null,
        branch: taskUpdate?.branch || null,
        department: taskUpdate?.department || null,
        checker: taskUpdate?.checker || null,
        is_completed: isCompleted,
        attach_file: formattedAttachFiles,
        submit_file: formattedSubmitFiles,
        due_date: selectedDueDate
          ? format(selectedDueDate, "yyyy-MM-dd HH:mm:ss")
          : taskUpdate?.due_date,
        holiday_behaviour: taskUpdate?.task_type === "Recurring"
          ? dueWorkingDay || "Ignore Holiday"
          : null,
      };

      // Handle paused task completion with due date adjustment
      if (action === "Completed" && taskUpdate?.status === "Paused") {
        updatedTask.status = "Completed";
        updatedTask.auto_adjust_due_date = true;
      }

      // Submit pending comment if it exists
      if (pendingComment.trim()) {
        await submitComment();
      }
      

       // Handle FormMeta submission for Process tasks
      let formDocName: string | undefined;
     if (
        taskUpdate?.task_type === "Process" &&
        action === "Completed" &&
        taskUpdate?.attached_form &&
        formMetaState.submitForm
      ) {
        try {
          // Trigger form submission
          triggerFormSubmit();
          
          // Wait for result (you might want to implement a Promise-based approach)
          // For now, we'll check if form is valid before proceeding
          if (!formMetaState.isValid) {
            toast.error("Please fill all required fields in the Step Form.");
            setIsLoading(false);
            return;
          }
          

           // Submit the form and get the response
        const formResponse = await formMetaState.submitForm();
        formDocName = formResponse?.name;
        
        if (!formDocName) {
          throw new Error("Form submission did not return a document name.");
        }
        
        console.log("Step form created successfully with name:", formDocName);

         // IMPORTANT: Attach the created document name to the task
        updatedTask.attached_docname = formDocName;
          
          // If you have the submission result, use it
          // if (formSubmissionResult?.success) {
          //   formDocName = formSubmissionResult.data?.name;
          //   clearFormSubmissionResult?.();
          // } else if (formSubmissionResult?.error) {
          //   toast.error("Please fill all required fields in the Step Form.");
          //   setIsLoading(false);
          //   clearFormSubmissionResult?.();
          //   return;
          // }
        } catch (error) {
          console.error("Error submitting FormMeta:", error);
          toast.error("Please fill all required fields in the Step Form.");
          setIsLoading(false);
          return;
        }
      }



      if (formDocName) {
        updatedTask.attached_docname = formDocName;
      }


      // Handle reallocation if enabled
      if (newAssignedTo?.email) {
        if (taskUpdate?.task_type === "Onetime") {
          updatedTask.assigned_to = newAssignedTo.email;
        } else {
          await handleReallocation();
          toast.success("Temporary reallocation created successfully.");
        }
      }

      // Update the task instance
      const updatedTaskResponse = await updateDoc(
        "CG Task Instance",
        taskUpdate?.name,
        updatedTask,
      );

      if (updatedTaskResponse) {
        setTaskUpdate((prevState) => ({
          ...prevState,
          ...updatedTaskResponse,
          is_completed: isCompleted,
          due_date: selectedDueDate
            ? format(selectedDueDate, "yyyy-MM-dd")
            : prevState.due_date,
            attached_docname: formDocName || prevState.attached_docname,
        }));

        mutateTask();
        resetEditModes();
        clearFileStates();

        if (action === "Completed" && taskUpdate?.status === "Paused") {
          toast.success("Paused task completed successfully with adjusted due date");
        } else {
          const message = formDocName 
          ? "Step form submitted and task completed successfully"
          : action === "Save"
          ? "Task updated successfully"
          : "Task completed successfully";
           toast.success(message);
        }

        if (action === "Completed" && onTaskCompleted) {
          setTimeout(() => {
            onTaskCompleted();
          }, 100);
        }
      }
    } catch (error: any) {
      const serverMessages = error._server_messages
        ? JSON.parse(error._server_messages)
        : null;
      const msgObj = serverMessages ? JSON.parse(serverMessages[0]) : null;
      const errorMessage = msgObj?.message
        ? msgObj.message.replace(/<[^>]*>/g, "")
        : "An error occurred while updating the task";
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
      mutateTask();
    }
  };

  return {
    isLoading,
    handleSubmit,
    handleStatusUpdate,
    handleUserSelect,
    handleReallocation,
    checkTaskCompletion,
  };
};
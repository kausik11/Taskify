import React, { useState } from "react";
import { Ban, CircleCheck } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ReopenReasonPopup from "../ReopenReasonPopups";
import { useFrappeUpdateDoc } from "frappe-react-sdk";

interface TaskActionsProps {
  taskupdate: any;
  isTaskEditable: (fieldName?: string) => boolean;
  handleSubmit: (e: React.FormEvent, action: string) => void;
  isDisabled: boolean;
  tooltipMessage: string;
  flag: boolean;
  rolePermissions: any;
  currentUser: string;
  isPopupOpen: boolean;
  setIsPopupOpen: (open: boolean) => void;
  reopenButtonRef: React.RefObject<HTMLButtonElement>;
  userDetails: any[];
  setReopenReason: any;
  setTaskUpdate: any;
  setcommentboxreload: any;
  handleReopen: () => void;
  isProcessTask?: boolean;
  formMetaRef: React.RefObject<any>; // Add formMetaRef to props
}

const TaskActions: React.FC<TaskActionsProps> = ({
  taskupdate,
  isTaskEditable,
  handleSubmit,
  isDisabled,
  tooltipMessage,
  flag,
  rolePermissions,
  currentUser,
  isPopupOpen,
  setIsPopupOpen,
  reopenButtonRef,
  userDetails,
  setReopenReason,
  setTaskUpdate,
  setcommentboxreload,
  handleReopen,
  isProcessTask = false,
  // formMetaRef, // Destructure formMetaRef
}) => {

  // const [isProcessing, setIsProcessing] = useState(false); // Add isProcessing state here
  // const {updateDoc,
  // loading: isUpdating,
  // error: updateError,} = useFrappeUpdateDoc();

  const canReopen = 
    (taskupdate?.is_completed &&
      rolePermissions?.name === "ROLE-Admin") ||
    (taskupdate?.is_completed &&
      currentUser === taskupdate?.assignee);

  const getCompleteButtonText = () => {
    if (taskupdate?.is_completed) return "Completed";
    if (taskupdate?.status === "Paused") return "Complete & Adjust Date";
    return "Mark Complete";
  };

  const getCompleteButtonStyle = () => {
    if (isDisabled || !isTaskEditable()) {
      return "bg-[#e4edf3] text-[#4d4a4a] cursor-not-allowed";
    }
    if (taskupdate?.is_completed) {
      return "bg-green-100 text-green-700";
    }
    if (taskupdate?.status === "Paused") {
      return "bg-[#FFF3CD] text-[#856404] border border-[#FFEAA7] hover:bg-[#FFF8DC]";
    }
    return "bg-[#0385FF] text-white";
  };

  // const handleCompleteClick =async (e: React.FormEvent) => {
  //   // console.log("Mark Complete clicked, isDisabled:", isDisabled, "flag:", flag, "isTaskEditable:", isTaskEditable());
  //   if (!isDisabled && flag && isTaskEditable()) {
  //     // Check if the form exists and is valid
  //     if (formMetaRef.current && taskupdate?.task_type === "Process" && taskupdate?.attached_form) {
  //       // console.log("Validating form...");
  //       // console.log("formMetaRef.current",formMetaRef)

        
  //       const isFormValid = await formMetaRef.current.isValid();
  //       // console.log("Form is valid:", isFormValid);
  //       if (!isFormValid) {
  //         // Trigger form validation to show errors
  //         // await formMetaRef.current.submitForm().catch(() => {
  //         //   toast.error("Please fill all mandatory fields in the form before marking the task as complete.");
  //         // });
  //         toast.error("Please fill all mandatory fields in the Step form.");
  //         return;
  //       }
  //       // Submit form immediately if valid
  //     try {
  //       await formMetaRef.current.submitForm();
  //     } catch (error) {
  //       console.error("Form submission error:", error);
  //       toast.error("Form submission failed. Please try again.");
  //       return;
  //     }
        
  //     }
  //     // console.log("Calling handleSubmit...");
  //     handleSubmit(e, "Completed");
  //   } else {
  //     // console.log("Button disabled or unauthorized");
  //     let errorMessage = "";
  //     if (!isTaskEditable()) {
  //       errorMessage = taskupdate?.status === "Rejected"
  //         ? "Rejected tasks cannot be completed"
  //         : "Task is not editable";
  //     } else if (!flag) {
  //       errorMessage = "You are not authorized to mark task as completed";
  //     }
  //     if (errorMessage) {
  //       toast.warning(errorMessage);
  //     }
  //   }
  // };

  //2nd time
//   const handleCompleteClick = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (isProcessing) return;
//     setIsProcessing(true);
    
//   //  console.log("Mark Complete clicked, isDisabled:", isDisabled, "flag:", flag, "isTaskEditable:", isTaskEditable());

 
//   if (!isDisabled && flag && isTaskEditable()) {
//     // Check if the form exists and is valid
//     if (formMetaRef.current && taskupdate?.task_type === "Process" && taskupdate?.attached_form) {
//       // console.log("Validating form...");
//       // console.log("formMetaRef.current", formMetaRef.current);

//       try {
//         // Force a re-render or wait for form state to update
//           await new Promise((resolve) => setTimeout(resolve, 10));


//         const isFormValid = await formMetaRef.current.isValid();
//         // console.log("Form is valid:", isFormValid);
//         // console.log("Form values:", await formMetaRef.current.getValues?.()); // Debug form values

//         if (!isFormValid) {
//           // Trigger form submission to display errors and capture the result
//           await formMetaRef.current.submitForm().catch((error) => {
//             // console.error("Validation errors:", error);
//             toast.error("Please fill all mandatory fields in the Step form.");
//           });
//           setIsProcessing(false);
//           return;
//         }

//         // If valid, submit the form
//        const submissionResult = await formMetaRef.current.submitForm();
//       //  console.log("Form submission result:", submissionResult);
//       } catch (error) {
//         // console.error("Form submission error:", error);
//         // toast.error("Form submission failed. Please try again.");
//         setIsProcessing(false);
//         return;
//       }
//     }

//     // Proceed with task completion
//     console.log("Calling handleSubmit...");
//     handleSubmit(e, "Completed");
//   } else {
//     let errorMessage = "";
//     if (!isTaskEditable()) {
//       errorMessage = taskupdate?.status === "Rejected"
//         ? "Rejected tasks cannot be completed"
//         : "Task is not editable";
//     } else if (!flag) {
//       errorMessage = "You are not authorized to mark task as completed";
//     }
//     if (errorMessage) {
//       toast.warning(errorMessage);
//     }
//   }
//   setIsProcessing(false); // Reset after all logic completes
// };

const handleCompleteClick = async (e: React.FormEvent) => {
    e.preventDefault();
    // if (isProcessing) return;

    // setIsProcessing(true);

    try {
      if (!isDisabled && flag && isTaskEditable()) {

       let formDocName: string | undefined;

        // Check if the form exists for process tasks
        // if (  
        //   formMetaRef.current &&
        //   taskupdate?.task_type === "Process" &&
        //   taskupdate?.attached_form
        // ) {
        //   // Validate the form
        //   const isFormValid = await formMetaRef.current.isValid();
          
        //   if (!isFormValid) {
        //     // Trigger form submission to show validation errors
        //     await formMetaRef.current.submitForm().catch(() => {
        //       toast.error("Please fill all mandatory fields in the Step form.");
        //     });
        //     return;
        //   }

        //   // If valid, submit the form
        //   // await formMetaRef.current.submitForm();
        //   // Submit the form and wait for completion
        //   const submissionResult = await formMetaRef.current.submitForm();
          
        //   console.log("Form submission result:", submissionResult);
        //   if (!submissionResult) {
        //     toast.error("Form submission failed. Please try again.");
        //     return;
        //   }
        //   // Ensure the task document is updated with the new form document name
        //   formDocName = submissionResult.name;
       
        // }
        

        // Proceed with task completion
        await handleSubmit(e, "Completed");
      } else {
        let errorMessage = "";
        if (!isTaskEditable()) {
          errorMessage = taskupdate?.status === "Rejected"
            ? "Rejected tasks cannot be completed"
            : "Task is not editable";
        } else if (!flag) {
          errorMessage = "You are not authorized to mark task as completed";
        }
        if (errorMessage) {
          toast.warning(errorMessage);
        }
      }
    } catch (error) {
      console.error("Error in handleCompleteClick:", error);
      // toast.error("An error occurred while completing the task. Please try again.");
    } finally {
      // setIsProcessing(false);
    }
  };
  return (
    <div className={`flex items-center ${isProcessTask ? 'justify-end' : 'justify-between'} border-[#E5E7EB] py-6 px-2 mt-4`}>
      {/* Status indicators for non-Process tasks only */}
      {!isProcessTask && (
        <div className="flex items-center gap-x-4">
          {taskupdate?.status === "Rejected" && (
            <div className="flex items-center gap-2 bg-[#F8D7DA] text-[#721C24] px-3 py-2 rounded-md text-[14px] font-[500] border border-[#F5C6CB]">
              Task Rejected
            </div>
          )}
          {taskupdate?.status === "Paused" && (
            <div className="flex items-center gap-2 bg-[#FFF3CD] text-[#856404] px-3 py-2 rounded-md text-[14px] font-[500] border border-[#FFEAA7]">
              Task Paused (Can Complete Directly)
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-x-3">
        {canReopen ? (
          <div className="flex items-center gap-x-3">
            <button
              ref={reopenButtonRef}
              onClick={() => setIsPopupOpen(true)}
              className="bg-[#EFF9FF] text-[#038EE2] px-[12px] py-2 w-[140px] rounded-md text-[14px] font-[600] hover:bg-[#E1F5FE] transition-colors"
            >
              Reopen
            </button>
            <ReopenReasonPopup
              isOpen={isPopupOpen}
              onClose={handleReopen}
              buttonRef={reopenButtonRef}
              UserImage={userDetails?.[0]?.user_image || ""}
              firstName={userDetails?.[0]?.first_name || ""}
              lastName={userDetails?.[0]?.last_name || ""}
              setReopenReason={setReopenReason}
              taskid={taskupdate?.name}
              setTaskUpdate={setTaskUpdate}
              setcommentboxreload={setcommentboxreload}
            />
          </div>
        ) : (
          <button
            className={`bg-[#EFF9FF] text-[#0385FF] px-[12px] py-2 w-[100px] rounded-md font-[600] text-[14px] hover:bg-[#E1F5FE] transition-colors ${
              !isTaskEditable()
                ? "bg-[#e4edf3] text-[#4d4a4a] cursor-not-allowed hover:bg-[#e4edf3]"
                : ""
            }`}
            onClick={(e) => handleSubmit(e, "Save")}
            type="button"
            disabled={!isTaskEditable()}
          >
            Save
          </button>
        )}

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={`flex items-center px-[14px] py-2 w-fit rounded-md font-[600] text-[14px] gap-x-2 transition-colors ${getCompleteButtonStyle()}`}
                onClick={handleCompleteClick}
                disabled={isDisabled || !isTaskEditable()}
              >
                {isDisabled || !isTaskEditable()? (
                  <Ban size={16} className="text-red-500 mr-2" />
                ) : (
                  <CircleCheck size={18} className="mr-2" />
                )}
                {getCompleteButtonText()}
              </button>
            </TooltipTrigger>
            {(tooltipMessage || !flag || !isTaskEditable()) && (
              <TooltipContent>
                <p className="text-[12px]">
                  {!isTaskEditable()
                    ? taskupdate?.status === "Rejected"
                      ? "Rejected tasks cannot be completed"
                      : "Task is not editable"
                    : !flag
                    ? "You are not authorized to mark task as completed"
                    : taskupdate?.status === "Paused"
                    ? "Complete paused task (due date will be automatically adjusted)"
                    : tooltipMessage}
                </p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default TaskActions;
import { useEffect, useState } from "react";
import { useFrappeUpdateDoc } from "frappe-react-sdk";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetTrigger } from "../ui/sheet";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";
import { CGDepartment } from "@/types/ClapgrowApp/CGDepartment";
import { showErrorToast } from "../common/CommonFunction";
import { useForm } from "react-hook-form";

interface EditDepartmentSheetProps {
  isSheetOpen: boolean;
  setIsSheetOpen: (open: boolean) => void;
  selectedDept: CGDepartment | null;
  onDepartmentUpdated: () => void;
}

interface FormData {
  department_name: string;
}

const EditDepartmentSheet = ({ isSheetOpen, setIsSheetOpen, selectedDept, onDepartmentUpdated }: EditDepartmentSheetProps) => {
   const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    defaultValues: {
      department_name: selectedDept?.department_name || "",
    },
  });
  const [departmentName, setDepartmentName] = useState(selectedDept?.department_name || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updateDoc, loading } = useFrappeUpdateDoc();

  // Update department name state when selectedDept changes
  // useState(() => {
  //   setDepartmentName(selectedDept?.department_name || "");
  // }, [selectedDept]);
  useEffect(() => {
    reset({ department_name: selectedDept?.department_name || "" });
  }, [selectedDept, reset]);

   const onSubmit = async (data: FormData) => {
    if (!selectedDept?.name) {
      toast.error("No department selected for editing");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateDoc("CG Department", selectedDept.name, {
        department_name: data.department_name.trim(),
      });
      toast.success("Department updated successfully");
      onDepartmentUpdated();
      setIsSheetOpen(false);
    } catch (err: any) {
      let serverMessage = "";
      try {
        if (err._server_messages) {
          serverMessage = JSON.parse(err._server_messages)[0] || "";
        }
      } catch (e) {
        serverMessage = err.message || "An unexpected error occurred while updating the department.";
      }
      showErrorToast(serverMessage || "Failed to update department.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // return (
  //   <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
  //     <SheetContent className="w-[95vw] md:min-w-[700px]">
  //       <SheetHeader>
  //         <SheetTitle>Edit Department</SheetTitle>
  //         <SheetDescription>Update the department name below.</SheetDescription>
  //       </SheetHeader>
  //       <form onSubmit={handleSubmit} className="space-y-4 mt-4">
  //         <div className="space-y-2">
  //           <Label htmlFor="departmentName">Department Name</Label>
  //           <Input
  //             id="departmentName"
  //             value={departmentName}
  //             onChange={(e) => setDepartmentName(e.target.value)}
  //             placeholder="Enter department name"
  //             disabled={isSubmitting || loading}
  //           />
  //         </div>
  //         <SheetFooter>
  //           <Button
  //             type="button"
  //             variant="outline"
  //             onClick={() => setIsSheetOpen(false)}
  //             disabled={isSubmitting || loading}
  //           >
  //             Cancel
  //           </Button>
  //           <Button type="submit" disabled={isSubmitting || loading}>
  //             {isSubmitting || loading ? "Updating..." : "Update Department"}
  //           </Button>
  //         </SheetFooter>
  //       </form>
  //     </SheetContent>
  //   </Sheet>
  // );
    return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      {!selectedDept && (
        <SheetTrigger asChild>
          <button
            className="bg-[#038EE2] py-2 px-4 rounded-[8px] hover:bg-[#0265a1] font-[600] text-white text-[14px] w-fit"
            onClick={() => setIsSheetOpen(true)}
          >
            Add Department +
          </button>
        </SheetTrigger>
      )}
      <SheetContent className="w-[95vw] md:min-w-[700px]">
        <SheetHeader>
          <SheetTitle>
            {selectedDept ? "Edit Department" : "Add Department"}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-2 py-8">
          <div className="space-y-2">
            <form
              className="grid grid-cols-5 items-center"
              onSubmit={handleSubmit(onSubmit)}
            >
              <p className="text-[14px] font-[500]">
                Department<span className="text-[#D72727]">*</span>
              </p>
              <div className="relative col-span-3">
                <Input
                  id="department_name"
                  {...register("department_name", {
                    required: "Department name is required",
                  })}
                  aria-label="Department Name"
                  className={`pr-8 w-full border ${
                    errors.department_name
                      ? "border-red-500"
                      : "border-gray-300"
                  } rounded-md px-3 py-2 focus:outline-none`}
                  disabled={isSubmitting || loading}
                />
                {errors.department_name && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.department_name.message}
                  </p>
                )}
              </div>
              <div className="border-t-[2px] h-[50px] border-[#F0F1F2] flex items-center absolute left-0 right-0 bottom-0 w-full px-[30px]">
                <button
                  className="bg-[#038EE2] px-6 py-1.5 w-fit rounded-[8px] text-white font-[600] text-[14px] ml-auto"
                  type="submit"
                  disabled={isSubmitting || loading}
                >
                  {isSubmitting || loading ? "Updating..." : selectedDept ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EditDepartmentSheet;
import { useFrappeUpdateDoc } from "frappe-react-sdk";
import { useState, useEffect } from "react";
import { CGBranch } from "@/types/ClapgrowApp/CGBranch";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { toast } from "sonner";
import { showErrorToast } from "../common/CommonFunction";
import { format, parse } from "date-fns";

// Assuming Divider is a custom component
const Divider = () => <hr className="border-t border-[#F0F1F2] my-4" />;

// Sample time options (same as original component)
const timeOptions = [
  "12:00 AM", "01:00 AM", "02:00 AM", "03:00 AM", "04:00 AM", "05:00 AM",
  "06:00 AM", "07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM",
  "06:00 PM", "07:00 PM", "08:00 PM", "09:00 PM", "10:00 PM", "11:00 PM",
];

// Assuming timeIcon is an imported asset
import timeIcon from "@/assets/icons/timeIcon.svg";

interface EditBranchSheetProps {
  selectedBranch: CGBranch | null;
  isSheetOpen: boolean;
  setIsSheetOpen: (open: boolean) => void;
  onBranchUpdated: () => void;
}

// Parse timeline (e.g., "12:00 AM - 08:00 AM IST") to extract start_time and end_time
const parseTimeline = (timeline: string | undefined): { start_time: string; end_time: string } => {
  if (!timeline) {
    return { start_time: "12:00 AM", end_time: "12:00 AM" };
  }
  try {
    const cleanTimeline = timeline.replace(" IST", "").trim();
    const [start, end] = cleanTimeline.split(" - ").map((time) => time.trim());
    return { start_time: start, end_time: end };
  } catch (e) {
    console.error(`Error parsing timeline: ${timeline}`, e);
    return { start_time: "12:00 AM", end_time: "12:00 AM" };
  }
};

// Convert HH:mm:ss or HH:mm to 12-hour format for display
const formatTimeForInput = (time: string | undefined): string => {
  if (!time) return "12:00 AM";
  try {
    const parsedTime = parse(time, time.includes(":") && time.split(":").length === 3 ? "HH:mm:ss" : "HH:mm", new Date());
    return format(parsedTime, "h:mm a");
  } catch (e) {
    console.error(`Error formatting time for input: ${time}`, e);
    return "12:00 AM";
  }
};

// Convert 12-hour format to HH:mm:ss for Frappe backend
const convertTo24HourFormat = (time: string): string => {
  if (!time) return "00:00:00";
  try {
    const parsedTime = parse(time, "h:mm a", new Date());
    return format(parsedTime, "HH:mm:ss");
  } catch (e) {
    console.error(`Error converting to 24-hour format: ${time}`, e);
    throw new Error(`Invalid time format: ${time}`);
  }
};

const EditBranchSheet = ({ selectedBranch, isSheetOpen, setIsSheetOpen, onBranchUpdated }: EditBranchSheetProps) => {
  const { updateDoc, loading, error } = useFrappeUpdateDoc();

  const [formData, setFormData] = useState({
    branch_name: "",
    start_time: "12:00 AM",
    end_time: "12:00 AM",
  });

  // Populate form with selected branch data
  useEffect(() => {
    if (selectedBranch) {
      const { start_time, end_time } = selectedBranch.start_time && selectedBranch.end_time
        ? { start_time: formatTimeForInput(selectedBranch.start_time), end_time: formatTimeForInput(selectedBranch.end_time) }
        : parseTimeline(selectedBranch.timeline);
      setFormData({
        branch_name: selectedBranch.branch_name || "",
        start_time: start_time || "12:00 AM",
        end_time: end_time || "12:00 AM",
      });
    }
  }, [selectedBranch]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch?.name) {
      toast.error("No branch selected for update");
      return;
    }
    if (!formData.start_time || !formData.end_time) {
      toast.error("Please provide both start and end times");
      return;
    }
    try {
      const formattedStartTime = convertTo24HourFormat(formData.start_time);
      const formattedEndTime = convertTo24HourFormat(formData.end_time);
      await updateDoc("CG Branch", selectedBranch.name, {
        branch_name: formData.branch_name,
        start_time: formattedStartTime,
        end_time: formattedEndTime,
      });
      toast.success("Branch updated successfully");
      onBranchUpdated();
      setIsSheetOpen(false);
      setFormData({
        branch_name: "",
        start_time: "12:00 AM",
        end_time: "12:00 AM",
      });
    } catch (err: any) {
      let serverMessage = "";
      try {
        if (err._server_messages) {
          serverMessage = JSON.parse(err._server_messages)?.[0] || "";
        }
        showErrorToast(
          serverMessage ||
          err.message ||
          "An unexpected error occurred while updating the branch."
        );
      } catch (e) {
        showErrorToast(
          err.message ||
          "An unexpected error occurred while updating the branch."
        );
      }
    }
  };

  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <SheetContent className="w-[95vw] md:min-w-[700px]">
        <SheetHeader>
          <SheetTitle className="text-xl font-[600] text-gray-900">Edit Branch</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="pt-2 space-y-3 max-h-[85vh] overflow-y-scroll mt-4">
          <div className="space-y-2 pb-60">
            <div className="grid grid-cols-5 items-center">
              <p className="text-sm font-[500]">
                Branch <span className="text-[#D72727]">*</span>
              </p>
              <div className="col-span-2">
                <Input
                  id="branch_name"
                  name="branch_name"
                  value={formData.branch_name}
                  onChange={handleInputChange}
                  placeholder="Enter branch name"
                  className={`w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none`}
                  required
                />
              </div>
            </div>
            <Divider />
            <div className="grid grid-cols-5 items-center">
              <p className="text-sm font-[500]">
                Working Hours <span className="text-[#D72727]">*</span>
              </p>
              <div className="col-span-2 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-[12px] font-[600]">
                  <Select
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, start_time: value }))}
                    value={formData.start_time}
                  >
                    <SelectTrigger
                      className="w-[120px] border-none shadow-none font-[400] focus:outline-none focus:ring-0 text-[#0076BD]"
                    >
                      <div className="flex justify-start gap-x-2">
                        <img src={timeIcon} alt="Time" />
                        <SelectValue placeholder="Start Time" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {timeOptions.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <span>-</span>
                  <Select
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, end_time: value }))}
                    value={formData.end_time}
                  >
                    <SelectTrigger
                      className="w-[120px] border-none shadow-none font-[400] focus:outline-none focus:ring-0 text-[#0076BD]"
                    >
                      <div className="flex justify-start gap-x-2">
                        <img src={timeIcon} alt="Time" />
                        <SelectValue placeholder="End Time" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {timeOptions.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <Divider />
          </div>
          <div className="border-t-[2px] h-[50px] border-[#F0F1F2] flex items-center absolute left-0 right-0 bottom-0 w-full px-[30px]">
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#038EE2] px-6 py-1.5 w-fit rounded-[8px] text-white font-[600] text-[14px] ml-auto hover:bg-[#0265a1]"
            >
              {loading ? "Updating..." : "Update"}
            </Button>
          </div>
        </form>
        {error && (
          <p className="mt-4 text-sm text-red-500">
            Error: {error.message || "Failed to update branch"}
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default EditBranchSheet;
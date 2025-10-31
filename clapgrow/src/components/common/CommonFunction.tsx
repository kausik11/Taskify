import { format, parse } from "date-fns";
import { useContext } from "react";
import { Skeleton } from "../ui/skeleton";
import { Column } from "./CommonTypes";
import { toast } from "sonner";
import { useFrappeGetDocList } from "frappe-react-sdk";
import { CGUser } from "@/types/ClapgrowApp/CGUser";
import { CGTaskInstance } from "@/types/ClapgrowApp/CGTaskInstance";
import { UserContext } from "@/utils/auth/UserProvider";

interface SortConfig<T> {
  key: keyof T;
  direction: "asc" | "desc";
}

export function getInitials(firstName?: string, lastName?: string) {
  return (firstName?.charAt(0) || "") + (lastName?.charAt(0) || "");
}

export function DateFormat(dueDate?: Date | string) {
  if (!dueDate) {
    throw new Error("No date provided");
  }
  const parsedDate = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  if (isNaN(parsedDate.getTime())) {
    throw new Error("Invalid date");
  }
  return format(parsedDate, "yyyy-MM-dd HH:mm:ss");
}

export const convertTo12HourFormat = (timeString: string) => {
  if (!timeString) return "";
  const parsedTime = parse(timeString, "H:mm:ss", new Date());
  return format(parsedTime, "h:mm a"); // Converts to "3:00 AM"
};
export const convertTo24HourFormat = (time: string): string => {
  if (!time) return "00:00:00";
  try {
    const parsedTime = parse(time, "HH:mm", new Date());
    return format(parsedTime, "HH:mm:ss");
  } catch (e) {
    console.error(`Error converting to 24-hour format: ${time}`, e);
    throw new Error(`Invalid time format: ${time}`);
  }
};

export const getReminderSentence = (
  taskData: CGTaskInstance | undefined,
): React.ReactNode => {
  if (!taskData || taskData.reminder_enabled !== 1 || !taskData.due_date) {
    return "";
  }

  const dueDate = new Date(taskData.due_date);
  if (isNaN(dueDate.getTime())) return "";

  // Determine unit and before value
  const unit =
    (taskData.reminder_unit as "Days" | "Hours" | undefined) || "Days";
  const beforeValue = taskData.reminder_interval || 1;

  const totalTimes =
    (taskData as any).reminder_total_times ??
    (taskData as any).reminder_times ??
    1;

  const formatTime = (date: Date): string => {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  const unitLabel = unit === "Hours" ? "hour" : "day";
  const timesLabel = Number(totalTimes) === 1 ? "time" : "times";

  // For Hours-based reminders, show simple message
  if (unit === "Hours") {
    return (
      <div className="mt-2 text-[12px] text-[#5B5967]">
        <span>Send reminder </span>
        <span className="font-semibold">
          {beforeValue} {unitLabel}
          {beforeValue !== 1 ? "s" : ""}
        </span>
        <span> before due date</span>
      </div>
    );
  }

  // For Days-based reminders, show the starting time
  if (taskData.starting_on) {
    const startingOn = new Date(taskData.starting_on);
    if (!isNaN(startingOn.getTime())) {
      const reminderTime = formatTime(startingOn);

      return (
        <div className="mt-2 text-[12px] text-[#5B5967]">
          <span>Send reminder before </span>
          <span className="font-semibold">
            {beforeValue} {unitLabel}
            {beforeValue !== 1 ? "s" : ""}
          </span>
          <span> starting at </span>
          <span className="font-semibold">{reminderTime}</span>
          <span>, remind </span>
          <span className="font-semibold">{totalTimes}</span>
          <span> {timesLabel}</span>
        </div>
      );
    }
  }

  // Fallback for other cases
  return (
    <div className="mt-2 text-[12px] text-[#5B5967]">
      <span>Send reminder before </span>
      <span className="font-semibold">
        {beforeValue} {unitLabel}
        {beforeValue !== 1 ? "s" : ""}
      </span>
      <span>, remind </span>
      <span className="font-semibold">{totalTimes}</span>
      <span> {timesLabel}</span>
    </div>
  );
};

interface SkeletonLoaderProps<T> {
  columns: Column<T>[];
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps<any>> = ({
  columns,
}) =>
  Array.from({ length: 10 }).map((_, index) => (
    <div
      key={`skeleton-row-${index}`}
      className="max-md:min-w-[1200px] md:w-full grid grid-cols-12 w-full bg-[#FFFFFF] px-[22px] py-[12px] border-b border-[#F0F1F2]"
    >
      {columns.map((column, colIndex) => (
        <Skeleton
          key={`skeleton-cell-${index}-${colIndex}`}
          className={`h-4 ${
            column.width ? `col-span-${column.width}` : "col-span-1"
          }`}
        />
      ))}
    </div>
  ));

export function isCustomError(error: unknown): error is {
  response: { data: { message: [{ errors: { details: string } }] } };
} {
  return (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    "data" in (error as any).response
  );
}

export function showErrorToast(serverMessages: string) {
  try {
    // Parse the `_server_messages` JSON string
    const parsedData = JSON.parse(serverMessages);

    let messages: string[] = [];

    // Check if parsedData is an array or a single object
    if (Array.isArray(parsedData)) {
      // If it's an array, map through it
      messages = parsedData.map((msg: string | { message: string }) => {
        // Handle case where msg is an object with a 'message' property
        const messageText = typeof msg === "string" ? msg : msg.message || "";

        // Remove HTML tags
        return messageText.replace(/<[^>]+>/g, "");
      });
    } else if (
      parsedData &&
      typeof parsedData === "object" &&
      parsedData.message
    ) {
      // If it's a single object with a 'message' property
      messages = [parsedData.message.replace(/<[^>]+>/g, "")];
    } else {
      // Fallback for unexpected format
      throw new Error("Invalid server messages format");
    }

    const cleanedMessages = messages.join(" ").trim();

    // Show the cleaned message in a toast
    toast.error(cleanedMessages || "An error occurred.");
  } catch (error) {
    console.error("Error parsing server messages:", error);
    toast.error("An unexpected error occurred.");
  }
}

export const useUserDetailsByEmails = (email: string, companyId?: string) => {
  const { userDetails } = useContext(UserContext);
  return useFrappeGetDocList<CGUser>("CG User", {
    fields: [
      "name",
      "full_name",
      "first_name",
      "last_name",
      "email",
      "user_image",
      "role",
      "designation",
      "phone",
      "designation",
      "branch_id",
      "department_id",
      "company_id",
      "role",
      "report_to",
      "cost_per_hour",
      "ctc",
    ],
    filters: {
      email: email,
      company_id: companyId || userDetails?.[0]?.company_id, // ✅ Pass company_id correctly
      enabled: 1,
    },
    limit: 1,
  });
};

export const useUserDetailsByEmailsArray = (
  emails: string[],
  companyId?: string,
) => {
  const { userDetails } = useContext(UserContext);
  return useFrappeGetDocList<CGUser>("CG User", {
    fields: [
      "name",
      "full_name",
      "first_name",
      "last_name",
      "email",
      "user_image",
      "role",
      "designation",
    ],
    filters: {
      email: ["in", emails],
      company_id: companyId || userDetails?.[0]?.company_id, // ✅ Pass company_id correctly
    },
  });
};

export const CommentSkeletonLoader = () =>
  Array.from({ length: 5 }).map((_, index) => (
    <div className="flex pt-2 items-start space-x-4" key={index}>
      {/* Avatar Skeleton */}
      <div className="flex-shrink-0">
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>

      {/* Comment Content Skeleton */}
      <div className="flex-1 space-y-2">
        <div className="flex gap-x-2 items-center">
          <Skeleton className="h-3 w-16 rounded" />
          <Skeleton className="h-3 w-12 rounded" />
        </div>
        <Skeleton className="h-4 w-full rounded" />
      </div>
    </div>
  ));

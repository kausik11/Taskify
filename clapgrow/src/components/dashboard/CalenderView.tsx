import React, { useRef, useState } from "react";

import { Sheet } from "../ui/sheet";
import { CGTaskDefinition } from "@/types/ClapgrowApp/CGTaskDefinition";

interface CalendarViewProps {
  year: number;
  month: number;
  tasksData: any;
  TaskDetailsFunc: (name: string) => void;
  setMutation: React.Dispatch<React.SetStateAction<boolean>>;
  mutation: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  year,
  month,
  tasksData,
  TaskDetailsFunc,
  isOpen,
  setIsOpen,
  setMutation,
  mutation,
}) => {
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [temporaryReallocation, setTemporaryReallocation] = useState(false);
  const [tempAssigned, setTempAssigned] = useState<any>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [dueWorkingDay, setDueWorkingDay] = useState<string>("");
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<
    { name: string; size: number; type: string }[]
  >([]);
  const [taskDetails, setTaskDetails] = useState<CGTaskDefinition | null>(null);

  // Changed: Store only the selected task name instead of full task object
  const [selectedTaskName, setSelectedTaskName] = useState<string>("");

  const reopenButtonRef = useRef<HTMLButtonElement>(null);

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const getEventsForDay = (day: number) => {
    return tasksData?.filter(
      (event: any) => new Date(event.due_date).getDate() === day,
    );
  };

  const handleFileAttach = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(event.target.files || []).map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
    }));
    setAttachedFiles((prevFiles) => [...prevFiles, ...newFiles]);
  };

  const handleFileRemove = (fileName: string) => {
    setAttachedFiles((prevFiles) =>
      prevFiles.filter((file) => file.name !== fileName),
    );
  };

  // Changed: Updated to handle task selection with new interface
  const handleEventClick = (taskName: string) => {
    setSelectedTaskName(taskName);
    setIsOpen(true);
    TaskDetailsFunc(taskName);
  };

  const renderEvents = (dayEvents: Event[]) => {
    if (dayEvents.length === 0) return null;

    const visibleEvents = dayEvents.slice(0, 2);
    const remainingEvents = dayEvents.length - 2;

    return (
      <>
        {visibleEvents.map((event: any) => (
          <div
            key={event?.id}
            className="bg-[#d6e9f5] text-[#0076BD] text-[13px] p-1 pl-3 mt-1 rounded cursor-pointer hover:bg-[#c1dff2] transition-colors"
            onClick={() => handleEventClick(event.name)}
          >
            {event.task_name}
          </div>
        ))}
        {remainingEvents > 0 && (
          <div className="text-[#4B465C] text-opacity-50 text-[13px] p-1 pl-3 mt-1 cursor-pointer">
            +{remainingEvents} more
          </div>
        )}
      </>
    );
  };

  const renderCalendarDays = () => {
    const calendarDays: JSX.Element[] = [];
    let currentDay = 1;
    let prevMonthDay = daysInPrevMonth - firstDayOfMonth + 1;
    let nextMonthDay = 1;

    for (let i = 0; i < 6; i++) {
      const week: JSX.Element[] = [];
      for (let j = 0; j < 7; j++) {
        let dayEvents: Event[] = [];
        let dayContent: number;
        let dayClass =
          "border-[1px] border-[#DBDADE] h-[130px] p-2 text-left align-top";

        if (i === 0 && j < firstDayOfMonth) {
          dayContent = prevMonthDay++;
          dayClass += " text-[#A5A2AD]";
        } else if (currentDay > daysInMonth) {
          dayContent = nextMonthDay++;
          dayClass += " text-[#A5A2AD]";
        } else {
          dayContent = currentDay;
          dayClass += " text-[#4B465C]";
          dayEvents = getEventsForDay(currentDay);
          currentDay++;
        }

        week.push(
          <td key={j} className={dayClass}>
            <div>{dayContent}</div>
            {renderEvents(dayEvents)}
          </td>,
        );
      }
      calendarDays.push(<tr key={i}>{week}</tr>);
    }
    return calendarDays;
  };

  return (
    <>
      <div className="w-full rounded-[12px] overflow-hidden pb-10 border-collapse">
        <table className="w-full border-[#DBDADE] border-[1px] table-fixed border-collapse">
          <thead>
            <tr>
              {daysOfWeek.map((day, index) => (
                <th
                  key={index}
                  className="border-[1px] border-[#DBDADE] p-1 bg-[#F5F8FB] text-center text-[15px] font-[400] text-[#2D2C37]"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">{renderCalendarDays()}</tbody>
        </table>
      </div>

      {/* Changed: Render TaskSheetContent outside the calendar with new interface */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <TaskSheetContent
          taskName={selectedTaskName}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
        />
      </Sheet>
    </>
  );
};

export default CalendarView;

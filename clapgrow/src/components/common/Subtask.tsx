import React from "react";
import { TaskUpdate } from "./CommonTypes";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { getInitials } from "./CommonFunction";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { EditToggle } from "../layout/AlertBanner/CommonDesign";

interface SubtaskProps {
  subtask: Array<{
    task_name: string;
    assigned_to: object;
    due_date: string;
  }>;
  setSubtask: React.Dispatch<
    React.SetStateAction<
      Array<{
        task_name: string;
        assigned_to: object;
        due_date: string;
      }>
    >
  >;
  helpTicketType: boolean;
  editMode: {
    task_name: boolean;
    temporaryReallocation: boolean;
    checker: boolean;
    task_type: boolean;
    due_date: boolean;
    priority: boolean;
    tags: boolean;
    description: boolean;
    subTasks: boolean;
    attach_file: boolean;
  };
  taskName: any;
  taskupdate: TaskUpdate;
  setEditMode: React.Dispatch<
    React.SetStateAction<{
      task_name: boolean;
      temporaryReallocation: boolean;
      checker: boolean;
      task_type: boolean;
      due_date: boolean;
      priority: boolean;
      tags: boolean;
      description: boolean;
      subTasks: boolean;
      attach_file: boolean;
    }>
  >;
  SubTaskMode: string;
}

const Subtask: React.FC<SubtaskProps> = ({
	subtask,
	setSubtask,
	helpTicketType,
	editMode,
	taskName,
	taskupdate,
	setEditMode,
	SubTaskMode,
}) => {
	// const handleAddSubtask = () => {
	//   setSubtask([
	//     ...subtask,
	//     {
	//       status: "",
	//       subtask_id: "",
	//       task_name: "",
	//       assigned_to: {},
	//       due_date: "",
	//     },
	//   ]);
	// };

	const handleRemoveSubtask = (index: number) => {
		const newSubtasks = subtask.filter((_, ind) => ind !== index);
		setSubtask(newSubtasks);
	};

	const handleInputChange = (index: number, field: string, value: any) => {
		const newSubtasks = [...subtask];
		(newSubtasks[index] as any)[field] = value;
		setSubtask(newSubtasks);
	};

	return (
		<>
			{subtask.length > 0 ? (
				<div
					className={`py-3 flex flex-col md:flex-row md:items-center max-md:gap-y-3 justify-between w-full space-x-4 ${
						editMode?.subTasks && "rounded-[8px] bg-[#F1F5FA]"
					}`}
				>
					<div className="flex justify-start space-x-4 ">
						<p className="w-[160px] text-[14px] font-[600] text-[#5B5967]">
							{`${
								taskName?.parent_task_id == null ||
                taskupdate?.subtasks?.length > 0
									? "Subtask"
									: taskName?.parent_task_id ||
                      taskupdate?.subtasks?.length == 0
										? "Parenttask"
										: ""
							}`}
						</p>
						<div className="flex flex-col gap-y-4">
							{taskName?.parent_task_id == null ? (
								subtask.length > 0 || taskupdate?.subtasks?.length > 0 ? (
									taskupdate.subtasks.map((task: any, ind: number) => (
										<div key={`task-${ind}`} className="flex flex-col gap-y-1">
											{/* Status and Message */}
											<div className="flex items-center justify-between gap-x-4">
												<p
													className={`rounded-[8px] px-[10px] py-[5px] font-[400] text-[12px] w-fit ${
														task.status === "Completed"
															? "text-[#0CA866] bg-[#EEFDF1]"
															: task.status === "Upcoming"
																? "bg-[#FFF4E5] text-[#FFA500]"
																: "bg-[#FDEDED] text-[#FF0000]"
													}`}
												>
													{task.status}
												</p>
												{task.status === "Completed" && (
													<span className="text-[12px] italic bg-[#F1F5FA] px-2 ml-4">
                            To make changes, reopen the task from the Subtask
                            Sheet.
													</span>
												)}
											</div>
											<p className="text-[14px]">{task.subtask_name}</p>
											<div className="flex space-x-2 font-[400] text-[14px]">
												<Avatar className="h-[20px] w-[20px]">
													<AvatarImage
														src={task.assigned_to_image}
														alt="Profile Img"
													/>
													<AvatarFallback>
														{getInitials(
															task?.assigned_to_first_name,
															task?.assigned_to_last_name,
														)}
													</AvatarFallback>
												</Avatar>
												<p className="text-[12px]">
													{task.due_date
														? format(new Date(task.due_date), "dd MMM, hh:mm a")
														: "No Due Date"}
												</p>
											</div>
										</div>
									))
								) : (
									<p className="font-[400] text-[14px]">
										{taskupdate?.subtasks?.length > 0
											? "No subtask available"
											: ""}
									</p>
								)
							) : (
								<Link
									style={{ cursor: "pointer" }}
									to="/dashboard"
									target="_blank"
								>
									<p className="text-[14px]">{taskName.parent_task_name}</p>
								</Link>
							)}

							<div
								className="text-[#ACABB2] font-[400] text-[14px]"
								onClick={() => {
									setSubtask([
										...subtask,
										{
											task_name: "",
											assigned_to: {},
											due_date: "",
										},
									]);
								}}
							>
                + Add Subtask
							</div>
							{/* {editMode?.subTasks && (
                <div className="flex flex-col w-full gap-y-2">
                  {subtask
                    .filter(
                      (sub) =>
                        sub.status === "Upcoming" || sub.status === "Due Today"
                    )
                    .map((sub: any, ind: number) => (
                      <div
                        className="flex items-center gap-x-2 w-full"
                        key={"subtask-" + ind}
                      >
                        <textarea
                          value={sub.task_name}
                          onChange={(e) =>
                            handleInputChange(ind, "task_name", e.target.value)
                          }
                          className="focus:outline-0 resize-none p-1 w-full md:w-[10vw] text-[12px] border-[1px] border-[#D0D3D9] rounded-[6px]"
                        />
                        <CombinedDropDown
                          value={sub?.assigned_to || ""}
                          handleSelect={(value: any) => {
                            const newSubtasks = [...subtask];
                            newSubtasks[ind].assigned_to = value;
                            setSubtask(newSubtasks);
                          }}
                          DataType={"isEmployeeData"}
                          isSubtaskData={true}
                          className="border-none p-0 bg-transparent w-[20vw] md:w-[3vw] mt-1"
                        />

                        <CustomCalender
                          date={sub.due_date}
                          onChange={(value) => {
                            const formattedDate = format(value, "yyyy-MM-dd");
                            const newSubtasks = [...subtask];
                            newSubtasks[ind].due_date = formattedDate;
                            setSubtask(newSubtasks);
                          }}
                          containerClassName="w-full md:w-[12vw] border-none text-[#0076BD] p-0 bg-transparent"
                          text="Date and Time"
                        />
                        <div
                          className="border-[1px] border-[#5B5967] rounded-full p-1 cursor-pointer"
                          onClick={() => handleRemoveSubtask(ind)}
                        >
                          <Trash2
                            color="#5B5967"
                            className="w-[10px] h-[10px]"
                          />
                        </div>
                      </div>
                    ))}

                  <div
                    className="text-[#ACABB2] font-[400] text-[14px]"
                    onClick={() => {
                      setSubtask([
                        ...subtask,
                        {
                          task_name: "",
                          assigned_to: {},
                          due_date: "",
                        },
                      ]);
                    }}
                  >
                    + Add Subtask
                  </div>
                </div>
              )} */}
						</div>
					</div>
					{SubTaskMode == "Edit" && !taskName?.parent_task_id && (
						<EditToggle
							fieldKey="subTasks"
							toggleEditMode={setEditMode}
							editMode={editMode}
						/>
					)}
				</div>
			) : (
				<div
					className="bg-[#F1F5FA] text-[#0076BD] rounded-[8px] px-[8px] py-[8.5px] text-[14px] font-[600] cursor-pointer"
					onClick={() => {
						setSubtask([{ task_name: "", assigned_to: {}, due_date: "" }]);
					}}
				>
          + Add Subtask
				</div>
			)}
		</>
	);
};

export default Subtask;

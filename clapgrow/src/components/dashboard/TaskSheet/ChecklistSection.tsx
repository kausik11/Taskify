import React, { useState } from "react";
import { Trash2, Edit3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface ChecklistItem {
    checklist_item: string;
    is_checked: number;
}

interface ChecklistSectionProps {
    editMode: any;
    setEditMode: any;
    checklist: ChecklistItem[];
    setChecklist: any;
    taskupdate: any;
    userEmail: string;
    isTaskEditable: (fieldName?: string) => boolean;
    roleBaseName?: string;
}

// Edit mode checklist item component
const EditChecklistItem: React.FC<{
    item: ChecklistItem;
    index: number;
    updateChecklistItem: (index: number, field: string, value: any) => void;
    handleRemoveChecklistItem: (index: number) => void;
}> = ({
    item,
    index,
    updateChecklistItem,
    handleRemoveChecklistItem
}) => {
        return (
            <div className="flex items-start gap-4 w-full">
                {/* Checklist Content */}
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 flex-1">
                    {/* Checkbox */}
                    <div className="flex-shrink-0">
                        <Checkbox
                            checked={item.is_checked === 1}
                            onCheckedChange={(checked) =>
                                updateChecklistItem(index, "is_checked", checked ? 1 : 0)
                            }
                            className="h-4 w-4"
                        />
                    </div>

                    {/* Checklist Item Text */}
                    <div className="flex-1">
                        <Input
                            value={item.checklist_item || ""}
                            onChange={(e) => updateChecklistItem(index, "checklist_item", e.target.value)}
                            className="focus:outline-none px-2 py-1 w-full text-sm border border-[#D0D3D9] rounded-md"
                            placeholder="Enter checklist item"
                        />
                    </div>
                </div>

                {/* Delete Button */}
                <div className="flex-shrink-0 flex items-start pt-3">
                    <button
                        className="border border-[#5B5967] rounded-full p-1.5 hover:bg-gray-200 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-300"
                        onClick={() => handleRemoveChecklistItem(index)}
                        aria-label="Remove checklist item"
                    >
                        <Trash2 className="w-4 h-4 text-[#5B5967]" />
                    </button>
                </div>
            </div>
        );
    };
    
// View mode checklist item component
const ChecklistViewItem: React.FC<{
    item: ChecklistItem;
    index: number;
    updateChecklistItem: (index: number, field: string, value: any) => void;
    canEditCheckboxes: boolean;
    isTaskCompleted: boolean;
}> = ({
    item,
    index,
    updateChecklistItem,
    canEditCheckboxes,
    isTaskCompleted
}) => {
        const handleCheckboxChange = (checked: boolean) => {
            if (canEditCheckboxes && !isTaskCompleted) {
                updateChecklistItem(index, "is_checked", checked ? 1 : 0);
            }
        };

        return (
            <div className="py-2 bg-white">
                <div className="flex items-start gap-3 justify-start">
                    {/* Checkbox */}
                    <div className="flex-shrink-0">
                        <Checkbox
                            checked={item.is_checked === 1}
                            onCheckedChange={handleCheckboxChange}
                            disabled={!canEditCheckboxes || isTaskCompleted}
                            className="h-4 w-4"
                        />
                    </div>

                    {/* Checklist Item Text */}
                    <div className="flex-1 text-left">
                        <span
                            className={`text-[14px] text-left block ${item.is_checked === 1
                                ? 'text-black'
                                : 'text-red-500'
                                }`}
                        >
                            {item.checklist_item}
                        </span>
                    </div>
                </div>
            </div>
        );
    };

const ChecklistSection: React.FC<ChecklistSectionProps> = ({
    editMode,
    setEditMode,
    checklist,
    setChecklist,
    taskupdate,
    userEmail,
    isTaskEditable,
    roleBaseName,
}) => {
    const [isHovered, setIsHovered] = useState(false);

    const canEditChecklist = () => {
        if (!isTaskEditable()) return false;

        const isAdmin = roleBaseName === "ROLE-Admin";
        const isAssignee = userEmail === taskupdate?.assignee;
        
        return isAdmin || isAssignee;
    };

    const canEditCheckboxes = () => {
        if (taskupdate?.is_completed) return false;

        const isAdmin = roleBaseName === "ROLE-Admin";
        const isAssignedTo = userEmail === taskupdate?.assigned_to; // Task doer can check items

        return isAdmin || isAssignedTo;
    };

    const handleAddChecklistItem = () => {
        const newChecklistItem: ChecklistItem = {
            checklist_item: "",
            is_checked: 0,
        };

        const updatedChecklist = [...(checklist || []), newChecklistItem];
        setChecklist(updatedChecklist);
    };

    const handleRemoveChecklistItem = (index: number) => {
        const newChecklist = checklist.filter((_, idx) => idx !== index);
        setChecklist(newChecklist);
    };

    const updateChecklistItem = (index: number, field: string, value: any) => {
        const newChecklist = [...checklist];
        newChecklist[index] = {
            ...newChecklist[index],
            [field]: value
        };
        setChecklist(newChecklist);
    };

    const toggleEditMode = () => {
        setEditMode((prev: any) => ({
            ...prev,
            checklist: !prev?.checklist
        }));
    };

    // Don't show checklist for help tickets
    if (taskupdate?.is_help_ticket) {
        return null;
    }

    const hasChecklist = checklist && checklist.length > 0;
    const isEditModeActive = editMode?.checklist;
    
    // Don't render anything if no checklist and not in edit mode
    if (!hasChecklist && !isEditModeActive) {
        return null;
    }

    return (
        <div 
            className={`w-full border-b border-[#F0F1F2] pb-4 mb-4 px-3 py-3 mt-1 flex flex-col justify-between ${isEditModeActive ? 'rounded-[8px] bg-[#F1F5FA] p-6' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Header with edit button positioned on the right */}
            <div className="flex justify-end items-center mb-3">
                {canEditChecklist() && (
                    <button
                        onClick={toggleEditMode}
                        className={`flex items-center text-[#0076BD] hover:text-[#0056B3] transition-all duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                    >
                        <Edit3 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {isEditModeActive ? (
                // Edit mode
                <div className="w-full flex flex-col gap-3 pb-2 bg-[#F1F5FA] rounded-lg py-4 px-3">
                    <div className="flex flex-col w-full gap-3">
                        {checklist?.map((item: ChecklistItem, index: number) => (
                            <EditChecklistItem
                                key={`checklist-${index}`}
                                item={item}
                                index={index}
                                updateChecklistItem={updateChecklistItem}
                                handleRemoveChecklistItem={handleRemoveChecklistItem}
                            />
                        ))}
                        <button
                            className="text-[#0076BD] font-medium text-sm cursor-pointer hover:text-[#0056B3] transition-colors p-2 border border-dashed border-[#0076BD] rounded-lg hover:bg-blue-50"
                            onClick={handleAddChecklistItem}
                            type="button"
                        >
                            + Add Checklist Item
                        </button>
                    </div>
                </div>
            ) : (
                // View mode
                <div className="space-y-2">
                    {checklist.map((item: ChecklistItem, index: number) => (
                        <ChecklistViewItem
                            key={`checklist-view-${index}`}
                            item={item}
                            index={index}
                            updateChecklistItem={updateChecklistItem}
                            canEditCheckboxes={canEditCheckboxes()}
                            isTaskCompleted={taskupdate?.is_completed === 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ChecklistSection;
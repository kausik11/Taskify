import { useState, useEffect, useRef } from 'react';

interface UseSubtaskNavigationProps {
  initialTaskName: string;
  isOpen: boolean;
  onTaskNameChange?: (newTaskName: string) => void;
}

interface UseSubtaskNavigationReturn {
  selectedTaskName: string;
  parentTaskName: string | null;
  sheetRef: React.RefObject<HTMLDivElement>;
  handleSubtaskClick: (subtaskId: string) => void;
  handleBackToParent: () => void;
  resetNavigation: () => void;
}

export const useSubtaskNavigation = ({
  initialTaskName,
  isOpen,
  onTaskNameChange,
}: UseSubtaskNavigationProps): UseSubtaskNavigationReturn => {
  const [selectedTaskName, setSelectedTaskName] = useState<string>(initialTaskName);
  const [parentTaskName, setParentTaskName] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  // Update selectedTaskName when initialTaskName changes
  useEffect(() => {
    if (initialTaskName && !parentTaskName) {
      setSelectedTaskName(initialTaskName);
    }
  }, [initialTaskName, parentTaskName]);

  // Reset navigation when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setParentTaskName(null);
      setSelectedTaskName(initialTaskName);
    }
  }, [isOpen, initialTaskName]);

  const scrollToTop = () => {
    if (sheetRef.current) {
      sheetRef.current.scrollTop = 0;
    }
  };

  const handleSubtaskClick = (subtaskId: string) => {
    if (subtaskId) {
      // Store current task as parent before navigating
      if (!parentTaskName) {
        setParentTaskName(selectedTaskName);
      }
      
      setSelectedTaskName(subtaskId);
      
      // If parent component wants to handle navigation
      if (onTaskNameChange) {
        onTaskNameChange(subtaskId);
      }
      
      scrollToTop();
    }
  };

  const handleBackToParent = () => {
    if (parentTaskName) {
      setSelectedTaskName(parentTaskName);
      
      if (onTaskNameChange) {
        onTaskNameChange(parentTaskName);
      }
      
      setParentTaskName(null);
      scrollToTop();
    }
  };

  const resetNavigation = () => {
    setParentTaskName(null);
    setSelectedTaskName(initialTaskName);
  };

  return {
    selectedTaskName,
    parentTaskName,
    sheetRef,
    handleSubtaskClick,
    handleBackToParent,
    resetNavigation,
  };
};  
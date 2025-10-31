import { useState, useEffect } from 'react';
import { useFrappeGetDoc, useFrappeGetDocList } from 'frappe-react-sdk';
import { CGTaskInstance } from '@/types/ClapgrowApp/CGTaskInstance';

interface UseTaskDataProps {
  taskName: string;
}

interface UseTaskDataReturn {
  taskData: CGTaskInstance | undefined;
  taskMappings: any[];
  workflow: any;
  isLoading: boolean;
  error: any;
  mutateTask: () => void;
  totalWorkflowSteps: number;
}

export const useTaskData = ({ taskName }: UseTaskDataProps): UseTaskDataReturn => {
  const [totalWorkflowSteps, setTotalWorkflowSteps] = useState<number>(0);

  // Fetch task data
  const { 
    data: taskData, 
    mutate: mutateTask,
    isLoading: taskLoading,
    error: taskError
  } = useFrappeGetDoc<CGTaskInstance>(
    "CG Task Instance",
    taskName,
    taskName ? undefined : null,
  );

  // Fetch task mappings
  const { 
    data: taskMappings,
    isLoading: mappingsLoading 
  } = useFrappeGetDocList(
    "Clapgrow Workflow Task Mapping",
    {
      fields: ["*"],
      filters: [["task_name", "=", taskName]],
      limit: 1,
    },
  );

  // Fetch workflow data
  const { 
    data: workflow,
    isLoading: workflowLoading 
  } = useFrappeGetDoc(
    "Clapgrow Workflow",
    taskMappings?.[0]?.workflow,
    taskMappings?.[0]?.workflow ? undefined : null,
  );

  // Update workflow steps count
  useEffect(() => {
    if (workflow?.nodes) {
      setTotalWorkflowSteps(workflow.nodes.length);
    }
  }, [workflow]);

  return {
    taskData,
    taskMappings: taskMappings || [],
    workflow,
    isLoading: taskLoading || mappingsLoading || workflowLoading,
    error: taskError,
    mutateTask,
    totalWorkflowSteps,
  };
};
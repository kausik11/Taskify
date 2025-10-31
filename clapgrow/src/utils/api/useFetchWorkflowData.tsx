import { useEffect, useState } from "react";
import { useFrappeGetDoc, useFrappeGetDocList } from "frappe-react-sdk";
import { format } from "date-fns";
import { CGTaskInstance } from "@/types/ClapgrowApp/CGTaskInstance";

interface WorkflowData {
  formDetails: any | null;
  taskDetailsList: CGTaskInstance[] | null;
  isLoading: boolean;
  error: any | null;
}

const useFetchWorkflowData = (taskId: string): WorkflowData => {
	const [matchingNames, setMatchingNames] = useState<string[]>([]);
	const [currentIndex, setCurrentIndex] = useState<number>(0);
	const [readyToFetch, setReadyToFetch] = useState<boolean>(false);

	// Step 1: Get all log names
	const {
		data: logDetails,
		isLoading: isLogLoading,
		error: logError,
	} = useFrappeGetDocList("Clapgrow Workflow Execution Log", {
		fields: ["name"],
		limit: 0,
	});
	//   ;

	const currentLogName = logDetails?.[currentIndex]?.name;

	// Step 2: Fetch details for the current log
	const { data: log, isLoading: isDetailLoading } = useFrappeGetDoc(
		"Clapgrow Workflow Execution Log",
		currentLogName,
		{
			// disableFetch: !readyToFetch || !currentLogName,
		},
	);
	//    ;

	// Step 3: Find matching logs for the task ID
	useEffect(() => {
		if (logDetails && logDetails.length > 0) {
			setReadyToFetch(true);
		}

		// if (!readyToFetch || isDetailLoading || !logDetails) return;

		const matched = log?.node_logs?.some((node: any) => {
			try {
				const output = JSON.parse(node.output || "{}");
				return output?.context?.task === taskId;
			} catch {
				return false;
			}
		});

		if (matched && currentLogName) {
			setMatchingNames((prev) => [...prev, currentLogName]);
		}

		if (currentIndex + 1 < (logDetails?.length || 0)) {
			setCurrentIndex((prev) => prev + 1);
		} else {
			setReadyToFetch(false); // All logs processed
		}
	}, [logDetails, currentIndex, log, taskId, isDetailLoading]);

	// Step 4: Fetch execution log details for the first matching log
	const {
		data: executionLogDetails,
		isLoading: isExecutionLogLoading,
		error: executionLogError,
	} = useFrappeGetDoc("Clapgrow Workflow Execution Log", matchingNames[0]);

	// Step 5: Extract doctype and docname from the matched node
	const matchedNode = executionLogDetails?.node_logs?.find((node: any) => {
		try {
			const parsedOutput = JSON.parse(node.output || "{}");
			return parsedOutput?.context?.task === taskId;
		} catch (err) {
			console.warn(`Invalid JSON in node ${node.name}`, err);
			return false;
		}
	});

	const doctype = matchedNode
		? JSON.parse(matchedNode.output || "{}")?.context?.doctype
		: null;
	const docname = matchedNode
		? JSON.parse(matchedNode.output || "{}")?.context?.docname
		: null;

	// Step 6: Fetch form details
	const {
		data: formDetails,
		isLoading: isFormLoading,
		error: formError,
	} = useFrappeGetDoc(doctype, docname);

	// Step 7: Extract task IDs from all nodes
	const allNodeDetails = executionLogDetails?.node_logs;
	const allNode = allNodeDetails?.map((node: any) => {
		try {
			const parsedOutput = JSON.parse(node?.output || "{}");
			return parsedOutput;
		} catch (err) {
			console.warn(`Invalid JSON in node ${node.name}`, err);
			return false;
		}
	});

	const taskIds = allNode
		?.map((node: any) => node?.context?.task)
		.filter((taskId: any): taskId is string => !!taskId);

	// Step 8: Fetch task details from CG Task Instance
	const {
		data: taskDetailsList,
		isLoading: isTaskDetailsLoading,
		error: taskDetailsError,
	} = useFrappeGetDocList<CGTaskInstance>("CG Task Instance", {
		fields: ["name", "task_name", "assigned_to", "due_date", "status"],
		filters: taskIds?.length ? [["name", "in", taskIds]] : [],
	});

	// Combine loading states
	const isLoading =
    isLogLoading ||
    isDetailLoading ||
    isExecutionLogLoading ||
    isFormLoading ||
    isTaskDetailsLoading;

	// Combine errors
	const error = logError || executionLogError || formError || taskDetailsError;

	return {
		formDetails: formDetails || null,
		taskDetailsList: taskDetailsList || null,
		isLoading,
		error,
	};
};

export default useFetchWorkflowData;

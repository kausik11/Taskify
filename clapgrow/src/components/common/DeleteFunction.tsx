import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useFrappeDeleteDoc,
  useFrappeGetDocList,
  useFrappeUpdateDoc,
  useFrappePostCall,
  useSWRConfig,
} from "frappe-react-sdk";
import { toast } from "sonner";

interface DeleteFunctionProps {
  selected: {
    name: string;
    task_name: string;
    task_type: string;
    task_definition_id: string;
  }[];
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSelected: React.Dispatch<React.SetStateAction<any[]>>;
  setrefreshKey?: React.Dispatch<React.SetStateAction<number>>;
}
export function DeleteFunction({
  selected,
  isOpen,
  setIsOpen,
  setSelected,
  setrefreshKey,
}: DeleteFunctionProps) {
  const [loading, setLoading] = useState(false);
  const [deleteSchema, setDeleteSchema] = useState<Record<string, boolean>>(
    selected.reduce((acc, item) => ({ ...acc, [item.name]: true }), {}),
  );

  const { deleteDoc } = useFrappeDeleteDoc();
  const { updateDoc } = useFrappeUpdateDoc();
  const { call: callBulkDelete } = useFrappePostCall(
    "clapgrow_app.api.tasks.bulk_operations.delete_tasks_bulk",
  );
  const { mutate } = useSWRConfig();

  const recurringDefinitionIds = useMemo(() => {
    return [
      ...new Set(
        selected.map((item) => item.task_definition_id).filter(Boolean),
      ),
    ];
  }, [selected]);

  const completedTaskFilters = useMemo(() => {
    if (recurringDefinitionIds.length === 0) return [];
    return [
      ["task_definition_id", "in", recurringDefinitionIds],
      ["is_completed", "=", 1],
    ];
  }, [recurringDefinitionIds]);

  const { data: completedTasks, isLoading: completedLoading } =
    useFrappeGetDocList(
      "CG Task Instance",
      {
        filters: completedTaskFilters,
        fields: ["name", "task_definition_id"],
      },
      {
        swrKey: `completed-tasks-${JSON.stringify([...recurringDefinitionIds].sort())}`,
        enabled: isOpen && deleteSchema && recurringDefinitionIds.length > 0,
      },
    );

  // Determine which definitions should be disabled vs deleted
  const deletionStrategy = useMemo(() => {
    if (!completedTasks) return {};

    const strategy: Record<string, "disable" | "delete"> = {};

    recurringDefinitionIds.forEach((defId) => {
      const hasCompletedInstances = completedTasks.some(
        (task) => task.task_definition_id === defId,
      );
      strategy[defId] = hasCompletedInstances ? "disable" : "delete";
    });

    return strategy;
  }, [completedTasks, recurringDefinitionIds]);

  const confirmDelete = async () => {
    setLoading(true);
    try {
      // FIXED: Only delete the SELECTED task instances, not all instances with same definition
      // Get the selected task instance names directly from the 'selected' prop
      const selectedTaskInstanceNames = selected.map((item) => item.name);

      if (
        selectedTaskInstanceNames.length === 0 &&
        recurringDefinitionIds.length === 0
      ) {
        toast.warning("No tasks or schemas selected for deletion.");
        setIsOpen(false);
        return;
      }

      // Delete CG Task Instance documents using bulk API (only the selected ones)
      if (selectedTaskInstanceNames.length > 0) {
        try {
          const result = await callBulkDelete({
            task_names: JSON.stringify(selectedTaskInstanceNames),
          });

          if (result?.status === "error") {
            const errorMsg =
              typeof result.message === "string"
                ? result.message
                : "Failed to delete tasks";
            throw new Error(errorMsg);
          }

          if (result?.failed > 0) {
            console.warn(
              `${result.failed} task(s) failed to delete`,
              result.errors,
            );
          }
        } catch (error: unknown) {
          console.error("Failed to delete task instances:", error);
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to delete task instances: ${errorMessage}`);
        }
      }

      // Delete schemas (CG Task Definition) if selected
      const schemaIdsToProcess = recurringDefinitionIds.filter((id) =>
        selected.some(
          (item) => item.task_definition_id === id && deleteSchema[item.name],
        ),
      );

      let disabledCount = 0;
      let deletedCount = 0;

      if (schemaIdsToProcess.length > 0) {
        const disablePromises: Promise<void>[] = [];
        const deletePromises: Promise<void>[] = [];

        schemaIdsToProcess.forEach((id) => {
          if (deletionStrategy[id] === "disable") {
            disablePromises.push(
              updateDoc("CG Task Definition", id, { enabled: 0 })
                .then(() => {
                  disabledCount++;
                })
                .catch((error) => {
                  console.error(
                    `Failed to disable CG Task Definition ${id}:`,
                    error,
                  );
                  throw new Error(`Failed to disable schema ${id}`);
                }),
            );
          } else {
            deletePromises.push(
              deleteDoc("CG Task Definition", id)
                .then(() => {
                  deletedCount++;
                })
                .catch((error) => {
                  console.error(
                    `Failed to delete CG Task Definition ${id}:`,
                    error,
                  );
                  throw new Error(`Failed to delete schema ${id}`);
                }),
            );
          }
        });

        await Promise.all([...disablePromises, ...deletePromises]);
      }

      let message = `Successfully deleted ${selectedTaskInstanceNames.length} task instance(s)`;
      if (disabledCount > 0) {
        message += `, disabled ${disabledCount} schema(s)`;
      }
      if (deletedCount > 0) {
        message += `, deleted ${deletedCount} schema(s)`;
      }
      message += ".";

      toast.success(message);
      setSelected([]);
      setDeleteSchema({});
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("Failed to delete tasks or schemas. Please try again.");
    } finally {
      setLoading(false);

      // Invalidate all report caches to ensure fresh data
      mutate(
        (key) => {
          return (
            typeof key === "string" &&
            key.includes("frappe.desk.query_report.run")
          );
        },
        undefined,
        { revalidate: true },
      );
      mutate(
        (key) => {
          return typeof key === "string" && key.includes("CG Task Definition");
        },
        undefined,
        { revalidate: true },
      );

      // Trigger a refresh in the parent component
      if (setrefreshKey) {
        setrefreshKey((prev) => {
          // console.log("Updating refreshKey from", prev, "to", prev + 1);
          return prev + 1;
        });
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogOverlay className="fixed inset-0 bg-black/30 backdrop-blur-md z-50" />
      <DialogContent className="sm:max-w-md z-50">
        <DialogHeader>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the selected {selected.length} task
            instance(s)? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div>
          <p>Selected tasks ({selected.length}):</p>
          <ul>
            {selected.map((item) => {
              const strategy = deletionStrategy[item.task_definition_id];
              const actionText =
                strategy === "disable"
                  ? "Disable Schema (has completed tasks)"
                  : "Delete Schema (no completed tasks)";

              return (
                <li key={item.name} className="text-sm flex justify-start">
                  <p className="max-w-[180px] min-w-[180px] font-bold text-sm">
                    #{" "}
                    {item.task_name.length > 20
                      ? item.task_name.slice(0, 20) + "..."
                      : item.task_name}
                  </p>{" "}
                  |{" "}
                  <span>
                    <input
                      type="checkbox"
                      checked={!!deleteSchema[item.name]}
                      onChange={() =>
                        setDeleteSchema((prev) => ({
                          ...prev,
                          [item.name]: !prev[item.name],
                        }))
                      }
                      onClick={(e) => e.stopPropagation()}
                      style={{ cursor: "pointer" }}
                    />{" "}
                    {completedLoading ? "Loading..." : actionText}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <DialogFooter className="sm:justify-start">
          <Button
            type="button"
            variant="destructive"
            onClick={confirmDelete}
            disabled={loading || completedLoading}
          >
            {loading || completedLoading ? "Deleting..." : "Delete"}
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

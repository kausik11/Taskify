import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { FrappeError, useFrappePostCall, useSWRConfig } from "frappe-react-sdk";
import { useEffect, useState } from "react";
import { ErrorBanner } from "@/components/layout/AlertBanner/ErrorBanner";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: React.Dispatch<React.SetStateAction<boolean>>;
  refreshPage: () => void;
  doctype: string;
  onRowSelectionCleared: () => void;
  getSelectedRows: () => any[];
}

export const DeleteListItems = ({
  isOpen,
  onClose,
  doctype,
  getSelectedRows,
  onRowSelectionCleared,
  refreshPage,
}: Props) => {
  // Use optimized bulk APIs for specific doctypes, fallback to generic API for others
  const isTaskInstance = doctype === "CG Task Instance";
  const isTaskDefinition = doctype === "CG Task Definition";

  const {
    call: callGenericDelete,
    error: genericError,
    loading: genericLoading,
    reset: genericReset,
  } = useFrappePostCall("frappe.desk.reportview.delete_items");

  const {
    call: callBulkDeleteTasks,
    error: bulkTaskError,
    loading: bulkTaskLoading,
    reset: bulkTaskReset,
  } = useFrappePostCall(
    "clapgrow_app.api.tasks.bulk_operations.delete_tasks_bulk",
  );

  const {
    call: callBulkDeleteDefinitions,
    error: bulkDefError,
    loading: bulkDefLoading,
    reset: bulkDefReset,
  } = useFrappePostCall(
    "clapgrow_app.api.tasks.bulk_operations.delete_task_definitions_bulk",
  );

  const [err, setErr] = useState<FrappeError | null>(null);
  const { mutate } = useSWRConfig();

  // Use appropriate loading and error states based on doctype
  const loading = isTaskInstance
    ? bulkTaskLoading
    : isTaskDefinition
      ? bulkDefLoading
      : genericLoading;
  const error = isTaskInstance
    ? bulkTaskError
    : isTaskDefinition
      ? bulkDefError
      : genericError;

  useEffect(() => {
    if (isTaskInstance) {
      bulkTaskReset();
    } else if (isTaskDefinition) {
      bulkDefReset();
    } else {
      genericReset();
    }
    setErr(null);
  }, [
    isOpen,
    isTaskInstance,
    isTaskDefinition,
    bulkTaskReset,
    bulkDefReset,
    genericReset,
  ]);

  const deleteItems = () => {
    let rows = getSelectedRows();
    const items = rows.map((row) => row.name || null).filter(Boolean);

    if (items.length === 0) {
      toast.error("No items selected for deletion");
      return;
    }

    // Use optimized bulk API for CG Task Instance
    if (isTaskInstance) {
      callBulkDeleteTasks({
        task_names: JSON.stringify(items),
      })
        .then((res) => {
          if (res?.status === "error") {
            console.error("Error deleting task instances:", res);
            setErr(res as any);
          } else {
            // Extract message string safely - handle both string and object responses
            let successMsg = "Task instances deleted successfully.";
            if (res?.message && typeof res.message === "string") {
              successMsg = res.message;
            } else if (typeof res === "string") {
              successMsg = res;
            }

            toast.success(successMsg);

            // Close the modal if successful
            onClose(false);

            // Clear cache for deleted docs
            items.forEach((item) => {
              mutate(`doc:${doctype}:${item}`, undefined, {
                revalidate: false,
              });
            });

            // Use setTimeout to delay refresh slightly to allow modal close animation
            // This prevents flickering by letting the modal fully close before grid remount
            setTimeout(() => {
              onRowSelectionCleared();
              refreshPage();
            }, 150);
          }
        })
        .catch((err) => {
          console.error("Error deleting task instances:", err);
          setErr(err);
        });
    } else if (isTaskDefinition) {
      // Use optimized bulk API for CG Task Definition
      callBulkDeleteDefinitions({
        definition_names: JSON.stringify(items),
      })
        .then((res) => {
          if (res?.status === "error") {
            console.error("Error deleting task definitions:", res);
            setErr(res as any);
          } else {
            // Always show success message (as per requirement, even if some were just disabled)
            let successMsg = "Task definitions deleted successfully.";
            if (res?.message && typeof res.message === "string") {
              successMsg = res.message;
            } else if (typeof res === "string") {
              successMsg = res;
            }

            toast.success(successMsg);

            // Close the modal first to prevent flickering
            onClose(false);

            // Clear cache for deleted/disabled docs
            items.forEach((item) => {
              mutate(`doc:${doctype}:${item}`, undefined, {
                revalidate: false,
              });
            });

            // Use setTimeout to delay refresh slightly to allow modal close animation
            // This prevents flickering by letting the modal fully close before grid remount
            setTimeout(() => {
              onRowSelectionCleared();
              refreshPage();
            }, 150);
          }
        })
        .catch((err) => {
          console.error("Error deleting task definitions:", err);
          setErr(err);
        });
    } else {
      // Use generic Frappe delete for other doctypes
      callGenericDelete({
        doctype: doctype,
        items: JSON.stringify(items),
      }).then((res) => {
        if (res.exc_type || res._server_messages) {
          console.error("Error deleting items:", res);
          setErr(res);
        } else {
          toast.success("Items deleted successfully");

          // Close the modal first to prevent flickering
          onClose(false);

          // Clear cache for deleted docs
          items.forEach((item) => {
            mutate(`doc:${doctype}:${item}`, undefined, { revalidate: false });
          });

          // Use setTimeout to delay refresh slightly to allow modal close animation
          // This prevents flickering by letting the modal fully close before grid remount
          setTimeout(() => {
            onRowSelectionCleared();
            refreshPage();
          }, 150);
        }
      });
    }
  };

  return (
    <AlertDialog onOpenChange={onClose} open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-bold">
            Delete Item(s)
          </AlertDialogTitle>
        </AlertDialogHeader>

        <AlertDialogDescription asChild>
          <div className="flex flex-col gap-3">
            <ErrorBanner error={error} />
            <ErrorBanner error={err} />
            <span
              className={cn(
                "text-sm text-muted-foreground",
                err !== null && "hidden",
              )}
            >
              Are you sure you want to delete the selected rows?
            </span>
          </div>
        </AlertDialogDescription>

        <AlertDialogFooter className="flex gap-2">
          <AlertDialogCancel asChild>
            <Button variant="ghost" disabled={loading}>
              {err === null ? "Cancel" : "Close"}
            </Button>
          </AlertDialogCancel>

          <AlertDialogAction asChild>
            <Button
              variant="destructive"
              disabled={loading || err !== null}
              onClick={(e) => {
                e.preventDefault();
                deleteItems();
              }}
              className={cn(err !== null && "hidden")}
            >
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

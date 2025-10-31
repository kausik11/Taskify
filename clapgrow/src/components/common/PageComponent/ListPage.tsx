import { Card } from "@/components/ui/card";
import { DoctypeListProps } from "../DataGrid/DataGridWithMeta";
import { useFrappeGetCall } from "frappe-react-sdk";
import { ErrorBanner } from "@/components/layout/AlertBanner/ErrorBanner";
import DoctypeList from "@/components/common/DataGrid/DataGridWithMeta";

export const ListPage = ({
  doctype,
  defaultFilters,
  mandatoryFilters,
  overrideColumns,
  additionalColumns,
  otherFields,
  rightChild,
  ...props
}: DoctypeListProps) => {
  const { data: hasPermission, error } = useFrappeGetCall(
    "clapgrow_app.api.form.create_form.check_user_permission_for_form",
    {
      doctype: doctype,
    },
  );

  return (
    <Card className="p-4 h-[90vh] w-full overflow-auto">
      <ErrorBanner error={error} />
      {hasPermission?.message && (
        <DoctypeList
          doctype={doctype}
          defaultFilters={defaultFilters}
          mandatoryFilters={mandatoryFilters}
          overrideColumns={overrideColumns}
          otherFields={otherFields}
          leftChild={HeadingComponent}
          additionalColumns={additionalColumns}
          rightChild={rightChild}
          {...props}
        />
      )}
    </Card>
  );
};

const HeadingComponent = ({ doctype }: { doctype: string }) => {
  return <h1 className="text-2xl font-bold">{doctype}</h1>;
};

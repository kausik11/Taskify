import CreateTagSheet from "./CreateTagSheet";
import { useContext, useMemo, useState } from "react";
import { UserContext } from "@/utils/auth/UserProvider";
import { useFrappeGetDocList, useFrappeDeleteDoc, useFrappeGetDocCount } from "frappe-react-sdk";
import AGComponent from "../AGComponent";
import Pagination from "../common/Pagination";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Loader } from "../layout/AlertBanner/CommonDesign";
import DoctypeList from "../common/DataGrid/DataGridWithMeta";
import { ColumnProps } from "../common/DataGrid/DataGridComponent";

interface Tag {
  name: string;
  tag_name: string;
  company_id: string;
  count: number;
}

const TagsComponent = () => {
  const { roleBaseName, companyDetails } = useContext(UserContext);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const recordsPerPage = 10; // Fixed number of records per page

  
  const companyId = useMemo(() => {
    return companyDetails && companyDetails.length > 0
      ? companyDetails[0].name
      : null;
  }, [companyDetails]);

  const { data: totalRecords } = useFrappeGetDocCount<Tag>("CG Tags", [
    ["company_id", "=", companyId],
  ]);


  const {
    data: rawTagData,
    isLoading: loading,
    error,
    mutate,
  } = useFrappeGetDocList<Tag>("CG Tags", {
    fields: ["name", "tag_name", "company_id", "count"],
    filters: [["company_id", "=", companyId]],
    limit: recordsPerPage, // Use fixed records per page
    limit_start: (currentPage - 1) * recordsPerPage, // Correct offset
  });

  const { deleteDoc } = useFrappeDeleteDoc();

  const handleTagsCreated = () => {
    mutate(); // Re-fetch tag data
  };

  async function handleDeleteTag(tagName: string, tagCount: number) {
    if (tagCount > 0) {
      toast.error("Cannot delete tag used in tasks");
      return;
    }
    try {
      await deleteDoc("CG Tags", tagName);
      toast.success("Tag deleted successfully");
      mutate(); // Re-fetch tag data
    } catch (error: any) {
      console.error("Error deleting tag:", error);

      const serverMessages = error._server_messages
        ? JSON.parse(error._server_messages)
        : null;
      const msgObj = serverMessages ? JSON.parse(serverMessages[0]) : null;
      const errorMessage = msgObj?.message
        ? msgObj.message.replace(/<[^>]*>/g, "")
        : "Failed to delete tag";

      toast.error(errorMessage);
    }
  }

  const columnDefsMemo = useMemo(() => {
    const columns = [
      {
        headerName: "Tags",
        field: "tag_name",
        width: 300,
        filter: true,
        cellRenderer: (params: { data: Tag }) => (
          <p className="truncate text-[14px] text-[#5B5967] font-[400]">
            {params.data?.tag_name}
          </p>
        ),
      },
      {
        headerName: "Used in no. of Tasks",
        field: "count",
        width: 250,
        filter: true,
        cellRenderer: (params: { data: Tag }) => (
          <p className="truncate text-[14px] text-[#5B5967] font-[400]">
            {params.data?.count || 0}
          </p>
        ),
      },
    ];
    if (roleBaseName === "ROLE-Admin") {
      columns.push({
        headerName: "Action",
        field: "delete",
        filter: false,
        width: 100,
        cellRenderer: (params: { data: Tag }) => (
          <div className="flex justify-center items-center w-full h-full">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteTag(params.data?.tag_name, params.data?.count);
              }}
              disabled={params.data?.count > 0}
              className="flex justify-center items-center p-1 hover:bg-gray-100 rounded disabled:opacity-50"
            >
              <Trash2 className="h-7 w-7 text-[#304156] rounded-full p-1" />
            </button>
          </div>
        ),
      });
    }
    return columns;
  }, [roleBaseName]);

  const columnDefs: ColumnProps[] = [
    {
      fieldname: "tag_name",
      label: "Tags",
      overrideProps: {
        maxWidth: 600,
        filter: "agTextColumnFilter",
        cellRenderer: (params: { data: Tag }) => (
          <p className="truncate text-[14px] text-[#5B5967] font-[400]">
            {params.data?.name}
        </p>
      ),
    },
    },
    {
      fieldname:undefined,
      label: "Used in no. of Tasks",
      overrideProps: {
        width: 250,
        filter: "false",
        cellRenderer: (params: { data: Tag }) => (
          <p className="truncate text-[14px] text-[#5B5967] font-[400]">
            {params.data?.count || 0}
        </p>
      ),
    },
    },
    //action button
    {
      fieldname: undefined,
      label: "Action",
      overrideProps:{
        maxWidth: 80,
				filter: false,
        cellRenderer: (params: { data: Tag }) => (
          <div className="flex justify-center items-center w-full h-full">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteTag(params.data?.tag_name, params.data?.count);
              }}
              disabled={params.data?.count > 0}
              className="flex justify-center items-center p-1 hover:bg-gray-100 rounded disabled:opacity-50"
            >
              <Trash2 className="h-7 w-7 text-[#304156] rounded-full p-1" />
            </button>
          </div>
        ),
      }
    }
  ];
  function TaskDetailsFunc(event: any) {
    // Handle row click if needed
  }

  if (error) {
    return (
      <div className="text-red-500">Error loading tags: {error.message}</div>
    );
  }

  return (
    <div className="w-full px-[16px]">
      <div className="flex flex-row items-center justify-between">
        <span className="text-[#2D2C37] font-[600] text-[16px]">Tags</span>
        <div className="flex flex-row items-center enslavement-x-3">
          {roleBaseName === "ROLE-Admin" && (
            <CreateTagSheet onTagsCreated={handleTagsCreated} mutate={mutate} />
          )}
        </div>
      </div>
      <div className="rounded-[15px] overflow-x-auto border-[1px] border-[#F0F1F2] mt-3">
        {loading ? (
          <div>
            <Loader />
          </div>
        ) : (
          <>
            {/* <AGComponent
              tableData={rawTagData ?? []}
              columnDefsMemo={columnDefsMemo}
              onRowClicked={(event) => TaskDetailsFunc(event)}
              tableType={null}
              TableHeight="500px"
            /> */}
            <div className="h-[90vh] flex flex-row">
              <DoctypeList
                doctype="CG Tags"
                showModifiedColumn={false}
                columnDefs={columnDefs}
                showCheckboxColumn={false}
              />
            </div>
            
            {/* <Pagination
              setCurrentPage={setCurrentPage}
              totalRecords={totalRecords ?? 0} // Use total record count
              recordsPerPage={recordsPerPage} // Fixed records per page
              currentPage={currentPage}
            /> */}
          </>
        )}
      </div>
    </div>
  );
};

export default TagsComponent;
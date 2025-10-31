import {
  forwardRef,
  useMemo,
  useImperativeHandle,
  useState,
  useEffect,
} from "react";
import { useForm, FormProvider, useFormContext } from "react-hook-form";
import { useGetDoctypeMeta } from "@/hooks/useGetDoctypeMeta";
import { ErrorBanner } from "@/components/layout/AlertBanner/ErrorBanner";
import { DynamicField } from "../common/FormComponent/FormComponents";
import { DocField } from "@/types/Core/DocField";
import {
  useFrappeCreateDoc,
  useFrappeGetDoc,
  useFrappeGetDocList,
  useFrappeUpdateDoc,
} from "frappe-react-sdk";
import { ChevronDown, ChevronUp } from "lucide-react";
// import { DatePickerComponent } from "./DatePickerComponent";
import CustomCalender from "../common/CustomCalender";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  DatePickerValueComponent,
  DateTimePickerValueComponent,
} from "../common/AirDatePicker/DatePickerValueComponent";
import { DatePickerComponent } from "./DatePickerComponent";

const UserSelect = ({
  field,
  fieldProps,
  onUserSelect,
}: {
  field: DocField;
  fieldProps?: any;
  onUserSelect?: (value: string) => void;
}) => {
  const methods = useFormContext();
  const {
    data: users,
    isLoading,
    error,
  } = useFrappeGetDocList("CG User", {
    fields: ["name", "full_name"],
    limit: 50,
    order_by: { field: "full_name", order: "asc" },
    filters: [["enabled", "=", 1]],
  });

  const options = useMemo(() => {
    return (
      users?.map((user) => ({
        value: user.name,
        label: user.full_name || user.name,
      })) || []
    );
  }, [users]);

  if (isLoading) return <div>Loading users...</div>;
  if (error) return <div>Error loading users: {error.message}</div>;

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.reqd && <span className="text-red-500">*</span>}
      </label>
      <select
        className="mt-1 block w-full rounded-md shadow-sm text-sm min-h-12 bg-white border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 text-gray-900 placeholder-gray-400 transition duration-200"
        {...methods.register(field.fieldname, {
          required: field.reqd === 1 ? `${field.label} is required` : false,
        })}
        onChange={(e) => {
          const value = e.target.value;
          methods.setValue(field.fieldname, value, { shouldValidate: true });
          if (onUserSelect) onUserSelect(value);
        }}
        {...fieldProps}
      >
        <option value="">Select a user</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {methods.formState.errors[field.fieldname] && (
        <p className="text-red-500 text-xs mt-1">
          {methods.formState.errors[field.fieldname]?.message}
        </p>
      )}
    </div>
  );
};

export const FormMeta = forwardRef(
  (
    {
      doctype,
      isEdit = false,
      onSuccess,
      initiallyCollapsed = false,
      docName,
      onFormStateChange, // New prop to communicate form state
  triggerSubmit, // New prop to trigger submission
  onSubmissionResult, // New prop to handle submission results
    }: {
      doctype: string;
      isEdit?: boolean;
      onSuccess?: (res: any) => void;
      initiallyCollapsed?: boolean;
      docName?: string;
       onFormStateChange?: (isValid: boolean, submitForm: () => Promise<any>) => void;
  triggerSubmit?: boolean;
  onSubmissionResult?: (result: { success: boolean; data?: any; error?: any }) => void;
    },
    ref,
  ) => {
    const [isCollapsed, setIsCollapsed] = useState(initiallyCollapsed);
    const [lastTriggerSubmit, setLastTriggerSubmit] = useState(false);


    const { data, isLoading, error } = useGetDoctypeMeta(doctype);
    const { createDoc, isCompleted, error: createError } = useFrappeCreateDoc();
    const {
      updateDoc,
      loading: isUpdating,
      error: updateError,
    } = useFrappeUpdateDoc();
    const { data: taskData, mutate: mutateTask } = useFrappeGetDoc(
      "CG Task Instance",
      docName,
      docName ? undefined : null,
    );
    // ;

    const fields = useMemo(() => data?.fields || [], [data]);
    // console.log("fields",fields)
    const autoname = useMemo(() => {
      if (isEdit && data?.autoname && data?.naming_rule === "By fieldname") {
        return data?.autoname?.split(":")[1]?.trim();
      }
      return undefined;
    }, [data, isEdit]);

    // const defaultValues = useMemo(() => {
    //   const values: Record<string, any> = {};

    // fields.forEach((field: DocField) => {
    //   let value = field.default;

    //   if (value !== undefined && value !== null) {
    //     if (field.fieldtype === "Check") {
    //       value = value === "1" ? 1 : 0;
    //     }
    //     else if (field.fieldtype === "Date" && value === "Today") {
    //       value = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    //     } else if (field.fieldtype === "Datetime" && value === "Now") {
    //       value = new Date().toISOString(); // full ISO
    //     }
    //     values[field.fieldname] = value;
    //   }
    // });

    //   return values;
    // }, [fields]);

    // const defaultValues = useMemo(() => {
    //   const values: Record<string, any> = {};
    //   return values;
    // }, [fields]);

    const methods = useForm({
      mode: "onChange",
    });

    const formValues = methods.watch();
	// console.log("formValues",formValues)
    // useEffect(() => {
    // 	console.log("Current form values:", formValues);
    // }, [formValues]);

    const handleUserSelect = async (value: string) => {
      if (!docName) {
        toast.error("Document name is required to update the field.");
        return;
      }

      try {
        await updateDoc("CG Task Instance", docName, {
          next_task_assigned_to: value,
        });
        toast.success("Next Task Assigned To updated successfully.");
        await mutateTask();
      } catch (err: any) {
        toast.error(`Error updating Next Task Assigned To: ${err.message}`);
      }
    };

    const onFormSubmit = async (data: any) => {
      try {
        // Validate all mandatory fields
        const requiredFields = fields.filter(
          (field: DocField) => field.reqd === 1,
        );

        const errors: string[] = [];

        requiredFields.forEach((field: DocField) => {
          if (!data[field?.fieldname] || data[field?.fieldname] === "") {
            errors.push(field?.label || field?.fieldname);
            methods.setError(field?.fieldname, {
              type: "required",
              message: `${field.label || field.fieldname} is required`,
            });
          }
        });

        if (errors.length > 0) {
        //   toast.error("Please fill all mandatory fields: " + errors.join(", "));
          throw new Error("Mandatory fields are missing");
        }

        const response = await createDoc(doctype, data);
        if (onSuccess) onSuccess(response);
        return response;
      } catch (err: any) {
        // console.error("Error while creating doc:", err.message);
        throw err;
      }
    };

    // Expose submitForm and isValid methods to parent via ref
    // useImperativeHandle(ref, () => ({
    //   submitForm: async () => {
    //     try {
    //       const isValid = await methods.trigger();
    //       if (!isValid) {
    //         const errorFields = Object.keys(methods.formState.errors);
    //         const requiredFields = fields
    //           .filter((field: DocField) => field.reqd === 1)
    //           .map((field: DocField) => field.label || field.fieldname);
    //         const missingFields = errorFields.filter((field) =>
    //           requiredFields.includes(field),
    //         );
    //           toast.error(
    //         	"Please fill all mandatory fields: " + missingFields.join(", ")
    //           );
    //         throw new Error("Form validation failed");
    //       }
    //       let response: any;

    //       // const result = await methods.handleSubmit(onFormSubmit)();
    //       // return result;
    //       await methods.handleSubmit(async (data) => {
    //         response = await onFormSubmit(data); // capture response
    //       })();
    //       return response;
    //     } catch (error) {
    //       console.error("Submission error:", error);
    //       throw error;
    //     }
    //   },
    //   isValid: () => methods.formState.isValid,
    // }));

    const submitForm = async () => {
    try {
      const isValid = await methods.trigger();
      if (!isValid) {
        const errorFields = Object.keys(methods.formState.errors);
        const requiredFields = fields
          .filter((field: DocField) => field.reqd === 1)
          .map((field: DocField) => field.label || field.fieldname);
        const missingFields = errorFields.filter((field) =>
          requiredFields.includes(field),
        );
        toast.error(
          "Please fill all mandatory fields: " + missingFields.join(", ")
        );
        throw new Error("Form validation failed");
      }
      
      let response: any;
      await methods.handleSubmit(async (data) => {
        response = await onFormSubmit(data);
      })();
      return response;
    } catch (error) {
      console.error("Submission error:", error);
      throw error;
    }
  };

  // Communicate form state to parent
  useEffect(() => {
    if (onFormStateChange) {
      onFormStateChange(methods.formState.isValid, submitForm);
    }
  }, [methods.formState.isValid, onFormStateChange]);


  // Handle triggerSubmit prop changes
  useEffect(() => {
    if (triggerSubmit && triggerSubmit !== lastTriggerSubmit) {
      setLastTriggerSubmit(triggerSubmit);
      
      submitForm()
        .then((result) => {
          onSubmissionResult?.({ success: true, data: result });
        })
        .catch((error) => {
          onSubmissionResult?.({ success: false, error });
        });
    }
  }, [triggerSubmit, lastTriggerSubmit, onSubmissionResult]);

    // Group fields by Column Break
    const columns: DocField[][] = useMemo(() => {
      const cols: DocField[][] = [];
      let current: DocField[] = [];
      fields.forEach((field) => {
        if (field.fieldtype === "Column Break") {
          cols.push(current);
          current = [];
        } else {
          current.push(field);
        }
      });
      cols.push(current);
      return cols;
    }, [fields]);

    // console.log("columns",columns)

    // Wrapper component inspired by DateAndTimeFilters
    const DateFieldWrapper = ({ field }: { field: DocField }) => {
      const format = field.fieldtype === "Date" ? "date" : "datetime";
      const setValue = (value: string) => {
        methods.setValue(field.fieldname, value, { shouldValidate: true });
      };
      const value = methods.watch(field.fieldname) || "";

      return (
        <div key={field.fieldname}>
          <label className="block text-sm font-medium text-gray-700">
            {field.label}
            {field.reqd && <span className="text-red-500">*</span>}
          </label>
          {format === "date" ? (
            <DatePickerValueComponent
              id={field.fieldname}
              value={value}
              onChange={setValue}
              required={field.reqd === 1}
              readOnly={field.read_only === 1}
              defaultValue={field.default}
              inputProps={{
                height: "28px",
                rounded: "md",
                ...methods.register(field.fieldname, {
                  required:
                    field.reqd === 1 ? `${field.label} is required` : false,
                }),
              }}
            />
          ) : (
            <DateTimePickerValueComponent
              id={`form-meta-${field.fieldname}`}
              value={value}
              onChange={setValue}
              required={field.reqd === 1}
              readOnly={field.read_only === 1}
              defaultValue={field.default}
              inputProps={{
                height: "28px",
                rounded: "md",
                ...methods.register(field.fieldname, {
                  required:
                    field.reqd === 1 ? `${field.label} is required` : false,
                }),
              }}
            />
          )}
          {methods.formState.errors[field?.fieldname] && (
            <p className="text-red-500 text-xs mt-1">
              {methods.formState.errors[field?.fieldname]?.message}
            </p>
          )}
        </div>
      );
    };

    // if (isLoading) return <FullPageLoader />;
    if (error) return <ErrorBanner error={error} />;

    return (
      <FormProvider {...methods}>
        <div className="border rounded-lg overflow-hidden mb-4">
          <button
            type="button"
            className="w-full flex justify-start gap-3 items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <ChevronDown /> : <ChevronUp />}
            <h5 className="font-medium text-md">{doctype}</h5>
          </button>

          {!isCollapsed && (
            <form
              onSubmit={methods.handleSubmit(onFormSubmit)}
              className="p-4 bg-white"
            >
              {taskData?.select_next_task_doer === 1 && (
                <UserSelect
                  field={{
                    fieldname: "next_task_assigned_to",
                    label: "Next Task Assigned To",
                    fieldtype: "Link",
                    options: "CG User",
                    reqd: 1,
                  }}
                  fieldProps={{
                    readOnly: false,
                  }}
                  onUserSelect={handleUserSelect}
                />
              )}

              <div className={`grid grid-cols-${columns.length} gap-6 w-full`}>
                {columns.map((colFields, colIdx) => (
                  <div
                    key={colIdx}
                    className="flex flex-col gap-4 p-6 rounded-md shadow-sm border border-gray-200"
                  >
                    {/* {console.log("colFields",colFields)} */}
                    {colFields.map((field) => {
                      // console.log("field",field)
                      if (
                        field.fieldtype === "Date" ||
                        field.fieldtype === "Datetime"
                      ) {
                        // return (
                        // <div>
                        // <DateFieldWrapper key={field.fieldname} field={field} />
                        // </div>
                        // )
                        // return (
                        //   <div key={field.fieldname}>
                        //     <label className="block text-sm font-medium text-gray-700">
                        //       {field.label}
                        //       {field.reqd && (
                        //         <span className="text-red-500">*</span>
                        //       )}
                        //     </label>
                        {
                          /* <CustomCalender
															date={methods.watch(field.fieldname) ? new Date(methods.watch(field.fieldname)) : undefined}
															onChange={(date) => {
																if (date) {
																	// Format the date as YYYY-MM-DD (Frappe/ERPNext standard format)
																	const formattedDate = format(date, 'yyyy-MM-dd');
																	methods.setValue(field.fieldname, formattedDate);
																}
															}}
															containerClassName="md:w-[20vw] border-none text-[#0076BD] p-0 bg-transparent"
                                        
														    Style={
																				"absolute -left-[90px] top-[-60px]"
																			}
															isTimeVisible={false}
														
															// containerClassName="w-full"
														/>
														{methods.formState.errors[field?.fieldname] && (
															<p className="text-red-500 text-xs mt-1">
																{methods.formState.errors[field?.fieldname]?.message}
															</p>
														)} */
                        }
                        {
                          /* <DatePickerValueComponent
                              id={field.fieldname}
                              onChange={(value) =>
                                methods.setValue(field.fieldname, value, {
                                  shouldValidate: true,
                                })
                              }
                              value={methods.watch(field.fieldname)}
                              required={field.reqd === 1}
                              readOnly={field.read_only === 1}
							  inputProps={{
                                ...methods.register(field.fieldname, {
                                  required: field.reqd === 1 ? `${field.label} is required` : false,
                                }),
                              }}
                            /> */
                        }
                        //   </div>

                        // );
                        return (
                          <div className="mb-4" key={field.fieldname}>
                            <DatePickerComponent field={field} />
                            {/* {methods.formState.errors[field?.fieldname] && (
															<p className="text-red-500 text-xs mt-1">
																{
																	methods?.formState.errors[field?.fieldname]
																		?.message
																}
															</p>
														)} */}
                          </div>
                        );
                      }

                      return (
                        <div key={field.fieldname}>
                          <DynamicField
                            field={field}
                            fieldProps={{
                              readOnly: field.fieldname === autoname,
                            }}
                          />
                          {/* {methods.formState.errors[field?.fieldname] && (
                        <p className="text-red-500 text-xs mt-1">
                          {methods.formState.errors[field?.fieldname]?.message}
                        </p>
                      )} */}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </form>
          )}
        </div>
      </FormProvider>
    );
  },
);

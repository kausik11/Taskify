import { useContext, useState } from "react";
import { Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import SheetWrapper from "../common/SheetWrapper";
import { useFrappeCreateDoc } from "frappe-react-sdk";
import { toast } from "sonner";
import { UserContext } from "@/utils/auth/UserProvider";
import { useFrappeData } from "@/utils/frappeapi/FrappeApiProvider";

// Define Zod schema for validation
const tagSchema = z.object({
  tags: z
    .array(
      z.object({
        tag_name: z
          .string()
          .min(1, "Tag name is required")
          .max(50, "Max 50 chars"),
      }),
    )
    .nonempty("At least one tag is required"),
});

// Infer TypeScript types from Zod schema
type TagFormData = {
  tags: {
    tag_name: string;
    company_id?: string;
  }[];
};

interface CreateTagSheetProps {
  onTagsCreated: () => void;
  mutate: () => void;
}

// Error toast function
export function showErrorToast(serverMessages: string) {
  try {
    const parsedData = JSON.parse(serverMessages);
    let messages: string[] = [];

    if (Array.isArray(parsedData)) {
      messages = parsedData.map((msg: string | { message: string }) => {
        const messageText = typeof msg === "string" ? msg : msg.message || "";
        return messageText.replace(/<[^>]+>/g, "");
      });
    } else if (parsedData && typeof parsedData === "object" && parsedData.message) {
      messages = [parsedData.message.replace(/<[^>]+>/g, "")];
    } else {
      throw new Error("Invalid server messages format");
    }

    const cleanedMessages = messages.join(" ").trim();
    toast.error(cleanedMessages || "An error occurred.");
  } catch (error) {
    console.error("Error parsing server messages:", error);
    toast.error("An unexpected error occurred.");
  }
}

const CreateTagSheet = ({ onTagsCreated, mutate }: CreateTagSheetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { companyDetails } = useContext(UserContext);
  const { refetchTags } = useFrappeData();
  const companyId =
    companyDetails && companyDetails.length > 0 ? companyDetails[0].name : null;

  const {
    control,
    handleSubmit,
    register,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TagFormData>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      tags: [{ tag_name: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "tags",
  });

  const { createDoc } = useFrappeCreateDoc<{
    tag_name: string;
    company_id: string;
    count: number;
  }>();

  const onSubmit = async (data: TagFormData) => {
    if (!companyId) {
      toast.error("Company ID not found");
      return;
    }

    const results: { tag: string; success: boolean; err?: string }[] = [];

    for (const tag of data.tags) {
      try {
        await createDoc("CG Tags", {
          tag_name: tag.tag_name.trim(),
          company_id: companyId,
          count: 0,
        });
        results.push({ tag: tag.tag_name, success: true });
      } catch (error: any) {
        console.error(`Error creating tag "${tag.tag_name}":`, {
          error,
          exc_type: error.exc_type,
          server_messages: error._server_messages,
        });

        let errorMessage = "Failed to create tag";

        // Handle DuplicateEntryError
        if (error.exc_type === "DuplicateEntryError") {
          errorMessage = `"${tag.tag_name}" already exists`;
          results.push({ tag: tag.tag_name, success: false, err: errorMessage });
        } else if (error._server_messages) {
          // Use showErrorToast for other server messages
          showErrorToast(error._server_messages);
          results.push({
            tag: tag.tag_name,
            success: false,
            err: error._server_messages,
          });
        } else {
          // Handle generic errors
          errorMessage = error.message || "An unexpected error occurred";
          results.push({ tag: tag.tag_name, success: false, err: errorMessage });
        }
      }
    }

    const created = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success);

    if (created > 0) {
      toast.success(`${created} ${created <= 1 ? "tag" : "tags"} created successfully`);
    }
    if (failed.length > 0) {
      failed.forEach((f) => {
        if (f.err !== f._server_messages) {
          toast.error(`${f.err}`);
        }
      });
    } else {
      // If no specific failures were recorded, check for generic error
      if (created === 0 && failed.length === 0) {
        toast.error("No tags were created. Please try again.");
      }
    }

    if (created > 0) {
      reset({ tags: [{ tag_name: "" }] });
      setIsOpen(false);
      onTagsCreated();
      mutate();
      // Also refetch tags in the global context for AddTaskSheet and other components
      refetchTags();
    }
  };

  return (
    <SheetWrapper
      heading="Add Tag"
      trigger="Add Tag +"
      isOpenSheet={isOpen}
      setIsOpenSheet={setIsOpen}
    >
      <div className="flex flex-col h-full">
        <form
          onSubmit={handleSubmit(onSubmit as (data: any) => Promise<void>)}
          className="flex-1"
        >
          <div className="w-full mt-4 flex flex-col gap-y-3">
            {fields.map((field, index) => (
              <div
                className="flex flex-row items-center justify-between"
                key={field.id}
              >
                <div className="w-full flex flex-row items-center gap-x-5">
                  <span className="text-[#5B5967] text-[14px] font-[600]">
                    Tag
                  </span>
                  <div className="flex flex-col w-[60%]">
                    <input
                      type="text"
                      placeholder="Enter Tag Name"
                      className="p-1.5 rounded-[8px] border-[1px] border-[#D0D3D9] outline-none"
                      {...register(`tags.${index}.tag_name`)}
                    />
                    {errors.tags?.[index]?.tag_name && (
                      <span className="text-red-500 text-sm">
                        {errors.tags[index]?.tag_name?.message}
                      </span>
                    )}
                  </div>
                </div>
                {fields.length > 1 && (
                  <button
                    type="button"
                    className="border-[2px] border-[#304156] p-1 rounded-full"
                    onClick={() => remove(index)}
                  >
                    <Trash2 color="#304156" className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div
            className="text-[#038EE2] text-[14px] mt-4 font-[600] cursor-pointer"
            onClick={() => append({ tag_name: "" })}
          >
            + Add New
          </div>
          {errors.tags && (
            <span className="text-red-500 text-sm mt-2">
              {errors.tags.message}
            </span>
          )}
          <div className="absolute bottom-0 right-0 border-t border-[#bbbbbb] flex items-center justify-end gap-x-3 bg-white w-full px-[30px] py-[24px]">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#038EE2] px-4 py-1.5 w-fit rounded-[8px] text-white font-[600] text-[14px] disabled:opacity-50"
            >
              {isSubmitting ? "Saving" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </SheetWrapper>
  );
};

export default CreateTagSheet;
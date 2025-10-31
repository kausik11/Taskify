import React from 'react';
import { useFrappeGetDocList } from 'frappe-react-sdk';

interface UserSelectProps {
  field: {
    fieldname: string;
    label: string;
    fieldtype: string;
    options: string;
    reqd: number;
  };
  fieldProps?: any;
  onUserSelect?: (value: string) => void;
  value?: string;
  disabled?: boolean;
  className?: string;
}

const UserSelect: React.FC<UserSelectProps> = ({
  field,
  fieldProps,
  onUserSelect,
  value,
  disabled = false,
  className = "",
}) => {
  const {
    data: users,
    isLoading,
    error,
  } = useFrappeGetDocList("CG User", {
    filters: [["enabled", "=", 1]],
    fields: ["name", "full_name", "email"],
    limit: 50,
    order_by: { field: "full_name", order: "asc" },
  });

  const options = React.useMemo(() => {
    return (
      users?.map((user) => ({
        value: user.email,
        label: user.full_name || user.email,
      })) || []
    );
  }, [users]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    if (onUserSelect) onUserSelect(selectedValue);
  };

  if (isLoading) {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">
          {field.label}
          {field.reqd && <span className="text-red-500">*</span>}
        </label>
        <div className="mt-1 p-3 text-sm text-gray-500">Loading users...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">
          {field.label}
          {field.reqd && <span className="text-red-500">*</span>}
        </label>
        <div className="mt-1 p-3 text-sm text-red-500">
          Error loading users: {error.message}
        </div>
      </div>
    );
  }

  // return (
  //   <div className={`mb-4 ${className}`}>
  //     <label className="block text-sm font-medium text-gray-700">
  //       {field.label}
  //       {field.reqd && <span className="text-red-500">*</span>}
  //     </label>
  //     <select
  //       className="mt-1 block w-full rounded-md shadow-sm text-sm min-h-12 bg-white border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 text-gray-900 placeholder-gray-400 transition duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
  //       onChange={handleChange}
  //       {...fieldProps}
  //       disabled={disabled}
  //       value={value || ""}
  //     >
  //       <option value="">Select a user</option>
  //       {options.map((option) => (
  //         <option key={option.value} value={option.value}>
  //           {option.label}
  //         </option>
  //       ))}
  //     </select>
  //   </div>
  // );
  return (
  <div className={`mb-4 rounded-md bg-blue-50 p-4 ${className}`}>
    <h3 className="text-sm font-semibold text-gray-800 mb-2 border-b border-gray-250 pb-2">
      Next Task Assigned To
      {field.reqd && <span className="text-red-500">*</span>}
    </h3>

    <div className="flex items-center justify-start py-2 gap-x-16">
      <span className="text-[14px] font-[600] ml-2">Select User</span>
      <select
        className="ml-6 rounded-md border bg-white py-1.5 text-sm text-gray-900 shadow-sm 
                   focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition duration-200 
                   disabled:bg-gray-100 disabled:cursor-not-allowed"
        onChange={handleChange}
        {...fieldProps}
        disabled={disabled}
        value={value || ""}
      >
        <option value="" className='text-gray-400'>Select a user</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  </div>
);

};

export default UserSelect;
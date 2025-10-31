import React, { useState, useMemo, useContext, useCallback } from "react";
import {
  ChevronDown,
  ChevronUp,
  Calendar,
  Filter,
  RefreshCw,
  Trash2,
  Clock,
  AlertTriangle,
  CircleDot,
} from "lucide-react";
import { useFrappeDeleteDoc } from "frappe-react-sdk";
import { CGBranch } from "@/types/ClapgrowApp/CGBranch";
import { CGHoliday } from "@/types/ClapgrowApp/CGHoliday";
import { UserContext } from "@/utils/auth/UserProvider";

// Types
interface Holiday {
  name: string;
  holiday_name: string;
  branch_id: string;
  holiday_type: string;
  is_recurring: boolean;
  holiday_date?: string;
  recurrence_type?: string;
  days_of_week?: string;
  week_occurrence?: string;
  recurrence_interval?: number;
  start_date: string;
  end_date?: string;
  applicable_for: string;
  color: string;
  is_optional: boolean;
  is_active: boolean;
  description?: string;
  auto_generated?: boolean;
  generated_dates?: Array<{
    holiday_date: string;
    day_name: string;
  }>;
}

interface Branch {
  name: string;
  branch_name: string;
  company_id: string;
  enable_holidays?: boolean;
  total_holidays?: number;
  active_holidays?: number;
}

interface BranchHolidayGroup {
  branch: Branch;
  holidays: Holiday[];
  upcomingCount: number;
  recurringCount: number;
}

interface HolidayActionMenuProps {
  holiday: Holiday;
  onDelete?: (holidayId: string) => void;
}

interface CityHolidays {
  city: string;
  holidays: Array<{
    name: string;
    date: string;
    description?: string;
  }>;
  recurringHolidays: Array<{
    repeat: string;
    unit: number;
    day: string;
    week_number?: string;
  }>;
}

interface HolidayTableProps {
  onEdit?: (holiday: Holiday) => void;
  onDelete?: (holidayId: string) => void;
  showActions?: boolean;
  branches?: Branch[];
  compactView?: boolean;
  cities?: CityHolidays[];
  holidayData?: CGHoliday[];
  branchData?: CGBranch[];
  holidaysLoading?: boolean;
  mutateHolidays?: () => void;
}

// Utility functions
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getUpcomingHolidays = (holidays: Holiday[], limit: number = 5) => {
  const today = new Date();
  const upcomingHolidays: Array<{
    date: string;
    holiday: Holiday;
    dayName: string;
  }> = [];

  holidays.forEach((holiday) => {
    if (holiday.is_recurring && holiday.generated_dates) {
      holiday.generated_dates
        .filter((date) => new Date(date.holiday_date) >= today)
        .slice(0, 3)
        .forEach((date) => {
          upcomingHolidays.push({
            date: date.holiday_date,
            holiday,
            dayName: date.day_name,
          });
        });
    } else if (
      holiday.holiday_date &&
      new Date(holiday.holiday_date) >= today
    ) {
      upcomingHolidays.push({
        date: holiday.holiday_date,
        holiday,
        dayName: new Date(holiday.holiday_date).toLocaleDateString("en-US", {
          weekday: "long",
        }),
      });
    }
  });

  return upcomingHolidays
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, limit);
};

// Action Menu Component
export const HolidayActionMenu = ({
  holiday,
  onDelete,
}: HolidayActionMenuProps) => {
  const [hovered, setHovered] = useState(false);

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${holiday.holiday_name}"?`)) {
      onDelete?.(holiday.name);
    }
  };

  return (
    <button
      onClick={handleDelete}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
    >
      <Trash2 className="w-4 h-4" />
      <span
        className={`transition-opacity duration-200 ${
          hovered ? "opacity-100" : "opacity-0"
        }`}
      >
        Delete
      </span>
    </button>
  );
};

// Branch Header Component
const BranchHeader = ({
  branchGroup,
  isExpanded,
  onToggle,
}: {
  branchGroup: BranchHolidayGroup;
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  const { branch, holidays, upcomingCount, recurringCount } = branchGroup;

  return (
    <div className="bg-gray-50 border-b border-gray-200">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            )}
          </div>

          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-900">
              {branch.branch_name}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {!branch.enable_holidays && (
            <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
              <AlertTriangle className="w-3 h-3" />
              <span>Disabled</span>
            </div>
          )}
        </div>
      </button>
    </div>
  );
};

// Holiday Row Component
const HolidayRow = ({
  holiday,
  showActions,
  onEdit,
  onDelete,
}: {
  holiday: Holiday;
  showActions?: boolean;
  onEdit?: (holiday: Holiday) => void;
  onDelete?: (holidayId: string) => void;
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const upcomingDates = useMemo(() => {
    if (!holiday.is_recurring || !holiday.generated_dates) return [];
    return holiday.generated_dates
      .filter((date) => new Date(date.holiday_date) >= new Date())
      .slice(0, 3);
  }, [holiday]);

  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-gray-900 truncate">
                  {holiday.holiday_name}
                </h4>
              </div>
              {holiday.description && (
                <p className="text-sm text-gray-600 truncate mt-0.5">
                  {holiday.description}
                </p>
              )}
            </div>
          </div>
        </td>

        <td className="px-6 py-4">
          {holiday.is_recurring ? (
            <div className="space-y-1">
              <div className="text-sm font-medium text-gray-900">
                {holiday.recurrence_type}
              </div>
              {holiday.days_of_week && (
                <div className="text-xs text-gray-600">
                  {holiday.days_of_week.split(",").join(", ")}
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-900">
              {holiday.holiday_date ? formatDate(holiday.holiday_date) : "—"}
            </div>
          )}
        </td>

        <td className="px-6 py-4">
          <div className="flex items-center justify-end gap-2">
            <HolidayActionMenu
              holiday={holiday}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        </td>
      </tr>

      {showDetails && (
        <tr className="bg-blue-50 border-t border-blue-100">
          <td colSpan={7} className="px-6 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h5 className="font-medium text-gray-900 flex items-center gap-2">
                  <CircleDot className="w-4 h-4 text-blue-600" />
                  Holiday Configuration
                </h5>

                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <div className="font-medium text-gray-900">
                        {holiday.holiday_type}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <div className="font-medium text-gray-900">
                        {holiday.is_active ? "Active" : "Inactive"}
                        {holiday.is_optional && " • Optional"}
                      </div>
                    </div>
                  </div>

                  {holiday.is_recurring && (
                    <div className="pt-2 border-t border-blue-200">
                      <span className="text-gray-500">Pattern:</span>
                      <div className="font-medium text-gray-900 mt-1">
                        {holiday.recurrence_type}
                        {holiday.week_occurrence &&
                          ` (${holiday.week_occurrence} week)`}
                        {holiday.recurrence_interval &&
                          ` every ${holiday.recurrence_interval} weeks`}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {holiday.is_recurring && upcomingDates.length > 0 && (
                <div className="space-y-3">
                  <h5 className="font-medium text-gray-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-green-600" />
                    Next Occurrences
                  </h5>
                  <div className="space-y-2">
                    {upcomingDates.map((date, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-blue-200"
                      >
                        <span className="text-sm font-medium text-gray-900">
                          {formatDate(date.holiday_date)}
                        </span>
                        <span className="text-sm text-gray-600">
                          {date.day_name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// Filter Controls Component
const HolidayTable: React.FC<HolidayTableProps> = ({
  onEdit,
  onDelete,
  showActions = true,
  branches: propBranches,
  compactView = false,
  cities,
  holidayData,
  branchData,
  holidaysLoading,
  mutateHolidays,
}) => {
  const { userDetails, rolePermissions, companyDetails } =
    useContext(UserContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(
    new Set(),
  );

  // Use passed data instead of fetching internally
  const branches = propBranches || branchData || [];
  const holidays = holidayData || [];
  const isLoading = holidaysLoading || false;
  const mutate = mutateHolidays || (() => {});

  const { deleteDoc, loading: isDeleting } = useFrappeDeleteDoc();

  // Group holidays by branch
  const branchGroups = useMemo((): BranchHolidayGroup[] => {
    if (!holidays || !branches) return [];

    return branches
      .map((branch) => {
        const branchHolidays = holidays.filter(
          (holiday) => holiday.branch_id === branch.name,
        );

        // Apply filters
        const filteredHolidays = branchHolidays.filter((holiday) => {
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesName = holiday.holiday_name
              .toLowerCase()
              .includes(query);
            const matchesBranch = branch.branch_name
              .toLowerCase()
              .includes(query);
            const matchesDescription = holiday.description
              ?.toLowerCase()
              .includes(query);
            if (!matchesName && !matchesBranch && !matchesDescription)
              return false;
          }

          return true;
        });

        const upcomingHolidays = getUpcomingHolidays(filteredHolidays);
        const recurringCount = filteredHolidays.filter(
          (h) => h.is_recurring,
        ).length;

        return {
          branch,
          holidays: filteredHolidays,
          upcomingCount: upcomingHolidays.length,
          recurringCount,
        };
      })
      .filter((group) => group.holidays.length > 0);
  }, [holidays, branches, searchQuery]);

  const totalResults = branchGroups.reduce(
    (sum, group) => sum + group.holidays.length,
    0,
  );
  const totalHolidays = holidays?.length || 0;

  const handleDelete = useCallback(
    async (holidayId: string) => {
      try {
        // Truncate holiday ID if it's too long
        const truncatedId =
          holidayId.length > 140 ? holidayId.substring(0, 140) : holidayId;

        await deleteDoc("CG Holiday", truncatedId);
        mutate(); // Use the passed mutate function
        if (onDelete) onDelete(holidayId);
      } catch (error) {
        console.error("Error deleting holiday:", error);
        // Show user-friendly error message
        alert(
          "Failed to delete holiday. Please try again or contact support if the issue persists.",
        );
      }
    },
    [deleteDoc, mutate, onDelete],
  );

  const toggleBranchExpansion = useCallback((branchId: string) => {
    setExpandedBranches((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(branchId)) {
        newSet.delete(branchId);
      } else {
        newSet.add(branchId);
      }
      return newSet;
    });
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-3" />
          <span className="text-gray-600 font-medium">
            Loading holiday data...
          </span>
        </div>
      </div>
    );
  }

  if (totalHolidays === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="text-center py-16">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Holidays Configured
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Get started by creating your first holiday. You can set up both
            recurring patterns and one-time holidays for your branches.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {totalResults === 0 ? (
        <div className="text-center py-12">
          <Filter className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No holidays match your filters
          </h3>
          <p className="text-gray-600 mb-4">
            Try adjusting your search criteria or filters to find holidays.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedBranch("");
            }}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="overflow-hidden">
          {branchGroups.map((branchGroup, index) => (
            <div
              key={branchGroup.branch.name}
              className="mb-8 border-b border-gray-100 last:border-b-0 last:mb-0 shadow-sm"
            >
              <BranchHeader
                branchGroup={branchGroup}
                isExpanded={expandedBranches.has(branchGroup.branch.name)}
                onToggle={() => toggleBranchExpansion(branchGroup.branch.name)}
              />

              {expandedBranches.has(branchGroup.branch.name) && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Holiday Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Schedule
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {branchGroup.holidays.map((holiday) => (
                        <HolidayRow
                          key={holiday.name}
                          holiday={holiday}
                          showActions={
                            showActions &&
                            (rolePermissions?.holiday_edit ||
                              rolePermissions?.holiday_delete)
                          }
                          onEdit={onEdit}
                          onDelete={handleDelete}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isDeleting && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-lg">
            <RefreshCw className="w-5 h-5 animate-spin text-orange-600" />
            <span className="text-gray-700 font-medium">
              Processing deletion...
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default HolidayTable;

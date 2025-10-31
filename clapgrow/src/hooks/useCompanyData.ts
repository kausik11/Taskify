import { useState, useMemo } from "react";
import { useFrappeGetDocList } from "frappe-react-sdk";
import { CGCompany } from "@/types/ClapgrowApp/CGCompany";
import { CGUser } from "@/types/ClapgrowApp/CGUser";
import { CompanyState } from "@/types/userContext";

export const useCompanyData = (userDetails: CGUser[] | null) => {
  const [manualCompanyDetails, setManualCompanyDetails] = useState<
    CGCompany[] | null
  >(null);

  const companyFilters = useMemo(() => {
    if (userDetails?.[0]?.company_id) {
      return [["name", "=", userDetails[0].company_id]] as const;
    }
    return [];
  }, [userDetails]);

  const shouldFetch = !!companyFilters.length;

  const {
    data: companyData,
    error: companyError,
    isLoading,
  } = useFrappeGetDocList<CGCompany>(
    "CG Company",
    {
      fields: ["name", "company_logo", "is_trial", "creation"],
      filters: companyFilters as any,
    },
    shouldFetch ? undefined : null,
  );

  const companyState: CompanyState = useMemo(
    () => ({
      details: manualCompanyDetails || companyData || null,
      isLoading,
      error: companyError
        ? companyError.message || "Failed to fetch company data"
        : null,
    }),
    [companyData, companyError, isLoading, manualCompanyDetails],
  );

  return {
    companyState,
    setCompanyDetails: setManualCompanyDetails,
  };
};

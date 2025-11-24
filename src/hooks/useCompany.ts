import { useApiClient } from "./useApiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Company {
  _id: string;
  company_name: string;
  company_code: string;
  city: string;
  company_status: "approved" | "pending" | "revoked";
  created_at: string;
  updated_at: string;
}

export interface CompanyUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  sub_role: string;
  status: string;
}

// Hook to fetch all companies (Super Admin)
export function useCompanies() {
  const { fetchWithAuth } = useApiClient();

  const {
    data: companies,
    isLoading: loading,
    error,
  } = useQuery<Company[]>({
    queryKey: ["companies"],
    queryFn: async () => {
      const response = await fetchWithAuth("/company");
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch companies");
      }
      return data.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return { companies, loading, error };
}

// Hook to fetch a single company by ID
export function useCompany(companyId?: string) {
  const { fetchWithAuth } = useApiClient();

  const {
    data: company,
    isLoading: loading,
    error,
  } = useQuery<Company>({
    queryKey: ["company", companyId],
    queryFn: async () => {
      if (!companyId) throw new Error("Company ID is required");
      const response = await fetchWithAuth(`/company/view/${companyId}?type=company_id`);
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch company details");
      }
      return data.data;
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  });

  return { company, loading, error };
}

// Hook to fetch users of a specific company
export function useCompanyUsers(companyId?: string) {
  const { fetchWithAuth } = useApiClient();

  const {
    data: users,
    isLoading: loading,
    error,
  } = useQuery<CompanyUser[]>({
    queryKey: ["company-users", companyId],
    queryFn: async () => {
      if (!companyId) throw new Error("Company ID is required");
      // Based on chat: "company/get_users" or similar.
      // Assuming /company/:id/users or /company/get_users?id=...
      // The chat said: "enpoint is company/get_users ig"
      const response = await fetchWithAuth(`/company/get_users?company_id=${companyId}`);
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch company users");
      }
      return data.data;
    },
    enabled: !!companyId,
  });

  return { users, loading, error };
}

// Hook to update company status (Super Admin)
export function useUpdateCompanyStatus() {
  const { fetchWithAuth } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId, status }: { companyId: string; status: string }) => {
      const response = await fetchWithAuth("/company/change_status", {
        method: "PUT", // or POST, assuming PUT for update
        body: JSON.stringify({ company_id: companyId, status }),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to update company status");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["company"] });
    },
  });
}

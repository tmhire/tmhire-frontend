import { useApiClient } from "./useApiClient";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

export interface ProfileData {
  _id: string;
  email: string;
  name: string;
  contact: number;
  company: string;
  city: string;
  created_at: string;
  preferred_format: string;
  custom_start_hour: number;
}

async function fetchProfile(fetchWithAuth: ReturnType<typeof useApiClient>["fetchWithAuth"]) {
  const response = await fetchWithAuth("/auth/profile");
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || "Failed to fetch profile");
  }
  return data.data;
}

export function useProfile() {
  const { fetchWithAuth } = useApiClient();
  const { status } = useSession();

  const { data: profile, isLoading: loading, error } = useQuery<ProfileData>({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(fetchWithAuth),
    enabled: status === "authenticated",
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  return { profile, loading, error };
}
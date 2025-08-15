import { useApiClient } from "./useApiClient";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

export interface ProfileData {
  _id: string;
  email: string;
  name: string;
  new_user: boolean;
  contact: number;
  company: string;
  city: string;
  preferred_format: "12h" | "24h";
  custom_start_hour: number;
  created_at: string;
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

  const {
    data: profile,
    isLoading: loading,
    error,
  } = useQuery<ProfileData>({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(fetchWithAuth),
    enabled: status === "authenticated", // Only fetch when user is authenticated    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep cache for 30 minutes
  });

  return { profile, loading, error };
}

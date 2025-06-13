import { useApiClient } from "./useApiClient";
import { useEffect, useState } from "react";

interface ProfileData {
  _id: string;
  email: string;
  name: string;
  contact: number;
  company: string;
  city: string;
  created_at: string;
}

export function useProfile() {
  const { fetchWithAuth } = useApiClient();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetchWithAuth("/auth/profile");
        const data = await response.json();
        if (data.success) {
          setProfile(data.data);
        } else {
          setError(data.message || "Failed to fetch profile");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [fetchWithAuth]);

  return { profile, loading, error };
} 
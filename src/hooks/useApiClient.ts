import { useSession, signOut } from "next-auth/react";
import { jwtDecode } from "jwt-decode";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export function useApiClient() {
  const { data: session, status, update } = useSession();

  const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
    // Wait for session to be ready
    if (status === "loading") {
      throw new Error("Session is loading");
    }

    if (!session) {
      throw new Error("Not authenticated");
    }

    let accessToken = session.backendAccessToken;
    let refreshToken = session.backendRefreshToken;
    const expiresAt = session.backendAccessTokenExpires;

    // If expired, refresh
    if (expiresAt && Date.now() > expiresAt) {
      console.log("Access token expired. Refreshing...");

      try {
        const res = await fetch(`${BACKEND_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!res.ok) {
          console.error("Refresh failed. Logging out.");
          await signOut(); // if refresh fails
          throw new Error("Session refresh failed");
        }

        const data = await res.json();
        accessToken = data?.data?.access_token;
        refreshToken = data?.data?.refresh_token;

        if (!accessToken || !refreshToken) {
          throw new Error("Invalid refresh response");
        }

        // Decode new expiry
        const decoded = jwtDecode<{ exp: number }>(accessToken);
        const newExpires = decoded.exp * 1000;

        const decoded_refresh = jwtDecode<{ exp: number }>(refreshToken);
        const refreshExpires = decoded_refresh.exp * 1000;

        // Update session
        await update({
          ...session,
          backendAccessToken: accessToken,
          backendAccessTokenExpires: newExpires,
          backendRefreshToken: refreshToken,
          backendRefreshTokenExpires: refreshExpires,
        });
      } catch (err) {
        console.error("Session refresh failed:", err);
        await signOut();
        throw new Error("Session refresh failed");
      }
    }

    // Now use the valid token to call API
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response;
  };

  return { fetchWithAuth };
}

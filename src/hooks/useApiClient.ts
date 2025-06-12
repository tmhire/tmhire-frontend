import { useSession, signOut } from "next-auth/react";
import { jwtDecode } from "jwt-decode";

export function useApiClient() {
  const { data: session, status, update } = useSession();
  const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

  const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
    console.log("status", status);
    if (status === "loading" || !session) {
      // Wait for up to 2 seconds for the session to load
      await new Promise((resolve) => setTimeout(resolve, 10000));
      return null;
    }
    if (status !== "authenticated") throw new Error("Not authenticated");

    let accessToken = session.backendAccessToken;
    let refreshToken = session.backendRefreshToken;
    const expiresAt = session.backendAccessTokenExpires;

    // If expired, refresh
    if (expiresAt) {
      if (Date.now() > expiresAt) {
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
            return;
          }

          const data = await res.json();
          accessToken = data?.data?.access_token;
          refreshToken = data?.data?.refresh_token;

          if (accessToken && refreshToken) {
            // Decode new expiry
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const decoded: any = jwtDecode(accessToken);
            const newExpires = decoded.exp * 1000;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const decoded_refresh: any = jwtDecode(refreshToken);
            const refreshExpires = decoded_refresh * 1000;

            // Update session manually
            await update({
              backendAccessToken: accessToken,
              backendAccessTokenExpires: newExpires,
              backendRefreshToken: refreshToken || session.backendRefreshToken,
              backendRefreshTokenExpires: refreshExpires,
            });
          }
        } catch (err) {
          console.error("Session refresh failed:", err);
          signOut(); // Log out the user if refresh fails
        }
      }
    }

    console.log(`${BACKEND_URL}${endpoint}`, options);
    // Now use the valid token to call API
    return fetch(`${BACKEND_URL}${endpoint}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
  };

  return { fetchWithAuth };
}

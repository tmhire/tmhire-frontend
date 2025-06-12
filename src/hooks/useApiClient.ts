import { useSession, signOut } from "next-auth/react";
import { jwtDecode } from "jwt-decode";

export function useApiClient() {
  const { data: session, update } = useSession();

  const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
    if (!session) throw new Error("Not authenticated");

    let accessToken = session.backendAccessToken;
    let refreshToken = session.backendRefreshToken;
    const expiresAt = session.backendAccessTokenExpires;

    // If expired, refresh
    if (expiresAt) {
      if (Date.now() > expiresAt) {
        console.log("Access token expired. Refreshing...");

        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/refresh`, {
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

    // Now use the valid token to call API
    return fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${endpoint}`, {
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

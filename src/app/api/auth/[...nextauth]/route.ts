import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { jwtDecode } from "jwt-decode";

// Configure backend API URL from environment or use default
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

/**
 * Safely sends the Google token to the backend and gets an access token
 */
interface AuthProps {
  id: string;
  name: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

async function handleEmailPassword(
  user: {
    email?: string;
    password?: string;
    name?: string;
  },
  isSignup = false
): Promise<AuthProps | null> {
  if (!user?.email || !user?.password) {
    console.log("Email or password is not provided");
    return null;
  }

  const endPoint = isSignup ? "auth/signup" : "auth/signin";
  console.log(`Calling ${endPoint} endpoint from backend`);
  try {
    const response = await fetch(`${BACKEND_URL}/${endPoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "applicat",
      },
      body: JSON.stringify(user),
    });

    console.log(`Signin/Signup backend response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend auth error (${response.status}): ${errorText}`);
      return null;
    }

    //Parse the response
    const json = await response.json();

    // Validate the response structure
    if (!json?.data?.access_token || !json?.data?.token_type || !json?.data?.refresh_token) {
      console.error("Backend response missing required token fields:", json);
      return null;
    }

    console.log("Successfully obtained backend token", json.data);
    return {
      id: json?.data?.id,
      name: json?.data?.name,
      email: json?.data?.email,
      accessToken: json?.data?.access_token,
      refreshToken: json?.data?.refresh_token,
      tokenType: json?.data?.token_type,
    };
  } catch (error) {
    console.error("Failed to exchange token with backend:", error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function exchangeGoogleToken(idToken: string): Promise<AuthProps | null> {
  console.log("Exchanging Google ID token for backend access token");

  try {
    const response = await fetch(`${BACKEND_URL}/auth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        token: idToken,
      }),
    });

    console.log(`Backend response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend auth error (${response.status}): ${errorText}`);
      return null;
    }

    // Parse the response
    const data = await response.json();

    // Validate the response structure
    if (!data?.data?.access_token || !data?.data?.token_type || !data?.data?.refresh_token) {
      console.error("Backend response missing required token fields:", data);
      return null;
    }

    console.log("Successfully obtained backend token");
    return {
      id: "",
      name: "",
      email: "",
      accessToken: data?.data?.access_token,
      refreshToken: data?.data?.refresh_token,
      tokenType: data?.data?.token_type,
    };
  } catch (error) {
    console.error("Failed to exchange token with backend:", error instanceof Error ? error.message : String(error));
    return null;
  }
}

const handler = NextAuth({
  providers: [
    //Google
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    //Signin
    CredentialsProvider({
      id: "signin",
      name: "signin",
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const result = await handleEmailPassword({ email: credentials?.email, password: credentials?.password });
        if (!result) {
          return null;
        }
        return result;
      },
    }),
    //Signup
    CredentialsProvider({
      id: "signup",
      name: "signup",
      credentials: {
        email: {},
        password: {},
        name: {},
      },
      async authorize(credentials) {
        const result = await handleEmailPassword(
          {
            email: credentials?.email,
            password: credentials?.password,
            name: credentials?.name,
          },
          true
        );
        if (!result) {
          return null;
        }
        return result;
      },
    }),
  ],
  pages: {
    signIn: "/signin",
    error: "/signup",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (user === null) {
        return false;
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // Initial sign in
      console.log("User", user);
      if (account && user) {
        // Store the user ID in the token
        token.userId = user.id;
        console.log("User ID: ", user.id);
        console.log("Token User ID: ", token.userId);
        // Handle Google authentication specifically
        if (account.provider === "google" && account.id_token) {
          // Exchange the Google token for a backend token
          const backendAuth = await exchangeGoogleToken(account.id_token);

          if (backendAuth) {
            // Store the backend tokens in the JWT
            token.backendAccessToken = backendAuth.accessToken;
            token.backendRefreshToken = backendAuth.refreshToken;
            token.backendTokenType = backendAuth.tokenType;

            // Decode access token to store expiration
            const decoded: any = jwtDecode(backendAuth.accessToken);
            token.backendAccessTokenExpires = decoded.exp * 1000; // store in ms

            // Decode refresh token to store expiration
            const decoded_refresh: any = jwtDecode(backendAuth.refreshToken);
            token.backendRefreshTokenExpires = decoded_refresh.exp * 1000; // store in ms
          } else {
            throw new Error("BackendAuthFailed");
          }
        } else {
          if (!user || !user.accessToken || !user.refreshToken) {
            console.log("Email/password authentication failed. User: ", user);
            throw new Error("Authentication failed");
          }
          token.backendAccessToken = user.accessToken;
          token.backendRefreshToken = user.refreshToken;
          token.backendTokenType = user.tokenType;

          // Decode access token to store expiration
          const decoded: any = jwtDecode(user.accessToken);
          token.backendAccessTokenExpires = decoded.exp * 1000; // store in ms

          // Decode refresh token to store expiration
          const decoded_refresh: any = jwtDecode(user.refreshToken);
          token.backendRefreshTokenExpires = decoded_refresh.exp * 1000; // store in ms
        } // Refreshing the access token manually
        if (token.backendAccessTokenExpires) {
          if (Date.now() > ((token.backendAccessTokenExpires as number) || 0)) {
            console.log("Access token expired, attempting refresh");

            try {
              const res = await fetch(`${process.env.BACKEND_URL}/auth/refresh`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ refresh_token: token.backendRefreshToken }),
              });

              const json = await res.json();

              if (res.ok && json?.data?.access_token) {
                token.backendAccessToken = json.data.access_token;

                const decoded: any = jwtDecode(json.data.access_token);
                token.backendAccessTokenExpires = decoded.exp * 1000;

                // Refresh token rotation (optional)
                token.backendRefreshToken = json.data.refresh_token || token.backendRefreshToken;
                const decoded_refresh: any = jwtDecode(token.backendRefreshToken as string);
                token.backendRefreshTokenExpires = decoded_refresh.exp * 1000; // store in ms
              } else {
                throw new Error("Failed to refresh token");
              }
            } catch (error) {
              console.log("Token refresh error", error);
              // Force logout if refresh fails
              throw new Error("Failed to refresh token");
            }
          }
        }
      }
      console.log("token", token);
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      if (session.user) {
        // Add user ID to the session
        session.user.id = token.userId as string;
        console.log(`Session : ${session}`);
        // Add backend access token to the session
        session.backendAccessToken = token.backendAccessToken as string;
        session.backendAccessTokenExpires = token.backendAccessTokenExpires as number;
        session.backendRefreshToken = token.backendRefreshToken as string;
        session.backendTokenType = token.backendTokenType as string;

        // Log authentication status
        const hasToken = !!token.backendAccessToken;
        console.log(`Session authentication status: ${hasToken ? "Authenticated" : "Not authenticated"} with backend`);
      }

      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
  // Increase JWT session lifetime
  session: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    // You can customize this if needed
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
});

export { handler as GET, handler as POST };

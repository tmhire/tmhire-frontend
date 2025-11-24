import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { jwtDecode } from "jwt-decode";
import type { JWT } from "next-auth/jwt";
import type { Account, Session, User } from "next-auth";
import type { AdapterUser } from "next-auth/adapters";

// Configure backend API URL from environment or use default
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

/**
 * Safely sends the Google token to the backend and gets an access token
 */
interface AuthProps {
  id: string;
  name: string;
  email: string;
  new_user: boolean;
  company_name: string;
  company_id?: string;
  company_code?: string;
  city: string;
  contact: number;
  role?: string;
  sub_role?: "viewer" | "editor";
  company_status?: "pending" | "approved" | "revoked";
  account_status?: "pending" | "approved" | "revoked";
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  preferred_format: "12h" | "24h";
  custom_start_hour: number;
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
  try {
    const response = await fetch(`${BACKEND_URL}/${endPoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
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
    const res: AuthProps = {
      id: json?.data?.id,
      name: json?.data?.name,
      email: json?.data?.email,
      new_user: json?.data?.new_user === true || false,
      company_name: json?.data?.company_name || "",
      company_id: json?.data?.company_id,
      company_code: json?.data?.company_code,
      city: json?.data?.city || "",
      contact: json?.data?.contact || undefined,
      role: json?.data?.role,
      sub_role: json?.data?.sub_role,
      company_status: json?.data?.company_status,
      account_status: json?.data?.account_status,
      accessToken: json?.data?.access_token,
      refreshToken: json?.data?.refresh_token,
      tokenType: json?.data?.token_type,
      preferred_format: json?.data?.preferred_format || "12h",
      custom_start_hour: json?.data?.custom_start_hour || 0,
    };
    console.log(res);
    return res;
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
      new_user: data?.data?.new_user === true || false,
      company_name: data?.data?.company_name || "",
      company_id: data?.data?.company_id,
      company_code: data?.data?.company_code,
      city: data?.data?.city || "",
      contact: data?.data?.contact || undefined,
      role: data?.data?.role,
      sub_role: data?.data?.sub_role,
      company_status: data?.data?.company_status,
      account_status: data?.data?.account_status,
      accessToken: data?.data?.access_token,
      refreshToken: data?.data?.refresh_token,
      tokenType: data?.data?.token_type,
      preferred_format: data?.data?.refresh_token,
      custom_start_hour: data?.data?.token_type,
    };
  } catch (error) {
    console.error("Failed to exchange token with backend:", error instanceof Error ? error.message : String(error));
    return null;
  }
}

// interface TokenData {
//   exp: number;
//   [key: string]: unknown;
// }

export const authOptions: AuthOptions = {
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
    async signIn({ user }: { user: User | AdapterUser }): Promise<boolean> {
      if (user === null) {
        return false;
      }
      return true;
    },
    async jwt({
      token,
      user,
      account,
      trigger,
      session,
    }: {
      token: JWT;
      user?: User | AdapterUser;
      account?: Account | null;
      trigger?: string;
      session?: Session;
    }): Promise<JWT> {
      console.log("Initial sign in with session:", session, trigger);

      if (trigger === "update" && session) {
        console.log("Updating JWT with session data:", session);
        // ✅ Persist updated tokens into JWT after session.update()
        token.backendAccessToken = session.backendAccessToken;
        token.backendAccessTokenExpires = session.backendAccessTokenExpires;
        token.backendRefreshToken = session.backendRefreshToken;
        token.backendRefreshTokenExpires = session.backendRefreshTokenExpires;
        token.backendTokenType = session.backendTokenType;
        if (session?.new_user !== undefined && session.new_user !== null) token.new_user = session.new_user === true;
        if (session?.company_name) token.company_name = session.company_name;
        if (session?.company_id) token.company_id = session.company_id;
        if (session?.company_code) token.company_code = session.company_code;
        if (session?.city) token.city = session.city;
        if (session?.contact) token.contact = session.contact;
        if (session?.role) token.role = session.role;
        if (session?.sub_role) token.sub_role = session.sub_role;
        if (session?.company_status) token.company_status = session.company_status;
        if (session?.account_status) token.account_status = session.account_status;
        if (session?.preferred_format) token.preferred_format = session.preferred_format;
        if (session?.custom_start_hour !== undefined && session.custom_start_hour !== null)
          token.custom_start_hour = session.custom_start_hour;
        console.log("Updated JWT token:", token);
        return token;
      }
      console.log("JWT callback triggered with user:", user, "and account:", account);
      // Initial sign in
      if (account && user) {
        console.log("Initial sign in with user:", account, user);
        // Store the user ID in the token
        token.userId = user.id;
        // Store user's name and image
        token.name = user.name;
        token.image = user.image;
        // Handle Google authentication specifically
        if (account.provider === "google" && account.id_token) {
          // Exchange the Google token for a backend token
          const backendAuth = await exchangeGoogleToken(account.id_token);
          console.log("Initial sign in with backendAuth:", backendAuth);

          if (backendAuth) {
            // Store the backend tokens in the JWT
            token.backendAccessToken = backendAuth.accessToken;
            token.backendRefreshToken = backendAuth.refreshToken;
            token.backendTokenType = backendAuth.tokenType;
            token.new_user = backendAuth.new_user === true;
            token.company_name = backendAuth.company_name;
            token.company_id = backendAuth.company_id;
            token.company_code = backendAuth.company_code;
            token.city = backendAuth.city;
            token.contact = backendAuth.contact;
            token.role = backendAuth.role;
            token.sub_role = backendAuth.sub_role;
            token.company_status = backendAuth.company_status;
            token.account_status = backendAuth.account_status;
            token.preferred_format = backendAuth.preferred_format;
            token.custom_start_hour = backendAuth.custom_start_hour;

            // Decode access token to store expiration
            const decoded = jwtDecode<{ exp: number }>(backendAuth.accessToken);
            token.backendAccessTokenExpires = decoded.exp * 1000; // store in ms

            // Decode refresh token to store expiration
            const decoded_refresh = jwtDecode<{ exp: number }>(backendAuth.refreshToken);
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
          token.new_user = user.new_user === true;
          token.company_name = user.company_name;
          token.company_id = user.company_id;
          token.company_code = user.company_code;
          token.city = user.city;
          token.contact = user.contact;
          token.role = user.role;
          token.sub_role = user.sub_role;
          token.company_status = user.company_status;
          token.account_status = user.account_status;
          token.preferred_format = user.preferred_format;
          token.custom_start_hour = user.custom_start_hour;

          // Decode access token to store expiration
          const decoded = jwtDecode<{ exp: number }>(user.accessToken);
          token.backendAccessTokenExpires = decoded.exp * 1000; // store in ms

          // Decode refresh token to store expiration
          const decoded_refresh = jwtDecode<{ exp: number }>(user.refreshToken);
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

                const decoded = jwtDecode<{ exp: number }>(json.data.access_token);
                token.backendAccessTokenExpires = decoded.exp * 1000;

                // Refresh token rotation (optional)
                token.backendRefreshToken = json.data.refresh_token || token.backendRefreshToken;
                const decoded_refresh = jwtDecode<{ exp: number }>(token.backendRefreshToken as string);
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
    async session({ session, token }: { session: Session; token: JWT }): Promise<Session> {
      // Send properties to the client
      if (session.user) {
        // Add user ID to the session
        session.user.id = token.userId as string;
        // Add user's name and image
        session.user.name = token.name as string;
        session.user.image = token.image as string;
        console.log(`Session : ${session}`);
        // Add backend access token to the session
        session.backendAccessToken = token.backendAccessToken as string;
        session.backendAccessTokenExpires = token.backendAccessTokenExpires as number;
        session.backendRefreshToken = token.backendRefreshToken as string;
        session.backendTokenType = token.backendTokenType as string;
        console.log("New User", token.new_user);
        session.new_user = token.new_user === true;
        session.company_name = token.company_name as string;
        session.company_id = token.company_id as string;
        session.company_code = token.company_code as string;
        session.city = token.city as string;
        session.contact = token.contact as number;
        session.role = token.role as string;
        session.sub_role = token.sub_role as "viewer" | "editor";
        session.company_status = token.company_status as "pending" | "approved" | "revoked";
        session.account_status = token.account_status as "pending" | "approved" | "revoked";
        session.preferred_format = token.preferred_format as "12h" | "24h";
        session.custom_start_hour = token.custom_start_hour as number;

        // Log authentication status
        const hasToken = !!token.backendAccessToken;
        console.log(`Session authentication status: ${hasToken ? "Authenticated" : "Not authenticated"} with backend`);
      }

      console.log("Session: ", session);
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
};

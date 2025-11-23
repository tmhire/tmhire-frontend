import type { DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session extends DefaultSession {
    new_user: boolean;
    company?: string;
    city?: string;
    contact?: number;
    role?: string;
    sub_role?: string;
    status?: string;
    company_id?: string;
    backendAccessToken?: string;
    backendAccessTokenExpires?: number;
    backendRefreshToken?: string;
    backendRefreshTokenExpires?: number;
    backendTokenType?: string;
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    } & DefaultSession["user"];
    preferred_format: "12h" | "24h";
    custom_start_hour: number;
  }

  interface User {
    id: string;
    new_user: boolean;
    name: string;
    email: string;
    company?: string;
    city?: string;
    contact?: number;
    role?: string;
    sub_role?: string;
    status?: string;
    company_id?: string;
    image?: string | null;
    accessToken?: string;
    refreshToken?: string;
    tokenType?: string;
    preferred_format: "12h" | "24h";
    custom_start_hour: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    backendAccessToken?: string;
    backendRefreshToken?: string;
    backendTokenType?: string;
    userId?: string;
    new_user?: boolean;
    company?: string;
    city?: string;
    contact?: number;
    backendAccessTokenExpires?: number;
    backendRefreshTokenExpires?: number;
  }
}

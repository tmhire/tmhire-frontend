import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    new_user;
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
    };
  }

  interface User {
    id: string;
    new_user: boolean;
    name: string;
    email: string;
    image?: string | null;
    accessToken?: string | null;
    refreshToken?: string | null;
    tokenType?: string | null;
  }

  interface JWT {
    backendAccessToken?: string;
    backendTokenType?: string;
    userId?: string;
  }
}

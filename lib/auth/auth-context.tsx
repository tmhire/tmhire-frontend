"use client";

import { SessionProvider } from "next-auth/react";
import { createContext, useContext, useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

interface UserType {
  id?: string;
  name?: string;
  email?: string;
  picture?: string;
  image?: string;
}

interface AuthHeaders {
  Authorization: string;
}

interface AuthContextValue {
  user: UserType | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  getAuthHeader: () => AuthHeaders | Record<string, never>;
  backendAccessToken: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthContextProvider>{children}</AuthContextProvider>
    </SessionProvider>
  );
}

function AuthContextProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<UserType | null>(null);
  const [backendAccessToken, setBackendAccessToken] = useState<string | null>(null);
  const isLoading = status === "loading";
  const isAuthenticated = !!session?.user;

  useEffect(() => {
    if (session?.user) {
      console.log(session.user)
      setUser(session.user as UserType);
      
      // @ts-expect-error - Custom property added by our callback
      if (session.backendAccessToken) {
        // @ts-expect-error - Custom property
        setBackendAccessToken(session.backendAccessToken);
      }
    } else {
      setUser(null);
      setBackendAccessToken(null);
    }
  }, [session]);

  const signInWithGoogle = async () => {
    await signIn("google", { callbackUrl: "/dashboard" });
  };

  const logout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const getAuthHeader = () => {
    // @ts-expect-error - Custom property
    if (session?.backendAccessToken) {
      // @ts-expect-error - Custom property
      return { Authorization: `Bearer ${session.backendAccessToken}` } as AuthHeaders;
    }
    return {} as Record<string, never>;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        signInWithGoogle,
        logout,
        getAuthHeader,
        backendAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
} 
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
// import { useRouter, usePathname } from "next/navigation";
import { SessionProvider } from "next-auth/react";

interface AuthContextType {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // const router = useRouter();
  // const pathname = usePathname();

  useEffect(() => {
    // Check if user is authenticated
    const authStatus = localStorage.getItem("isAuthenticated");
    if (authStatus === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  // useEffect(() => {
  //   // Handle routing based on authentication status
  //   if (isAuthenticated && pathname === '/signin') {
  //     router.push('/');
  //   } else if (!isAuthenticated && pathname !== '/signin') {
  //     router.push('/signin');
  //   }
  // }, [isAuthenticated, pathname, router]);

  const login = () => {
    setIsAuthenticated(true);
    localStorage.setItem("isAuthenticated", "true");
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("isAuthenticated");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      <SessionProvider>{children}</SessionProvider>
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

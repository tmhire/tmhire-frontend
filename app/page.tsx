"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  return null; // No UI needed as we're redirecting
}

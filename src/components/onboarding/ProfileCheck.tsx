"use client";

import { useProfile } from "@/hooks/useProfile";
import WelcomeModal from "./WelcomeModal";
import { useSession } from "next-auth/react";

export default function ProfileCheck() {
  const { profile, loading } = useProfile();
  const { status } = useSession();

  // Wait for both session and profile to load
  if (loading || status === "loading") return null;

  // Show welcome modal if:
  // 1. User is authenticated AND
  // 2. Profile is loaded but company is missing
  if (status === "authenticated" && !profile?.company) {
    return (
      <>
        <div className="dark:bg-gray-800 bg-gray-200 p-3 dark:text-brand-300 text-brand-800 text-sm text-right">
          Welcome! Let&apos;s get you started.
        </div>
        <WelcomeModal />
      </>
    );
  }

  return null;
}
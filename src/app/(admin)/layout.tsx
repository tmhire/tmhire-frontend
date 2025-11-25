"use client";

import React, { useContext } from "react";
import { useSession } from "next-auth/react";
import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import { Spinner } from "@/components/ui/spinner";
import { ThemeContext } from "@/context/ThemeContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const themeContext = useContext(ThemeContext);

  const { data: session, status } = useSession();

  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
      ? "lg:ml-[90px]"
      : "lg:ml-[90px]";

  if (status === "loading" || !themeContext || !themeContext.isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" text="Loading..." />
      </div>
    );
  }

  // Super Admin Layout
  if (session?.role === "super_admin") {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 p-4 md:p-6 bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
    );
  }

  // Status Check for other users
  const isCompanyApproved = session?.company_status === "approved";
  const isAccountApproved = session?.account_status === "approved";

  if (!isCompanyApproved || !isAccountApproved) {
    return null; // Access Denied
  }

  return (
    <div className="min-h-screen xl:flex">
      {/* Sidebar and Backdrop */}
      <AppSidebar />
      <Backdrop />
      {/* Main Content Area */}
      <div
        className={`flex-1 before:flex-col after:flex-col flex-col transition-all  duration-300 ease-in-out ${mainContentMargin}`}
      >
        {/* Header */}
        <AppHeader />
        {/* Page Content */}
        <div className="p-4 mx-auto w-full max-w-(--breakpoint-3xl) md:p-6">{children}</div>
      </div>
    </div>
  );
}

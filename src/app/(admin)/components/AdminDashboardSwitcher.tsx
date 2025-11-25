"use client";

import { useSession } from "next-auth/react";
import SuperAdminDashboard from "@/components/super-admin/SuperAdminDashboard";
import DashboardContainer from "./DashboardContainer";
import { Spinner } from "@/components/ui/spinner";

export default function AdminDashboardSwitcher() {
    const { data: session, status } = useSession();

    if (status === "loading") {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Spinner size="lg" text="Loading..." />
            </div>
        );
    }

    if (session?.role === "super_admin") {
        return <SuperAdminDashboard />;
    }

    return <DashboardContainer />;
}

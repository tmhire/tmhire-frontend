"use client";
import React from "react";
import { useSession } from "next-auth/react";
import { useCompany } from "@/hooks/useCompany";
import { Spinner } from "../ui/spinner";
import UserManagementTable from "./UserManagementTable";

export default function CompanyDetailsCard() {
    const { data: session } = useSession();
    const { company, loading, error } = useCompany(session?.company_id);

    if (session?.role !== "company_admin") {
        return null;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8 border border-gray-200 rounded-2xl dark:border-gray-800">
                <Spinner size="md" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-5 border border-red-200 rounded-2xl bg-red-50 dark:bg-red-900/10 dark:border-red-900">
                <p className="text-sm text-red-600 dark:text-red-400">Failed to load company details</p>
            </div>
        );
    }

    if (!company) return null;

    return (
        <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="w-full">
                    <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        User Management
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Manage your company users and their permissions here.
                    </p>
                    <UserManagementTable />
                </div>
            </div>
        </div>
    );
}

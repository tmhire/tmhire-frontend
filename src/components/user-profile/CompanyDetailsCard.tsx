"use client";
import React from "react";
import { useSession } from "next-auth/react";
import { useCompany } from "@/hooks/useCompany";
import { Spinner } from "../ui/spinner";

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
                    <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-6">
                        Company Administration
                    </h4>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
                        <div>
                            <p className="mb-2 text-xs leading-normal text-gray-700 dark:text-gray-300">Company Name</p>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{company.name}</p>
                        </div>

                        <div>
                            <p className="mb-2 text-xs leading-normal text-gray-700 dark:text-gray-300">Company Code</p>
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                    {company.company_code}
                                </p>
                            </div>
                        </div>

                        <div>
                            <p className="mb-2 text-xs leading-normal text-gray-700 dark:text-gray-300">Status</p>
                            <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                  ${company.status === "active"
                                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                    }`}
                            >
                                {company.status}
                            </span>
                        </div>

                        <div>
                            <p className="mb-2 text-xs leading-normal text-gray-700 dark:text-gray-300">Contact</p>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{company.contact}</p>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
                        <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                            Permissions & Settings
                        </h5>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Manage your company settings and user permissions here.
                            {/* Placeholder for future permission controls */}
                        </p>
                        <div className="mt-4 flex gap-3">
                            {/* Add buttons or controls here */}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

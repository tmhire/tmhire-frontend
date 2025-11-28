"use client";

import { useSession, signOut } from "next-auth/react";
import { Clock, Mail, Phone, RefreshCw } from "lucide-react";
import Button from "../ui/button/Button";
import { useApiClient } from "@/hooks/useApiClient";
import { useState } from "react";

export default function PendingApprovalOverlay() {
    const { data: session, status, update } = useSession();
    const { fetchWithAuth } = useApiClient();
    const [isRefreshing, setIsRefreshing] = useState(false);

    if (status !== "authenticated" || session?.new_user) {
        return null;
    }

    const { company_status, account_status, company_name, company_code, parent_admin } = session || {};

    const isCompanyPending = company_status === "pending";
    const isCompanyRevoked = company_status === "revoked";
    const isAccountPending = company_status === "approved" && account_status === "pending";
    const isAccountRevoked = company_status === "approved" && account_status === "revoked";

    const showOverlay = isCompanyPending || isCompanyRevoked || isAccountPending || isAccountRevoked;

    if (!showOverlay) {
        return null;
    }

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            const response = await fetchWithAuth("/auth/profile");
            const data = await response.json();

            if (data.success && data.data) {
                const newCompanyStatus = data.data.company_status;
                const newAccountStatus = data.data.account_status;
                const newSubRole = data.data.sub_role;
                const newCompanyName = data.data.company_name;
                const newCompanyCode = data.data.company_code;
                const newParentAdmin = data.data.parent_admin;

                const parentAdminChanged = JSON.stringify(newParentAdmin) !== JSON.stringify(parent_admin);
                const shouldUpdate =
                    newCompanyStatus !== company_status ||
                    newAccountStatus !== account_status ||
                    newSubRole !== session?.sub_role ||
                    newCompanyName !== company_name ||
                    newCompanyCode !== company_code ||
                    parentAdminChanged;

                if (shouldUpdate) {
                    await update({
                        ...(session as unknown as Record<string, unknown>),
                        company_status: newCompanyStatus,
                        account_status: newAccountStatus,
                        sub_role: newSubRole,
                        company_name: newCompanyName ?? company_name,
                        company_code: newCompanyCode ?? company_code,
                        parent_admin: newParentAdmin ?? parent_admin,
                    });
                    window.location.reload();
                }
            }
        } catch (error) {
            console.error("Failed to refresh profile:", error);
        } finally {
            setIsRefreshing(false);
        }
    };

    const isRevoked = isCompanyRevoked || isAccountRevoked;
    const title = isRevoked ? "Account Access Revoked" : "Account Pending Approval";
    const message = isRevoked
        ? "Your account access has been revoked. Please contact the administrator for more information."
        : "Your account is currently under review. You'll be notified once your account has been approved.";

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="mx-4 max-w-md w-full rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-900">
                <div className="flex flex-col items-center text-center">
                    <div className={`mb-6 rounded-full p-4 ${isRevoked ? "bg-red-50 dark:bg-red-500/10" : "bg-yellow-50 dark:bg-yellow-500/10"}`}>
                        {isRevoked ? (
                            <Mail className="h-12 w-12 text-red-500" />
                        ) : (
                            <Clock className="h-12 w-12 text-yellow-500" />
                        )}
                    </div>

                    <h3 className="mb-2 text-xl font-semibold text-gray-800 dark:text-white/90">
                        {title}
                    </h3>

                    <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                        {message}
                    </p>

                    <div className="w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4 mb-6">
                        <div className="flex flex-col items-start gap-3 text-left">
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                Contact Parent Admin:
                            </p>
                            {parent_admin ? (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {parent_admin.name || "Parent Admin"}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                        <Mail className="h-3.5 w-3.5" />
                                        {parent_admin.mail ? (
                                            <a href={`mailto:${parent_admin.mail}`} className="hover:text-brand-500 hover:underline">
                                                {parent_admin.mail}
                                            </a>
                                        ) : (
                                            <span className="italic text-gray-400">Email not available</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                        <Phone className="h-3.5 w-3.5" />
                                        {parent_admin.phone ? (
                                            <a href={`tel:${parent_admin.phone}`} className="hover:text-brand-500 hover:underline">
                                                {parent_admin.phone}
                                            </a>
                                        ) : (
                                            <span className="italic text-gray-400">Phone not available</span>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Parent admin contact details are not available yet.
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-row w-full justify-between gap-3">
                        <Button
                            onClick={handleRefresh}
                            variant="outline"
                            className="flex-1"
                            disabled={isRefreshing}
                        >
                            {isRefreshing ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Refreshing...
                                </>
                            ) : (
                                "Refresh"
                            )}
                        </Button>
                        <Button
                            onClick={() => signOut()}
                            variant="warning"
                            className="flex-1"
                        >
                            Sign Out
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

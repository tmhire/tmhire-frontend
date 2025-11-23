"use client";

import { useSession } from "next-auth/react";
import { Clock, Mail } from "lucide-react";

export default function PendingApprovalOverlay() {
    const { data: session, status } = useSession();

    // Only show overlay if user is authenticated and status is "pending"
    if (status !== "authenticated" || session?.status !== "pending") {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="mx-4 max-w-md rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-900">
                <div className="flex flex-col items-center text-center">
                    <div className="mb-6 rounded-full bg-yellow-50 dark:bg-yellow-500/10 p-4">
                        <Clock className="h-12 w-12 text-yellow-500" />
                    </div>

                    <h3 className="mb-2 text-xl font-semibold text-gray-800 dark:text-white/90">
                        Account Pending Approval
                    </h3>

                    <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                        Your account is currently under review by your company administrator.
                        You'll be notified once your account has been approved.
                    </p>

                    <div className="w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4">
                        <div className="flex items-start gap-3">
                            <Mail className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="text-left">
                                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Need help?
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Contact your company administrator or reach out to support if you have any questions.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

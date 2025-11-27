"use client";

import React, { useState } from "react";
// import { useSession } from "next-auth/react";
import { useAllUsers, useUpdateUser, AllUser } from "@/hooks/useCompany";
import { Spinner } from "../ui/spinner";



export default function UserManagementTable() {
    // const { data: session } = useSession();
    const { users, loading, error } = useAllUsers();
    const updateUserMutation = useUpdateUser();
    const [updating, setUpdating] = useState<string | null>(null);

    // Filter out company_admin
    const filteredUsers = users?.filter((u) => u.role !== "company_admin") || [];

    const handleUpdateUser = async (user: AllUser, updates: Partial<AllUser>) => {
        const userId = user._id;

        if (!userId) {
            console.error("User ID missing", user);
            return;
        }

        setUpdating(userId);
        try {
            await updateUserMutation.mutateAsync({ userId, updates });
        } catch (err) {
            console.error("Error updating user", err);
        } finally {
            setUpdating(null);
        }
    };

    if (loading) return <div className="p-4 flex justify-center"><Spinner size="md" /></div>;
    // Show error if fetch fails
    if (error) return <div className="p-4 text-red-500">{(error as Error).message}</div>;

    if (filteredUsers.length === 0) return <div className="p-4 text-gray-500">No users found.</div>;

    return (
        <div className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Email</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Contact</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Status</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Sub Role</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-800">
                        {filteredUsers.map((user) => (
                            <tr key={user._id || user.email}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{user.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.contact}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    <select
                                        value={user.account_status || "pending"}
                                        onChange={(e) => handleUpdateUser(user, { account_status: e.target.value as "pending" | "approved" | "revoked" })}
                                        disabled={updating === user._id}
                                        className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-4 pr-12 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="approved">Approved</option>
                                        <option value="revoked">Revoked</option>
                                    </select>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    <select
                                        value={user.sub_role || "viewer"}
                                        onChange={(e) => handleUpdateUser(user, { sub_role: e.target.value as "viewer" | "editor" })}
                                        disabled={updating === user._id}
                                        className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-4 pr-12 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                                    >
                                        <option value="viewer">Viewer</option>
                                        <option value="editor">Editor</option>
                                    </select>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {updating === user._id && <span className="text-indigo-600">Updating...</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

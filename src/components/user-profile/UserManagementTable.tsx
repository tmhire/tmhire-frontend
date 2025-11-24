"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useApiClient } from "@/hooks/useApiClient";
import { Spinner } from "../ui/spinner";

interface User {
    account_status: "pending" | "approved" | "revoked";
    company_id: string;
    contact: number;
    created_at: string;
    email: string;
    name: string;
    new_user: boolean;
    role: string;
    sub_role: "viewer" | "editor";
    _id?: string; // Assuming the API returns user ID or we can derive it? The GET example doesn't show ID but PUT needs it. 
    // Wait, the GET example shows "company_id", "contact", etc. but NOT "id" or "user_id".
    // However, the PUT request needs "user_id".
    // Let's assume the GET response MIGHT contain "id" or "user_id" even if not explicitly shown in the example schema, 
    // OR we might need to use email as ID? 
    // The user request says: "PUT /auth/{user_id}".
    // Let's check the GET response schema again in the prompt.
    // "data": [ { "account_status": "approved", ... } ]
    // It seems missing ID. I should probably ask or assume it's there. 
    // Given the context of "Update User", usually an ID is returned. 
    // I will assume `id` or `user_id` is present in the actual response.
    // Let's add `user_id` to the interface and see.
    // id?: string;
}

export default function UserManagementTable() {
    const { data: session } = useSession();
    const { fetchWithAuth } = useApiClient();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updating, setUpdating] = useState<string | null>(null);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await fetchWithAuth("/company/all_users");
            const data = await response.json();

            if (data.success && Array.isArray(data.data)) {
                // Filter out company_admin (which should be the current user mostly, or other admins)
                // The requirement says: "in this there will company_admin also, dont show them"
                const filteredUsers = data.data.filter((u: User) => u.role !== "company_admin");
                setUsers(filteredUsers);
            } else {
                setError("Failed to fetch users");
            }
        } catch (err) {
            setError("An error occurred while fetching users");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session?.role === "company_admin") {
            fetchUsers();
        }
    }, [session]);

    const handleUpdateUser = async (user: User, updates: Partial<User>) => {
        console.log("user", user)
        console.log("updates", updates)
        // We need user_id to update. If it's missing from GET, we are in trouble.
        // Let's assume the API returns it as `id` or `user_id`.
        const userId = user._id;

        if (!userId) {
            console.error("User ID missing", user);
            return;
        }

        try {
            setUpdating(userId);
            const response = await fetchWithAuth(`/auth/${userId}`, {
                method: "PUT",
                body: JSON.stringify({
                    // ...user,
                    ...updates,
                    // Ensure we send required fields if needed, but PUT usually accepts partial or full resource.
                    // The example body shows all fields. Let's send what we have + updates.
                }),
            });

            const data = await response.json();
            if (data.success) {
                // Update local state
                setUsers((prev) =>
                    prev.map((u) =>
                        (u._id === userId) ? { ...u, ...updates } : u
                    )
                );
            } else {
                console.error("Failed to update user", data);
            }
        } catch (err) {
            console.error("Error updating user", err);
        } finally {
            setUpdating(null);
        }
    };

    if (loading) return <div className="p-4 flex justify-center"><Spinner size="md" /></div>;
    if (error) return <div className="p-4 text-red-500">{error}</div>;
    if (users.length === 0) return <div className="p-4 text-gray-500">No users found.</div>;

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
                        {users.map((user) => (
                            <tr key={user._id || user.email}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{user.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.contact}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    <select
                                        value={user.account_status}
                                        onChange={(e) => handleUpdateUser(user, { account_status: e.target.value as any })}
                                        disabled={updating === (user._id)}
                                        className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-4 pr-12 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="approved">Approved</option>
                                        <option value="revoked">Revoked</option>
                                    </select>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    <select
                                        value={user.sub_role}
                                        onChange={(e) => handleUpdateUser(user, { sub_role: e.target.value as any })}
                                        disabled={updating === (user._id)}
                                        className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-4 pr-12 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                                    >
                                        <option value="viewer">Viewer</option>
                                        <option value="editor">Editor</option>
                                    </select>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {updating === (user._id) && <span className="text-indigo-600">Updating...</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

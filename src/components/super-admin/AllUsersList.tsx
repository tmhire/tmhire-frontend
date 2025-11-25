'use client';

import React, { useState, useMemo } from "react";
import { useAllUsers } from "@/hooks/useCompany";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import Badge from "@/components/ui/badge/Badge";
import { Users, AlertCircle, ChevronDown, ChevronRight, Mail, Phone, MapPin, Calendar, Shield, User } from "lucide-react";

export default function AllUsersList() {
    const { users, loading, error } = useAllUsers();
    const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

    // Group users by company_code
    const groupedUsers = useMemo(() => {
        if (!users) return { companies: {}, unassigned: [] };

        const companies: Record<string, typeof users> = {};
        const unassigned: typeof users = [];

        users.forEach((user) => {
            if (user.company_code && user.company_code.trim() !== "") {
                if (!companies[user.company_code]) {
                    companies[user.company_code] = [];
                }
                companies[user.company_code].push(user);
            } else {
                unassigned.push(user);
            }
        });

        return { companies, unassigned };
    }, [users]);

    const toggleCompany = (companyCode: string) => {
        const newExpanded = new Set(expandedCompanies);
        if (newExpanded.has(companyCode)) {
            newExpanded.delete(companyCode);
        } else {
            newExpanded.add(companyCode);
        }
        setExpandedCompanies(newExpanded);
    };

    const getRoleBadgeColor = (role: string | null): "success" | "warning" | "error" | "light" => {
        if (!role) return "light";
        switch (role.toLowerCase()) {
            case "super_admin":
                return "error";
            case "company_admin":
                return "warning";
            case "user":
                return "success";
            default:
                return "light";
        }
    };

    const getStatusBadgeColor = (status: string | null): "success" | "warning" | "error" | "light" => {
        if (!status) return "light";
        switch (status.toLowerCase()) {
            case "approved":
                return "success";
            case "pending":
                return "warning";
            case "revoked":
                return "error";
            default:
                return "light";
        }
    };

    return (
        <div className="grid grid-cols-12 gap-4 md:gap-6 px-24 mt-10">
            {/* Header */}
            <div className="col-span-12 flex items-center justify-between py-4 pl-6 px-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 sticky top-24 z-5">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 dark:text-white">All Users Management</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">View all users grouped by company</p>
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center min-h-[500px] w-full col-span-12">
                    <Spinner size="lg" text="Loading users..." />
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="col-span-12">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">Error Loading Data</h3>
                        <p className="text-red-600 dark:text-red-400">{error?.message || "Failed to load users"}</p>
                    </div>
                </div>
            )}

            {/* Content */}
            {!loading && !error && (
                <div className="col-span-12 space-y-6">
                    {/* Companies Table */}
                    {Object.keys(groupedUsers.companies).length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2 mb-4">
                                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                                    Companies ({Object.keys(groupedUsers.companies).length})
                                </h2>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-gray-50 dark:bg-gray-700/50">
                                            <TableRow>
                                                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Company</TableCell>
                                                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Code</TableCell>
                                                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">City</TableCell>
                                                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</TableCell>
                                                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Users</TableCell>
                                                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</TableCell>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(groupedUsers.companies).map(([companyCode, companyUsers]) => {
                                                const isExpanded = expandedCompanies.has(companyCode);
                                                const company = companyUsers[0];
                                                const totalUsers = companyUsers.length;

                                                return (
                                                    <React.Fragment key={companyCode}>
                                                        {/* Company Header Row */}
                                                        <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer" onClick={() => toggleCompany(companyCode)}>
                                                            <TableCell className="px-6 py-4 whitespace-nowrap">
                                                                <div className="flex items-center space-x-2">
                                                                    <div className="text-gray-600 dark:text-gray-400">
                                                                        {isExpanded ? (
                                                                            <ChevronDown className="w-5 h-5" />
                                                                        ) : (
                                                                            <ChevronRight className="w-5 h-5" />
                                                                        )}
                                                                    </div>
                                                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                        {company.company_name || companyCode}
                                                                    </span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="px-6 py-4 whitespace-nowrap">
                                                                <Badge color="light">{companyCode}</Badge>
                                                            </TableCell>
                                                            <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                                                <div className="flex items-center gap-1">
                                                                    <MapPin className="w-4 h-4" />
                                                                    {company.city || "-"}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="px-6 py-4 whitespace-nowrap">
                                                                <Badge
                                                                    color={
                                                                        company.company_status === "approved"
                                                                            ? "success"
                                                                            : company.company_status === "pending"
                                                                                ? "warning"
                                                                                : "error"
                                                                    }
                                                                >
                                                                    {company.company_status}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                                {totalUsers}
                                                            </TableCell>
                                                            <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                                <button
                                                                    onClick={() => toggleCompany(companyCode)}
                                                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
                                                                >
                                                                    {isExpanded ? "Hide" : "Show"} Users
                                                                </button>
                                                            </TableCell>
                                                        </TableRow>

                                                        {/* Expanded Users Rows */}
                                                        {isExpanded &&
                                                            companyUsers.map((user) => (
                                                                <TableRow key={user._id} className="bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors">
                                                                    <TableCell colSpan={6} className="px-6 py-4">
                                                                        <div className="ml-8 space-y-2">
                                                                            <div className="flex items-center justify-between">
                                                                                <div className="flex-1">
                                                                                    <div className="flex items-center space-x-3 mb-2">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                                                                            <h4 className="font-medium text-gray-900 dark:text-white">{user.name}</h4>
                                                                                        </div>
                                                                                        {user.role && (
                                                                                            <Badge color={getRoleBadgeColor(user.role)}>
                                                                                                {user.role.replace(/_/g, " ")}
                                                                                            </Badge>
                                                                                        )}
                                                                                        {user.account_status && (
                                                                                            <Badge color={getStatusBadgeColor(user.account_status)}>
                                                                                                {user.account_status}
                                                                                            </Badge>
                                                                                        )}
                                                                                    </div>

                                                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600 dark:text-gray-300">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <Mail className="w-4 h-4 text-gray-500 dark:text-gray-500" />
                                                                                            <span>{user.email}</span>
                                                                                        </div>
                                                                                        {user.contact && (
                                                                                            <div className="flex items-center gap-2">
                                                                                                <Phone className="w-4 h-4 text-gray-500 dark:text-gray-500" />
                                                                                                <span>{user.contact}</span>
                                                                                            </div>
                                                                                        )}
                                                                                        {user.sub_role && (
                                                                                            <div className="flex items-center gap-2">
                                                                                                <Shield className="w-4 h-4 text-gray-500 dark:text-gray-500" />
                                                                                                <span className="capitalize">{user.sub_role}</span>
                                                                                            </div>
                                                                                        )}
                                                                                        <div className="flex items-center gap-2">
                                                                                            <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-500" />
                                                                                            <span>
                                                                                                {new Date(user.created_at).toLocaleDateString("en-US", {
                                                                                                    year: "numeric",
                                                                                                    month: "short",
                                                                                                    day: "numeric",
                                                                                                })}
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Unassigned Users Table */}
                    {groupedUsers.unassigned.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2 mb-4">
                                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                                    Unassigned Users ({groupedUsers.unassigned.length})
                                </h2>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-gray-50 dark:bg-gray-700/50">
                                            <TableRow>
                                                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</TableCell>
                                                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</TableCell>
                                                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</TableCell>
                                                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</TableCell>
                                                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sub Role</TableCell>
                                                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</TableCell>
                                                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">City</TableCell>
                                                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Joined</TableCell>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {groupedUsers.unassigned.map((user) => (
                                                <TableRow key={user._id} className="hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-colors">
                                                    <TableCell className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                                            <span className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                                        <div className="flex items-center gap-2">
                                                            <Mail className="w-4 h-4 text-gray-500 dark:text-gray-500" />
                                                            {user.email}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                                        {user.contact ? (
                                                            <div className="flex items-center gap-2">
                                                                <Phone className="w-4 h-4 text-gray-500 dark:text-gray-500" />
                                                                {user.contact}
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4 whitespace-nowrap">
                                                        {user.role ? (
                                                            <Badge color={getRoleBadgeColor(user.role)}>
                                                                {user.role.replace(/_/g, " ")}
                                                            </Badge>
                                                        ) : (
                                                            <Badge color="light">No Role</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                                        {user.sub_role ? (
                                                            <div className="flex items-center gap-2">
                                                                <Shield className="w-4 h-4 text-gray-500 dark:text-gray-500" />
                                                                <span className="capitalize">{user.sub_role}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4 whitespace-nowrap">
                                                        {user.account_status ? (
                                                            <Badge color={getStatusBadgeColor(user.account_status)}>
                                                                {user.account_status}
                                                            </Badge>
                                                        ) : (
                                                            <Badge color="light">No Status</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                                        {user.city ? (
                                                            <div className="flex items-center gap-2">
                                                                <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-500" />
                                                                {user.city}
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-500" />
                                                            {new Date(user.created_at).toLocaleDateString("en-US", {
                                                                year: "numeric",
                                                                month: "short",
                                                                day: "numeric",
                                                            })}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {Object.keys(groupedUsers.companies).length === 0 && groupedUsers.unassigned.length === 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                            <Users className="w-12 h-12 mx-auto mb-3 opacity-50 text-gray-400" />
                            <p className="text-lg font-medium text-gray-800 dark:text-gray-200">No users found</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Users will appear here once they sign up</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

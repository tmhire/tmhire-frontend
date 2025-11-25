'use client';

import React, { useState, useMemo } from "react";
import { useCompanies, useUpdateCompanyStatus, useAllUsers } from "@/hooks/useCompany";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircle, XCircle, RotateCcw, Building2, CheckCircle2, Clock, ShieldAlert, Users, ChevronDown, ChevronRight, AlertCircle, Shield, MapPin, User, Mail, Phone, Calendar } from "lucide-react";

type TabType = "companies" | "users";

export default function SuperAdminDashboard() {
    const [activeTab, setActiveTab] = useState<TabType>("companies");
    const { companies, loading: companiesLoading, error: companiesError } = useCompanies();
    const { users: allUsers, loading: usersLoading, error: usersError } = useAllUsers();
    const { mutate: updateStatus, isPending: isUpdating } = useUpdateCompanyStatus();
    const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

    // Company metrics
    const total = companies?.length || 0;
    const approved = companies?.filter(c => c.company_status === "approved").length || 0;
    const pending = companies?.filter(c => c.company_status === "pending").length || 0;
    const revoked = companies?.filter(c => c.company_status === "revoked").length || 0;

    // Group users by company_code
    const groupedUsers = useMemo(() => {
        if (!allUsers) return { companies: {}, unassigned: [] };

        const groupedCompanies: Record<string, typeof allUsers> = {};
        const unassigned: typeof allUsers = [];

        allUsers.forEach((user) => {
            if (user.company_code && user.company_code.trim() !== "") {
                if (!groupedCompanies[user.company_code]) {
                    groupedCompanies[user.company_code] = [];
                }
                groupedCompanies[user.company_code].push(user);
            } else {
                unassigned.push(user);
            }
        });

        return { companies: groupedCompanies, unassigned };
    }, [allUsers]);

    const handleStatusChange = (id: string, status: string) => {
        updateStatus({ companyId: id, status });
    };

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

    const isLoading = activeTab === "companies" ? companiesLoading : usersLoading;
    const error = activeTab === "companies" ? companiesError : usersError;

    return (
        <div className="grid grid-cols-12 gap-4 md:gap-6 px-24 mt-10">
            {/* Header */}
            <div className="col-span-12 flex items-center justify-between py-4 pl-6 px-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 sticky top-24 z-5">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 dark:text-white">Super Admin Dashboard</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Manage companies and users</p>
                    </div>
                </div>
            </div>

            {/* Metrics */}
            <div className="col-span-12 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    <MetricCard
                        title="Total Companies"
                        value={total}
                        icon={<Building2 className="w-5 h-5" />}
                        bgColor="bg-blue-50 dark:bg-blue-900/20"
                        iconColor="text-blue-600 dark:text-blue-400"
                        valueColor="text-blue-700 dark:text-blue-300"
                    />
                    <MetricCard
                        title="Approved"
                        value={approved}
                        icon={<CheckCircle2 className="w-5 h-5" />}
                        bgColor="bg-green-50 dark:bg-green-900/20"
                        iconColor="text-green-600 dark:text-green-400"
                        valueColor="text-green-700 dark:text-green-300"
                    />
                    <MetricCard
                        title="Pending"
                        value={pending}
                        icon={<Clock className="w-5 h-5" />}
                        bgColor="bg-yellow-50 dark:bg-yellow-900/20"
                        iconColor="text-yellow-600 dark:text-yellow-400"
                        valueColor="text-yellow-700 dark:text-yellow-300"
                    />
                    <MetricCard
                        title="Revoked"
                        value={revoked}
                        icon={<ShieldAlert className="w-5 h-5" />}
                        bgColor="bg-red-50 dark:bg-red-900/20"
                        iconColor="text-red-600 dark:text-red-400"
                        valueColor="text-red-700 dark:text-red-300"
                    />
                </div>
            </div>
            
            {/* Tabs */}
            <div className="col-span-12">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-1 flex gap-2">
                    <button
                        onClick={() => setActiveTab("companies")}
                        className={`px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === "companies"
                            ? "bg-blue-600 text-white"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            Companies
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab("users")}
                        className={`px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === "users"
                            ? "bg-blue-600 text-white"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            All Users
                        </div>
                    </button>
                </div>
            </div>

            {/* Loading & Error States */}
            {isLoading && (
                <div className="flex items-center justify-center min-h-[500px] w-full col-span-12">
                    <Spinner size="lg" text={`Loading ${activeTab}...`} />
                </div>
            )}

            {error && (
                <div className="col-span-12">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">Error Loading Data</h3>
                        <p className="text-red-600 dark:text-red-400">{error?.message || "Failed to load data"}</p>
                    </div>
                </div>
            )}

            {/* Companies Tab */}
            {!isLoading && !error && activeTab === "companies" && (
                <>


                    {/* Companies Table */}
                    <div className="col-span-12">
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Company Management</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View and manage company statuses</p>
                            </div>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-gray-50 dark:bg-gray-700/50">
                                        <TableRow>
                                            <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Company Name</TableCell>
                                            <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Code</TableCell>
                                            <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</TableCell>
                                            <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">City</TableCell>
                                            <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</TableCell>
                                            <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</TableCell>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {companies?.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                                    <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                                    <p className="text-lg font-medium">No companies found</p>
                                                    <p className="text-sm mt-1">Companies will appear here once they register</p>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            companies
                                                ?.filter(company => company.company_code !== "TMGRID")
                                                .map((company) => (
                                                    <TableRow key={company._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                                        <TableCell className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{company.company_name}</TableCell>
                                                        <TableCell className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 font-mono">{company.company_code}</TableCell>
                                                        <TableCell className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 font-mono">{company.contact}</TableCell>
                                                        <TableCell className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{company.city}</TableCell>
                                                        <TableCell className="px-4 py-4 whitespace-nowrap">
                                                            <StatusBadge status={company.company_status} />
                                                        </TableCell>
                                                        <TableCell className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                                            <div className="flex items-center gap-2">
                                                                {company.company_status !== "approved" && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="primary"
                                                                        onClick={() => handleStatusChange(company._id, "approved")}
                                                                        disabled={isUpdating}
                                                                        className="inline-flex items-center"
                                                                    >
                                                                        <CheckCircle className="w-4 h-4 mr-1" /> Approve
                                                                    </Button>
                                                                )}
                                                                {company.company_status !== "revoked" && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="warning"
                                                                        onClick={() => handleStatusChange(company._id, "revoked")}
                                                                        disabled={isUpdating}
                                                                        className="inline-flex items-center"
                                                                    >
                                                                        <XCircle className="w-4 h-4 mr-1" /> Revoke
                                                                    </Button>
                                                                )}
                                                                {company.company_status !== "pending" && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => handleStatusChange(company._id, "pending")}
                                                                        disabled={isUpdating}
                                                                        className="inline-flex items-center"
                                                                    >
                                                                        <RotateCcw className="w-4 h-4 mr-1" /> Reset
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Users Tab */}
            {!isLoading && !error && activeTab === "users" && (
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
                                                <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Company</TableCell>
                                                <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Code</TableCell>
                                                <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">City</TableCell>
                                                <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</TableCell>
                                                <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Users</TableCell>
                                                <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</TableCell>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(groupedUsers.companies)
                                                .filter(([companyCode]) => companyCode !== "TMGRID")
                                                .map(([companyCode, companyUsers]) => {
                                                    const isExpanded = expandedCompanies.has(companyCode);
                                                    const company = companyUsers[0];
                                                    const totalUsers = companyUsers.length;

                                                    return (
                                                        <React.Fragment key={companyCode}>
                                                            {/* Company Header Row */}
                                                            <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer" onClick={() => toggleCompany(companyCode)}>
                                                                <TableCell className="px-4 py-4 whitespace-nowrap">
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
                                                                <TableCell className="px-4 py-4 whitespace-nowrap">
                                                                    <Badge color="light">{companyCode}</Badge>
                                                                </TableCell>
                                                                <TableCell className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                                                    <div className="flex items-center gap-1">
                                                                        <MapPin className="w-4 h-4" />
                                                                        {company.city || "-"}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="px-4 py-4 whitespace-nowrap">
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
                                                                <TableCell className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                                    {totalUsers}
                                                                </TableCell>
                                                                <TableCell className="px-4 py-4 whitespace-nowrap text-sm font-medium">
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
                                                                        <TableCell colSpan={6} className="px-4 py-3">
                                                                            <div className="ml-8 text-xs text-gray-600 dark:text-gray-300">
                                                                                <div className="grid grid-cols-8 gap-4">
                                                                                    <div className="truncate">
                                                                                        <span className="font-medium text-gray-900 dark:text-white">{user.name}</span>
                                                                                    </div>
                                                                                    <div className="truncate">
                                                                                        <span>{user.email}</span>
                                                                                    </div>
                                                                                    <div className="truncate">
                                                                                        {user.contact ? user.contact : <span className="text-gray-400">-</span>}
                                                                                    </div>
                                                                                    <div className="truncate">
                                                                                        {user.role ? (
                                                                                            <Badge color={getRoleBadgeColor(user.role)}>
                                                                                                {user.role.replace(/_/g, " ")}
                                                                                            </Badge>
                                                                                        ) : (
                                                                                            <Badge color="light">No Role</Badge>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="truncate">
                                                                                        {user.sub_role ? (
                                                                                            <span className="capitalize">{user.sub_role}</span>
                                                                                        ) : (
                                                                                            <span className="text-gray-400">-</span>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="truncate">
                                                                                        {user.account_status ? (
                                                                                            <Badge color={getStatusBadgeColor(user.account_status)}>
                                                                                                {user.account_status}
                                                                                            </Badge>
                                                                                        ) : (
                                                                                            <Badge color="light">No Status</Badge>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="truncate">
                                                                                        {user.city ? user.city : <span className="text-gray-400">-</span>}
                                                                                    </div>
                                                                                    <div className="truncate">
                                                                                        {new Date(user.created_at).toLocaleDateString("en-US", {
                                                                                            year: "numeric",
                                                                                            month: "short",
                                                                                            day: "numeric",
                                                                                        })}
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
                                                <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-4 h-4" />
                                                        Name
                                                    </div>
                                                </TableCell>
                                                <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    <div className="flex items-center gap-2">
                                                        <Mail className="w-4 h-4" />
                                                        Email
                                                    </div>
                                                </TableCell>
                                                <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="w-4 h-4" />
                                                        Contact
                                                    </div>
                                                </TableCell>
                                                <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    <div className="flex items-center gap-2">
                                                        <Shield className="w-4 h-4" />
                                                        Role
                                                    </div>
                                                </TableCell>
                                                <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    <div className="flex items-center gap-2">
                                                        <Shield className="w-4 h-4" />
                                                        Sub Role
                                                    </div>
                                                </TableCell>
                                                <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</TableCell>
                                                <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-4 h-4" />
                                                        City
                                                    </div>
                                                </TableCell>
                                                <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4" />
                                                        Joined
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {groupedUsers.unassigned.map((user) => (
                                                <TableRow key={user._id} className="hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-colors">
                                                    <TableCell className="px-4 py-4 whitespace-nowrap">
                                                        <span className="text-sm font-medium text-gray-900 dark:text-white max-w-32 truncate block">{user.name}</span>
                                                    </TableCell>
                                                    <TableCell className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                                        {user.email}
                                                    </TableCell>
                                                    <TableCell className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                                        {user.contact ? user.contact : <span className="text-gray-400">-</span>}
                                                    </TableCell>
                                                    <TableCell className="px-4 py-4 whitespace-nowrap">
                                                        {user.role ? (
                                                            <Badge color={getRoleBadgeColor(user.role)}>
                                                                {user.role.replace(/_/g, " ")}
                                                            </Badge>
                                                        ) : (
                                                            <Badge color="light">No Role</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                                        {user.sub_role ? (
                                                            <span className="capitalize">{user.sub_role}</span>
                                                        ) : (
                                                            <span className="text-gray-400">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="px-4 py-4 whitespace-nowrap">
                                                        {user.account_status ? (
                                                            <Badge color={getStatusBadgeColor(user.account_status)}>
                                                                {user.account_status}
                                                            </Badge>
                                                        ) : (
                                                            <Badge color="light">No Status</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                                        {user.city ? user.city : <span className="text-gray-400">-</span>}
                                                    </TableCell>
                                                    <TableCell className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                                        {new Date(user.created_at).toLocaleDateString("en-US", {
                                                            year: "numeric",
                                                            month: "short",
                                                            day: "numeric",
                                                        })}
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

interface MetricCardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
    bgColor: string;
    iconColor: string;
    valueColor: string;
}

function MetricCard({ title, value, icon, bgColor, iconColor, valueColor }: MetricCardProps) {
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
                    <p className={`mt-2 text-3xl font-bold ${valueColor}`}>{value}</p>
                </div>
                <div className={`p-3 rounded-lg ${bgColor}`}>
                    <div className={iconColor}>
                        {icon}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const variants: Record<string, "success" | "warning" | "error"> = {
        approved: "success",
        pending: "warning",
        revoked: "error",
    };
    return <Badge color={variants[status] || "light"}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
}

import React from "react";
import { useCompanies, useUpdateCompanyStatus } from "@/hooks/useCompany";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircle, XCircle, RotateCcw, Building2, CheckCircle2, Clock, ShieldAlert } from "lucide-react";

export default function SuperAdminDashboard() {
    const { companies, loading, error } = useCompanies();
    const { mutate: updateStatus, isPending: isUpdating } = useUpdateCompanyStatus();

    const total = companies?.length || 0;
    const approved = companies?.filter(c => c.company_status === "approved").length || 0;
    const pending = companies?.filter(c => c.company_status === "pending").length || 0;
    const revoked = companies?.filter(c => c.company_status === "revoked").length || 0;

    const handleStatusChange = (id: string, status: string) => {
        updateStatus({ companyId: id, status });
    };

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
                        <p className="text-sm text-gray-500 dark:text-gray-400">Manage all companies and their statuses</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    {/* <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-sm font-medium text-blue-800 dark:text-blue-300">
                        {total} Total Companies
                    </span> */}
                </div>
            </div>

            {/* Loading & Error States */}
            {loading && (
                <div className="flex items-center justify-center min-h-[500px] w-full col-span-12">
                    <Spinner size="lg" text="Loading companies..." />
                </div>
            )}

            {error && (
                <div className="col-span-12">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
                        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">Error Loading Data</h3>
                        <p className="text-red-600 dark:text-red-400">{error.message}</p>
                    </div>
                </div>
            )}

            {/* Metrics */}
            {!loading && !error && (
                <>
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

                    {/* Table */}
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
                                            <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Company Name</TableCell>
                                            <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Code</TableCell>
                                            <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</TableCell>
                                            <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">City</TableCell>
                                            <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</TableCell>
                                            <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</TableCell>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {companies?.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
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
                                                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{company.company_name}</TableCell>
                                                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 font-mono">{company.company_code}</TableCell>
                                                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 font-mono">{company.contact}</TableCell>
                                                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{company.city}</TableCell>
                                                        <TableCell className="px-6 py-4 whitespace-nowrap">
                                                            <StatusBadge status={company.company_status} />
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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

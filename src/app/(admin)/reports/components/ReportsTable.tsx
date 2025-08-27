"use client";

import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Eye, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";

type Schedule = {
  _id: string;
  status: string;
  type: string;
  client_name: string;
  site_address: string;
  project_name?: string;
  tm_count: number;
  created_at: string;
  plant_id?: string;
  mother_plant_name?: string;
  input_params: {
    schedule_date: string;
    quantity: number;
  };
};

export default function ReportsTable({
  data,
  plantIdToName,
}: {
  data: Schedule[];
  plantIdToName: Record<string, string>;
}) {
  const router = useRouter();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const getStatusColor = (status: string) => {
    switch ((status || "").toLowerCase()) {
      case "generated":
        return "success";
      case "pending":
        return "warning";
      case "completed":
        return "success";
      case "cancelled":
        return "error";
      default:
        return "primary";
    }
  };

  const handleView = (s: Schedule) => {
    if (s.type === "supply") router.push(`/supply-schedules/${s._id}/view`);
    else router.push(`/pumping-schedules/${s._id}/view`);
  };

  const handleEdit = (s: Schedule) => {
    if (s.type === "supply") router.push(`/supply-schedules/${s._id}`);
    else router.push(`/pumping-schedules/${s._id}`);
  };

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">No schedules found</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell isHeader className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                Type
              </TableCell>
              <TableCell isHeader className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                Client
              </TableCell>
              <TableCell isHeader className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                Project / Site
              </TableCell>
              <TableCell isHeader className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                Plant
              </TableCell>
              <TableCell isHeader className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                Schedule Date
              </TableCell>
              <TableCell isHeader className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                Quantity
              </TableCell>
              <TableCell isHeader className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                Status
              </TableCell>
              <TableCell isHeader className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                Created
              </TableCell>
              <TableCell isHeader className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                Actions
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {data.map((s) => (
              <TableRow key={s._id}>
                <TableCell className="px-3 py-4 text-start">
                  <Badge size="sm" color={s.type === "supply" ? "info" : "primary"}>{s.type || "pumping"}</Badge>
                </TableCell>
                <TableCell className="px-3 py-4 text-start">
                  <span className="text-gray-800 dark:text-white/90 font-medium">{s.client_name}</span>
                </TableCell>
                <TableCell className="px-3 py-4 text-start">
                  <span className="text-gray-800 dark:text-white/90">{s.project_name || s.site_address}</span>
                </TableCell>
                <TableCell className="px-3 py-4 text-start">
                  <span className="text-gray-800 dark:text-white/90">{plantIdToName[s.plant_id || ""] || s.mother_plant_name || "-"}</span>
                </TableCell>
                <TableCell className="px-3 py-4 text-start">
                  <span className="text-gray-500 dark:text-gray-400">{formatDate(s.input_params.schedule_date)}</span>
                </TableCell>
                <TableCell className="px-3 py-4 text-start">
                  <span className="text-gray-800 dark:text-white/90">{s.input_params.quantity}</span>
                </TableCell>
                <TableCell className="px-3 py-4 text-start">
                  <Badge size="sm" color={getStatusColor(s.status)}>{s.status}</Badge>
                </TableCell>
                <TableCell className="px-3 py-4 text-start">
                  <span className="text-gray-500 dark:text-gray-400">{formatDate(s.created_at)}</span>
                </TableCell>
                <TableCell className="px-3 py-4 text-start">
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleView(s)} className="flex items-center gap-1" disabled={s.status !== "generated"}>
                      <Eye size={14} />
                      View
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(s)} className="flex items-center gap-1">
                      <Pencil size={14} />
                      Edit
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}




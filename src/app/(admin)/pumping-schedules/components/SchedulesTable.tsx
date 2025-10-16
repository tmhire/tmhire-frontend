import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import React, { useMemo } from "react";
import Button from "@/components/ui/button/Button";
import { CopyX, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Badge from "@/components/ui/badge/Badge";
// import Tooltip from "@/components/ui/tooltip";
import { formatTimeByPreference } from "@/lib/utils";
import { useProfile } from "@/hooks/useProfile";

interface Schedule {
  _id: string;
  client_name: string;
  client_id: string;
  site_address: string;
  project_name: string;
  mother_plant_name: string;
  pump_type: string;
  status: string;
  input_params: {
    quantity: number;
    pumping_speed: number;
    onward_time: number;
    return_time: number;
    buffer_time: number;
    pump_start: string;
    schedule_date: string;
  };
  output_table: Array<{
    trip_no: number;
    tm_no: string;
    tm_id: string;
    plant_start: string;
    plant_buffer: string;
    pump_start: string;
    unloading_time: string;
    return: string;
    completed_capacity: number;
    cycle_time?: number;
    trip_no_for_tm?: number;
  }>;
  tm_count: number;
  tm_overrule: number;
  created_at: string;
}

interface SchedulesTableProps {
  data: Schedule[];
  onDelete: (schedule: Schedule) => void;
  onCancel: (schedule: Schedule) => void;
}

export default function SchedulesTable({ data, onDelete, onCancel }: SchedulesTableProps) {
  const router = useRouter();
  const { profile } = useProfile();

  // Calculate summary totals
  const summaryTotals = useMemo(() => {
    const totalQuantity = data.reduce((sum, schedule) => sum + schedule.input_params.quantity, 0);
    const totalTmCount = data.reduce((sum, schedule) => sum + schedule.tm_count, 0);
    return { totalQuantity, totalTmCount };
  }, [data]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "generated":
        return "success";
      case "deleted":
        return "warning";
      case "canceled":
        return "error";
      default:
        return "primary";
    }
  };

  const handleView = (schedule: Schedule) => {
    router.push(`/pumping-schedules/${schedule._id}/view`);
  };

  const handleEdit = (schedule: Schedule) => {
    router.push(`/pumping-schedules/${schedule._id}`);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <div className="min-w-[1102px]">
          <Table>
            {/* Table Header */}
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-2 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Sl. No
                </TableCell>
                <TableCell
                  isHeader
                  className="px-2 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Client Name
                </TableCell>
                <TableCell
                  isHeader
                  className="px-2 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Project
                </TableCell>
                <TableCell
                  isHeader
                  className="px-2 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Qty
                </TableCell>
                <TableCell
                  isHeader
                  className="px-2 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Supply Plant
                </TableCell>
                <TableCell
                  isHeader
                  className="px-2 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Schedule Date
                </TableCell>
                <TableCell
                  isHeader
                  className="px-2 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  TM Count
                </TableCell>
                <TableCell
                  isHeader
                  className="px-2 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Pump Type
                </TableCell>
                <TableCell
                  isHeader
                  className="px-2 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  TM Job Time
                </TableCell>
                <TableCell
                  isHeader
                  className="px-2 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Pump Operation Time
                </TableCell>
                <TableCell
                  isHeader
                  className="px-2 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Status
                </TableCell>
                <TableCell
                  isHeader
                  className="px-2 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>

            {/* Table Body */}
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {data.map((schedule, index) => (
                <React.Fragment key={schedule._id}>
                  <TableRow
                    className={schedule.status === "generated" ? "hover:bg-gray-50 dark:hover:bg-gray-800/50" : ""}
                    onClick={() => handleView(schedule)}
                  >
                    <TableCell className="px-2 py-3 text-sm text-start">
                      <span className="text-gray-800 dark:text-white/90">{index + 1}</span>
                    </TableCell>
                    <TableCell className="px-2 py-3 text-sm text-start">
                      <span className="text-gray-800 dark:text-white/90 font-medium">{schedule.client_name}</span>
                    </TableCell>
                    <TableCell className="px-2 py-3 text-sm text-start">
                      <span className="text-gray-800 dark:text-white/90">{schedule.project_name}</span>
                    </TableCell>
                    <TableCell className="px-2 py-3 text-sm text-start">
                      <span className="text-gray-800 dark:text-white/90">{schedule.input_params.quantity}</span>
                    </TableCell>
                    <TableCell className="px-2 py-3 text-sm text-start">
                      <span className="text-gray-800 dark:text-white/90">{schedule.mother_plant_name}</span>
                    </TableCell>
                    <TableCell className="px-2 py-3 text-sm text-start">
                      <span className="text-gray-800 dark:text-white/90">
                        {formatDate(schedule.input_params.schedule_date)}
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-3 text-sm text-gray-500 text-start dark:text-gray-400">
                      {(schedule.tm_overrule || schedule.tm_overrule === 0)
                        ? `${schedule.tm_count} + ${schedule.tm_overrule - schedule.tm_count}`
                        : schedule.tm_count}
                    </TableCell>
                    <TableCell className="px-2 py-3 text-sm text-start">
                      <span className="text-gray-800 dark:text-white/90">{schedule.pump_type}</span>
                    </TableCell>
                    <TableCell className="px-2 py-3 text-sm text-start">
                      <span className="text-gray-800 dark:text-white/90">
                        {schedule.output_table[0]?.plant_buffer
                          ? `${formatTimeByPreference(
                              schedule.output_table[0].plant_buffer,
                              profile?.preferred_format
                            )} - ${formatTimeByPreference(
                              schedule.output_table[schedule.output_table.length - 1].return,
                              profile?.preferred_format
                            )}`
                          : "-"}
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-3 text-sm text-start">
                      <span className="text-gray-800 dark:text-white/90">
                        {schedule.input_params.pump_start
                          ? `${formatTimeByPreference(
                              schedule.input_params.pump_start,
                              profile?.preferred_format
                            )} - ${formatTimeByPreference(
                              schedule.output_table[schedule.output_table.length - 1]?.unloading_time,
                              profile?.preferred_format
                            )}`
                          : "-"}
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-3 text-sm text-start">
                      <Badge size="sm" color={getStatusColor(schedule.status)}>
                        {schedule.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2 py-3 text-sm">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(schedule)}
                          className="flex items-center gap-1"
                          disabled={schedule.status !== "generated" && schedule.status !== "draft"}
                        >
                          <Pencil size={14} />
                        </Button>
                        {schedule.status === "draft" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onDelete(schedule)}
                            className="flex items-center gap-1 text-red-600 hover:text-red-700"
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}

                        {schedule.status === "generated" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onCancel(schedule)}
                            className="flex items-center gap-1 text-red-600 hover:text-red-700"
                          >
                            <CopyX size={14} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}

              {/* Summary Row */}
              {data.length > 0 && (
                <TableRow className="bg-gray-50 dark:bg-gray-800/50 border-t-2 border-gray-200 dark:border-gray-700">
                  <TableCell className="px-2 py-3 text-sm font-semibold text-gray-800 dark:text-white/90">
                    Total
                  </TableCell>
                  <TableCell className="px-2 py-3 text-sm font-semibold text-gray-800 dark:text-white/90">-</TableCell>
                  <TableCell className="px-2 py-3 text-sm font-semibold text-gray-800 dark:text-white/90">-</TableCell>
                  <TableCell className="px-2 py-3 text-sm font-semibold text-gray-800 dark:text-white/90">
                    {summaryTotals.totalQuantity}
                  </TableCell>
                  <TableCell className="px-2 py-3 text-sm font-semibold text-gray-800 dark:text-white/90">-</TableCell>
                  <TableCell className="px-2 py-3 text-sm font-semibold text-gray-800 dark:text-white/90">-</TableCell>
                  <TableCell className="px-2 py-3 text-sm font-semibold text-gray-800 dark:text-white/90">
                    {summaryTotals.totalTmCount}
                  </TableCell>
                  <TableCell className="px-2 py-3 text-sm font-semibold text-gray-800 dark:text-white/90">-</TableCell>
                  <TableCell className="px-2 py-3 text-sm font-semibold text-gray-800 dark:text-white/90">-</TableCell>
                  <TableCell className="px-2 py-3 text-sm font-semibold text-gray-800 dark:text-white/90">-</TableCell>
                  <TableCell className="px-2 py-3 text-sm font-semibold text-gray-800 dark:text-white/90">-</TableCell>
                  <TableCell className="px-2 py-3 text-sm font-semibold text-gray-800 dark:text-white/90">-</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

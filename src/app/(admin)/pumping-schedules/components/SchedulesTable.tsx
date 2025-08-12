import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import React from "react";
import Button from "@/components/ui/button/Button";
import { Eye, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Badge from "@/components/ui/badge/Badge";
import Tooltip from "@/components/ui/tooltip";

interface Schedule {
  _id: string;
  client_name: string;
  client_id: string;
  site_address: string;
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
    pump_start: string;
    unloading_time: string;
    return: string;
    completed_capacity: number;
    cycle_time?: number;
    trip_no_for_tm?: number;
  }>;
  tm_count: number;
  created_at: string;
}

interface SchedulesTableProps {
  data: Schedule[];
  onDelete: (schedule: Schedule) => void;
}

export default function SchedulesTable({ data, onDelete }: SchedulesTableProps) {
  const router = useRouter();

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
                {/* <TableCell
                  isHeader
                  className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  ID
                </TableCell> */}
                <TableCell
                  isHeader
                  className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Client
                </TableCell>
                <TableCell
                  isHeader
                  className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Site Address
                </TableCell>
                <TableCell
                  isHeader
                  className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Quantity
                </TableCell>
                <TableCell
                  isHeader
                  className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Schedule Date
                </TableCell>
                <TableCell
                  isHeader
                  className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  TM Count
                </TableCell>
                <TableCell
                  isHeader
                  className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Status
                </TableCell>
                <TableCell
                  isHeader
                  className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Created
                </TableCell>
                <TableCell
                  isHeader
                  className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>

            {/* Table Body */}
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {data.map((schedule) => (
                <React.Fragment key={schedule._id}>
                  <TableRow>
                    {/* <TableCell className="px-3 py-4 text-start">
                      <div className="flex items-center gap-3">
                        <div>
                          <span
                            className="block text-gray-500 text-start text-theme-xs dark:text-gray-400"
                            title={schedule._id}
                          >
                            {schedule._id.slice(0, 4)}...{schedule._id.slice(-4)}
                          </span>
                        </div>
                      </div>
                    </TableCell> */}
                    <TableCell className="px-3 py-4 text-start">
                      <span className="text-gray-800 dark:text-white/90 font-medium">{schedule.client_name}</span>
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start">
                      <span className="text-gray-800 dark:text-white/90">{schedule.site_address}</span>
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start">
                      <span className="text-gray-800 dark:text-white/90">{schedule.input_params.quantity}</span>
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start">
                      <span className="text-gray-500 dark:text-gray-400">
                        {formatDate(schedule.input_params.schedule_date)}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {schedule.tm_count}
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start">
                      <Badge size="sm" color={getStatusColor(schedule.status)}>
                        {schedule.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start">
                      <span className="text-gray-500 dark:text-gray-400">{formatDate(schedule.created_at)}</span>
                    </TableCell>
                    <TableCell className="px-3 py-4">
                      <div className="flex items-center gap-2">
                        <Tooltip
                          key={schedule._id}
                          content={
                            schedule.status === "generated"
                              ? "View Schedule"
                              : "Generate the schedule before trying to view"
                          }
                          opacity={0.5}
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleView(schedule)}
                            className="flex items-center gap-1"
                            disabled={schedule.status !== "generated"}
                          >
                            <Eye size={14} />
                            View
                          </Button>
                        </Tooltip>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(schedule)}
                          className="flex items-center gap-1"
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onDelete(schedule)}
                          className="flex items-center gap-1 text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

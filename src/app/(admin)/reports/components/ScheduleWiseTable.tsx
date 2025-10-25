"use client";

import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { forwardRef, useImperativeHandle, useState } from "react";
import { formatTimeByPreference } from "@/lib/utils";
import { useProfile } from "@/hooks/useProfile";
import Select from "@/components/form/Select";

type Schedule = {
  _id: string;
  status: string;
  type: string;
  client_name: string;
  schedule_no: string;
  site_address: string;
  project_name?: string;
  tm_count: number;
  created_at: string;
  plant_id?: string;
  mother_plant_name?: string;
  // New cancelation object from API (kept alongside legacy fields for compatibility)
  cancelation?: {
    canceled_by?: string;
    reason?: string;
  };
  input_params: {
    quantity: number;
    pumping_speed: number;
    onward_time: number;
    return_time: number;
    buffer_time: number;
    load_time: number;
    pump_start: string;
    schedule_date: string;
    pump_start_time_from_plant: string;
    pump_fixing_time: number;
    pump_removal_time: number;
    unloading_time: number;
    pump_onward_time?: number;
  };
  output_table: Array<{
    trip_no: number;
    tm_no: string;
    tm_id: string;
    plant_load: string;
    plant_buffer: string;
    plant_start: string;
    pump_start: string;
    unloading_time: string;
    return: string;
    completed_capacity: number;
    cycle_time?: number;
    trip_no_for_tm?: number;
    cushion_time?: number;
    plant_name?: string;
  }>;
  tm_overrule?: number;
  total_tm_deployed?: number;
  // Legacy fields (backward compatibility)
  cancelled_by?: "CLIENT" | "COMPANY";
  cancellation_reason?: string;
};

export type ScheduleWiseTableExportSheet = {
  name: string;
  rows: (string | number)[][];
};

export type ScheduleWiseTableExportHandle = {
  getExportSheets: () => ScheduleWiseTableExportSheet[];
};

type ScheduleWiseTableProps = {
  data: Schedule[];
  plantIdToName: Record<string, string>;
  selectedDate: string;
};

const ScheduleWiseTable = forwardRef<ScheduleWiseTableExportHandle, ScheduleWiseTableProps>(
  ({ data, selectedDate }: ScheduleWiseTableProps, exportRef) => {
    const [statusFilter, setStatusFilter] = useState<"all" | "generated" | "cancelled">("generated");
    const { profile } = useProfile();

    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
    };

    const getPumpSupplyType = (type: string) => {
      return type === "supply" ? "S" : "P";
    };

    const isScheduleCancelled = (schedule: Schedule): boolean => {
      return (
        schedule.status === "cancelled" ||
        !!schedule.cancelation?.canceled_by ||
        !!schedule.cancelled_by ||
        !!schedule.cancelation?.reason ||
        !!schedule.cancellation_reason
      );
    };

    const filteredData = data.filter((schedule) => {
      switch (statusFilter) {
        case "cancelled":
          return isScheduleCancelled(schedule);
        case "generated":
          return !isScheduleCancelled(schedule);
        case "all":
        default:
          return true;
      }
    });

    const showCancellationColumns = statusFilter === "cancelled" || statusFilter === "all";

    const handleRowClick = (schedule: Schedule) => {
      const route =
        schedule.type === "supply"
          ? `/supply-schedules/${schedule._id}/view`
          : `/pumping-schedules/${schedule._id}/view`;

      window.open(route, "_blank"); // opens in new tab
    };

    useImperativeHandle(exportRef, () => ({
      getExportSheets: () => {
        const rows: (string | number)[][] = [];
        const headers = [
          "SL. NO",
          "DATE",
          "SCH. NO (Motherplant-Date-Number)",
          "CUSTOMER NAME",
          "PROJECT NAME",
          "PUMP/SUPPLY",
          "QTY IN m³",
          "PUMP SCHD",
          "TM SCHD",
          "TM QUEUE",
          "TOTAL TM DEPLOYED",
          "PUMP START-END TIME",
          "TM START-END TIME",
        ];

        if (showCancellationColumns) {
          headers.push("SCH CANCELLED BY", "REASON FOR CANCELLATION");
        }

        rows.push(headers);

        filteredData.forEach((schedule, index) => {
          const calculatePumpEnd = (s: Schedule): string | null => {
            const { input_params } = s;
            if (!input_params?.pump_start) return null;
            const startTime = new Date(input_params.pump_start);
            const pumpingHours =
              input_params.pumping_speed > 0 ? input_params.quantity / input_params.pumping_speed : 0;
            const totalMinutes =
              (input_params.pump_fixing_time || 0) + pumpingHours * 60 + (input_params.pump_removal_time || 0);
            const endTime = new Date(startTime.getTime() + totalMinutes * 60 * 1000);
            return endTime.toISOString();
          };

          const calculateTmTimes = (s: Schedule) => {
            if (!s.output_table || s.output_table.length === 0)
              return { tmStart: null as string | null, tmEnd: null as string | null };
            const tmStart = s.output_table[0]?.plant_start || null;
            const tmEnd = s.output_table[s.output_table.length - 1]?.return || null;
            return { tmStart, tmEnd };
          };

          const pumpAllocated = schedule.input_params.pump_start ? 1 : 0;
          const tmQueue = schedule.tm_overrule ? schedule.tm_overrule - schedule.tm_count : 0;
          const totalTmDeployed = schedule.tm_overrule ? schedule.tm_overrule : schedule.tm_count;
          const pumpStartEnd = schedule.input_params.pump_start
            ? `${formatTimeByPreference(schedule.input_params.pump_start)} to ${
                calculatePumpEnd(schedule) ? formatTimeByPreference(calculatePumpEnd(schedule)!) : "-"
              }`
            : "-";
          const { tmStart, tmEnd } = calculateTmTimes(schedule);
          const tmStartEnd =
            tmStart && tmEnd ? `${formatTimeByPreference(tmStart)} to ${formatTimeByPreference(tmEnd)}` : "-";

          const canceledBy = (schedule.cancelation?.canceled_by || schedule.cancelled_by || "-") as string;
          const reason = schedule.cancelation?.reason || schedule.cancellation_reason || "-";

          const rowData: (string | number)[] = [
            index + 1,
            formatDate(schedule.input_params.schedule_date),
            schedule.schedule_no || "-",
            schedule.client_name || "-",
            schedule.project_name || "-",
            getPumpSupplyType(schedule.type),
            schedule.input_params.quantity,
            pumpAllocated,
            schedule.tm_count,
            tmQueue,
            totalTmDeployed,
            pumpStartEnd,
            tmStartEnd,
          ];

          if (showCancellationColumns) {
            rowData.push(typeof canceledBy === "string" ? canceledBy.toUpperCase() : canceledBy, reason);
          }

          rows.push(rowData);
        });

        // Add summary row to export
        const exportSummary = filteredData.reduce(
          (acc, schedule) => {
            acc.totalQuantity += schedule.input_params.quantity;
            acc.totalPumpAllocated += schedule.input_params.pump_start ? 1 : 0;
            acc.totalTmAllocated += schedule.tm_count;
            acc.totalTmQueue += schedule.tm_overrule ? schedule.tm_overrule - schedule.tm_count : 0;
            acc.totalTmDeployed += schedule.tm_overrule ? schedule.tm_overrule : schedule.tm_count;
            return acc;
          },
          {
            totalQuantity: 0,
            totalPumpAllocated: 0,
            totalTmAllocated: 0,
            totalTmQueue: 0,
            totalTmDeployed: 0,
          }
        );

        const summaryRow: (string | number)[] = [
          "TOTAL",
          "-",
          "-",
          "-",
          "-",
          "-",
          exportSummary.totalQuantity,
          exportSummary.totalPumpAllocated,
          exportSummary.totalTmAllocated,
          exportSummary.totalTmQueue,
          exportSummary.totalTmDeployed,
          "-",
          "-",
        ];

        if (showCancellationColumns) {
          summaryRow.push("-", "-");
        }

        rows.push(summaryRow);

        return [
          {
            name: `Schedule Wise - ${formatDate(selectedDate)}`,
            rows,
          },
        ];
      },
    }));

    if (!data || data.length === 0) {
      return (
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">No schedules found for the selected date or plant</p>
          </div>
        </div>
      );
    }

    if (filteredData.length === 0) {
      return (
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Schedule Wise Report - {formatDate(selectedDate)}
              </h3>
              <div className="w-40">
                <h4>Schedule Status</h4>
                <Select
                  options={[
                    { value: "generated", label: "Generated" },
                    { value: "cancelled", label: "Cancelled" },
                    { value: "all", label: "All" },
                  ]}
                  defaultValue={statusFilter}
                  onChange={(value: string) => setStatusFilter(value as "all" | "generated" | "cancelled")}
                />
              </div>
            </div>
            <div className="p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                No {statusFilter} schedules found for the selected date or plant
              </p>
            </div>
          </div>
        </div>
      );
    }

    const calculatePumpEnd = (schedule: Schedule): string | null => {
      const { input_params } = schedule;
      if (!input_params?.pump_start) return null;

      const startTime = new Date(input_params.pump_start);
      const pumpingHours = input_params.pumping_speed > 0 ? input_params.quantity / input_params.pumping_speed : 0;

      const totalMinutes =
        (input_params.pump_fixing_time || 0) + pumpingHours * 60 + (input_params.pump_removal_time || 0);

      const endTime = new Date(startTime.getTime() + totalMinutes * 60 * 1000);
      return endTime.toISOString();
    };

    const calculateTmTimes = (schedule: Schedule) => {
      if (!schedule.output_table || schedule.output_table.length === 0) return { tmStart: null, tmEnd: null };

      const tmStart = schedule.output_table[0]?.plant_start || null;
      const tmEnd = schedule.output_table[schedule.output_table.length - 1]?.return || null;

      return { tmStart, tmEnd };
    };

    // Calculate summary totals
    const calculateSummary = () => {
      const totals = filteredData.reduce(
        (acc, schedule) => {
          acc.totalQuantity += schedule.input_params.quantity;
          acc.totalPumpAllocated += schedule.input_params.pump_start ? 1 : 0;
          acc.totalTmAllocated += schedule.tm_count;
          acc.totalTmQueue += schedule.tm_overrule ? schedule.tm_overrule - schedule.tm_count : 0;
          acc.totalTmDeployed += schedule.tm_overrule ? schedule.tm_overrule : schedule.tm_count;
          return acc;
        },
        {
          totalQuantity: 0,
          totalPumpAllocated: 0,
          totalTmAllocated: 0,
          totalTmQueue: 0,
          totalTmDeployed: 0,
        }
      );
      return totals;
    };

    const summaryTotals = calculateSummary();

    return (
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Schedule Wise Report - {formatDate(selectedDate)}
            </h3>
            <div className="flex flex-row items-center justify-center gap-4">
              <h4 className="text-sm text-gray-600 dark:text-gray-200 whitespace-nowrap">Schedule Status</h4>

              <Select
                options={[
                  { value: "generated", label: "Generated" },
                  { value: "cancelled", label: "Cancelled" },
                  { value: "all", label: "All" },
                ]}
                defaultValue={statusFilter}
                onChange={(value: string) => setStatusFilter(value as "all" | "generated" | "cancelled")}
                className="w-40"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="overflow-hidden">
              <Table className="w-full">
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="px-3 py-3 font-medium text-gray-500 text-start text-xs dark:text-gray-400"
                    >
                      SL. NO
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-3 font-medium text-gray-500 text-start text-xs dark:text-gray-400"
                    >
                      DATE
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-3 font-medium text-gray-500 text-start text-xs dark:text-gray-400 flex flex-col "
                    >
                      SCH. NO
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">(Motherplant-Date-Number)</span>
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-3 font-medium text-gray-500 text-start text-xs dark:text-gray-400"
                    >
                      CUSTOMER NAME
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-3 font-medium text-gray-500 text-start text-xs dark:text-gray-400"
                    >
                      PROJECT NAME
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-3 font-medium text-gray-500 text-start text-xs dark:text-gray-400"
                    >
                      PUMP/SUPPLY
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-3 font-medium text-gray-500 text-start text-xs dark:text-gray-400"
                    >
                      QTY IN m³
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-3 font-medium text-gray-500 text-start text-xs dark:text-gray-400"
                    >
                      PUMP SCHD
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-3 font-medium text-gray-500 text-start text-xs dark:text-gray-400"
                    >
                      TM SCHD
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-3 font-medium text-gray-500 text-start text-xs dark:text-gray-400"
                    >
                      TM QUEUE
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-3 font-medium text-gray-500 text-start text-xs dark:text-gray-400"
                    >
                      TOTAL TM DEPLOYED
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-3 font-medium text-gray-500 text-start text-xs dark:text-gray-400"
                    >
                      PUMP START-END TIME
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-3 font-medium text-gray-500 text-start text-xs dark:text-gray-400"
                    >
                      TM START-END TIME
                    </TableCell>
                    {showCancellationColumns && (
                      <>
                        <TableCell
                          isHeader
                          className="px-3 py-3 font-medium text-gray-500 text-start text-xs dark:text-gray-400"
                        >
                          SCH CANCELLED BY
                        </TableCell>
                        <TableCell
                          isHeader
                          className="px-3 py-3 font-medium text-gray-500 text-start text-xs dark:text-gray-400"
                        >
                          REASON FOR CANCELLATION
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {filteredData.map((schedule, index) => (
                    <TableRow
                      key={schedule._id}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors"
                      onClick={() => handleRowClick(schedule)}
                    >
                      <TableCell className="px-3 py-4 text-start text-sm text-gray-800 dark:text-white/90">
                        {index + 1}
                      </TableCell>
                      <TableCell className="px-3 py-4 text-start text-sm text-gray-800 dark:text-white/90">
                        {formatDate(schedule.input_params.schedule_date)}
                      </TableCell>
                      <TableCell className="px-3 py-4 text-start text-sm text-gray-800 dark:text-white/90">
                        {schedule.schedule_no && schedule.schedule_no}
                      </TableCell>
                      <TableCell className="px-3 py-4 text-start text-sm text-gray-800 dark:text-white/90">
                        {schedule.client_name}
                      </TableCell>
                      <TableCell className="px-3 py-4 text-start text-sm text-gray-800 dark:text-white/90">
                        {schedule.project_name || "-"}
                      </TableCell>
                      <TableCell className="px-3 py-4 text-start text-sm text-gray-800 dark:text-white/90">
                        {getPumpSupplyType(schedule.type)}
                      </TableCell>
                      <TableCell className="px-3 py-4 text-start text-sm text-gray-800 dark:text-white/90">
                        {schedule.input_params.quantity}
                      </TableCell>
                      <TableCell className="px-3 py-4 text-start text-sm text-gray-800 dark:text-white/90">
                        {schedule.input_params.pump_start && 1}
                      </TableCell>
                      <TableCell className="px-3 py-4 text-start text-sm text-gray-800 dark:text-white/90">
                        {schedule.tm_count}
                      </TableCell>
                      <TableCell className="px-3 py-4 text-start text-sm text-gray-800 dark:text-white/90">
                        {schedule.tm_overrule ? schedule.tm_overrule - schedule.tm_count : 0}
                      </TableCell>
                      <TableCell className="px-3 py-4 text-start text-sm text-gray-800 dark:text-white/90">
                        {schedule.tm_overrule ? schedule.tm_overrule : schedule.tm_count}
                      </TableCell>
                      <TableCell className="px-3 py-4 text-start text-sm text-gray-800 dark:text-white/90">
                        {schedule.input_params.pump_start
                          ? `${formatTimeByPreference(
                              schedule.input_params.pump_start,
                              profile?.preferred_format
                            )} to ${
                              calculatePumpEnd(schedule)
                                ? formatTimeByPreference(calculatePumpEnd(schedule)!, profile?.preferred_format)
                                : "-"
                            }`
                          : "-"}
                      </TableCell>
                      <TableCell className="px-3 py-4 text-start text-sm text-gray-800 dark:text-white/90">
                        {(() => {
                          const { tmStart, tmEnd } = calculateTmTimes(schedule);
                          return tmStart && tmEnd
                            ? `${formatTimeByPreference(
                                tmStart,
                                profile?.preferred_format
                              )} to ${formatTimeByPreference(tmEnd, profile?.preferred_format)}`
                            : "-";
                        })()}
                      </TableCell>

                      {showCancellationColumns && (
                        <>
                          <TableCell className="px-3 py-4 text-start text-sm text-gray-800 dark:text-white/90">
                            {schedule.cancelation?.canceled_by || schedule.cancelled_by || "-"}
                          </TableCell>
                          <TableCell className="px-3 py-4 text-start text-sm text-gray-800 dark:text-white/90">
                            {schedule.cancelation?.reason || schedule.cancellation_reason || "-"}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}

                  {/* Summary Row */}
                  <TableRow className="bg-gray-50 dark:bg-white/[0.05] border-t-2 border-gray-300 dark:border-gray-600">
                    <TableCell className="px-3 py-4 text-start text-sm font-semibold text-gray-900 dark:text-white">
                      TOTAL
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start text-sm font-semibold text-gray-900 dark:text-white">
                      -
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start text-sm font-semibold text-gray-900 dark:text-white">
                      -
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start text-sm font-semibold text-gray-900 dark:text-white">
                      -
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start text-sm font-semibold text-gray-900 dark:text-white">
                      -
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start text-sm font-semibold text-gray-900 dark:text-white">
                      -
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start text-sm font-semibold text-gray-900 dark:text-white">
                      {summaryTotals.totalQuantity}
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start text-sm font-semibold text-gray-900 dark:text-white">
                      {summaryTotals.totalPumpAllocated}
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start text-sm font-semibold text-gray-900 dark:text-white">
                      {summaryTotals.totalTmAllocated}
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start text-sm font-semibold text-gray-900 dark:text-white">
                      {summaryTotals.totalTmQueue}
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start text-sm font-semibold text-gray-900 dark:text-white">
                      {summaryTotals.totalTmDeployed}
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start text-sm font-semibold text-gray-900 dark:text-white">
                      -
                    </TableCell>
                    {showCancellationColumns && (
                      <>
                        <TableCell className="px-3 py-4 text-start text-sm font-semibold text-gray-900 dark:text-white">
                          -
                        </TableCell>
                        <TableCell className="px-3 py-4 text-start text-sm font-semibold text-gray-900 dark:text-white">
                          -
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ScheduleWiseTable.displayName = "ScheduleWiseTable";

export default ScheduleWiseTable;

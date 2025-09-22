"use client";

import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { useState } from "react";
import { formatTimeByPreference } from "@/lib/utils";

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
  cancelled_by?: "CLIENT" | "COMPANY";
  cancellation_reason?: string;
};

type ScheduleWiseTableProps = {
  data: Schedule[];
  plantIdToName: Record<string, string>;
  selectedDate: string;
};

const cancellationReasons = [
  "RAIN",
  "ORDER EXCEED CR LIMIT",
  "CLIENT REQUEST",
  "EQUIPMENT FAILURE",
  "SITE ACCESS ISSUE",
  "WEATHER CONDITIONS",
  "OTHER",
];

export default function ScheduleWiseTable({ data, selectedDate }: ScheduleWiseTableProps) {
  const [editingCancellation, setEditingCancellation] = useState<string | null>(null);
  const [editingReason, setEditingReason] = useState<string>("");

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const getPumpSupplyType = (type: string) => {
    return type === "supply" ? "S" : "P";
  };

  const handleCancellationEdit = (scheduleId: string, currentReason?: string) => {
    setEditingCancellation(scheduleId);
    setEditingReason(currentReason || "");
  };

  const handleCancellationSave = (scheduleId: string) => {
    // Here you would typically make an API call to update the cancellation reason
    console.log(`Updating cancellation reason for ${scheduleId} to: ${editingReason}`);
    setEditingCancellation(null);
    setEditingReason("");
  };

  const handleCancellationCancel = () => {
    setEditingCancellation(null);
    setEditingReason("");
  };

  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">No schedules found for the selected date</p>
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

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Schedule Wise Report - {formatDate(selectedDate)}
        </h3>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="overflow-x-auto custom-scrollbar">
            <Table className="min-w-max">
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
                    className="px-3 py-3 font-medium text-gray-500 text-start text-xs dark:text-gray-400"
                  >
                    SCH. NO
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
                    PUMP ALLOCATED
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-3 py-3 font-medium text-gray-500 text-start text-xs dark:text-gray-400"
                  >
                    TM ALLOCATED
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
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {data.map((schedule, index) => (
                  <TableRow key={schedule._id}>
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
                        ? `${formatTimeByPreference(schedule.input_params.pump_start)} to ${
                            calculatePumpEnd(schedule) ? formatTimeByPreference(calculatePumpEnd(schedule)!) : "-"
                          }`
                        : "-"}
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start text-sm text-gray-800 dark:text-white/90">
                      {(() => {
                        const { tmStart, tmEnd } = calculateTmTimes(schedule);
                        return tmStart && tmEnd
                          ? `${formatTimeByPreference(tmStart)} to ${formatTimeByPreference(tmEnd)}`
                          : "-";
                      })()}
                    </TableCell>

                    <TableCell className="px-3 py-4 text-start text-sm text-gray-800 dark:text-white/90">
                      {schedule.cancelled_by || "-"}
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start text-sm">
                      {editingCancellation === schedule._id ? (
                        <div className="flex items-center gap-2">
                          <Dropdown isOpen={true} onClose={() => {}} className="w-48">
                            <div className="p-2">
                              {cancellationReasons.map((reason) => (
                                <button
                                  key={reason}
                                  className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-800 dark:text-white/90"
                                  onClick={() => setEditingReason(reason)}
                                >
                                  {reason}
                                </button>
                              ))}
                            </div>
                          </Dropdown>
                          <Button size="sm" onClick={() => handleCancellationSave(schedule._id)} className="text-xs">
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancellationCancel} className="text-xs">
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-800 dark:text-white/90 text-xs">
                            {schedule.cancellation_reason || "-"}
                          </span>
                          {schedule.status.toLowerCase() === "cancelled" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancellationEdit(schedule._id, schedule.cancellation_reason)}
                              className="text-xs"
                            >
                              Edit
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}

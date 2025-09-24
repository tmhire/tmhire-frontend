"use client";

import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { formatTimeByPreference, formatHoursAndMinutes } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/useApiClient";
import { useSession } from "next-auth/react";
import { forwardRef, useImperativeHandle } from "react";

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

type TM = {
  _id: string;
  tm_no: string;
  type: "TM" | "LP" | "BP";
  plant_id?: string;
  status?: string;
};

type Pump = {
  _id: string;
  pump_no: string;
  type: "TM" | "LP" | "BP";
  plant_id?: string;
  status?: string;
};

export type TruckWiseTableExportSheet = {
  name: string;
  rows: (string | number)[][];
  merges?: { s: { r: number; c: number }; e: { r: number; c: number } }[];
};

export type TruckWiseTableExportHandle = {
  getExportSheets: () => TruckWiseTableExportSheet[];
};

type TruckWiseTableProps = {
  data: Schedule[];
  selectedDate: string;
  selectedPlantId?: string;
};

type TimeSlot = {
  start: number;
  end: number;
  label: string;
  freeHours: number;
};

type TMSchedule = {
  tmNo: string;
  tmType: string;
  timeSlots: TimeSlot[];
  totalFreeHours: number;
  idlePercentage: number;
  schedules: Array<{
    customer: string;
    project: string;
    startTime: string;
    endTime: string;
    duration: number;
    scheduleId: string;
    scheduleNo: string;
  }>;
};

const TruckWiseTable = forwardRef<TruckWiseTableExportHandle, TruckWiseTableProps>(
  ({ data, selectedDate, selectedPlantId }: TruckWiseTableProps, exportRef) => {
    const { status } = useSession();
    const { fetchWithAuth } = useApiClient();

    // Fetch all TMs
    const { data: tms, isLoading: tmsLoading } = useQuery<TM[]>({
      queryKey: ["tms"],
      queryFn: async () => {
        const response = await fetchWithAuth("/tms");
        const data = await response.json();
        if (data.success) return data.data as TM[];
        return [];
      },
      enabled: status === "authenticated",
    });

    // Fetch all Pumps
    const { data: pumps, isLoading: pumpsLoading } = useQuery<Pump[]>({
      queryKey: ["pumps"],
      queryFn: async () => {
        const response = await fetchWithAuth("/pumps");
        const data = await response.json();
        if (data.success) return data.data as Pump[];
        return [];
      },
      enabled: status === "authenticated",
    });

    // Read company timing window from session (custom_start_hour)
    const { data: session } = useSession();

    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
    };

    // Determine base window start hour (default 7 AM)
    const baseStartHour: number = (() => {
      const raw = (session as unknown as { custom_start_hour?: number } | null)?.custom_start_hour;
      if (typeof raw === "number" && !isNaN(raw)) return Math.max(0, Math.min(23, Math.floor(raw)));
      return 7;
    })();

    // Build 6 slots of 4 hours each starting from baseStartHour
    const buildSlots = (): TimeSlot[] => {
      const slots: TimeSlot[] = [];

      const formatHourLabel = (h: number) => {
        const d = new Date(selectedDate);
        d.setHours(h, 0, 0, 0);
        return formatTimeByPreference(d, "24h");
      };

      for (let i = 0; i < 6; i++) {
        const start = (baseStartHour + i * 4) % 24;
        const end = (start + 4) % 24;
        const label = `${formatHourLabel(start)} - ${formatHourLabel(end)}`;
        slots.push({ start, end, label, freeHours: 4 });
      }
      return slots;
    };

    // Compute overlap in hours between [startHour,endHour) and a slot [slotStart,slotEnd) with wrap handling
    const computeOverlapHours = (startHour: number, endHour: number, slotStart: number, slotEnd: number): number => {
      // Normalize to minutes within a 24h ring relative to baseStartHour
      const toRing = (h: number) => ((h - baseStartHour + 24) % 24) * 60;
      const s = toRing(startHour);
      const e = toRing(endHour);
      const ss = toRing(slotStart);
      const se = toRing(slotEnd);

      // Expand intervals to handle wrap by possibly splitting
      const intervals =
        s <= e
          ? [[s, e]]
          : [
              [s, 24 * 60],
              [0, e],
            ];
      const slotIntervals =
        ss <= se
          ? [[ss, se]]
          : [
              [ss, 24 * 60],
              [0, se],
            ];

      let overlapMinutes = 0;
      for (const [a1, a2] of intervals) {
        for (const [b1, b2] of slotIntervals) {
          const st = Math.max(a1, b1);
          const en = Math.min(a2, b2);
          if (st < en) overlapMinutes += en - st;
        }
      }
      return overlapMinutes / 60;
    };

    const processAllTrucks = (): TMSchedule[] => {
      const truckMap = new Map<string, TMSchedule>();

      // Process all TMs
      if (tms) {
        tms.forEach((tm) => {
          // If a plant is selected, include only TMs from that plant
          if (selectedPlantId && tm.plant_id && tm.plant_id !== selectedPlantId) return;
          const anyTm = tm as unknown as { tm_no?: string; identifier?: string; type?: string; _id: string };
          const tmNo = anyTm.tm_no || anyTm.identifier || `TM-${anyTm._id}`;
          truckMap.set(tmNo, {
            tmNo,
            tmType: (anyTm.type as string) || "TM",
            timeSlots: buildSlots(),
            totalFreeHours: 24,
            idlePercentage: 100,
            schedules: [],
          });
        });
      }

      // Process all Pumps
      if (pumps) {
        pumps.forEach((pump) => {
          // If a plant is selected, include only Pumps from that plant
          if (selectedPlantId && pump.plant_id && pump.plant_id !== selectedPlantId) return;
          const anyPump = pump as unknown as { pump_no?: string; identifier?: string; type?: string; _id: string };
          const pumpNo = anyPump.pump_no || anyPump.identifier || `P-${anyPump._id}`;
          const mappedType = (anyPump.type || "line").toLowerCase() === "boom" ? "BP" : "LP";
          truckMap.set(pumpNo, {
            tmNo: pumpNo,
            tmType: mappedType,
            timeSlots: buildSlots(),
            totalFreeHours: 24,
            idlePercentage: 100,
            schedules: [],
          });
        });
      }

      // Now process scheduled data to update time slots
      data.forEach((schedule) => {
        if (schedule.output_table && schedule.output_table.length > 0) {
          schedule.output_table.forEach((trip) => {
            const tmNo = trip.tm_no || `TM-${trip.tm_id}`;
            let truck = truckMap.get(tmNo);

            // If TM not present from master list, create from schedule data
            if (!truck) {
              // When a plant filter is active, do not create trucks from schedule data
              if (selectedPlantId) {
                return;
              }
              const created: TMSchedule = {
                tmNo,
                tmType: "TM",
                timeSlots: buildSlots(),
                totalFreeHours: 24,
                idlePercentage: 100,
                schedules: [],
              };
              truckMap.set(tmNo, created);
              truck = created;
            }

            if (truck) {
              const startTime = new Date(trip.plant_start);
              const endTime = new Date(trip.return);
              const startHour = startTime.getHours() + startTime.getMinutes() / 60;
              const endHour = endTime.getHours() + endTime.getMinutes() / 60;

              // Update time slots using accurate overlap vs company window
              truck.timeSlots.forEach((slot) => {
                const overlap = computeOverlapHours(startHour, endHour, slot.start, slot.end);
                if (overlap > 0) {
                  slot.freeHours = Math.max(0, slot.freeHours - overlap);
                }
              });

              // Add schedule
              truck.schedules.push({
                customer: schedule.client_name,
                project: schedule.project_name || "-",
                startTime: formatTimeByPreference(trip.plant_start),
                endTime: formatTimeByPreference(trip.return),
                duration: Math.max(0, endHour - startHour),
                scheduleId: schedule._id,
                scheduleNo: schedule.schedule_no,
              });
            }
          });
        }
      });

      // Calculate totals and percentages
      truckMap.forEach((truck) => {
        truck.totalFreeHours = truck.timeSlots.reduce((sum, slot) => sum + slot.freeHours, 0);
        truck.idlePercentage = Math.round((truck.totalFreeHours / 24) * 100);
      });

      return Array.from(truckMap.values());
    };

    const allTrucks = processAllTrucks();

    // Get unique schedules from all trucks
    const getUniqueSchedules = () => {
      const scheduleMap = new Map<string, {
        scheduleId: string;
        scheduleNo: string;
        customer: string;
        project: string;
        startTime: string;
        endTime: string;
        duration: number;
      }>();

      allTrucks.forEach(truck => {
        truck.schedules.forEach(schedule => {
          if (!scheduleMap.has(schedule.scheduleId)) {
            scheduleMap.set(schedule.scheduleId, {
              scheduleId: schedule.scheduleId,
              scheduleNo: schedule.scheduleNo,
              customer: schedule.customer,
              project: schedule.project,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              duration: schedule.duration,
            });
          }
        });
      });

      return Array.from(scheduleMap.values()).sort((a, b) => a.scheduleNo.localeCompare(b.scheduleNo));
    };

    const uniqueSchedules = getUniqueSchedules();

    // Calculate totals by type
    const calculateTotals = () => {
      const tms = allTrucks.filter((truck) => truck.tmType === "TM");
      const linePumps = allTrucks.filter((truck) => truck.tmType === "LP");
      const boomPumps = allTrucks.filter((truck) => truck.tmType === "BP");

      const calculateTypeTotals = (trucks: TMSchedule[]) => {
        const totals = [0, 0, 0, 0, 0, 0]; // used hours per slot

        trucks.forEach((truck) => {
          truck.timeSlots.forEach((slot, index) => {
            const used = Math.max(0, 4 - slot.freeHours);
            totals[index] += used;
          });
        });

        return { timeSlotTotals: totals };
      };

      return {
        tms: calculateTypeTotals(tms),
        linePumps: calculateTypeTotals(linePumps),
        boomPumps: calculateTypeTotals(boomPumps),
      };
    };

    const totals = calculateTotals();

    // Build export sheets mirroring UI tables
    useImperativeHandle(exportRef, () => ({
      getExportSheets: () => {
        // Build a single, side-by-side sheet with a shared TM No. column
        const combinedRows: (string | number)[][] = [];
        const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];

        // Define column blocks
        const mainCols = [
          "TM/LP/BP",
          ...buildSlots().map((s) => s.label),
          "TOTAL USED HOURS",
          "TOTAL UNUSED HOURS",
        ];
        const scheduleBlockCols = ["CUSTOMER NAME", "PROJECT", "TM ENGAGED HOURS"];

        // Header rows
        const superHeaderRow: (string | number)[] = [];
        const headerRow: (string | number)[] = [];

        // Shared first two columns (SL. NO and TM No.)
        superHeaderRow.push("");
        headerRow.push("SL. NO");
        superHeaderRow.push("");
        headerRow.push("TM No.");

        // Main block super header and subheaders
        superHeaderRow.push(`TRUCK WISE - ${formatDate(selectedDate)}`);
        // Fill empties to match merged span
        for (let i = 1; i < mainCols.length; i++) superHeaderRow.push("");
        headerRow.push(...mainCols);

        // Record merge for main block (row 0, columns 2..(1+mainCols.length)) after two fixed columns
        merges.push({ s: { r: 0, c: 2 }, e: { r: 0, c: 1 + mainCols.length } });

        // Detail blocks super headers and subheaders
        let currentColStart = 2 + mainCols.length + 1; // after SL. NO (col0), TM No. (col1) and main block (col2..)
        for (let scheduleIndex = 0; scheduleIndex < Math.min(6, uniqueSchedules.length); scheduleIndex++) {
          const schedule = uniqueSchedules[scheduleIndex];
          superHeaderRow.push(`SCHEDULE ${schedule.scheduleNo}`);
          // Fill empties to match merged span
          for (let i = 1; i < scheduleBlockCols.length; i++) superHeaderRow.push("");
          headerRow.push(...scheduleBlockCols);
          // Merge this super header across its 3 columns
          const startC = currentColStart - 1; // zero-based index for first col in this block
          const endC = startC + scheduleBlockCols.length - 1;
          merges.push({ s: { r: 0, c: startC }, e: { r: 0, c: endC } });
          currentColStart += scheduleBlockCols.length;
        }

        combinedRows.push(superHeaderRow);
        combinedRows.push(headerRow);

        // Data rows aligned by TM No
        allTrucks.forEach((tm, idx) => {
          const row: (string | number)[] = [];
          row.push(idx + 1);
          row.push(tm.tmNo);
          // Main block values
          const slotUsed = tm.timeSlots.map(
            (slot) => formatHoursAndMinutes(Math.max(0, 4 - slot.freeHours)) as unknown as number
          );
          row.push(
            tm.tmType,
            ...slotUsed,
            formatHoursAndMinutes(24 - tm.totalFreeHours) as unknown as number,
            formatHoursAndMinutes(tm.totalFreeHours) as unknown as number
          );
          // Detail blocks for schedules 1..6
          for (let scheduleIndex = 0; scheduleIndex < Math.min(6, uniqueSchedules.length); scheduleIndex++) {
            const uniqueSchedule = uniqueSchedules[scheduleIndex];
            const tmSchedule = tm.schedules.find(s => s.scheduleId === uniqueSchedule.scheduleId);
            row.push(
              tmSchedule?.customer || "-",
              tmSchedule?.project || "-",
              tmSchedule ? `${tmSchedule.startTime} - ${tmSchedule.endTime}` : "-"
            );
          }
          combinedRows.push(row);
        });

        return [{ name: `Truck Wise - ${formatDate(selectedDate)}`, rows: combinedRows, merges }];
      },
    }));

    if (tmsLoading || pumpsLoading) {
      return (
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">Loading truck data...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Truck Wise Report - {formatDate(selectedDate)}
            </h3>

            {/* Main Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
              <div className="max-w-full overflow-x-auto">
                <Table>
                  <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                    <TableRow>
                      <TableCell
                        isHeader
                        className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r"
                      >
                        SL. NO
                      </TableCell>
                      <TableCell
                        isHeader
                        className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r"
                      >
                        TM No.
                      </TableCell>
                      <TableCell
                        isHeader
                        className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r"
                      >
                        TM/LP/BP
                      </TableCell>
                      {buildSlots().map((slot, i) => (
                          <TableCell
                            key={i}
                            isHeader
                            className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r"
                          >
                            {slot.label}
                          </TableCell>
                        ))}
                      <TableCell
                        isHeader
                        className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r"
                      >
                        TOTAL USED HOURS
                      </TableCell>
                      <TableCell
                        isHeader
                        className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400"
                      >
                        TOTAL UNUSED HOURS
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {/* TMs */}
                    {allTrucks
                      .filter((truck) => truck.tmType === "TM")
                      .map((tm, idx) => (
                        <TableRow key={tm.tmNo}>
                          <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                            {tm.tmNo}
                          </TableCell>
                          <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                            {tm.tmType}
                          </TableCell>
                          {tm.timeSlots.map((slot, slotIndex) => (
                              <TableCell
                                key={slotIndex}
                                className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r"
                              >
                                {formatHoursAndMinutes(Math.max(0, 4 - slot.freeHours))}
                              </TableCell>
                            ))}
                          <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                            {formatHoursAndMinutes(24 - tm.totalFreeHours)}
                          </TableCell>
                          <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90">
                            {formatHoursAndMinutes(tm.totalFreeHours)}
                          </TableCell>
                        </TableRow>
                      ))}

                    {/* TMs Total Row */}
                    <TableRow className="bg-gray-50 dark:bg-gray-800 font-semibold">
                      <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                        TOTAL
                      </TableCell>
                      <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                        TMs
                      </TableCell>
                      <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                        {null}
                      </TableCell>
                      {totals.tms.timeSlotTotals.map((total, index) => (
                          <TableCell
                            key={index}
                            className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r"
                          >
                            {formatHoursAndMinutes(total)}
                          </TableCell>
                        ))}
                      <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                        {null}
                      </TableCell>
                      <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90">
                        {null}
                      </TableCell>
                    </TableRow>

                    {/* Line Pumps */}
                    {allTrucks
                      .filter((truck) => truck.tmType === "LP")
                      .map((tm, idx) => (
                        <TableRow key={tm.tmNo}>
                          <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                            {tm.tmNo}
                          </TableCell>
                          <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                            {tm.tmType}
                          </TableCell>
                          {tm.timeSlots.map((slot, slotIndex) => (
                              <TableCell
                                key={slotIndex}
                                className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r"
                              >
                                {formatHoursAndMinutes(Math.max(0, 4 - slot.freeHours))}
                              </TableCell>
                            ))}
                          <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                            {formatHoursAndMinutes(24 - tm.totalFreeHours)}
                          </TableCell>
                          <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90">
                            {formatHoursAndMinutes(tm.totalFreeHours)}
                          </TableCell>
                        </TableRow>
                      ))}

                    {/* Line Pumps Total Row */}
                    {allTrucks.filter((truck) => truck.tmType === "LP").length > 0 && (
                      <TableRow className="bg-gray-50 dark:bg-gray-800 font-semibold">
                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                          TOTAL
                        </TableCell>
                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                          LPs
                        </TableCell>
                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                          {null}
                        </TableCell>

                        {totals.linePumps.timeSlotTotals.map((total, index) => (
                            <TableCell
                              key={index}
                              className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r"
                            >
                              {formatHoursAndMinutes(total)}
                            </TableCell>
                          ))}
                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                          {null}
                        </TableCell>
                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90">
                          {null}
                        </TableCell>
                      </TableRow>
                    )}

                    {/* Boom Pumps */}
                    {allTrucks
                      .filter((truck) => truck.tmType === "BP")
                      .map((tm, idx) => (
                        <TableRow key={tm.tmNo}>
                          <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                            {tm.tmNo}
                          </TableCell>
                          <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                            {tm.tmType}
                          </TableCell>
                          {tm.timeSlots.map((slot, slotIndex) => (
                              <TableCell
                                key={slotIndex}
                                className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r"
                              >
                                {formatHoursAndMinutes(Math.max(0, 4 - slot.freeHours))}
                              </TableCell>
                            ))}
                          <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                            {formatHoursAndMinutes(24 - tm.totalFreeHours)}
                          </TableCell>
                          <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90">
                            {formatHoursAndMinutes(tm.totalFreeHours)}
                          </TableCell>
                        </TableRow>
                      ))}

                    {/* Boom Pumps Total Row */}
                    {allTrucks.filter((truck) => truck.tmType === "BP").length > 0 && (
                      <TableRow className="bg-gray-50 dark:bg-gray-800 font-semibold">
                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                          TOTAL
                        </TableCell>
                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                          BPs
                        </TableCell>
                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                          {null}
                        </TableCell>

                        {totals.boomPumps.timeSlotTotals.map((total, index) => (
                            <TableCell
                              key={index}
                              className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r"
                            >
                              {formatHoursAndMinutes(total)}
                            </TableCell>
                          ))}
                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                          {null}
                        </TableCell>
                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90">
                          {null}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule Detail Tables */}
        {uniqueSchedules.slice(0, 6).map((schedule) => (
          <div
            key={schedule.scheduleId}
            className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                SCHEDULE {schedule.scheduleNo}
              </h3>

              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                <div className="max-w-full overflow-x-auto">
                  <Table>
                    <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                      <TableRow>
                        <TableCell
                          isHeader
                          className="px-3 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400"
                        >
                          SL. NO
                        </TableCell>
                        <TableCell
                          isHeader
                          className="px-3 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400"
                        >
                          TM No.
                        </TableCell>
                        <TableCell
                          isHeader
                          className="px-3 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400"
                        >
                          CUSTOMER NAME
                        </TableCell>
                        <TableCell
                          isHeader
                          className="px-3 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400"
                        >
                          PROJECT
                        </TableCell>
                        <TableCell
                          isHeader
                          className="px-3 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400"
                        >
                          TM ENGAGED HOURS
                        </TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                      {allTrucks.map((tm, idx) => {
                        const tmSchedule = tm.schedules.find(s => s.scheduleId === schedule.scheduleId);
                        return (
                          <TableRow key={tm.tmNo}>
                            <TableCell className="px-3 py-3 text-center text-xs text-gray-800 dark:text-white/90">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="px-3 py-3 text-center text-xs text-gray-800 dark:text-white/90">
                              {tm.tmNo}
                            </TableCell>
                            <TableCell className="px-3 py-3 text-center text-xs text-gray-800 dark:text-white/90">
                              {tmSchedule?.customer || "-"}
                            </TableCell>
                            <TableCell className="px-3 py-3 text-center text-xs text-gray-800 dark:text-white/90">
                              {tmSchedule?.project || "-"}
                            </TableCell>
                            <TableCell className="px-3 py-3 text-center text-xs text-gray-800 dark:text-white/90">
                              {tmSchedule ? `${tmSchedule.startTime} - ${tmSchedule.endTime}` : "-"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
);

TruckWiseTable.displayName = "TruckWiseTable";

export default TruckWiseTable;

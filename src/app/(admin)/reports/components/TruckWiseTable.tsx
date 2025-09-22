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
  plantIdToName: Record<string, string>;
  selectedDate: string;
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
  }>;
};

const TruckWiseTable = forwardRef<TruckWiseTableExportHandle, TruckWiseTableProps>(
  ({ data, selectedDate }: TruckWiseTableProps, exportRef) => {
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
    for (let i = 0; i < 6; i++) {
      const start = (baseStartHour + i * 4) % 24;
      const end = (start + 4) % 24;
      const labelStart = start.toString().padStart(2, "0");
      const labelEnd = ((start + 4) % 24).toString().padStart(2, "0");
      slots.push({ start, end, label: `${labelStart}-${labelEnd} HOURS`, freeHours: 4 });
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
    const intervals = s <= e ? [[s, e]] : [[s, 24 * 60], [0, e]];
    const slotIntervals = ss <= se ? [[ss, se]] : [[ss, 24 * 60], [0, se]];

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
      tms.forEach(tm => {
        const anyTm = tm as unknown as { tm_no?: string; identifier?: string; type?: string; _id: string };
        const tmNo = anyTm.tm_no || anyTm.identifier || `TM-${anyTm._id}`;
        truckMap.set(tmNo, {
          tmNo,
          tmType: (anyTm.type as string) || "TM",
          timeSlots: buildSlots(),
          totalFreeHours: 24,
          idlePercentage: 100,
          schedules: []
        });
      });
    }

  // Process all Pumps
  if (pumps) {
    pumps.forEach(pump => {
      const anyPump = pump as unknown as { pump_no?: string; identifier?: string; type?: string; _id: string };
      const pumpNo = anyPump.pump_no || anyPump.identifier || `P-${anyPump._id}`;
      const mappedType = (anyPump.type || "line").toLowerCase() === "boom" ? "BP" : "LP";
      truckMap.set(pumpNo, {
        tmNo: pumpNo,
        tmType: mappedType,
        timeSlots: buildSlots(),
        totalFreeHours: 24,
        idlePercentage: 100,
        schedules: []
      });
    });
  }

    // Now process scheduled data to update time slots
    data.forEach(schedule => {
      if (schedule.output_table && schedule.output_table.length > 0) {
        schedule.output_table.forEach(trip => {
          const tmNo = trip.tm_no || `TM-${trip.tm_id}`;
          let truck = truckMap.get(tmNo);
          
          // If TM not present from master list, create from schedule data
          if (!truck) {
            const created: TMSchedule = {
              tmNo,
              tmType: "TM",
              timeSlots: buildSlots(),
              totalFreeHours: 24,
              idlePercentage: 100,
              schedules: []
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
            truck.timeSlots.forEach(slot => {
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
              duration: Math.max(0, endHour - startHour)
            });
          }
        });
      }
    });

    // Calculate totals and percentages
    truckMap.forEach(truck => {
      truck.totalFreeHours = truck.timeSlots.reduce((sum, slot) => sum + slot.freeHours, 0);
      truck.idlePercentage = Math.round((truck.totalFreeHours / 24) * 100);
    });

    return Array.from(truckMap.values());
  };

  const allTrucks = processAllTrucks();

  // Calculate totals by type
  const calculateTotals = () => {
    const tms = allTrucks.filter(truck => truck.tmType === "TM");
    const linePumps = allTrucks.filter(truck => truck.tmType === "LP");
    const boomPumps = allTrucks.filter(truck => truck.tmType === "BP");

    const calculateTypeTotals = (trucks: TMSchedule[]) => {
      const totals = [0, 0, 0, 0, 0, 0]; // used hours per slot
      let totalFreeHours = 0; // keep free hours for idle % / total free
      let totalUsedHours = 0;
      
      trucks.forEach(truck => {
        truck.timeSlots.forEach((slot, index) => {
          const used = Math.max(0, 4 - slot.freeHours);
          totals[index] += used;
          totalUsedHours += used;
        });
        totalFreeHours += truck.totalFreeHours;
      });

      return { timeSlotTotals: totals, totalFreeHours, totalUsedHours };
    };

    return {
      tms: calculateTypeTotals(tms),
      linePumps: calculateTypeTotals(linePumps),
      boomPumps: calculateTypeTotals(boomPumps)
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
        ...buildSlots().slice().reverse().map((s) => s.label),
        "TOTAL USED HOURS",
        "TOTAL UNUSED HOURS",
      ];
      const scheduleBlockCols = ["CUSTOMER NAME", "PROJECT", "TM ENGAGED HOURS"];

      // Header rows
      const superHeaderRow: (string | number)[] = [];
      const headerRow: (string | number)[] = [];

      // Shared first column
      superHeaderRow.push("");
      headerRow.push("TM No.");

      // Main block super header and subheaders
      superHeaderRow.push(`TRUCK WISE - ${formatDate(selectedDate)}`);
      // Fill empties to match merged span
      for (let i = 1; i < mainCols.length; i++) superHeaderRow.push("");
      headerRow.push(...mainCols);

      // Record merge for main block (row 0, columns 1..mainCols.length)
      merges.push({ s: { r: 0, c: 1 }, e: { r: 0, c: mainCols.length } });

      // Detail blocks super headers and subheaders
      const ordinal = (n: number) => (n === 1 ? "1ST" : n === 2 ? "2ND" : n === 3 ? "3RD" : `${n}TH`);
      let currentColStart = 1 + mainCols.length + 1; // after TM No (col0) and main block (col1..mainCols.length)
      for (let scheduleNumber = 1; scheduleNumber <= 6; scheduleNumber++) {
        superHeaderRow.push(`${ordinal(scheduleNumber)} SCHEDULE`);
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
      allTrucks.forEach((tm) => {
        const row: (string | number)[] = [];
        row.push(tm.tmNo);
        // Main block values
        const slotUsed = tm.timeSlots
          .slice()
          .reverse()
          .map((slot) => formatHoursAndMinutes(Math.max(0, 4 - slot.freeHours)) as unknown as number);
        row.push(
          tm.tmType,
          ...slotUsed,
          formatHoursAndMinutes(24 - tm.totalFreeHours) as unknown as number,
          formatHoursAndMinutes(tm.totalFreeHours) as unknown as number
        );
        // Detail blocks for schedules 1..6
        for (let scheduleNumber = 1; scheduleNumber <= 6; scheduleNumber++) {
          const schedule = tm.schedules[scheduleNumber - 1];
          row.push(
            schedule?.customer || "-",
            schedule?.project || "-",
            schedule ? `${schedule.startTime} - ${schedule.endTime}` : "-"
          );
        }
        combinedRows.push(row);
      });

      return [
        { name: `Truck Wise - ${formatDate(selectedDate)}`, rows: combinedRows, merges },
      ];
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
                    <TableCell isHeader className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r">
                      TM No.
                  </TableCell>
                    <TableCell isHeader className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r">
                      TM/LP/BP
                  </TableCell>
                    {buildSlots().slice().reverse().map((slot, i) => (
                      <TableCell key={i} isHeader className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r">
                        {slot.label}
                  </TableCell>
                    ))}
                    <TableCell isHeader className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r">
                      TOTAL USED HOURS
                  </TableCell>
                    <TableCell isHeader className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400">
                      TOTAL UNUSED HOURS
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {/* TMs */}
                  {allTrucks.filter(truck => truck.tmType === "TM").map((tm) => (
                    <TableRow key={tm.tmNo}>
                      <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                        {tm.tmNo}
                      </TableCell>
                      <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                        {tm.tmType}
                      </TableCell>
                      {tm.timeSlots.slice().reverse().map((slot, slotIndex) => (
                        <TableCell key={slotIndex} className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
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
                    {totals.tms.timeSlotTotals.slice().reverse().map((total, index) => (
                      <TableCell key={index} className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                        {formatHoursAndMinutes(total)}
                      </TableCell>
                    ))}
                    <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                      {formatHoursAndMinutes(totals.tms.totalUsedHours)}
                    </TableCell>
                    <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90">
                      {formatHoursAndMinutes(totals.tms.totalFreeHours)}
                    </TableCell>
                  </TableRow>

                  {/* Line Pumps */}
                  {allTrucks.filter(truck => truck.tmType === "LP").map((tm) => (
                    <TableRow key={tm.tmNo}>
                      <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                        {tm.tmNo}
                      </TableCell>
                      <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                        {tm.tmType}
                      </TableCell>
                      {tm.timeSlots.slice().reverse().map((slot, slotIndex) => (
                        <TableCell key={slotIndex} className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
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
                  {allTrucks.filter(truck => truck.tmType === "LP").length > 0 && (
                    <TableRow className="bg-gray-50 dark:bg-gray-800 font-semibold">
                      <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                        TOTAL
                    </TableCell>
                      <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                        LPs
                    </TableCell>
                      {totals.linePumps.timeSlotTotals.slice().reverse().map((total, index) => (
                        <TableCell key={index} className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                          {formatHoursAndMinutes(total)}
                    </TableCell>
                      ))}
                      <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                        {formatHoursAndMinutes(totals.linePumps.totalUsedHours)}
                    </TableCell>
                      <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90">
                        {formatHoursAndMinutes(totals.linePumps.totalFreeHours)}
                    </TableCell>
                    </TableRow>
                  )}

                  {/* Boom Pumps */}
                  {allTrucks.filter(truck => truck.tmType === "BP").map((tm) => (
                    <TableRow key={tm.tmNo}>
                      <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                        {tm.tmNo}
                    </TableCell>
                      <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                        {tm.tmType}
                    </TableCell>
                      {tm.timeSlots.slice().reverse().map((slot, slotIndex) => (
                        <TableCell key={slotIndex} className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
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
                  {allTrucks.filter(truck => truck.tmType === "BP").length > 0 && (
                    <TableRow className="bg-gray-50 dark:bg-gray-800 font-semibold">
                      <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                        TOTAL
                      </TableCell>
                      <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                        BPs
                      </TableCell>
                      {totals.boomPumps.timeSlotTotals.slice().reverse().map((total, index) => (
                        <TableCell key={index} className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                          {formatHoursAndMinutes(total)}
                        </TableCell>
                      ))}
                      <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                        {formatHoursAndMinutes(totals.boomPumps.totalUsedHours)}
                      </TableCell>
                      <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90">
                        {formatHoursAndMinutes(totals.boomPumps.totalFreeHours)}
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
      {[1, 2, 3, 4, 5, 6].map(scheduleNumber => (
        <div key={scheduleNumber} className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {scheduleNumber === 1 ? "1ST" : scheduleNumber === 2 ? "2ND" : scheduleNumber === 3 ? "3RD" : `${scheduleNumber}TH`} SCHEDULE
            </h3>
            
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
              <div className="max-w-full overflow-x-auto">
                <Table>
                  <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                    <TableRow>
                      <TableCell isHeader className="px-3 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400">
                        TM No.
                      </TableCell>
                      <TableCell isHeader className="px-3 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400">
                        CUSTOMER NAME
                      </TableCell>
                      <TableCell isHeader className="px-3 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400">
                        PROJECT
                      </TableCell>
                      <TableCell isHeader className="px-3 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400">
                        TM ENGAGED HOURS
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {allTrucks.map((tm) => {
                      const schedule = tm.schedules[scheduleNumber - 1];
                      return (
                        <TableRow key={tm.tmNo}>
                          <TableCell className="px-3 py-3 text-center text-xs text-gray-800 dark:text-white/90">
                            {tm.tmNo}
                          </TableCell>
                          <TableCell className="px-3 py-3 text-center text-xs text-gray-800 dark:text-white/90">
                            {schedule?.customer || "-"}
                          </TableCell>
                          <TableCell className="px-3 py-3 text-center text-xs text-gray-800 dark:text-white/90">
                            {schedule?.project || "-"}
                          </TableCell>
                          <TableCell className="px-3 py-3 text-center text-xs text-gray-800 dark:text-white/90">
                            {schedule ? `${schedule.startTime} - ${schedule.endTime}` : "-"}
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


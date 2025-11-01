"use client";

import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { formatTimeByPreference } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/useApiClient";
import { useSession } from "next-auth/react";
import { forwardRef, useImperativeHandle, useState } from "react";
import React from "react";
import { useProfile } from "@/hooks/useProfile";

type Schedule = {
  _id: string;
  status: string;
  type: string;
  client_name: string;
  schedule_no: string;
  site_address: string;
  project_name: string;
  tm_count: number;
  created_at: string;
  plant_id?: string;
  mother_plant_name?: string;
  pump: string;
  pump_type: string;
  input_params: {
    quantity: number;
    pumping_speed: number;
    onward_time: number;
    return_time: number;
    buffer_time: number;
    load_time: number;
    pump_start: string;
    schedule_date: string;
    pump_start_time_from_plant?: string;
    pump_fixing_time: number;
    pump_removal_time: number;
    unloading_time: number;
    pump_onward_time?: number;
    is_burst_model?: boolean;
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
  burst_table: Array<{
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
  selectedClientName?: string;
  selectedProjectName?: string;
  plantIdToName?: Record<string, string>;
};

type TimeSlot = {
  start: number;
  end: number;
  label: string;
  freeHours: number;
};

type ScheduleTimeSlot = {
  start: number;
  end: number;
  label: string;
  freeHours: number;
  tasks: Array<{ startHour: number; endHour: number }>;
};

type TMSchedule = {
  tmNo: string;
  tmType: string;
  timeSlots: TimeSlot[];
  scheduleSpecificTimeSlots: {
    [scheduleId: string]: ScheduleTimeSlot[];
  };
  totalFreeHours: number;
  idlePercentage: number;
  schedules: Array<{
    customer: string;
    project: string;
    plant: string;
    startTime: string;
    endTime: string;
    duration: number;
    scheduleId: string;
    scheduleNo: string;
  }>;
};

const TruckWiseTable = forwardRef<TruckWiseTableExportHandle, TruckWiseTableProps>(
  (
    {
      data,
      selectedDate,
      selectedPlantId,
      selectedClientName,
      selectedProjectName,
      plantIdToName,
    }: TruckWiseTableProps,
    exportRef
  ) => {
    const { status } = useSession();
    const { fetchWithAuth } = useApiClient();
    const { profile } = useProfile();

    const [isProjectWise, setIsProjectWise] = useState(false);

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
    // Helper function to parse time strings like "09:12 AM" to decimal hours
    const parseTimeString = (timeStr: string): number => {
      const [time, period] = timeStr.split(" ");
      const [hours, minutes] = time.split(":").map(Number);
      let hour24 = hours;
      if (period === "PM" && hours !== 12) hour24 += 12;
      if (period === "AM" && hours === 12) hour24 = 0;
      return hour24 + minutes / 60;
    };

    // Helper function to format hours and minutes as HH:MM
    const formatHoursMinutes = (hours: number): string => {
      const totalMinutes = Math.round(hours * 60);
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    };

    // Helper function to format time range for a slot
    const formatSlotTimeRange = (
      slot: TimeSlot,
      schedule: { startTime: string; endTime: string } | undefined
    ): string => {
      if (!schedule) return "";

      const scheduleStartHour = parseTimeString(schedule.startTime);
      const scheduleEndHour = parseTimeString(schedule.endTime);

      // Calculate the overlap with the slot
      const overlapStart = Math.max(scheduleStartHour, slot.start);
      const overlapEnd = Math.min(scheduleEndHour, slot.end);

      if (overlapStart >= overlapEnd) return "";

      // Convert decimal hours to time strings
      const startTime = new Date(selectedDate);
      startTime.setHours(Math.floor(overlapStart), (overlapStart % 1) * 60, 0, 0);

      const endTime = new Date(selectedDate);
      endTime.setHours(Math.floor(overlapEnd), (overlapEnd % 1) * 60, 0, 0);

      return `${formatTimeByPreference(startTime, profile?.preferred_format)} - ${formatTimeByPreference(
        endTime,
        profile?.preferred_format
      )}`;
    };

    const computeOverlapHours = (startHour: number, endHour: number, slotStart: number, slotEnd: number): number => {
      // // Normalize to minutes within a 24h ring relative to baseStartHour
      // const toRing = (h: number) => ((h - baseStartHour + 24) % 24) * 60;
      // const s = toRing(startHour);
      // const e = toRing(endHour);
      // const ss = toRing(slotStart);
      // const se = toRing(slotEnd);

      // // Expand intervals to handle wrap by possibly splitting
      // const intervals =
      //   s <= e
      //     ? [[s, e]]
      //     : [
      //         [s, 24 * 60],
      //         [0, e],
      //       ];
      // const slotIntervals =
      //   ss <= se
      //     ? [[ss, se]]
      //     : [
      //         [ss, 24 * 60],
      //         [0, se],
      //       ];

      // let overlapMinutes = 0;
      // for (const [a1, a2] of intervals) {
      //   for (const [b1, b2] of slotIntervals) {
      //     const st = Math.max(a1, b1);
      //     const en = Math.min(a2, b2);
      //     if (st < en) overlapMinutes += en - st;
      //   }
      // }
      // return overlapMinutes / 60;
      if (
        (slotStart <= startHour && startHour <= slotEnd) ||
        (slotStart <= endHour && endHour <= slotEnd) ||
        (startHour <= slotStart && slotStart <= endHour) ||
        (startHour <= slotEnd && slotEnd <= endHour)
      ) {
        return Math.min(endHour, slotEnd) - Math.max(startHour, slotStart);
      }
      return 0;
    };

    const processAllTrucks = (): TMSchedule[] => {
      const truckMap = new Map<string, TMSchedule>();
      const timeSlots = buildSlots();

      // Check if any filters are applied
      const hasFilters = selectedPlantId !== "" || selectedClientName !== "" || selectedProjectName !== "";

      // First, collect all unique TMs and Pumps from schedule data
      const scheduleTMs = new Map<string, { tmNo: string; tmId: string }>();
      const schedulePumps = new Map<string, { pumpNo: string; pumpId: string; pumpType: string }>();

      data.forEach((schedule) => {
        const trips = schedule.input_params?.is_burst_model
          ? schedule.burst_table || schedule.output_table
          : schedule.output_table;
        if (trips && trips.length > 0) {
          trips.forEach((trip) => {
            if (!scheduleTMs.has(trip.tm_id)) {
              scheduleTMs.set(trip.tm_id, {
                tmNo: trip.tm_no,
                tmId: trip.tm_id,
              });
            }
          });
        }

        // Collect pumps from schedule data
        if (schedule.pump) {
          if (!schedulePumps.has(schedule.pump)) {
            // Try to get pump details from master list, or use schedule data as fallback
            const masterPump = pumps?.find((p) => p._id === schedule.pump);
            const pumpNo = masterPump
              ? (masterPump as unknown as { pump_no?: string; identifier?: string }).pump_no ||
                (masterPump as unknown as { pump_no?: string; identifier?: string }).identifier ||
                `P-${schedule.pump}`
              : `P-${schedule.pump}`;
            const mappedType = (schedule.pump_type || "line").toLowerCase() === "boom" ? "BP" : "LP";

            schedulePumps.set(schedule.pump, {
              pumpNo,
              pumpId: schedule.pump,
              pumpType: mappedType,
            });
          }
        }
      });

      // Process TMs from schedule data first (these are the actual TMs used)
      scheduleTMs.forEach((tmData) => {
        truckMap.set(tmData.tmId, {
          tmNo: tmData.tmNo,
          tmType: "TM",
          timeSlots: timeSlots.map((slot) => ({ ...slot })),
          scheduleSpecificTimeSlots: {},
          totalFreeHours: 24,
          idlePercentage: 100,
          schedules: [],
        });
      });

      // Process Pumps from schedule data first (these are the actual pumps used)
      schedulePumps.forEach((pumpData) => {
        truckMap.set(pumpData.pumpId, {
          tmNo: pumpData.pumpNo,
          tmType: pumpData.pumpType,
          timeSlots: timeSlots.map((slot) => ({ ...slot })),
          scheduleSpecificTimeSlots: {},
          totalFreeHours: 24,
          idlePercentage: 100,
          schedules: [],
        });
      });

      // Process all TMs from master list (for IDLE TMs when no filters)
      if (tms && !hasFilters) {
        tms.forEach((tm) => {
          // If a plant is selected, include only TMs from that plant
          if (selectedPlantId && tm.plant_id && tm.plant_id !== selectedPlantId) return;
          const anyTm = tm as unknown as { tm_no?: string; identifier?: string; type?: string; _id: string };
          const tmNo = anyTm.tm_no || anyTm.identifier || `TM-${anyTm._id}`;

          // Only add if not already in map from schedule data
          if (!truckMap.has(anyTm._id)) {
            truckMap.set(anyTm._id, {
              tmNo,
              tmType: (anyTm.type as string) || "TM",
              timeSlots: timeSlots.map((slot) => ({ ...slot })),
              scheduleSpecificTimeSlots: {},
              totalFreeHours: 24,
              idlePercentage: 100,
              schedules: [],
            });
          }
        });
      }

      // Process all Pumps from master list (for IDLE pumps when no filters)
      if (pumps && !hasFilters) {
        pumps.forEach((pump) => {
          // If a plant is selected, include only Pumps from that plant
          if (selectedPlantId && pump.plant_id && pump.plant_id !== selectedPlantId) return;
          const anyPump = pump as unknown as { pump_no?: string; identifier?: string; type?: string; _id: string };
          const pumpNo = anyPump.pump_no || anyPump.identifier || `P-${anyPump._id}`;
          const mappedType = (anyPump.type || "line").toLowerCase() === "boom" ? "BP" : "LP";

          // Only add if not already in map from schedule data
          if (!truckMap.has(anyPump._id)) {
            truckMap.set(anyPump._id, {
              tmNo: pumpNo,
              tmType: mappedType,
              timeSlots: timeSlots.map((slot) => ({ ...slot })),
              scheduleSpecificTimeSlots: {},
              totalFreeHours: 24,
              idlePercentage: 100,
              schedules: [],
            });
          }
        });
      }

      // Now process scheduled data to update time slots
      data.forEach((schedule) => {
        const trips = schedule.input_params?.is_burst_model
          ? schedule.burst_table || schedule.output_table
          : schedule.output_table;
        if (trips && trips.length > 0) {
          // Group trips by tm_id
          const tripsByTm = new Map<string, typeof trips>();
          trips.forEach((trip) => {
            if (!tripsByTm.has(trip.tm_id)) {
              tripsByTm.set(trip.tm_id, []);
            }
            tripsByTm.get(trip.tm_id)!.push(trip);
          });

          // Process each TM's trips
          tripsByTm.forEach((tmTrips, tmId) => {
            const truck = truckMap.get(tmId);
            if (!truck) return;

            // Sort trips by trip_no to get proper sequence
            tmTrips.sort((a, b) => a.trip_no - b.trip_no);

            // Calculate actual working time for this TM
            const firstTrip = tmTrips[0];
            const lastTrip = tmTrips[tmTrips.length - 1];

            // Use plant_buffer as start time and return as end time to match schedule view
            const startTime = new Date(firstTrip.plant_buffer || firstTrip.plant_load || firstTrip.plant_start);
            const endTime = new Date(lastTrip.return);

            const startHour = startTime.getHours() + startTime.getMinutes() / 60;
            const endHour = endTime.getHours() + endTime.getMinutes() / 60;

            if (schedule.schedule_no !== undefined && !(schedule.schedule_no in truck.scheduleSpecificTimeSlots)) {
              truck.scheduleSpecificTimeSlots[schedule.schedule_no] = timeSlots.map((slot) => ({
                ...slot,
                tasks: [],
              }));
            }

            // Update time slots using actual trip times
            truck.timeSlots.forEach((slot, i) => {
              const overlap = computeOverlapHours(startHour, endHour, slot.start, slot.end);
              if (overlap > 0) {
                slot.freeHours = Math.max(0, slot.freeHours - overlap);
                if (schedule.schedule_no && truck.scheduleSpecificTimeSlots[schedule.schedule_no]) {
                  truck.scheduleSpecificTimeSlots[schedule.schedule_no][i].freeHours = slot.freeHours;
                  truck.scheduleSpecificTimeSlots[schedule.schedule_no][i].tasks.push({ startHour, endHour });
                }
              }
            });

            // Add schedule only once per TM per schedule
            if (!truck.schedules.some((s) => s.scheduleId === schedule._id)) {
              truck.schedules.push({
                customer: schedule.client_name,
                project: schedule.project_name || "-",
                plant: schedule.mother_plant_name || "-",
                startTime: formatTimeByPreference(startTime),
                endTime: formatTimeByPreference(endTime),
                duration: Math.max(0, endHour - startHour),
                scheduleId: schedule._id,
                scheduleNo: schedule.schedule_no,
              });
            }
          });
        }

        // Process pump engagement for this schedule
        if (schedule.pump && schedule.input_params) {
          const pumpId = schedule.pump;
          const pump = truckMap.get(pumpId);

          if (pump) {
            // Calculate pump engagement period
            const pumpStartTime = new Date(schedule.input_params.pump_start);
            const pumpOnwardTime = schedule.input_params.pump_onward_time || 0;
            const pumpFixingTime = schedule.input_params.pump_fixing_time || 0;
            const pumpRemovalTime = schedule.input_params.pump_removal_time || 0;

            // Calculate actual pumping duration from schedule data (same as schedule view page)
            let pumpingHours = 0;
            if (schedule.output_table && schedule.output_table.length > 0) {
              // Get all pump start and end times from the output table
              const pumpStartTimes = schedule.output_table
                .map((trip) => trip.pump_start)
                .filter(Boolean)
                .map((time) => new Date(time));

              const pumpEndTimes = schedule.output_table
                .map((trip) => trip.unloading_time)
                .filter(Boolean)
                .map((time) => new Date(time));

              if (pumpStartTimes.length > 0 && pumpEndTimes.length > 0) {
                // Find the first pump start time and last pump end time
                const firstPumpStart = new Date(Math.min(...pumpStartTimes.map((d) => d.getTime())));
                const lastPumpEnd = new Date(Math.max(...pumpEndTimes.map((d) => d.getTime())));

                // Calculate total pumping duration in hours
                const pumpingDurationMs = lastPumpEnd.getTime() - firstPumpStart.getTime();
                pumpingHours = pumpingDurationMs / (1000 * 60 * 60); // Convert to hours
              }
            }

            // Fallback to theoretical calculation if no schedule data
            if (pumpingHours === 0) {
              pumpingHours =
                schedule.input_params.pumping_speed > 0
                  ? schedule.input_params.quantity / schedule.input_params.pumping_speed
                  : 0;
            }

            const pumpingMinutes = pumpingHours * 60;

            // Calculate pump start from plant (pump_start - onward_time - fixing_time)
            const pumpStartFromPlant = new Date(pumpStartTime);
            pumpStartFromPlant.setMinutes(pumpStartFromPlant.getMinutes() - pumpOnwardTime - pumpFixingTime);

            // Calculate pump end time (pump_start + pumping_time + removal_time)
            const pumpEndTime = new Date(pumpStartTime);
            pumpEndTime.setMinutes(pumpEndTime.getMinutes() + pumpingMinutes + pumpRemovalTime);

            const pumpStartHour = pumpStartFromPlant.getHours() + pumpStartFromPlant.getMinutes() / 60;
            const pumpEndHour = pumpEndTime.getHours() + pumpEndTime.getMinutes() / 60;

            if (schedule.schedule_no !== undefined && !(schedule.schedule_no in pump.scheduleSpecificTimeSlots)) {
              pump.scheduleSpecificTimeSlots[schedule.schedule_no] = timeSlots.map((slot) => ({
                ...slot,
                tasks: [],
              }));
            }

            // Update pump time slots
            pump.timeSlots.forEach((slot, i) => {
              const overlap = computeOverlapHours(pumpStartHour, pumpEndHour, slot.start, slot.end);
              if (overlap > 0) {
                slot.freeHours = Math.max(0, slot.freeHours - overlap);
                if (schedule.schedule_no && pump.scheduleSpecificTimeSlots[schedule.schedule_no]) {
                  pump.scheduleSpecificTimeSlots[schedule.schedule_no][i].freeHours = slot.freeHours;
                  pump.scheduleSpecificTimeSlots[schedule.schedule_no][i].tasks.push({
                    startHour: pumpStartHour,
                    endHour: pumpEndHour,
                  });
                }
              }
            });

            // Add schedule only once per pump per schedule
            if (!pump.schedules.some((s) => s.scheduleId === schedule._id)) {
              pump.schedules.push({
                customer: schedule.client_name,
                project: schedule.project_name || "-",
                plant: schedule.mother_plant_name || "-",
                startTime: formatTimeByPreference(pumpStartFromPlant),
                endTime: formatTimeByPreference(pumpEndTime),
                duration: Math.max(0, pumpEndHour - pumpStartHour),
                scheduleId: schedule._id,
                scheduleNo: schedule.schedule_no,
              });
            }
          }
        }
      });

      // Calculate totals and percentages
      truckMap.forEach((truck) => {
        truck.totalFreeHours = truck.timeSlots.reduce((sum, slot) => sum + slot.freeHours, 0);
        truck.idlePercentage = Math.round((truck.totalFreeHours / 24) * 100);
      });

      // If filters are applied, only return trucks that have engagement (schedules)
      if (hasFilters) {
        return Array.from(truckMap.values()).filter((truck) => truck.schedules.length > 0);
      }

      return Array.from(truckMap.values());
    };

    const allTrucks = processAllTrucks();

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
        const rows: (string | number)[][] = [];
        const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];

        // Get plant names for the filter info row
        const selectedPlantNames = selectedPlantId && plantIdToName ? plantIdToName[selectedPlantId] : "ALL PLANTS";
        const selectedProjectNames = selectedProjectName || "ALL PROJECTS";
        const selectedClientNames = selectedClientName || "ALL CLIENTS";

        // Add filter info row
        const filterInfoRow: (string | number)[] = [
          "TRUCKWISE REPORT",
          formatDate(selectedDate),
          "",
          `PLANTS: ${selectedPlantNames}`,
          "",
          `PROJECTS: ${selectedProjectNames}`,
          "",
          `CLIENTS: ${selectedClientNames}`,
        ];

        // Add blank rows
        rows.push(filterInfoRow);
        rows.push([]);

        // Add slot numbers row (first header row)
        const slotNumbersRow: (string | number)[] = ["", "", ""]; // Empty cells for SL. NO, Truck/TM No., TM/LP/BP
        buildSlots().forEach((slot, i) => {
          if (isProjectWise) {
            slotNumbersRow.push(`SLOT ${i + 1}`, "", ""); // For project-wise, each slot spans 3 columns
          } else {
            slotNumbersRow.push(`SLOT ${i + 1}`); // For truck-wise, each slot is 1 column
          }
        });
        slotNumbersRow.push("UTILIZATION", "", ""); // Utilization spans 3 columns
        rows.push(slotNumbersRow);

        // Add merges for slot numbers row
        let colIndex = 3; // Start after SL. NO, Truck/TM No., TM/LP/BP
        buildSlots().forEach(() => {
          if (isProjectWise) {
            // Merge 3 columns for each slot in project-wise view
            merges.push({
              s: { r: rows.length - 1, c: colIndex },
              e: { r: rows.length - 1, c: colIndex + 2 },
            });
            colIndex += 3;
          } else {
            // No merge needed for truck-wise (single column)
            colIndex += 1;
          }
        });
        // Merge utilization columns
        merges.push({
          s: { r: rows.length - 1, c: colIndex },
          e: { r: rows.length - 1, c: colIndex + 2 },
        });

        // Define columns based on view type (second header row)
        const columns = isProjectWise
          ? [
              "SL. NO",
              "TM No.",
              "TM/LP/BP",
              ...buildSlots().flatMap((slot) => [slot.label, "", ""]), // Slot label spans 3 columns (will be merged)
              "TOT USED HOURS",
              "TOT IDLE HOURS",
              "USED %",
            ]
          : [
              "SL. NO",
              "Truck No.",
              "TM/LP/BP",
              ...buildSlots().map((s) => s.label),
              "TOT USED HOURS",
              "TOT IDLE HOURS",
              "USED %",
            ];

        // Add header row
        rows.push(columns);

        // Add merges for slot labels in project-wise view
        if (isProjectWise) {
          colIndex = 3;
          buildSlots().forEach(() => {
            merges.push({
              s: { r: rows.length - 1, c: colIndex },
              e: { r: rows.length - 1, c: colIndex + 2 },
            });
            colIndex += 3;
          });
        }

        // For project-wise, add sub-header row (third header row)
        if (isProjectWise) {
          const subHeaders: (string | number)[] = ["", "", ""]; // Empty for first 3 columns
          buildSlots().forEach(() => {
            subHeaders.push("Engaged Hours", "Customer Name", "Project Name");
          });
          subHeaders.push("", "", ""); // Empty for utilization columns
          rows.push(subHeaders);
        }

        // Add data rows
        allTrucks.forEach((tm, idx) => {
          const row: (string | number)[] = [];
          row.push(idx + 1);
          row.push(tm.tmNo);

          if (isProjectWise) {
            // Project-wise: for each slot, show TM engaged hours, customer name, and project
            row.push(tm.tmType);
            tm.timeSlots.forEach((slot) => {
              // Find all schedules that overlap with this time slot
              const overlappingSchedules = tm.schedules.filter((schedule) => {
                const scheduleStartHour = parseTimeString(schedule.startTime);
                const scheduleEndHour = parseTimeString(schedule.endTime);
                const overlap = computeOverlapHours(scheduleStartHour, scheduleEndHour, slot.start, slot.end);
                return overlap > 0;
              });

              // If multiple schedules overlap, show them as comma-separated values
              const customerNames = overlappingSchedules.map((s) => s.customer).join(", ");
              const projectNames = overlappingSchedules.map((s) => s.project).join(", ");

              // Get the first overlapping schedule for time range
              const firstSchedule = overlappingSchedules[0];
              const timeRange = firstSchedule ? formatSlotTimeRange(slot, firstSchedule) : "";

              row.push(timeRange, customerNames || "-", projectNames || "-");
            });
            row.push(
              formatHoursMinutes(24 - tm.totalFreeHours) as unknown as number,
              formatHoursMinutes(tm.totalFreeHours) as unknown as number,
              Math.round(((24 - tm.totalFreeHours) / 24) * 100)
            );
          } else {
            // Regular truck-wise view
            const slotUsed = tm.timeSlots.map(
              (slot) => formatHoursMinutes(Math.max(0, 4 - slot.freeHours)) as unknown as number
            );
            row.push(
              tm.tmType,
              ...slotUsed,
              formatHoursMinutes(24 - tm.totalFreeHours) as unknown as number,
              formatHoursMinutes(tm.totalFreeHours) as unknown as number,
              Math.round(((24 - tm.totalFreeHours) / 24) * 100)
            );
          }

          rows.push(row);
        });

        // Add total rows for each type
        const addTotalRow = (type: string, totals: { timeSlotTotals: number[] }) => {
          const totalRow: (string | number)[] = [];
          totalRow.push("TOTAL");
          totalRow.push(type);
          totalRow.push("");

          if (isProjectWise) {
            // Project-wise totals: for each slot, show only the used hours (skip customer and project columns)
            totals.timeSlotTotals.forEach((total) => {
              totalRow.push(formatHoursMinutes(total) as unknown as number);
              totalRow.push(""); // Skip customer name
              totalRow.push(""); // Skip project name
            });
            totalRow.push("", "", ""); // Skip total columns
          } else {
            totals.timeSlotTotals.forEach((total) => {
              totalRow.push(formatHoursMinutes(total) as unknown as number);
            });
            totalRow.push("", "", ""); // Skip total columns
          }

          rows.push(totalRow);
        };

        // Add totals for each type if they exist
        if (allTrucks.filter((truck) => truck.tmType === "TM").length > 0) {
          addTotalRow("TMs", totals.tms);
        }
        if (allTrucks.filter((truck) => truck.tmType === "LP").length > 0) {
          addTotalRow("LPs", totals.linePumps);
        }
        if (allTrucks.filter((truck) => truck.tmType === "BP").length > 0) {
          addTotalRow("BPs", totals.boomPumps);
        }

        return [
          {
            name: isProjectWise ? "Project Wise" : "Truck Wise",
            rows,
            merges,
          },
        ];
      },
    }));

    if (tmsLoading || pumpsLoading) {
      return (
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="p-8 text-center">
            <p className="text-gray-700 text-medium dark:text-gray-200">Loading truck data...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="p-6">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {isProjectWise ? "Project Wise" : "Truck Wise"} Report - {formatDate(selectedDate)}
                </h3>
                <span className="px-2 py-0.5 text-xs font-medium text-gray-800 bg-amber-200 border border-amber-300 rounded-full">
                  Time format: AA:BB = A hrs B mins  
                </span>
              </div>

              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setIsProjectWise(false)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    !isProjectWise
                      ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  Truck Wise
                </button>
                <button
                  onClick={() => setIsProjectWise(true)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isProjectWise
                      ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  Project Wise
                </button>
              </div>
            </div>

            {/* Main Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
              <div className="max-w-full overflow-x-auto">
                <div className="relative max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar">
                  <Table>
                    <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                      {/* Slot Numbers Row */}
                      <tr className="border-b border-gray-100 dark:border-white/[0.05] sticky top-0 z-10 bg-gray-50 dark:bg-gray-950">
                      <th className="px-2 py-3 font-medium text-gray-700 text-medium text-center text-xs dark:text-gray-200 border-r border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-950"></th>
                      <th className="px-2 py-3 font-medium text-gray-700 text-medium text-center text-xs dark:text-gray-200 border-r border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-950"></th>
                      <th className="px-2 py-3 font-medium text-gray-700 text-medium text-center text-xs dark:text-gray-200 border-r border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-950"></th>
                      {buildSlots().map((slot, i) => (
                        <th
                          colSpan={isProjectWise ? 3 : 1}
                          key={i + "-SlotNumber"}
                          className="px-2 py-3 font-medium text-gray-700 text-medium text-center text-xs dark:text-gray-200 border-r border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-950"
                        >
                          SLOT {i + 1}
                        </th>
                      ))}
                      <th
                        colSpan={3}
                        className="px-2 py-3 font-medium text-gray-700 text-medium text-center text-xs dark:text-gray-200 border-r border-gray-100 dark:border-white/[0.05] col-span-3 bg-gray-50 dark:bg-gray-950"
                      >
                        UTILIZATION
                      </th>
                    </tr>
                    {isProjectWise ? (
                      <tr className="border-b border-gray-100 dark:border-white/[0.05] sticky top-8 z-10 bg-gray-50 dark:bg-white/[0.03]">
                        <th className="px-2 py-3 font-medium text-gray-700 text-medium text-center text-xs dark:text-gray-200 border-r border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-900">
                          SL. NO
                        </th>
                        <th className="px-2 py-3 font-medium text-gray-700 text-medium text-center text-xs dark:text-gray-200 border-r border-gray-100 dark:border-white/[0.05] whitespace-nowrap bg-gray-50 dark:bg-gray-900">
                          TM No.
                        </th>
                        <th className="px-2 py-3 font-medium text-gray-700 text-medium text-center text-xs dark:text-gray-200 border-r border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-900">
                          TM/LP/BP
                        </th>
                        {buildSlots().map((slot, i) => (
                          <th
                            colSpan={3}
                            key={i + "-ProjectWise"}
                            className="px-2 py-3 font-medium text-gray-700 text-medium text-center text-xs dark:text-gray-200 border-r border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-900"
                          >
                            {slot.label}
                          </th>
                        ))}
                        <th className="px-2 py-3 font-medium text-gray-700 text-medium text-center text-xs dark:text-gray-200 border-r border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-900">
                          TOT USED HOURS
                        </th>
                        <th className="px-2 py-3 font-medium text-gray-700 text-medium text-center text-xs dark:text-gray-200 border-r border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-900">
                          TOT IDLE HOURS
                        </th>
                        <th className="px-2 py-3 font-medium text-gray-700 text-medium text-center text-xs dark:text-gray-200 bg-gray-50 dark:bg-gray-900">
                          USED %
                        </th>
                      </tr>
                    ) : (
                      <tr className="sticky top-9 z-10 bg-gray-50 dark:bg-gray-900">
                        <th className="px-2 py-3 font-medium text-gray-700 text-medium text-center text-xs dark:text-gray-200 border-r border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-900">
                          SL. NO
                        </th>
                        <th className="px-2 py-3 font-medium text-gray-700 text-medium text-center text-xs dark:text-gray-200 border-r border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-900">
                          Truck No.
                        </th>

                        <th className="px-2 py-3 font-medium text-gray-700 text-medium text-center text-xs dark:text-gray-200 border-r border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-900">
                          TM/LP/BP
                        </th>
                        {buildSlots().map((slot, i) => (
                          <th
                            key={i + "-TruckWise"}
                            className="px-2 py-3 font-medium text-gray-700 text-medium text-center text-xs dark:text-gray-200 border-r border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-900"
                          >
                            {slot.label}
                          </th>
                        ))}
                        <th className="px-2 py-3 font-medium text-gray-700 text-medium text-center text-xs dark:text-gray-200 border-r border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-900">
                          TOT USED HOURS
                        </th>
                        <th className="px-2 py-3 font-medium text-gray-700 text-medium text-center text-xs dark:text-gray-200 border-r border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-900">
                          TOT IDLE HOURS
                        </th>
                        <th className="px-2 py-3 font-medium text-gray-700 text-medium text-center text-xs dark:text-gray-200 bg-gray-50 dark:bg-gray-900">
                          USED %
                        </th>
                      </tr>
                    )}
                    {isProjectWise && (
                      <tr className="sticky top-25 z-10 bg-gray-50 dark:bg-white/[0.03]">
                        <th className="px-2 py-3 font-medium text-gray-700 text-medium text-center text-xs dark:text-gray-200 border-r border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-800">
                          #
                        </th>
                        <th className="px-2 py-3 font-medium text-gray-700 text-medium text-center text-xs dark:text-gray-200 border-r border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-800">
                          #
                        </th>
                        <th className="px-2 py-3 font-medium text-gray-700 text-medium text-center text-xs dark:text-gray-200 border-r border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-800">
                          #
                        </th>
                        {buildSlots().map((slot, i) => (
                          <React.Fragment key={i + "-ProjectWiseSubHeaders"}>
                            <th
                              key={i + "-TMEngagedHours"}
                              className="px-2 py-3 font-medium text-gray-700 text-medium text-center text-xs dark:text-gray-200 border-r border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-800"
                            >
                              Engaged Hours
                            </th>
                            <th
                              key={i + "-CustomerName"}
                              className="px-2 py-3 font-medium text-gray-700 text-medium text-center text-xs dark:text-gray-200 border-r border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-800"
                            >
                              Customer Name
                            </th>
                            <th
                              key={i + "-ProjectName"}
                              className="px-2 py-3 font-medium text-gray-700 text-medium text-center text-xs dark:text-gray-200 border-r border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-800"
                            >
                              Project Name
                            </th>
                          </React.Fragment>
                        ))}
                        <th className="px-2 py-3 font-medium text-gray-700 text-medium text-center text-xs dark:text-gray-200 border-r border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-800">
                          #
                        </th>
                        <th className="px-2 py-3 font-medium text-gray-700 text-medium text-center text-xs dark:text-gray-200 border-r border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-800">
                          #
                        </th>
                        <th className="px-2 py-3 font-medium text-gray-700 text-medium text-center text-xs dark:text-gray-200 bg-gray-50 dark:bg-gray-800">
                          #
                        </th>
                      </tr>
                    )}
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {/* TMs */}
                    {(() => {
                      let globalRowIndex = 1;
                      return allTrucks
                        .filter((truck) => truck.tmType === "TM")
                        .map((tm) => {
                          if (isProjectWise) {
                            // For project-wise view, create multiple rows for multiple schedules in same slot
                            const maxSchedulesPerSlot = Math.max(
                              ...tm.timeSlots.map((slot) => {
                                const overlappingSchedules = tm.schedules.filter((schedule) => {
                                  const scheduleStart = new Date(schedule.startTime);
                                  const scheduleEnd = new Date(schedule.endTime);
                                  const scheduleStartHour = scheduleStart.getHours() + scheduleStart.getMinutes() / 60;
                                  const scheduleEndHour = scheduleEnd.getHours() + scheduleEnd.getMinutes() / 60;
                                  const overlap = computeOverlapHours(
                                    scheduleStartHour,
                                    scheduleEndHour,
                                    slot.start,
                                    slot.end
                                  );
                                  return overlap > 0;
                                });
                                return overlappingSchedules.length;
                              }),
                              1
                            );

                            const rows = Array.from({ length: maxSchedulesPerSlot }, (_, rowIndex) => {
                              const currentRowIndex = globalRowIndex++;
                              return (
                                <TableRow key={`${tm.tmNo}-ProjectWise-${rowIndex}`}>
                                  <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                    {rowIndex === 0 ? currentRowIndex : ""}
                                  </TableCell>
                                  <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05] whitespace-nowrap">
                                    {rowIndex === 0 ? tm.tmNo : ""}
                                  </TableCell>
                                  <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                    {rowIndex === 0 ? tm.tmType : ""}
                                  </TableCell>
                                  {tm.timeSlots.map((slot, slotIndex) => {
                                    const overlappingSchedules = tm.schedules.filter((schedule) => {
                                      const scheduleStartHour = parseTimeString(schedule.startTime);
                                      const scheduleEndHour = parseTimeString(schedule.endTime);
                                      const overlap = computeOverlapHours(
                                        scheduleStartHour,
                                        scheduleEndHour,
                                        slot.start,
                                        slot.end
                                      );
                                      return overlap > 0;
                                    });

                                    const schedule = overlappingSchedules[rowIndex];
                                    const isFirstRow = rowIndex === 0;

                                    return (
                                      <React.Fragment key={slotIndex + "-ProjectWiseSlot"}>
                                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                          {isFirstRow ? formatSlotTimeRange(slot, schedule) : ""}
                                        </TableCell>
                                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                          {schedule?.customer || "-"}
                                        </TableCell>
                                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                          {schedule?.project || "-"}
                                        </TableCell>
                                      </React.Fragment>
                                    );
                                  })}
                                  <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                    {rowIndex === 0 ? formatHoursMinutes(24 - tm.totalFreeHours) : ""}
                                  </TableCell>
                                  <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                    {rowIndex === 0 ? formatHoursMinutes(tm.totalFreeHours) : ""}
                                  </TableCell>
                                  <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90">
                                    {rowIndex === 0 ? `${Math.round(((24 - tm.totalFreeHours) / 24) * 100)}%` : ""}
                                  </TableCell>
                                </TableRow>
                              );
                            });
                            return rows;
                          } else {
                            const currentRowIndex = globalRowIndex++;
                            return (
                              <TableRow key={tm.tmNo + "-TruckWise"}>
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                  {currentRowIndex}
                                </TableCell>
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                  {tm.tmNo}
                                </TableCell>
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                  {tm.tmType}
                                </TableCell>
                                {tm.timeSlots.map((slot, slotIndex) => (
                                  <TableCell
                                    key={slotIndex}
                                    className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]"
                                  >
                                    {formatHoursMinutes(Math.max(0, 4 - slot.freeHours))}
                                  </TableCell>
                                ))}
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                  {formatHoursMinutes(24 - tm.totalFreeHours)}
                                </TableCell>
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                  {formatHoursMinutes(tm.totalFreeHours)}
                                </TableCell>
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90">
                                  {Math.round(((24 - tm.totalFreeHours) / 24) * 100)}%
                                </TableCell>
                              </TableRow>
                            );
                          }
                        });
                    })()}

                    {/* TMs Total Row */}
                    <TableRow className="bg-gray-50 dark:bg-gray-800 font-semibold">
                      <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                        TOTAL
                      </TableCell>
                      <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                        TMs
                      </TableCell>
                      <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                        {null}
                      </TableCell>
                      {isProjectWise
                        ? // Project-wise totals: for each slot, show only the used hours (skip customer and project columns)
                          totals.tms.timeSlotTotals.map((total, index) => (
                            <React.Fragment key={index + "-ProjectWiseTotal"}>
                              <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                {formatHoursMinutes(total)}
                              </TableCell>
                              <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                {null}
                              </TableCell>
                              <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                {null}
                              </TableCell>
                            </React.Fragment>
                          ))
                        : totals.tms.timeSlotTotals.map((total, index) => (
                            <TableCell
                              key={index}
                              className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]"
                            >
                              {formatHoursMinutes(total)}
                            </TableCell>
                          ))}
                      <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                        {formatHoursMinutes(totals.tms.timeSlotTotals.reduce((sum, val) => sum + val, 0))}
                      </TableCell>
                      <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                        {null}
                      </TableCell>
                      <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90">
                        {(() => {
                          const tmTrucks = allTrucks.filter((t) => t.tmType === "TM");
                          const tmWeightedUtil =
                            tmTrucks.length > 0
                              ? Math.round(
                                  (100 * tmTrucks.reduce((sum, t) => sum + (24 - t.totalFreeHours), 0)) /
                                    (tmTrucks.length * 24)
                                )
                              : null;
                          return tmWeightedUtil !== null ? `${tmWeightedUtil}%` : null;
                        })()}
                      </TableCell>
                    </TableRow>

                    {/* Line Pumps */}
                    {(() => {
                      let globalRowIndex = 1;
                      return allTrucks
                        .filter((truck) => truck.tmType === "LP")
                        .map((tm) => {
                          if (isProjectWise) {
                            // For project-wise view, create multiple rows for multiple schedules in same slot
                            const maxSchedulesPerSlot = Math.max(
                              ...tm.timeSlots.map((slot) => {
                                const overlappingSchedules = tm.schedules.filter((schedule) => {
                                  const scheduleStart = new Date(schedule.startTime);
                                  const scheduleEnd = new Date(schedule.endTime);
                                  const scheduleStartHour = scheduleStart.getHours() + scheduleStart.getMinutes() / 60;
                                  const scheduleEndHour = scheduleEnd.getHours() + scheduleEnd.getMinutes() / 60;
                                  const overlap = computeOverlapHours(
                                    scheduleStartHour,
                                    scheduleEndHour,
                                    slot.start,
                                    slot.end
                                  );
                                  return overlap > 0;
                                });
                                return overlappingSchedules.length;
                              }),
                              1
                            );

                            const rows = Array.from({ length: maxSchedulesPerSlot }, (_, rowIndex) => {
                              const currentRowIndex = globalRowIndex++;
                              return (
                                <TableRow key={`${tm.tmNo}-ProjectWise-${rowIndex}`}>
                                  <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                    {rowIndex === 0 ? currentRowIndex : ""}
                                  </TableCell>
                                  <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05] whitespace-nowrap">
                                    {rowIndex === 0 ? tm.tmNo : ""}
                                  </TableCell>
                                  <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                    {rowIndex === 0 ? tm.tmType : ""}
                                  </TableCell>
                                  {tm.timeSlots.map((slot, slotIndex) => {
                                    const overlappingSchedules = tm.schedules.filter((schedule) => {
                                      const scheduleStartHour = parseTimeString(schedule.startTime);
                                      const scheduleEndHour = parseTimeString(schedule.endTime);
                                      const overlap = computeOverlapHours(
                                        scheduleStartHour,
                                        scheduleEndHour,
                                        slot.start,
                                        slot.end
                                      );
                                      return overlap > 0;
                                    });

                                    const schedule = overlappingSchedules[rowIndex];
                                    const isFirstRow = rowIndex === 0;

                                    return (
                                      <React.Fragment key={slotIndex + "-ProjectWiseSlot"}>
                                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                          {isFirstRow ? formatSlotTimeRange(slot, schedule) : ""}
                                        </TableCell>
                                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                          {schedule?.customer || "-"}
                                        </TableCell>
                                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                          {schedule?.project || "-"}
                                        </TableCell>
                                      </React.Fragment>
                                    );
                                  })}
                                  <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                    {rowIndex === 0 ? formatHoursMinutes(24 - tm.totalFreeHours) : ""}
                                  </TableCell>
                                  <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                    {rowIndex === 0 ? formatHoursMinutes(tm.totalFreeHours) : ""}
                                  </TableCell>
                                  <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90">
                                    {rowIndex === 0 ? `${Math.round(((24 - tm.totalFreeHours) / 24) * 100)}%` : ""}
                                  </TableCell>
                                </TableRow>
                              );
                            });
                            return rows;
                          } else {
                            const currentRowIndex = globalRowIndex++;
                            return (
                              <TableRow key={tm.tmNo}>
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                  {currentRowIndex}
                                </TableCell>
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                  {tm.tmNo}
                                </TableCell>
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                  {tm.tmType}
                                </TableCell>
                                {tm.timeSlots.map((slot, slotIndex) => (
                                  <TableCell
                                    key={slotIndex}
                                    className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]"
                                  >
                                    {formatHoursMinutes(Math.max(0, 4 - slot.freeHours))}
                                  </TableCell>
                                ))}
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                  {formatHoursMinutes(24 - tm.totalFreeHours)}
                                </TableCell>
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                  {formatHoursMinutes(tm.totalFreeHours)}
                                </TableCell>
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90">
                                  {Math.round(((24 - tm.totalFreeHours) / 24) * 100)}%
                                </TableCell>
                              </TableRow>
                            );
                          }
                        });
                    })()}

                    {/* Line Pumps Total Row */}
                    {allTrucks.filter((truck) => truck.tmType === "LP").length > 0 && (
                      <TableRow className="bg-gray-50 dark:bg-gray-800 font-semibold">
                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                          TOTAL
                        </TableCell>
                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                          LPs
                        </TableCell>
                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                          {null}
                        </TableCell>

                        {isProjectWise
                          ? // Project-wise totals: for each slot, show only the used hours (skip customer and project columns)
                            totals.linePumps.timeSlotTotals.map((total, index) => (
                              <React.Fragment key={index + "-ProjectWiseTotal"}>
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                  {formatHoursMinutes(total)}
                                </TableCell>
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                  {null}
                                </TableCell>
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                  {null}
                                </TableCell>
                              </React.Fragment>
                            ))
                          : totals.linePumps.timeSlotTotals.map((total, index) => (
                              <TableCell
                                key={index}
                                className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]"
                              >
                                {formatHoursMinutes(total)}
                              </TableCell>
                            ))}
                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                          {formatHoursMinutes(totals.linePumps.timeSlotTotals.reduce((sum, val) => sum + val, 0))}
                        </TableCell>
                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                          {null}
                        </TableCell>
                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90">
                          {(() => {
                            const lpTrucks = allTrucks.filter((t) => t.tmType === "LP");
                            const lpWeightedUtil =
                              lpTrucks.length > 0
                                ? Math.round(
                                    (100 * lpTrucks.reduce((sum, t) => sum + (24 - t.totalFreeHours), 0)) /
                                      (lpTrucks.length * 24)
                                  )
                                : null;
                            return lpWeightedUtil !== null ? `${lpWeightedUtil}%` : null;
                          })()}
                        </TableCell>
                      </TableRow>
                    )}

                    {/* Boom Pumps */}
                    {(() => {
                      let globalRowIndex = 1;
                      return allTrucks
                        .filter((truck) => truck.tmType === "BP")
                        .map((tm) => {
                          if (isProjectWise) {
                            // For project-wise view, create multiple rows for multiple schedules in same slot
                            const maxSchedulesPerSlot = Math.max(
                              ...tm.timeSlots.map((slot) => {
                                const overlappingSchedules = tm.schedules.filter((schedule) => {
                                  const scheduleStart = new Date(schedule.startTime);
                                  const scheduleEnd = new Date(schedule.endTime);
                                  const scheduleStartHour = scheduleStart.getHours() + scheduleStart.getMinutes() / 60;
                                  const scheduleEndHour = scheduleEnd.getHours() + scheduleEnd.getMinutes() / 60;
                                  const overlap = computeOverlapHours(
                                    scheduleStartHour,
                                    scheduleEndHour,
                                    slot.start,
                                    slot.end
                                  );
                                  return overlap > 0;
                                });
                                return overlappingSchedules.length;
                              }),
                              1
                            );

                            const rows = Array.from({ length: maxSchedulesPerSlot }, (_, rowIndex) => {
                              const currentRowIndex = globalRowIndex++;
                              return (
                                <TableRow key={`${tm.tmNo}-ProjectWise-${rowIndex}`}>
                                  <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                    {rowIndex === 0 ? currentRowIndex : ""}
                                  </TableCell>
                                  <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05] whitespace-nowrap">
                                    {rowIndex === 0 ? tm.tmNo : ""}
                                  </TableCell>
                                  <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                    {rowIndex === 0 ? tm.tmType : ""}
                                  </TableCell>
                                  {tm.timeSlots.map((slot, slotIndex) => {
                                    const overlappingSchedules = tm.schedules.filter((schedule) => {
                                      const scheduleStartHour = parseTimeString(schedule.startTime);
                                      const scheduleEndHour = parseTimeString(schedule.endTime);
                                      const overlap = computeOverlapHours(
                                        scheduleStartHour,
                                        scheduleEndHour,
                                        slot.start,
                                        slot.end
                                      );
                                      return overlap > 0;
                                    });

                                    const schedule = overlappingSchedules[rowIndex];
                                    const isFirstRow = rowIndex === 0;

                                    return (
                                      <React.Fragment key={slotIndex + "-ProjectWiseSlot"}>
                                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                          {isFirstRow ? formatSlotTimeRange(slot, schedule) : ""}
                                        </TableCell>
                                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                          {schedule?.customer || "-"}
                                        </TableCell>
                                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                          {schedule?.project || "-"}
                                        </TableCell>
                                      </React.Fragment>
                                    );
                                  })}
                                  <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                    {rowIndex === 0 ? formatHoursMinutes(24 - tm.totalFreeHours) : ""}
                                  </TableCell>
                                  <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                    {rowIndex === 0 ? formatHoursMinutes(tm.totalFreeHours) : ""}
                                  </TableCell>
                                  <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90">
                                    {rowIndex === 0 ? `${Math.round(((24 - tm.totalFreeHours) / 24) * 100)}%` : ""}
                                  </TableCell>
                                </TableRow>
                              );
                            });
                            return rows;
                          } else {
                            const currentRowIndex = globalRowIndex++;
                            return (
                              <TableRow key={tm.tmNo}>
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                  {currentRowIndex}
                                </TableCell>
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                  {tm.tmNo}
                                </TableCell>
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                  {tm.tmType}
                                </TableCell>
                                {tm.timeSlots.map((slot, slotIndex) => (
                                  <TableCell
                                    key={slotIndex}
                                    className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]"
                                  >
                                    {formatHoursMinutes(Math.max(0, 4 - slot.freeHours))}
                                  </TableCell>
                                ))}
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                  {formatHoursMinutes(24 - tm.totalFreeHours)}
                                </TableCell>
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                  {formatHoursMinutes(tm.totalFreeHours)}
                                </TableCell>
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90">
                                  {Math.round(((24 - tm.totalFreeHours) / 24) * 100)}%
                                </TableCell>
                              </TableRow>
                            );
                          }
                        });
                    })()}

                    {/* Boom Pumps Total Row */}
                    {allTrucks.filter((truck) => truck.tmType === "BP").length > 0 && (
                      <TableRow className="bg-gray-50 dark:bg-gray-800 font-semibold">
                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                          TOTAL
                        </TableCell>
                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                          BPs
                        </TableCell>
                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                          {null}
                        </TableCell>

                        {isProjectWise
                          ? // Project-wise totals: for each slot, show only the used hours (skip customer and project columns)
                            totals.boomPumps.timeSlotTotals.map((total, index) => (
                              <React.Fragment key={index + "-ProjectWiseTotal"}>
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                  {formatHoursMinutes(total)}
                                </TableCell>
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                  {null}
                                </TableCell>
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                                  {null}
                                </TableCell>
                              </React.Fragment>
                            ))
                          : totals.boomPumps.timeSlotTotals.map((total, index) => (
                              <TableCell
                                key={index}
                                className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]"
                              >
                                {formatHoursMinutes(total)}
                              </TableCell>
                            ))}
                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                          {formatHoursMinutes(totals.boomPumps.timeSlotTotals.reduce((sum, val) => sum + val, 0))}
                        </TableCell>
                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r border-gray-100 dark:border-white/[0.05]">
                          {null}
                        </TableCell>
                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90">
                          {(() => {
                            const bpTrucks = allTrucks.filter((t) => t.tmType === "BP");
                            const bpWeightedUtil =
                              bpTrucks.length > 0
                                ? Math.round(
                                    (100 * bpTrucks.reduce((sum, t) => sum + (24 - t.totalFreeHours), 0)) /
                                      (bpTrucks.length * 24)
                                  )
                                : null;
                            return bpWeightedUtil !== null ? `${bpWeightedUtil}%` : null;
                          })()}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule Detail Tables */}
      </div>
    );
  }
);

TruckWiseTable.displayName = "TruckWiseTable";

export default TruckWiseTable;

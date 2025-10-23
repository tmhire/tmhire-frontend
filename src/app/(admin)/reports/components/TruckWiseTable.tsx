"use client";

import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { formatTimeByPreference } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/useApiClient";
import { useSession } from "next-auth/react";
import { forwardRef, useImperativeHandle, useState } from "react";
import React from "react";

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
    pump_start_time_from_plant: string;
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
  ({ data, selectedDate, selectedPlantId, selectedClientName, selectedProjectName }: TruckWiseTableProps, exportRef) => {
    const { status } = useSession();
    const { fetchWithAuth } = useApiClient();

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
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      let hour24 = hours;
      if (period === 'PM' && hours !== 12) hour24 += 12;
      if (period === 'AM' && hours === 12) hour24 = 0;
      return hour24 + minutes / 60;
    };

    // Helper function to format hours and minutes as HH:MM
    const formatHoursMinutes = (hours: number): string => {
      const totalMinutes = Math.round(hours * 60);
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    // Helper function to format time range for a slot
    const formatSlotTimeRange = (slot: TimeSlot, schedule: { startTime: string; endTime: string } | undefined): string => {
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
      
      return `${formatTimeByPreference(startTime)} - ${formatTimeByPreference(endTime)}`;
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
      const hasFilters = selectedPlantId !="" || selectedClientName !="" || selectedProjectName !="";

      // Process all TMs
      if (tms) {
        tms.forEach((tm) => {
          // If a plant is selected, include only TMs from that plant
          if (selectedPlantId && tm.plant_id && tm.plant_id !== selectedPlantId) return;
          const anyTm = tm as unknown as { tm_no?: string; identifier?: string; type?: string; _id: string };
          const tmNo = anyTm.tm_no || anyTm.identifier || `TM-${anyTm._id}`;
          truckMap.set(anyTm._id, {
            tmNo,
            tmType: (anyTm.type as string) || "TM",
            timeSlots: timeSlots,
            scheduleSpecificTimeSlots: {},
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
          truckMap.set(anyPump._id, {
            tmNo: pumpNo,
            tmType: mappedType,
            timeSlots: timeSlots,
            scheduleSpecificTimeSlots: {},
            totalFreeHours: 24,
            idlePercentage: 100,
            schedules: [],
          });
        });
      }

      // Now process scheduled data to update time slots
      data.forEach((schedule) => {
        const trips = schedule.input_params?.is_burst_model ? schedule.output_table : schedule.output_table;
        if (trips && trips.length > 0) {
          // Calculate the overall schedule time range from all trips
          const allStartTimes = trips.map((trip) => new Date(trip.plant_start));
          const allEndTimes = trips.map((trip) => new Date(trip.return));
          const overallStartTime = new Date(Math.min(...allStartTimes.map((d) => d.getTime())));
          const overallEndTime = new Date(Math.max(...allEndTimes.map((d) => d.getTime())));
          const startHour = overallStartTime.getHours() + overallStartTime.getMinutes() / 60;
          const endHour = overallEndTime.getHours() + overallEndTime.getMinutes() / 60;

          // Group trips by tm_id to avoid duplicate processing
          const tripsByTm = new Map<string, typeof trips>();
          trips.forEach((trip) => {
            if (!tripsByTm.has(trip.tm_id)) {
              tripsByTm.set(trip.tm_id, []);
            }
            tripsByTm.get(trip.tm_id)!.push(trip);
          });

          // First, process trucks that have trips
          tripsByTm.forEach((tmTrips, tmId) => {
            const firstTrip = tmTrips[0];
            const tmNo = firstTrip.tm_no || `TM-${firstTrip.tm_id}`;
            let truck = truckMap.get(tmId);

            // If TM not present from master list, create from schedule data
            if (!truck) {
              // When any filter is active, do not create trucks from schedule data
              if (hasFilters) {
                return;
              }
              const created: TMSchedule = {
                tmNo,
                tmType: "TM",
                timeSlots: timeSlots,
                scheduleSpecificTimeSlots: {},
                totalFreeHours: 24,
                idlePercentage: 100,
                schedules: [],
              };
              truckMap.set(tmId, created);
              truck = created;
            }

            if (truck) {
              if (schedule.schedule_no !== undefined && !(schedule.schedule_no in truck.scheduleSpecificTimeSlots)) {
                truck.scheduleSpecificTimeSlots[schedule.schedule_no] = timeSlots.map((slot) => ({
                  ...slot,
                  tasks: [],
                }));
              }

              // Update time slots using accurate overlap vs company window
              truck.timeSlots.forEach((slot, i) => {
                const overlap = computeOverlapHours(startHour, endHour, slot.start, slot.end);
                if (overlap > 0) {
                  slot.freeHours = Math.max(0, slot.freeHours - overlap);
                  truck.scheduleSpecificTimeSlots[schedule.schedule_no][i].freeHours = slot.freeHours;
                  truck.scheduleSpecificTimeSlots[schedule.schedule_no][i].tasks.push({ startHour, endHour });
                }
              });

              // Add schedule only once per TM per schedule
              truck.schedules.push({
                customer: schedule.client_name,
                project: schedule.project_name || "-",
                plant: schedule.mother_plant_name || "-",
                startTime: formatTimeByPreference(overallStartTime),
                endTime: formatTimeByPreference(overallEndTime),
                duration: Math.max(0, endHour - startHour),
                scheduleId: schedule._id,
                scheduleNo: schedule.schedule_no,
              });
              truckMap.set(tmId, truck);
            }
          });

          // Now, assign the same schedule to ALL trucks that have engagement in the same time slots
          // This ensures that trucks with the same engagement pattern get the same schedule details
          truckMap.forEach((truck, truckId) => {
            // Check if this truck has engagement in the same time slots as the schedule
            const hasEngagement = truck.timeSlots.some((slot) => {
              const overlap = computeOverlapHours(startHour, endHour, slot.start, slot.end);
              return overlap > 0 && slot.freeHours < 4; // Has some engagement
            });

            if (hasEngagement && !truck.schedules.some(s => s.scheduleId === schedule._id)) {
              // Add the schedule to this truck as well
              truck.schedules.push({
                customer: schedule.client_name,
                project: schedule.project_name || "-",
                plant: schedule.mother_plant_name || "-",
                startTime: formatTimeByPreference(overallStartTime),
                endTime: formatTimeByPreference(overallEndTime),
                duration: Math.max(0, endHour - startHour),
                scheduleId: schedule._id,
                scheduleNo: schedule.schedule_no,
              });
              truckMap.set(truckId, truck);
            }
          });

          // let truck = truckMap.get(schedule.pump);
          // const tmType = (schedule.pump_type || "line").toLowerCase() === "boom" ? "BP" : "LP";
          // const tmNo = truckMap.get(schedule.pump)?.tmNo || `${tmType}-${schedule.pump}`;

          // // If TM not present from master list, create from schedule data
          // if (!truck) {
          //   // When a plant filter is active, do not create trucks from schedule data
          //   if (selectedPlantId) {
          //     return;
          //   }
          //   const created: TMSchedule = {
          //     tmNo,
          //     tmType: tmType,
          //     timeSlots: timeSlots,
          //     scheduleSpecificTimeSlots: {},
          //     totalFreeHours: 24,
          //     idlePercentage: 100,
          //     schedules: [],
          //   };
          //   truckMap.set(schedule.pump, created);
          //   truck = created;
          // }

          // if (truck) {
          //   if (schedule.schedule_no !== undefined && !(schedule.schedule_no in truck.scheduleSpecificTimeSlots)) {
          //     truck.scheduleSpecificTimeSlots[schedule.schedule_no] = timeSlots.map((slot) => ({
          //       ...slot,
          //       tasks: [],
          //     }));
          //   }
          //   const startTime = new Date(trips[0]?.plant_start);
          //   const endTime = new Date(trips[trips.length - 1]?.return);
          //   const startHour = startTime.getHours() + startTime.getMinutes() / 60;
          //   const endHour = endTime.getHours() + endTime.getMinutes() / 60;

          //   // Update time slots using accurate overlap vs company window
          //   truck.timeSlots.forEach((slot, i) => {
          //     const overlap = computeOverlapHours(startHour, endHour, slot.start, slot.end);
          //     if (overlap > 0) {
          //       slot.freeHours = Math.max(0, slot.freeHours - overlap);
          //       truck.scheduleSpecificTimeSlots[schedule.schedule_no][i].freeHours = slot.freeHours;
          //       truck.scheduleSpecificTimeSlots[schedule.schedule_no][i].tasks.push({ startHour, endHour });
          //     }
          //   });

          //   // Add schedule
          //   truck.schedules.push({
          //     customer: schedule.client_name,
          //     project: schedule.project_name || "-",
          //     plant: schedule.mother_plant_name || "-",
          //     startTime: formatTimeByPreference(trips[0]?.plant_start),
          //     endTime: formatTimeByPreference(trips[trips.length - 1]?.return),
          //     duration: Math.max(0, endHour - startHour),
          //     scheduleId: schedule._id,
          //     scheduleNo: schedule.schedule_no,
          //   });
          // }
        }
      });

      // Calculate totals and percentages
      truckMap.forEach((truck) => {
        truck.totalFreeHours = truck.timeSlots.reduce((sum, slot) => sum + slot.freeHours, 0);
        truck.idlePercentage = Math.round((truck.totalFreeHours / 24) * 100);
      });

      // If filters are applied, only return trucks that have engagement (schedules)
      if (hasFilters) {
        return Array.from(truckMap.values()).filter(truck => truck.schedules.length > 0);
      }

      return Array.from(truckMap.values());
    };

    const allTrucks = processAllTrucks();

    // Get unique schedules from all trucks
    const getUniqueSchedules = () => {
      const scheduleMap = new Map<
        string,
        {
          scheduleId: string;
          scheduleNo: string;
          customer: string;
          project: string;
          plant: string;
          startTime: string;
          endTime: string;
          duration: number;
        }
      >();

      allTrucks.forEach((truck) => {
        truck.schedules.forEach((schedule) => {
          if (!scheduleMap.has(schedule.scheduleId)) {
            scheduleMap.set(schedule.scheduleId, {
              scheduleId: schedule.scheduleId,
              scheduleNo: schedule.scheduleNo,
              customer: schedule.customer,
              project: schedule.project,
              plant: schedule.plant,
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
        const mainCols = isProjectWise
          ? [
              "TM/LP/BP",
              ...buildSlots().flatMap(() => ["TM ENGAGED HOURS", "CUSTOMER NAME", "PROJECT"]),
              "TOTAL USED HOURS",
              "TOTAL UNUSED HOURS",
              "USED %",
            ]
          : ["TM/LP/BP", ...buildSlots().map((s) => s.label), "TOTAL USED HOURS", "TOTAL UNUSED HOURS", "USED %"];
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
              
              row.push(
                timeRange,
                customerNames || "-",
                projectNames || "-"
              );
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

          // Detail blocks for schedules 1..6 (only for regular view)
          if (!isProjectWise) {
            for (let scheduleIndex = 0; scheduleIndex < Math.min(6, uniqueSchedules.length); scheduleIndex++) {
              const uniqueSchedule = uniqueSchedules[scheduleIndex];
              const tmSchedule = tm.schedules.find((s) => s.scheduleId === uniqueSchedule.scheduleId);
              row.push(
                tmSchedule?.customer || "-",
                tmSchedule?.project || "-",
                tmSchedule ? `${tmSchedule.startTime} - ${tmSchedule.endTime}` : "-"
              );
            }
          }
          combinedRows.push(row);
        });

        return [
          {
            name: `${isProjectWise ? "Project Wise" : "Truck Wise"} - ${formatDate(selectedDate)}`,
            rows: combinedRows,
            merges,
          },
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
            <div className="flex justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {isProjectWise ? "Project Wise" : "Truck Wise"} Report - {formatDate(selectedDate)}
              </h3>
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
                <Table>
                  <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                    {/* Slot Numbers Row */}
                    <tr className="border-b border-gray-100 dark:border-white/[0.05]">
                      <th className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r">
                        #
                      </th>
                      <th className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r">
                        #
                      </th>
                      <th className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r">
                        #
                      </th>
                      {buildSlots().map((slot, i) => (
                        <th
                          colSpan={isProjectWise ? 3 : 1}
                          key={i + "-SlotNumber"}
                          className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r"
                        >
                          {i + 1}
                        </th>
                      ))}
                      <th className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r">
                        #
                      </th>
                      <th className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r">
                        #
                      </th>
                      <th className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400">
                        #
                      </th>
                    </tr>
                    {isProjectWise ? (
                      <tr className="border-b border-gray-100 dark:border-white/[0.05]">
                        <th className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r">
                          SL. NO
                        </th>
                        <th className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r">
                          TM No.
                        </th>
                        <th className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r">
                          TM/LP/BP
                        </th>
                        {buildSlots().map((slot, i) => (
                          <th
                            colSpan={3}
                            key={i + "-ProjectWise"}
                            className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r"
                          >
                            {slot.label}
                          </th>
                        ))}
                        <th className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r">
                          TOTAL USED HOURS
                        </th>
                        <th className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r">
                          TOTAL UNUSED HOURS
                        </th>
                        <th className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400">
                          USED %
                        </th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r">
                          SL. NO
                        </th>
                        <th className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r">
                          TM No.
                        </th>

                        <th className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r">
                          TM/LP/BP
                        </th>
                        {buildSlots().map((slot, i) => (
                          <th
                            key={i + "-TruckWise"}
                            className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r"
                          >
                            {slot.label}
                          </th>
                        ))}
                        <th className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r">
                          TOTAL USED HOURS
                        </th>
                        <th className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r">
                          TOTAL UNUSED HOURS
                        </th>
                        <th className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400">
                          USED %
                        </th>
                      </tr>
                    )}
                    {isProjectWise && (
                      <tr>
                        <th className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r">
                          #
                        </th>
                        <th className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r">
                          #
                        </th>
                        <th className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r">
                          #
                        </th>
                        {buildSlots().map((slot, i) => (
                          <React.Fragment key={i + "-ProjectWiseSubHeaders"}>
                            <th
                              key={i + "-TMEngagedHours"}
                              className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r"
                            >
                              TM Engaged Hours
                            </th>
                            <th
                              key={i + "-CustomerName"}
                              className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r"
                            >
                              Customer Name
                            </th>
                            <th
                              key={i + "-ProjectName"}
                              className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r"
                            >
                              Project Name
                            </th>
                          </React.Fragment>
                        ))}
                        <th className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r">
                          #
                        </th>
                        <th className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400 border-r">
                          #
                        </th>
                        <th className="px-2 py-3 font-medium text-gray-500 text-center text-xs dark:text-gray-400">
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
                                  <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                                    {rowIndex === 0 ? currentRowIndex : ""}
                                  </TableCell>
                                  <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                                    {rowIndex === 0 ? tm.tmNo : ""}
                                  </TableCell>
                                  <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
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
                                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                                          {isFirstRow ? formatSlotTimeRange(slot, schedule) : ""}
                                        </TableCell>
                                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                                          {schedule?.customer || "-"}
                                        </TableCell>
                                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                                          {schedule?.project || "-"}
                                        </TableCell>
                                      </React.Fragment>
                                    );
                                  })}
                                  <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                                    {rowIndex === 0 ? formatHoursMinutes(24 - tm.totalFreeHours) : ""}
                                  </TableCell>
                                  <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
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
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                                  {currentRowIndex}
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
                                    {formatHoursMinutes(Math.max(0, 4 - slot.freeHours))}
                                  </TableCell>
                                ))}
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                                  {formatHoursMinutes(24 - tm.totalFreeHours)}
                                </TableCell>
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
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
                      <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                        TOTAL
                      </TableCell>
                      <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                        TMs
                      </TableCell>
                      <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                        {null}
                      </TableCell>
                      {isProjectWise
                        ? // Project-wise totals: for each slot, show only the used hours (skip customer and project columns)
                          totals.tms.timeSlotTotals.map((total, index) => (
                            <React.Fragment key={index + "-ProjectWiseTotal"}>
                              <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                                {formatHoursMinutes(total)}
                              </TableCell>
                              <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                                {null}
                              </TableCell>
                              <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                                {null}
                              </TableCell>
                            </React.Fragment>
                          ))
                        : totals.tms.timeSlotTotals.map((total, index) => (
                            <TableCell
                              key={index}
                              className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r"
                            >
                              {formatHoursMinutes(total)}
                            </TableCell>
                          ))}
                      <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                        {null}
                      </TableCell>
                      <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                        {null}
                      </TableCell>
                      <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                        {null}
                      </TableCell>
                      <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90">
                        {null}
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
                                  <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                                    {rowIndex === 0 ? currentRowIndex : ""}
                                  </TableCell>
                                  <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                                    {rowIndex === 0 ? tm.tmNo : ""}
                                  </TableCell>
                                  <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
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
                                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                                          {isFirstRow ? formatSlotTimeRange(slot, schedule) : ""}
                                        </TableCell>
                                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                                          {schedule?.customer || "-"}
                                        </TableCell>
                                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                                          {schedule?.project || "-"}
                                        </TableCell>
                                      </React.Fragment>
                                    );
                                  })}
                                  <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                                    {rowIndex === 0 ? formatHoursMinutes(24 - tm.totalFreeHours) : ""}
                                  </TableCell>
                                  <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
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
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                                  {currentRowIndex}
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
                                    {formatHoursMinutes(Math.max(0, 4 - slot.freeHours))}
                                  </TableCell>
                                ))}
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                                  {formatHoursMinutes(24 - tm.totalFreeHours)}
                                </TableCell>
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
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
                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                          TOTAL
                        </TableCell>
                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                          LPs
                        </TableCell>
                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                          {null}
                        </TableCell>

                        {isProjectWise
                          ? // Project-wise totals: for each slot, show only the used hours (skip customer and project columns)
                            totals.linePumps.timeSlotTotals.map((total, index) => (
                              <React.Fragment key={index + "-ProjectWiseTotal"}>
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                                  {formatHoursMinutes(total)}
                                </TableCell>
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                                  {null}
                                </TableCell>
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                                  {null}
                                </TableCell>
                              </React.Fragment>
                            ))
                          : totals.linePumps.timeSlotTotals.map((total, index) => (
                              <TableCell
                                key={index}
                                className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r"
                              >
                                {formatHoursMinutes(total)}
                              </TableCell>
                            ))}
                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                          {null}
                        </TableCell>
                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                          {null}
                        </TableCell>
                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90">
                          {null}
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
                                  <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                                    {rowIndex === 0 ? currentRowIndex : ""}
                                  </TableCell>
                                  <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                                    {rowIndex === 0 ? tm.tmNo : ""}
                                  </TableCell>
                                  <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
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
                                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                                          {isFirstRow ? formatSlotTimeRange(slot, schedule) : ""}
                                        </TableCell>
                                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                                          {schedule?.customer || "-"}
                                        </TableCell>
                                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                                          {schedule?.project || "-"}
                                        </TableCell>
                                      </React.Fragment>
                                    );
                                  })}
                                  <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                                    {rowIndex === 0 ? formatHoursMinutes(24 - tm.totalFreeHours) : ""}
                                  </TableCell>
                                  <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
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
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                                  {currentRowIndex}
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
                                    {formatHoursMinutes(Math.max(0, 4 - slot.freeHours))}
                                  </TableCell>
                                ))}
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                                  {formatHoursMinutes(24 - tm.totalFreeHours)}
                                </TableCell>
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
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
                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                          TOTAL
                        </TableCell>
                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                          BPs
                        </TableCell>
                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                          {null}
                        </TableCell>

                        {isProjectWise
                          ? // Project-wise totals: for each slot, show only the used hours (skip customer and project columns)
                            totals.boomPumps.timeSlotTotals.map((total, index) => (
                              <React.Fragment key={index + "-ProjectWiseTotal"}>
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                                  {formatHoursMinutes(total)}
                                </TableCell>
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                                  {null}
                                </TableCell>
                                <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                                  {null}
                                </TableCell>
                              </React.Fragment>
                            ))
                          : totals.boomPumps.timeSlotTotals.map((total, index) => (
                              <TableCell
                                key={index}
                                className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r"
                              >
                                {formatHoursMinutes(total)}
                              </TableCell>
                            ))}
                        <TableCell className="px-2 py-3 text-center text-xs text-gray-800 dark:text-white/90 border-r">
                          {null}
                        </TableCell>
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
      </div>
    );
  }
);

TruckWiseTable.displayName = "TruckWiseTable";

export default TruckWiseTable;

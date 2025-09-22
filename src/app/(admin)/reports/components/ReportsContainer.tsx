"use client";

import React, { useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/useApiClient";
import { Spinner } from "@/components/ui/spinner";
import Button from "@/components/ui/button/Button";
import DatePickerInput from "@/components/form/input/DatePickerInput";
import ScheduleWiseTable, { type ScheduleWiseTableExportHandle } from "./ScheduleWiseTable";
import TruckWiseTable, { type TruckWiseTableExportHandle } from "./TruckWiseTable";
import * as XLSX from "xlsx";

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

export default function ReportsContainer() {
  const { status } = useSession();
  const { fetchWithAuth } = useApiClient();
  const { data: session } = useSession();

  const [reportType, setReportType] = useState<"schedule-wise" | "truck-wise">("schedule-wise");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [city, setCity] = useState<string>(session?.city || "");
  const scheduleRef = useRef<ScheduleWiseTableExportHandle | null>(null);
  const truckRef = useRef<TruckWiseTableExportHandle | null>(null);

  React.useEffect(() => {
    if (session && session?.user) {
      setCity(session.city || "");
    }
  }, [session, setCity]);

  const { data: schedules, isLoading } = useQuery<Schedule[]>({
    queryKey: ["reports-schedules", selectedDate],
    queryFn: async () => {
      const response = await fetchWithAuth(`/schedules?type=all&date=${selectedDate}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to fetch schedules");
      return data.data as Schedule[];
    },
    enabled: status === "authenticated",
  });

  const { data: plants } = useQuery<{ _id: string; name: string }[]>({
    queryKey: ["plants"],
    queryFn: async () => {
      const response = await fetchWithAuth("/plants");
      const data = await response.json();
      if (data.success) return data.data as { _id: string; name: string }[];
      return [];
    },
    enabled: status === "authenticated",
  });

  const plantIdToName = useMemo(() => {
    return (plants || []).reduce((acc, p) => {
      acc[p._id] = p.name;
      return acc;
    }, {} as Record<string, string>);
  }, [plants]);

  const filtered = useMemo(() => {
    if (!schedules) return [] as Schedule[];
    return schedules.filter((s) => {
      // Only show schedules with status "generated"
      const matchesStatus =
        reportType === "schedule-wise" ? s.status === "generated" || s.status === "canceled" : s.status === "generated";

      // Filter by selected date
      const matchesDate = !selectedDate || s.input_params.schedule_date === selectedDate;

      return matchesStatus && matchesDate;
    });
  }, [schedules, selectedDate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
  };

  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    const sheets =
      reportType === "schedule-wise" ? scheduleRef.current?.getExportSheets() : truckRef.current?.getExportSheets();
    if (!sheets || sheets.length === 0) return;
    sheets.forEach((sheet) => {
      const ws = XLSX.utils.aoa_to_sheet(sheet.rows);
      const safeName = (sheet.name || "Sheet").replace(/[\\\/:\*\?\[\]]/g, "-").slice(0, 31) || "Sheet";
      XLSX.utils.book_append_sheet(wb, ws, safeName);
    });
    XLSX.writeFile(wb, `${reportType}-${selectedDate}.xlsx`);
  };

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      {/* Date Picker and Report Type Row */}
      <div className="col-span-12 flex items-center justify-between py-4 pl-6 px-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 sticky top-24 z-10">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-white">Reports - {city}</h3>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              className="h-8"
              onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
            >
              Today
            </Button>
            <div className="w-28">
              <DatePickerInput
                value={selectedDate}
                onChange={handleDateChange}
                placeholder="Select date"
                className="h-8"
              />
            </div>
          </div>
        </div>

        {/* Report Type Selection */}
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">Report Type:</span>
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setReportType("schedule-wise")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                reportType === "schedule-wise"
                  ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Schedule Wise
            </button>
            <button
              onClick={() => setReportType("truck-wise")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                reportType === "truck-wise"
                  ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Truck Wise
            </button>
          </div>
          <Button variant="outline" className="h-8" onClick={handleExport}>
            Export
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading || !schedules ? (
        <div className="flex items-center justify-center min-h-[500px] w-full col-span-12">
          <Spinner size="lg" text="Loading reports..." />
        </div>
      ) : (
        <div className="col-span-12">
          {reportType === "schedule-wise" ? (
            <ScheduleWiseTable
              ref={scheduleRef}
              data={filtered}
              plantIdToName={plantIdToName}
              selectedDate={selectedDate}
            />
          ) : (
            <TruckWiseTable ref={truckRef} data={filtered} plantIdToName={plantIdToName} selectedDate={selectedDate} />
          )}
        </div>
      )}
    </div>
  );
}

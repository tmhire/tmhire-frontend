"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/useApiClient";
import { Spinner } from "@/components/ui/spinner";
import Button from "@/components/ui/button/Button";
import DatePickerInput from "@/components/form/input/DatePickerInput";
import ScheduleWiseTable, { type ScheduleWiseTableExportHandle } from "./ScheduleWiseTable";
import TruckWiseTable, { type TruckWiseTableExportHandle } from "./TruckWiseTable";
import * as XLSX from "xlsx";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, Clock, Factory, FileDown } from "lucide-react";

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

export default function ReportsContainer() {
  const { status } = useSession();
  const { fetchWithAuth } = useApiClient();
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [reportType, setReportType] = useState<"schedule-wise" | "truck-wise">("schedule-wise");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [city, setCity] = useState<string>(session?.city || "");
  const [selectedPlantId, setSelectedPlantId] = useState<string>("");
  const [selectedPlantName, setSelectedPlantName] = useState<string>("");
  const scheduleRef = useRef<ScheduleWiseTableExportHandle | null>(null);
  const truckRef = useRef<TruckWiseTableExportHandle | null>(null);

  React.useEffect(() => {
    if (session && session?.user) {
      setCity(session.city || "");
    }
  }, [session, setCity]);

  // Initialize from URL on first render
  useEffect(() => {
    const urlDate = searchParams.get("date");
    const urlType = searchParams.get("report-type");
    const urlPlant = searchParams.get("plant");

    if (urlDate) setSelectedDate(urlDate);
    if (urlType) {
      const normalized = urlType === "schedule" ? "schedule-wise" : urlType === "truck" ? "truck-wise" : urlType;
      if (normalized === "schedule-wise" || normalized === "truck-wise") setReportType(normalized as typeof reportType);
    }
    if (urlPlant) setSelectedPlantName(urlPlant);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: schedules, isLoading } = useQuery<Schedule[]>({
    queryKey: ["reports-schedules", selectedDate],
    queryFn: async () => {
      const response = await fetchWithAuth(`/schedules/reports?type=all&date=${selectedDate}`);
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

  // Resolve plant id from name provided in URL
  useEffect(() => {
    if (!selectedPlantName || !plants || plants.length === 0) return;
    const match = plants.find((p) => p.name === selectedPlantName);
    if (match && match._id !== selectedPlantId) setSelectedPlantId(match._id);
  }, [plants, selectedPlantName, selectedPlantId]);

  // Keep URL in sync with current selections
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedDate) params.set("date", selectedDate);
    if (reportType) params.set("report-type", reportType === "schedule-wise" ? "schedule" : "truck");
    const plantName = selectedPlantId ? plantIdToName[selectedPlantId] : selectedPlantName;
    if (plantName) params.set("plant", plantName);
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [selectedDate, reportType, selectedPlantId, selectedPlantName, plantIdToName, router]);

  const filtered = useMemo(() => {
    if (!schedules) return [] as Schedule[];
    return schedules.filter((s) => {
      // Only show schedules with status "generated"
      const matchesStatus =
        reportType === "schedule-wise" ? s.status === "generated" || s.status === "canceled" : s.status === "generated";

      // Filter by selected date
      const matchesDate = !selectedDate || s.input_params.schedule_date === selectedDate;

      // For schedule-wise: filter by mother plant matching selected plant
      const matchesPlant =
        reportType !== "schedule-wise" || (!selectedPlantId && !selectedPlantName)
          ? true
          : (s.mother_plant_name || "") ===
            (selectedPlantId ? plantIdToName[selectedPlantId] || "" : selectedPlantName);

      return matchesStatus && matchesDate && matchesPlant;
    });
  }, [reportType, schedules, selectedDate, selectedPlantId, selectedPlantName, plantIdToName]);

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
    XLSX.writeFile(wb, `${reportType}-${selectedPlantId && plantIdToName[selectedPlantId] + `-`}${selectedDate}.xlsx`);
  };

  const startHour = session?.custom_start_hour ?? 0; // default 7
  const format = session?.preferred_format ?? "12h";

  function formatHour(hour: number) {
    if (format === "24h") {
      return `${hour.toString().padStart(2, "0")}:00`;
    }
    const suffix = hour >= 12 ? "PM" : "AM";
    const adjusted = hour % 12 === 0 ? 12 : hour % 12;
    return `${adjusted.toString().padStart(2, "0")}:00 ${suffix}`;
  }
  const endHour = (startHour + 24) % 24;

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      {/* Date Picker and Report Type Row */}
      <div className="col-span-12 flex items-center justify-between py-4 pl-6 px-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 sticky top-24">
        {/* Page Name and Scheduled Timings */}
        <div className="flex flex-col space-y-2">
          {/* Page Name Row */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-white">Reports - {city}</h3>
          </div>

          {/* Scheduled Timings Row */}
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Scheduled Timings:</span>
            <span className="px-3 py-1 rounded-full bg-gray-200 dark:bg-gray-700 text-sm font-medium text-gray-800 dark:text-gray-200">
              {formatHour(startHour)} TO {formatHour(endHour)} NEXT DAY
            </span>
          </div>
        </div>

        {/* Filters Group */}
        <div className="flex flex-col space-y-2 bg-gray-50 dark:bg-gray-700/50 px-4 py-3 rounded-lg">
          {/* Date Filter Row */}
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
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

          {/* Plant Filter Row */}
          <div className="flex items-center space-x-2">
            <Factory className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Plant:</span>
            <div className="w-36">
              <select
                className="h-8 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-2 text-gray-700 dark:text-gray-200"
                value={selectedPlantId}
                onChange={(e) => {
                  const next = e.target.value;
                  setSelectedPlantId(next);
                  // Clear URL-derived plant name to prevent resolver from overriding manual selection
                  setSelectedPlantName("");
                }}
              >
                <option value="">All Plants</option>
                {(plants || []).map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Report Type and Export */}
        <div className="flex flex-col space-y-2">
          {/* Report Type Row */}
          <div className="flex items-center space-x-2">
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
          </div>

          {/* Export Row */}
          <div className="flex justify-end">
            <Button variant="outline" className="h-8 flex items-center space-x-2" onClick={handleExport}>
              <FileDown className="h-4 w-4" />
              <span>Export</span>
            </Button>
          </div>
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
            <TruckWiseTable
              ref={truckRef}
              data={filtered}
              selectedDate={selectedDate}
              selectedPlantId={selectedPlantId}
            />
          )}
        </div>
      )}
    </div>
  );
}

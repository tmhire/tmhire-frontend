"use client";

import React, { useState, useEffect } from "react";
import { Search, Filter, Calendar } from "lucide-react";
import { useApiClient } from "@/hooks/useApiClient";
import DatePickerInput from "@/components/form/input/DatePickerInput";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Tooltip from '@/components/ui/tooltip';

// Types for better type safety and backend integration
// Adapted from CalendarContainer for pumps

type ApiTask = {
  id: string;
  start: string;
  end: string;
  client: string;
};

type Task = {
  id: string;
  color: string;
  client: string;
  type: string;
  actualStart: string;
  actualEnd: string;
};

type Pump = {
  id: string;
  name: string;
  plant: string;
  type: string;
  client: string | null;
  tasks: Task[];
};

type ApiResponse = {
  success: boolean;
  message: string;
  data: {
    mixers: {
      id: string;
      name: string;
      plant: string;
      type: string;
      tasks: ApiTask[];
    }[];
  };
};

// Color utilities (same as CalendarContainer)
const generateHSLColor = (index: number): string => {
  const goldenRatio = 0.618033988749895;
  const hue = (index * goldenRatio * 360) % 360;
  const saturation = 70;
  const lightness = 45;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

const generateTailwindColor = (hslColor: string): string => {
  const [h, s, l] = hslColor.match(/\d+/g)?.map(Number) || [0, 0, 0];
  const s1 = s / 100;
  const l1 = l / 100;
  const c = (1 - Math.abs(2 * l1 - 1)) * s1;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l1 - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h >= 0 && h < 60) {
    [r, g, b] = [c, x, 0];
  } else if (h >= 60 && h < 120) {
    [r, g, b] = [x, c, 0];
  } else if (h >= 120 && h < 180) {
    [r, g, b] = [0, c, x];
  } else if (h >= 180 && h < 240) {
    [r, g, b] = [0, x, c];
  } else if (h >= 240 && h < 300) {
    [r, g, b] = [x, 0, c];
  } else {
    [r, g, b] = [c, 0, x];
  }
  const rgb = [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  const tailwindColors = {
    "bg-red-500": [239, 68, 68],
    "bg-orange-500": [249, 115, 22],
    "bg-yellow-500": [234, 179, 8],
    "bg-green-500": [34, 197, 94],
    "bg-teal-500": [20, 184, 166],
    "bg-blue-500": [59, 130, 246],
    "bg-indigo-500": [99, 102, 241],
    "bg-purple-500": [168, 85, 247],
    "bg-pink-500": [236, 72, 153],
    "bg-cyan-500": [6, 182, 212],
    "bg-emerald-500": [16, 185, 129],
    "bg-violet-500": [139, 92, 246],
    "bg-fuchsia-500": [217, 70, 239],
    "bg-rose-500": [244, 63, 94],
    "bg-amber-500": [245, 158, 11],
    "bg-lime-500": [132, 204, 22],
  };
  let minDistance = Infinity;
  let closestColor = "bg-gray-500";
  for (const [color, [tr, tg, tb]] of Object.entries(tailwindColors)) {
    const distance = Math.sqrt(Math.pow(rgb[0] - tr, 2) + Math.pow(rgb[1] - tg, 2) + Math.pow(rgb[2] - tb, 2));
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = color;
    }
  }
  return closestColor;
};

const timeStringToHour = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours + minutes / 60;
};

const calculateDuration = (start: string, end: string): number => {
  const startFloat = timeStringToHour(start);
  const endFloat = timeStringToHour(end);
  const rawDuration = endFloat - startFloat;
  const roundedDuration = Math.round(rawDuration * 60);
  return roundedDuration;
};

const transformApiData = (apiData: ApiResponse): Pump[] => {
  const uniqueClients = new Set<string>();
  apiData.data.mixers.forEach((pump) => {
    pump.tasks.forEach((task) => {
      if (task.client) uniqueClients.add(task.client);
    });
  });
  const clientColors = new Map<string, string>();
  Array.from(uniqueClients).forEach((client, index) => {
    const hslColor = generateHSLColor(index);
    const tailwindColor = generateTailwindColor(hslColor);
    clientColors.set(client, tailwindColor);
  });
  return apiData.data.mixers.map((pump) => {
    const transformedTasks: Task[] = pump.tasks.map((task) => {
      const color = clientColors.get(task.client) || "bg-gray-500";
      return {
        id: task.id,
        color,
        client: task.client,
        type: pump.type,
        actualStart: task.start,
        actualEnd: task.end,
      };
    });
    const currentClient = transformedTasks.length > 0 ? transformedTasks[0].client : null;
    return {
      id: pump.id,
      name: pump.name,
      plant: pump.plant,
      type: pump.type,
      client: currentClient,
      tasks: transformedTasks,
    };
  });
};

// Type color mapping
const typeRowColors: Record<string, string> = {
  line: 'bg-blue-100 dark:bg-blue-300/30', // light blue
  boom: 'bg-green-100 dark:bg-green-300/30', // light green
};

export default function PumpCalendarContainer() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDate = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState("all");
  const [selectedPump, setSelectedPump] = useState("all");
  const [selectedClient, setSelectedClient] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [ganttData, setGanttData] = useState<Pump[]>([]);
  const [loading, setLoading] = useState(true);
  const { fetchWithAuth } = useApiClient();
  const [isPlantFilterOpen, setIsPlantFilterOpen] = useState(false);
  const [isPumpFilterOpen, setIsPumpFilterOpen] = useState(false);
  const [isClientFilterOpen, setIsClientFilterOpen] = useState(false);
  const [isTypeFilterOpen, setIsTypeFilterOpen] = useState(false);
  const [timeFormat, setTimeFormat] = useState("24h");
  const [customStartHour, setCustomStartHour] = useState(6);
  const [isTimeFormatOpen, setIsTimeFormatOpen] = useState(false);
  const timeSlots = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
  const formatTime = (hour: number) => {
    if (timeFormat === "12h") {
      const period = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:00 ${period}`;
    }
    return `${String(hour).padStart(2, "0")}:00`;
  };
  const getTimeSlots = () => {
    if (timeFormat === "24h-custom") {
      return Array.from({ length: 24 }, (_, i) => (customStartHour + i) % 24);
    }
    return timeSlots;
  };
  const filteredData = ganttData.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlant = selectedPlant === "all" || item.plant === selectedPlant;
    const matchesPump = selectedPump === "all" || item.name === selectedPump;
    const matchesClient = selectedClient === "all" || item.client === selectedClient;
    const matchesType = selectedType === "all" || item.type === selectedType;
    return matchesSearch && matchesPlant && matchesPump && matchesClient && matchesType;
  });
  const clientLegend = Object.values(
    ganttData
      .flatMap((pump) => pump.tasks)
      .reduce((acc, task) => {
        if (task.client && !acc[task.client]) {
          acc[task.client] = { name: task.client, color: task.color };
        }
        return acc;
      }, {} as Record<string, { name: string; color: string }>)
  );
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", newDate);
    router.push(`?${params.toString()}`);
  };
  const fetchGanttData = async (date: string) => {
    try {
      setLoading(true);
      const response = await fetchWithAuth("/pumps/gantt", {
        method: "POST",
        body: JSON.stringify({
          query_date: date,
        }),
      });
      const data: ApiResponse = await response.json();
      if (data.success) {
        const transformedData = transformApiData(data);
        setGanttData(transformedData);
      }
    } catch (err) {
      console.error(err instanceof Error ? err.message : "Failed to fetch pump gantt data");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (status === "loading") {
      return;
    }
    if (status === "authenticated" && session) {
      fetchGanttData(selectedDate);
    }
  }, [selectedDate, status]);
  const plants = Array.from(new Set(ganttData.map((item) => item.plant)));
  const pumps = Array.from(new Set(ganttData.map((item) => item.name)));
  const clients = Array.from(
    new Set(ganttData.map((item) => item.client).filter((client): client is string => client !== null))
  );
  const types = Array.from(new Set(ganttData.map((item) => item.type)));
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Pump Schedule Calendar</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage and monitor pump schedules across all production lines
          </p>
        </div>
        <div className="bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.05] p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search pumps..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-200 dark:border-white/[0.05] rounded-lg bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-full sm:w-64"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  showFilters
                    ? "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400"
                    : "bg-white dark:bg-white/[0.05] border-gray-200 dark:border-white/[0.05] text-gray-700 dark:text-gray-300"
                } hover:bg-gray-50 dark:hover:bg-white/[0.08]`}
              >
                <Filter className="h-4 w-4" />
                Filters
              </button>
            </div>
            <div className="flex items-center gap-3">
              <DatePickerInput value={selectedDate} onChange={handleDateChange} className="w-48" />
              <button
                onClick={() => handleDateChange(new Date().toISOString().split("T")[0])}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.05] rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.08] transition-colors"
              >
                <Calendar className="h-4 w-4" />
                Today
              </button>
            </div>
          </div>
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/[0.05]">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Plant</label>
                  <button
                    onClick={() => setIsPlantFilterOpen(!isPlantFilterOpen)}
                    className="w-full px-3 py-2 text-left border border-gray-200 dark:border-white/[0.05] rounded-lg bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    {selectedPlant === "all" ? "All Plants" : selectedPlant}
                  </button>
                  {isPlantFilterOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-white/[0.05]">
                      <div className="p-2 text-gray-800 dark:text-white/90">
                        <button
                          className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                          onClick={() => {
                            setSelectedPlant("all");
                            setIsPlantFilterOpen(false);
                          }}
                        >
                          All Plants
                        </button>
                        {plants.map((plant) => (
                          <button
                            key={plant}
                            className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            onClick={() => {
                              setSelectedPlant(plant);
                              setIsPlantFilterOpen(false);
                            }}
                          >
                            {plant}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pump</label>
                  <button
                    onClick={() => setIsPumpFilterOpen(!isPumpFilterOpen)}
                    className="w-full px-3 py-2 text-left border border-gray-200 dark:border-white/[0.05] rounded-lg bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    {selectedPump === "all" ? "All Pumps" : selectedPump}
                  </button>
                  {isPumpFilterOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-white/[0.05]">
                      <div className="p-2 text-gray-800 dark:text-white/90">
                        <button
                          className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                          onClick={() => {
                            setSelectedPump("all");
                            setIsPumpFilterOpen(false);
                          }}
                        >
                          All Pumps
                        </button>
                        {pumps.map((pump) => (
                          <button
                            key={pump}
                            className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            onClick={() => {
                              setSelectedPump(pump);
                              setIsPumpFilterOpen(false);
                            }}
                          >
                            {pump}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Client</label>
                  <button
                    onClick={() => setIsClientFilterOpen(!isClientFilterOpen)}
                    className="w-full px-3 py-2 text-left border border-gray-200 dark:border-white/[0.05] rounded-lg bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    {selectedClient === "all" ? "All Clients" : selectedClient}
                  </button>
                  {isClientFilterOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-white/[0.05]">
                      <div className="p-2 text-gray-800 dark:text-white/90">
                        <button
                          className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                          onClick={() => {
                            setSelectedClient("all");
                            setIsClientFilterOpen(false);
                          }}
                        >
                          All Clients
                        </button>
                        {clients.map((client) => (
                          <button
                            key={client}
                            className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            onClick={() => {
                              setSelectedClient(client);
                              setIsClientFilterOpen(false);
                            }}
                          >
                            {client}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
                  <button
                    onClick={() => setIsTypeFilterOpen(!isTypeFilterOpen)}
                    className="w-full px-3 py-2 text-left border border-gray-200 dark:border-white/[0.05] rounded-lg bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    {selectedType === "all" ? "All Types" : selectedType}
                  </button>
                  {isTypeFilterOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-white/[0.05]">
                      <div className="p-2 text-gray-800 dark:text-white/90">
                        <button
                          className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                          onClick={() => {
                            setSelectedType("all");
                            setIsTypeFilterOpen(false);
                          }}
                        >
                          All Types
                        </button>
                        {types.map((type) => (
                          <button
                            key={type}
                            className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            onClick={() => {
                              setSelectedType(type);
                              setIsTypeFilterOpen(false);
                            }}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Time Format</label>
                  <button
                    onClick={() => setIsTimeFormatOpen(!isTimeFormatOpen)}
                    className="w-full px-3 py-2 text-left border border-gray-200 dark:border-white/[0.05] rounded-lg bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    {timeFormat === "24h" ? "24-Hour Format" : timeFormat === "12h" ? "12-Hour Format" : "24h (Custom)"}
                  </button>
                  {isTimeFormatOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-white/[0.05]">
                      <div className="p-2 text-gray-800 dark:text-white/90">
                        <button
                          className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                          onClick={() => {
                            setTimeFormat("24h");
                            setIsTimeFormatOpen(false);
                          }}
                        >
                          24-Hour Format
                        </button>
                        <button
                          className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                          onClick={() => {
                            setTimeFormat("12h");
                            setIsTimeFormatOpen(false);
                          }}
                        >
                          12-Hour Format
                        </button>
                        <button
                          className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                          onClick={() => {
                            setTimeFormat("24h-custom");
                            setIsTimeFormatOpen(false);
                          }}
                        >
                          24h (Custom)
                        </button>
                      </div>
                    </div>
                  )}
                  {timeFormat === "24h-custom" && (
                    <div className="mt-2">
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Start Hour</label>
                      <select
                        className="w-full px-2 py-1 border border-gray-200 dark:border-white/[0.05] rounded-lg bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white"
                        value={customStartHour}
                        onChange={(e) => setCustomStartHour(Number(e.target.value))}
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={i}>{`${String(i).padStart(2, "0")}:00`}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  if (!loading) {
    // Compute client stats for the filtered data
    const clientStats: Record<string, { totalMinutes: number; pumps: Set<string>; schedules: number }> = {};
    filteredData.forEach((pump) => {
      pump.tasks.forEach((task) => {
        if (!task.client) return;
        if (!clientStats[task.client]) {
          clientStats[task.client] = { totalMinutes: 0, pumps: new Set(), schedules: 0 };
        }
        const duration = calculateDuration(task.actualStart, task.actualEnd);
        clientStats[task.client].totalMinutes += duration;
        clientStats[task.client].pumps.add(pump.name);
        clientStats[task.client].schedules += 1;
      });
    });
    return (
      <div>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Pump Schedule Calendar</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Manage and monitor pump schedules across all production lines
            </p>
          </div>
          {/* Controls Bar */}
          <div className="bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.05] p-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              {/* Left side - Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search pumps..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 dark:border-white/[0.05] rounded-lg bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-full sm:w-64"
                  />
                </div>
                {/* Filter Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    showFilters
                      ? "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400"
                      : "bg-white dark:bg-white/[0.05] border-gray-200 dark:border-white/[0.05] text-gray-700 dark:text-gray-300"
                  } hover:bg-gray-50 dark:hover:bg-white/[0.08]`}
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </button>
              </div>
              {/* Right side - Date Selection */}
              <div className="flex items-center gap-3">
                <DatePickerInput value={selectedDate} onChange={handleDateChange} className="w-48" />
                <button
                  onClick={() => handleDateChange(new Date().toISOString().split("T")[0])}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.05] rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.08] transition-colors"
                >
                  <Calendar className="h-4 w-4" />
                  Today
                </button>
              </div>
            </div>
            {/* Expandable Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/[0.05]">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {/* Plant Filter */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Plant</label>
                    <button
                      onClick={() => setIsPlantFilterOpen(!isPlantFilterOpen)}
                      className="w-full px-3 py-2 text-left border border-gray-200 dark:border-white/[0.05] rounded-lg bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      {selectedPlant === "all" ? "All Plants" : selectedPlant}
                    </button>
                    {isPlantFilterOpen && (
                      <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-white/[0.05]">
                        <div className="p-2 text-gray-800 dark:text-white/90">
                          <button
                            className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            onClick={() => {
                              setSelectedPlant("all");
                              setIsPlantFilterOpen(false);
                            }}
                          >
                            All Plants
                          </button>
                          {plants.map((plant) => (
                            <button
                              key={plant}
                              className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                              onClick={() => {
                                setSelectedPlant(plant);
                                setIsPlantFilterOpen(false);
                              }}
                            >
                              {plant}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Pump Filter */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pump</label>
                    <button
                      onClick={() => setIsPumpFilterOpen(!isPumpFilterOpen)}
                      className="w-full px-3 py-2 text-left border border-gray-200 dark:border-white/[0.05] rounded-lg bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      {selectedPump === "all" ? "All Pumps" : selectedPump}
                    </button>
                    {isPumpFilterOpen && (
                      <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-white/[0.05]">
                        <div className="p-2 text-gray-800 dark:text-white/90">
                          <button
                            className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            onClick={() => {
                              setSelectedPump("all");
                              setIsPumpFilterOpen(false);
                            }}
                          >
                            All Pumps
                          </button>
                          {pumps.map((pump) => (
                            <button
                              key={pump}
                              className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                              onClick={() => {
                                setSelectedPump(pump);
                                setIsPumpFilterOpen(false);
                              }}
                            >
                              {pump}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Client Filter */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Client</label>
                    <button
                      onClick={() => setIsClientFilterOpen(!isClientFilterOpen)}
                      className="w-full px-3 py-2 text-left border border-gray-200 dark:border-white/[0.05] rounded-lg bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      {selectedClient === "all" ? "All Clients" : selectedClient}
                    </button>
                    {isClientFilterOpen && (
                      <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-white/[0.05]">
                        <div className="p-2 text-gray-800 dark:text-white/90">
                          <button
                            className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            onClick={() => {
                              setSelectedClient("all");
                              setIsClientFilterOpen(false);
                            }}
                          >
                            All Clients
                          </button>
                          {clients.map((client) => (
                            <button
                              key={client}
                              className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                              onClick={() => {
                                setSelectedClient(client);
                                setIsClientFilterOpen(false);
                              }}
                            >
                              {client}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Type Filter */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
                    <button
                      onClick={() => setIsTypeFilterOpen(!isTypeFilterOpen)}
                      className="w-full px-3 py-2 text-left border border-gray-200 dark:border-white/[0.05] rounded-lg bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      {selectedType === "all" ? "All Types" : selectedType}
                    </button>
                    {isTypeFilterOpen && (
                      <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-white/[0.05]">
                        <div className="p-2 text-gray-800 dark:text-white/90">
                          <button
                            className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            onClick={() => {
                              setSelectedType("all");
                              setIsTypeFilterOpen(false);
                            }}
                          >
                            All Types
                          </button>
                          {types.map((type) => (
                            <button
                              key={type}
                              className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                              onClick={() => {
                                setSelectedType(type);
                                setIsTypeFilterOpen(false);
                              }}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Time Format Filter */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Time Format
                    </label>
                    <button
                      onClick={() => setIsTimeFormatOpen(!isTimeFormatOpen)}
                      className="w-full px-3 py-2 text-left border border-gray-200 dark:border-white/[0.05] rounded-lg bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      {timeFormat === "24h"
                        ? "24-Hour Format"
                        : timeFormat === "12h"
                        ? "12-Hour Format"
                        : "24h (Custom)"}
                    </button>
                    {isTimeFormatOpen && (
                      <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-white/[0.05]">
                        <div className="p-2 text-gray-800 dark:text-white/90">
                          <button
                            className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            onClick={() => {
                              setTimeFormat("24h");
                              setIsTimeFormatOpen(false);
                            }}
                          >
                            24-Hour Format
                          </button>
                          <button
                            className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            onClick={() => {
                              setTimeFormat("12h");
                              setIsTimeFormatOpen(false);
                            }}
                          >
                            12-Hour Format
                          </button>
                          <button
                            className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            onClick={() => {
                              setTimeFormat("24h-custom");
                              setIsTimeFormatOpen(false);
                            }}
                          >
                            24h (Custom)
                          </button>
                        </div>
                      </div>
                    )}
                    {timeFormat === "24h-custom" && (
                      <div className="mt-2">
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Start Hour</label>
                        <select
                          className="w-full px-2 py-1 border border-gray-200 dark:border-white/[0.05] rounded-lg bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white"
                          value={customStartHour}
                          onChange={(e) => setCustomStartHour(Number(e.target.value))}
                        >
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i}>{`${String(i).padStart(2, "0")}:00`}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Date Display */}
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {new Date(selectedDate).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </h2>
          </div>
          {/* Gantt Chart */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <div className="min-w-[1000px]">
                {/* Time Header */}
                <div className="flex border-b border-gray-300 dark:border-white/[0.05]">
                  {/* Serial Number Column */}
                  <div className="w-10 px-2 py-3 font-medium text-gray-500 text-xs dark:text-gray-400 border-r border-gray-300 dark:border-white/[0.05] text-center">
                    SNo
                  </div>
                  <div className="w-30 px-5 py-3 font-medium text-gray-500 text-xs dark:text-gray-400 border-r border-gray-300 dark:border-white/[0.05]">
                    Pump ID
                  </div>
                  {getTimeSlots().map((time) => (
                    <div
                      key={time}
                      className="w-10 px-2 py-3 text-center font-medium text-gray-500 text-[9px] dark:text-gray-400 border-r border-gray-300 dark:border-white/[0.05]"
                    >
                      {formatTime(time)}
                    </div>
                  ))}
                  {/* Free Time Column */}
                  <div className="w-14 px-2 py-3 font-medium text-gray-500 text-xs dark:text-gray-400 border-l border-gray-300 dark:border-white/[0.05] text-center">
                    Unused
                  </div>
                </div>
                {/* Gantt Rows */}
                <div className="divide-y divide-gray-400 dark:divide-white/[0.05]">
                  {filteredData.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                      No pumps found for the selected criteria
                    </div>
                  ) : (
                    filteredData.map((pump, idx) => {
                      // Group tasks by client for this pump
                      const clientTaskMap: Record<
                        string,
                        {
                          start: number;
                          end: number;
                          duration: number;
                          color: string;
                          client: string;
                          actualStart: string;
                          actualEnd: string;
                        }
                      > = {};
                      pump.tasks.forEach((task) => {
                        if (!clientTaskMap[task.client]) {
                          const start = Math.floor(timeStringToHour(task.actualStart));
                          const end = Math.round(timeStringToHour(task.actualEnd));
                          clientTaskMap[task.client] = {
                            start: start,
                            end: end,
                            duration: calculateDuration(task.actualStart, task.actualEnd),
                            color: task.color,
                            client: task.client,
                            actualStart: task.actualStart,
                            actualEnd: task.actualEnd,
                          };
                        } else {
                          if (
                            timeStringToHour(task.actualStart) <
                            timeStringToHour(clientTaskMap[task.client].actualStart)
                          ) {
                            clientTaskMap[task.client].actualStart = task.actualStart;
                          }
                          if (
                            timeStringToHour(task.actualEnd) > timeStringToHour(clientTaskMap[task.client].actualEnd)
                          ) {
                            clientTaskMap[task.client].actualEnd = task.actualEnd;
                          }
                          const start = clientTaskMap[task.client].actualStart;
                          const end = clientTaskMap[task.client].actualEnd;
                          clientTaskMap[task.client].start = timeStringToHour(start);
                          clientTaskMap[task.client].end = timeStringToHour(end);
                          clientTaskMap[task.client].duration = calculateDuration(start, end);
                        }
                      });
                      const clientTasks = Object.values(clientTaskMap);
                      // --- Calculate Free Time (like CalendarContainer) ---
                      let freeTime = 24;
                      clientTasks.forEach((task) => (freeTime -= task.duration / 60));
                      freeTime = Math.round(freeTime);
                      // --- NEW LOGIC FOR DYNAMIC TIMESLOTS ---
                      const slots = getTimeSlots();
                      const windowStart = slots[0];
                      const windowEnd = slots[slots.length - 1];
                      // Helper to check if a time is within the window, considering wrap-around
                      const isInWindow = (start: number, end: number) => {
                        if (windowStart < windowEnd) {
                          return end > windowStart && start < windowEnd + 1;
                        } else {
                          // Wraps around midnight
                          return end > windowStart || start < windowEnd + 1;
                        }
                      };
                      // Helper to get offset and width in the current window
                      const getBarProps = (start: number, end: number) => {
                        let barStart = start;
                        let barEnd = end;
                        if (windowStart < windowEnd) {
                          barStart = Math.max(start, windowStart);
                          barEnd = Math.min(end, windowEnd + 1);
                        } else {
                          // Wraps around midnight
                          if (start < windowStart && end <= windowStart) {
                            // Task is in the early part of the window (after midnight)
                            barStart = start;
                            barEnd = Math.min(end, windowEnd + 1);
                          } else if (start >= windowStart) {
                            // Task is in the late part of the window (before midnight)
                            barStart = Math.max(start, windowStart);
                            barEnd = end;
                          } else {
                            // Task spans the wrap
                            barStart = start;
                            barEnd = end;
                          }
                        }
                        // Calculate offset and width in slots
                        const offset = (barStart - windowStart + 24) % 24;
                        let width = barEnd - barStart;
                        // Clamp width to not exceed window
                        if (width < 0) width = 0;
                        // Clamp width so bar does not extend past the last visible slot
                        if (offset + width > slots.length) {
                          width = slots.length - offset;
                          if (width < 0) width = 0;
                        }
                        return { offset, width };
                      };
                      return (
                        <div
                          key={pump.id}
                          className={`flex transition-colors ${typeRowColors[pump.type] || ''} hover:bg-gray-100 dark:hover:bg-white/[0.04]`}
                        >
                          {/* Serial Number */}
                          <div className="w-10 px-2 py-1 text-gray-700 text-xs dark:text-white/90 border-r border-gray-300 dark:border-white/[0.05] flex items-center justify-center">
                            {idx + 1}
                          </div>
                          {/* Pump Name */}
                          <div className="w-30 px-5 py-1 text-gray-700 text-xs dark:text-white/90 border-r border-gray-300 dark:border-white/[0.05] flex items-center">
                            {pump.name.length > 6 ? ".." + pump.name.slice(4) : pump.name}
                          </div>
                          {/* Time Slots */}
                          <div className="flex-1 flex relative">
                            {/* Render bars for each client task that overlaps the window */}
                            {clientTasks.map((ct) => {
                              if (!isInWindow(ct.start, ct.end)) return null;
                              const { offset, width } = getBarProps(ct.start, ct.end);
                              if (width <= 0) return null;
                              return (
                                <Tooltip
                                  key={ct.client}
                                  content={`Pump: ${pump.name}\nClient: ${ct.client}\n${ct.actualStart} to ${ct.actualEnd}\nDuration: ${ct.duration}m`}
                                >
                                  <div
                                    className={`absolute top-1 h-4 rounded ${ct.color} opacity-80 hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center`}
                                    style={{
                                      left: `${offset * 40 + 1}px`,
                                      width: `${width * 40 - 8}px`,
                                      zIndex: 10,
                                    }}
                                  >
                                    <span className="text-white text-xs font-medium">{ct.duration}m</span>
                                  </div>
                                </Tooltip>
                              );
                            })}
                            {/* Render slot borders */}
                            {slots.map((time) => (
                              <div
                                key={time}
                                className="w-10 h-6 border-r border-gray-300 dark:border-white/[0.05] relative"
                              />
                            ))}
                          <div className="w-14 px-2 py-1 text-gray-700 text-xs dark:text-white/90 border-l border-gray-300 dark:border-white/[0.05] flex items-center justify-center">
                            {freeTime}
                          </div>
                          </div>
                          {/* Free Time */}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Legend */}
          {(clientLegend.length > 0 || types.length > 0) && (
            <div className="mt-6 bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.05] p-4">
              <div className="flex flex-col gap-2">
                {clientLegend.length > 0 && (
                  <>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Clients</h3>
                    <div className="flex flex-wrap gap-4 mb-2">
                      {clientLegend.map(({ name, color }) => {
                        const stats = clientStats[name];
                        let timeString = "0m";
                        if (stats) {
                          const hours = Math.floor(stats.totalMinutes / 60);
                          const minutes = stats.totalMinutes % 60;
                          timeString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                        }
                        return (
                          <div key={name} className="flex flex-col items-start gap-1 min-w-[160px]">
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 ${color} rounded`}></div>
                              <span className="text-sm text-gray-600 dark:text-gray-400">{name}</span>
                            </div>
                            <div className="ml-6 text-xs text-gray-500 dark:text-gray-400">
                              <div>Total Scheduled: <span className="font-medium">{stats ? timeString : "0m"}</span></div>
                              <div>Pumps Used: <span className="font-medium">{stats ? stats.pumps.size : 0}</span></div>
                              <div>Schedules: <span className="font-medium">{stats ? stats.schedules : 0}</span></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
                {types.length > 0 && (
                  <>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pump Types</h3>
                    <div className="flex flex-wrap gap-4">
                      {types.map((type) => (
                        <div key={type} className="flex items-center gap-2">
                          <div className={`w-4 h-4 ${typeRowColors[type] || 'bg-gray-200'} rounded`}></div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}

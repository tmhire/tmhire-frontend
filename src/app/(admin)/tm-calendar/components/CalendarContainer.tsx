"use client";

import React, { useState, useEffect } from "react";
import { Search, Filter, Calendar } from "lucide-react";
import { useApiClient } from "@/hooks/useApiClient";
import DatePickerInput from "@/components/form/input/DatePickerInput";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Tooltip from "@/components/ui/tooltip";

// Types for better type safety and backend integration
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

type Mixer = {
  id: string;
  name: string;
  plant: string;
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
      tasks: ApiTask[];
    }[];
  };
};

// Add color generation utilities
const generateHSLColor = (index: number): string => {
  // Use golden ratio to ensure good distribution of colors
  const goldenRatio = 0.618033988749895;
  const hue = (index * goldenRatio * 360) % 360;

  // Fixed saturation and lightness for consistent appearance
  const saturation = 70; // 70% saturation
  const lightness = 45; // 45% lightness for good contrast

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

const generateTailwindColor = (hslColor: string): string => {
  // Convert HSL to RGB
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

  // Map to closest Tailwind color
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

  // Find closest Tailwind color
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

const timeSlots = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

// Helper function to convert time string to hour number
const timeStringToHour = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours + minutes / 60;
};

// Helper function to calculate duration between two times
const calculateDuration = (start: string, end: string): number => {
  const startFloat = timeStringToHour(start); // e.g. 2.18
  const endFloat = timeStringToHour(end); // e.g. 3.26
  const rawDuration = endFloat - startFloat;
  // Round to nearest 0.5
  const roundedDuration = Math.round(rawDuration * 60);
  return roundedDuration;
};

// Helper function to transform API data to component format
const transformApiData = (apiData: ApiResponse): Mixer[] => {
  // Create a map of unique clients
  const uniqueClients = new Set<string>();
  apiData.data.mixers.forEach((mixer) => {
    mixer.tasks.forEach((task) => {
      if (task.client) uniqueClients.add(task.client);
    });
  });

  // Generate colors for each unique client
  const clientColors = new Map<string, string>();
  Array.from(uniqueClients).forEach((client, index) => {
    const hslColor = generateHSLColor(index);
    const tailwindColor = generateTailwindColor(hslColor);
    clientColors.set(client, tailwindColor);
  });

  return apiData.data.mixers.map((mixer) => {
    const transformedTasks: Task[] = mixer.tasks.map((task) => {
      const color = clientColors.get(task.client) || "bg-gray-500";

      return {
        id: task.id,
        color,
        client: task.client,
        type: "production", // Default type since API doesn't provide this
        actualStart: task.start,
        actualEnd: task.end,
      };
    });

    // Determine mixer's current client (first task's client or null)
    const currentClient = transformedTasks.length > 0 ? transformedTasks[0].client : null;

    return {
      id: mixer.id,
      name: mixer.name,
      plant: mixer.plant,
      client: currentClient,
      tasks: transformedTasks,
    };
  });
};

export default function CalendarContainer() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get initial date from URL or use current date
  const initialDate = searchParams.get("date") || new Date().toISOString().split("T")[0];

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState("all");
  const [selectedMixer, setSelectedMixer] = useState("all");
  const [selectedClient, setSelectedClient] = useState("all");
  const [timeFormat, setTimeFormat] = useState("24h");
  const [customStartHour, setCustomStartHour] = useState(6); // default 6:00
  const [ganttData, setGanttData] = useState<Mixer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dropdown states
  const [isPlantFilterOpen, setIsPlantFilterOpen] = useState(false);
  const [isMixerFilterOpen, setIsMixerFilterOpen] = useState(false);
  const [isClientFilterOpen, setIsClientFilterOpen] = useState(false);
  const [isTimeFormatOpen, setIsTimeFormatOpen] = useState(false);

  const { fetchWithAuth } = useApiClient();

  // Update URL when date changes
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", newDate);
    router.push(`?${params.toString()}`);
  };

  // Fetch gantt data from API
  const fetchGanttData = async (date: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithAuth("/calendar/gantt", {
        method: "POST",
        body: JSON.stringify({
          query_date: date,
        }),
      });

      const data: ApiResponse = await response.json();
      console.log("data", data);
      if (data.success) {
        const transformedData = transformApiData(data);
        setGanttData(transformedData);
      } else {
        setError(data.message || "Failed to fetch gantt data");
      }
    } catch (err) {
      console.error("Error fetching gantt data:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch gantt data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when component mounts, date changes, or session status changes
  useEffect(() => {
    if (status === "loading") {
      return; // Don't fetch while session is loading
    }

    if (status === "authenticated" && session) {
      fetchGanttData(selectedDate);
    }
  }, [selectedDate, status]);

  // Filter data based on search term and selected filters
  const filteredData = ganttData.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlant = selectedPlant === "all" || item.plant === selectedPlant;
    const matchesMixer = selectedMixer === "all" || item.name === selectedMixer;
    const matchesClient = selectedClient === "all" || item.client === selectedClient;

    return matchesSearch && matchesPlant && matchesMixer && matchesClient;
  });

  const formatTime = (hour: number) => {
    if (timeFormat === "12h") {
      const period = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:00 ${period}`;
    }
    return `${String(hour).padStart(2, "0")}:00`;
  };

  // Get unique values for filter options
  const plants = Array.from(new Set(ganttData.map((item) => item.plant)));
  const mixers = Array.from(new Set(ganttData.map((item) => item.name)));
  const clients = Array.from(
    new Set(ganttData.map((item) => item.client).filter((client): client is string => client !== null))
  );

  // Get unique clients with their colors for the legend
  const clientLegend = Object.values(
    ganttData
      .flatMap((mixer) => mixer.tasks)
      .reduce((acc, task) => {
        if (task.client && !acc[task.client]) {
          acc[task.client] = { name: task.client, color: task.color };
        }
        return acc;
      }, {} as Record<string, { name: string; color: string }>)
  );

  // Compute client stats for the filtered data
  type ClientStat = {
    totalMinutes: number;
    mixers: Set<string>;
    schedules: number;
    firstStart: string;
    lastEnd: string;
  };
  const clientStats: Record<string, ClientStat> = {};
  filteredData.forEach((mixer) => {
    mixer.tasks.forEach((task) => {
      if (!task.client) return;
      if (!clientStats[task.client]) {
        clientStats[task.client] = {
          totalMinutes: 0,
          mixers: new Set(),
          schedules: 0,
          firstStart: task.actualStart,
          lastEnd: task.actualEnd,
        };
      } else {
        // Update firstStart and lastEnd
        if (task.actualStart < clientStats[task.client].firstStart) {
          clientStats[task.client].firstStart = task.actualStart;
        }
        if (task.actualEnd > clientStats[task.client].lastEnd) {
          clientStats[task.client].lastEnd = task.actualEnd;
        }
      }
      clientStats[task.client].mixers.add(mixer.name);
      clientStats[task.client].schedules += 1;
    });
  });
  // Calculate totalMinutes as the difference between firstStart and lastEnd
  Object.values(clientStats).forEach((stat) => {
    if (stat.firstStart && stat.lastEnd) {
      const [startH, startM] = stat.firstStart.split(":").map(Number);
      const [endH, endM] = stat.lastEnd.split(":").map(Number);
      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;
      stat.totalMinutes = endTotal - startTotal;
      if (stat.totalMinutes < 0) stat.totalMinutes = 0;
    }
  });

  // Helper to generate time slots based on custom start hour
  const getTimeSlots = () => {
    if (timeFormat === "24h-custom") {
      // Generate 24 slots starting from customStartHour
      return Array.from({ length: 24 }, (_, i) => (customStartHour + i) % 24);
    }
    return timeSlots;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">TM Schedule Calendar</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage and monitor mixer schedules across all production lines
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
                  placeholder="Search mixers..."
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-white/[0.05]">
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

                {/* Mixer Filter */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Transit Mixer
                  </label>
                  <button
                    onClick={() => setIsMixerFilterOpen(!isMixerFilterOpen)}
                    className="w-full px-3 py-2 text-left border border-gray-200 dark:border-white/[0.05] rounded-lg bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    {selectedMixer === "all" ? "All Mixers" : selectedMixer}
                  </button>
                  {isMixerFilterOpen && (
                    <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-white/[0.05]">
                      <div className="p-2 text-gray-800 dark:text-white/90">
                        <button
                          className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                          onClick={() => {
                            setSelectedMixer("all");
                            setIsMixerFilterOpen(false);
                          }}
                        >
                          All Mixers
                        </button>
                        {mixers.map((mixer) => (
                          <button
                            key={mixer}
                            className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            onClick={() => {
                              setSelectedMixer(mixer);
                              setIsMixerFilterOpen(false);
                            }}
                          >
                            {mixer}
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
                    <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-white/[0.05]">
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

                {/* Time Format Filter */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Time Format</label>
                  <button
                    onClick={() => setIsTimeFormatOpen(!isTimeFormatOpen)}
                    className="w-full px-3 py-2 text-left border border-gray-200 dark:border-white/[0.05] rounded-lg bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    {timeFormat === "24h" ? "24-Hour Format" : timeFormat === "12h" ? "12-Hour Format" : "24h (Custom)"}
                  </button>
                  {isTimeFormatOpen && (
                    <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-white/[0.05]">
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
                  {/* Show custom start hour selector if 24h-custom is selected */}
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

        {/* Loading State */}
        <div className="flex items-center justify-center h-64 bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.05]">
          <div className="text-gray-500 dark:text-gray-400">Loading calendar data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="text-red-800 dark:text-red-200 font-medium">Error loading calendar data</div>
          <div className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</div>
          <button
            onClick={() => fetchGanttData(selectedDate)}
            className="mt-3 px-4 py-2 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 rounded-lg hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">TM Schedule Calendar</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Manage and monitor mixer schedules across all production lines
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
                    placeholder="Search mixers..."
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                      <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-white/[0.05]">
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

                  {/* Mixer Filter */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Transit Mixer
                    </label>
                    <button
                      onClick={() => setIsMixerFilterOpen(!isMixerFilterOpen)}
                      className="w-full px-3 py-2 text-left border border-gray-200 dark:border-white/[0.05] rounded-lg bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      {selectedMixer === "all" ? "All Mixers" : selectedMixer}
                    </button>
                    {isMixerFilterOpen && (
                      <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-white/[0.05]">
                        <div className="p-2 text-gray-800 dark:text-white/90">
                          <button
                            className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            onClick={() => {
                              setSelectedMixer("all");
                              setIsMixerFilterOpen(false);
                            }}
                          >
                            All Mixers
                          </button>
                          {mixers.map((mixer) => (
                            <button
                              key={mixer}
                              className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                              onClick={() => {
                                setSelectedMixer(mixer);
                                setIsMixerFilterOpen(false);
                              }}
                            >
                              {mixer}
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
                      <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-white/[0.05]">
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
                      <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-white/[0.05]">
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
                    {/* Show custom start hour selector if 24h-custom is selected */}
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
                  <div className="w-24 px-5 py-3 font-medium text-gray-500 text-xs dark:text-gray-400 border-r border-gray-300 dark:border-white/[0.05]">
                    Mixer ID
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
                      No mixers found for the selected criteria
                    </div>
                  ) : (
                    filteredData.map((mixer, idx) => {
                      // Group tasks by client for this mixer
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
                      mixer.tasks.forEach((task) => {
                        if (!clientTaskMap[task.id]) {
                          const start = timeStringToHour(task.actualStart);
                          const end = timeStringToHour(task.actualEnd);
                          clientTaskMap[task.id] = {
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
                            timeStringToHour(task.actualStart) < timeStringToHour(clientTaskMap[task.id].actualStart)
                          ) {
                            clientTaskMap[task.id].actualStart = task.actualStart;
                          }
                          if (timeStringToHour(task.actualEnd) > timeStringToHour(clientTaskMap[task.id].actualEnd)) {
                            clientTaskMap[task.id].actualEnd = task.actualEnd;
                          }
                          const start = clientTaskMap[task.id].actualStart;
                          const end = clientTaskMap[task.id].actualEnd;
                          clientTaskMap[task.id].start = timeStringToHour(start);
                          clientTaskMap[task.id].end = timeStringToHour(end);
                          clientTaskMap[task.id].duration = calculateDuration(start, end);
                        }
                      });
                      const clientTasks = Object.values(clientTaskMap);

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

                      // --- Calculate Free Time ---
                      // 1. Collect all busy intervals for this mixer in the current window
                      const busyIntervals: { start: number; end: number }[] = clientTasks
                        .map((ct) => {
                          // Clamp to window
                          let s = ct.start;
                          let e = ct.end;
                          if (windowStart < windowEnd) {
                            s = Math.max(ct.start, windowStart);
                            e = Math.min(ct.end, windowEnd + 1);
                            if (e <= s) return null;
                          } else {
                            // Wraps around midnight
                            if (ct.start < windowStart && ct.end <= windowStart) {
                              // Early part
                              s = ct.start;
                              e = Math.min(ct.end, windowEnd + 1);
                              if (e <= s) return null;
                            } else if (ct.start >= windowStart) {
                              // Late part
                              s = Math.max(ct.start, windowStart);
                              e = ct.end;
                              if (e <= s) return null;
                            } else {
                              // Spans wrap
                              s = ct.start;
                              e = ct.end;
                            }
                          }
                          return { start: s, end: e };
                        })
                        .filter(Boolean) as { start: number; end: number }[];
                      // 2. Merge overlapping intervals
                      busyIntervals.sort((a, b) => a.start - b.start);
                      const merged: { start: number; end: number }[] = [];
                      for (const interval of busyIntervals) {
                        if (!merged.length || merged[merged.length - 1].end < interval.start) {
                          merged.push({ ...interval });
                        } else {
                          merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, interval.end);
                        }
                      }
                      // 3. Calculate free time
                      let freeTime = 24;
                      clientTasks.forEach((task) => (freeTime -= task.duration / 60));
                      freeTime = Math.round(freeTime);

                      return (
                        <div
                          key={mixer.id}
                          className="flex hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                        >
                          {/* Serial Number */}
                          <div className="w-10 px-2 py-1 text-gray-700 text-xs dark:text-white/90 border-r border-gray-300 dark:border-white/[0.05] flex items-center justify-center">
                            {idx + 1}
                          </div>
                          {/* Mixer Name */}
                          <div className="w-24 px-5 py-1 text-gray-700 text-xs dark:text-white/90 border-r border-gray-300 dark:border-white/[0.05] flex items-center">
                            {mixer.name.length > 7 ? ".." + mixer.name.slice(-7) : mixer.name}
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
                                  content={`Mixer: ${mixer.name}\nClient: ${ct.client}\n${ct.actualStart} to ${ct.actualEnd}\nDuration: ${ct.duration}m`}
                                >
                                  <div
                                    className={`absolute top-1 h-4 rounded ${ct.color} opacity-80 hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center z-5`}
                                    style={{
                                      left: `${offset * 40 + 1}px`,
                                      width: `${width * 40 - 1}px`,
                                      zIndex: 10,
                                    }}
                                  >
                                    <span className="text-white text-xs ">{ct.duration} mins</span>
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
                          </div>
                          {/* Free Time */}
                          <div className="w-14 px-2 py-1 text-gray-700 text-xs dark:text-white/90 border-l border-gray-300 dark:border-white/[0.05] flex items-center justify-center">
                            {freeTime}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          {clientLegend.length > 0 && (
            <div className="mt-6 bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.05] p-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Clients</h3>
              <div className="flex flex-wrap gap-4">
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
                        <div>
                          Total Scheduled: <span className="font-medium">{stats ? timeString : "0m"}</span>
                        </div>
                        <div>
                          Mixers Used: <span className="font-medium">{stats ? stats.mixers.size : 0}</span>
                        </div>
                        <div>
                          Schedules: <span className="font-medium">{stats ? stats.schedules : 0}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

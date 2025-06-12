"use client";

import React, { useState } from "react";
import { Search, Filter, ChevronLeft, ChevronRight, Calendar } from "lucide-react";

// Types for better type safety and backend integration
type Task = {
  id: string;
  start: number;
  duration: number;
  color: string;
  client: string;
  type: string;
};

type Mixer = {
  id: string;
  name: string;
  plant: string;
  client: string | null;
  tasks: Task[];
};

// Sample data with client information
const initialGanttData: Mixer[] = [
  {
    id: "1",
    name: "Mixer 1",
    plant: "Plant A",
    client: "ABC Construction",
    tasks: [{ 
      id: "task-1",
      start: 6, 
      duration: 3, 
      color: "bg-orange-500", 
      client: "ABC Construction",
      type: "production"
    }],
  },
  {
    id: "3",
    name: "Mixer 3",
    plant: "Plant B",
    client: "XYZ Builders",
    tasks: [{ 
      id: "task-3",
      start: 9, 
      duration: 4, 
      color: "bg-orange-500", 
      client: "XYZ Builders",
      type: "production"
    }],
  },
  {
    id: "4",
    name: "Mixer 4",
    plant: "Plant A",
    client: "City Projects",
    tasks: [{ 
      id: "task-4",
      start: 15, 
      duration: 3, 
      color: "bg-orange-500", 
      client: "City Projects",
      type: "production"
    }],
  },
  {
    id: "5",
    name: "Mixer 5",
    plant: "Plant C",
    client: null,
    tasks: [],
  },
  {
    id: "6",
    name: "Mixer 6",
    plant: "Plant B",
    client: "Metro Construction",
    tasks: [{ 
      id: "task-6",
      start: 13, 
      duration: 2, 
      color: "bg-orange-500", 
      client: "Metro Construction",
      type: "production"
    }],
  },
  {
    id: "7",
    name: "Mixer 7",
    plant: "Plant A",
    client: "Highway Builders",
    tasks: [{ 
      id: "task-7",
      start: 6, 
      duration: 1, 
      color: "bg-blue-500", 
      client: "Highway Builders",
      type: "cleaning"
    }],
  },
  {
    id: "8",
    name: "Mixer 8",
    plant: "Plant C",
    client: null,
    tasks: [],
  },
  {
    id: "9",
    name: "Mixer 9",
    plant: "Plant B",
    client: "Skyline Projects",
    tasks: [{ 
      id: "task-9",
      start: 7, 
      duration: 2, 
      color: "bg-blue-500", 
      client: "Skyline Projects",
      type: "cleaning"
    }],
  },
  {
    id: "10",
    name: "Mixer 10",
    plant: "Plant A",
    client: "Urban Developers",
    tasks: [{ 
      id: "task-10",
      start: 9, 
      duration: 4, 
      color: "bg-yellow-600", 
      client: "Urban Developers",
      type: "setup"
    }],
  },
  {
    id: "11",
    name: "Mixer 11",
    plant: "Plant B",
    client: "Coastal Construction",
    tasks: [{ 
      id: "task-11",
      start: 15, 
      duration: 3, 
      color: "bg-green-500", 
      client: "Coastal Construction",
      type: "quality"
    }],
  },
  {
    id: "12",
    name: "Mixer 12",
    plant: "Plant C",
    client: null,
    tasks: [],
  },
  {
    id: "13",
    name: "Mixer 13",
    plant: "Plant A",
    client: "Bridge Builders",
    tasks: [{ 
      id: "task-13",
      start: 13, 
      duration: 2, 
      color: "bg-pink-500", 
      client: "Bridge Builders",
      type: "maintenance"
    }],
  },
  {
    id: "14",
    name: "Mixer 14",
    plant: "Plant B",
    client: "Tunnel Projects",
    tasks: [{ 
      id: "task-14",
      start: 7, 
      duration: 2, 
      color: "bg-yellow-600", 
      client: "Tunnel Projects",
      type: "setup"
    }],
  },
  {
    id: "15",
    name: "Mixer 15",
    plant: "Plant C",
    client: null,
    tasks: [],
  },
];

// Client color mapping for consistent colors
const clientColors: Record<string, string> = {
  "ABC Construction": "bg-orange-500",
  "XYZ Builders": "bg-orange-500",
  "City Projects": "bg-orange-500",
  "Metro Construction": "bg-orange-500",
  "Highway Builders": "bg-blue-500",
  "Skyline Projects": "bg-blue-500",
  "Urban Developers": "bg-yellow-600",
  "Coastal Construction": "bg-green-500",
  "Bridge Builders": "bg-pink-500",
  "Tunnel Projects": "bg-yellow-600",
};

const timeSlots = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

export default function CalendarContainer() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState("all");
  const [selectedMixer, setSelectedMixer] = useState("all");
  const [selectedClient, setSelectedClient] = useState("all");
  const [timeFormat, setTimeFormat] = useState("24h");
  const [ganttData] = useState<Mixer[]>(initialGanttData);
  
  // Dropdown states
  const [isPlantFilterOpen, setIsPlantFilterOpen] = useState(false);
  const [isMixerFilterOpen, setIsMixerFilterOpen] = useState(false);
  const [isClientFilterOpen, setIsClientFilterOpen] = useState(false);
  const [isTimeFormatOpen, setIsTimeFormatOpen] = useState(false);

  // Filter data based on search term and selected filters
  const filteredData = ganttData.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlant = selectedPlant === "all" || item.plant === selectedPlant;
    const matchesMixer = selectedMixer === "all" || item.name === selectedMixer;
    const matchesClient = selectedClient === "all" || item.client === selectedClient;

    return matchesSearch && matchesPlant && matchesMixer && matchesClient;
  });

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (hour: number) => {
    if (timeFormat === "12h") {
      const period = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:00 ${period}`;
    }
    return `${String(hour).padStart(2, "0")}:00`;
  };

  const navigateDate = (direction: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + direction);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Get unique values for filter options
  const plants = Array.from(new Set(ganttData.map((item) => item.plant)));
  const mixers = Array.from(new Set(ganttData.map((item) => item.name)));
  const clients = Array.from(
    new Set(ganttData.map((item) => item.client).filter((client): client is string => client !== null))
  );

  // Get unique clients with their colors for the legend
  const clientLegend = Array.from(
    new Set(
      ganttData
        .flatMap((mixer) => mixer.tasks)
        .map((task) => ({ name: task.client, color: clientColors[task.client] }))
    )
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Production Schedule</h2>
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

              {/* Right side - Date Navigation */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigateDate(-1)}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.05] rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.08] transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Yesterday
                </button>

                <button
                  onClick={goToToday}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.05] rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.08] transition-colors"
                >
                  <Calendar className="h-4 w-4" />
                  Today
                </button>

                <button
                  onClick={() => navigateDate(1)}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.05] rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.08] transition-colors"
                >
                  Tomorrow
                  <ChevronRight className="h-4 w-4" />
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

                  {/* Mixer Filter */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Transit Mixer</label>
                    <button
                      onClick={() => setIsMixerFilterOpen(!isMixerFilterOpen)}
                      className="w-full px-3 py-2 text-left border border-gray-200 dark:border-white/[0.05] rounded-lg bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      {selectedMixer === "all" ? "All Mixers" : selectedMixer}
                    </button>
                    {isMixerFilterOpen && (
                      <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-white/[0.05]">
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

                  {/* Time Format Filter */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Time Format</label>
                    <button
                      onClick={() => setIsTimeFormatOpen(!isTimeFormatOpen)}
                      className="w-full px-3 py-2 text-left border border-gray-200 dark:border-white/[0.05] rounded-lg bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      {timeFormat === "24h" ? "24-Hour Format" : "12-Hour Format"}
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
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Date Display */}
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{formatDate(selectedDate)}</h2>
          </div>

          {/* Gantt Chart */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <div className="min-w-[1000px]">
                {/* Time Header */}
                <div className="flex border-b border-gray-300 dark:border-white/[0.05]">
                  <div className="w-32 px-5 py-3 font-medium text-gray-500 text-xs dark:text-gray-400 border-r border-gray-300 dark:border-white/[0.05]">
                    Mixer ID
                  </div>
                  {timeSlots.map((time) => (
                    <div
                      key={time}
                      className="w-20 px-2 py-3 text-center font-medium text-gray-500 text-xs dark:text-gray-400 border-r border-gray-300 dark:border-white/[0.05]"
                    >
                      {formatTime(time)}
                    </div>
                  ))}
                </div>

                {/* Gantt Rows */}
                <div className="divide-y divide-gray-400 dark:divide-white/[0.05]">
                  {filteredData.map((mixer) => (
                    <div key={mixer.id} className="flex hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                      {/* Mixer Name */}
                      <div className="w-32 px-5 py-1 text-gray-700 text-sm dark:text-white/90 border-r border-gray-300 dark:border-white/[0.05] flex items-center">
                        {mixer.name}
                      </div>

                      {/* Time Slots */}
                      <div className="flex-1 flex relative">
                        {timeSlots.map((time) => (
                          <div
                            key={time}
                            className="w-20 h-6 border-r border-gray-300 dark:border-white/[0.05] relative"
                          >
                            {/* Render tasks that start at this time slot */}
                            {mixer.tasks
                              .filter((task) => task.start === time)
                              .map((task) => (
                                <div
                                  key={task.id}
                                  className={`absolute top-1 left-1 h-5 rounded ${task.color} opacity-80 hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center`}
                                  style={{
                                    width: `${task.duration * 80 - 8}px`,
                                    zIndex: 10,
                                  }}
                                  title={`${mixer.name} - ${task.client} - ${task.duration}h task`}
                                >
                                  <span className="text-white text-xs font-medium">{task.duration}h</span>
                                </div>
                              ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.05] p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Clients</h3>
            <div className="flex flex-wrap gap-4">
              {clientLegend.map(({ name, color }) => (
                <div key={name} className="flex items-center gap-2">
                  <div className={`w-4 h-4 ${color} rounded`}></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/button/Button";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import Input from "@/components/form/input/InputField";
import DatePickerInput from "@/components/form/input/DatePickerInput";
import { ArrowLeft, ArrowRight, Clock, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useApiClient } from "@/hooks/useApiClient";
import { useQuery } from "@tanstack/react-query";
// removed unused table and badge imports
import { useRouter } from "next/navigation";
import TimeInput from "@/components/form/input/TimeInput";
import { useProfile } from "@/hooks/useProfile";

interface Client {
  contact_phone: number;
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface Project {
  _id: string;
  name: string;
  client_id: string;
  address: string;
  contact_name: string;
  contact_number: string;
  mother_plant_id: string;
  coordinates: string;
}

interface AvailableTM {
  id: string;
  identifier: string;
  capacity: number;
  availability: boolean;
  plant_id: string;
  plant_name: string;
}

interface CalculateTMResponse {
  tm_count: number;
  schedule_id: string;
  required_tms: number;
  total_trips: number;
  trips_per_tm: number;
  cycle_time: number;
  available_tms: AvailableTM[];
}

// removed unused GeneratedSchedule interface

const steps = [
  { id: 1, name: "Schedule Details" },
  { id: 2, name: "TM Selection" },
];

export default function NewSupplyScheduleForm({ schedule_id }: { schedule_id?: string }) {
  const { profile } = useProfile();
  const router = useRouter();
  const { fetchWithAuth } = useApiClient();
  const [step, setStep] = useState(schedule_id ? 2 : 1);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [tmSequence, setTMSequence] = useState<string[]>([]);
  const [calculatedTMs, setCalculatedTMs] = useState<CalculateTMResponse | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);
  const [formData, setFormData] = useState({
    scheduleDate: "",
    startTime: "",
    quantity: "",
    speed: "",
    unloadingTime: "",
    onwardTime: "",
    returnTime: "",
    bufferTime: "",
    loadTime: "",
    concreteGrade: "",
  });

  const [fleetOptions, setFleetOptions] = useState({
    tripsNeeded: 0,
    useRoundTrip: true,
    vehicleCount: 1,
  });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [formDataRetrieved, setFormDataRetrieved] = useState(true);
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [openPlantGroups, setOpenPlantGroups] = useState<Record<string, boolean>>({});

  const [selectedProject, setSelectedProject] = useState<string>("");
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  const { data: clientsData } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: async () => {
      const response = await fetchWithAuth("/clients/");
      const data = await response.json();
      if (data.success) {
        return data.data;
      }
      return [];
    },
  });

  const { data: plantsData } = useQuery<{ _id: string; name: string }[]>({
    queryKey: ["plants"],
    queryFn: async () => {
      const response = await fetchWithAuth("/plants");
      const data = await response.json();
      if (data.success) {
        return data.data;
      }
      return [];
    },
  });

  const { data: avgTMCapData } = useQuery<{ average_capacity: number }>({
    queryKey: ["average-tm-capacity"],
    queryFn: async () => {
      const response = await fetchWithAuth("/tms/average-capacity");
      const data = await response.json();
      if (data.success && data.data && typeof data.data.average_capacity === "number") {
        return { average_capacity: data.data.average_capacity };
      }
      throw new Error("Failed to fetch average TM capacity");
    },
  });
  const avgTMCap = avgTMCapData?.average_capacity ?? null;

  // Calculate default trips needed when quantity or average capacity changes
  useEffect(() => {
    if (avgTMCap && formData.quantity) {
      const quantity = parseFloat(formData.quantity) || 0;
      const defaultTrips = Math.ceil(quantity / avgTMCap);
      setFleetOptions((prev) => ({
        ...prev,
        tripsNeeded: defaultTrips,
      }));
      setHasChanged(true);
    }
  }, [avgTMCap, formData.quantity]);

  const queryProjects = useQuery<Project[]>({
    queryKey: ["projects", selectedClient],
    queryFn: async () => {
      if (!selectedClient) return [];
      const response = await fetchWithAuth("/projects/");
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        return data.data.filter((p: Project) => p.client_id === selectedClient);
      }
      return [];
    },
    enabled: !!selectedClient,
  });
  const projects: Project[] = queryProjects.data ?? [];

  const fetchSchedule = useCallback(async () => {
    try {
      const response = await fetchWithAuth(`/schedules/${schedule_id}`);
      const data = await response.json();
      if (data.success) {
        setSelectedClient(data.data.client_id);
        setSelectedProject(data.data.project_id);
        setFormData({
          scheduleDate: data.data.input_params.schedule_date,
          startTime: data.data.input_params.pump_start.split("T")[1],
          quantity: data.data.input_params.quantity.toString(),
          speed: "",
          unloadingTime: data.data.input_params.unloading_time?.toString() || "",
          onwardTime: data.data.input_params.onward_time.toString(),
          returnTime: data.data.input_params.return_time.toString(),
          bufferTime: data.data.input_params.buffer_time.toString(),
          loadTime: data?.data?.input_params?.load_time.toString() || "",
          concreteGrade: data.data.concreteGrade,
        });
        setFleetOptions({
          tripsNeeded: data?.data?.trip_count || 0,
          useRoundTrip: data?.data?.is_round_trip || false,
          vehicleCount: data?.data?.is_round_trip ? 1 : data?.data?.tm_count,
        });
        const tm_ids = new Set();
        const tmSequence: string[] = [];
        if (Array.isArray(data?.data?.output_table)) {
          data.data.output_table.forEach((trip: { tm_id: string }) => {
            if (!tm_ids.has(trip.tm_id)) {
              tmSequence.push(trip.tm_id);
            }
            tm_ids.add(trip.tm_id);
          });
        }
        setTMSequence(tmSequence);
        const tm_suggestions = {
          tm_count: data?.data?.tm_count,
          schedule_id: data?.data?._id,
          required_tms: data?.data?.required_tms,
          total_trips: data?.data?.total_trips,
          trips_per_tm: data?.data?.trips_per_tm,
          cycle_time: data?.data?.cycle_time,
          available_tms: data?.data?.available_tms,
        };
        setCalculatedTMs(tm_suggestions || null);
        return true;
      }
      return false;
    } catch (error) {
      setFormDataRetrieved(false);
      console.error("Error fetching schedule:", error);
      return false;
    }
  }, [fetchWithAuth, schedule_id]);

  const updateSchedule = async () => {
    if (!schedule_id) return false;
    try {
      const response = await fetchWithAuth(`/schedules/${schedule_id}`, {
        method: "PUT",
        body: JSON.stringify({
          client_id: selectedClient,
          project_id: selectedProject,
          concreteGrade: formData.concreteGrade,
          type: "supply",
          input_params: {
            quantity: parseFloat(formData.quantity),
            unloading_time: Math.round(parseFloat(formData.unloadingTime)),
            onward_time: parseFloat(formData.onwardTime),
            return_time: parseFloat(formData.returnTime),
            buffer_time: parseFloat(formData.bufferTime),
            load_time: parseFloat(formData.loadTime),
            pump_start: `${formData.scheduleDate}T${formData.startTime}`,
            schedule_date: formData.scheduleDate,
          },
          site_address: selectedProject ? projects.find((p) => p._id === selectedProject)?.address || "" : "",
          tm_count: fleetOptions.useRoundTrip ? 1 : fleetOptions.vehicleCount,
          trip_count: fleetOptions.tripsNeeded,
          is_round_trip: fleetOptions.useRoundTrip,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setHasChanged(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error updating schedule:", error);
      return false;
    }
  };

  useEffect(() => {
    if (schedule_id && clientsData) {
      fetchSchedule();
    }
  }, [schedule_id, clientsData, fetchSchedule]);

  useEffect(() => {
    setIsDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setHasChanged(true);
  };

  const handleTimeChange = (name: string, value: string | null) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value || "",
    }));
    setHasChanged(true);
  };

  const calculateRequiredTMs = async () => {
    if (!hasChanged) return true;
    if (
      !selectedClient ||
      !formData.scheduleDate ||
      !formData.startTime ||
      !formData.quantity ||
      !formData.unloadingTime ||
      !formData.onwardTime ||
      !formData.returnTime ||
      !formData.bufferTime ||
      !formData.loadTime
    ) {
      return false;
    }
    if (!schedule_id) {
      setIsCalculating(true);
      try {
        const response = await fetchWithAuth("/schedules", {
          method: "POST",
          body: JSON.stringify({
            client_id: selectedClient,
            project_id: selectedProject,
            concreteGrade: formData.concreteGrade,
            type: "supply",
            input_params: {
              quantity: parseFloat(formData.quantity),
              unloading_time: Math.round(parseFloat(formData.unloadingTime)),
              onward_time: parseFloat(formData.onwardTime),
              return_time: parseFloat(formData.returnTime),
              buffer_time: parseFloat(formData.bufferTime),
              load_time: parseFloat(formData.loadTime),
              pump_start: `${formData.scheduleDate}T${formData.startTime}`,
              schedule_date: formData.scheduleDate,
            },
            site_address: selectedProject ? projects.find((p) => p._id === selectedProject)?.address || "" : "",
            tm_count: fleetOptions.useRoundTrip ? 1 : fleetOptions.vehicleCount,
            trip_count: fleetOptions.tripsNeeded,
            is_round_trip: fleetOptions.useRoundTrip,
          }),
        });

        const data = await response.json();
        if (data.success) {
          setCalculatedTMs(data?.data);
          if (!schedule_id) router.push(`/supply-schedules/${data?.data?._id}`);
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error calculating TMs:", error);
        return false;
      } finally {
        setIsCalculating(false);
      }
    }
    if (schedule_id && clientsData) {
      if (hasChanged) {
        return updateSchedule();
      }
      return fetchSchedule();
    }
  };

  const generateSchedule = async () => {
    if (!calculatedTMs?.schedule_id || tmSequence.length === 0) {
      return false;
    }

    setIsGenerating(true);
    try {
      const response = await fetchWithAuth(`/schedules/${calculatedTMs.schedule_id}/generate-schedule`, {
        method: "POST",
        body: JSON.stringify({ selected_tms: tmSequence, type: "supply" }),
      });

      const data = await response.json();
      if (data.success) {
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error generating schedule:", error);
      return false;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNext = async () => {
    if (step === 1) {
      const success = await calculateRequiredTMs();
      if (success) {
        setStep(step + 1);
      }
    } else if (step === 2) {
      const success = await generateSchedule();
      if (success) {
        // Redirect to view page instead of going to step 3
        router.push(`/supply-schedules/${calculatedTMs?.schedule_id}/view`);
      }
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  // removed unused handleSubmit

  const progressPercentage = ((step - 1) / (steps.length - 1)) * 100;

  const isStep1FormValid = () => {
    return (
      !!selectedClient &&
      !!selectedProject &&
      !!formData.scheduleDate &&
      !!formData.startTime &&
      !!formData.quantity &&
      !!formData.concreteGrade &&
      !!formData.onwardTime &&
      !!formData.returnTime &&
      !!formData.bufferTime &&
      !!formData.loadTime &&
      !!formData.unloadingTime
    );
  };

  if (formDataRetrieved === false) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          <p className="text-sm">
            Error retrieving schedule data. Please ensure the schedule ID is correct or try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mx">
      <div className="flex flex-row w-full mb-4 items-center">
        <div className="w-1/3">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">New Supply Schedule</h2>
          <p className="text-gray-500 dark:text-gray-400">Step {step} of 2</p>
        </div>
        <div className="w-full">
          <div className="relative">
            {/* Background Bar */}
            <div className="absolute top-3 left-0 right-3 h-0.5 bg-gray-300 dark:bg-gray-600 rounded-full" />

            {/* Animated Progress Bar */}
            <motion.div
              className="absolute top-3 left-0 h-0.5 bg-brand-500 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            />

            {/* Steps */}
            <div className="relative flex justify-between">
              {steps.map((s, index) => (
                <motion.div
                  key={s.id}
                  className={`flex flex-col ${index == 0 ? "items-start" : index == 1 ? "items-end" : "items-center"}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                >
                  {/* Step Circle */}
                  <motion.div
                    className={`flex items-center justify-center w-6 h-6 rounded-full border-2 relative z-5 ${
                      step >= s.id
                        ? "border-brand-500 bg-brand-500 text-white shadow-lg"
                        : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                    }`}
                    animate={{
                      scale: step === s.id ? 1.1 : 1,
                      boxShadow: step === s.id ? "0 0 20px rgba(var(--brand-500-rgb, 59, 130, 246), 0.5)" : "none",
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {step > s.id ? (
                      <motion.div
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.2, duration: 0.4, type: "spring" }}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                      </motion.div>
                    ) : (
                      <motion.span
                        className="text-xs font-medium"
                        animate={{
                          color: step >= s.id ? "#ffffff" : isDarkMode ? "#9ca3af" : "#6b7280",
                        }}
                      >
                        {s.id}
                      </motion.span>
                    )}
                  </motion.div>

                  {/* Step Name */}
                  <motion.span
                    className={`mt-2 text-xs text-center ${
                      step >= s.id ? "text-brand-500 font-medium" : "text-gray-500 dark:text-gray-400"
                    }`}
                    animate={{
                      fontWeight: step >= s.id ? 500 : 400,
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {s.name}
                  </motion.span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        {step === 1 ? (
          <div className="space-y-4">
            {/* Schedule Details Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-white dark:bg-gray-900/30">
              <div className="flex justify-between items-center mb-4 w-full">
                <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-4">Schedule Details</h3>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 bg-blue-100 dark:bg-blue-900/40 py-1 px-3 rounded-full">
                  Company Timings -
                  {profile?.preferred_format === "12h"
                    ? ` ${(profile?.custom_start_hour ?? 0) % 12 || 12}:00 ${
                        (profile?.custom_start_hour ?? 0) < 12 ? "AM" : "PM"
                      } CURRENT DAY TO ${((profile?.custom_start_hour ?? 0) + 12) % 12 || 12}:00 ${
                        (profile?.custom_start_hour ?? 0) + 12 < 24 ? "PM" : "AM"
                      } NEXT DAY`
                    : ` ${String(profile?.custom_start_hour ?? 0).padStart(2, "0")}:00 TODAY TO ${String(
                        ((profile?.custom_start_hour ?? 0) + 12) % 24
                      ).padStart(2, "0")}:00 TOMORROW`}
                </span>
              </div>

              {/* Summary Row: Schedule No., Current Date, Current Time */}
              <div className="grid grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Schedule No.
                  </label>
                  <div className="h-11 flex items-center px-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white/90 cursor-not-allowed">
                    {selectedClient && selectedProject && formData.scheduleDate
                      ? "Auto-generated"
                      : "Select Project and Schedule Date first"}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Current Date
                  </label>
                  <div className="h-11 flex items-center px-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white/90 cursor-not-allowed">
                    {new Date().toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Current Time
                  </label>
                  <div className="h-11 flex items-center px-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white/90 cursor-not-allowed">
                    {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-6">
                {/* Client Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Choose Client
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      className={`h-11 w-full appearance-none rounded-lg border border-gray-300 px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 text-left ${
                        selectedClient ? "text-gray-800 dark:text-white/90" : "text-gray-400 dark:text-gray-400"
                      }`}
                      onClick={() => setIsClientDropdownOpen((open) => !open)}
                    >
                      {clientsData?.find((c: Client) => c._id === selectedClient)?.name || "Select a client"}
                    </button>
                    <Dropdown
                      isOpen={isClientDropdownOpen}
                      onClose={() => setIsClientDropdownOpen(false)}
                      className="w-full mt-1"
                    >
                      <DropdownItem
                        className="text-gray-400 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => {
                          setSelectedClient("");
                          setHasChanged(true);
                          setIsClientDropdownOpen(false);
                        }}
                      >
                        Select a client
                      </DropdownItem>
                      {(clientsData || []).map((option: Client) => (
                        <DropdownItem
                          key={option._id}
                          className="text-gray-800 dark:text-white/90 hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => {
                            setSelectedClient(option._id);
                            setHasChanged(true);
                            setIsClientDropdownOpen(false);
                          }}
                        >
                          {option.name}
                        </DropdownItem>
                      ))}
                    </Dropdown>
                  </div>
                </div>

                {/* Project Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Choose Project
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      className={`h-11 w-full appearance-none rounded-lg border border-gray-300 px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 text-left ${
                        selectedProject
                          ? "text-gray-800 dark:text-white/90"
                          : projects.length === 0 && !!selectedClient
                          ? "text-red-500"
                          : "text-gray-400 dark:text-gray-400"
                      }`}
                      onClick={() => setIsProjectDropdownOpen((open) => !open)}
                      disabled={!selectedClient || projects.length === 0}
                    >
                      {!selectedClient
                        ? "Select a client first"
                        : projects.length === 0
                        ? "Please create a project for this client."
                        : projects.find((p: Project) => p._id === selectedProject)?.name || "Select a project"}
                    </button>
                    <Dropdown
                      isOpen={isProjectDropdownOpen}
                      onClose={() => setIsProjectDropdownOpen(false)}
                      className="w-full mt-1"
                    >
                      {projects.length === 0 ? (
                        <DropdownItem
                          className="text-red-500 dark:text-red-400 cursor-not-allowed"
                          onClick={() => setIsProjectDropdownOpen(false)}
                        >
                          No projects found. Please create a project for this client.
                        </DropdownItem>
                      ) : (
                        <>
                          <DropdownItem
                            className="text-gray-400 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => {
                              setSelectedProject("");
                              setHasChanged(true);
                              setIsProjectDropdownOpen(false);
                            }}
                          >
                            Select a project
                          </DropdownItem>
                          {(projects || []).map((option: Project) => (
                            <DropdownItem
                              key={option._id}
                              className="text-gray-800 dark:text-white/90 hover:bg-gray-100 dark:hover:bg-gray-700"
                              onClick={() => {
                                setSelectedProject(option._id);
                                setHasChanged(true);
                                setIsProjectDropdownOpen(false);
                              }}
                            >
                              {option.name}
                            </DropdownItem>
                          ))}
                        </>
                      )}
                    </Dropdown>
                  </div>
                </div>

                {/* Project Details */}
                <div className="flex gap-4 w-full">
                  {selectedProject && projects.find((p) => p._id === selectedProject) && (
                    <div className="w-full flex flex-col justify-start">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Project Details
                      </label>
                      <p className="text-sm text-gray-600 dark:text-gray-600">
                        <span
                          title={
                            (projects.find((p) => p._id === selectedProject)?.contact_name || "") +
                            " - " +
                            (projects.find((p) => p._id === selectedProject)?.contact_number || "")
                          }
                        >
                          {(() => {
                            const contactName = projects.find((p) => p._id === selectedProject)?.contact_name || "";
                            const contactNumber = projects.find((p) => p._id === selectedProject)?.contact_number || "";
                            const displayName =
                              contactName.length > 15 ? contactName.slice(0, 15) + "..." : contactName;
                            const displayNumber =
                              contactNumber.length > 15 ? contactNumber.slice(0, 15) + "..." : contactNumber;
                            return `${displayName} - ${displayNumber}`;
                          })()}
                        </span>
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-600">
                        {projects.find((p) => p._id === selectedProject)?.address}
                      </p>
                    </div>
                  )}
                </div>

                {/* Grade of Concrete */}
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">RMC Grade</label>
                  <div className="flex items-center w-full">
                    <span className="w-6 text-gray-700 dark:text-gray-300 font-medium">M</span>
                    <Input
                      type="number"
                      name="concreteGrade"
                      value={parseFloat(formData.concreteGrade)}
                      onChange={handleInputChange}
                      placeholder="Enter RMC grade"
                      className="flex-1 min-w-full"
                    />
                  </div>
                </div>

                {/* Supply Quantity */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Supply Quantity (m³)
                  </label>
                  <Input
                    type="number"
                    name="quantity"
                    value={parseFloat(formData.quantity)}
                    onChange={handleInputChange}
                    placeholder="Enter quantity"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 mt-6">
                {/* Schedule Date */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Schedule Date
                  </label>
                  <DatePickerInput
                    value={formData.scheduleDate}
                    onChange={(date) => {
                      setFormData((prev) => ({
                        ...prev,
                        scheduleDate: date,
                      }));
                      setHasChanged(true);
                    }}
                    placeholder="Select a date"
                  />
                </div>

                {/* Site Reach Time */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Supply Start Time ({profile?.preferred_format})
                  </label>
                  <div className="relative">
                    <TimeInput
                      type="time"
                      name="startTime"
                      format={profile?.preferred_format === "12h" ? "h:mm a" : "hh:mm"}
                      isOpen
                      value={formData.startTime}
                      onChange={(val) => handleTimeChange("startTime", val)}
                    />
                    <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                      <Clock className="size-5" />
                    </span>
                  </div>
                </div>

                {/* Mother Plant */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Mother Plant
                  </label>
                  <Input
                    type="text"
                    name="motherPlant"
                    value={
                      selectedProject && projects.find((p) => p._id === selectedProject)?.mother_plant_id
                        ? (plantsData || []).find(
                            (plant) => plant._id === projects.find((p) => p._id === selectedProject)?.mother_plant_id
                          )?.name || "Unknown Plant"
                        : ""
                    }
                    disabled
                    placeholder="Auto filled from project"
                  />
                </div>
              </div>
            </div>

            {/* Supply Details Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-white dark:bg-gray-900/30">
              <div className="flex justify-between items-center mb-4 w-full">
                <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-4 flex justify-between items-center">
                  Supply Details
                </h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Section: Input Controls */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Input Form Section */}
                  <div className="bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                    <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">
                      Cycle Time Parameters
                    </h3>

                    <div className="space-y-2.5">
                      {/* Buffer Time */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center min-w-0 flex-1">
                          <span
                            className="w-2.5 h-2.5 rounded-sm mr-2 flex-shrink-0"
                            style={{ backgroundColor: "#3b82f6" }}
                          ></span>
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-0">
                            Buffer Time (min)
                          </label>
                        </div>
                        <div className="w-20 flex-shrink-0">
                          <Input
                            type="number"
                            name="bufferTime"
                            value={parseFloat(formData.bufferTime)}
                            onChange={handleInputChange}
                            placeholder="0"
                            className="w-full text-right text-xs h-7"
                          />
                        </div>
                      </div>

                      {/* Load Time */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center min-w-0 flex-1">
                          <span
                            className="w-2.5 h-2.5 rounded-sm mr-2 flex-shrink-0"
                            style={{ backgroundColor: "#3b82f6" }}
                          ></span>
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-0">
                            Loading Time (min)
                          </label>
                        </div>
                        <div className="w-20 flex-shrink-0">
                          <Input
                            type="number"
                            name="loadTime"
                            value={parseFloat(formData.loadTime)}
                            onChange={handleInputChange}
                            placeholder="0"
                            className="w-full text-right text-xs h-7"
                          />
                        </div>
                      </div>

                      {/* Onward Time */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center min-w-0 flex-1">
                          <span
                            className="w-2.5 h-2.5 rounded-sm mr-2 flex-shrink-0"
                            style={{ backgroundColor: "#f59e0b" }}
                          ></span>
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-0">
                            Onward Time (min)
                          </label>
                        </div>
                        <div className="w-20 flex-shrink-0">
                          <Input
                            type="number"
                            name="onwardTime"
                            value={parseFloat(formData.onwardTime)}
                            onChange={handleInputChange}
                            placeholder="0"
                            className="w-full text-right text-xs h-7"
                          />
                        </div>
                      </div>

                      {/* TM Unloading Time */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center min-w-0 flex-1">
                          <span
                            className="w-2.5 h-2.5 rounded-sm mr-2 flex-shrink-0"
                            style={{ backgroundColor: "#10b981" }}
                          ></span>
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-0">
                            TM Unloading Time (min)
                          </label>
                        </div>
                        <div className="w-20 flex-shrink-0">
                          <Input
                            type="number"
                            name="unloadingTime"
                            value={parseFloat(formData.unloadingTime)}
                            onChange={handleInputChange}
                            placeholder="0"
                            className="w-full text-right text-xs h-7"
                          />
                        </div>
                      </div>

                      {/* Return Time */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center min-w-0 flex-1">
                          <span
                            className="w-2.5 h-2.5 rounded-sm mr-2 flex-shrink-0"
                            style={{ backgroundColor: "#8b5cf6" }}
                          ></span>
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-0">
                            Return Time (min)
                          </label>
                        </div>
                        <div className="w-20 flex-shrink-0">
                          <Input
                            type="number"
                            name="returnTime"
                            value={parseFloat(formData.returnTime)}
                            onChange={handleInputChange}
                            placeholder="0"
                            className="w-full text-right text-xs h-7"
                          />
                        </div>
                      </div>

                      {/* Total Cycle Time */}
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center min-w-0 flex-1">
                            <div className="w-2.5 h-2.5 mr-2 flex-shrink-0"></div>
                            <label className="text-xs font-semibold text-gray-800 dark:text-gray-200 min-w-0">
                              Total Cycle Time (min)
                            </label>
                          </div>
                          <div className="w-20 flex-shrink-0">
                            <Input
                              type="number"
                              value={[
                                formData.bufferTime,
                                formData.loadTime,
                                formData.onwardTime,
                                formData.unloadingTime,
                                formData.returnTime,
                              ]
                                .map((v) => parseFloat(v) || 0)
                                .reduce((a, b) => a + b, 0)}
                              disabled
                              className="bg-blue-50 dark:bg-blue-900/30 font-semibold w-full text-right border-blue-200 dark:border-blue-700 text-xs h-7"
                              placeholder="Auto-calculated"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Center Section: Donut Chart */}
                <div className="lg:col-span-4 flex items-center justify-center">
                  <div className="bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-xl p-6 w-full">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-6 text-center">
                      Cycle Time Breakdown
                    </h3>
                    <div className="flex justify-center">
                      {/* Custom SVG Donut Chart */}
                      <div className="relative w-fit">
                        <svg width={280} height={280} className="transform rotate-0">
                          {(() => {
                            const center = 280 / 2;
                            const radius = 280 * 0.5;
                            const innerRadius = radius * 0.6;
                            const data = [
                              {
                                label: "Buffer",
                                shortLabel: "Buffer",
                                value: parseFloat(formData.bufferTime) || 0,
                                color: "#3b82f6",
                              },
                              {
                                label: "Loading Time",
                                shortLabel: "Loading",
                                value: parseFloat(formData.loadTime) || 0,
                                color: "#ef4444",
                              },
                              {
                                label: "Onward Journey",
                                shortLabel: "Onward",
                                value: parseFloat(formData.onwardTime) || 0,
                                color: "#f59e0b",
                              },
                              {
                                label: "TM Unloading",
                                shortLabel: "Unload",
                                value: parseFloat(formData.unloadingTime) || 0,
                                color: "#10b981",
                              },
                              {
                                label: "Return Journey",
                                shortLabel: "Return",
                                value: parseFloat(formData.returnTime) || 0,
                                color: "#8b5cf6",
                              },
                            ];
                            const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
                            if (total === 0)
                              return (
                                <text key="no-data" x={center} y={center} textAnchor="middle" fill="#6b7280">
                                  No data
                                </text>
                              );

                            let currentAngle = -Math.PI / 2;
                            return data.map((item, index) => {
                              const safeVal = item.value || 0;
                              if (safeVal === 0) return null;
                              const percentage = (safeVal / total) * 100;
                              const angle = (safeVal / total) * 2 * Math.PI;
                              const startAngle = currentAngle;
                              const endAngle = currentAngle + angle;
                              const x1 = center + radius * Math.cos(startAngle);
                              const y1 = center + radius * Math.sin(startAngle);
                              const x2 = center + radius * Math.cos(endAngle);
                              const y2 = center + radius * Math.sin(endAngle);
                              const x3 = center + innerRadius * Math.cos(endAngle);
                              const y3 = center + innerRadius * Math.sin(endAngle);
                              const x4 = center + innerRadius * Math.cos(startAngle);
                              const y4 = center + innerRadius * Math.sin(startAngle);
                              const largeArcFlag = angle > Math.PI ? 1 : 0;
                              const pathData = [
                                `M ${x1} ${y1}`,
                                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                                `L ${x3} ${y3}`,
                                `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
                                "Z",
                              ].join(" ");
                              const labelAngle = startAngle + angle / 2;
                              const labelRadius = (radius + innerRadius) / 2;
                              const labelX = center + labelRadius * Math.cos(labelAngle);
                              const labelY = center + labelRadius * Math.sin(labelAngle);
                              currentAngle = endAngle;

                              return (
                                <g key={index}>
                                  <path
                                    d={pathData}
                                    fill={item.color}
                                    stroke="#ffffff"
                                    strokeWidth="2"
                                    className="hover:opacity-80 transition-opacity cursor-pointer"
                                  />
                                  {percentage > 8 && (
                                    <>
                                      <text
                                        x={labelX}
                                        y={labelY - 6}
                                        textAnchor="middle"
                                        fill="white"
                                        fontSize="12"
                                        className="pointer-events-none"
                                      >
                                        {safeVal}min
                                      </text>
                                      <text
                                        x={labelX}
                                        y={labelY + 8}
                                        textAnchor="middle"
                                        fill="white"
                                        fontSize="12"
                                        fontWeight="bold"
                                        className="pointer-events-none"
                                      >
                                        {item.shortLabel}
                                      </text>
                                    </>
                                  )}
                                </g>
                              );
                            });
                          })()}
                          {Number(formData.bufferTime) +
                            Number(formData.loadTime) +
                            Number(formData.onwardTime) +
                            Number(formData.unloadingTime) +
                            Number(formData.returnTime) >
                            0 && (
                            <>
                              <text
                                x={140}
                                y={132}
                                textAnchor="middle"
                                fill="#374151"
                                fontSize="16"
                                fontWeight="bold"
                                className="pointer-events-none"
                              >
                                Total
                              </text>
                              <text
                                x={140}
                                y={152}
                                textAnchor="middle"
                                fill="#374151"
                                fontSize="18"
                                fontWeight="bold"
                                className="pointer-events-none"
                              >
                                {[
                                  formData.bufferTime,
                                  formData.loadTime,
                                  formData.onwardTime,
                                  formData.unloadingTime,
                                  formData.returnTime,
                                ]
                                  .map((v) => Number(v) || 0)
                                  .reduce((a, b) => a + b, 0)}{" "}
                                min
                              </text>
                            </>
                          )}
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Section: Fleet Sizing + TM Trip Distribution (stacked) */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Fleet Sizing Section */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Fleet Sizing</h3>

                    <div className="space-y-4">
                      {/* Trips Needed Input */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-900 dark:text-white">
                          For this supply of {formData.quantity || 0} m³, how many trips are needed?
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            className="flex-1 h-8 px-3 rounded border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                            value={fleetOptions.tripsNeeded}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 1;
                              setFleetOptions((prev) => ({
                                ...prev,
                                tripsNeeded: Math.max(1, value),
                              }));
                              setHasChanged(true);
                            }}
                          />
                          {avgTMCap && (
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              (Suggested: {Math.ceil((parseFloat(formData.quantity) || 0) / avgTMCap)})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Round Trip vs Separate Vehicle Option */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-900 dark:text-white">
                          Do you want to use round trip or separate vehicle per trip?
                        </label>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              checked={fleetOptions.useRoundTrip}
                              onChange={() => {
                                setFleetOptions((prev) => ({ ...prev, useRoundTrip: true }));
                                setHasChanged(true);
                              }}
                              className="text-blue-600"
                            />
                            <span className="text-xs text-gray-900 dark:text-white">Round Trip</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              checked={!fleetOptions.useRoundTrip}
                              onChange={() => {
                                setFleetOptions((prev) => ({ ...prev, useRoundTrip: false }));
                                setHasChanged(true);
                              }}
                              className="text-blue-600"
                            />
                            <span className="text-xs text-gray-900 dark:text-white">Separate Vehicle</span>
                          </label>
                        </div>
                      </div>

                      {/* Vehicle Count Input (only show if round trip selected) */}
                      {!fleetOptions.useRoundTrip && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-gray-900 dark:text-white">
                            Number of vehicles to use:
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="w-6 h-6 bg-white/90 dark:bg-gray-700 rounded flex items-center justify-center text-sm font-bold hover:bg-white dark:hover:bg-gray-600 transition-colors"
                              onClick={() => {
                                if (fleetOptions.vehicleCount > 1) {
                                  setFleetOptions((prev) => ({
                                    ...prev,
                                    vehicleCount: prev.vehicleCount - 1,
                                  }));
                                  setHasChanged(true);
                                }
                              }}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={1}
                              className="no-spinner h-6 w-8 text-center px-1 rounded border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs"
                              value={fleetOptions.vehicleCount}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 1;
                                setFleetOptions((prev) => ({
                                  ...prev,
                                  vehicleCount: Math.max(1, value),
                                }));
                                setHasChanged(true);
                              }}
                            />
                            <button
                              type="button"
                              className="w-6 h-6 bg-white/90 dark:bg-gray-700 rounded flex items-center justify-center text-sm font-bold hover:bg-white dark:hover:bg-gray-600 transition-colors"
                              onClick={() => {
                                setFleetOptions((prev) => ({
                                  ...prev,
                                  vehicleCount: prev.vehicleCount + 1,
                                }));
                                setHasChanged(true);
                              }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Original Fleet Sizing Info */}
                      <div className="pt-2 border-t border-blue-200/60 dark:border-blue-800/60">
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between py-2">
                            <span className="text-xs font-semibold text-gray-900 dark:text-white">
                              Total TMs to be used
                            </span>
                            <span className="text-base font-bold text-blue-600 dark:text-blue-400 min-w-[2rem] text-right">
                              {!fleetOptions.useRoundTrip ? fleetOptions.vehicleCount : 1}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* TM Trip Distribution (only for Separate Vehicle) */}
                  {!fleetOptions.useRoundTrip && (
                    <div className="bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-3">TM Trip Distribution</h3>
                      {(() => {
                        const totalTrips = Math.max(0, fleetOptions.tripsNeeded || 0);
                        const vehCount = Math.max(0, fleetOptions.vehicleCount || 0);
                        if (totalTrips <= 0 || vehCount <= 0) {
                          return (
                            <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400 text-sm">
                              Enter inputs to see estimated distribution.
                            </div>
                          );
                        }
                        const exact = totalTrips / vehCount;
                        const floorTrips = Math.floor(exact);
                        const ceilTrips = Math.ceil(exact);
                        const numCeil = totalTrips - floorTrips * vehCount; // vehicles taking ceil trips
                        const numFloor = Math.max(0, vehCount - numCeil);

                        type Row = { tmCount: number; trips: number; totalTrips: number };
                        const rows: Row[] = [];
                        if (floorTrips === ceilTrips) {
                          rows.push({ tmCount: vehCount, trips: floorTrips, totalTrips });
                        } else {
                          if (numCeil > 0) rows.push({ tmCount: numCeil, trips: ceilTrips, totalTrips: numCeil * ceilTrips });
                          if (numFloor > 0) rows.push({ tmCount: numFloor, trips: floorTrips, totalTrips: numFloor * floorTrips });
                          rows.sort((a, b) => b.trips - a.trips);
                        }
                        const totalTMs = rows.reduce((s, r) => s + r.tmCount, 0);
                        const totalTripsCalc = rows.reduce((s, r) => s + r.totalTrips, 0);

                        return (
                          <div>
                            <table className="w-full table-fixed border-collapse border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900/30">
                              <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/60">
                                  <th className="w-1/6 px-2 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-200 text-left border-b border-gray-200 dark:border-gray-700">
                                    Sl.
                                  </th>
                                  <th className="w-1/4 px-2 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-200 text-left border-b border-gray-200 dark:border-gray-700">
                                    TMs (A)
                                  </th>
                                  <th className="w-1/4 px-2 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-200 text-left border-b border-gray-200 dark:border-gray-700">
                                    Trips/TM (B)
                                  </th>
                                  <th className="w-1/3 px-2 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-200 text-left border-b border-gray-200 dark:border-gray-700">
                                    Total (A × B)
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map((row, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                    <td className="px-2 py-2 text-xs text-gray-600 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700/50">
                                      {idx + 1}
                                    </td>
                                    <td className="px-2 py-2 text-xs text-gray-600 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700/50 font-medium">
                                      {row.tmCount}
                                    </td>
                                    <td className="px-2 py-2 text-xs text-gray-600 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700/50 font-medium">
                                      {row.trips}
                                    </td>
                                    <td className="px-2 py-2 text-xs text-gray-600 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700/50 font-semibold">
                                      {row.totalTrips}
                                    </td>
                                  </tr>
                                ))}
                                <tr className="bg-gray-50 dark:bg-gray-800/40 border-t border-gray-300 dark:border-gray-600">
                                  <td className="px-2 py-2 text-xs font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wide">
                                    Total
                                  </td>
                                  <td className="px-2 py-2 text-xs font-bold text-gray-800 dark:text-gray-200">{totalTMs}</td>
                                  <td className="px-2 py-2 text-xs text-gray-400 dark:text-gray-500">—</td>
                                  <td className="px-2 py-2 text-xs font-bold text-gray-800 dark:text-gray-200">{totalTripsCalc}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button
                onClick={handleNext}
                className="flex items-center gap-2"
                disabled={isCalculating || !isStep1FormValid()}
              >
                {isCalculating ? "Calculating..." : "Next Step"}
                {!isCalculating && <ArrowRight size={16} />}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Step 2 - TM Selection */}
            <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">Select TM</h3>

            {calculatedTMs && calculatedTMs.available_tms && (
              <>
                {calculatedTMs.available_tms.length === 0 ? (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center justify-between">
                    <span>No available TMs found. Please add TMs to proceed.</span>
                    <a
                      href="/transit-mixers"
                      className="ml-4 px-3 py-1 bg-brand-500 text-white rounded hover:bg-brand-600 transition-colors text-sm font-medium"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Add TMs
                    </a>
                  </div>
                ) : null}
              </>
            )}

            <div className="grid grid-cols-2 gap-6">
              {/* Left Column - TM Selection */}
              <div className="space-y-6">
                <div className="space-y-4">
                  {calculatedTMs && calculatedTMs.available_tms && calculatedTMs.available_tms.length > 0 ? (
                    (() => {
                      // Build plantId to name map
                      const plantIdToName = (plantsData || []).reduce((acc, plant) => {
                        acc[plant._id] = plant.name;
                        return acc;
                      }, {} as Record<string, string>);
                      // Group TMs
                      const grouped: Record<string, typeof calculatedTMs.available_tms> = {};
                      calculatedTMs.available_tms.forEach((tm) => {
                        const group = tm.plant_id ? plantIdToName[tm.plant_id] || "Unassigned" : "Unassigned";
                        if (!grouped[group]) grouped[group] = [];
                        grouped[group].push(tm);
                      });
                      // Sort group names: all except 'Unassigned' alphabetically, then 'Unassigned' last
                      const groupOrder = Object.keys(grouped)
                        .filter((g) => g !== "Unassigned")
                        .sort((a, b) => a.localeCompare(b))
                        .concat(Object.keys(grouped).includes("Unassigned") ? ["Unassigned"] : []);
                      return groupOrder.map((plant) => {
                        const tms = grouped[plant];
                        const isOpen = openPlantGroups[plant] ?? true;
                        const motherPlantName = (() => {
                          const motherId = projects.find((p) => p._id === selectedProject)?.mother_plant_id;
                          return motherId ? plantIdToName[motherId] || "" : "";
                        })();
                        return (
                          <div key={plant} className="mb-4">
                            <button
                              type="button"
                              className={`flex items-center w-full px-4 py-2 bg-brand-50 dark:bg-brand-900/30 border-l-4 border-brand-500 dark:border-brand-400 font-semibold text-brand-700 dark:text-brand-300 text-base focus:outline-none transition-all duration-200
                                ${isOpen ? "rounded-t-lg rounded-b-none" : "rounded-lg"}`}
                              onClick={() => setOpenPlantGroups((prev) => ({ ...prev, [plant]: !isOpen }))}
                              aria-expanded={isOpen}
                            >
                              <span className="mr-2">
                                {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                              </span>
                              <span className="flex-1 text-left flex items-center gap-2">
                                <span>{plant}</span>
                                {plant && motherPlantName && plant === motherPlantName && (
                                  <span className="px-2 py-0.5 text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                                    Mother Plant
                                  </span>
                                )}
                              </span>
                              <span className="ml-2 text-xs font-semibold text-brand-500 dark:text-brand-300 bg-brand-100 dark:bg-brand-900/40 px-2 py-0.5 rounded-full">
                                {tms.length}
                              </span>
                            </button>
                            <AnimatePresence initial={false}>
                              {isOpen && (
                                <motion.div
                                  key="content"
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.3, ease: "easeInOut" }}
                                  className="overflow-hidden"
                                >
                                  <div className="bg-white dark:bg-gray-900/30 border border-t-0 border-gray-200 dark:border-gray-700 rounded-b-lg p-2 pl-6">
                                    {tms.map((tm, idx) => (
                                      <label
                                        key={tm.id}
                                        className={`flex items-center justify-between px-3 py-2 mb-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:hover:bg-gray-800/50  ${
                                          !tm.availability
                                            ? "opacity-50 cursor-not-allowed"
                                            : "cursor-pointer hover:bg-gray-100"
                                        } `}
                                      >
                                        <div className="flex flex-row items-center space-x-4 w-full">
                                          <span className="w-5 text-xs text-gray-500">{idx + 1}.</span>
                                          <input
                                            type="checkbox"
                                            checked={tmSequence.includes(tm.id)}
                                            disabled={!tm.availability}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setTMSequence((prev) => [...prev, tm.id]);
                                              } else {
                                                setTMSequence((prev) => prev.filter((id) => id !== tm.id));
                                              }
                                              setHasChanged(true);
                                            }}
                                            className="h-4 w-4 text-brand-500 rounded border-gray-300 focus:ring-brand-500"
                                          />
                                          <div className="flex flex-row w-full justify-between">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                              {tm.identifier}
                                            </p>
                                            <div className="flex flex-row items-end gap-2">
                                              {!tm.availability && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400 text-right">
                                                  Unavailable -
                                                </p>
                                              )}
                                              <p className="text-sm text-gray-500 dark:text-gray-400 text-right">
                                                {tm.capacity}m³
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      </label>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      });
                    })()
                  ) : (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      No TMs available for selection
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Selected TM */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">Selected TMs</h3>
                <div className="space-y-2">
                  {tmSequence.length > 0 && calculatedTMs ? (
                    (() => {
                      // Build plantId to name map
                      const plantIdToName = (plantsData || []).reduce((acc, plant) => {
                        acc[plant._id] = plant.name;
                        return acc;
                      }, {} as Record<string, string>);

                      return (
                        <div className="space-y-2">
                          {tmSequence.map((tmId, index) => {
                            const tm = calculatedTMs.available_tms.find((t) => t.id === tmId);
                            const plant = tm?.plant_id ? plantIdToName[tm.plant_id] || "Unassigned" : "Unassigned";

                            return (
                              <div
                                key={tmId}
                                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-4">
                                    <span className="text-xs text-brand-600 dark:text-brand-400 font-semibold bg-brand-100 dark:bg-brand-900/30 px-2 py-1 rounded-full">
                                      {index + 1}
                                    </span>
                                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                                      {tm?.identifier}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {plant && (
                                      <span className="px-2 py-1 text-xs font-medium text-brand-600 bg-brand-50 dark:bg-brand-900/30 dark:text-brand-400 rounded-full">
                                        {plant}
                                      </span>
                                    )}
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                      {tm?.capacity} m³
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">No TMs selected</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-8 gap-0">
              <Button variant="outline" onClick={handleBack} className="flex items-center gap-2">
                <ArrowLeft size={16} />
                Back
              </Button>
              <div className="flex items-center gap-4 justify-end flex-1">
                {/* Warning message */}
                {tmSequence.length !== (fleetOptions.useRoundTrip ? 1 : fleetOptions.vehicleCount) && (
                  <div className="p-2 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg text-xs">
                    Please select{" "}
                    <span className="font-semibold">
                      {fleetOptions.useRoundTrip ? 1 : fleetOptions.vehicleCount} TM
                      {(fleetOptions.useRoundTrip ? 1 : fleetOptions.vehicleCount) > 1 ? "s" : ""}
                    </span>{" "}
                    to proceed.
                  </div>
                )}
                <Button
                  onClick={handleNext}
                  className="flex items-center gap-2 min-w-[140px]"
                  disabled={
                    isGenerating || tmSequence.length !== (fleetOptions.useRoundTrip ? 1 : fleetOptions.vehicleCount)
                  }
                >
                  {isGenerating ? "Generating..." : "Generate Schedule"}
                  {!isGenerating && <ArrowRight size={16} />}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

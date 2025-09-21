"use client";

import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import DatePickerInput from "@/components/form/input/DatePickerInput";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Calendar,
  FileText,
  Ban,
  GripVertical,
  CircleQuestionMark,
  AlertTriangle,
  Info,
  CheckCircle,
  ArrowDown,
  Search,
  Building,
  Truck,
  MapPin,
} from "lucide-react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { useApiClient } from "@/hooks/useApiClient";
import { useQuery } from "@tanstack/react-query";
// removed unused table and badge imports
import { useRouter, useSearchParams } from "next/navigation";
import TimeInput from "@/components/form/input/TimeInput";
import { useProfile } from "@/hooks/useProfile";
import Tooltip from "@/components/ui/tooltip";
import { cn, formatDate } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import SearchableDropdown from "@/components/form/SearchableDropdown";

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

interface UnavailableTimeEntry {
  start: string; // ISO date string
  end: string; // ISO date string
  schedule_no: string;
}

interface UnavailableTimes {
  [scheduleId: string]: UnavailableTimeEntry;
}

interface AvailableTM {
  id: string;
  identifier: string;
  capacity: number;
  availability: boolean;
  plant_id: string;
  plant_name: string;
  unavailable_times: UnavailableTimes;
}

type TeamMember = {
  _id: string;
  name: string;
  designation?: string;
};

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

// Helper function to format date and time for tooltips
const formatDateTimeForTooltip = (dateTimeString: string): string => {
  const date = new Date(dateTimeString);
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${dateStr} ${timeStr}`;
};

const createTooltip = (unavailable_times: UnavailableTimes) => {
  let tooltip = "";
  Object.keys(unavailable_times).map((schedule) => {
    tooltip =
      tooltip +
      `Schedule No. : ${unavailable_times[schedule]["schedule_no"]}\nStarts from: ${formatDateTimeForTooltip(
        unavailable_times[schedule]["start"]
      )} to: ${formatDateTimeForTooltip(unavailable_times[schedule]["end"])}\n\n`;
  });
  return tooltip;
};

const steps = [
  { id: 1, name: "Supply Schedule Details" },
  { id: 1.1, name: "Pour Details", type: "subStep" },
  { id: 1.2, name: "Transit Mixer Trip Log", type: "subStep" },
  { id: 2, name: "TM Selection" },
];

export default function NewSupplyScheduleForm({ schedule_id }: { schedule_id?: string }) {
  const { profile } = useProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const template = searchParams.get("template");
  const { fetchWithAuth } = useApiClient();
  const [step, setStep] = useState(schedule_id ? 2 : (1 as number));
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
    siteSupervisorId: "",
    remarks: "",
  });

  const [fleetOptions, setFleetOptions] = useState({
    tripsNeeded: 0,
    useRoundTrip: true,
    vehicleCount: 1,
  });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [formDataRetrieved, setFormDataRetrieved] = useState(true);
  const [openPlantGroups, setOpenPlantGroups] = useState<Record<string, boolean>>({});
  const [overruleTMCount, setOverruleTMCount] = useState(false);
  const [customTMCount, setCustomTMCount] = useState(1);

  const [selectedProject, setSelectedProject] = useState<string>("");

  // Templates: past supply schedules
  interface PastSupplySchedule {
    _id: string;
    schedule_no: string;
    client_id: string;
    client_name: string;
    project_id: string;
    project_name: string;
    concreteGrade: string;
    input_params: {
      quantity: number;
      schedule_date: string;
      pump_start: string;
      onward_time: number;
      return_time: number;
      buffer_time: number;
      load_time: number;
      unloading_time?: number;
    };
    remarks?: string;
    site_supervisor_id?: string;
    tm_overrule?: number;
  }

  const [selectedPastSchedule, setSelectedPastSchedule] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: pastSchedules, isLoading: pastSchedulesLoading } = useQuery<PastSupplySchedule[]>({
    queryKey: ["past-supply-schedules"],
    queryFn: async () => {
      const response = await fetchWithAuth("/schedules?type=supply");
      const data = await response.json();
      if (data.success) {
        return data.data as PastSupplySchedule[];
      }
      return [];
    },
  });

  const { data: clientsData, isLoading: clientsLoading } = useQuery<Client[]>({
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

  // Site supervisors (schedule team)
  const { data: scheduleTeamMembers } = useQuery<TeamMember[]>({
    queryKey: ["schedule-team"],
    queryFn: async () => {
      const response = await fetchWithAuth("/team/group/schedule");
      const data = await response.json();
      if (data.success) {
        return data.data as TeamMember[];
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

  // Count schedules for the selected date to generate schedule number
  type ScheduleForCount = { input_params?: { schedule_date?: string } };
  const scheduleDateForCount = formData.scheduleDate;
  const { data: schedulesForDayCount } = useQuery<number>({
    queryKey: ["schedules-for-day", scheduleDateForCount],
    enabled: !!scheduleDateForCount,
    queryFn: async () => {
      try {
        const response = await fetchWithAuth("/schedules?type=all");
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          return (data.data as ScheduleForCount[]).filter(
            (s) => s?.input_params?.schedule_date === scheduleDateForCount
          ).length;
        }
        return 0;
      } catch {
        return 0;
      }
    },
  });

  // Build schedule name: MotherPlantName-DD/MM/YY-Count
  const formatDateAsDDMMYY = (dateStr: string) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y.slice(2)}`;
  };

  // Mother plant and schedule name will be computed after projects are defined below

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

  const { data: projectsData, isLoading: projectsLoading } = useQuery<Project[]>({
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
  const projects: Project[] = useMemo(() => projectsData ?? [], [projectsData]);

  // Mother plant name from selected project (computed after projects are available)
  const motherPlantId = selectedProject ? projects.find((p) => p._id === selectedProject)?.mother_plant_id : "";
  const motherPlantName = motherPlantId
    ? (plantsData || []).find((plant) => plant._id === motherPlantId)?.name || "Unknown Plant"
    : "";

  // Build computed and displayed schedule names
  const [computedScheduleName, setComputedScheduleName] = useState("");

  useEffect(() => {
    if (selectedClient && selectedProject && formData.scheduleDate && motherPlantName)
      setComputedScheduleName(
        `${motherPlantName}-${formatDateAsDDMMYY(formData.scheduleDate)}-${(schedulesForDayCount ?? 0) + 1}`
      );
  }, [motherPlantName, formData.scheduleDate, schedulesForDayCount, selectedClient, selectedProject]);

  const filteredSchedules = useMemo(() => {
    if (!searchTerm) return pastSchedules;
    return (pastSchedules || []).filter((schedule) => {
      const q = searchTerm.toLowerCase();
      return (
        schedule.schedule_no.toLowerCase().includes(q) ||
        (schedule.client_name || "").toLowerCase().includes(q) ||
        (schedule.project_name || "").toLowerCase().includes(q) ||
        (schedule.concreteGrade || "").toString().toLowerCase().includes(q)
      );
    });
  }, [searchTerm, pastSchedules]);

  const fetchSchedule = useCallback(async () => {
    try {
      const response = await fetchWithAuth(`/schedules/${schedule_id}`);
      const data = await response.json();
      if (data.success) {
        setSelectedClient(data.data.client_id);
        setSelectedProject(data.data.project_id);
        const pumping_speed = data.data.input_params.pumping_speed;
        setFormData({
          scheduleDate: data.data.input_params.schedule_date,
          startTime: data.data.input_params.pump_start.split("T")[1],
          quantity: data.data.input_params.quantity.toString(),
          speed: pumping_speed.toString(),
          unloadingTime:
            data.data.input_params.unloading_time && data.data.input_params.unloading_time !== 0
              ? data.data.input_params.unloading_time.toString()
              : pumping_speed && avgTMCap
              ? ((avgTMCap / pumping_speed) * 60).toFixed(0)
              : "",
          onwardTime: data.data.input_params.onward_time.toString(),
          returnTime: data.data.input_params.return_time.toString(),
          bufferTime: data.data.input_params.buffer_time.toString(),
          loadTime: data?.data?.input_params?.load_time.toString() || "",
          concreteGrade: data.data.concreteGrade,
          siteSupervisorId: data.data.site_supervisor_id || "",
          remarks: data.data.remarks?.toString?.() || "",
        });
        setComputedScheduleName(
          data?.data?.schedule_no ||
            `${motherPlantName}-${formatDateAsDDMMYY(data?.data?.input_params?.schedule_date)}-${
              (schedulesForDayCount ?? 0) + 1
            }`
        );
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
        setHasChanged(false);

        return true;
      }
      return false;
    } catch (error) {
      setFormDataRetrieved(false);
      console.error("Error fetching schedule:", error);
      return false;
    }
  }, [schedule_id, avgTMCap, formData.scheduleDate, motherPlantName, schedulesForDayCount]);

  // Template handling - prefill form when template is selected
  useEffect(() => {
    if (!template || template === "none" || schedule_id || pastSchedulesLoading) return;
    setSelectedPastSchedule(template);
    if (template) {
      const past = pastSchedules?.find((s) => s._id === template);
      if (past) {
        setSelectedClient(past.client_id);
        setSelectedProject(past.project_id);
        setFormData((prev) => ({
          ...prev,
          concreteGrade: past.concreteGrade,
          onwardTime: past.input_params.onward_time.toString(),
          returnTime: past.input_params.return_time.toString(),
          bufferTime: past.input_params.buffer_time.toString(),
          loadTime: past.input_params.load_time.toString(),
          remarks: past.remarks || "",
          siteSupervisorId: past.site_supervisor_id || "",
        }));
        if (past.tm_overrule) {
          setOverruleTMCount(true);
          setCustomTMCount(past.tm_overrule);
        }
      }
    }
    // Move to first sub-step
    setStep(1.1 as number);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, pastSchedules]);

  const updateSchedule = async () => {
    if (!schedule_id) return false;
    try {
      const response = await fetchWithAuth(`/schedules/${schedule_id}`, {
        method: "PUT",
        body: JSON.stringify({
          schedule_no: computedScheduleName,
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
          site_supervisor_id: formData.siteSupervisorId || undefined,
          remarks: formData.remarks ? formData.remarks : undefined,
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
  }, [schedule_id, clientsData]);

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
            schedule_no: computedScheduleName,
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
            tm_overrule: customTMCount > 0 && overruleTMCount ? customTMCount : undefined,
            site_supervisor_id: formData.siteSupervisorId || undefined,
            remarks: formData.remarks ? formData.remarks : undefined,
          }),
        });

        const data = await response.json();
        if (data.success) {
          setCalculatedTMs(data?.data);
          setCustomTMCount(data?.data?.tm_overrule || data?.data?.tm_count || 1);
          setOverruleTMCount(
            data?.data?.tm_overrule && data?.data?.tm_count ? data?.data?.tm_overrule !== data?.data?.tm_count : false
          );
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
      setStep(1.1 as number);
    } else if (step === 1.1) {
      setStep(1.2 as number);
    } else if (step === 1.2) {
      const success = await calculateRequiredTMs();
      if (success) setStep(2);
    } else if (step === 2) {
      const success = await generateSchedule();
      if (success) {
        // Redirect to view page instead of going to step 3
        router.push(`/supply-schedules/${calculatedTMs?.schedule_id}/view`);
      }
    }
  };

  const handleBack = () => {
    if (step === 1.1) setStep(1);
    else if (step === 1.2) setStep(1.1 as number);
    else if (step === 2) setStep(1.2 as number);
  };

  // removed unused handleSubmit

  const progressPercentage = (() => {
    if (step === 1) return 0;
    if (step === 1.1) return (100 / (steps.length - 1)) * 1;
    if (step === 1.2) return (100 / (steps.length - 1)) * 2;
    if (step === 2) return 100;
    return 0;
  })();

  const quantity = parseFloat(formData.quantity) || 0;
  const speed = parseFloat(formData.speed) || 0;

  const cycleTimeMin = [
    formData.bufferTime,
    formData.loadTime,
    formData.onwardTime,
    formData.unloadingTime,
    formData.returnTime,
  ]
    .map((v) => parseFloat(v) || 0)
    .reduce((a, b) => a + b, 0);

  const totalPumpingHours = speed > 0 ? quantity / speed : 0;
  const [startHour, startMin] = (formData.startTime || "00:00").split(":").map((n) => parseInt(n, 10));

  const startTotalMin = startHour * 60 + startMin;
  const pumpMinutes = Math.round(totalPumpingHours * 60); // from earlier calculation
  const endTotalMin = startTotalMin + pumpMinutes;

  // keep it within 24h
  const endHour = Math.floor(endTotalMin / 60) % 24;
  const endMin = endTotalMin % 60;

  // format back to HH:mm
  const pad = (n: number) => n.toString().padStart(2, "0");
  const pumpEndTime = pumpMinutes ? `${pad(endHour)}:${pad(endMin)}` : `${0}:${0}`;

  // Build Date objects for schedule window and TM classification helpers
  const scheduleStartDate = useMemo(() => {
    if (!formData.scheduleDate || !formData.startTime) return null;
    return new Date(`${formData.scheduleDate}T${formData.startTime}`);
  }, [formData.scheduleDate, formData.startTime]);

  const scheduleEndDate = useMemo(() => {
    if (!scheduleStartDate) return null;
    // For supply schedules, we'll use a reasonable end time based on cycle time
    if (cycleTimeMin <= 0) return null;
    return new Date(scheduleStartDate.getTime() + cycleTimeMin * 60 * 1000);
  }, [
    scheduleStartDate,
    formData.bufferTime,
    formData.loadTime,
    formData.onwardTime,
    formData.unloadingTime,
    formData.returnTime,
  ]);

  type TMAvailabilityClass = "available" | "partially_unavailable" | "unavailable";

  const getUnusedHours = (unavailable_times: UnavailableTimes | null, dayStart: Date | null) => {
    if (!dayStart || !unavailable_times) return 24;
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    let start = dayStart,
      end = dayEnd;
    let duration = 0;
    for (const [schedule, entry] of Object.entries(unavailable_times)) {
      if (schedule == schedule_id) continue;
      const scheduleStart = new Date(entry.start);
      const scheduleEnd = new Date(entry.end);
      start = scheduleStart.getTime() > dayStart.getTime() ? scheduleStart : dayStart;
      end = scheduleEnd.getTime() < dayEnd.getTime() ? scheduleEnd : dayEnd;
      if (start.getTime() > end.getTime()) continue;
      duration += (end.getTime() - start.getTime()) / 3600000;
    }
    const unusedHours = 24 - Math.ceil(duration);
    return unusedHours;
  };

  const createUnavailableInfo = (unavailableTimes: UnavailableTimes): ReactNode => {
    const schedules: string[] = unavailableTimes ? Object.keys(unavailableTimes) : [];
    if (!schedules || schedules.length === 0) {
      return (
        <div className="flex items-center text-xs text-red-600 dark:text-red-400">
          <Ban className="w-3.5 h-3.5 mr-1" />
          <span className="font-medium">Full day unavailable</span>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {schedules.map((schedule, index) => {
          if (schedule_id === schedule) return;
          return (
            <div key={index} className="flex items-center text-xs text-red-600 dark:text-red-400 rounded-md px-2 py-1">
              <Clock className="w-3.5 h-3.5 mr-2 shrink-0" />
              <div className="flex flex-col">
                <span className="font-medium">
                  {formatDateTimeForTooltip(unavailableTimes[schedule].start)} –{" "}
                  {formatDateTimeForTooltip(unavailableTimes[schedule].end)}
                </span>
                {unavailableTimes[schedule].schedule_no && (
                  <span className="text-[11px] text-red-500 dark:text-red-300">
                    Schedule #{unavailableTimes[schedule].schedule_no}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const classifyTMAvailability = useCallback(
    (tm: AvailableTM, windowStart: Date | null, windowEnd: Date | null): TMAvailabilityClass => {
      if (tm.availability) return "available";
      if (!windowStart || !windowEnd) return tm.availability ? "available" : "unavailable";

      const unavailable_times: UnavailableTimes = tm?.unavailable_times ? tm.unavailable_times : {};
      if (Object.keys(unavailable_times).length === 0) return "available";

      let isNearWithinHour = false;

      for (const [schedule, entry] of Object.entries(unavailable_times)) {
        if (schedule_id === schedule) continue;
        const entryStart = new Date(entry.start);
        const entryEnd = new Date(entry.end);
        if (windowStart.getTime() < entryEnd.getTime() && entryEnd.getTime() <= windowEnd.getTime()) {
          if ((entryEnd.getTime() - windowStart.getTime()) / 3600000 > 1) return "unavailable";
          isNearWithinHour = true;
        } else if (windowStart.getTime() < entryStart.getTime() && entryStart.getTime() <= windowEnd.getTime()) {
          return "unavailable";
        }
      }

      if (isNearWithinHour) return "partially_unavailable";
      return "available";
    },
    [schedule_id]
  );

  const setPumpingSpeedAndUnloadingTime = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleInputChange(e);
    const { name, value } = e.target;
    if (value === "") return setFormData((prev) => ({ ...prev, unloadingTime: "", speed: "" }));
    if (!avgTMCap || !value) return;
    if (name === "speed") {
      const speed = parseFloat(value);
      if (!isNaN(speed) && speed > 0) {
        return setFormData((prev) => ({
          ...prev,
          unloadingTime: ((avgTMCap / speed) * 60).toFixed(0),
        }));
      }
    }
    if (name === "unloadingTime") {
      const unloading_time = parseFloat(value);
      if (!isNaN(unloading_time) && unloading_time > 0) {
        return setFormData((prev) => ({
          ...prev,
          speed: (avgTMCap / (unloading_time / 60)).toFixed(0),
        }));
      }
    }
  };

  const isStep1FormValid = () => {
    if (step === 1.1) {
      // Pour Details validation
      return (
        !!selectedClient &&
        !!selectedProject &&
        !!formData.quantity &&
        !!formData.speed &&
        !!formData.scheduleDate &&
        !!formData.startTime
      );
    } else if (step === 1.2) {
      // Transit Mixer Trip Log validation
      const requiredFields = ["bufferTime", "loadTime", "onwardTime", "unloadingTime", "returnTime"];

      // Check if all required fields have values
      return requiredFields.every((field) => {
        const value = formData[field as keyof typeof formData];
        return value !== undefined && value !== null && value !== "" && value !== "0";
      });
    }
    return false;
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

  if (pastSchedulesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" text="Loading schedules..." />
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
          <div className="max-w-6xl mx-auto p-6 space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Choose Schedule Starting Point</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Start from scratch or use a previous schedule as a template
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Start from Scratch Option */}
              <div className="lg:col-span-1">
                <div
                  className={`h-full p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                    !selectedPastSchedule
                      ? "border-brand-500 bg-brand-50 dark:bg-brand-900/10 shadow-lg"
                      : "border-gray-200 hover:border-brand-300 hover:shadow-md dark:border-gray-700 dark:hover:border-brand-600"
                  }`}
                  onClick={() => setSelectedPastSchedule("")}
                >
                  <div className="text-center">
                    <div
                      className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                        !selectedPastSchedule
                          ? "bg-brand-500 text-white"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      <FileText className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Start from Scratch</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">
                      Create a completely new schedule without default values. You&apos;ll input all details manually.
                    </p>
                    <button
                      className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                        !selectedPastSchedule
                          ? "bg-brand-500 text-white hover:bg-brand-600"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      }`}
                    >
                      {!selectedPastSchedule ? "Selected" : "Choose this option"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Use Past Schedule Option */}
              <div className="lg:col-span-2">
                <div
                  className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                    selectedPastSchedule
                      ? "border-brand-500 bg-brand-50 dark:bg-brand-900/10 shadow-lg"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className="flex items-center mb-4">
                    <div
                      className={`inline-flex items-center justify-center w-12 h-12 rounded-full mr-4 ${
                        selectedPastSchedule
                          ? "bg-brand-500 text-white"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Use Past Schedule</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        Start with values from a previous schedule as a template
                      </p>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search by schedule name, number, client, or project..."
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      disabled={pastSchedulesLoading}
                    />
                  </div>

                  {/* Schedule List */}
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {pastSchedulesLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mx-auto"></div>
                        <p className="mt-2 text-gray-500">Loading schedules...</p>
                      </div>
                    ) : filteredSchedules?.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">No schedules found</p>
                      </div>
                    ) : (
                      filteredSchedules?.map((schedule) => (
                        <div
                          key={schedule._id}
                          className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                            selectedPastSchedule === schedule._id
                              ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                              : "border-gray-200 hover:border-brand-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-brand-600 dark:hover:bg-gray-800/50"
                          }`}
                          onClick={() => setSelectedPastSchedule(schedule._id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                                  {schedule.schedule_no}
                                </h4>
                              </div>

                              <div className="grid grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1">
                                    <FileText className="w-4 h-4" />
                                    <span className="font-medium">{schedule.schedule_no}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Building className="w-4 h-4" />
                                    <span className="truncate">{schedule.client_name}</span>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>{formatDate(schedule.input_params.schedule_date)}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Truck className="w-4 h-4" />
                                    <span>{schedule.input_params.quantity} m³</span>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    <span className="truncate">{schedule.project_name}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Truck className="w-4 h-4" />
                                    <span>
                                      {new Date(schedule.input_params.pump_start).toLocaleTimeString("en-US", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div
                              className={`ml-4 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                selectedPastSchedule === schedule._id
                                  ? "border-brand-500 bg-brand-500"
                                  : "border-gray-300 dark:border-gray-600"
                              }`}
                            >
                              {selectedPastSchedule === schedule._id && (
                                <div className="w-2 h-2 rounded-full bg-white"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {selectedPastSchedule && (
                    <div className="mt-4 p-3 bg-brand-50 dark:bg-brand-900/20 rounded-lg border border-brand-200 dark:border-brand-700">
                      <p className="text-sm text-brand-700 dark:text-brand-300">
                        <strong>Note:</strong> Date, time, quantity, and some other fields will still need to be updated
                        for the new schedule.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4 pt-6">
              <button
                className={cn(
                  "px-8 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors font-medium"
                )}
                // disabled={!selectedPastSchedule || selectedPastSchedule === ""}
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  if (!selectedPastSchedule) {
                    setSelectedPastSchedule("");
                    params.delete("template");
                  } else {
                    params.set("template", selectedPastSchedule || "none");
                  }
                  router.replace(`?${params.toString()}`, { scroll: false });
                  setStep(1.1);
                }}
              >
                Continue
              </button>
            </div>
          </div>
        ) : step === 1.1 ? (
          <div className="space-y-4">
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-white dark:bg-gray-900/30 mb-24">
              <div className="flex justify-between items-center mb-4 w-full">
                <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-4">Pour Details</h3>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 bg-blue-100 dark:bg-blue-900/40 py-1 px-3 rounded-full">
                  Company Timings -
                  {profile?.preferred_format === "12h"
                    ? ` ${(profile?.custom_start_hour ?? 0) % 12 || 12}:00 ${
                        (profile?.custom_start_hour ?? 0) < 12 ? "AM" : "PM"
                      } CURRENT DAY TO ${((profile?.custom_start_hour ?? 0) + 12) % 12 || 12}:00 ${
                        (profile?.custom_start_hour ?? 0) + 24 < 24 ? "PM" : "AM"
                      } NEXT DAY`
                    : ` ${String(profile?.custom_start_hour ?? 0).padStart(2, "0")}:00 TODAY TO ${String(
                        ((profile?.custom_start_hour ?? 0) + 24) % 24
                      ).padStart(2, "0")}:00 TOMORROW`}
                </span>
              </div>

              {/* Summary Row: Schedule No., Current Date, Current Time */}
              <div className="flex items-center justify-between gap-8 py-4 px-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
                {/* Schedule Number */}
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center justify-center w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg">
                    <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Schedule No.
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {computedScheduleName || "Select Project and Schedule Date first"}
                    </p>
                  </div>
                </div>

                {/* Separator */}
                <div className="h-8 w-px bg-gray-300 dark:bg-gray-600"></div>

                {/* Current Date */}
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center justify-center w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg">
                    <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Current Date
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {new Date().toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                {/* Separator */}
                <div className="h-8 w-px bg-gray-300 dark:bg-gray-600"></div>

                {/* Current Time */}
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center justify-center w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg">
                    <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Current Time
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {new Date().toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-6">
                {/* Client Selection */}
                <div className="col-span-1">
                  {clientsLoading ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Choose Client
                      </label>
                      <div className="h-11 min-w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                        Loading clients...
                      </div>
                    </div>
                  ) : (
                    <SearchableDropdown
                      options={clientsData || []}
                      value={selectedClient}
                      onChange={(value: string | string[]) => {
                        setSelectedClient(value as string);
                        setHasChanged(true);
                      }}
                      getOptionLabel={(client: Client) => client.name}
                      getOptionValue={(client: Client) => client._id}
                      placeholder="Select a client"
                      label="Choose Client"
                      required
                      multiple={false}
                    />
                  )}
                </div>

                {/* Project Selection */}
                <div className="col-span-1">
                  {!selectedClient ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Choose Project
                      </label>
                      <div className="h-11 min-w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                        Select a client first
                      </div>
                    </div>
                  ) : projectsLoading ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Choose Project
                      </label>
                      <div className="h-11 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                        Loading projects...
                      </div>
                    </div>
                  ) : (
                    <SearchableDropdown
                      options={projects || []}
                      value={selectedProject}
                      onChange={(value: string | string[]) => {
                        setSelectedProject(value as string);
                        setHasChanged(true);
                      }}
                      getOptionLabel={(project: Project) => project.name}
                      getOptionValue={(project: Project) => project._id}
                      placeholder={projects.length === 0 ? "No projects available" : "Select a project"}
                      label="Choose Project"
                      disabled={projects.length === 0}
                      required
                      multiple={false}
                    />
                  )}
                </div>

                {/* Project Details */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Project Details
                  </label>
                  <div className="min-h-fit p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    {selectedProject ? (
                      <div className="space-y-1">
                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                          <span className="font-medium">Contact:</span>{" "}
                          {projects.find((p) => p._id === selectedProject)?.contact_number || "N/A"}
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                          <span className="font-medium">Coordinates:</span>{" "}
                          {projects.find((p) => p._id === selectedProject)?.coordinates || "N/A"}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                        Select a project to view details
                      </p>
                    )}
                  </div>
                </div>

                {/* Pumping Quantity */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Pumping Quantity (m³) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    name="quantity"
                    value={formData.quantity || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      const numValue = parseFloat(value);
                      if (value === "" || (numValue >= 1 && numValue <= 9999 && Number.isInteger(numValue))) {
                        handleInputChange(e);
                      }
                    }}
                    placeholder="Enter quantity (1-9999)"
                    min="1"
                    max="9999"
                    step={1}
                    hint="Enter a whole number between 1 and 9999"
                  />
                </div>
              </div>

              <div className="grid grid-cols-5 gap-6 mt-6">
                {/* Grade of Concrete */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">RMC Grade</label>
                  <div className="flex items-center w-full">
                    <span className="w-6 text-gray-700 dark:text-gray-300 font-medium">M</span>
                    <Input
                      type="number"
                      name="concreteGrade"
                      value={formData.concreteGrade || ""}
                      onChange={handleInputChange}
                      placeholder="Enter RMC grade"
                      className="flex-1 w-full"
                      min="0"
                      max="999"
                    />
                  </div>
                </div>

                {/* SITE SUPERVISOR */}
                <div className="col-span-1">
                  <SearchableDropdown
                    options={scheduleTeamMembers || []}
                    value={formData.siteSupervisorId}
                    onChange={(value: string | string[]) => {
                      setFormData((prev) => ({ ...prev, siteSupervisorId: value as string }));
                      setHasChanged(true);
                    }}
                    getOptionLabel={(member: TeamMember) => member.name}
                    getOptionValue={(member: TeamMember) => member._id}
                    placeholder="Select supervisor"
                    label="Site Supervisor"
                    multiple={false}
                  />
                </div>

                {/* Supply from Which Plant (Mother Plant) */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Supply from Which Plant <span className="text-red-500">*</span>
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
                    className="w-full"
                  />
                </div>

                {/* Schedule Date of Pumping */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Schedule Date of Pumping <span className="text-red-500">*</span>
                  </label>
                  <DatePickerInput
                    value={formData.scheduleDate}
                    onChange={(date) => {
                      setFormData((prev) => ({ ...prev, scheduleDate: date }));
                      setHasChanged(true);
                    }}
                    placeholder="Select a date"
                    className="w-full"
                  />
                </div>

                {/* Pump Start Time */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Pump Start Time (24h) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <TimeInput
                      type="time"
                      name="startTime"
                      format={profile?.preferred_format === "12h" ? "h:mm a" : "hh:mm"}
                      isOpen
                      value={formData.startTime}
                      onChange={(val) => handleTimeChange("startTime", val)}
                      className="w-full"
                    />
                    <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                      <Clock className="size-5" />
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-10 gap-6 mt-6">
                {/* Pumping Speed */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Pumping Speed (m³/hr) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-row items-center gap-6">
                    <Input
                      type="number"
                      name="speed"
                      value={formData.speed || ""}
                      onChange={setPumpingSpeedAndUnloadingTime}
                      placeholder="Enter speed"
                      min="0"
                      className="w-full"
                    />
                    <span className="text-gray-600 dark:text-gray-400 font-medium">or</span>
                  </div>
                </div>
                {/* Unloading Time */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Unloading Time (min) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-col gap-1">
                    <Input
                      id="unloadingTime"
                      type="number"
                      name="unloadingTime"
                      value={formData.unloadingTime || ""}
                      onChange={setPumpingSpeedAndUnloadingTime}
                      min="0"
                      placeholder={
                        avgTMCap !== null ? "Auto-calculated from pumping speed" : "Enter pumping speed to calculate"
                      }
                      className="w-full"
                    />
                    {avgTMCap !== null && (
                      <p className="text-xs text-gray-500">
                        Based on avg. TM capacity: <span className="font-medium">{avgTMCap?.toFixed(0)} m³</span>
                        <br />
                        (Update this in the Transit Mixers page)
                      </p>
                    )}
                  </div>
                </div>

                {/* Total Pumping Hours (Auto Fill) */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Total Pumping Hours
                  </label>
                  <Input
                    type="text"
                    name="pumpingHours"
                    value={totalPumpingHours > 0 ? `${totalPumpingHours.toFixed(2)} hr` : "-"}
                    disabled
                    className="cursor-not-allowed bg-gray-100 dark:bg-gray-800"
                  />
                </div>

                {/* Pump End Time (Auto Calculated) */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 truncate -mr-2">
                    Pump End Time <span className="text-gray-500 text-[10px] pl-1">(24h)</span>
                  </label>
                  <div className="relative">
                    <TimeInput
                      type="time"
                      name="endTime"
                      format="hh:mm"
                      value={pumpEndTime}
                      disabled
                      className="cursor-not-allowed bg-gray-100 dark:bg-gray-800"
                    />
                    <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                      <Clock className="size-5" />
                    </span>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Remarks</label>
                  <Input
                    type="string"
                    name="remarks"
                    value={formData.remarks}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData((prev) => ({ ...prev, remarks: v }));
                      setHasChanged(true);
                    }}
                    placeholder="Enter remarks"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : step === 1.2 ? (
          <div className="space-y-4">
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
                      {/* Pre-Start Time */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center min-w-0 flex-1">
                          <span
                            className="w-2.5 h-2.5 rounded-sm mr-2 flex-shrink-0"
                            style={{ backgroundColor: "#3b82f6" }}
                          ></span>
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-0">
                            Pre-Start Time (min)
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
                            style={{ backgroundColor: "#8b5cf6" }}
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
                            style={{ backgroundColor: "#ef4444" }}
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
                                color: "#8b5cf6",
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
                                color: "#ef4444",
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

                      {/* TM Overrule Section */}
                      {!fleetOptions.useRoundTrip && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-gray-900 dark:text-white">
                            TMs Additional (Max TMs to wait at site)
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="w-6 h-6 bg-white/90 dark:bg-gray-700 rounded flex items-center justify-center text-sm font-bold hover:bg-white dark:hover:bg-gray-600 transition-colors"
                              onClick={() => {
                                const nextAdditional = Math.max(
                                  0,
                                  (customTMCount || 0) - fleetOptions.vehicleCount - 1
                                );
                                const nextTotal = Math.max(1, fleetOptions.vehicleCount + nextAdditional);
                                setOverruleTMCount(nextAdditional > 0);
                                setCustomTMCount(nextTotal);
                                setHasChanged(true);
                              }}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={0}
                              className="no-spinner h-6 w-8 text-center px-1 rounded border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs"
                              value={Math.max(0, (customTMCount || 0) - fleetOptions.vehicleCount)}
                              onChange={(e) => {
                                const raw = parseInt(e.target.value || "0", 10);
                                const add = isNaN(raw) ? 0 : Math.max(0, raw);
                                const nextTotal = Math.max(1, fleetOptions.vehicleCount + add);
                                setOverruleTMCount(add > 0);
                                setCustomTMCount(nextTotal);
                                setHasChanged(true);
                              }}
                            />
                            <button
                              type="button"
                              className="w-6 h-6 bg-white/90 dark:bg-gray-700 rounded flex items-center justify-center text-sm font-bold hover:bg-white dark:hover:bg-gray-600 transition-colors"
                              onClick={() => {
                                const nextAdditional = Math.max(
                                  0,
                                  (customTMCount || 0) - fleetOptions.vehicleCount + 1
                                );
                                const nextTotal = Math.max(1, fleetOptions.vehicleCount + nextAdditional);
                                setOverruleTMCount(true);
                                setCustomTMCount(nextTotal);
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
                              {!fleetOptions.useRoundTrip
                                ? overruleTMCount
                                  ? customTMCount
                                  : fleetOptions.vehicleCount
                                : 1}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* TM Trip Distribution (only for Separate Vehicle) */}
                  {!fleetOptions.useRoundTrip && (
                    <div className="bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-3">
                        TM Trip Distribution
                      </h3>
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
                          if (numCeil > 0)
                            rows.push({ tmCount: numCeil, trips: ceilTrips, totalTrips: numCeil * ceilTrips });
                          if (numFloor > 0)
                            rows.push({ tmCount: numFloor, trips: floorTrips, totalTrips: numFloor * floorTrips });
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
                                  <tr
                                    key={idx}
                                    className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                                  >
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
                                  <td className="px-2 py-2 text-xs font-bold text-gray-800 dark:text-gray-200">
                                    {totalTMs}
                                  </td>
                                  <td className="px-2 py-2 text-xs text-gray-400 dark:text-gray-500">—</td>
                                  <td className="px-2 py-2 text-xs font-bold text-gray-800 dark:text-gray-200">
                                    {totalTripsCalc}
                                  </td>
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
          </div>
        ) : step === 2 ? (
          // TM Selection Step
          !calculatedTMs || !plantsData ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading TMs...</span>
            </div>
          ) : (
            <div className="space-y-6 pb-24">
              {calculatedTMs && (
                <div className="mb-6 p-6 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                    TM Selection & Sequencing
                  </h4>

                  <div className="grid grid-cols-2 gap-8">
                    {/* Left Half - Selection Instructions */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          1
                        </span>
                        <h5 className="text-lg font-medium text-gray-900 dark:text-white">
                          Select TMs from the list below
                        </h5>
                      </div>

                      {/* Calculation Display */}
                      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Required:</span>
                            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded-lg font-semibold">
                              {calculatedTMs.tm_count} TMs
                            </span>
                          </div>

                          {overruleTMCount && (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Overrule:</span>
                                <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 rounded-lg font-semibold">
                                  {customTMCount - calculatedTMs.tm_count} Added
                                </span>
                              </div>
                            </>
                          )}

                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">=</span>
                            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-lg font-bold">
                              {overruleTMCount ? customTMCount : calculatedTMs.tm_count} Total TMs
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Selection Guidelines */}
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <ArrowDown className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            Select from the dropdown list below
                          </span>
                        </div>
                        <div className="flex items-start gap-3">
                          <Clock className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            Check for partially available TMs - choose them wisely
                          </span>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            Prioritize fully available TMs first
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Half - Sequencing Instructions */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          2
                        </span>
                        <h5 className="text-lg font-medium text-gray-900 dark:text-white">Arrange Sequence of TMs</h5>
                      </div>

                      {/* Sequencing Guidelines */}
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            Drag and arrange TMs in the right panel
                          </span>
                        </div>
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            Check engaged timelines for unavailable/partially available TMs
                          </span>
                        </div>
                        <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">TIP:</span>
                            <span className="text-xs text-yellow-700 dark:text-yellow-400">
                              Use already in-use TMs later in the order
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {calculatedTMs && calculatedTMs.available_tms && (
                <>
                  {calculatedTMs.available_tms.length < calculatedTMs.tm_count ? (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center justify-between">
                      <span>Not enough available TMs to fulfill the requirement. Please add more TMs.</span>
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
                <div className="col-span-2 grid grid-cols-2 gap-6 sticky top-20 z-10 bg-white dark:bg-gray-900/70 backdrop-blur-sm">
                  {/* Left header */}
                  <div className="flex items-center gap-3 py-2 pl-4">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">
                      Select {overruleTMCount ? customTMCount : calculatedTMs.tm_count || "N/A"} TMs
                    </h3>
                  </div>

                  {/* Right header */}
                  <div className="flex items-center gap-3 py-2">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">
                      {tmSequence.length}/{overruleTMCount ? customTMCount : calculatedTMs.tm_count || "N/A"} selected -
                      Arrange
                    </h3>
                  </div>
                </div>
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
                        // Sort groups: mother plant first, then others alphabetically, then unassigned last
                        const motherPlantName = (() => {
                          const motherId = projects.find((p) => p._id === selectedProject)?.mother_plant_id;
                          return motherId ? plantIdToName[motherId] || "" : "";
                        })();

                        const groupOrder = Object.keys(grouped)
                          .filter((g) => g !== "Unassigned")
                          .sort((a, b) => {
                            // Mother plant first
                            if (a === motherPlantName) return -1;
                            if (b === motherPlantName) return 1;
                            // Then alphabetically
                            return a.localeCompare(b);
                          })
                          .concat(Object.keys(grouped).includes("Unassigned") ? ["Unassigned"] : []);

                        return groupOrder.map((plant) => {
                          const tms = grouped[plant];
                          const isOpen = openPlantGroups[plant] ?? true;
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
                                      {(() => {
                                        const getRank = (status: string) =>
                                          status === "available" ? 0 : status === "partially_unavailable" ? 1 : 2;
                                        const sortedTms = [...tms].sort((a, b) => {
                                          const aStatus = classifyTMAvailability(
                                            a as unknown as AvailableTM,
                                            scheduleStartDate,
                                            scheduleEndDate
                                          );
                                          const bStatus = classifyTMAvailability(
                                            b as unknown as AvailableTM,
                                            scheduleStartDate,
                                            scheduleEndDate
                                          );
                                          return getRank(aStatus) - getRank(bStatus);
                                        });
                                        return sortedTms.map((tm, idx) => (
                                          <label
                                            key={tm.id}
                                            className={`flex gap-3 flex-col items-end justify-between px-3 py-2 mb-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:hover:bg-gray-800/50  ${(() => {
                                              const status = classifyTMAvailability(
                                                tm as unknown as AvailableTM,
                                                scheduleStartDate,
                                                scheduleEndDate
                                              );
                                              if (status === "unavailable") return "opacity-50 cursor-not-allowed";
                                              if (status === "partially_unavailable")
                                                return "cursor-pointer hover:bg-yellow-50 dark:hover:bg-yellow-900/20";
                                              return "cursor-pointer hover:bg-gray-100";
                                            })()} `}
                                          >
                                            <div className="flex flex-row items-center space-x-4 w-full">
                                              <span className="w-5 text-xs text-gray-500">{idx + 1}.</span>
                                              <input
                                                type="checkbox"
                                                checked={tmSequence.includes(tm.id)}
                                                disabled={(() => {
                                                  return (
                                                    classifyTMAvailability(
                                                      tm as unknown as AvailableTM,
                                                      scheduleStartDate,
                                                      scheduleEndDate
                                                    ) === "unavailable"
                                                  );
                                                })()}
                                                onChange={(e) => {
                                                  setTMSequence((prev) => {
                                                    const updated = e.target.checked
                                                      ? [...prev, tm.id]
                                                      : prev.filter((id) => id !== tm.id);
                                                    return updated;
                                                  });
                                                  setHasChanged(true);
                                                }}
                                                className="h-4 w-4 text-brand-500 rounded border-gray-300 focus:ring-brand-500"
                                              />
                                              <div className="flex flex-row w-full justify-between">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                  {tm.identifier}
                                                </p>
                                                <div className="flex flex-row items-end gap-2">
                                                  {(() => {
                                                    const status = classifyTMAvailability(
                                                      tm as unknown as AvailableTM,
                                                      scheduleStartDate,
                                                      scheduleEndDate
                                                    );
                                                    if (status === "unavailable") {
                                                      return (
                                                        <>
                                                          <p className="text-sm text-gray-500 dark:text-gray-400 text-right">
                                                            Unavailable -
                                                          </p>
                                                          <Tooltip content={createTooltip(tm.unavailable_times)}>
                                                            <CircleQuestionMark size={15} />
                                                          </Tooltip>
                                                        </>
                                                      );
                                                    }
                                                    if (status === "partially_unavailable") {
                                                      return (
                                                        <>
                                                          <p className="text-sm text-yellow-600 dark:text-yellow-400 text-right">
                                                            Partially Available -
                                                          </p>
                                                          <Tooltip content={createTooltip(tm.unavailable_times)}>
                                                            <CircleQuestionMark size={15} />
                                                          </Tooltip>
                                                        </>
                                                      );
                                                    }
                                                    return null;
                                                  })()}
                                                  <p className="text-sm text-gray-500 dark:text-gray-400 text-right">
                                                    {tm.capacity}m³ - Unused{" "}
                                                    {getUnusedHours(tm.unavailable_times, scheduleStartDate)} hours
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                            {(() => {
                                              const status = classifyTMAvailability(
                                                tm as unknown as AvailableTM,
                                                scheduleStartDate,
                                                scheduleEndDate
                                              );
                                              if (status === "unavailable") {
                                                return (
                                                  <div className="item-right p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                                                    <div className="space-y-1">
                                                      {createUnavailableInfo(tm.unavailable_times)}
                                                    </div>
                                                  </div>
                                                );
                                              }
                                              if (status === "partially_unavailable") {
                                                return (
                                                  <div className="item-right p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                                                    <div className="space-y-1">
                                                      {createUnavailableInfo(tm.unavailable_times)}
                                                    </div>
                                                  </div>
                                                );
                                              }
                                              return null;
                                            })()}
                                          </label>
                                        ));
                                      })()}
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

                {/* Right Column - TM Sequence */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    {tmSequence.length > 0 && calculatedTMs ? (
                      (() => {
                        // Build plantId to name map
                        const plantIdToName = (plantsData || []).reduce((acc, plant) => {
                          acc[plant._id] = plant.name;
                          return acc;
                        }, {} as Record<string, string>);
                        // Build a map of plant to ordered selected TMs
                        const tmIdToPlant = Object.fromEntries(
                          calculatedTMs.available_tms.map((tm) => [
                            tm.id,
                            tm.plant_id ? plantIdToName[tm.plant_id] || "Unassigned" : "Unassigned",
                          ])
                        );
                        const plantToTms: Record<string, string[]> = {};
                        tmSequence.forEach((tmId) => {
                          const plant = tmIdToPlant[tmId] || "Unassigned";
                          if (!plantToTms[plant]) plantToTms[plant] = [];
                          plantToTms[plant].push(tmId);
                        });
                        // For each TM in sequence, show its number and plant badge
                        return (
                          <Reorder.Group axis="y" values={tmSequence} onReorder={setTMSequence} className="space-y-2">
                            {tmSequence.map((tmId, idx) => {
                              const tm = calculatedTMs.available_tms.find((t) => t.id === tmId);
                              const plant = tmIdToPlant[tmId] || "Unassigned";
                              return (
                                <Reorder.Item
                                  key={tmId}
                                  value={tmId}
                                  className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-grab active:cursor-grabbing"
                                >
                                  <div className="flex items-center space-x-4">
                                    <span className="text-xs text-brand-600 dark:text-brand-400 font-semibold">
                                      {idx + 1}
                                    </span>
                                    <span className="text-gray-700 dark:text-gray-300">{tm?.identifier}</span>
                                  </div>
                                  <div className="flex items-center flex-1 justify-end space-x-2">
                                    {(() => {
                                      if (!tm) return null;
                                      const status = classifyTMAvailability(
                                        tm as unknown as AvailableTM,
                                        scheduleStartDate,
                                        scheduleEndDate
                                      );
                                      if (status === "partially_unavailable") {
                                        return (
                                          <>
                                            <span className="text-xs text-yellow-700 dark:text-yellow-400">
                                              Partially Available
                                            </span>
                                            <Tooltip content={createTooltip(tm.unavailable_times)}>
                                              <CircleQuestionMark size={15} />
                                            </Tooltip>
                                          </>
                                        );
                                      }
                                      return null;
                                    })()}
                                    {plant && (
                                      <span className="px-2 py-1 text-xs font-medium text-brand-600 bg-brand-50 dark:bg-brand-900/30 dark:text-brand-400 rounded-full ml-2">
                                        {plant}
                                      </span>
                                    )}
                                    <div className="flex items-center">
                                      <GripVertical className="text-black/50" size={"18px"} />
                                    </div>
                                  </div>
                                </Reorder.Item>
                              );
                            })}
                          </Reorder.Group>
                        );
                      })()
                    ) : (
                      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                        No TMs selected for sequencing
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        ) : null}
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 ml-24 dark:bg-gray-900 dark:border-gray-700">
        {step === 1.1 && (
          <div className="flex justify-between mt-2">
            {!schedule_id ? (
              <Button onClick={handleBack} variant="outline" className="flex items-center gap-2">
                <ArrowLeft size={16} />
                Back to Select Template
              </Button>
            ) : (
              <span></span>
            )}
            <span>
              <span className="text-red-500">*</span> Compulsory, all other fields are optional
            </span>
            <Button onClick={handleNext} className="flex items-center gap-2" disabled={!isStep1FormValid()}>
              Next: Transit Mixer Trip Log
              <ArrowRight size={16} />
            </Button>
          </div>
        )}

        {step === 1.2 && (
          <div className="flex justify-between mt-2">
            <Button onClick={handleBack} variant="outline" className="flex items-center gap-2">
              <ArrowLeft size={16} />
              Back to Pour Details
            </Button>
            <div>
              <span className="text-red-500">*</span> Compulsory, all other fields are optional
            </div>
            <Button
              onClick={handleNext}
              className="flex items-center gap-2"
              disabled={isCalculating || !isStep1FormValid()}
            >
              {isCalculating ? "Calculating..." : "Next: TM Selection"}
              {!isCalculating && <ArrowRight size={16} />}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="flex justify-between items-center mt-2 gap-0">
            <Button variant="outline" onClick={handleBack} className="flex items-center gap-2">
              <ArrowLeft size={16} />
              Back to Transit Mixer Trip Log
            </Button>
            <div className="flex items-center gap-4 justify-end flex-1">
              {tmSequence.length !== (overruleTMCount ? customTMCount : calculatedTMs?.tm_count) && (
                <div className="p-2 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg text-xs">
                  Select{" "}
                  <span className="font-semibold">{overruleTMCount ? customTMCount : calculatedTMs?.tm_count}</span> TMs
                  {!overruleTMCount && " to get optimum schedule."}
                  {overruleTMCount && "."}
                </div>
              )}
              <Button
                onClick={handleNext}
                className="flex items-center gap-2 min-w-[140px]"
                disabled={
                  isGenerating ||
                  (!overruleTMCount
                    ? tmSequence.length !== calculatedTMs?.tm_count
                    : tmSequence.length !== customTMCount || customTMCount < 1)
                }
              >
                {isGenerating ? "Generating..." : "Generate Schedule"}
                {!isGenerating && <ArrowRight size={16} />}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

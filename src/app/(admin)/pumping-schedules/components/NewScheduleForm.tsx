"use client";

import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import Button from "@/components/ui/button/Button";
import Radio from "@/components/form/input/Radio";
import Input from "@/components/form/input/InputField";
import DatePickerInput from "@/components/form/input/DatePickerInput";
import SearchableDropdown from "@/components/form/SearchableDropdown";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  CheckCircle2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  CircleQuestionMark,
  FileText,
  Calendar,
  Plus,
  AlertTriangle,
  Info,
  CheckCircle,
  ArrowDown,
  Ban,
} from "lucide-react";
import { Reorder, motion, AnimatePresence } from "framer-motion";
import { useApiClient } from "@/hooks/useApiClient";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { RadioGroup } from "@/components/ui/radio";
import { useProfile } from "@/hooks/useProfile";
import TimeInput from "@/components/form/input/TimeInput";
// Removed Chart.js pie in favor of custom SVG DonutChart
import { Spinner } from "@/components/ui/spinner";
import Tooltip from "@/components/ui/tooltip";

interface Client {
  contact_phone: number;
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface Pump {
  _id: string;
  identifier: string;
  type: "line" | "boom";
  capacity: number;
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
  // _id: string;
  identifier: string;
  capacity: number;
  availability: boolean;
  plant_id: string;
  plant_name: string;
  unavailable_times: UnavailableTimes;
}

interface AvailablePump {
  id: string;
  // _id: string;
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
  available_pumps: AvailablePump[];
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

const steps = [
  { id: 1, name: "Schedule Details" },
  { id: 2, name: "Pump Selection" },
  { id: 3, name: "TM Selection" },
];

// Helper function to format date and time for tooltips
const formatDateTimeForTooltip = (dateTimeString: string): string => {
  const date = new Date(dateTimeString);
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    // timeZone: "UTC",
  });
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    // timeZone: "UTC",
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

export default function NewScheduleForm({ schedule_id }: { schedule_id?: string }) {
  const router = useRouter();
  const { fetchWithAuth } = useApiClient();
  const [step, setStep] = useState(schedule_id ? 2 : 1);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [pumpType, setPumpType] = useState<"line" | "boom">("line");
  const [selectedPump, setSelectedPump] = useState<string>("");
  const [tmSequence, setTMSequence] = useState<string[]>([]);
  const [calculatedTMs, setCalculatedTMs] = useState<CalculateTMResponse | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);
  const { profile } = useProfile();
  interface Step1FormData {
    scheduleDate: string;
    startTime: string;
    quantity: string;
    speed: string;
    onwardTime: string;
    pumpOnwardTime: string;
    returnTime: string;
    bufferTime: string;
    loadTime: string;
    concreteGrade: string;
    pump_start_time_from_plant: string;
    pumpFixingTime: string;
    pumpRemovalTime: string;
    unloadingTime: string;
    pumpingJob: string;
    floorHeight: string;
    pumpSiteReachTime: string;
    scheduleName: string;
    slumpAtSite: string;
    oneWayKm: string;
    siteSupervisorId: string;
  }

  const [formData, setFormData] = useState<Step1FormData>({
    scheduleDate: "",
    startTime: "",
    quantity: "",
    speed: "",
    onwardTime: "",
    pumpOnwardTime: "",
    returnTime: "",
    bufferTime: "",
    loadTime: "",
    concreteGrade: "",
    pump_start_time_from_plant: "",
    pumpFixingTime: "",
    pumpRemovalTime: "",
    unloadingTime: "",
    pumpingJob: "",
    floorHeight: "",
    pumpSiteReachTime: "",
    scheduleName: "",
    slumpAtSite: "160",
    oneWayKm: "",
    siteSupervisorId: "",
  });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [formDataRetrieved, setFormDataRetrieved] = useState(true);
  // Dropdown open state for custom dropdowns

  // const [isPumpDropdownOpen, setIsPumpDropdownOpen] = useState(false);
  // Add state for open/closed plant groups
  const [openPlantGroups, setOpenPlantGroups] = useState<Record<string, boolean>>({});
  const [overruleTMCount, setOverruleTMCount] = useState(false);
  const [customTMCount, setCustomTMCount] = useState(1);
  // 1. Add state for selectedProject and projects
  const [selectedProject, setSelectedProject] = useState<string>("");
  // Add state for project dropdown open/close

  // Add state for pumping job dropdown open/close

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

  const { data: pumpsData } = useQuery<Pump[]>({
    queryKey: ["pumps"],
    queryFn: async () => {
      const response = await fetchWithAuth("/pumps/");
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
        const response = await fetchWithAuth("/schedules");
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

  // Keep schedule name in form data for API payloads (only auto-set for new schedules)
  // NOTE: defined after computedScheduleName

  // Fix type inference for projects useQuery
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
  }, [motherPlantName, formData.scheduleDate, schedulesForDayCount]);

  const displayedScheduleName = schedule_id
    ? formData.scheduleName || computedScheduleName
    : computedScheduleName || formData.scheduleName;

  // Keep schedule name in form data for API payloads (only auto-set for new schedules)
  useEffect(() => {
    if (!schedule_id && computedScheduleName && formData.scheduleName !== computedScheduleName) {
      setFormData((prev) => ({ ...prev, scheduleName: computedScheduleName }));
      setHasChanged(true);
    }
  }, [computedScheduleName, schedule_id, formData.scheduleName]);

  const fetchSchedule = useCallback(async () => {
    try {
      const response = await fetchWithAuth(`/schedules/${schedule_id}`);
      const data = await response.json();
      if (data.success) {
        setSelectedClient(data.data.client_id);
        setSelectedProject(data.data.project_id);
        setSelectedPump(data.data.pump);
        setPumpType(data.data.pump_type || "line");
        const pumping_speed = data.data.input_params.pumping_speed;
        setFormData({
          scheduleDate: data.data.input_params.schedule_date,
          scheduleName: data.data.schedule_name,
          startTime: data.data.input_params.pump_start.split("T")[1],
          quantity: data.data.input_params.quantity.toString(),
          speed: pumping_speed.toString(),
          unloadingTime:
            data.data.input_params.unloading_time && data.data.input_params.unloading_time !== 0
              ? data.data.input_params.unloading_time.toString()
              : pumping_speed && avgTMCap
              ? ((avgTMCap / pumping_speed) * 60).toFixed(0)
              : "",
          pumpOnwardTime: data.data.input_params.pump_onward_time.toString(),
          onwardTime: data.data.input_params.onward_time.toString(),
          returnTime: data.data.input_params.return_time.toString(),
          bufferTime: data?.data?.input_params?.buffer_time?.toString(),
          loadTime: data?.data?.input_params?.load_time?.toString(),
          concreteGrade: data.data.concreteGrade,
          pump_start_time_from_plant: data.data.input_params.pump_start_time_from_plant
            ? data.data.input_params.pump_start_time_from_plant
            : "",
          pumpFixingTime: data.data.input_params.pump_fixing_time
            ? data.data.input_params.pump_fixing_time.toString()
            : "",
          pumpRemovalTime: data.data.input_params.pump_removal_time
            ? data.data.input_params.pump_removal_time.toString()
            : "",
          pumpingJob: data.data.pumping_job,
          floorHeight: data.data.floor_height ? data.data.floor_height.toString() : "",
          pumpSiteReachTime: data.data.pump_site_reach_time ? data.data.pump_site_reach_time.toString() : "",
          slumpAtSite: data.data.slump_at_site?.toString?.() || "160",
          oneWayKm: data.data.mother_plant_km?.toString?.() || "",
          siteSupervisorId: data.data.site_supervisor_id || "",
        });
        setComputedScheduleName(
          data?.data?.schedule_no ||
            `${motherPlantName}-${formatDateAsDDMMYY(formData.scheduleDate)}-${(schedulesForDayCount ?? 0) + 1}`
        );
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
          available_pumps: data?.data?.available_pumps,
        };
        setCalculatedTMs(tm_suggestions || null);
        setCustomTMCount(data?.data?.tm_overrule || data?.data?.tm_count || 1);
        setOverruleTMCount(
          data?.data?.tm_overrule && data?.data?.tm_count ? data?.data?.tm_overrule !== data?.data?.tm_count : false
        );
        return true;
      }
      return false;
    } catch (error) {
      setFormDataRetrieved(false);
      console.error("Error fetching schedule:", error);
      return false;
    }
  }, [schedule_id, fetchWithAuth, avgTMCap, formData.scheduleDate, motherPlantName, schedulesForDayCount]);

  const updateSchedule = async () => {
    if (!schedule_id) return false;
    try {
      const response = await fetchWithAuth(`/schedules/${schedule_id}`, {
        method: "PUT",
        body: JSON.stringify({
          schedule_no: computedScheduleName,
          client_id: selectedClient,
          project_id: selectedProject,
          pump: selectedPump,
          concreteGrade: formData.concreteGrade,
          pumping_speed: formData.speed,
          schedule_name: formData.scheduleName,
          pump_type: pumpType,
          input_params: {
            quantity: parseFloat(formData.quantity),
            pumping_speed: parseFloat(formData.speed),
            unloading_time: Math.round(parseFloat(formData.unloadingTime)),
            onward_time: parseFloat(formData.onwardTime),
            pump_onward_time: parseFloat(formData.pumpOnwardTime),
            return_time: parseFloat(formData.returnTime),
            buffer_time: parseFloat(formData.bufferTime),
            load_time: parseFloat(formData.loadTime),
            pump_start: `${formData.scheduleDate}T${formData.startTime}`,
            schedule_date: formData.scheduleDate,
            pump_start_time_from_plant: formData.pump_start_time_from_plant,
            pump_fixing_time: parseFloat(formData.pumpFixingTime),
            pump_removal_time: parseFloat(formData.pumpRemovalTime),
          },
          site_address: selectedProject ? projects.find((p) => p._id === selectedProject)?.address || "" : "",
          pumping_job: formData.pumpingJob,
          floor_height: parseFloat(formData.floorHeight),
          pump_site_reach_time: formData.pumpSiteReachTime,
          tm_overrule: customTMCount > 0 && overruleTMCount ? customTMCount : undefined,
          slump_at_site: formData.slumpAtSite ? parseFloat(formData.slumpAtSite) : undefined,
          mother_plant_km: formData.oneWayKm ? parseFloat(formData.oneWayKm) : undefined,
          site_supervisor_id: formData.siteSupervisorId || undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setHasChanged(false);

        // Update TM suggestions
        const tm_suggestions = {
          tm_count: data?.data?.tm_count,
          schedule_id: data?.data?._id,
          required_tms: data?.data?.required_tms,
          total_trips: data?.data?.total_trips,
          trips_per_tm: data?.data?.trips_per_tm,
          cycle_time: data?.data?.cycle_time,
          available_tms: data?.data?.available_tms,
          available_pumps: data?.data?.available_pumps,
        };
        setCalculatedTMs(tm_suggestions || null);
        setCustomTMCount(data?.data?.tm_overrule || data?.data?.tm_count || 1);
        setOverruleTMCount(
          data?.data?.tm_overrule && data?.data?.tm_count ? data?.data?.tm_overrule !== data?.data?.tm_count : false
        );

        return true;
      }
      return false;
    } catch (error) {
      console.error("Error updating schedule:", error);
      return false;
    }
  };

  useEffect(() => {
    if (schedule_id && clientsData && pumpsData) {
      fetchSchedule();
    }
  }, [schedule_id, clientsData, pumpsData]);

  useEffect(() => {
    setIsDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Special handling for quantity field to enforce 1-9999 range and no decimals
    if (name === "quantity") {
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 1 || numValue > 9999 || !Number.isInteger(numValue)) {
        // If invalid, don't update the field
        return;
      }
    }

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
      !formData.speed ||
      !formData.onwardTime ||
      !formData.pumpOnwardTime ||
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
            pump: selectedPump,
            concreteGrade: formData.concreteGrade,
            pumping_speed: formData.speed,
            pump_type: pumpType,
            schedule_name: formData.scheduleName,
            input_params: {
              quantity: parseFloat(formData.quantity),
              pumping_speed: parseFloat(formData.speed),
              onward_time: parseFloat(formData.onwardTime),
              pump_onward_time: parseFloat(formData.pumpOnwardTime),
              return_time: parseFloat(formData.returnTime),
              buffer_time: parseFloat(formData.bufferTime),
              load_time: parseFloat(formData.loadTime),
              pump_start: `${formData.scheduleDate}T${formData.startTime}`,
              schedule_date: formData.scheduleDate,
              pump_start_time_from_plant: formData.pump_start_time_from_plant,
              pump_fixing_time: parseFloat(formData.pumpFixingTime),
              pump_removal_time: parseFloat(formData.pumpRemovalTime),
              unloading_time: parseFloat(formData.unloadingTime),
            },
            site_address: selectedProject ? projects.find((p) => p._id === selectedProject)?.address || "" : "",
            pumping_job: formData.pumpingJob,
            floor_height: parseFloat(formData.floorHeight),
            pump_site_reach_time: formData.pumpSiteReachTime,
            tm_overrule: customTMCount > 0 && overruleTMCount ? customTMCount : undefined,
            slump_at_site: formData.slumpAtSite ? parseFloat(formData.slumpAtSite) : undefined,
            mother_plant_km: formData.oneWayKm ? parseFloat(formData.oneWayKm) : undefined,
            site_supervisor_id: formData.siteSupervisorId || undefined,
          }),
        });

        const data = await response.json();
        if (data.success) {
          setCalculatedTMs(data?.data);
          if (!schedule_id) router.push(`/pumping-schedules/${data?.data?._id}`);
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error calculating TMs:", error);
        return false;
      } finally {
        return setIsCalculating(false);
      }
    }
    if (schedule_id && clientsData && pumpsData) {
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
        body: JSON.stringify({ selected_tms: tmSequence, pump: selectedPump, type: "pumping" }),
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
      setStep(step + 1);
    } else if (step === 3) {
      const success = await generateSchedule();
      if (success) {
        // Redirect to view page instead of going to step 4
        router.push(`/pumping-schedules/${calculatedTMs?.schedule_id}/view`);
      }
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  // const filteredPumps = pumpsData?.filter((p: Pump) => p.type === pumpType) || [];
  const progressPercentage = ((step - 1) / (steps.length - 1)) * 100;

  useEffect(() => {
    // reset project when client changes
    if (!projects.some((p: Project) => p._id === selectedProject) && projects.length !== 0) setSelectedProject("");
  }, [selectedClient, projects, selectedProject]);

  // Helper to check if all required fields are filled
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
      !!formData.speed &&
      !!formData.pumpFixingTime &&
      !!formData.pumpRemovalTime &&
      !!formData.unloadingTime &&
      !!formData.pumpingJob &&
      !!formData.floorHeight &&
      !!formData.pumpOnwardTime &&
      !!formData.slumpAtSite &&
      !!formData.oneWayKm &&
      !!formData.siteSupervisorId
    );
  };

  const setPumpingSpeedAndUnloadingTime = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleInputChange(e);
    const { name, value } = e.target;
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

  // Build Date objects for schedule window and TM classification helpers (must be before any early returns)
  const scheduleStartDate = useMemo(() => {
    if (!formData.scheduleDate || !formData.startTime) return null;
    return new Date(`${formData.scheduleDate}T${formData.startTime}`);
  }, [formData.scheduleDate, formData.startTime]);

  const scheduleEndDate = useMemo(() => {
    if (!scheduleStartDate) return null;
    const quantityVal = parseFloat(formData.quantity) || 0;
    const speedVal = parseFloat(formData.speed) || 0;
    if (speedVal <= 0) return null;
    const pumpMinutesLocal = Math.round((quantityVal / speedVal) * 60);
    if (!pumpMinutesLocal) return null;
    return new Date(scheduleStartDate.getTime() + pumpMinutesLocal * 60 * 1000);
  }, [scheduleStartDate, formData.quantity, formData.speed]);

  type TMAvailabilityClass = "available" | "partially_unavailable" | "unavailable";
  const classifyTMAvailability = useCallback(
    (tm: AvailableTM, windowStart: Date | null, windowEnd: Date | null): TMAvailabilityClass => {
      if (tm.availability) return "available";
      if (!windowStart || !windowEnd) return tm.availability ? "available" : "unavailable";

      const entries: UnavailableTimeEntry[] = tm?.unavailable_times ? Object.values(tm.unavailable_times) : [];
      if (entries.length === 0) return "available";

      let hasOverlap = false;
      let isNearWithinHour = false;
      const oneHourMs = 60 * 60 * 1000;

      for (const entry of entries) {
        const entryStart = new Date(entry.start);
        const entryEnd = new Date(entry.end);
        if (entryStart.getTime() < windowEnd.getTime() && windowEnd.getTime() <= entryEnd.getTime())
          return "unavailable";

        if (windowStart.getTime() < entryEnd.getTime() && entryEnd.getTime() <= windowEnd.getTime()) {
          if ((entryEnd.getTime() - windowStart.getTime()) / 3600000 > 1) return "unavailable";
          return "partially_unavailable";
        }
        // const latestStart = Math.max(windowStart.getTime(), entryStart.getTime());
        // const earliestEnd = Math.min(windowEnd.getTime(), entryEnd.getTime());
        // const overlap = latestStart < earliestEnd;
        // if (overlap) {
        //   hasOverlap = true;
        //   break;
        // }

        // let gapMs = 0;
        // if (windowEnd.getTime() <= entryStart.getTime()) {
        //   gapMs = entryStart.getTime() - windowEnd.getTime();
        // } else if (entryEnd.getTime() <= windowStart.getTime()) {
        //   gapMs = windowStart.getTime() - entryEnd.getTime();
        // }
        // if (gapMs > 0 && gapMs < oneHourMs) {
        //   isNearWithinHour = true;
        // }
      }

      // if (hasOverlap) return "unavailable";
      // if (isNearWithinHour) return "partially_unavailable";
      return "available";
    },
    []
  );

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

  const buffer = parseFloat(formData.bufferTime) || 0;
  const load = parseFloat(formData.loadTime) || 0;
  const onward = parseFloat(formData.onwardTime) || 0;
  const unload = parseFloat(formData.unloadingTime) || 0;
  const ret = parseFloat(formData.returnTime) || 0;

  // Custom SVG Donut Chart
  const cycleTimeData = [
    { label: "Buffer", shortLabel: "Load", value: buffer, color: "#3b82f6" },
    { label: "Loading", shortLabel: "Load", value: load, color: "#ef4444" },
    { label: "Onward Journey", shortLabel: "Onward", value: onward, color: "#f59e0b" },
    { label: "TM Unloading", shortLabel: "Unload", value: unload, color: "#10b981" },
    { label: "Return Journey", shortLabel: "Return", value: ret, color: "#8b5cf6" },
  ];

  const DonutChart = ({
    data,
    size = 280,
  }: {
    data: { shortLabel: string; label: string; value: number; color: string }[];
    size?: number;
  }) => {
    const center = size / 2;
    const radius = size * 0.5;
    const innerRadius = radius * 0.6;
    const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
    if (total === 0) return <div className="flex items-center justify-center h-64">No data</div>;
    let currentAngle = -Math.PI / 2;
    return (
      <div className="relative w-fit">
        <svg width={size} height={size} className="transform rotate-0">
          {data.map((item, index) => {
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
                      fontWeight=""
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
                      {/* {percentage.toFixed(0)}% */}
                    </text>
                  </>
                )}
              </g>
            );
          })}
          <text
            x={center}
            y={center - 8}
            textAnchor="middle"
            fill="#374151"
            fontSize="16"
            fontWeight="bold"
            className="pointer-events-none"
          >
            Total
          </text>
          <text
            x={center}
            y={center + 12}
            textAnchor="middle"
            fill="#374151"
            fontSize="18"
            fontWeight="bold"
            className="pointer-events-none"
          >
            {total} min
          </text>
        </svg>
      </div>
    );
  };

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

  // const cycleTimeHr = cycleTimeMin / 60;
  const totalPumpingHours = speed > 0 ? quantity / speed : 0;
  const loads = Math.ceil((parseFloat(formData.quantity) || 0) / (avgTMCap && avgTMCap > 0 ? avgTMCap : 1));
  // const m3PerTM = tripsPerTM * (avgTMCap && avgTMCap > 0 ? avgTMCap : 1);
  const tmReq = cycleTimeMin > 0 ? Math.ceil(cycleTimeMin / parseFloat(formData.unloadingTime)) : 0;
  const additionalTMValue = overruleTMCount ? Math.max(0, (customTMCount || 0) - tmReq) : 0;
  const totalTMRequired = overruleTMCount ? customTMCount : tmReq;
  const tripsPerTM = tmReq > 0 ? loads / totalTMRequired : 0;
  // const totalTrips = tmReq > 0 ? Math.ceil(tripsPerTM * tmReq) + 1 : 0;
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

  // REMOVED: duplicate schedule window and classifier (moved earlier to avoid conditional hooks)

  // Estimated TM trip distribution for Step 1 (pre-generation)
  const tripsPerTMExact = tripsPerTM > 0 ? tripsPerTM : 0;
  const floorTripsPerTM = Math.floor(tripsPerTMExact);
  const ceilTripsPerTM = Math.ceil(tripsPerTMExact);
  // const totalTripsApprox = totalTMRequired > 0 ? Math.max(0, Math.round(tripsPerTMExact * totalTMRequired)) : 0;
  const numCeilTms = loads - floorTripsPerTM * totalTMRequired;
  const numFloorTms = totalTMRequired > 0 ? Math.max(0, totalTMRequired - numCeilTms) : 0;

  const createUnavailableInfo = (unavailableTimes: UnavailableTimes): ReactNode => {
    const entries: UnavailableTimeEntry[] = unavailableTimes ? Object.values(unavailableTimes) : [];
    if (!entries || entries.length === 0) {
      return (
        <div className="flex items-center text-xs text-red-600 dark:text-red-400">
          <Ban className="w-3.5 h-3.5 mr-1" />
          <span className="font-medium">Full day unavailable</span>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {entries.map((time, index) => (
          <div key={index} className="flex items-center text-xs text-red-600 dark:text-red-400 rounded-md px-2 py-1">
            <Clock className="w-3.5 h-3.5 mr-2 shrink-0" />
            <div className="flex flex-col">
              <span className="font-medium">
                {formatDateTimeForTooltip(time.start)} – {formatDateTimeForTooltip(time.end)}
              </span>
              {time.schedule_no && (
                <span className="text-[11px] text-red-500 dark:text-red-300">Schedule #{time.schedule_no}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full mx">
      <div className="flex flex-row w-full mb-4 items-center">
        <div className="w-1/3">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">New Pumping Schedule</h2>
          <p className="text-gray-500 dark:text-gray-400">Step {step} of 4</p>
        </div>
        <div className="w-full">
          <div className="relative">
            {/* Background Bar */}
            <div className="absolute top-3 left-0 right-3 h-0.5 bg-gray-300 dark:bg-gray-600 rounded-full" />

            {/* Animated Progress Bar */}
            <motion.div
              className="absolute top-3 left-0  h-0.5 bg-brand-500 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            />

            {/* Steps */}
            <div className="relative flex justify-between">
              {steps.map((s, index) => (
                <motion.div
                  key={s.id}
                  className={`flex flex-col ${index == 0 ? "items-start" : index == 2 ? "items-end" : "items-center"} `}
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
                          color: step >= s.id ? "#ffffff" : isDarkMode ? "#9ca3af" : "#6b7280", // dark:text-gray-400 vs text-gray-500
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

                  {/* Active Step Pulse */}
                  {/* {step === s.id && (
                    <motion.div
                      className="absolute w-8 h-8 bg-brand-500 rounded-full opacity-20 -top-1 -left-1"
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.2, 0, 0.2],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  )} */}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        {step === 1 ? (
          <div className="space-y-4">
            {/* Client Details Section */}
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
                      {displayedScheduleName || "Select Project and Schedule Date first"}
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
                      {new Date().toLocaleDateString("en-US", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
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
                {clientsLoading ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Choose Client
                    </label>
                    <div className="h-11  min-w-full max-w-fit rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                      Loading clients...
                    </div>
                  </div>
                ) : (
                  <SearchableDropdown
                    options={clientsData || []}
                    value={selectedClient}
                    onChange={(value) => {
                      setSelectedClient(value);
                      setHasChanged(true);
                    }}
                    getOptionLabel={(client: Client) => client.name}
                    getOptionValue={(client: Client) => client._id}
                    placeholder="Select a client"
                    label="Choose Client"
                    required
                  />
                )}
                {/* Project Selection */}
                {!selectedClient ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Choose Project
                    </label>
                    <div className="h-11 min-w-full max-w-fit rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
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
                    onChange={(value) => {
                      setSelectedProject(value);
                      setHasChanged(true);
                    }}
                    getOptionLabel={(project: Project) => project.name}
                    getOptionValue={(project: Project) => project._id}
                    placeholder={projects.length === 0 ? "No projects available" : "Select a project"}
                    label="Choose Project"
                    disabled={projects.length === 0}
                    required
                  />
                )}
                <div className={`flex gap-4 w-full}`}>
                  {/* Project Details */}
                  {selectedProject && projects.find((p) => p._id === selectedProject) && (
                    <div className="w-full flex flex-col justify-start">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Project Details
                      </label>
                      <div className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                        <p className="text-sm text-gray-600 dark:text-gray-600 whitespace-normal break-words">
                          <span
                            title={
                              (projects.find((p) => p._id === selectedProject)?.contact_name || "") +
                              " - " +
                              (projects.find((p) => p._id === selectedProject)?.contact_number || "")
                            }
                          >
                            {(() => {
                              const contactName = projects.find((p) => p._id === selectedProject)?.contact_name || "";
                              const contactNumber =
                                projects.find((p) => p._id === selectedProject)?.contact_number || "";
                              return `${contactName} - ${contactNumber}`;
                            })()}
                          </span>
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-600 whitespace-normal break-words">
                          {projects.find((p) => p._id === selectedProject)?.address}
                        </p>
                      </div>
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

                {/* Pumping Quantity */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Pumping Quantity (m³)
                  </label>
                  <Input
                    type="number"
                    name="quantity"
                    value={parseFloat(formData.quantity)}
                    onChange={handleInputChange}
                    placeholder="Enter quantity (1-9999)"
                    min="1"
                    max="9999"
                    step={1}
                    hint="Enter a whole number between 1 and 9999"
                  />
                </div>
                {/* Slump at Site */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Slump at Site (mm)
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      name="slumpAtSite"
                      value={parseFloat(formData.slumpAtSite)}
                      onChange={(e) => {
                        const v = e.target.value;
                        setFormData((prev) => ({ ...prev, slumpAtSite: v }));
                        setHasChanged(true);
                      }}
                      placeholder="160"
                    />
                  </div>
                </div>
                {/* One way Km from Mother Plant */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    One way Km from Mother Plant (km)
                  </label>
                  <Input
                    type="number"
                    name="oneWayKm"
                    value={formData.oneWayKm ? parseFloat(formData.oneWayKm) : ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData((prev) => ({ ...prev, oneWayKm: v }));
                      setHasChanged(true);
                    }}
                    placeholder="Enter kilometers"
                  />
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
                {/* Site Supervisor */}
                <SearchableDropdown
                  options={scheduleTeamMembers || []}
                  value={formData.siteSupervisorId}
                  onChange={(value) => {
                    setFormData((prev) => ({ ...prev, siteSupervisorId: value }));
                    setHasChanged(true);
                  }}
                  getOptionLabel={(member: TeamMember) => member.name}
                  getOptionValue={(member: TeamMember) => member._id}
                  placeholder="Select supervisor"
                  label="Site Supervisor"
                />
                {/* Placement Zone */}
                <SearchableDropdown
                  options={["SLAB", "Raft", "PCC / Footing", "Road", "Piling", "Screed", "Colomn / Beam", "Wall"]}
                  value={formData.pumpingJob}
                  onChange={(value) => {
                    setFormData((prev) => ({ ...prev, pumpingJob: value }));
                    setHasChanged(true);
                  }}
                  getOptionLabel={(option: string) => option}
                  getOptionValue={(option: string) => option}
                  placeholder="Select Zone"
                  label="Placement Zone"
                />
              </div>

              <div className="grid grid-cols-6 gap-6 mt-6">
                {/* Floor Height (Pumping) */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Floor (Pumping)
                  </label>
                  <Input
                    type="number"
                    name="floorHeight"
                    value={formData.floorHeight ? parseFloat(formData.floorHeight) : ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      const numValue = parseFloat(value);
                      if (value === "" || (numValue >= 1 && numValue <= 99 && Number.isInteger(numValue))) {
                        handleInputChange(e);
                      }
                    }}
                    placeholder="Enter floor between 1 to 99"
                    min="1"
                    max="99"
                  />
                </div>

                {/* Pump Type Selection */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Pump Type</label>
                  <div className="flex flex-wrap items-center flex-row gap-6">
                    <Radio
                      id="line-pump"
                      name="pump-type"
                      value="line"
                      checked={pumpType === "line"}
                      onChange={(value) => {
                        setPumpType(value as "line" | "boom");
                        setSelectedPump("");
                        setHasChanged(true);
                      }}
                      label="Line"
                    />
                    <Radio
                      id="boom-pump"
                      name="pump-type"
                      value="boom"
                      checked={pumpType === "boom"}
                      onChange={(value) => {
                        setPumpType(value as "line" | "boom");
                        setSelectedPump("");
                        setHasChanged(true);
                      }}
                      label="Boom"
                    />
                  </div>
                </div>

                {/* Schedule Date of Pumping */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Schedule Date of Pumping
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
                {/* Pump Start Time */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Pump Start Time ({profile?.preferred_format})
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

                {/* Pumping Hours (read-only) */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Pumping Hours
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
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Pump End Time ({profile?.preferred_format})
                  </label>
                  <div className="relative">
                    <TimeInput
                      type="time"
                      name="endTime"
                      format={profile?.preferred_format === "12h" ? "h:mm a" : "hh:mm"}
                      value={pumpEndTime}
                      disabled
                      className="cursor-not-allowed bg-gray-100 dark:bg-gray-800"
                    />
                    <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                      <Clock className="size-5" />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pump Details Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 pb-3 bg-white dark:bg-gray-900/30">
              <div className="flex justify-between items-center mb-4 w-full">
                <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-4 flex justify-between items-center">
                  Pump Details
                </h3>
              </div>

              <div className="grid grid-cols-10 gap-6 mb-6 ">
                {/* Pump Onward Time */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Pump Onward Time (min)
                  </label>
                  <Input
                    type="number"
                    name="pumpOnwardTime"
                    value={formData.pumpOnwardTime || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      const numValue = parseFloat(value);
                      if (value === "" || (numValue >= 1 && numValue <= 600 && Number.isInteger(numValue))) {
                        handleInputChange(e);
                      }
                    }}
                    placeholder="Enter pump onward time from plant (1-600)"
                    min="1"
                    max="600"
                  />
                </div>

                {/* Pipeline Fixing Time */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Pipeline Fixing Time (min)
                  </label>
                  <Input
                    type="number"
                    name="pumpFixingTime"
                    value={formData.pumpFixingTime || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      const numValue = parseFloat(value);
                      if (value === "" || (numValue >= 1 && numValue <= 600 && Number.isInteger(numValue))) {
                        handleInputChange(e);
                      }
                    }}
                    placeholder="Enter pump fixing time (1-600)"
                    min="1"
                    max="600"
                  />
                </div>

                {/* Pipeline Removal Time */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Pipeline Removal Time (min)
                  </label>
                  <Input
                    type="number"
                    name="pumpRemovalTime"
                    value={formData.pumpRemovalTime || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      const numValue = parseFloat(value);
                      if (value === "" || (numValue >= 1 && numValue <= 600 && Number.isInteger(numValue))) {
                        handleInputChange(e);
                      }
                    }}
                    placeholder="Enter pump removal time (1-600)"
                    min="1"
                  />
                </div>

                {/* Pumping Speed + OR + Unloading Time */}
                <div className="col-span-4">
                  <div className="flex items-start gap-4">
                    {/* Pumping Speed */}
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Pumping Speed (m³/hr)
                      </label>
                      <Input
                        type="number"
                        name="speed"
                        value={parseFloat(formData.speed)}
                        onChange={setPumpingSpeedAndUnloadingTime}
                        placeholder="Enter speed"
                      />
                    </div>

                    {/* OR separator */}
                    <div className="flex items-center text-sm text-gray-600 pt-10">or</div>

                    {/* Unloading Time */}
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Unloading Time (min)
                      </label>
                      <div className="flex flex-col gap-1">
                        <Input
                          type="number"
                          name="unloadingTime"
                          value={parseFloat(formData.unloadingTime)}
                          onChange={setPumpingSpeedAndUnloadingTime}
                          placeholder={
                            avgTMCap !== null
                              ? "Auto-calculated from pumping speed"
                              : "Enter pumping speed to calculate"
                          }
                        />
                        {avgTMCap !== null && (
                          <p className="text-xs text-gray-500">
                            Auto-calculated based on avg. TM cpty: {avgTMCap?.toFixed(0)} m³
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Transit Mixer Trip Log Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-white dark:bg-gray-900/30">
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-4">Transit Mixer Trip Log</h3>

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

                      {/* Loading Time */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center min-w-0 flex-1">
                          <span
                            className="w-2.5 h-2.5 rounded-sm mr-2 flex-shrink-0"
                            style={{ backgroundColor: "#3b82f6" }}
                          ></span>
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-0">
                            LoadingTime (min)
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
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center">
                            <span
                              className="w-2.5 h-2.5 rounded-sm mr-2 flex-shrink-0"
                              style={{ backgroundColor: "#10b981" }}
                            ></span>
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-0">
                              TM Unloading Time (min)
                            </label>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 ml-4.5 mt-0.5">
                            Auto-filled from Pumping Speed.
                          </p>
                        </div>
                        <div className="w-20 flex-shrink-0">
                          <Input
                            type="number"
                            name="unloadingTime"
                            value={parseFloat(formData.unloadingTime)}
                            onChange={handleInputChange}
                            placeholder="0"
                            disabled
                            className="w-full text-right bg-gray-50 dark:bg-gray-800 text-xs h-7"
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

                  {/* Fleet Sizing Section moved to right column */}
                </div>

                {/* Center Section: Donut Chart */}
                <div className="lg:col-span-4 flex items-center justify-center">
                  <div className="bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-xl p-6 w-full">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-6 text-center">
                      Cycle Time Breakdown
                    </h3>
                    <div className="flex justify-center">
                      <DonutChart data={cycleTimeData} size={280} />
                    </div>
                  </div>
                </div>

                {/* Right Section: Fleet Sizing + TM Trip Distribution (stacked) */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Fleet Sizing Section (moved here) */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Fleet Sizing</h3>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between py-2 border-b border-blue-200/60 dark:border-blue-800/60">
                        <span className="text-xs font-medium text-gray-900 dark:text-white">
                          Optimum Fleet: Zero Wait, Non-Stop Pour
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white min-w-[2rem] text-right">
                          {tmReq > 0 ? tmReq : "-"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-2 border-b border-blue-200/60 dark:border-blue-800/60">
                        <span className="text-xs font-medium text-gray-900 dark:text-white">TMs Additional</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="w-6 h-6 bg-white/90 dark:bg-gray-700 rounded flex items-center justify-center text-sm font-bold hover:bg-white dark:hover:bg-gray-600 transition-colors"
                            onClick={() => {
                              if (tmReq <= 0) return;
                              const nextAdditional = Math.max(0, additionalTMValue - 1);
                              const nextTotal = Math.max(1, tmReq + nextAdditional);
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
                            value={tmReq > 0 ? additionalTMValue : 0}
                            onChange={(e) => {
                              const raw = parseInt(e.target.value || "0", 10);
                              const add = isNaN(raw) ? 0 : Math.max(0, raw);
                              if (tmReq <= 0) return;
                              const nextTotal = Math.max(1, tmReq + add);
                              setOverruleTMCount(add > 0);
                              setCustomTMCount(nextTotal);
                              setHasChanged(true);
                            }}
                          />

                          <button
                            type="button"
                            className="w-6 h-6 bg-white/90 dark:bg-gray-700 rounded flex items-center justify-center text-sm font-bold hover:bg-white dark:hover:bg-gray-600 transition-colors"
                            onClick={() => {
                              if (tmReq <= 0) return;
                              const nextAdditional = additionalTMValue + 1;
                              const nextTotal = Math.max(1, tmReq + nextAdditional);
                              setOverruleTMCount(true);
                              setCustomTMCount(nextTotal);
                              setHasChanged(true);
                            }}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between py-2">
                        <span className="text-xs font-semibold text-gray-900 dark:text-white">Total TM Required</span>
                        <span className="text-base font-bold text-blue-600 dark:text-blue-400 min-w-[2rem] text-right">
                          {totalTMRequired > 0 ? totalTMRequired : "-"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* TM Trip Distribution */}
                  <div className="bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-3">
                      TM Trip Distribution
                    </h3>
                    {(() => {
                      if (totalTMRequired <= 0 || tripsPerTMExact <= 0) {
                        return (
                          <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400 text-sm">
                            Enter inputs to see estimated distribution.
                          </div>
                        );
                      }
                      const rows = [];
                      if (floorTripsPerTM === ceilTripsPerTM) {
                        const tmCount = totalTMRequired;
                        const trips = floorTripsPerTM;
                        rows.push({ tmCount, trips, totalTrips: tmCount * trips });
                      } else {
                        if (numCeilTms > 0)
                          rows.push({
                            tmCount: numCeilTms,
                            trips: ceilTripsPerTM,
                            totalTrips: numCeilTms * ceilTripsPerTM,
                          });
                        if (numFloorTms > 0)
                          rows.push({
                            tmCount: numFloorTms,
                            trips: floorTripsPerTM,
                            totalTrips: numFloorTms * floorTripsPerTM,
                          });
                        rows.sort((a, b) => b.trips - a.trips);
                      }
                      const totalTMs = rows.reduce((s, r) => s + r.tmCount, 0);
                      const totalTrips = rows.reduce((s, r) => s + r.totalTrips, 0);

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
                                  {totalTrips}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </div>
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
        ) : step === 2 ? (
          !calculatedTMs || !plantsData ? (
            <div className="flex justify-center items-center py-12">
              <Spinner text="Loading pumps..." />
            </div>
          ) : (
            <div className="space-y-6">
              {calculatedTMs && calculatedTMs.available_pumps && (
                <>
                  {calculatedTMs.available_pumps.length < 1 ? (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center justify-between">
                      <span>Not enough available Pumps to fulfill the requirement. Please add more Pumps.</span>
                      <a
                        href="/pumps"
                        className="ml-4 px-3 py-1 bg-brand-500 text-white rounded hover:bg-brand-600 transition-colors text-sm font-medium"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Add Pumps
                      </a>
                    </div>
                  ) : null}
                </>
              )}

              <div className="grid grid-cols-2 gap-6">
                {/* Left Column - Pump Selection */}
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">Select Pump</h3>
                  <RadioGroup
                    value={selectedPump}
                    onValueChange={(val) => {
                      setSelectedPump(val);
                      setHasChanged(true);
                    }}
                    className="space-y-4"
                  >
                    {calculatedTMs && calculatedTMs.available_pumps && calculatedTMs.available_pumps.length > 0 ? (
                      (() => {
                        const plantIdToName = (plantsData || []).reduce((acc, plant) => {
                          acc[plant._id] = plant.name;
                          return acc;
                        }, {} as Record<string, string>);
                        const grouped: Record<string, typeof calculatedTMs.available_pumps> = {};
                        calculatedTMs.available_pumps.forEach((pump) => {
                          const group = pump.plant_id ? plantIdToName[pump.plant_id] || "Unassigned" : "Unassigned";
                          if (!grouped[group]) grouped[group] = [];
                          grouped[group].push(pump);
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
                          const pumps = grouped[plant];
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
                                  {pumps.length}
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
                                      {pumps.map((pump, idx) => (
                                        <label
                                          key={pump.id}
                                          className={`flex items-center justify-between px-3 py-2 mb-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:hover:bg-gray-800/50  ${
                                            !pump.availability
                                              ? "opacity-50 cursor-not-allowed"
                                              : "cursor-pointer hover:bg-gray-100"
                                          } `}
                                        >
                                          <div className="flex flex-row items-center space-x-4 w-full">
                                            <span className="w-5 text-xs text-gray-500">{idx + 1}.</span>
                                            <input
                                              type="checkbox"
                                              checked={selectedPump === pump.id}
                                              disabled={!pump.availability}
                                              onChange={(e) => {
                                                if (e.target.checked) {
                                                  setSelectedPump(pump.id);
                                                } else {
                                                  setSelectedPump("");
                                                }
                                                setHasChanged(true);
                                              }}
                                              className="h-4 w-4 text-brand-500 rounded border-gray-300 focus:ring-brand-500"
                                            />
                                            <div className="flex flex-row w-full justify-between">
                                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                {pump.identifier}
                                              </p>
                                              <div className="flex flex-row items-end gap-2">
                                                {!pump.availability && (
                                                  <>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 text-right">
                                                      Unavailable -
                                                    </p>
                                                    <Tooltip content={createTooltip(pump.unavailable_times)}>
                                                      <CircleQuestionMark size={15} />
                                                    </Tooltip>
                                                  </>
                                                )}
                                                {/* <p className="text-sm text-gray-500 dark:text-gray-400 text-right">
                                                {pump.capacity}m³
                                              </p> */}
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
                        No pumps available for selection
                      </div>
                    )}
                  </RadioGroup>
                </div>

                {/* Right Column - Chosen Pump */}
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">Chosen Pump</h3>
                  <div className="space-y-2">
                    {selectedPump && calculatedTMs && calculatedTMs.available_pumps ? (
                      (() => {
                        const pump = calculatedTMs.available_pumps.find((p) => p.id.toString() === selectedPump);
                        if (!pump) return <div className="text-gray-500 dark:text-gray-400">Pump not found</div>;
                        const plantName =
                          (plantsData || []).find((pl) => pl._id === pump.plant_id)?.name || "Unassigned";
                        return (
                          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-700 dark:text-white">{pump.identifier}</span>
                                <span className="text-xs px-2 py-1 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-full">
                                  {plantName}
                                </span>
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                Capacity: {pump.capacity} m³
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                Availability: {pump.availability ? "Available" : "Unavailable"}
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-center py-4 text-gray-500 dark:text-gray-400">No pump selected</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mt-8">
                <Button variant="outline" onClick={handleBack} className="flex items-center gap-2">
                  <ArrowLeft size={16} />
                  Back
                </Button>
                <div className="flex items-end gap-4">
                  <Button onClick={handleNext} className="flex items-center gap-2" disabled={!selectedPump}>
                    Next Step
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </div>
            </div>
          )
        ) : step === 3 ? (
          // Loader for Step 3
          !calculatedTMs || !plantsData ? (
            <div className="flex justify-center items-center py-12">
              <Spinner text="Loading TMs..." />
            </div>
          ) : (
            <div className="space-y-6">
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
                              <Plus className="w-4 h-4 text-gray-400" />
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
                {/* Left Column - TM Selection */}
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">
                    Select {overruleTMCount ? customTMCount : calculatedTMs.tm_count || "N/A"} TMs
                  </h3>
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
                                                  const status = classifyTMAvailability(
                                                    tm as unknown as AvailableTM,
                                                    scheduleStartDate,
                                                    scheduleEndDate
                                                  );
                                                  return status === "unavailable";
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
                                                    {tm.capacity}m³
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
                  <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">
                    {tmSequence.length}/{overruleTMCount ? customTMCount : calculatedTMs.tm_count || "N/A"} selected -
                    Arrange
                  </h3>
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
                                    {/* <span className="text-sm text-gray-500 dark:text-gray-400">({tm?.capacity}m³)</span> */}
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

              <div className="flex justify-between items-center mt-8 gap-0">
                <Button variant="outline" onClick={handleBack} className="flex items-center gap-2">
                  <ArrowLeft size={16} />
                  Back
                </Button>
                <div className="flex items-center gap-4 justify-end flex-1">
                  {/* Warning message */}
                  {tmSequence.length !== (overruleTMCount ? customTMCount : calculatedTMs?.tm_count) && (
                    <div className="p-2 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg text-xs">
                      Select{" "}
                      <span className="font-semibold">{overruleTMCount ? customTMCount : calculatedTMs?.tm_count}</span>{" "}
                      TMs
                      {!overruleTMCount && " to get optimum schedule."}
                      {overruleTMCount && "."}
                    </div>
                  )}
                  {/* Overrule Checkbox in a rounded box */}

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
                    {isGenerating ? "Generating..." : "Next Step"}
                    {!isGenerating && <ArrowRight size={16} />}
                  </Button>
                </div>
              </div>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}

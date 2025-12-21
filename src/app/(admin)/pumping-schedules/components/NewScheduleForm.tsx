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
  Search,
  Building,
  Truck,
  MapPin,
} from "lucide-react";
import { Reorder, motion, AnimatePresence } from "framer-motion";
import { useApiClient } from "@/hooks/useApiClient";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { RadioGroup } from "@/components/ui/radio";
import { useProfile } from "@/hooks/useProfile";
import TimeInput from "@/components/form/input/TimeInput";
// Removed Chart.js pie in favor of custom SVG DonutChart
import { Spinner } from "@/components/ui/spinner";
import Tooltip from "@/components/ui/tooltip";
import { cn, formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useToast, createApiActionToast } from "@/hooks/useToast";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

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
  plant_id: string;
  plant_name: string;
  identifier: string;
  availability: boolean;
  type: "line" | "boom";
  status: "active" | "inactive";
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

interface AvailableVehicle {
  id: string;
  _id: string;
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
  available_tms: AvailableVehicle[];
  available_pumps: AvailableVehicle[];
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

interface PastSchedule {
  _id: string;
  schedule_no: string;
  client_id: string;
  client_name: string;
  project_id: string;
  project_name: string;
  plant_id: string;
  plant_name: string;
  pump_type: "line" | "boom";
  concreteGrade: string;
  pumping_job: string;
  input_params: {
    quantity: number;
    schedule_date: string;
    pump_onward_time: number;
    onward_time: number;
    return_time: number;
    buffer_time: number;
    load_time: number;
    pump_fixing_time: number;
    pump_removal_time: number;
    pump_start: number;
  };
  floor_height: number;
  pump_site_reach_time: string;
  tm_overrule?: number;
  slump_at_site?: number;
  mix_code?: string;
  remarks?: string;
  mother_plant_km?: number;
  site_supervisor_id?: string;
  cube_at_site?: boolean;
  credit_terms?: string;
  field_technician_id?: string;
}

const steps = [
  { id: 1, name: "Pour Details" },
  { id: 1.1, name: "Transit Mixer Trip Log", type: "subStep" },
  { id: 2, name: "Pump Selection" },
  { id: 3, name: "TM Selection" },
];

const pumpColors = {
  line: "bg-blue-100 text-blue-700",
  boom: "bg-green-100 text-green-700",
};

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

export default function NewScheduleForm({ schedule_id }: { schedule_id?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const template = searchParams.get("template");
  const { data: session, status } = useSession();
  const { fetchWithAuth } = useApiClient();
  const { } = useToast();
  const { startAction, completeAction } = createApiActionToast();
  const [step, setStep] = useState(schedule_id ? 2 : 0);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [pumpType, setPumpType] = useState<"line" | "boom">("line");
  const [selectedPump, setSelectedPump] = useState<string>("");
  const [selectedPastSchedule, setSelectedPastSchedule] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showPastList, setShowPastList] = useState(false);

  // Query for past schedules
  const { data: pastSchedules, isLoading: pastSchedulesLoading } = useQuery<PastSchedule[]>({
    queryKey: ["past-schedules"],
    queryFn: async () => {
      const response = await fetchWithAuth("/schedules");
      const data = await response.json();
      if (data.success) {
        return data.data;
      }
      return [];
    },
  });
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
    pump_start: string;
    pumpFixingTime: string;
    pumpRemovalTime: string;
    unloadingTime: string;
    pumpingJob: string;
    floorHeight: string;
    pumpSiteReachTime: string;
    slumpAtSite: string;
    mixCode: string;
    remarks: string;
    oneWayKm: string;
    siteSupervisorId: string;
    cubeAtSite: boolean;
    creditTerms: string;
    fieldTechnicianId: string;
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
    pump_start: "",
    pumpFixingTime: "",
    pumpRemovalTime: "",
    unloadingTime: "",
    pumpingJob: "",
    floorHeight: "",
    pumpSiteReachTime: "",
    slumpAtSite: "",
    mixCode: "",
    remarks: "",
    oneWayKm: "",
    siteSupervisorId: "",
    cubeAtSite: false,
    creditTerms: "",
    fieldTechnicianId: "",
  });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [formDataRetrieved, setFormDataRetrieved] = useState(true);

  // Sync pipeline fixing/removal times with pump type
  useEffect(() => {
    if (pumpType === "boom") {
      setFormData((prev) => ({
        ...prev,
        pumpFixingTime: "0",
        pumpRemovalTime: "0",
      }));
    } else if (pumpType === "line") {
      setFormData((prev) => ({
        ...prev,
        pumpFixingTime: prev.pumpFixingTime === "0" ? "" : prev.pumpFixingTime,
        pumpRemovalTime: prev.pumpRemovalTime === "0" ? "" : prev.pumpRemovalTime,
      }));
    }
  }, [pumpType]);
  // Dropdown open state for custom dropdowns

  // const [isPumpDropdownOpen, setIsPumpDropdownOpen] = useState(false);
  // Add state for open/closed plant groups
  const [openPlantGroups, setOpenPlantGroups] = useState<Record<string, boolean>>({});
  const [overruleTMCount, setOverruleTMCount] = useState(false);
  const [customTMCount, setCustomTMCount] = useState(1);
  const [isBurstModel, setIsBurstModel] = useState(false);
  // 1. Add state for selectedProject and projects
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedPlant, setSelectedPlant] = useState<string>("");
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

  const { data: plantsData } = useQuery<{ _id: string; name: string; capacity: number }[]>({
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

  // Filter field technicians from schedule team members
  const fieldTechnicians = useMemo(() => {
    if (!scheduleTeamMembers) return [];
    return scheduleTeamMembers.filter((member) => member.designation === "field-technician");
  }, [scheduleTeamMembers]);

  // Filter site supervisors from schedule team members
  const siteSupervisors = useMemo(() => {
    if (!scheduleTeamMembers) return [];
    return scheduleTeamMembers.filter((member) => member.designation === "site-supervisor");
  }, [scheduleTeamMembers]);

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
  const avgTMCap = Math.ceil(avgTMCapData?.average_capacity || 0) ?? null;

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
  const motherPlantName = selectedPlant
    ? (plantsData || []).find((plant) => plant._id === selectedPlant)?.name || "Unknown Plant"
    : "";

  // Build computed and displayed schedule names
  const [computedScheduleName, setComputedScheduleName] = useState("");

  // Prefill unloading time when project changes
  useEffect(() => {
    if (
      !selectedProject ||
      !avgTMCap ||
      formData.unloadingTime ||
      !projects ||
      projects.length === 0 ||
      !plantsData ||
      plantsData.length === 0
    )
      return;
    if (!selectedPlant) return;
    const capacity = plantsData.find((plant) => plant._id === selectedPlant)?.capacity;
    if (!capacity) return;
    const loadTime = Math.ceil(capacity / avgTMCap / 5) * 5;

    if (!formData.unloadingTime) {
      setFormData((prev) => ({
        ...prev,
        loadTime: loadTime.toFixed(0),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject, avgTMCap, projects, plantsData]);

  // Template handling - prefill form when template is selected
  useEffect(() => {
    if (!template || template === "none" || schedule_id || pastSchedulesLoading) return;
    setSelectedPastSchedule(template);
    if (template) {
      // Prefill form with past schedule data
      const pastSchedule = pastSchedules?.find((s) => s._id === template);
      if (pastSchedule) {
        setSelectedClient(pastSchedule?.client_id);
        setSelectedProject(pastSchedule?.project_id);
        setSelectedPlant(pastSchedule?.plant_id || "");
        setPumpType(pastSchedule?.pump_type);
        setFormData((prev) => ({
          ...prev,
          concreteGrade: pastSchedule?.concreteGrade,
          pumpingJob: pastSchedule?.pumping_job,
          pumpOnwardTime: pastSchedule?.input_params?.pump_onward_time?.toString(),
          onwardTime: pastSchedule?.input_params?.onward_time?.toString(),
          returnTime: pastSchedule?.input_params?.return_time?.toString(),
          bufferTime: pastSchedule?.input_params?.buffer_time?.toString(),
          loadTime: pastSchedule?.input_params?.load_time?.toString(),
          pumpFixingTime: pastSchedule?.input_params?.pump_fixing_time?.toString(),
          pumpRemovalTime: pastSchedule?.input_params?.pump_removal_time?.toString(),
          floorHeight: pastSchedule?.floor_height?.toString(),
          pumpSiteReachTime: pastSchedule?.pump_site_reach_time,
          slumpAtSite: pastSchedule?.slump_at_site?.toString() || "",
          mixCode: pastSchedule?.mix_code || "",
          remarks: pastSchedule?.remarks || "",
          oneWayKm: pastSchedule?.mother_plant_km?.toString() || "",
          siteSupervisorId: pastSchedule?.site_supervisor_id || "",
          cubeAtSite: pastSchedule?.cube_at_site || false,
          creditTerms: pastSchedule?.credit_terms || "",
          fieldTechnicianId: pastSchedule?.field_technician_id || "",
        }));
        if (pastSchedule.tm_overrule) {
          setOverruleTMCount(true);
          setCustomTMCount(pastSchedule.tm_overrule);
        }
        // Move to first step
        setStep(1);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, pastSchedules]);

  useEffect(() => {
    if (selectedClient && selectedProject && formData.scheduleDate && motherPlantName)
      setComputedScheduleName(
        `${motherPlantName}-${formatDateAsDDMMYY(formData.scheduleDate)}-${(schedulesForDayCount ?? 0) + 1}`
      );
  }, [motherPlantName, formData.scheduleDate, schedulesForDayCount, selectedClient, selectedProject]);

  const fetchSchedule = useCallback(async () => {
    try {
      const response = await fetchWithAuth(`/schedules/${schedule_id}`);
      const data = await response.json();
      if (data.success) {
        setSelectedClient(data.data.client_id);
        setSelectedProject(data.data.project_id);
        setSelectedPlant(data.data.plant_id || "");
        setSelectedPump(data.data.pump);
        setPumpType(data.data.pump_type || "line");
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
          pumpOnwardTime: data.data.input_params.pump_onward_time.toString(),
          onwardTime: data.data.input_params.onward_time.toString(),
          returnTime: data.data.input_params.return_time.toString(),
          bufferTime: data?.data?.input_params?.buffer_time?.toString(),
          loadTime: data?.data?.input_params?.load_time?.toString(),
          concreteGrade: data.data.concreteGrade,
          pump_start: data.data.input_params.pump_start ? data.data.input_params.pump_start : "",
          pumpFixingTime: data.data.input_params.pump_fixing_time
            ? data.data.input_params.pump_fixing_time.toString()
            : "",
          pumpRemovalTime: data.data.input_params.pump_removal_time
            ? data.data.input_params.pump_removal_time.toString()
            : "",
          pumpingJob: data.data.pumping_job,
          floorHeight: data.data.floor_height ? data.data.floor_height.toString() : "",
          pumpSiteReachTime: data.data.pump_site_reach_time ? data.data.pump_site_reach_time.toString() : "",
          slumpAtSite: data.data.slump_at_site?.toString?.() || "",
          mixCode: data.data.mix_code?.toString?.() || "",
          remarks: data.data.remarks?.toString?.() || "",
          oneWayKm: data.data.mother_plant_km?.toString?.() || "",
          siteSupervisorId: data.data.site_supervisor_id || "",
          cubeAtSite: data.data.cube_at_site || false,
          creditTerms: data.data.credit_terms || "",
          fieldTechnicianId: data.data.field_technician_id || "",
        });
        setIsBurstModel(!!data?.data?.input_params?.is_burst_model);
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
        setHasChanged(false);

        return true;
      }
      return false;
    } catch (error) {
      setFormDataRetrieved(false);
      console.error("Error fetching schedule:", error);
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule_id, avgTMCap, formData.scheduleDate, motherPlantName, schedulesForDayCount]);

  const updateSchedule = async () => {
    if (!schedule_id) return false;

    try {
      const response = await fetchWithAuth(`/schedules/${schedule_id}`, {
        method: "PUT",
        body: JSON.stringify({
          schedule_no: computedScheduleName,
          client_id: selectedClient,
          project_id: selectedProject,
          plant_id: selectedPlant,
          // pump: selectedPump,
          concreteGrade: formData.concreteGrade,
          pumping_speed: formData.speed,
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
            // pump_start: formData.pump_start,
            pump_fixing_time: parseFloat(formData.pumpFixingTime),
            pump_removal_time: parseFloat(formData.pumpRemovalTime),
            is_burst_model: !!isBurstModel,
          },
          site_address: selectedProject ? projects.find((p) => p._id === selectedProject)?.address || "" : "",
          pumping_job: formData.pumpingJob,
          floor_height: parseFloat(formData.floorHeight),
          pump_site_reach_time: formData.pumpSiteReachTime,
          tm_overrule: customTMCount > 0 && overruleTMCount ? customTMCount : undefined,
          slump_at_site: formData.slumpAtSite ? parseFloat(formData.slumpAtSite) : undefined,
          mix_code: formData.mixCode ? formData.mixCode : undefined,
          remarks: formData.remarks ? formData.remarks : undefined,
          mother_plant_km: formData.oneWayKm ? parseFloat(formData.oneWayKm) : undefined,
          site_supervisor_id: formData.siteSupervisorId || undefined,
          cube_at_site: formData.cubeAtSite,
          credit_terms: formData.creditTerms || undefined,
          field_technician_id: formData.fieldTechnicianId || undefined,
          tm_count: tmReq,
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
    if (
      schedule_id &&
      clientsData &&
      pumpsData &&
      clientsData.length > 0 &&
      pumpsData.length > 0 &&
      status === "authenticated" &&
      session
    ) {
      fetchSchedule();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule_id, clientsData, pumpsData, status, session]);

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

  // const handleTimeChange = (name: string, value: string | null) => {
  //   setFormData((prev) => ({
  //     ...prev,
  //     [name]: value || "",
  //   }));
  //   setHasChanged(true);
  // };

  const calculateRequiredTMs = async () => {
    if (!hasChanged) return true;
    if (
      !selectedClient ||
      !formData.scheduleDate ||
      !formData.startTime ||
      !parseFloat(formData.quantity) ||
      !parseFloat(formData.speed) ||
      !parseFloat(formData.onwardTime) ||
      !parseFloat(formData.pumpOnwardTime) ||
      !parseFloat(formData.returnTime) ||
      !parseFloat(formData.bufferTime) ||
      !parseFloat(formData.loadTime)
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
            plant_id: selectedPlant,
            pump: selectedPump,
            concreteGrade: formData.concreteGrade,
            pumping_speed: formData.speed,
            pump_type: pumpType,
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
              pump_fixing_time: parseFloat(formData.pumpFixingTime),
              pump_removal_time: parseFloat(formData.pumpRemovalTime),
              unloading_time: parseFloat(formData.unloadingTime),
              is_burst_model: !!isBurstModel,
            },
            site_address: selectedProject ? projects.find((p) => p._id === selectedProject)?.address || "" : "",
            pumping_job: formData.pumpingJob,
            floor_height: parseFloat(formData.floorHeight),
            pump_site_reach_time: formData.pumpSiteReachTime,
            tm_overrule: customTMCount > 0 && overruleTMCount ? customTMCount : undefined,
            slump_at_site: formData.slumpAtSite ? parseFloat(formData.slumpAtSite) : undefined,
            mix_code: formData.mixCode ? formData.mixCode : undefined,
            remarks: formData.remarks ? formData.remarks : undefined,
            mother_plant_km: formData.oneWayKm ? parseFloat(formData.oneWayKm) : undefined,
            site_supervisor_id: formData.siteSupervisorId || undefined,
            cube_at_site: formData.cubeAtSite,
            credit_terms: formData.creditTerms || undefined,
            field_technician_id: formData.fieldTechnicianId || undefined,
            tm_count: tmReq,
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
      // return fetchSchedule();
    }
  };

  const createTooltip = (unavailable_times: UnavailableTimes) => {
    let tooltip = "";
    Object.keys(unavailable_times).map((schedule) => {
      if (schedule_id === schedule) return;
      tooltip =
        tooltip +
        `Schedule No. : ${unavailable_times[schedule]["schedule_no"]}\nStarts from: ${formatDateTimeForTooltip(
          unavailable_times[schedule]["start"]
        )} to: ${formatDateTimeForTooltip(unavailable_times[schedule]["end"])}\n\n`;
    });
    return tooltip;
  };

  const generatePartiallyAvailableTime = (
    tms: CalculateTMResponse,
    windowStart: Date | null,
    scheduleEndDate: Date | null
  ): { partially_available_tm: UnavailableTimes; partially_available_pump: UnavailableTimeEntry } => {
    const partially_available_tm: UnavailableTimes = {};
    if (!!windowStart && !!scheduleEndDate) {
      tms?.available_tms?.forEach((tm) => {
        if (!tm?.unavailable_times) return;
        Object.keys(tm?.unavailable_times).forEach((schedule) => {
          if (schedule_id === schedule) return;
          const entryEnd = new Date(tm?.unavailable_times[schedule].end);
          if (windowStart.getTime() < entryEnd.getTime() && entryEnd.getTime() <= scheduleEndDate.getTime()) {
            if ((entryEnd.getTime() - windowStart.getTime()) / 3600000 <= 1) {
              partially_available_tm[tm.id] = {
                start: tm?.unavailable_times[schedule].start,
                end: tm?.unavailable_times[schedule].end,
                schedule_no: tm?.unavailable_times[schedule].schedule_no,
              };
            }
          }
        });
      });
    }
    let partially_available_pump: UnavailableTimeEntry = { start: "", end: "", schedule_no: "" };
    if (!!windowStart && !!scheduleEndDate) {
      tms?.available_pumps?.forEach((pump) => {
        if (pump.id !== selectedPump) return;
        if (!pump?.unavailable_times) return;
        Object.keys(pump?.unavailable_times || {}).forEach((schedule) => {
          if (schedule_id === schedule) return;
          const entryEnd = new Date(pump?.unavailable_times[schedule].end);
          if (windowStart.getTime() < entryEnd.getTime() && entryEnd.getTime() <= scheduleEndDate.getTime()) {
            if ((entryEnd.getTime() - windowStart.getTime()) / 3600000 <= 1) {
              partially_available_pump = {
                start: pump?.unavailable_times[schedule].start,
                end: pump?.unavailable_times[schedule].end,
                schedule_no: pump?.unavailable_times[schedule].schedule_no,
              };
            }
          }
        });
      });
    }
    return { partially_available_tm: partially_available_tm, partially_available_pump: partially_available_pump };
  };

  const generateSchedule = async () => {
    if (!calculatedTMs?.schedule_id || tmSequence.length === 0) {
      return false;
    }

    const toastId = startAction("Generating pumping schedule...");
    setIsGenerating(true);

    try {
      const { partially_available_tm, partially_available_pump } = generatePartiallyAvailableTime(
        calculatedTMs,
        scheduleStartDate,
        scheduleEndDate
      );
      const response = await fetchWithAuth(`/schedules/${calculatedTMs.schedule_id}/generate-schedule`, {
        method: "POST",
        body: JSON.stringify({
          selected_tms: tmSequence,
          pump: selectedPump,
          type: "pumping",
          partially_available_tm: partially_available_tm,
          partially_available_pump: partially_available_pump,
        }),
      });

      const data = await response.json();
      if (data.success) {
        completeAction(toastId, "Pumping schedule generated successfully!", true);
        return true;
      } else {
        completeAction(toastId, data.message || "Failed to generate schedule", false);
        return false;
      }
    } catch (error) {
      console.error("Error generating schedule:", error);
      completeAction(toastId, "Failed to generate schedule. Please try again.", false);
      return false;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNext = async () => {
    if (step === 0) {
      const params = new URLSearchParams(searchParams.toString());
      if (!selectedPastSchedule) {
        setSelectedPastSchedule("");
        params.delete("template");
      } else {
        params.set("template", selectedPastSchedule || "none");
        // Prefill form with past schedule data
        const pastSchedule = pastSchedules?.find((s) => s._id === selectedPastSchedule);
        if (pastSchedule) {
          setSelectedClient(pastSchedule?.client_id);
          setSelectedProject(pastSchedule?.project_id);
          setSelectedPlant(pastSchedule?.plant_id);
          setPumpType(pastSchedule?.pump_type);
          setFormData((prev) => ({
            ...prev,
            concreteGrade: pastSchedule?.concreteGrade,
            pumpingJob: pastSchedule?.pumping_job,
            pumpOnwardTime: pastSchedule?.input_params?.pump_onward_time?.toString(),
            returnTime: pastSchedule?.input_params?.return_time?.toString(),
            bufferTime: pastSchedule?.input_params?.buffer_time?.toString(),
            loadTime: pastSchedule?.input_params?.load_time?.toString(),
            pumpFixingTime: pastSchedule?.input_params?.pump_fixing_time?.toString(),
            pumpRemovalTime: pastSchedule?.input_params?.pump_removal_time?.toString(),
            floorHeight: pastSchedule?.floor_height?.toString(),
            pumpSiteReachTime: pastSchedule?.pump_site_reach_time,
            slumpAtSite: pastSchedule?.slump_at_site?.toString() || "",
            mixCode: pastSchedule?.mix_code || "",
            remarks: pastSchedule?.remarks || "",
            oneWayKm: pastSchedule?.mother_plant_km?.toString() || "",
            siteSupervisorId: pastSchedule?.site_supervisor_id || "",
            cubeAtSite: pastSchedule?.cube_at_site || false,
            creditTerms: pastSchedule?.credit_terms || "",
            fieldTechnicianId: pastSchedule?.field_technician_id || ""
          }));
          if (pastSchedule?.tm_overrule) {
            setOverruleTMCount(true);
            setCustomTMCount(pastSchedule.tm_overrule);
          }
        }
      }
      router.replace(`?${params.toString()}`, { scroll: false });
      setStep(1);
    } else if (step === 1) {
      // Move to Trip Log
      setStep(1.1);
    } else if (step === 1.1) {
      // Complete step 1 and move to step 2
      const success = await calculateRequiredTMs();
      if (success) {
        setStep(2);
      }
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      const success = await generateSchedule();
      if (success) {
        // Redirect to view page instead of going to step 4
        router.push(`/pumping-schedules/${calculatedTMs?.schedule_id}/view`);
      }
    }
  };

  const handleBack = () => {
    if (step === 1) {
      setStep(0);
    } else if (step === 1.1) {
      setStep(1);
    } else if (step === 2) {
      setStep(1.1);
    } else if (step === 3) {
      setStep(2);
    }
  };

  const filteredPumps = pumpsData?.filter((p: Pump) => p.type === pumpType && p.status === "active") || [];
  const progressPercentage = (() => {
    if (step === 0) return 0;
    if (step === 1) return (100 / (steps.length - 1)) * 1;
    if (step === 1.1) return (100 / (steps.length - 1)) * 2;
    if (step === 2) return (100 / (steps.length - 1)) * 3;
    if (step === 3) return 100;
    return 0;
  })();

  const filteredSchedules = useMemo(() => {
    if (!searchTerm) return pastSchedules;

    return pastSchedules?.filter(
      (schedule) =>
        schedule.schedule_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.concreteGrade.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, pastSchedules]);

  useEffect(() => {
    // reset project when client changes
    if (!projects.some((p: Project) => p._id === selectedProject) && projects.length !== 0) setSelectedProject("");
  }, [selectedClient, projects, selectedProject]);

  // Helper to check if all required fields are filled for each sub-step
  const isStep1FormValid = () => {
    if (step === 1) {
      // Pour Details + Pumping Details validation
      return (
        !!selectedClient &&
        !!selectedProject &&
        !!formData.quantity &&
        !!formData.speed &&
        !!formData.scheduleDate &&
        !!formData.startTime &&
        !!formData.pumpOnwardTime &&
        (pumpType === "line" ? (!!formData.pumpFixingTime && !!formData.pumpRemovalTime) : true)
      );
    } else if (step === 1.1) {
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

  // Helper to check if all transit mixer fields are filled for fleet sizing
  const areTransitMixerFieldsFilled = () => {
    return (
      !!formData.bufferTime &&
      !!formData.loadTime &&
      !!formData.onwardTime &&
      !!formData.unloadingTime &&
      !!formData.returnTime
    );
  };

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

  // Build Date objects for schedule window and TM classification helpers (must be before any early returns)
  const scheduleStartDate = useMemo(() => {
    if (!formData.scheduleDate || !formData.startTime) return null;
    return new Date(`${formData.scheduleDate}T${formData.startTime}`);
  }, [formData.scheduleDate, formData.startTime]);

  const scheduleEndDate = useMemo(() => {
    if (!scheduleStartDate) return null;
    const quantityVal = parseFloat(formData.quantity) || 0;
    const avgCapVal = avgTMCap && avgTMCap > 0 ? avgTMCap : 0;
    const unloadingMinutesVal = parseFloat(formData.unloadingTime) || 0;
    if (avgCapVal <= 0 || unloadingMinutesVal <= 0) return null;
    // no. of TM required = quantity / avgTMcap
    const numberOfTmRequired = quantityVal / avgCapVal;
    // Pumping hours = no. of TM required * (unloading time in hours)
    // Pumping minutes = numberOfTmRequired * unloading time in minutes
    const pumpMinutesLocal = Math.round(numberOfTmRequired * unloadingMinutesVal);
    if (!pumpMinutesLocal) return null;
    return new Date(scheduleStartDate.getTime() + pumpMinutesLocal * 60 * 1000);
  }, [scheduleStartDate, formData.quantity, formData.unloadingTime, avgTMCap]);

  type VehicleAvailabilityClass = "available" | "partially_unavailable" | "unavailable";
  const classifyVehicleAvailability = useCallback(
    (vehicle: AvailableVehicle, windowStart: Date | null, windowEnd: Date | null): VehicleAvailabilityClass => {
      if (vehicle.availability) return "available";
      if (!windowStart || !windowEnd) return vehicle.availability ? "available" : "unavailable";

      const unavailable_times: UnavailableTimes = vehicle?.unavailable_times ? vehicle.unavailable_times : {};
      if (Object.keys(unavailable_times).length === 0) return "available";

      // let hasOverlap = false;
      let isNearWithinHour = false;
      // const oneHourMs = 60 * 60 * 1000;

      for (const [schedule, entry] of Object.entries(unavailable_times)) {
        if (schedule_id === schedule) continue;
        const entryStart = new Date(entry.start);
        const entryEnd = new Date(entry.end);
        if (windowStart.getTime() < entryEnd.getTime() && entryEnd.getTime() <= windowEnd.getTime()) {
          if ((entryEnd.getTime() - windowStart.getTime()) / 3600000 > 1) return "unavailable";
          isNearWithinHour = true;
        } else if (
          (windowStart.getTime() < entryStart.getTime() && entryStart.getTime() <= windowEnd.getTime()) ||
          (entryStart.getTime() <= windowStart.getTime() && windowEnd.getTime() <= entryEnd.getTime())
        ) {
          return "unavailable";
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
      if (isNearWithinHour) return "partially_unavailable";
      return "available";
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

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

  const profileStartHour = session?.custom_start_hour ?? 0; // default 7
  const profileFormat = session?.preferred_format ?? "12h";
  function formatHour(hour: number) {
    if (profileFormat === "24h") {
      return `${hour.toString().padStart(2, "0")}:00`;
    }
    const suffix = hour >= 12 ? "PM" : "AM";
    const adjusted = hour % 12 === 0 ? 12 : hour % 12;
    return `${adjusted.toString().padStart(2, "0")}:00 ${suffix}`;
  }
  const profileEndHour = (profileStartHour + 24) % 24;

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
      <div className="min-h-[50vh] flex items-center justify-center">
        <Spinner size="lg" text="Loading schedules..." />
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
    { label: "Pre-Start", shortLabel: "Pre-Start", value: buffer, color: "#3b82f6" },
    { label: "Loading", shortLabel: "Load", value: load, color: "#8b5cf6" },
    { label: "Onward Journey", shortLabel: "Onward", value: onward, color: "#f59e0b" },
    { label: "TM Unloading", shortLabel: "Unload", value: unload, color: "#10b981" },
    { label: "Return Journey", shortLabel: "Return", value: ret, color: "#ef4444" },
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
                {percentage > 2 && (
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
                      fontSize={percentage < 8 ? percentage * 1.2 : "12"}
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
  // New formula:
  // number of TM required = quantity / avgTMcap
  // unloading time in hours = unloading time in minutes / 60
  // pumping hours = number of TM required * unloading time in hours
  const numberOfTmRequired = avgTMCap && avgTMCap > 0 ? quantity / avgTMCap : 0;
  const unloadingTimeMinutes = parseFloat(formData.unloadingTime) || 0;
  const unloadingTimeHours = unloadingTimeMinutes > 0 ? unloadingTimeMinutes / 60 : 0;
  const totalPumpingHours =
    numberOfTmRequired > 0 && unloadingTimeHours > 0 ? numberOfTmRequired * unloadingTimeHours : 0;
  const loads = Math.ceil((parseFloat(formData.quantity) || 0) / (avgTMCap && avgTMCap > 0 ? avgTMCap : 1));
  // const m3PerTM = tripsPerTM * (avgTMCap && avgTMCap > 0 ? avgTMCap : 1);
  const tmReq = cycleTimeMin > 0 ? Math.ceil(cycleTimeMin / parseFloat(formData.unloadingTime)) : 0;
  const additionalTMValue = overruleTMCount ? Math.max(0, (customTMCount || 0) - tmReq) : 0;
  const totalTMRequired = overruleTMCount ? customTMCount : tmReq;
  const tripsPerTM = tmReq > 0 ? loads / totalTMRequired : 0;
  // const totalTrips = tmReq > 0 ? Math.ceil(tripsPerTM * tmReq) + 1 : 0;
  const [startHour, startMin] = (formData.startTime || "00:00").split(":").map((n) => parseInt(n, 10));

  const startTotalMin = startHour * 60 + startMin;
  const pumpMinutes = Math.round(totalPumpingHours * 60); // hours → minutes
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

  return (
    <div className="w-full mx">
      <div className="flex flex-row w-full mb-4 items-center">
        <div className="w-1/3">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">New Pumping Schedule</h2>
          {step > 0 && <p className="text-gray-500 dark:text-gray-400">Step {step} of 4</p>}
        </div>
        <div className="w-full">
          {step > 0 && (
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
                    className={`flex flex-col ${index == 0 ? "items-start" : index == 5 ? "items-end" : "items-center"} `}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                  >
                    {/* Step Circle */}
                    <motion.div
                      className={`flex items-center justify-center w-6 h-6 rounded-full border-2 relative z-5 ${step >= s.id
                        ? "border-brand-500 bg-brand-500 text-white shadow-lg"
                        : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                        }`}
                      animate={{
                        scale: s.type === "subStep" ? (step === s.id ? 0.9 : 0.8) : step === s.id ? 1.3 : 1,
                        boxShadow: step === s.id ? "0 0 20px rgba(var(--brand-500-rgb, 59, 130, 246), 0.5)" : "none",
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      {Number(step) > Number(s.id) && !String(step).startsWith(`${s.id}.`) ? (
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
                      className={`mt-2 ${s.type === "subStep" ? "text-[10px]" : "text-xs"} text-center ${step >= s.id ? "text-brand-500 font-medium" : "text-gray-500 dark:text-gray-400"
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
          )}
        </div>
      </div>

      <div>
        {step === 0 ? (
          <div className="max-w-6xl mx-auto p-6 space-y-6">
            {!showPastList ? (
              <div className="flex flex-col items-center gap-4 mt-10">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Schedule Details</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Choose how you want to begin</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    className="px-6 py-6 rounded-lg bg-gray-100 text-gray-800 hover:bg-brand-200 dark:bg-gray-800 dark:text-gray-200 border border-brand-400 dark:hover:bg-brand-800 transition-colors font-medium flex items-start gap-3 text-left flex-col"
                    onClick={() => {
                      setSelectedPastSchedule("");
                      handleNext();
                    }}
                  >
                    <span className="inline-flex items-center justify-center w-6 h-6 mt-0.5">
                      <FileText className="w-5 h-5" />
                    </span>
                    <span>
                      <span className="block font-semibold">Start Fresh</span>
                      <span className="block text-xs opacity-90">
                        Begin with a blank form. Enter every detail from scratch for full control.
                      </span>
                    </span>
                  </button>
                  <button
                    className="px-6 py-6 rounded-lg bg-gray-100 text-gray-800 hover:bg-brand-200 dark:bg-gray-800 dark:text-gray-200 border border-brand-400 dark:hover:bg-brand-800 transition-colors font-medium flex items-start gap-3 text-left flex-col"
                    onClick={() => {
                      setShowPastList(true);
                    }}
                  >
                    <span className="inline-flex items-center justify-center w-6 h-6 mt-0.5">
                      <Clock className="w-5 h-5" />
                    </span>
                    <span>
                      <span className="block font-semibold">Use Past Schedule</span>
                      <span className="block text-xs opacity-90">
                        Auto-fill form using your most recent schedule. Great for Repeat Jobs.
                      </span>
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-brand-500 text-white">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Select a Past Schedule</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        Start with values from a previous schedule
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-2 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 text-sm"
                      onClick={() => {
                        setShowPastList(false);
                        setSelectedPastSchedule("");
                        setSearchTerm("");
                      }}
                    >
                      Back
                    </button>
                    <button
                      className={cn(
                        "px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors font-medium"
                      )}
                      onClick={() => {
                        handleNext();
                      }}
                    >
                      Continue
                    </button>
                  </div>
                </div>

                <div className="relative">
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
                        className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${selectedPastSchedule === schedule._id
                          ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                          : "border-gray-200 hover:border-brand-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-brand-600 dark:hover:bg-gray-800/50"
                          }`}
                        onClick={() => setSelectedPastSchedule(schedule._id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-gray-900 dark:text-white ">{schedule.schedule_no}</h4>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${pumpColors[schedule.pump_type]
                                  }`}
                              >
                                {schedule?.pump_type?.toUpperCase()}
                              </span>
                            </div>

                            <div className="grid grid-cols-6 gap-4 text-sm text-gray-600 dark:text-gray-400">
                              <div className="flex items-center gap-1">
                                <FileText className="w-4 h-4" />
                                <span className="font-medium truncate">
                                  {schedule.schedule_no?.length > 12
                                    ? schedule.schedule_no.substring(0, 12) + "…"
                                    : schedule.schedule_no}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Building className="w-4 h-4" />
                                <span className="truncate">{schedule.client_name}</span>
                              </div>

                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span>{formatDate(schedule.input_params.schedule_date)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Truck className="w-4 h-4" />
                                <span>{schedule.input_params.quantity} m³</span>
                              </div>
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

                          <div
                            className={`ml-4 w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPastSchedule === schedule._id
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
                  <div className="mt-2 p-3 bg-brand-50 dark:bg-brand-900/20 rounded-lg border border-brand-200 dark:border-brand-700">
                    <p className="text-sm text-brand-700 dark:text-brand-300">
                      <strong>Note:</strong> Date, time, quantity, and some other fields will still need to be updated
                      for the new schedule.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : step === 1 ? (
          <div className="space-y-4">
            {/* Pour Details Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-white dark:bg-gray-900/30 mb-24">
              <div className="flex flex-row justify-between items-center mb-8 w-full">
                <div className="flex flex-row justify-center items-center gap-6 ">
                  <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200">Pour Details</h3>

                  <div className="flex flex-row gap-1 justify-center items-center text-gray-800 dark:text-gray-300 bg-red-100 dark:bg-red-900/40 py-1 px-3 rounded-full">
                    <Calendar className="w-3 h-3 " />
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide">
                        Current Date & Time -{" "}
                        {new Date().toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}{" "}
                        -{" "}
                        {new Date().toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white"></p>
                    </div>
                  </div>
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 bg-blue-100 dark:bg-blue-900/40 py-1 px-3 rounded-full">
                  Company Timings -{formatHour(profileStartHour)} TO {formatHour(profileEndHour)} NEXT DAY
                </span>
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

                {/* Project Address */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Project Address
                  </label>
                  <div className="min-h-fit p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    {selectedProject ? (
                      <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                        {projects.find((p) => p._id === selectedProject)?.address || "N/A"}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">Select a project</p>
                    )}
                  </div>
                </div>

                {/* Project Contact */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Project Contact
                  </label>
                  <div className="min-h-fit p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    {selectedProject ? (
                      <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                        {projects.find((p) => p._id === selectedProject)?.contact_number || "N/A"}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">Select a project</p>
                    )}
                  </div>
                </div>

                {/* Placement Zone */}
                <div className="col-span-1">
                  <SearchableDropdown
                    options={[
                      "SLAB",
                      "Raft",
                      "PCC / Footing",
                      "Road",
                      "Piling",
                      "Screed",
                      "Colomn / Beam",
                      "Wall",
                      "Flooring",
                    ]}
                    value={formData.pumpingJob}
                    onChange={(value: string | string[]) => {
                      setFormData((prev) => ({ ...prev, pumpingJob: value as string }));
                      setHasChanged(true);
                    }}
                    getOptionLabel={(option: string) => option}
                    getOptionValue={(option: string) => option}
                    placeholder="Select Zone"
                    label="Placement Zone"
                    multiple={false}
                  />
                </div>
              </div>

              <div className="grid grid-cols-5 gap-6 mt-6">
                {/* Floor Height (Pumping) */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Floor (Pumping)
                  </label>
                  <Input
                    type="number"
                    name="floorHeight"
                    value={
                      formData.floorHeight !== undefined && formData.floorHeight !== null ? formData.floorHeight : ""
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      const numValue = parseFloat(value);
                      if (value === "" || (numValue >= 0 && numValue <= 99 && Number.isInteger(numValue))) {
                        handleInputChange(e);
                      }
                    }}
                    placeholder="Enter floor between 0 to 99"
                    min="0"
                    max="99"
                  />
                </div>

                {/* Pump Type Selection */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Pump Type <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-row pt-3 items-center w-full gap-4">
                    <div className="w-1/2">
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
                    </div>
                    <div className="w-1/2">
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
                </div>

                {/* RMC Grade */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">RMC Grade</label>
                  <Input
                    type="text"
                    name="concreteGrade"
                    value={formData.concreteGrade || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= 10 && /^[a-zA-Z0-9+\-/.]*$/.test(value)) {
                        handleInputChange(e);
                      }
                    }}
                    placeholder="Enter RMC grade"
                    className="flex-1 w-full"
                  />
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

                {/* Supply from Which Plant (Mother Plant) */}
                <div className="col-span-1">
                  <SearchableDropdown
                    options={plantsData || []}
                    value={selectedPlant}
                    onChange={(value: string | string[]) => {
                      setSelectedPlant(value as string);
                      setHasChanged(true);
                    }}
                    getOptionLabel={(plant) => plant.name}
                    getOptionValue={(plant) => plant._id}
                    placeholder="Select a Plant"
                    label="Supply from Which Plant"
                    required
                    multiple={false}
                  />
                </div>
              </div>

              <div className="grid grid-cols-5 gap-6 mt-6">
                {/* Scheduled Date of Pumping */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Scheduled Date of Pumping <span className="text-red-500">*</span>
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
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <TimePicker
                      value={formData.startTime ? dayjs(formData.startTime, "HH:mm") : null}
                      onChange={(newValue) => {
                        const timeString = newValue ? newValue.format("HH:mm") : "";
                        setFormData((prev) => ({ ...prev, startTime: timeString }));
                        setHasChanged(true);
                      }}
                      slotProps={{
                        textField: {
                          size: "small",
                          fullWidth: true,
                          placeholder: "Select time",
                          InputProps: {
                            className:
                              "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600",
                          },
                        },
                        popper: {
                          // Improve contrast of time picker popper in dark mode
                          sx: {
                            "& .MuiPaper-root": {
                              backgroundColor: "rgb(31 41 55)", // Tailwind gray-800
                              color: "#fff",
                            },
                          },
                        },
                      }}
                      format={profile?.preferred_format === "12h" ? "h:mm a" : "HH:mm"}
                      views={["hours", "minutes"]}
                    />
                  </LocalizationProvider>
                </div>

                {/* Pumping Speed */}
                <div className="col-span-1">
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
                <div className="col-span-1">
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
                <div className="col-span-1 flex flex-row gap-2">
                  <div className="w-1/2">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Total Pumping Hrs
                    </label>
                    <Input
                      type="text"
                      name="pumpingHours"
                      value={totalPumpingHours > 0 ? `${totalPumpingHours.toFixed(2)} hr` : "-"}
                      disabled
                      className="cursor-not-allowed bg-gray-100 dark:bg-gray-800"
                    />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 truncate -mr-2">
                      Pump End Time <span className="text-gray-500 text-[10px] pl-1">(24h)</span>
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
                </div>
              </div>

              <div className="flex justify-between items-center mb-4 w-full mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-4">Pumping Details</h3>
              </div>

              <div className="grid grid-cols-5 gap-6">

                {/* Cube at Site */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cube at Site
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="cubeAtSite"
                        checked={formData.cubeAtSite === true}
                        onChange={() => {
                          setFormData((prev) => ({ ...prev, cubeAtSite: true }));
                          setHasChanged(true);
                        }}
                        className="w-4 h-4 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="cubeAtSite"
                        checked={formData.cubeAtSite === false}
                        onChange={() => {
                          setFormData((prev) => ({ ...prev, cubeAtSite: false }));
                          setHasChanged(true);
                        }}
                        className="w-4 h-4 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">No</span>
                    </label>
                  </div>
                </div>

                {/* MIX CODE */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mix Code</label>
                  <Input
                    type="string"
                    name="mixCode"
                    value={formData.mixCode}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData((prev) => ({ ...prev, mixCode: v }));
                      setHasChanged(true);
                    }}
                    placeholder="Enter mix code"
                  />
                </div>

                {/* SLUMP AT SITE */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Slump at Site (mm)
                  </label>
                  <Input
                    type="number"
                    name="slumpAtSite"
                    value={parseFloat(formData.slumpAtSite)}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "") {
                        setFormData((prev) => ({ ...prev, slumpAtSite: "" }));
                        return;
                      }
                      const num = Math.max(0, Math.min(300, Number(v)));
                      setFormData((prev) => ({ ...prev, slumpAtSite: num.toString() }));
                      setHasChanged(true);
                    }}
                    placeholder="Enter value between 0-300"
                    min="0"
                    max="300"
                  />
                </div>

                {/* Credit Terms */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Credit Terms
                  </label>
                  <Input
                    type="text"
                    name="creditTerms"
                    value={formData.creditTerms}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v.length <= 20) {
                        setFormData((prev) => ({ ...prev, creditTerms: v }));
                        setHasChanged(true);
                      }
                    }}
                    placeholder="Enter credit terms (max 20 chars)"
                    maxLength={20}
                  />
                </div>

                {/* REMARKS */}
                <div className="col-span-1">
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
                {/* Pump Onward Time to Site */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Pump Onward Time to Site (min) <span className="text-red-500">*</span>
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
                    placeholder="Enter pump onward time (1-600)"
                    min="1"
                    max="600"
                  />
                </div>

                {/* Pipeline Fixing Time at site */}
                <div className={`col-span-1 ${pumpType === "boom" && "opacity-40 bg-gray-200 dark:bg-gray-700"}`}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Pipeline Fixing Time at site (min){" "}
                    <span className="text-red-500">{pumpType === "line" && "*"}</span>
                  </label>
                  <Input
                    type="number"
                    name="pumpFixingTime"
                    value={formData.pumpFixingTime || ""}
                    disabled={pumpType === "boom"}
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
                <div className={`col-span-1 ${pumpType === "boom" && "opacity-40 bg-gray-200 dark:bg-gray-700"}`}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Pipeline Removal Time (min) <span className="text-red-500">{pumpType === "line" && "*"}</span>
                  </label>
                  <Input
                    type="number"
                    name="pumpRemovalTime"
                    value={formData.pumpRemovalTime || ""}
                    disabled={pumpType === "boom"}
                    onChange={(e) => {
                      const value = e.target.value;
                      const numValue = parseFloat(value);
                      if (value === "" || (numValue >= 1 && numValue <= 600 && Number.isInteger(numValue))) {
                        handleInputChange(e);
                      }
                    }}
                    placeholder="Enter pump removal time (1-600)"
                    min="1"
                    max="600"
                  />
                </div>

                {/* SITE SUPERVISOR */}
                <div className="col-span-1">
                  <SearchableDropdown
                    options={siteSupervisors || []}
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

                {/* Field Technician */}
                <div className="col-span-1">
                  <SearchableDropdown
                    options={fieldTechnicians || []}
                    value={formData.fieldTechnicianId}
                    onChange={(value: string | string[]) => {
                      setFormData((prev) => ({ ...prev, fieldTechnicianId: value as string }));
                      setHasChanged(true);
                    }}
                    getOptionLabel={(member: TeamMember) => member.name}
                    getOptionValue={(member: TeamMember) => member._id}
                    placeholder="Select field technician"
                    label="Field Technician"
                    multiple={false}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : step === 1.1 ? (
          <div className="space-y-4 mb-20">
            {/* Transit Mixer Trip Details Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-white dark:bg-gray-900/30">
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-4">Transit Mixer Trip Log</h3>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Section: Input Controls */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Input Form Section */}
                  <div className="bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                    <div className="flex flex-row justify-between mr-2">
                      <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">
                        Cycle Time Parameters <span className="text-red-500">*</span>
                      </h3>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-0">min</span>
                    </div>

                    <div className="space-y-2.5">
                      {/* Pre-Start Time */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center min-w-0 flex-1">
                          <span
                            className="w-2.5 h-2.5 rounded-sm mr-2 flex-shrink-0"
                            style={{ backgroundColor: "#3b82f6" }}
                          ></span>
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-0">
                            Pre-Start Time
                          </label>
                        </div>
                        <div className="w-20 flex-shrink-0">
                          <Input
                            min="0"
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
                            style={{ backgroundColor: "#8b5cf6" }}
                          ></span>
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-0">
                            Batching / Loading Time
                          </label>
                        </div>
                        <div className="w-20 flex-shrink-0">
                          <Input
                            type="number"
                            min="0"
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
                            Onward Time to Site
                          </label>
                        </div>
                        <div className="w-20 flex-shrink-0">
                          <Input
                            type="number"
                            min="0"
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
                              TM Unloading Time
                            </label>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 ml-4.5 mt-0.5">
                            Auto-filled from Pumping Speed.
                          </p>
                        </div>
                        <div className="w-20 flex-shrink-0">
                          <Input
                            type="number"
                            min="0"
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
                            Return to Plant Time
                          </label>
                        </div>
                        <div className="w-20 flex-shrink-0">
                          <Input
                            type="number"
                            name="returnTime"
                            value={parseFloat(formData.returnTime)}
                            min="0"
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

                {/* Right Section: Fleet Sizing + TM Trip Distribution (stacked) */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Fleet Sizing Section (moved here) */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Fleet Sizing</h3>

                    {!areTransitMixerFieldsFilled() ? (
                      <div className="flex items-center justify-center py-4">
                        <Tooltip content="Fill all transit mixer fields (Buffer, Loading, Onward, Unloading, Return times) to see fleet sizing calculations">
                          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                            <Info className="w-4 h-4" />
                            <span className="text-sm">Fill all transit mixer fields to calculate</span>
                          </div>
                        </Tooltip>
                      </div>
                    ) : (
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
                          <span className="text-xs font-medium text-gray-900 dark:text-white">
                            TMs Additional (Max TMs to wait at site)
                          </span>
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
                                setIsBurstModel(nextAdditional > 0);
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
                                setIsBurstModel(add > 0);
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
                                setIsBurstModel(nextAdditional > 0);
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

                        <div className="mt-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900/40">
                          <div className="px-3 py-2 border-b border-blue-200 dark:border-blue-800 flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-900 dark:text-white">Pour Model</span>
                            <div className="flex gap-1">
                              {isBurstModel ? (
                                <div
                                  className={`px-2.5 py-1 text-xs rounded border ${"bg-blue-600 text-white border-blue-600"}`}
                                >
                                  Burst
                                </div>
                              ) : (
                                <div
                                  className={`px-2.5 py-1 text-xs rounded border ${"bg-blue-600 text-white border-blue-600"}`}
                                >
                                  0 Wait
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="p-3 space-y-2">
                            {!isBurstModel ? (
                              <div className="text-[11px] leading-5 text-gray-700 dark:text-gray-300">
                                <p className="font-semibold">0 Wait model</p>
                                <p>
                                  Assumes each TM unloads back-to-back. Unloading time is counted and the sequence is
                                  planned so consecutive pours have effectively no waiting gap.
                                </p>
                              </div>
                            ) : (
                              <div className="text-[11px] leading-5 text-gray-700 dark:text-gray-300">
                                <p className="font-semibold">Burst model</p>
                                <p>
                                  Uses the extra TMs as a standby buffer to absorb delays. A maximum acceptable wait
                                  between pours is calculated from your inputs to allow short bursts followed by brief
                                  waits.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* TM Trip Distribution */}
                  <div className="bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-3">
                      TM Trip Distribution
                    </h3>
                    {!areTransitMixerFieldsFilled() ? (
                      <div className="flex items-center justify-center h-32">
                        <Tooltip content="Fill all transit mixer fields (Buffer, Loading, Onward, Unloading, Return times) to see trip distribution">
                          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                            <Info className="w-4 h-4" />
                            <span>Fill all transit mixer fields to calculate</span>
                          </div>
                        </Tooltip>
                      </div>
                    ) : (
                      (() => {
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
                        }
                        // Sort by trips (column B) in descending order
                        rows.sort((a, b) => b.trips - a.trips);

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
                      })()
                    )}
                  </div>
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
              </div>
            </div>
          </div>
        ) : step === 2 ? (
          !calculatedTMs || !plantsData ? (
            <div className="flex justify-center items-center py-12">
              <Spinner text="Loading pumps..." />
            </div>
          ) : (
            <div className="space-y-6 pb-24">
              {calculatedTMs && (
                <div className="mb-6 p-6 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Pumping Selection</h4>

                  <div className="grid grid-cols-2 gap-8">
                    {/* Left Half - Selection Instructions */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          1
                        </span>
                        <h5 className="text-lg font-medium text-gray-900 dark:text-white">
                          Select the Pump from the list below
                        </h5>
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
                            Check for partially available Pumps - choose them wisely
                          </span>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            Prioritize fully available Pump first
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
                        <h5 className="text-lg font-medium text-gray-900 dark:text-white">Verify the Selection</h5>
                      </div>

                      {/* Sequencing Guidelines */}
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            Check the Pump in the right panel
                          </span>
                        </div>
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            Check engaged timelines for unavailable/partially available Pumps
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {calculatedTMs && filteredPumps && (
                <>
                  {filteredPumps.length < 1 ? (
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
                <div className="col-span-2 grid grid-cols-2 gap-6 sticky top-20 z-10 bg-white dark:bg-gray-900/70 backdrop-blur-sm">
                  {/* Left header */}
                  <div className="flex items-center gap-3 py-2 pl-4">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">Select 1 Pump</h3>
                    <span
                      className={`px-3 py-1 text-sm font-medium rounded-full ${pumpType === "line"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                        }`}
                    >
                      {pumpType === "line" ? "Line Pump" : "Boom Pump"}
                    </span>
                  </div>

                  {/* Right header */}
                  <div className="flex items-center gap-3 py-2">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">
                      {selectedPump ? "Pump Chosen" : "Select Pump"}
                    </h3>
                  </div>
                </div>
                {/* Left Column - Pump Selection */}
                <div className="space-y-6">
                  <RadioGroup
                    value={selectedPump}
                    onValueChange={(val) => {
                      setSelectedPump(val);
                      setHasChanged(true);
                    }}
                    className="space-y-4"
                  >
                    {calculatedTMs && filteredPumps && filteredPumps.length > 0 ? (
                      (() => {
                        const plantIdToName = (plantsData || []).reduce((acc, plant) => {
                          acc[plant._id] = plant.name;
                          return acc;
                        }, {} as Record<string, string>);
                        const grouped: Record<string, typeof calculatedTMs.available_pumps> = {};
                        filteredPumps.forEach((pump) => {
                          const group = pump.plant_id ? plantIdToName[pump.plant_id] || "Unassigned" : "Unassigned";
                          if (!grouped[group]) grouped[group] = [];
                          // @ts-expect-error: Pump type may not match AvailableVehicle, but we intentionally group pumps here
                          grouped[group].push(pump);
                        });

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
                                      {(() => {
                                        const getRank = (status: string) =>
                                          status === "available" ? 0 : status === "partially_unavailable" ? 1 : 2;
                                        const sortedPumps = [...pumps].sort((a, b) => {
                                          const aStatus = classifyVehicleAvailability(
                                            a as unknown as AvailableVehicle,
                                            scheduleStartDate,
                                            scheduleEndDate
                                          );
                                          const bStatus = classifyVehicleAvailability(
                                            b as unknown as AvailableVehicle,
                                            scheduleStartDate,
                                            scheduleEndDate
                                          );
                                          return getRank(aStatus) - getRank(bStatus);
                                        });
                                        return sortedPumps.map((pump, idx) => (
                                          <label
                                            key={pump.id}
                                            className={`flex gap-3 flex-col items-end justify-between px-3 py-2 mb-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:hover:bg-gray-800/50  ${(() => {
                                              const status = classifyVehicleAvailability(
                                                pump as unknown as AvailableVehicle,
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
                                                checked={selectedPump === pump._id}
                                                disabled={(() => {
                                                  return (
                                                    classifyVehicleAvailability(
                                                      pump as unknown as AvailableVehicle,
                                                      scheduleStartDate,
                                                      scheduleEndDate
                                                    ) === "unavailable"
                                                  );
                                                })()}
                                                onChange={(e) => {
                                                  if (e.target.checked) {
                                                    setSelectedPump(pump._id);
                                                  } else {
                                                    setSelectedPump("");
                                                  }
                                                  setHasChanged(true);
                                                }}
                                                className="h-4 w-4 text-brand-500 rounded border-gray-300 focus:ring-brand-500"
                                              />
                                              <div className="flex flex-row w-full justify-between">
                                                <div className="flex items-center gap-2">
                                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {pump.identifier}
                                                  </p>
                                                  {/* Pump Type Chip */}
                                                  {/* <span
                                                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                      pumpType === "line"
                                                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                                        : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                                                    }`}
                                                  >
                                                    {pumpType === "line" ? "Line" : "Boom"}
                                                  </span> */}
                                                </div>
                                                <div className="flex flex-row items-end gap-2">
                                                  {(() => {
                                                    const status = classifyVehicleAvailability(
                                                      pump as unknown as AvailableVehicle,
                                                      scheduleStartDate,
                                                      scheduleEndDate
                                                    );
                                                    if (status === "unavailable") {
                                                      return (
                                                        <>
                                                          <p className="text-sm text-gray-500 dark:text-gray-400 text-right">
                                                            Unavailable -
                                                          </p>
                                                          <Tooltip content={createTooltip(pump.unavailable_times)}>
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
                                                          <Tooltip content={createTooltip(pump.unavailable_times)}>
                                                            <CircleQuestionMark size={15} />
                                                          </Tooltip>
                                                        </>
                                                      );
                                                    }
                                                    return null;
                                                  })()}
                                                  <p className="text-sm text-gray-500 dark:text-gray-400 text-right">
                                                    {pump.capacity}m³ - Unused{" "}
                                                    {getUnusedHours(pump.unavailable_times, scheduleStartDate)} hours
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                            {(() => {
                                              const status = classifyVehicleAvailability(
                                                pump as unknown as AvailableVehicle,
                                                scheduleStartDate,
                                                scheduleEndDate
                                              );
                                              if (status === "unavailable") {
                                                return (
                                                  <div className="item-right p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                                                    <div className="space-y-1">
                                                      {createUnavailableInfo(pump.unavailable_times)}
                                                    </div>
                                                  </div>
                                                );
                                              }
                                              if (status === "partially_unavailable") {
                                                return (
                                                  <div className="item-right p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                                                    <div className="space-y-1">
                                                      {createUnavailableInfo(pump.unavailable_times)}
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
                        No pumps available for selection
                      </div>
                    )}
                  </RadioGroup>
                </div>

                {/* Right Column - Chosen Pump */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    {selectedPump && calculatedTMs && filteredPumps ? (
                      (() => {
                        const pump = filteredPumps.find((p) => p._id.toString() === selectedPump);
                        if (!pump) return <div className="text-gray-500 dark:text-gray-400">Pump not found</div>;
                        const plantName =
                          (plantsData || []).find((pl) => pl._id === pump.plant_id)?.name || "Unassigned";
                        return (
                          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-700 dark:text-white">{pump.identifier}</span>
                                {/* Pump Type Chip */}
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded-full ${pumpType === "line"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                    : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                                    }`}
                                >
                                  {pumpType === "line" ? "Line" : "Boom"}
                                </span>
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
            </div>
          )
        ) : step === 3 ? (
          // Loader for Step 3
          !calculatedTMs || !plantsData ? (
            <div className="flex justify-center items-center py-12">
              <Spinner text="Loading TMs..." />
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
                                          const aStatus = classifyVehicleAvailability(
                                            a as unknown as AvailableVehicle,
                                            scheduleStartDate,
                                            scheduleEndDate
                                          );
                                          const bStatus = classifyVehicleAvailability(
                                            b as unknown as AvailableVehicle,
                                            scheduleStartDate,
                                            scheduleEndDate
                                          );
                                          return getRank(aStatus) - getRank(bStatus);
                                        });
                                        return sortedTms.map((tm, idx) => (
                                          <label
                                            key={tm.id}
                                            className={`flex gap-3 flex-col items-end justify-between px-3 py-2 mb-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:hover:bg-gray-800/50  ${(() => {
                                              const status = classifyVehicleAvailability(
                                                tm as unknown as AvailableVehicle,
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
                                                    classifyVehicleAvailability(
                                                      tm as unknown as AvailableVehicle,
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
                                                    const status = classifyVehicleAvailability(
                                                      tm as unknown as AvailableVehicle,
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
                                              const status = classifyVehicleAvailability(
                                                tm as unknown as AvailableVehicle,
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
                                    {/* <span className="text-sm text-gray-500 dark:text-gray-400">({tm?.capacity}m³)</span> */}
                                  </div>
                                  <div className="flex items-center flex-1 justify-end space-x-2">
                                    {(() => {
                                      if (!tm) return null;
                                      const status = classifyVehicleAvailability(
                                        tm as unknown as AvailableVehicle,
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
        {step === 1 && (
          <div className="flex justify-between mt-2">
            {!schedule_id ? (
              <Button onClick={handleBack} variant="outline" className="flex items-center gap-2">
                <ArrowLeft size={16} />
                Back to Select Template
              </Button>
            ) : (
              <span></span>
            )}
            <span className="dark:text-white text-black">
              <span className="text-red-500 ">*</span> Compulsory, all other fields are optional
            </span>
            <Button onClick={handleNext} className="flex items-center gap-2" disabled={!isStep1FormValid()}>
              Next: Pumping Details
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
            <Button onClick={handleNext} className="flex items-center gap-2" disabled={!isStep1FormValid()}>
              Next: Transit Mixer Trip Log
              <ArrowRight size={16} />
            </Button>
          </div>
        )}

        {step === 1.3 && (
          <div className="flex justify-between mt-2">
            <Button onClick={handleBack} variant="outline" className="flex items-center gap-2">
              <ArrowLeft size={16} />
              Back to Pumping Details
            </Button>
            <div>
              <span className="text-red-500">*</span> Compulsory, all other fields are optional
            </div>
            <Button
              onClick={handleNext}
              className="flex items-center gap-2"
              disabled={isCalculating || !isStep1FormValid()}
            >
              {isCalculating ? "Calculating..." : "Next: Pump Selection"}
              {!isCalculating && <ArrowRight size={16} />}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="flex justify-between items-center mt-2">
            <Button variant="outline" onClick={handleBack} className="flex items-center gap-2">
              <ArrowLeft size={16} />
              Back to Transit Mixer Trip Log
            </Button>
            <div className="flex items-end gap-4">
              <Button onClick={handleNext} className="flex items-center gap-2" disabled={!selectedPump}>
                Next: TM Selection
                <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex justify-between items-center mt-2 gap-0">
            <Button variant="outline" onClick={handleBack} className="flex items-center gap-2">
              <ArrowLeft size={16} />
              Back to Pump Selection
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

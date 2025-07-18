"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/button/Button";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import Radio from "@/components/form/input/Radio";
import Input from "@/components/form/input/InputField";
import DatePickerInput from "@/components/form/input/DatePickerInput";
import { ArrowLeft, ArrowRight, Clock, CheckCircle2, GripVertical, ChevronDown, ChevronRight } from "lucide-react";
import { Reorder, motion, AnimatePresence } from "framer-motion";
import { useApiClient } from "@/hooks/useApiClient";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import { useRouter } from "next/navigation";
import { RadioGroup } from "@/components/ui/radio";

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

interface AvailableTM {
  id: string;
  // _id: string;
  identifier: string;
  capacity: number;
  availability: boolean;
  plant_id: string;
  plant_name: string;
}

interface AvailablePump {
  id: string;
  // _id: string;
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
  available_pumps: AvailablePump[];
}

interface ScheduleTrip {
  trip_no: number;
  tm_no: string;
  tm_id: string;
  plant_start: string;
  pump_start: string;
  unloading_time: string;
  return: string;
  completed_capacity: number;
  cycle_time?: number;
  trip_no_for_tm?: number;
  cushion_time?: number;
  plant_name?: string;
}

interface GeneratedSchedule {
  _id: string;
  user_id: string;
  client_id: string;
  client_name: string;
  site_address: string;
  created_at: string;
  last_updated: string;
  input_params: {
    quantity: number;
    pumping_speed: number;
    onward_time: number;
    return_time: number;
    buffer_time: number;
    pump_start: string;
    schedule_date: string;
    pump_onward_time: number;
    pump_fixing_time: number;
  };
  output_table: ScheduleTrip[];
  tm_count: number;
  pumping_time: string | null;
  status: string;
}

const steps = [
  { id: 1, name: "Schedule Details" },
  { id: 2, name: "Pump Selection" },
  { id: 3, name: "TM Selection" },
  { id: 4, name: "Review" },
];

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
  const [generatedSchedule, setGeneratedSchedule] = useState<GeneratedSchedule | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);
  const [formData, setFormData] = useState({
    scheduleDate: "",
    startTime: "",
    quantity: "",
    speed: "",
    onwardTime: "",
    returnTime: "",
    productionTime: "",
    concreteGrade: "",
    siteAddress: "",
    pumpOnwardTime: "",
    pumpFixingTime: "",
    unloadingTime: "",
    pumpingJob: "",
    floorHeight: "",
    pumpSiteReachTime: "",
  });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [formDataRetrieved, setFormDataRetrieved] = useState(true);
  // Dropdown open state for custom dropdowns
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  // const [isPumpDropdownOpen, setIsPumpDropdownOpen] = useState(false);
  // Add state for open/closed plant groups
  const [openPlantGroups, setOpenPlantGroups] = useState<Record<string, boolean>>({});
  const [overruleTMCount, setOverruleTMCount] = useState(false);
  const [customTMCount, setCustomTMCount] = useState(1);

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

  const fetchSchedule = async () => {
    try {
      const response = await fetchWithAuth(`/schedules/${schedule_id}`);
      const data = await response.json();
      if (data.success) {
        setGeneratedSchedule(data.data);
        setSelectedClient(data.data.client_id);
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
          onwardTime: data.data.input_params.onward_time.toString(),
          returnTime: data.data.input_params.return_time.toString(),
          productionTime: data.data.input_params.buffer_time.toString(),
          concreteGrade: data.data.concreteGrade,
          siteAddress: data.data.site_address || "",
          pumpOnwardTime: data.data.input_params.pump_onward_time
            ? data.data.input_params.pump_onward_time.toString()
            : "",
          pumpFixingTime: data.data.input_params.pump_fixing_time
            ? data.data.input_params.pump_fixing_time.toString()
            : "",
          pumpingJob: data.data.pumping_job ? data.data.pumping_job.toString() : "",
          floorHeight: data.data.floor_height ? data.data.floor_height.toString() : "",
          pumpSiteReachTime: data.data.pump_site_reach_time ? data.data.pump_site_reach_time.toString() : "",
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
          available_pumps: data?.data?.available_pumps,
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
  };

  const updateSchedule = async () => {
    if (!schedule_id) return false;
    try {
      const response = await fetchWithAuth(`/schedules/${schedule_id}`, {
        method: "PUT",
        body: JSON.stringify({
          client_id: selectedClient,
          pump: selectedPump,
          concreteGrade: formData.concreteGrade,
          pumping_speed: formData.speed,
          pump_type: pumpType,
          input_params: {
            quantity: parseFloat(formData.quantity),
            pumping_speed: parseFloat(formData.speed),
            unloading_time: Math.round(parseFloat(formData.unloadingTime)),
            onward_time: parseFloat(formData.onwardTime),
            return_time: parseFloat(formData.returnTime),
            buffer_time: parseFloat(formData.productionTime),
            pump_start: `${formData.scheduleDate}T${formData.startTime}`,
            schedule_date: formData.scheduleDate,
            pump_onward_time: parseFloat(formData.pumpOnwardTime),
            pump_fixing_time: parseFloat(formData.pumpFixingTime),
          },
          site_address: formData.siteAddress, // You might want to add this as a form field
          pumping_job: parseFloat(formData.pumpingJob),
          floor_height: parseFloat(formData.floorHeight),
          pump_site_reach_time: formData.pumpSiteReachTime,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setGeneratedSchedule(data.data);
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
    setFormData((prev) => ({
      ...prev,
      [name]: value,
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
      !formData.returnTime ||
      !formData.productionTime ||
      !formData.pumpOnwardTime
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
            pump: selectedPump,
            concreteGrade: formData.concreteGrade,
            pumping_speed: formData.speed,
            pump_type: pumpType,
            input_params: {
              quantity: parseFloat(formData.quantity),
              pumping_speed: parseFloat(formData.speed),
              onward_time: parseFloat(formData.onwardTime),
              return_time: parseFloat(formData.returnTime),
              buffer_time: parseFloat(formData.productionTime),
              pump_start: `${formData.scheduleDate}T${formData.startTime}`,
              schedule_date: formData.scheduleDate,
              pump_onward_time: parseFloat(formData.pumpOnwardTime),
              pump_fixing_time: parseFloat(formData.pumpFixingTime),
              unloading_time: parseFloat(formData.unloadingTime),
            },
            site_address: formData.siteAddress, // You might want to add this as a form field
            pumping_job: parseFloat(formData.pumpingJob),
            floor_height: parseFloat(formData.floorHeight),
            pump_site_reach_time: formData.pumpSiteReachTime,
          }),
        });

        const data = await response.json();
        if (data.success) {
          setCalculatedTMs(data?.data);
          if (!schedule_id) router.push(`/schedules/${data?.data?._id}`);
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
        body: JSON.stringify({ selected_tms: tmSequence, pump: selectedPump }),
      });

      const data = await response.json();
      if (data.success) {
        setGeneratedSchedule(data.data);
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
        setStep(step + 1);
      }
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = () => {
    // Handle form submission
    console.log({
      client: selectedClient,
      pumpType,
      selectedPump,
      tmSequence,
      ...formData,
    });
    router.push(`/schedules/${schedule_id}/view`);
  };

  const selectedClientDetails = clientsData?.find((c: Client) => c._id === selectedClient);
  // const filteredPumps = pumpsData?.filter((p: Pump) => p.type === pumpType) || [];
  const progressPercentage = ((step - 1) / (steps.length - 1)) * 100;

  // Helper to check if all required fields are filled
  const isStep1FormValid = () => {
    return (
      !!selectedClient &&
      // !!selectedPump &&
      !!formData.siteAddress &&
      !!formData.scheduleDate &&
      !!formData.startTime &&
      !!formData.quantity &&
      !!formData.concreteGrade &&
      !!formData.onwardTime &&
      !!formData.returnTime &&
      !!formData.productionTime &&
      !!formData.pumpOnwardTime &&
      !!formData.speed &&
      !!formData.pumpFixingTime &&
      !!formData.unloadingTime &&
      !!formData.pumpingJob &&
      !!formData.floorHeight &&
      !!formData.pumpSiteReachTime
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
          speed: ((avgTMCap * 60) / unloading_time).toFixed(0),
        }));
      }
    }
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
    <div className="max-w-6xl mx-auto">
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

      <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        {step === 1 ? (
          <div className="space-y-8">
            {/* Client Details Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-gray-50 dark:bg-gray-900/30">
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-4">Client Details</h3>
              <div className="grid grid-cols-3 gap-6">
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
                      aria-haspopup="listbox"
                      aria-expanded={isClientDropdownOpen}
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
                {/* Site Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Site Address
                  </label>
                  <Input
                    type="text"
                    name="siteAddress"
                    value={formData.siteAddress}
                    onChange={handleInputChange}
                    placeholder="Enter site address"
                  />
                </div>
                {/* Client Details */}
                <div className="flex justify-start items-end">
                  {selectedClientDetails && (
                    <div className="flex flex-col gap-0">
                      <label className="block text-sm font-medium text-gray-400 dark:text-gray-300">
                        Client Details
                      </label>
                      <p className="mt-2 text-sm text-gray-400 dark:text-gray-400">
                        {selectedClientDetails.name} - {selectedClientDetails.contact_phone}
                      </p>
                      <p className="text-sm text-gray-400 dark:text-gray-400">{selectedClientDetails.address}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Pump Details Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-gray-50 dark:bg-gray-900/30">
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-4">Pump Details</h3>
              <div className="grid grid-cols-4 gap-6 mb-6">
                {/* Pump Type Selection */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Pump Type</label>
                  <div className="flex flex-wrap items-center gap-8">
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
                      label="Line Pump"
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
                      label="Boom Pump"
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
                    placeholder="Enter quantity"
                  />
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
                {/* Pump Onward Time */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Pump Onward Time (min)
                  </label>
                  <Input
                    type="number"
                    name="pumpOnwardTime"
                    value={parseFloat(formData.pumpOnwardTime)}
                    onChange={handleInputChange}
                    placeholder="Enter pump onward time"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6 mb-6">
                {/* Pipeline Fixing Time */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Pipeline Fixing Time (min)
                  </label>
                  <Input
                    type="number"
                    name="pumpFixingTime"
                    value={parseFloat(formData.pumpFixingTime)}
                    onChange={handleInputChange}
                    placeholder="Enter pump fixing time"
                  />
                </div>
                {/* Pump Start Time */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Pump Start Time
                  </label>
                  <div className="relative">
                    <Input type="time" name="startTime" value={formData.startTime} onChange={handleInputChange} />
                    <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                      <Clock className="size-5" />
                    </span>
                  </div>
                </div>
                {/* Pump Site Reach Time */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Pump Site Reach Time
                  </label>
                  <div className="relative">
                    <Input
                      type="time"
                      name="pumpSiteReachTime"
                      value={formData.pumpSiteReachTime}
                      onChange={handleInputChange}
                    />
                    <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                      <Clock className="size-5" />
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] gap-6">
                {/* Pumping Speed */}
                <div className="col-span-1">
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
                <div className="col-span-1 flex items-center justify-center text-sm text-gray-600">or</div>
                {/* Unloading Time */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Unloading Time (min)
                  </label>
                  <Input
                    type="number"
                    name="unloadingTime"
                    value={parseFloat(formData.unloadingTime)}
                    onChange={setPumpingSpeedAndUnloadingTime}
                    placeholder={
                      avgTMCap !== null ? "Auto-calculated from pumping speed" : "Enter pumping speed to calculate"
                    }
                  />
                  {avgTMCap !== null && (
                    <p className="text-xs text-gray-500 mt-1">
                      Auto-calculated based on avg. TM cpty: {avgTMCap?.toFixed(0)} m³
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Transit Mixer Details Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-gray-50 dark:bg-gray-900/30">
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-4">Transit Mixer Details</h3>
              <div className="grid grid-cols-3 gap-6">
                {/* Production and Buffer Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Production and Buffer Time (min)
                  </label>
                  <Input
                    type="number"
                    name="productionTime"
                    value={parseFloat(formData.productionTime)}
                    onChange={handleInputChange}
                    placeholder="Enter production time"
                  />
                </div>
                {/* Transit Mixer Onward Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Transit Mixer Onward Time (min)
                  </label>
                  <Input
                    type="number"
                    name="onwardTime"
                    value={parseFloat(formData.onwardTime)}
                    onChange={handleInputChange}
                    placeholder="Enter onward time"
                  />
                </div>
                {/* Transit Mixer Return Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Transit Mixer Return Time (min)
                  </label>
                  <Input
                    type="number"
                    name="returnTime"
                    value={parseFloat(formData.returnTime)}
                    onChange={handleInputChange}
                    placeholder="Enter return time"
                  />
                </div>
                {/* Grade of Concrete */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Grade of Concrete
                  </label>
                  <Input
                    type="number"
                    name="concreteGrade"
                    value={parseFloat(formData.concreteGrade)}
                    onChange={handleInputChange}
                    placeholder="Enter concrete grade"
                  />
                </div>
                {/* Type of Pumping Job */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Type of Pumping Job
                  </label>
                  <Input
                    type="number"
                    name="pumpingJob"
                    value={parseFloat(formData.pumpingJob)}
                    onChange={handleInputChange}
                    placeholder="Enter type of pumping job"
                  />
                </div>
                {/* Floor Height (Pumping) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Floor Height (Pumping)
                  </label>
                  <Input
                    type="number"
                    name="floorHeight"
                    value={parseFloat(formData.floorHeight)}
                    onChange={handleInputChange}
                    placeholder="Enter floor height"
                  />
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
                      const groupOrder = Object.keys(grouped)
                        .filter((g) => g !== "Unassigned")
                        .sort((a, b) => a.localeCompare(b))
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
                              <span className="flex-1 text-left">{plant}</span>
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
                                  <div className="bg-gray-50 dark:bg-gray-900/30 border border-t-0 border-gray-200 dark:border-gray-700 rounded-b-lg p-2 pl-6">
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
                                                <p className="text-sm text-gray-500 dark:text-gray-400 text-right">
                                                  Unavailable -
                                                </p>
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
                      const plantName = (plantsData || []).find((pl) => pl._id === pump.plant_id)?.name || "Unassigned";
                      return (
                        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-700 dark:text-white">{pump.identifier}</span>
                              <span className="text-xs px-2 py-1 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-full">
                                {plantName}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Capacity: {pump.capacity} m³</div>
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
        ) : step === 3 ? (
          // Loader for Step 3
          !calculatedTMs || !plantsData ? (
            <div className="flex justify-center items-center py-12">
              <span className="text-gray-500 dark:text-gray-400 text-lg">Loading...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {calculatedTMs && (
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Calculation Results</h4>
                  <div className="grid grid-cols-6 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Cycle Time (hours)</p>
                      <p className="text-lg font-medium text-gray-900 dark:text-white">
                        {calculatedTMs.cycle_time.toFixed(0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total Trips</p>
                      <p className="text-lg font-medium text-gray-900 dark:text-white">{calculatedTMs.total_trips}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Opt Required TMs</p>
                      <p className="text-lg font-medium text-gray-900 dark:text-white">
                        {calculatedTMs.tm_count}
                      </p>
                    </div>
                    <div>
                      <input
                        type="checkbox"
                        id="overrule-tm-count"
                        checked={overruleTMCount}
                        onChange={() => setOverruleTMCount((prev) => !prev)}
                        className="h-3 w-3 text-brand-500 rounded border-gray-300 focus:ring-brand-500 mr-2"
                      />
                      <label
                        htmlFor="overrule-tm-count"
                        className="text-sm text-gray-700 dark:text-gray-300 select-none"
                      >
                        Overrule recommended TM count
                      </label>
                    </div>
                    {overruleTMCount && (
                      <input
                        type="number"
                        min={1}
                        value={customTMCount}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setCustomTMCount(isNaN(val) ? 1 : val);
                          setHasChanged(true);
                        }}
                        className="mt-1 w-20 px-2 py-1 border border-gray-300 dark:border-gray-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        placeholder="TM count"
                      />
                    )}
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Avg Trips per TM</p>
                      <p className="text-lg font-medium text-gray-900 dark:text-white">{calculatedTMs.trips_per_tm}</p>
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
                  <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">Select TMs</h3>
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
                                <span className="flex-1 text-left">{plant}</span>
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
                                    <div className="bg-gray-50 dark:bg-gray-900/30 border border-t-0 border-gray-200 dark:border-gray-700 rounded-b-lg p-2 pl-6">
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

                {/* Right Column - TM Sequence */}
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">Arrange TM Sequence</h3>
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
        ) : (
          <div className="space-y-6">
            {/* Step 3 - Review */}
            <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">Review Schedule</h3>

            {generatedSchedule ? (
              <>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Client</h4>
                      <p className="text-gray-800 dark:text-white/90">{generatedSchedule.client_name}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Site Location</h4>
                      <p className="text-gray-800 dark:text-white/90">{generatedSchedule.site_address}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Schedule Date</h4>
                      <p className="text-gray-800 dark:text-white/90">{generatedSchedule.input_params.schedule_date}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Quantity</h4>
                      <p className="text-gray-800 dark:text-white/90">{generatedSchedule.input_params.quantity} m³</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Pumping Speed</h4>
                      <p className="text-gray-800 dark:text-white/90">
                        {generatedSchedule.input_params.pumping_speed} m³/hr
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</h4>
                      <Badge size="sm" color={generatedSchedule.status === "generated" ? "success" : "warning"}>
                        {generatedSchedule.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Schedule Details</h4>
                  <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                    <div className="max-w-full overflow-x-auto">
                      <Table>
                        <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                          <TableRow>
                            <TableCell
                              isHeader
                              className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                            >
                              Trip No
                            </TableCell>
                            <TableCell
                              isHeader
                              className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                            >
                              TM No
                            </TableCell>
                            <TableCell
                              isHeader
                              className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                            >
                              Plant Name
                            </TableCell>
                            <TableCell
                              isHeader
                              className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                            >
                              Plant Start
                            </TableCell>
                            <TableCell
                              isHeader
                              className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                            >
                              Pump Start
                            </TableCell>
                            <TableCell
                              isHeader
                              className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                            >
                              Unloading Time
                            </TableCell>
                            <TableCell
                              isHeader
                              className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                            >
                              Return Time
                            </TableCell>
                            <TableCell
                              isHeader
                              className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                            >
                              Completed Capacity
                            </TableCell>
                            <TableCell
                              isHeader
                              className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                            >
                              Cycle Time (min)
                            </TableCell>
                            <TableCell
                              isHeader
                              className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                            >
                              Cushion Time (min)
                            </TableCell>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                          {generatedSchedule.output_table.map((trip) => (
                            <TableRow key={trip.trip_no}>
                              <TableCell className="px-3 py-4 text-start">
                                <span className="text-gray-800 dark:text-white/90">{trip.trip_no}</span>
                              </TableCell>
                              <TableCell className="px-3 py-4 text-start">
                                <span className="text-gray-800 dark:text-white/90">
                                  {trip.tm_no}
                                  {typeof trip.trip_no_for_tm !== "undefined" && (
                                    <span className="text-xs text-gray-500 ml-1">({trip.trip_no_for_tm})</span>
                                  )}
                                </span>
                              </TableCell>
                              <TableCell className="px-3 py-4 text-start">
                                <span className="text-gray-800 dark:text-white/90">
                                  {trip.plant_name ? trip.plant_name : "N / A"}
                                </span>
                              </TableCell>
                              <TableCell className="px-3 py-4 text-start">
                                <span className="text-gray-500 dark:text-gray-400">
                                  {trip.plant_start
                                    ? new Date(trip.plant_start).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "-"}
                                </span>
                              </TableCell>
                              <TableCell className="px-3 py-4 text-start">
                                <span className="text-gray-500 dark:text-gray-400">
                                  {trip.pump_start
                                    ? new Date(trip.pump_start).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "-"}
                                </span>
                              </TableCell>
                              <TableCell className="px-3 py-4 text-start">
                                <span className="text-gray-500 dark:text-gray-400">
                                  {trip.unloading_time
                                    ? new Date(trip.unloading_time).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "-"}
                                </span>
                              </TableCell>
                              <TableCell className="px-3 py-4 text-start">
                                <span className="text-gray-500 dark:text-gray-400">
                                  {trip.return
                                    ? new Date(trip.return).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "-"}
                                </span>
                              </TableCell>
                              <TableCell className="px-3 py-4 text-start">
                                <span className="text-gray-800 dark:text-white/90">{trip.completed_capacity} m³</span>
                              </TableCell>
                              <TableCell className="px-3 py-4 text-start">
                                <span className="text-gray-800 dark:text-white/90">
                                  {typeof trip.cycle_time !== "undefined" ? (trip.cycle_time / 60).toFixed(0) : "-"}
                                </span>
                              </TableCell>
                              <TableCell className="px-3 py-4 text-start">
                                <span className="text-gray-800 dark:text-white/90">
                                  {typeof trip.cushion_time !== "undefined" ? (trip.cushion_time / 60).toFixed(0) : "-"}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            <div className="flex justify-between mt-8">
              <Button variant="outline" onClick={handleBack} className="flex items-center gap-2">
                <ArrowLeft size={16} />
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={isGenerating}>
                {isGenerating ? "Generating Schedule..." : generatedSchedule ? "View Schedule" : "Create Schedule"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

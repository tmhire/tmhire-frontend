"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/button/Button";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import Radio from "@/components/form/input/Radio";
import Input from "@/components/form/input/InputField";
import DatePickerInput from "@/components/form/input/DatePickerInput";
import { ArrowLeft, ArrowRight, Clock, CheckCircle2, GripVertical } from "lucide-react";
import { Reorder, motion } from "framer-motion";
import { useApiClient } from "@/hooks/useApiClient";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import { useRouter } from "next/navigation";

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

interface CalculateTMResponse {
  tm_count: number;
  schedule_id: string;
  required_tms: number;
  total_trips: number;
  trips_per_tm: number;
  cycle_time: number;
  available_tms: AvailableTM[];
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
  };
  output_table: ScheduleTrip[];
  tm_count: number;
  pumping_time: string | null;
  status: string;
}

const steps = [
  { id: 1, name: "Schedule Details" },
  { id: 2, name: "TM Selection" },
  { id: 3, name: "Review" },
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
    unloadingTime: "",
  });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [formDataRetrieved, setFormDataRetrieved] = useState(true);
  // Dropdown open state for custom dropdowns
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [isPumpDropdownOpen, setIsPumpDropdownOpen] = useState(false);

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
        setPumpType(data.data.pump_type);
        setFormData({
          scheduleDate: data.data.input_params.schedule_date,
          startTime: data.data.input_params.pump_start.split("T")[1],
          quantity: data.data.input_params.quantity.toString(),
          speed: data.data.input_params.pumping_speed.toString(),
          onwardTime: data.data.input_params.onward_time.toString(),
          returnTime: data.data.input_params.return_time.toString(),
          productionTime: data.data.input_params.buffer_time.toString(),
          concreteGrade: data.data.concreteGrade,
          siteAddress: data.data.site_address || "",
          pumpOnwardTime: data.data.input_params.pump_onward_time
            ? data.data.input_params.pump_onward_time.toString()
            : "",
          unloadingTime: "",
        });
        setTMSequence(
          Array.isArray(data?.data?.output_table)
            ? data.data.output_table.map((trip: { tm_id: string }) => trip.tm_id)
            : []
        );
        const tm_suggestions = {
          tm_count: data?.data?.tm_count,
          schedule_id: data?.data?.id,
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
            onward_time: parseFloat(formData.onwardTime),
            return_time: parseFloat(formData.returnTime),
            buffer_time: parseFloat(formData.productionTime),
            pump_start: `${formData.scheduleDate}T${formData.startTime}`,
            schedule_date: formData.scheduleDate,
            pump_onward_time: parseFloat(formData.pumpOnwardTime),
          },
          site_address: formData.siteAddress, // You might want to add this as a form field
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
            },
            site_address: formData.siteAddress, // You might want to add this as a form field
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
        body: JSON.stringify(tmSequence),
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
  };

  const selectedClientDetails = clientsData?.find((c: Client) => c._id === selectedClient);
  const filteredPumps = pumpsData?.filter((p: Pump) => p.type === pumpType) || [];
  const progressPercentage = ((step - 1) / (steps.length - 1)) * 100;

  // Helper to check if all required fields are filled
  const isStep1FormValid = () => {
    return (
      !!selectedClient &&
      !!selectedPump &&
      !!formData.siteAddress &&
      !!formData.scheduleDate &&
      !!formData.startTime &&
      !!formData.quantity &&
      !!formData.concreteGrade &&
      !!formData.onwardTime &&
      !!formData.returnTime &&
      !!formData.productionTime &&
      !!formData.pumpOnwardTime &&
      !!formData.speed
    );
  };

  const unloadingTime = (() => {
    if (!avgTMCap || !formData.speed) return "";
    const speed = parseFloat(formData.speed);
    if (!isNaN(speed) && speed > 0) {
      return ((avgTMCap / speed) * 60).toFixed(2);
    }
    return "";
  })();

  if (formDataRetrieved === false) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          <p className="text-sm">
            Error retrieving schedule data. Please ensure the schedule ID is correct or try again later.
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
          <p className="text-gray-500 dark:text-gray-400">Step {step} of 3</p>
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
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-6">
              {/* Client Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Choose Client</label>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Site Address</label>
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
                    <label className="block text-sm font-medium text-gray-400 dark:text-gray-300">Client Details</label>
                    <p className="mt-2 text-sm text-gray-400 dark:text-gray-400">
                      {selectedClientDetails.name} - {selectedClientDetails.contact_phone}
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-400">{selectedClientDetails.address}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Pump Details Row */}
            <div className="grid grid-cols-3 gap-6">
              {/* Pump Type Selection */}
              <div>
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
              {/* Pump Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Pump</label>
                <div className="relative">
                  <button
                    type="button"
                    className={`h-11 w-full appearance-none rounded-lg border border-gray-300 px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 text-left ${
                      selectedPump ? "text-gray-800 dark:text-white/90" : "text-gray-400 dark:text-gray-400"
                    }`}
                    onClick={() => setIsPumpDropdownOpen((open) => !open)}
                    aria-haspopup="listbox"
                    aria-expanded={isPumpDropdownOpen}
                  >
                    {filteredPumps.find((p: Pump) => p._id === selectedPump)?.identifier
                      ? `${filteredPumps.find((p: Pump) => p._id === selectedPump)?.identifier} (${
                          filteredPumps.find((p: Pump) => p._id === selectedPump)?.capacity
                        }m³)`
                      : "Select a pump"}
                  </button>
                  <Dropdown
                    isOpen={isPumpDropdownOpen}
                    onClose={() => setIsPumpDropdownOpen(false)}
                    className="w-full mt-1"
                  >
                    <DropdownItem
                      className="text-gray-400 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => {
                        setSelectedPump("");
                        setHasChanged(true);
                        setIsPumpDropdownOpen(false);
                      }}
                    >
                      Select a pump
                    </DropdownItem>
                    {filteredPumps.map((option: Pump) => (
                      <DropdownItem
                        key={option._id}
                        className="text-gray-800 dark:text-white/90 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => {
                          setSelectedPump(option._id);
                          setHasChanged(true);
                          setIsPumpDropdownOpen(false);
                        }}
                      >
                        {option.identifier} ({option.capacity}m³)
                      </DropdownItem>
                    ))}
                  </Dropdown>
                </div>
              </div>
              {/* Pump Onward Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pump Onward Time (min)
                </label>
                <Input
                  type="number"
                  name="pumpOnwardTime"
                  value={formData.pumpOnwardTime}
                  onChange={handleInputChange}
                  placeholder="Enter pump onward time"
                />
              </div>
            </div>

            {/* Other Inputs: 3 columns */}
            <div className="grid grid-cols-3 gap-6">
              {/* First row: Schedule Date, Pumping Quantity, Grade of Concrete */}
              <div>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pumping Quantity (m³)
                </label>
                <Input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  placeholder="Enter quantity"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Grade of Concrete
                </label>
                <Input
                  type="number"
                  name="concreteGrade"
                  value={formData.concreteGrade}
                  onChange={handleInputChange}
                  placeholder="Enter concrete grade"
                />
              </div>
              {/* Second row: Onward Time, Return Time, Production/Buffer Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Onward Time (min)
                </label>
                <Input
                  type="number"
                  name="onwardTime"
                  value={formData.onwardTime}
                  onChange={handleInputChange}
                  placeholder="Enter onward time"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Return Time (min)
                </label>
                <Input
                  type="number"
                  name="returnTime"
                  value={formData.returnTime}
                  onChange={handleInputChange}
                  placeholder="Enter return time"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Production and Buffer Time (min)
                </label>
                <Input
                  type="number"
                  name="productionTime"
                  value={formData.productionTime}
                  onChange={handleInputChange}
                  placeholder="Enter production time"
                />
              </div>
              {/* Third row: Pump Start Time, Pumping Speed, empty */}
              <div>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pumping Speed (m³/hr)
                </label>
                <Input
                  type="number"
                  name="speed"
                  value={formData.speed}
                  onChange={handleInputChange}
                  placeholder="Enter speed"
                />
              </div>
              {/* <div></div> */}
              {/* Unloading Time (calculated) */}
              <div className="">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Unloading Time (min)
                </label>
                <Input
                  type="number"
                  name="unloadingTime"
                  disabled
                  value={unloadingTime}
                  placeholder={
                    avgTMCap !== null ? "Auto-calculated from pumping speed" : "Enter pumping speed to calculate"
                  }
                />
                {avgTMCap !== null && (
                  <p className="text-xs text-gray-500 mt-1">
                    Auto-calculated based on avg. TM capacity: {avgTMCap?.toFixed(2)} m³
                  </p>
                )}
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
            {calculatedTMs && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Calculation Results</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Required TMs</p>
                    <p className="text-lg font-medium text-gray-900 dark:text-white">{calculatedTMs.tm_count}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Trips</p>
                    <p className="text-lg font-medium text-gray-900 dark:text-white">{calculatedTMs.total_trips}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Avg Trips per TM</p>
                    <p className="text-lg font-medium text-gray-900 dark:text-white">{calculatedTMs.trips_per_tm}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Cycle Time (hours)</p>
                    <p className="text-lg font-medium text-gray-900 dark:text-white">
                      {calculatedTMs.cycle_time.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              {/* Left Column - TM Selection */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">Select TMs</h3>
                <div className="space-y-4">
                  {calculatedTMs && calculatedTMs.available_tms && calculatedTMs.available_tms.length > 0 ? (
                    calculatedTMs.available_tms.map((tm) => {
                      return (
                        <label
                          key={tm.id}
                          className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                        >
                          <div className="flex flex-row items-center space-x-4">
                            <input
                              type="checkbox"
                              checked={tmSequence.includes(tm.id)}
                              disabled={!tm.availability}
                              onChange={(e) => {
                                setTMSequence((prev) => {
                                  const updated = e.target.checked
                                    ? [...prev, tm.id]
                                    : prev.filter((id) => id !== tm.id);
                                  console.log("Updated TM Sequence:", updated);
                                  return updated;
                                });
                                setHasChanged(true);
                              }}
                              className="h-4 w-4 text-brand-500 rounded border-gray-300 focus:ring-brand-500"
                            />
                            <div className="flex flex-row justify-between w-full">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{tm.identifier}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Capacity: {tm.capacity}m³</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {tm.plant_id && (
                              <span className="px-2 py-1 text-xs font-medium text-brand-600 bg-brand-50 dark:bg-brand-900/30 dark:text-brand-400 rounded-full">
                                Plant Assigned
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })
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
                  {tmSequence.length > 0 ? (
                    <Reorder.Group axis="y" values={tmSequence} onReorder={setTMSequence} className="space-y-2">
                      {tmSequence.map((tmId) => {
                        const tm = calculatedTMs?.available_tms.find((t) => t.id === tmId);
                        return (
                          <Reorder.Item
                            key={tmId}
                            value={tmId}
                            className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-grab active:cursor-grabbing"
                          >
                            <div className="flex items-center space-x-4">
                              <span className="text-gray-700 dark:text-gray-300">{tm?.identifier}</span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">({tm?.capacity}m³)</span>
                            </div>
                            <div className="flex items-center">
                              <GripVertical className="text-black/50" size={"18px"} />
                            </div>
                          </Reorder.Item>
                        );
                      })}
                    </Reorder.Group>
                  ) : (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      No TMs selected for sequencing
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <Button variant="outline" onClick={handleBack} className="flex items-center gap-2">
                <ArrowLeft size={16} />
                Back
              </Button>
              <Button onClick={handleNext} className="flex items-center gap-2">
                Next Step
                <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Step 3 - Review */}
            <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">Review Schedule</h3>

            {generatedSchedule && (
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
                              className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                            >
                              Trip No
                            </TableCell>
                            <TableCell
                              isHeader
                              className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                            >
                              TM No
                            </TableCell>
                            <TableCell
                              isHeader
                              className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                            >
                              Plant Start
                            </TableCell>
                            <TableCell
                              isHeader
                              className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                            >
                              Pump Start
                            </TableCell>
                            <TableCell
                              isHeader
                              className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                            >
                              Unloading Time
                            </TableCell>
                            <TableCell
                              isHeader
                              className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                            >
                              Return Time
                            </TableCell>
                            <TableCell
                              isHeader
                              className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                            >
                              Completed Capacity
                            </TableCell>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                          {generatedSchedule.output_table.map((trip) => (
                            <TableRow key={trip.trip_no}>
                              <TableCell className="px-5 py-4 text-start">
                                <span className="text-gray-800 dark:text-white/90">{trip.trip_no}</span>
                              </TableCell>
                              <TableCell className="px-5 py-4 text-start">
                                <span className="text-gray-800 dark:text-white/90">{trip.tm_no}</span>
                              </TableCell>
                              <TableCell className="px-5 py-4 text-start">
                                <span className="text-gray-500 dark:text-gray-400">
                                  {new Date(trip.plant_start).toLocaleTimeString()}
                                </span>
                              </TableCell>
                              <TableCell className="px-5 py-4 text-start">
                                <span className="text-gray-500 dark:text-gray-400">
                                  {new Date(trip.pump_start).toLocaleTimeString()}
                                </span>
                              </TableCell>
                              <TableCell className="px-5 py-4 text-start">
                                <span className="text-gray-500 dark:text-gray-400">
                                  {new Date(trip.unloading_time).toLocaleTimeString()}
                                </span>
                              </TableCell>
                              <TableCell className="px-5 py-4 text-start">
                                <span className="text-gray-500 dark:text-gray-400">
                                  {new Date(trip.return).toLocaleTimeString()}
                                </span>
                              </TableCell>
                              <TableCell className="px-5 py-4 text-start">
                                <span className="text-gray-800 dark:text-white/90">{trip.completed_capacity} m³</span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </>
            )}

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

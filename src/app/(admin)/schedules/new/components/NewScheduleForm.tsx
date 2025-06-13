"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/button/Button";
import Select from "@/components/form/Select";
import Radio from "@/components/form/input/Radio";
import Input from "@/components/form/input/InputField";
import DatePicker from "@/components/form/date-picker";
import { ArrowLeft, ArrowRight, Clock, CheckCircle2, GripVertical } from "lucide-react";
import { Reorder, motion } from "framer-motion";

interface Client {
  id: string;
  name: string;
  phone: string;
}

interface PumpType {
  id: string;
  name: string;
  type: "line" | "boom";
}

interface TM {
  id: string;
  name: string;
  plantId: string;
  plantName: string;
}

const clients: Client[] = [
  { id: "1", name: "ABC Construction", phone: "+1234567890" },
  { id: "2", name: "XYZ Builders", phone: "+0987654321" },
];

const pumpTypes: PumpType[] = [
  { id: "1", name: "Line Pump 32m", type: "line" },
  { id: "2", name: "Line Pump 36m", type: "line" },
  { id: "3", name: "Boom Pump 42m", type: "boom" },
  { id: "4", name: "Boom Pump 52m", type: "boom" },
];

const tms: TM[] = [
  { id: "1", name: "TM-001", plantId: "1", plantName: "Plant A" },
  { id: "2", name: "TM-002", plantId: "1", plantName: "Plant A" },
  { id: "3", name: "TM-003", plantId: "2", plantName: "Plant B" },
  { id: "4", name: "TM-004", plantId: "2", plantName: "Plant B" },
];

const steps = [
  { id: 1, name: "Schedule Details" },
  { id: 2, name: "TM Selection" },
  { id: 3, name: "Review" },
];

export default function NewScheduleForm() {
  const [step, setStep] = useState(1);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [pumpType, setPumpType] = useState<"line" | "boom">("line");
  const [selectedPump, setSelectedPump] = useState<string>("");
  const [selectedTMs, setSelectedTMs] = useState<string[]>([]);
  const [tmSequence, setTMSequence] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    scheduleDate: "",
    startTime: "",
    quantity: "",
    speed: "",
    onwardTime: "",
    returnTime: "",
    productionTime: "",
    concreteGrade: "",
  });
  const [isDarkMode, setIsDarkMode] = useState(false);

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
  };

  const handleNext = () => {
    setStep(step + 1);
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
      selectedTMs,
      tmSequence,
      ...formData,
    });
  };

  const selectedClientDetails = clients.find((c) => c.id === selectedClient);
  const filteredPumps = pumpTypes.filter((p) => p.type === pumpType);
  const progressPercentage = ((step - 1) / (steps.length - 1)) * 100;

  // Group TMs by plant
  const tmsByPlant = tms.reduce((acc, tm) => {
    if (!acc[tm.plantId]) {
      acc[tm.plantId] = {
        plantName: tm.plantName,
        tms: [],
      };
    }
    acc[tm.plantId].tms.push(tm);
    return acc;
  }, {} as Record<string, { plantName: string; tms: TM[] }>);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-row w-full mb-4 items-center">
        <div className="w-1/3">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">New Schedule</h2>
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
                    className={`flex items-center justify-center w-6 h-6 rounded-full border-2 relative z-10 ${
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
            <div className="grid grid-cols-2 gap-6">
              {/* Client Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Choose Client</label>
                <Select
                  options={clients.map((c) => ({ value: c.id, label: c.name }))}
                  defaultValue={selectedClient}
                  onChange={setSelectedClient}
                  placeholder="Select a client"
                  className="dark:bg-dark-900"
                />
              </div>
              <div className="flex justify-start items-end">
                {selectedClientDetails && (
                  <div className="flex flex-col gap-0">
                    <label className="block text-sm font-medium text-gray-400 dark:text-gray-300 ">
                      Client Details
                    </label>
                    <p className="mt-2 text-sm text-gray-400 dark:text-gray-400">
                      {selectedClientDetails.name} - {selectedClientDetails.phone}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Client and Pump Type Section */}
            <div className="grid grid-cols-2 gap-6">
              {/* Pump Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Pump</label>
                <Select
                  options={filteredPumps.map((p) => ({ value: p.id, label: p.name }))}
                  defaultValue={selectedPump}
                  onChange={setSelectedPump}
                  placeholder="Select a pump"
                  className="dark:bg-dark-900"
                />
              </div>
              {/* Pump Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pump Type</label>
                <div className="flex flex-wrap items-center gap-8">
                  <Radio
                    id="line-pump"
                    name="pump-type"
                    value="line"
                    checked={pumpType === "line"}
                    onChange={(value) => {
                      setPumpType(value as "line" | "boom");
                      setSelectedPump("");
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
                    }}
                    label="Boom Pump"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Schedule Date */}
              <div>
                <DatePicker
                  id="schedule-date"
                  label="Schedule Date of Pumping"
                  placeholder="Select a date"
                  onChange={(dates, currentDateString) => {
                    setFormData((prev) => ({
                      ...prev,
                      scheduleDate: currentDateString,
                    }));
                  }}
                />
              </div>

              {/* Pump Start Time */}
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

              {/* Pumping Quantity */}
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

              {/* Pumping Speed */}
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

              {/* Onward Time */}
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

              {/* Return Time */}
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

              {/* Production and Buffer Time */}
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

              {/* Grade of Concrete */}
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
            </div>

            <div className="flex justify-end mt-8">
              <Button onClick={handleNext} className="flex items-center gap-2">
                Next Step
                <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        ) : step === 2 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column - TM Selection */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">Select TMs</h3>
                <div className="space-y-4">
                  {Object.entries(tmsByPlant).map(([plantId, { plantName, tms }]) => (
                    <div key={plantId} className="space-y-2">
                      <h4 className="font-medium text-gray-700 dark:text-gray-300">{plantName}</h4>
                      <div className="space-y-2">
                        {tms.map((tm) => (
                          <label
                            key={tm.id}
                            className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedTMs.includes(tm.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTMs([...selectedTMs, tm.id]);
                                  setTMSequence([...tmSequence, tm.id]);
                                } else {
                                  setSelectedTMs(selectedTMs.filter((id) => id !== tm.id));
                                  setTMSequence(tmSequence.filter((id) => id !== tm.id));
                                }
                              }}
                              className="h-4 w-4 text-brand-500 rounded border-gray-300 focus:ring-brand-500"
                            />
                            <span className="text-gray-700 dark:text-gray-300">{tm.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column - TM Sequence */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">Arrange TM Sequence</h3>
                <div className="space-y-2">
                  <Reorder.Group axis="y" values={tmSequence} onReorder={setTMSequence} className="space-y-2">
                    {tmSequence.map((tmId) => {
                      const tm = tms.find((t) => t.id === tmId);
                      return (
                        <Reorder.Item
                          key={tmId}
                          value={tmId}
                          className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-grab active:cursor-grabbing"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-gray-700 dark:text-gray-300">{tm?.name}</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">({tm?.plantName})</span>
                          </div>
                          <div className="flex items-center">
                            <GripVertical className="text-black/50" size={"18px"} />
                          </div>
                        </Reorder.Item>
                      );
                    })}
                  </Reorder.Group>
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
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Client</h4>
                  <p className="text-gray-800 dark:text-white/90">{selectedClientDetails?.name}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Pump Type</h4>
                  <p className="text-gray-800 dark:text-white/90">{pumpType === "line" ? "Line Pump" : "Boom Pump"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Selected Pump</h4>
                  <p className="text-gray-800 dark:text-white/90">
                    {pumpTypes.find((p) => p.id === selectedPump)?.name}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Schedule Date</h4>
                  <p className="text-gray-800 dark:text-white/90">{formData.scheduleDate}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Start Time</h4>
                  <p className="text-gray-800 dark:text-white/90">{formData.startTime}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Pumping Quantity</h4>
                  <p className="text-gray-800 dark:text-white/90">{formData.quantity} m³</p>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">TM Sequence</h4>
              <div className="space-y-2">
                {tmSequence.map((tmId, index) => {
                  const tm = tms.find((t) => t.id === tmId);
                  return (
                    <div
                      key={tmId}
                      className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <span className="text-gray-500 dark:text-gray-400">{index + 1}.</span>
                      <span className="text-gray-800 dark:text-white/90">{tm?.name}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">({tm?.plantName})</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <Button variant="outline" onClick={handleBack} className="flex items-center gap-2">
                <ArrowLeft size={16} />
                Back
              </Button>
              <Button onClick={handleSubmit}>Create Schedule</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

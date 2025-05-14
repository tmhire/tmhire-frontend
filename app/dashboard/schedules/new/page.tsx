"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { scheduleApi, clientApi } from "@/lib/api/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { useForm, SubmitHandler, Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Link from "next/link";
import { ArrowRightIcon, CalendarIcon, ClockIcon } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  client_id: z.string().optional(),
  client_name: z.string().min(1, "Client name is required").optional(),
  site_location: z.string().min(1, "Site location is required"),
  input_params: z.object({
    quantity: z.coerce.number().positive("Quantity must be positive"),
    pumping_speed: z.coerce.number().positive("Pumping speed must be positive"),
    onward_time: z.coerce.number().positive("Onward time must be positive"),
    return_time: z.coerce.number().positive("Return time must be positive"),
    buffer_time: z.coerce.number().positive("Buffer time must be positive"),
    pump_start: z.date({
      required_error: "Pump start time is required",
    }),
    schedule_date: z.date({
      required_error: "Schedule date is required",
    }),
  }),
}).refine(
  (data) => {
    return data.client_id !== undefined || data.client_name !== undefined;
  },
  {
    message: "Either client name or client ID must be provided",
    path: ["client_name"],
  }
);

type FormValues = z.infer<typeof formSchema>;

interface InputParams {
  quantity: number;
  pumping_speed: number;
  onward_time: number;
  return_time: number;
  buffer_time: number;
  pump_start: string;
  schedule_date: string;
}

interface OutputTableRow {
  trip_no: number;
  tm_no: string;
  tm_id: string;
  plant_start: string;
  pump_start: string;
  unloading_time: string;
  return: string;
  completed_capacity: number;
}

interface ScheduleOutput {
  _id: string;
  user_id: string;
  client_id: string;
  client_name: string;
  site_location: string;
  created_at: string;
  last_updated: string;
  input_params: InputParams;
  output_table: OutputTableRow[];
  tm_count: number;
  tm_identifiers?: string[];
  pumping_time: string | null;
  status: string;
}

const formatTo12Hour = (timestamp: string | number | Date) => {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function CreateSchedulePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [requiredTMCount, setRequiredTMCount] = useState<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [scheduleTmIdentifiers, setScheduleTmIdentifiers] = useState<string[]>([]);
  const [scheduleId, setScheduleId] = useState<string>("");
  const [outputData, setOutputData] = useState<ScheduleOutput | null>(null);
  const [selectedTMs, setSelectedTMs] = useState<string[]>([]);
  const [step, setStep] = useState<"input" | "select-tms" | "results">("input");
  const [useExistingClient, setUseExistingClient] = useState(true);
  const [tmSearchQuery, setTmSearchQuery] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  // Get today's date at 9:00 AM for default pump start time
  const defaultPumpStart = new Date();
  defaultPumpStart.setHours(9, 0, 0, 0);

  // Get tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_id: undefined,
      client_name: "",
      site_location: "",
      input_params: {
        quantity: undefined,
        pumping_speed: undefined,
        onward_time: undefined,
        return_time: undefined,
        buffer_time: undefined,
        pump_start: defaultPumpStart,
        schedule_date: tomorrow,
      },
    },
  });

  // Fetch clients
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const response = await clientApi.getAllClients();
      return response;
    },
    enabled: isAuthenticated,
  });

  // Step 1: Calculate required TMs and create draft schedule
  const calculateTMsMutation = useMutation({
    mutationFn: (data: FormValues) => {
      // Convert dates to ISO strings
      const formattedData = {
        ...data,
        input_params: {
          ...data.input_params,
          pump_start: data.input_params.pump_start.toISOString(),
          schedule_date: format(data.input_params.schedule_date, 'yyyy-MM-dd'),
        }
      };
      return scheduleApi.calculateTMs(formattedData);
    },
    onSuccess: response => {
      setScheduleId(response.schedule_id);
      setRequiredTMCount(response.tm_count);
      setScheduleTmIdentifiers(response.tm_identifiers || []);
      setStep("select-tms");
    },
    onError: error => {
      console.error("Error calculating TMs:", error);
      toast.error("Failed to calculate required TMs");
    },
  });

  // Fetch available TMs for the selected date
  const { data: availableTMs = [], isLoading: tmsLoading } = useQuery({
    queryKey: ["available-tms", form.watch("input_params.schedule_date")],
    queryFn: () => {
      const date = format(form.watch("input_params.schedule_date"), "yyyy-MM-dd");
      return scheduleApi.getAvailableTMs(date);
    },
    enabled: isAuthenticated && step === "select-tms",
  });

  // Step 2: Generate schedule with selected TMs
  const generateScheduleMutation = useMutation({
    mutationFn: () =>
      scheduleApi.generateSchedule({
        scheduleId,
        selected_tms: selectedTMs,
      }),
    onSuccess: response => {
      setOutputData(response as ScheduleOutput);
      setStep("results");
      toast.success("Schedule generated successfully");
  
      // Invalidate schedules & calendar queries
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
    onError: error => {
      console.error("Error generating schedule:", error);
      toast.error("Failed to generate schedule");
    },
  });

  // When client_id changes, update the client_name
  useEffect(() => {
    const clientId = form.watch("client_id");
    if (clientId && clients) {
      const selectedClient = clients.find(c => c._id === clientId);
      if (selectedClient) {
        form.setValue("client_name", selectedClient.name);
      }
    }
  }, [form.watch("client_id"), clients, form]);

  const onSubmit = (data: FormValues) => {
    // Reset states when starting a new calculation
    setOutputData(null);
    setRequiredTMCount(null);
    setSelectedTMs([]);
    setScheduleTmIdentifiers([]);
    
    calculateTMsMutation.mutate(data);
  };

  const handleTMSelect = (tmId: string) => {
    setSelectedTMs(prev =>
      prev.includes(tmId) ? prev.filter(id => id !== tmId) : [...prev, tmId]
    );
  };

  const handleGenerateClick = () => {
    if (selectedTMs.length === 0) {
      toast.error(`Please select at least one Transit Mixer`);
      return;
    }

    generateScheduleMutation.mutate();
  };

  const handleViewSchedule = () => {
    if (scheduleId) {
      router.push(`/dashboard/schedules/${scheduleId}`);
    }
  };

  const toggleClientMode = () => {
    setUseExistingClient(!useExistingClient);
    // Reset client fields when toggling
    form.setValue("client_id", undefined);
    form.setValue("client_name", "");
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-6rem)]">
        <Spinner size="small" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Create New Schedule</h1>
      </div>

      {/* Step 1: Input Schedule Details */}
      {step === "input" && (
        <Card>
          <CardHeader>
            <CardTitle>Schedule Details</CardTitle>
            <CardDescription>
              Enter the details for your concrete delivery schedule
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit as SubmitHandler<FormValues>)}
                className="space-y-6"
                id="schedule-form"
              >
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="use-existing-client" 
                      checked={useExistingClient} 
                      onCheckedChange={() => toggleClientMode()}
                    />
                    <label
                      htmlFor="use-existing-client"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Use existing client
                    </label>
                  </div>

                  {useExistingClient ? (
                    <FormField
                      control={form.control as Control<FormValues>}
                      name="client_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a client" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {clientsLoading ? (
                                <div className="flex justify-center py-2">
                                  <Spinner size="small" />
                                </div>
                              ) : clients && clients.length > 0 ? (
                                clients.map((client) => (
                                  <SelectItem key={client._id} value={client._id}>
                                    {client.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="" disabled>
                                  No clients available
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            <Button 
                              variant="link" 
                              className="p-0 h-auto"
                              type="button"
                              asChild
                            >
                              <Link href="/dashboard/clients">Manage clients</Link>
                            </Button>
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={form.control as Control<FormValues>}
                      name="client_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Client Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control as Control<FormValues>}
                    name="site_location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Site Location</FormLabel>
                        <FormControl>
                          <Input placeholder="Construction site address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control as Control<FormValues>}
                      name="input_params.quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity (m³)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="100"
                              value={field.value === undefined ? '' : field.value}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(value === "" ? '' : parseFloat(value));
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control as Control<FormValues>}
                      name="input_params.pumping_speed"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pumping Speed (m³/hr)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="30"
                              value={field.value === undefined ? '' : field.value}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(value === "" ? '' : parseFloat(value));
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control as Control<FormValues>}
                      name="input_params.schedule_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Schedule Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control as Control<FormValues>}
                      name="input_params.onward_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Onward Time (min)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="30"
                              value={field.value === undefined ? '' : field.value}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(value === "" ? '' : parseFloat(value));
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Plant to site travel time
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control as Control<FormValues>}
                      name="input_params.return_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Return Time (min)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="30"
                              value={field.value === undefined ? '' : field.value}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(value === "" ? '' : parseFloat(value));
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Site to plant travel time
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control as Control<FormValues>}
                      name="input_params.buffer_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Buffer Time (min)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="15"
                              value={field.value === undefined ? '' : field.value}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(value === "" ? '' : parseFloat(value));
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Extra time between trips
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control as Control<FormValues>}
                    name="input_params.pump_start"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Pump Start Time</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "h:mm a")
                                ) : (
                                  <span>Pick a time</span>
                                )}
                                <ClockIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-4" align="start">
                            <div className="grid gap-2">
                              <div className="grid grid-cols-2 gap-2">
                                {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map((hour) => {
                                  const date = new Date();
                                  date.setHours(hour, 0, 0, 0);
                                  return (
                                    <Button
                                      key={hour}
                                      variant="outline"
                                      className={cn(
                                        "text-center font-normal",
                                        field.value && field.value.getHours() === hour && 
                                        field.value.getMinutes() === 0 && "bg-primary text-primary-foreground"
                                      )}
                                      onClick={() => field.onChange(date)}
                                      type="button"
                                    >
                                      {format(date, "h:mm a")}
                                    </Button>
                                  );
                                })}
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map((hour) => {
                                  const date = new Date();
                                  date.setHours(hour, 30, 0, 0);
                                  return (
                                    <Button
                                      key={hour + 0.5}
                                      variant="outline"
                                      className={cn(
                                        "text-center font-normal",
                                        field.value && field.value.getHours() === hour && 
                                        field.value.getMinutes() === 30 && "bg-primary text-primary-foreground"
                                      )}
                                      onClick={() => field.onChange(date)}
                                      type="button"
                                    >
                                      {format(date, "h:mm a")}
                                    </Button>
                                  );
                                })}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button
              type="submit"
              form="schedule-form"
              disabled={calculateTMsMutation.isPending}
            >
              {calculateTMsMutation.isPending ? (
                <Spinner size="small" />
              ) : (
                <>
                  Next
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: Select Transit Mixers */}
      {step === "select-tms" && (
        <Card>
          <CardHeader>
            <CardTitle>Select Transit Mixers</CardTitle>
            <CardDescription>
              {requiredTMCount
                ? `You need ${requiredTMCount} transit mixers for this schedule.`
                : "Select transit mixers to use for this schedule."}
            </CardDescription>
           
          </CardHeader>
          <CardContent>
            {tmsLoading ? (
              <div className="flex justify-center">
                <Spinner size="small" />
              </div>
            ) : availableTMs.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">
                  No transit mixers are available for the selected date.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Search Transit Mixers..."
                      value={tmSearchQuery}
                      onChange={(e) => setTmSearchQuery(e.target.value)}
                      className="pr-10"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setTmSearchQuery("")}
                      disabled={!tmSearchQuery}
                    >
                      {tmSearchQuery ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {availableTMs
                    .filter(tm => 
                      tmSearchQuery === "" || 
                      tm.identifier.toLowerCase().includes(tmSearchQuery.toLowerCase())
                    )
                    .map((tm) => (
                      <div
                        key={tm._id}
                        className={`flex items-center justify-between border p-2 rounded-md ${
                          selectedTMs.includes(tm._id) ? "bg-primary/5 border-primary/30" : ""
                        } hover:bg-accent cursor-pointer transition-colors`}
                        onClick={() => handleTMSelect(tm._id)}
                      >
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`tm-${tm._id}`}
                            checked={selectedTMs.includes(tm._id)}
                            onCheckedChange={() => handleTMSelect(tm._id)}
                            onClick={e => e.stopPropagation()}
                          />
                          <div className="text-sm">
                            <p className="font-medium">{tm.identifier}</p>
                            <p className="text-xs text-muted-foreground">
                              Capacity: {tm.capacity} m³
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
                
                <div className="mt-4 bg-muted/30 p-2 rounded-md">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">{selectedTMs.length} TMs selected</span>
                    {selectedTMs.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setSelectedTMs([])}
                        className="h-7 px-2 text-xs"
                      >
                        Clear All
                      </Button>
                    )}
                    {requiredTMCount && selectedTMs.length < requiredTMCount && (
                      <span className="text-amber-600 text-xs">
                        You need {requiredTMCount - selectedTMs.length} more TMs
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("input")}>
              Back
            </Button>
            <Button
              onClick={handleGenerateClick}
              disabled={generateScheduleMutation.isPending || selectedTMs.length === 0}
            >
              {generateScheduleMutation.isPending ? (
                <Spinner size="small" />
              ) : (
                "Generate Schedule"
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 3: Results */}
      {step === "results" && outputData && (
        <Card>
          <CardHeader>
            <CardTitle>Schedule Generated</CardTitle>
            <CardDescription>
              Schedule details for {outputData.client_name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Total Quantity
                  </h3>
                  <p className="text-lg font-medium">
                    {outputData.input_params.quantity} m³
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Transit Mixers Used
                  </h3>
                  <p className="text-lg font-medium">{outputData.tm_count}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Pumping Time
                  </h3>
                  <p className="text-lg font-medium">
                    {outputData.pumping_time
                      ? `${outputData.pumping_time} minutes`
                      : "Not calculated"}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-base font-medium mb-2">Schedule Timeline</h3>
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Trip #</TableHead>
                        <TableHead>TM</TableHead>
                        <TableHead>Plant Start</TableHead>
                        <TableHead>Pump Start</TableHead>
                        <TableHead>Unloading Done</TableHead>
                        <TableHead>Return to Plant</TableHead>
                        <TableHead>Completed Capacity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {outputData.output_table.map((row) => (
                        <TableRow key={`${row.trip_no}-${row.tm_no}`}>
                          <TableCell>{row.trip_no}</TableCell>
                          <TableCell>{row.tm_no}</TableCell>
                          <TableCell>{formatTo12Hour(row.plant_start)}</TableCell>
                          <TableCell>{formatTo12Hour(row.pump_start)}</TableCell>
                          <TableCell>
                            {formatTo12Hour(row.unloading_time)}
                          </TableCell>
                          <TableCell>{formatTo12Hour(row.return)}</TableCell>
                          <TableCell>{row.completed_capacity} m³</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("input")}>
              Create Another Schedule
            </Button>
            <Button onClick={handleViewSchedule}>View Schedule</Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
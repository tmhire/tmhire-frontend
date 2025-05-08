"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { scheduleApi } from "@/lib/api/api";
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
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { ScheduleHistory } from "@/components/schedules/schedule-history";
import { useAuth } from "@/lib/auth/auth-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { ArrowRightIcon, CheckIcon } from "lucide-react";
import { Spinner } from "@/components/Spinner";

const formSchema = z.object({
  client_name: z.string().optional(),
  input_params: z.object({
    quantity: z.coerce.number().positive("Quantity must be positive"),
    pumping_speed: z.coerce.number().positive("Pumping speed must be positive"),
    onward_time: z.coerce.number().positive("Onward time must be positive"),
    return_time: z.coerce.number().positive("Return time must be positive"),
    buffer_time: z.coerce.number().positive("Buffer time must be positive"),
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface InputParams {
  quantity: number;
  pumping_speed: number;
  onward_time: number;
  return_time: number;
  buffer_time: number;
}

interface OutputTableRow {
  trip_no: number;
  tm_no: string;
  plant_start: string;
  pump_start: string;
  unloading_time: string;
  return: string;
}

interface ScheduleOutput {
  _id: string;
  user_id: string;
  client_name: string;
  created_at: string;
  last_updated: string;
  input_params: InputParams;
  output_table: OutputTableRow[];
  tm_count: number;
  pumping_time: string | null;
  status: string;
}


export default function CreateSchedulePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [requiredTMCount, setRequiredTMCount] = useState<number | null>(null);
  const [scheduleId, setScheduleId] = useState<string>("");
  const [outputData, setOutputData] = useState<ScheduleOutput | null>(null);
  const [selectedTMs, setSelectedTMs] = useState<string[]>([]);
  const [step, setStep] = useState<"input" | "select-tms" | "results">("input");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_name: "",
      input_params: {
        quantity: undefined,
        pumping_speed: undefined,
        onward_time: undefined,
        return_time: undefined,
        buffer_time: undefined,
      },
    },
  });

  // Step 1: Calculate required TMs and create draft schedule
  const calculateTMsMutation = useMutation({
    mutationFn: (data: FormValues) => scheduleApi.calculateTMs(data),
    onSuccess: response => {
      setScheduleId(response.schedule_id);
      setRequiredTMCount(response.tm_count);
      setStep("select-tms");
      // toast.success(`You need ${response.tm_count} Transit Mixers`);
    },
    onError: error => {
      console.error("Error calculating TMs:", error);
      toast.error("Failed to calculate required TMs");
    },
  });

  // Fetch available TMs
  const { data: availableTMs = [], isLoading: tmsLoading } = useQuery({
    queryKey: ["available-tms"],
    queryFn: () => scheduleApi.getAvailableTMs(),
    enabled: isAuthenticated && step === "select-tms",
  });

  // Step 2: Generate schedule with selected TMs
  const generateScheduleMutation = useMutation({
    mutationFn: () =>
      scheduleApi.generateSchedule({
        scheduleId,
        selected_tm_ids: selectedTMs,
      }),
    onSuccess: response => {
      // @ts-expect-error - response matches ScheduleOutput now
      setOutputData(response); // ✅ response matches ScheduleOutput now
      setStep("results");
      toast.success("Schedule generated successfully");
    },
    onError: error => {
      console.error("Error generating schedule:", error);
      toast.error("Failed to generate schedule");
    },
  });

  const onSubmit = (data: FormValues) => {
    // Reset states when starting a new calculation
    setOutputData(null);
    setRequiredTMCount(null);
    setSelectedTMs([]);
    calculateTMsMutation.mutate(data);
  };

  const handleTMSelect = (tmId: string) => {
    setSelectedTMs(prev =>
      prev.includes(tmId) ? prev.filter(id => id !== tmId) : [...prev, tmId]
    );
  };

  const handleGenerateClick = () => {
    if (selectedTMs.length < 0) {
      toast.error(`Please select at least ${requiredTMCount} Transit Mixers`);
      return;
    }

    generateScheduleMutation.mutate();
  };

  const handleViewSchedule = () => {
    if (scheduleId) {
      router.push(`/dashboard/schedules/${scheduleId}`);
    }
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
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Create Schedule</h1>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <div
            className={`flex items-center ${
              step === "input" ? "text-primary font-medium" : ""
            }`}
          >
            <span className="inline-flex items-center justify-center rounded-full border w-6 h-6 mr-2 bg-background">
              1
            </span>
            <span>Input Parameters</span>
          </div>

          <ArrowRightIcon className="h-4 w-4 mx-1" />

          <div
            className={`flex items-center ${
              step === "select-tms" ? "text-primary font-medium" : ""
            }`}
          >
            <span className="inline-flex items-center justify-center rounded-full border w-6 h-6 mr-2 bg-background">
              2
            </span>
            <span>Select TMs</span>
          </div>

          <ArrowRightIcon className="h-4 w-4 mx-1" />

          <div
            className={`flex items-center ${
              step === "results" ? "text-primary font-medium" : ""
            }`}
          >
            <span className="inline-flex items-center justify-center rounded-full border w-6 h-6 mr-2 bg-background">
              3
            </span>
            <span>Review Schedule</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2">
          {/* Step 1: Input Parameters Form */}
          {step === "input" && (
            <Card>
              <CardHeader>
                <CardTitle>Input Parameters</CardTitle>
                <CardDescription>
                  Enter the details for your Transit Mixer Calculator by TMHire
                  schedule
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="client_name">Client Name</Label>
                    <Input
                      id="client_name"
                      {...form.register("client_name")}
                      placeholder="Optional client name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity">Concrete Quantity (m³)</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.1"
                      {...form.register("input_params.quantity", {
                        valueAsNumber: true,
                      })}
                    />
                    {form.formState.errors.input_params?.quantity && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.input_params.quantity.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pumping_speed">Pumping Speed (m³/h)</Label>
                    <Input
                      id="pumping_speed"
                      type="number"
                      step="0.1"
                      {...form.register("input_params.pumping_speed", {
                        valueAsNumber: true,
                      })}
                    />
                    {form.formState.errors.input_params?.pumping_speed && (
                      <p className="text-sm text-red-500">
                        {
                          form.formState.errors.input_params.pumping_speed
                            .message
                        }
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="onward_time">Onward Time (min)</Label>
                    <Input
                      id="onward_time"
                      type="number"
                      {...form.register("input_params.onward_time", {
                        valueAsNumber: true,
                      })}
                    />
                    {form.formState.errors.input_params?.onward_time && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.input_params.onward_time.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="return_time">Return Time (min)</Label>
                    <Input
                      id="return_time"
                      type="number"
                      {...form.register("input_params.return_time", {
                        valueAsNumber: true,
                      })}
                    />
                    {form.formState.errors.input_params?.return_time && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.input_params.return_time.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="buffer_time">Buffer Time (min)</Label>
                    <Input
                      id="buffer_time"
                      type="number"
                      {...form.register("input_params.buffer_time", {
                        valueAsNumber: true,
                      })}
                    />
                    {form.formState.errors.input_params?.buffer_time && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.input_params.buffer_time.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full mt-4"
                    disabled={calculateTMsMutation.isPending}
                  >
                    {calculateTMsMutation.isPending
                      ? "Calculating..."
                      : "Calculate Required TMs"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
          {/* Step 2: TM Selection */}
          {step === "select-tms" && (
            <Card>
              <CardHeader>
                <CardTitle>Select Transit Mixers</CardTitle>
                <CardDescription>
                  {`You need to select at least 1 Transit Mixers for this schedule`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tmsLoading ? (
                  <div className="py-8 text-center">
                    Loading available Transit Mixers...
                  </div>
                ) : availableTMs.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground mb-4">
                      No Transit Mixers found
                    </p>
                    <Button asChild>
                      <Link href="/dashboard/tms">Add Transit Mixers</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-2 max-h-[400px] overflow-y-auto border rounded-md p-3">
                      {availableTMs.map(tm => (
                        <div
                          key={tm._id}
                          className="flex items-center justify-between border-b pb-2"
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`tm-${tm._id}`}
                              checked={selectedTMs.includes(tm._id)}
                              onCheckedChange={() => handleTMSelect(tm._id)}
                            />
                            <Label
                              htmlFor={`tm-${tm._id}`}
                              className="font-medium"
                            >
                              {tm.identifier}
                            </Label>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {tm.capacity} m³
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setStep("input")}
                      >
                        Back
                      </Button>
                      <Button
                        onClick={handleGenerateClick}
                        disabled={selectedTMs.length === 0}
                      >
                        {generateScheduleMutation.isPending
                          ? "Generating..."
                          : "Generate Schedule"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {/* Step 3: Results */}
          {step === "results" && (
            <Card>
              <CardHeader>
                <CardTitle>Schedule Generated</CardTitle>
                <CardDescription>
                  Review your generated schedule below
                </CardDescription>
              </CardHeader>
              <CardContent>
                {outputData &&
                outputData.output_table &&
                outputData.output_table.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Trip #</TableHead>
                        <TableHead>TM</TableHead>
                        <TableHead>Plant Start</TableHead>
                        <TableHead>Pump Start</TableHead>
                        <TableHead>Unloading</TableHead>
                        <TableHead>Return</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {outputData.output_table.map(row => (
                        <TableRow key={`${row.trip_no}-${row.tm_no}`}>
                          <TableCell>{row.trip_no}</TableCell>
                          <TableCell className="font-medium">
                            {row.tm_no}
                          </TableCell>
                          <TableCell>{row.plant_start}</TableCell>
                          <TableCell>{row.pump_start}</TableCell>
                          <TableCell>{row.unloading_time}</TableCell>
                          <TableCell>{row.return}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableCaption>
                      Total of {outputData.output_table.length} trips scheduled.
                    </TableCaption>
                  </Table>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground">
                      No schedule data available
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-4">
                <Button variant="outline" onClick={() => setStep("select-tms")}>
                  Back to TM Selection
                </Button>
                <Button onClick={handleViewSchedule}>
                  <CheckIcon className="h-4 w-4 mr-2" />
                  View Complete Schedule
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>

        {/* Schedule History - always visible */}
        <div className="md:col-span-1">
          <ScheduleHistory
            onSelectSchedule={selectedSchedule => {
              const params = {
                // client_name: selectedSchedule.client_name || "",
                input_params: selectedSchedule.input_params,
              };
              form.reset(params);
              setStep("input");
            }}
          />
        </div>
      </div>
    </div>
  );
}

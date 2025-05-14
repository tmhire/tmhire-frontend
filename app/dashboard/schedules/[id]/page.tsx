"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { scheduleApi } from "@/lib/api/api";
import { useAuth } from "@/lib/auth/auth-context";
import { useAuthApi } from "@/lib/api/use-auth-api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CalendarIcon,
  ClockIcon,
  ArrowLeftIcon,
  AlertCircleIcon,
  FileTextIcon,
  TruckIcon,
  Trash2,
  DownloadIcon,
  PlayIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
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
import { Spinner } from "@/components/Spinner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface OutputTableRow {
  trip_no: number;
  tm_no: string;
  plant_start: string;
  pump_start: string;
  unloading_time: string;
  return: string;
  completed_capacity?: number;
  output_table?: OutputTableRow[];
}

interface Schedule {
  _id: string;
  user_id: string;
  client_id: string;
  client_name: string;
  site_location: string;
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
  };
  output_table: OutputTableRow[];
  tm_count: number | null;
  tm_identifiers?: string[];
  pumping_time: number | null;
  status: string;
}

const formatTo12Hour = (timestamp: string | number | Date) => {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};


export default function ScheduleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const api = useAuthApi();
  const queryClient = useQueryClient();
  const scheduleId = params.id as string;
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTMs, setSelectedTMs] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch schedule
  const {
    data: schedule,
    isLoading,
    error,
  } = useQuery<Schedule>({
    queryKey: ["schedules", scheduleId],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; message: string; data: Schedule }>(`/schedules/${scheduleId}`);
      return response.data;
    },
    enabled: isAuthenticated && Boolean(scheduleId),
  });

  // Fetch available TMs
  const { data: availableTMs = [], isLoading: tmsLoading } = useQuery({
    queryKey: ["available-tms"],
    queryFn: () => {
      const date = schedule?.input_params?.schedule_date || new Date().toISOString().split('T')[0];
      return scheduleApi.getAvailableTMs(date);
    },
    enabled: isAuthenticated && isGenerating,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => scheduleApi.deleteSchedule(scheduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      toast.success("Schedule deleted successfully");
      router.push("/dashboard/schedules");
    },
    onError: error => {
      toast.error("Failed to delete schedule");
      console.error("Delete error:", error);
    },
  });

  // Add handler for TM selection
  const handleTMSelect = (tmId: string) => {
    setSelectedTMs(prev =>
      prev.includes(tmId) ? prev.filter(id => id !== tmId) : [...prev, tmId]
    );
  };

  // Generate schedule mutation
  const generateScheduleMutation = useMutation({
    mutationFn: () =>
      scheduleApi.generateSchedule({
        scheduleId,
        selected_tms: selectedTMs,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules", scheduleId] });
      toast.success("Schedule generated successfully");
      setIsGenerating(false);
      setSelectedTMs([]);
    },
    onError: error => {
      console.error("Error generating schedule:", error);
      toast.error("Failed to generate schedule");
    },
  });

  // Handler for generate button
  const handleGenerateClick = () => {
    if (selectedTMs.length === 0) {
      toast.error("Please select at least one Transit Mixer");
      return;
    }

    generateScheduleMutation.mutate();
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate();
    setIsDeleteDialogOpen(false);
  };

  const exportToCsv = () => {
    if (!schedule) return;

    const headers = [
      "Trip No",
      "TM No",
      "Plant Start Time",
      "Pump Start Time",
      "Unloading Time",
      "Return Time",
    ];

    const csvRows = [
      headers.join(","),
      ...schedule.output_table.map(row =>
        [
          row.trip_no,
          row.tm_no,
          row.plant_start,
          row.pump_start,
          row.unloading_time,
          row.return,
        ].join(",")
      ),
    ];

    const csvContent = csvRows.join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fileName = `schedule_${schedule.client_name || schedule._id}_${format(
      new Date(),
      "yyyy-MM-dd"
    )}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "draft":
        return (
          <Badge variant="outline" className="ml-2">
            Draft
          </Badge>
        );
      case "generated":
        return (
          <Badge variant="secondary" className="ml-2">
            Generated
          </Badge>
        );
      case "confirmed":
        return (
          <Badge variant="success" className="ml-2 bg-green-100 text-green-800">
            Confirmed
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="default" className="ml-2">
            Completed
          </Badge>
        );
      default:
        return null;
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-6rem)]">
        <Spinner size="small" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen gap-2">
        <Spinner size="small" />Loading schedule data...
      </div>
    );
  }

  if (error || !schedule) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircleIcon className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Schedule Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The schedule you&apos;re looking for doesn&apos;t exist or you
          don&apos;t have access.
        </p>
        <Button asChild>
          <Link href="/dashboard/schedules">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Schedules
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center">
          <Button asChild variant="outline" size="sm" className="mr-4">
            <Link href="/dashboard/schedules">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">
            {schedule.client_name || `Schedule ${schedule._id.substring(0, 8)}`}
            {getStatusBadge(schedule.status)}
          </h1>
        </div>
        <div className="flex space-x-2">
          {schedule.status === "draft" && !isGenerating && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsGenerating(true)}
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              Generate Schedule
            </Button>
          )}
          {schedule.output_table?.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportToCsv}>
              <DownloadIcon className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
          // disabled={schedule?.status !== "draft"}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* TM Selection UI when generating */}
      {isGenerating && schedule.status === "draft" && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Transit Mixers</CardTitle>
            <CardDescription>
              Select the Transit Mixers to use for this schedule
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tmsLoading ? (
              <div className="py-8 text-center">
                <Spinner size="small" /> Loading available Transit Mixers...
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
                    onClick={() => {
                      setIsGenerating(false);
                      setSelectedTMs([]);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleGenerateClick}
                    disabled={selectedTMs.length === 0 || generateScheduleMutation.isPending}
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

      {/* Schedule Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Input Parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileTextIcon className="h-5 w-5 mr-2 text-primary" />
              Input Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Concrete Quantity</p>
              <p className="text-lg font-medium">
                {schedule.input_params.quantity} m³
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pumping Speed</p>
              <p className="text-lg font-medium">
                {schedule.input_params.pumping_speed} m³/h
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Onward Time</p>
              <p className="text-lg font-medium">
                {schedule.input_params.onward_time} min
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Return Time</p>
              <p className="text-lg font-medium">
                {schedule.input_params.return_time} min
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Buffer Time</p>
              <p className="text-lg font-medium">
                {schedule.input_params.buffer_time} min
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Schedule Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TruckIcon className="h-5 w-5 mr-2 text-primary" />
              Schedule Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Transit Mixers Used
              </p>
              <p className="text-lg font-medium">
                {schedule.tm_count || "Not specified"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Trips</p>
              <p className="text-lg font-medium">
                {schedule.output_table?.length || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pumping Time</p>
              <p className="text-lg font-medium">
                {schedule.pumping_time
                  ? `${schedule.pumping_time} hours`
                  : "Not specified"}
              </p>
            </div>
            {schedule.output_table?.length > 0 && (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">
                    First Dispatch
                  </p>
                  <p className="text-lg font-medium">
                    {schedule.output_table[0].plant_start}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Return</p>
                  <p className="text-lg font-medium">
                    {
                      schedule.output_table[schedule.output_table.length - 1]
                        .return
                    }
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Schedule Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ClockIcon className="h-5 w-5 mr-2 text-primary" />
              Metadata
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Created At</p>
              <p className="text-lg font-medium">
                {format(new Date(schedule.created_at), "MMM dd, yyyy HH:mm")}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="text-lg font-medium">
                {format(new Date(schedule.last_updated), "MMM dd, yyyy HH:mm")}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="text-lg font-medium capitalize">
                {schedule.status}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Schedule ID</p>
              <p className="text-sm font-mono text-muted-foreground break-all">
                {schedule._id}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trip Schedule Table */}
      {schedule.output_table && schedule.output_table.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2 text-primary" />
              Trip Schedule
            </CardTitle>
            <CardDescription>
              Detailed schedule for each transit mixer trip
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trip #</TableHead>
                  <TableHead>TM</TableHead>
                  <TableHead>Plant Start</TableHead>
                  <TableHead>Pump Start</TableHead>
                  <TableHead>Unloading Time</TableHead>
                  <TableHead>Return</TableHead>
                  <TableHead>Completed Capacity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.output_table.map(trip => (
                  <TableRow key={`${trip.trip_no}-${trip.tm_no}`}>
                    <TableCell>{trip.trip_no}</TableCell>
                    <TableCell className="font-medium">{trip.tm_no}</TableCell>
                    <TableCell>{formatTo12Hour(trip.plant_start)}</TableCell>
                    <TableCell>{formatTo12Hour(trip.pump_start)}</TableCell>
                    <TableCell>{formatTo12Hour(trip.unloading_time)}</TableCell>
                    <TableCell>{formatTo12Hour(trip.return)}</TableCell>
                    <TableCell>{trip.completed_capacity !== undefined ? `${trip.completed_capacity} m³` : "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableCaption>
                Total of {schedule.output_table.length} trips scheduled.
              </TableCaption>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Trip Schedule</CardTitle>
            <CardDescription>
              No trip schedule has been generated yet
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <AlertCircleIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-center text-muted-foreground mb-4">
              This schedule doesn&apos;t have any trips generated. It may be in
              draft status.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Schedule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this schedule? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

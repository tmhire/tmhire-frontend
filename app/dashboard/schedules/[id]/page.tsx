'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduleApi } from '@/lib/api/api';
import { useAuth } from '@/lib/auth/auth-context';
import { useAuthApi } from '@/lib/api/use-auth-api';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CalendarIcon, 
  ClockIcon, 
  ArrowLeftIcon, 
  CheckCircleIcon,
  AlertCircleIcon,
  FileTextIcon,
  TruckIcon,
  ArrowRightIcon,
  Pencil,
  Trash2,
  DownloadIcon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import Link from 'next/link';

interface OutputTableRow {
  trip_no: number;
  tm_no: string;
  plant_start: string;
  pump_start: string;
  unloading_time: string;
  return: string;
}

interface Schedule {
  _id: string;
  user_id: string;
  client_name: string;
  created_at: string;
  last_updated: string;
  input_params: {
    quantity: number;
    pumping_speed: number;
    onward_time: number;
    return_time: number;
    buffer_time: number;
  };
  output_table: OutputTableRow[];
  tm_count: number | null;
  pumping_time: number | null;
  status: string;
}

export default function ScheduleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const api = useAuthApi();
  const queryClient = useQueryClient();
  const scheduleId = params.id as string;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch schedule
  const { data: schedule, isLoading, error } = useQuery<Schedule>({
    queryKey: ['schedules', scheduleId],
    queryFn: async () => {
      return api.get<Schedule>(`/schedules/${scheduleId}`);
    },
    enabled: isAuthenticated && Boolean(scheduleId),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => scheduleApi.deleteSchedule(scheduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Schedule deleted successfully');
      router.push('/dashboard/schedules');
    },
    onError: (error) => {
      toast.error('Failed to delete schedule');
      console.error('Delete error:', error);
    }
  });

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this schedule?')) {
      deleteMutation.mutate();
    }
  };

  const exportToCsv = () => {
    if (!schedule) return;
    
    const headers = [
      'Trip No', 
      'TM No', 
      'Plant Start Time', 
      'Pump Start Time', 
      'Unloading Time', 
      'Return Time'
    ];

    const csvRows = [
      headers.join(','),
      ...schedule.output_table.map(row => 
        [
          row.trip_no,
          row.tm_no,
          row.plant_start,
          row.pump_start,
          row.unloading_time,
          row.return
        ].join(',')
      )
    ];

    const csvContent = csvRows.join('\n');
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fileName = `schedule_${schedule.client_name || schedule._id}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch(status.toLowerCase()) {
      case 'draft':
        return <Badge variant="outline" className="ml-2">Draft</Badge>;
      case 'generated':
        return <Badge variant="secondary" className="ml-2">Generated</Badge>;
      case 'confirmed':
        return <Badge variant="success" className="ml-2 bg-green-100 text-green-800">Confirmed</Badge>;
      case 'completed':
        return <Badge variant="default" className="ml-2">Completed</Badge>;
      default:
        return null;
    }
  };

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-6rem)]">Loading...</div>;
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading schedule data...</div>;
  }

  if (error || !schedule) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircleIcon className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Schedule Not Found</h2>
        <p className="text-muted-foreground mb-4">The schedule you're looking for doesn't exist or you don't have access.</p>
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
          {schedule.output_table?.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportToCsv}>
              <DownloadIcon className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

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
              <p className="text-lg font-medium">{schedule.input_params.quantity} m³</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pumping Speed</p>
              <p className="text-lg font-medium">{schedule.input_params.pumping_speed} m³/h</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Onward Time</p>
              <p className="text-lg font-medium">{schedule.input_params.onward_time} min</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Return Time</p>
              <p className="text-lg font-medium">{schedule.input_params.return_time} min</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Buffer Time</p>
              <p className="text-lg font-medium">{schedule.input_params.buffer_time} min</p>
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
              <p className="text-sm text-muted-foreground">Transit Mixers Used</p>
              <p className="text-lg font-medium">{schedule.tm_count || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Trips</p>
              <p className="text-lg font-medium">{schedule.output_table?.length || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pumping Time</p>
              <p className="text-lg font-medium">
                {schedule.pumping_time 
                  ? `${schedule.pumping_time} hours` 
                  : 'Not specified'}
              </p>
            </div>
            {schedule.output_table?.length > 0 && (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">First Dispatch</p>
                  <p className="text-lg font-medium">{schedule.output_table[0].plant_start}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Return</p>
                  <p className="text-lg font-medium">
                    {schedule.output_table[schedule.output_table.length - 1].return}
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
                {format(new Date(schedule.created_at), 'MMM dd, yyyy HH:mm')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="text-lg font-medium">
                {format(new Date(schedule.last_updated), 'MMM dd, yyyy HH:mm')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="text-lg font-medium capitalize">{schedule.status}</p>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.output_table.map((trip) => (
                  <TableRow key={`${trip.trip_no}-${trip.tm_no}`}>
                    <TableCell>{trip.trip_no}</TableCell>
                    <TableCell className="font-medium">{trip.tm_no}</TableCell>
                    <TableCell>{trip.plant_start}</TableCell>
                    <TableCell>{trip.pump_start}</TableCell>
                    <TableCell>{trip.unloading_time}</TableCell>
                    <TableCell>{trip.return}</TableCell>
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
              This schedule doesn't have any trips generated. It may be in draft status.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 
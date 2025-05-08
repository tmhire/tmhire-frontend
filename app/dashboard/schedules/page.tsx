'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduleApi } from '@/lib/api/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusIcon, TrashIcon, CalendarIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/Spinner';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  output_table: unknown[];
  tm_count: number | null;
  pumping_time: number;
  status: string;
}

export default function SchedulesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch schedules
  const { data, isLoading } = useQuery({
    queryKey: ['schedules'],
    queryFn: async () => {
      const response = await scheduleApi.getSchedules();
      console.log('Fetched schedules:', response);
      return response;
    },
    enabled: isAuthenticated,
  });

  // Directly use the data as our schedules array
  const schedules = data as Schedule[] | undefined;

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => scheduleApi.deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Schedule deleted successfully');
      setDeleteDialogOpen(false);
      setScheduleToDelete(null);
    },
    onError: error => {
      toast.error('Failed to delete schedule');
      console.error('Delete error:', error);
      setDeleteDialogOpen(false);
    }
  });

  const handleDeleteClick = (id: string) => {
    setScheduleToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (scheduleToDelete) {
      deleteMutation.mutate(scheduleToDelete);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setScheduleToDelete(null);
  };

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-6rem)]"><Spinner size="small" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Schedules</h1>
        <Button asChild>
          <Link href="/dashboard/schedules/new">
            <PlusIcon className="h-4 w-4 mr-2" />
            New Schedule
          </Link>
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Schedule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this schedule? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDelete}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete} 
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>All Schedules</CardTitle>
          <CardDescription>
            Manage your schedules
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || authLoading ? (
            <div><Spinner size="small" /></div>
          ) : !schedules || schedules.length === 0 ? (
            <div className="text-center py-8">
              <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No schedules yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Create your first Transit Mixer Calculator by TMHire schedule
              </p>
              <Button asChild className="mt-4">
                <Link href="/dashboard/schedules/new">
                  Create schedule
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {schedules.map((schedule) => (
                <div
                  key={schedule._id}
                  className="flex items-center justify-between border-b pb-4 pt-4"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {schedule.client_name || `Schedule ${schedule._id.slice(0, 8)}`}
                    </div>
                    <div className="flex mt-1 text-sm">
                      <div className="text-muted-foreground mr-4">
                        {formatDistanceToNow(new Date(schedule.created_at), { addSuffix: true })}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Quantity:</span> {schedule.input_params.quantity} m³
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/schedules/${schedule._id}`}>
                        View
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(schedule._id)}
                      disabled={deleteMutation.isPending}
                    >
                      <TrashIcon className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 
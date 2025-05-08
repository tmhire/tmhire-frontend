'use client';

import { useQuery } from '@tanstack/react-query';
// import { useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduleApi, Schedule } from '@/lib/api/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RotateCwIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Spinner } from '../Spinner';

interface ScheduleHistoryProps {
  onSelectSchedule: (schedule: Schedule) => void;
}

export function ScheduleHistory({ onSelectSchedule }: ScheduleHistoryProps) {
  // const queryClient = useQueryClient();
  
  // Fetch all schedules
  const { data: schedules, isLoading } = useQuery({
    queryKey: ['schedules'],
    queryFn: async () => {
      const response = await scheduleApi.getSchedules();
      return response;
    }
  });

  // Delete mutation
  // const deleteMutation = useMutation({
  //   mutationFn: (id: string) => scheduleApi.deleteSchedule(id),
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ['schedules'] });
  //   }
  // });

  // const handleDelete = (e: React.MouseEvent, id: string) => {
  //   e.stopPropagation();
  //   if (confirm('Are you sure you want to delete this schedule?')) {
  //     deleteMutation.mutate(id);
  //   }
  // };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Schedule History</CardTitle>
        <CardDescription>
          Load input from a previously created schedule
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div><Spinner size="small" /></div>
        ) : !schedules || schedules.length === 0 ? (
          <div className="text-center p-4">
            <p className="text-muted-foreground">No schedules found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {schedules.map((schedule: Schedule) => (
              <div 
                key={schedule._id} 
                className="border p-3 rounded-md hover:bg-accent transition-colors flex flex-row justify-between items-start"
                // onClick={() => onSelectSchedule(schedule)}
              >
                <div className="flex flex-row justify-between items-start">
                  <div>
                    <div className="font-medium">
                      {schedule.client_name || `Schedule ${schedule._id.slice(0, 8)}`}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(schedule.created_at), { addSuffix: true })}
                    </div>
                    {/* <div className="mt-1 text-sm">
                      <span className="text-muted-foreground">Quantity:</span> {schedule.input_params.quantity} m³
                    </div> */}
                  </div>
                  {/* <div className="flex">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={(e) => handleDelete(e, schedule._id)}
                      disabled={deleteMutation.isPending}
                    >
                      <TrashIcon className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div> */}
                </div>
                <div className="mt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs"
                    onClick={() => onSelectSchedule(schedule)}
                  >
                    <RotateCwIcon className="h-3 w-3 mr-1" />
                    Load Values
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 
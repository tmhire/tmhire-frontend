'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusIcon, CalendarIcon, TruckIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';
import { useAuthApi } from '@/lib/api/use-auth-api';

// Type definitions from our API
interface TransitMixer {
  _id: string;
  user_id: string;
  identifier: string;
  capacity: number;
  created_at: string;
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
  output_table: unknown[];
  tm_count: number | null;
  pumping_time: number;
  status: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const api = useAuthApi();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const { data: tmsData, isLoading: tmsLoading } = useQuery({
    queryKey: ['tms'],
    queryFn: async () => {
      return api.get<TransitMixer[]>('/tms');
    },
    enabled: isAuthenticated && api.isAuthenticated,
  });

  const { data: schedulesData, isLoading: schedulesLoading } = useQuery({
    queryKey: ['schedules'],
    queryFn: async () => {
      return api.get<Schedule[]>('/schedules');
    },
    enabled: isAuthenticated && api.isAuthenticated,
  });

  // Extracted data from the response
  const tms = tmsData || [];
  const schedules = schedulesData || [];
  const totalTMs = tms.length || 0;
  const totalSchedules = schedules.length || 0;
  const recentSchedules = schedules.slice(0, 3) || [];

  const isPageLoading = tmsLoading || schedulesLoading || isLoading;

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-6rem)]">Loading...</div>
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button asChild>
          <Link href="/dashboard/schedules/new">
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Schedule
          </Link>
        </Button>
      </div>

      {/* Auth API Example - add this to test */}
      {/* <ApiExample /> */}

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Transit Mixers
            </CardTitle>
            <TruckIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isPageLoading ? 'Loading...' : totalTMs}
            </div>
            <p className="text-xs text-muted-foreground">
              Available for scheduling
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Schedules
            </CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isPageLoading ? 'Loading...' : totalSchedules}
            </div>
            <p className="text-xs text-muted-foreground">
              Created schedules
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Schedules */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Recent Schedules</CardTitle>
            <CardDescription>
              Your recently created schedules
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isPageLoading ? (
              <div>Loading...</div>
            ) : recentSchedules.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  No schedules found
                </p>
                <Button asChild>
                  <Link href="/dashboard/schedules/new">
                    Create your first schedule
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentSchedules.map((schedule) => (
                  <div 
                    key={schedule._id} 
                    className="flex items-center justify-between border-b pb-4"
                  >
                    <div>
                      <div className="font-medium">
                        {schedule.client_name || 'Unnamed Schedule'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(schedule.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/schedules/${schedule._id}`}>
                        View
                      </Link>
                    </Button>
                  </div>
                ))}
                
                <div className="pt-2">
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/dashboard/schedules">
                      View all schedules
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 
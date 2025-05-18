"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/Spinner";
import { clientApi } from "@/lib/api/api";

interface ClientStats {
  total_scheduled: number;
  total_delivered: number;
  total_pending: number;
}

interface TripHistory {
  trip_id: string;
  date: string;
  tm_identifier: string;
  tm_id: string;
  volume: number;
  status: string;
}

export default function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const api = useAuthApi();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch client details
  const { data: clientDetails, isLoading: clientLoading } = useQuery({
    queryKey: ["client", params.id],
    queryFn: async () => {
      const response = await clientApi.getClient(params.id);
      return response;
    },
    enabled: isAuthenticated && !!params.id,
  });

  // Fetch client stats
  const { data: clientStats, isLoading: statsLoading } = useQuery({
    queryKey: ["client-stats", params.id],
    queryFn: async () => {
      const response = await api.get<{
        success: boolean;
        message: string;
        data: ClientStats;
      }>(`/clients/${params.id}/stats`);
      return response.data;
    },
    enabled: isAuthenticated && api.isAuthenticated && !!params.id,
  });

  // Fetch trip history
  const { data: tripHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["client-trips", params.id],
    queryFn: async () => {
      const response = await api.get<{
        success: boolean;
        message: string;
        data: TripHistory[];
      }>(`/clients/${params.id}/trips`);
      return response.data;
    },
    enabled: isAuthenticated && api.isAuthenticated && !!params.id,
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-6rem)]">
        <Spinner size="small" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Client Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Client Details</CardTitle>
          <CardDescription>View client information</CardDescription>
        </CardHeader>
        <CardContent>
          {clientLoading ? (
            <div className="flex justify-center py-4">
              <Spinner size="small" />
            </div>
          ) : clientDetails ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div>
                  <h3 className="font-medium">Name</h3>
                  <p>{clientDetails.name}</p>
                </div>
                <div>
                  <h3 className="font-medium">Contact Person</h3>
                  <p>{clientDetails.contact_person}</p>
                </div>
                <div>
                  <h3 className="font-medium">Contact Email</h3>
                  <p>{clientDetails.contact_email}</p>
                </div>
                <div>
                  <h3 className="font-medium">Contact Phone</h3>
                  <p>{clientDetails.contact_phone}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <h3 className="font-medium">Address</h3>
                  <p>
                    {clientDetails.address}, {clientDetails.city},{" "}
                    {clientDetails.state} {clientDetails.postal_code}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium">Notes</h3>
                  <p>{clientDetails.notes || "No notes available"}</p>
                </div>
              </div>
            </div>
          ) : (
            <p>No client data found</p>
          )}
        </CardContent>
      </Card>

      {/* Client Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-blue-100 border border-blue-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Spinner size="small" />
            ) : (
              <div className="text-3xl font-bold text-blue-500">
                {clientStats?.total_scheduled || 0} m³
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-green-100 border border-green-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Spinner size="small" />
            ) : (
              <div className="text-3xl font-bold text-green-500">
                {clientStats?.total_delivered || 0} m³
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-amber-100 border border-amber-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Pending</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Spinner size="small" />
            ) : (
              <div className="text-3xl font-bold text-amber-500">
                {clientStats?.total_pending || 0} m³
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trip History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Trip History</CardTitle>
          <CardDescription>
            Recent deliveries and scheduled trips
          </CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex justify-center py-4">
              <Spinner size="small" />
            </div>
          ) : tripHistory && tripHistory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Transit Mixer</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tripHistory.map(trip => (
                  <TableRow key={trip.trip_id}>
                    <TableCell>
                      {new Date(trip.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{trip.tm_identifier}</TableCell>
                    <TableCell>{trip.volume} m³</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          trip.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : trip.status === "pending"
                            ? "bg-amber-100 text-amber-800"
                            : trip.status === "in_progress"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100"
                        }`}
                      >
                        {trip.status.replace("_", " ")}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p>No trip history available</p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/clients")}
        >
          Back to Clients
        </Button>
      </div>
    </div>
  );
}

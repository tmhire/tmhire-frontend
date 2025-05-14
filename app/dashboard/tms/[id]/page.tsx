"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/auth-context";
import { useAuthApi } from "@/lib/api/use-auth-api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Spinner } from "@/components/Spinner";
import { format } from "date-fns";
import { tmApi, scheduleApi, TransitMixer, Plant } from "@/lib/api/api";

interface TMWithPlant extends TransitMixer {
  plant?: Plant;
}

export default function TMDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const api = useAuthApi();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Format date for API request
  const formattedDate = format(selectedDate, "yyyy-MM-dd");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch TM details
  const { data: tmDetails, isLoading: tmLoading } = useQuery({
    queryKey: ["tm", params.id],
    queryFn: async () => {
      const response = await tmApi.getTM(params.id);
      return response;
    },
    enabled: isAuthenticated && !!params.id,
  });

  // Fetch plant details if we have a plant_id
  const { data: plantDetails, isLoading: plantLoading } = useQuery({
    queryKey: ["plant", tmDetails?.plant_id],
    queryFn: async () => {
      if (!tmDetails?.plant_id) return null;
      const response = await api.get<{ success: boolean; message: string; data: Plant }>(
        `/plants/${tmDetails.plant_id}`
      );
      return response.data;
    },
    enabled: isAuthenticated && api.isAuthenticated && !!tmDetails?.plant_id,
  });

  // Fetch TM availability
  const { data: tmAvailability, isLoading: availabilityLoading } = useQuery({
    queryKey: ["tm-availability", params.id, formattedDate],
    queryFn: async () => {
      const response = await scheduleApi.getTmAvailability(params.id, formattedDate);
      return response;
    },
    enabled: isAuthenticated && !!params.id,
  });

  // Generate time slots for display (all hours in 30-minute increments)
  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i;
    return [
      `${hour.toString().padStart(2, "0")}:00`,
      `${hour.toString().padStart(2, "0")}:30`,
    ];
  }).flat();

  // Check if a slot is available
  const isSlotAvailable = (timeSlot: string) => {
    if (!tmAvailability || !tmAvailability.availability) return true;
    
    const slot = tmAvailability.availability.find(
      (s) => s.start === timeSlot
    );
    
    return slot ? slot.status === 'available' : true;
  };

  // Combine TM details with plant details
  const tmWithPlant: TMWithPlant | undefined = tmDetails
    ? {
        ...tmDetails,
        plant: plantDetails || undefined,
      }
    : undefined;

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-6rem)]">
        <Spinner size="small" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* TM Details Card */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Transit Mixer Details</CardTitle>
            <CardDescription>
              View and manage transit mixer information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tmLoading || plantLoading ? (
              <div className="flex justify-center py-4">
                <Spinner size="small" />
              </div>
            ) : tmWithPlant ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium">Identifier</h3>
                    <p>{tmWithPlant.identifier}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Capacity</h3>
                    <p>{tmWithPlant.capacity} m³</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Plant</h3>
                    <p>{tmWithPlant.plant?.name || "Not assigned"}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Created</h3>
                    <p>{new Date(tmWithPlant.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p>No transit mixer data found</p>
            )}
          </CardContent>
        </Card>

        {/* Calendar Card */}
        <Card className="w-full md:w-[350px]">
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
            <CardDescription>
              Choose a date to view availability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="border rounded-md p-3"
            />
          </CardContent>
        </Card>
      </div>

      {/* Availability Grid Card */}
      <Card>
        <CardHeader>
          <CardTitle>
            Availability for {format(selectedDate, "MMMM d, yyyy")}
          </CardTitle>
          <CardDescription>
            View and manage transit mixer availability in 30-minute slots
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availabilityLoading ? (
            <div className="flex justify-center py-4">
              <Spinner size="small" />
            </div>
          ) : (
            <div className="grid grid-cols-6 gap-2 md:grid-cols-12">
              {timeSlots.map((timeSlot) => {
                const available = isSlotAvailable(timeSlot);
                return (
                  <div
                    key={timeSlot}
                    className={`p-2 text-center border rounded text-sm ${
                      available
                        ? "bg-green-100 border-green-300"
                        : "bg-red-100 border-red-300"
                    }`}
                  >
                    {timeSlot}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/tms")}
        >
          Back to Transit Mixers
        </Button>
      </div>
    </div>
  );
} 
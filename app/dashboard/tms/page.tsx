"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tmApi } from "@/lib/api/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusIcon, PencilIcon, TrashIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import TMForm from "@/components/tms/tm-form";
import { useAuth } from "@/lib/auth/auth-context";
import { useRouter } from "next/navigation";

interface TransitMixer {
  _id: string;
  user_id: string;
  identifier: string;
  capacity: number;
  created_at: string;
}

interface TMFormData {
  identifier: string;
  capacity: number;
}

export default function TransitMixerPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTm, setEditingTm] = useState<TransitMixer | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch transit mixers
  const { data: tms, isLoading } = useQuery({
    queryKey: ["tms"],
    queryFn: async () => {
      const response = await tmApi.getAllTMs();
      return response; // API now returns direct array, not wrapped in data property
    },
    enabled: isAuthenticated, // Only run query if authenticated
  });

  // Fetch average capacity
  const averageCapacity = useMemo(() => {
    if (!tms || tms.length === 0) return 0;

    const totalCapacity = tms.reduce((sum, tm) => sum + (tm.capacity || 0), 0);
    return totalCapacity / tms.length;
  }, [tms]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: TMFormData) => tmApi.createTM(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tms"] });
      queryClient.invalidateQueries({ queryKey: ["tms-average-capacity"] });
      setIsAddOpen(false);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TMFormData }) =>
      tmApi.updateTM(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tms"] });
      queryClient.invalidateQueries({ queryKey: ["tms-average-capacity"] });
      setEditingTm(null);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => tmApi.deleteTM(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tms"] });
      queryClient.invalidateQueries({ queryKey: ["tms-average-capacity"] });
    },
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this Transit Mixer?")) {
      deleteMutation.mutate(id);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-6rem)]">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Transit Mixers</h1>
        <Button onClick={() => setIsAddOpen(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add TM
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Stats</CardTitle>
            <CardDescription>
              Statistics about your transit mixers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <span className="text-muted-foreground">
                  Total transit mixers:
                </span>
                <p className="text-2xl font-bold">{tms?.length || 0}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Average capacity:</span>
                <p className="text-2xl font-bold">
                  {averageCapacity ? `${averageCapacity.toFixed(2)} m³` : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Transit Mixers</CardTitle>
            <CardDescription>Manage your transit mixers</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div>Loading...</div>
            ) : tms?.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">No transit mixers found</p>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => setIsAddOpen(true)}
                >
                  Add your first transit mixer
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="py-3 text-left font-medium">Identifier</th>
                      <th className="py-3 text-left font-medium">
                        Capacity (m³)
                      </th>
                      <th className="py-3 text-left font-medium">Created</th>
                      <th className="py-3 text-left font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tms?.map(tm => (
                      <tr key={tm._id} className="border-b">
                        <td className="py-3">{tm.identifier}</td>
                        <td className="py-3">{tm.capacity}</td>
                        <td className="py-3">
                          {formatDistanceToNow(new Date(tm.created_at), {
                            addSuffix: true,
                          })}
                        </td>
                        <td className="py-3">
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingTm(tm)}
                            >
                              <PencilIcon className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(tm._id)}
                            >
                              <TrashIcon className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit TM Dialog */}
      {(isAddOpen || editingTm) && (
        <TMForm
          tm={editingTm}
          isOpen={isAddOpen || !!editingTm}
          onClose={() => {
            setIsAddOpen(false);
            setEditingTm(null);
          }}
          onSubmit={data => {
            if (editingTm) {
              updateMutation.mutate({ id: editingTm._id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}

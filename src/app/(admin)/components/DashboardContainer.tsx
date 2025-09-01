"use client";

import { useApiClient } from "@/hooks/useApiClient";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
// import { EcommerceMetrics } from "@/components/ecommerce/EcommerceMetrics";
import React from "react";
import StatisticsChart from "@/components/ecommerce/StatisticsChart";
import RecentSchedules from "@/components/ecommerce/RecentOrders";
import { Spinner } from "@/components/ui/spinner";
import DashboardCounts, { DashboardCountsData } from "@/components/ecommerce/DashboardCounts";
import PlantsSummaryTable, { PlantsTable } from "@/components/ecommerce/PlantsSummaryTable";

interface DashboardData {
  counts: DashboardCountsData & { plants_table: PlantsTable };
  series: { name: string; data: number[] }[];
  recent_orders: { client: string; quantity: string; order_date: string; status: string }[];
}

export default function DashboardContainer() {
  const { fetchWithAuth } = useApiClient();
  const { status } = useSession();

  const today = new Date();
  const date_val = today.toISOString().slice(0, 10);

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard', date_val],
    queryFn: async () => {
      const response = await fetchWithAuth(`/dashboard?date_val=${date_val}`);
      if (!response) throw new Error('No response from server');
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to fetch dashboard data');
      return data.data as DashboardData;
    },
    enabled: status === "authenticated",
  });

  if (isLoading || !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Spinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12 space-y-6 xl:col-span-12">
        <DashboardCounts counts={dashboardData.counts} />
      </div>

      <div className="col-span-12">
        <PlantsSummaryTable plantsTable={dashboardData.counts.plants_table} />
      </div>
      
      <div className="col-span-12 xl:col-span-6">
        <StatisticsChart series={dashboardData.series} />
      </div>

      <div className="col-span-12 xl:col-span-6">
        <RecentSchedules orders={dashboardData.recent_orders} />
      </div>

    </div>
  );
}

"use client";

import { useApiClient } from "@/hooks/useApiClient";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { EcommerceMetrics } from "@/components/ecommerce/EcommerceMetrics";
import React from "react";
import StatisticsChart from "@/components/ecommerce/StatisticsChart";
import RecentOrders from "@/components/ecommerce/RecentOrders";

interface DashboardData {
  counts: {
    plants: number;
    transit_mixers: number;
    clients: number;
    pumps: number;
    orders_today: number;
  };
  series: {
    name: string;
    data: number[];
  }[];
  recent_orders: {
    client: string;
    quantity: string;
    order_date: string;
    status: string;
  }[];
}

export default function DashboardContainer() {
  const { fetchWithAuth } = useApiClient();
  const { status } = useSession();

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await fetchWithAuth('/dashboard');
      if (!response) throw new Error('No response from server');
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to fetch dashboard data');
      return data.data as DashboardData;
    },
    enabled: status === "authenticated",
  });

  if (isLoading || !dashboardData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12 space-y-6 xl:col-span-12">
        <EcommerceMetrics counts={dashboardData.counts} />
      </div>

      <div className="col-span-12 xl:col-span-6">
        <StatisticsChart series={dashboardData.series} />
      </div>

      <div className="col-span-12 xl:col-span-6">
        <RecentOrders orders={dashboardData.recent_orders} />
      </div>
    </div>
  );
}

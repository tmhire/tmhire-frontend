"use client";

import { useApiClient } from "@/hooks/useApiClient";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
// import { EcommerceMetrics } from "@/components/ecommerce/EcommerceMetrics";
import React, { useState } from "react";
import StatisticsChart from "@/components/ecommerce/StatisticsChart";
import RecentSchedules from "@/components/ecommerce/RecentOrders";
import { Spinner } from "@/components/ui/spinner";
import DashboardCounts, { DashboardCountsData } from "@/components/ecommerce/DashboardCounts";
import PlantsSummaryTable, { PlantsTable } from "@/components/ecommerce/PlantsSummaryTable";
import DatePickerInput from "@/components/form/input/DatePickerInput";
import Button from "@/components/ui/button/Button";

interface DashboardData {
  counts: DashboardCountsData & { plants_table: PlantsTable };
  series: { name: string; data: number[] }[];
  recent_orders: { client: string; quantity: string; order_date: string; status: string }[];
}

export default function DashboardContainer() {
  const { fetchWithAuth } = useApiClient();
  const { status } = useSession();

  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today.toISOString().slice(0, 10));

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["dashboard", selectedDate],
    queryFn: async () => {
      const response = await fetchWithAuth(`/dashboard?date_val=${selectedDate}`);
      if (!response) throw new Error("No response from server");
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to fetch dashboard data");
      return data.data as DashboardData;
    },
    enabled: status === "authenticated",
  });

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
  };

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      {/* Date Picker Row */}
      <div className="col-span-12 flex items-center justify-between py-4 pl-6 px-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-white">Dashboard Overview</h3>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">Select date to view data</span>
          <Button
            variant="outline"
            className="h-10"
            onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
          >
            Today
          </Button>
          <div className="w-28">
            <DatePickerInput value={selectedDate} onChange={handleDateChange} placeholder="Select date" />
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading || !dashboardData ? (
        <div className="flex items-center justify-center min-h-[500px] w-full col-span-12">
          <Spinner size="lg" text="Loading dashboard..." />
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}

"use client";
import React from "react";
import { Factory, Truck, TruckElectric } from "lucide-react";

export interface DashboardCountsData {
  active_plants_count: number;
  inactive_plants_count: number;
  active_tms_count: number;
  inactive_tms_count: number;
  active_line_pumps_count: number;
  inactive_line_pumps_count: number;
  active_boom_pumps_count: number;
  inactive_boom_pumps_count: number;
}

export default function DashboardCounts({ counts }: { counts: DashboardCountsData }) {
  const tiles = [
    {
      title: "Plants",
      icon: <Factory className="size-4 text-amber-600 dark:text-amber-400" />,
      active: counts.active_plants_count,
      inactive: counts.inactive_plants_count,
      bgColor: "bg-amber-50 dark:bg-amber-500/10",
      borderColor: "border-amber-100 dark:border-amber-500/20",
    },
    {
      title: "Transit Mixers",
      icon: <Truck className="size-4 text-emerald-600 dark:text-emerald-400" />,
      active: counts.active_tms_count,
      inactive: counts.inactive_tms_count,
      bgColor: "bg-emerald-50 dark:bg-emerald-500/10",
      borderColor: "border-emerald-100 dark:border-emerald-500/20",
    },
    {
      title: "Line Pumps",
      icon: <TruckElectric className="size-4 text-blue-600 dark:text-blue-400" />,
      active: counts.active_line_pumps_count,
      inactive: counts.inactive_line_pumps_count,
      bgColor: "bg-blue-50 dark:bg-blue-500/10",
      borderColor: "border-blue-100 dark:border-blue-500/20",
    },
    {
      title: "Boom Pumps",
      icon: <TruckElectric className="size-4 text-purple-600 dark:text-purple-400" />,
      active: counts.active_boom_pumps_count,
      inactive: counts.inactive_boom_pumps_count,
      bgColor: "bg-purple-50 dark:bg-purple-500/10",
      borderColor: "border-purple-100 dark:border-purple-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
      {tiles.map((tile, idx) => (
        <div
          key={idx}
          className="group relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:border-gray-300/60 dark:border-gray-800/60 dark:bg-gray-900/40 dark:hover:border-gray-700/60 backdrop-blur-sm"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-md text-gray-800 dark:text-white/90 mb-4 tracking-wide">{tile.title}</h4>
            <div
              className={`flex items-center justify-center w-9 h-9 rounded-md border ${tile.borderColor} ${tile.bgColor} transition-transform duration-200 group-hover:scale-105`}
            >
              {tile.icon}
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Active
              </span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="font-bold text-lg text-gray-900 dark:text-white">{tile.active}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Inactive
              </span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500"></div>
                <span className="font-bold text-lg text-gray-900 dark:text-white">{tile.inactive}</span>
              </div>
            </div>
          </div>

          {/* Total count - subtle footer */}
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 dark:text-gray-500">Total</span>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                {tile.active + tile.inactive}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";
import React from "react";
import Badge from "../ui/badge/Badge";
import { Factory, Truck, Users, ShoppingCart, TruckElectric } from "lucide-react";

interface CountsProps {
  plants: number;
  transit_mixers: number;
  clients: number;
  pumps: number;
  orders_today: number;
}

export const EcommerceMetrics = ({ counts }: { counts: CountsProps }) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-5 md:gap-6">
       {/* Orders Today */}
       <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <ShoppingCart className="text-gray-800 size-6 dark:text-white/90" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Schedules</span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">{counts.orders_today}</h4>
          </div>
          <Badge color="success">Today</Badge>
        </div>
      </div>
      
      {/* Plants */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <Factory className="text-gray-800 size-6 dark:text-white/90" />
        </div>

        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Plants</span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">{counts.plants}</h4>
          </div>
          <Badge color="info">Current</Badge>
        </div>
      </div>

      {/* Transit Mixers */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <Truck className="text-gray-800 size-6 dark:text-white/90" />
        </div>

        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Transit Mixers</span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">{counts.transit_mixers}</h4>
          </div>
          <Badge color="success">Active</Badge>
        </div>
      </div>

      {/* Clients */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <Users className="text-gray-800 size-6 dark:text-white/90" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Clients</span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">{counts.clients}</h4>
          </div>
          <Badge color="info">Current</Badge>
        </div>
      </div>

      {/* Pumps */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <TruckElectric className="text-gray-800 size-6 dark:text-white/90" />
        </div>

        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Pumps</span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">{counts.pumps}</h4>
          </div>
          <Badge color="success">Active</Badge>
        </div>
      </div>

     
    </div>
  );
};

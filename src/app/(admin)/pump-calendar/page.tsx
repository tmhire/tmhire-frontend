import { Metadata } from "next";
import { Suspense } from "react";
import PumpCalendarContainer from "./components/PumpCalendarContainer";

export const metadata: Metadata = {
  title: "Pump Calendar | TM Grid - Concrete Calculator",
  description: "View and manage your pump delivery schedules and production calendar",
};

export default function PumpCalendarPage() {
  return (
    <div>
      <Suspense fallback={
        <div className="flex items-center justify-center h-64 bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.05]">
          <div className="text-gray-500 dark:text-gray-400">Loading pump calendar data...</div>
        </div>
      }>
        <PumpCalendarContainer />
      </Suspense>
    </div>
  );
} 
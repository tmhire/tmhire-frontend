import { Metadata } from "next";
import { Suspense } from "react";
import CalendarContainer from "./components/CalendarContainer";

export const metadata: Metadata = {
  title: "Plant Calendar | TM Grid - Concrete Calculator",
  description: "View and manage schedules grouped by plant",
};

export default function PlantCalendarPage() {
  return (
    <div>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64 bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.05]">
            <div className="text-gray-500 dark:text-gray-400">Loading plant calendar...</div>
          </div>
        }
      >
        <CalendarContainer />
      </Suspense>
    </div>
  );
}

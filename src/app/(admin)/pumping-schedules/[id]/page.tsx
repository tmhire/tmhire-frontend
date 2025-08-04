import { Metadata } from "next";
import NewScheduleForm from "../components/NewScheduleForm";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "New Pumping Schedule | TM Grid - Concrete Calculator",
  description: "Create a new concrete delivery schedule and assign resources",
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function NewSchedulePage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64 bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.05]">
            <div className="text-gray-500 dark:text-gray-400">Loading schedule data...</div>
          </div>
        }
      >
        <NewScheduleForm schedule_id={id} />
      </Suspense>
    </div>
  );
}
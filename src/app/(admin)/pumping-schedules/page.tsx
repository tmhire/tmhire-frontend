import { Metadata } from "next";
import SchedulesContainer from "./components/SchedulesContainer";

export const metadata: Metadata = {
  title: "Schedules | TM Grid - Concrete Calculator",
  description: "Manage and track your concrete delivery schedules and assignments",
};

export default function SchedulesPage() {
  return (
    <div>
      <SchedulesContainer />
    </div>
  );
} 
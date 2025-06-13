import { Metadata } from "next";
import CalendarContainer from "./components/CalendarContainer";

export const metadata: Metadata = {
  title: "Calendar | TM Hire - Concrete Calculator",
  description: "View and manage your concrete delivery schedules and production calendar",
};

export default function CalendarPage() {
  return (
    <div>
      <CalendarContainer />
    </div>
  );
} 
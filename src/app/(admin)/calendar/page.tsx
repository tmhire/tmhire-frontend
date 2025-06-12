import { Metadata } from "next";
import CalendarContainer from "./components/CalendarContainer";

export const metadata: Metadata = {
  title: "Calendar | TMHire",
  description: "Manage your production schedule",
};

export default function CalendarPage() {
  return (
    <div>
      <CalendarContainer />
    </div>
  );
} 
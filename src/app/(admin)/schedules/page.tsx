import { Metadata } from "next";
import SchedulesContainer from "./components/SchedulesContainer";

export const metadata: Metadata = {
  title: "Schedules | TMHire",
  description: "Manage your schedules",
};

export default function SchedulesPage() {
  return (
    <div>
      <SchedulesContainer />
    </div>
  );
} 
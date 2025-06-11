import { Metadata } from "next";
import NewScheduleForm from "./components/NewScheduleForm";

export const metadata: Metadata = {
  title: "New Schedule | TMHire",
  description: "Create a new schedule",
};

export default function NewSchedulePage() {
  return (
    <div>
      <NewScheduleForm />
    </div>
  );
} 
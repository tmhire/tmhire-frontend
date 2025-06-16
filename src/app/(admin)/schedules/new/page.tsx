import { Metadata } from "next";
import NewScheduleForm from "../components/NewScheduleForm";

export const metadata: Metadata = {
  title: "New Schedule | TM Hire - Concrete Calculator",
  description: "Create a new concrete delivery schedule and assign resources",
};

export default function NewSchedulePage() {
  return (
    <div>
      <NewScheduleForm />
    </div>
  );
}

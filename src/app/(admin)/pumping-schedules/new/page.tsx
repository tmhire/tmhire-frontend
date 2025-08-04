import { Metadata } from "next";
import NewScheduleForm from "../components/NewScheduleForm";

export const metadata: Metadata = {
  title: "New Pumping Schedule | TM Grid - Concrete Calculator",
  description: "Create a new concrete delivery schedule and assign resources",
};

export default function NewSchedulePage() {
  return (
    <div>
      <NewScheduleForm />
    </div>
  );
}

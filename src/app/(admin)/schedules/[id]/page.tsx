import { Metadata } from "next";
import NewScheduleForm from "../components/NewScheduleForm";

export const metadata: Metadata = {
  title: "New Pumping Schedule | TM Hire - Concrete Calculator",
  description: "Create a new concrete delivery schedule and assign resources",
};

export default function NewSchedulePage({ params }: { params: { id?: string } }) {
  return (
    <div>
      <NewScheduleForm schedule_id={params.id} />
    </div>
  );
}

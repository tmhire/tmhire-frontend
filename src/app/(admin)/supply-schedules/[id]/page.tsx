import { useParams } from "next/navigation";
import NewSupplyScheduleForm from "../components/NewSupplyScheduleForm";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditSupplySchedulePage({ params }: PageProps) {
  const { id } = await params;
  return <NewSupplyScheduleForm schedule_id={id} />;
} 
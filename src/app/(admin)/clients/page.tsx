import { Metadata } from "next";
import ClientsContainer from "./components/ClientsContainer";

export const metadata: Metadata = {
  title: "Clients | TMHire",
  description: "Manage your clients",
};

export default function ClientsPage() {
  return (
    <div>
      <ClientsContainer />
    </div>
  );
} 
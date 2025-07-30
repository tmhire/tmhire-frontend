import { Metadata } from "next";
import ProjectsContainer from "./components/ProjectsContainer";

export const metadata: Metadata = {
  title: "Projects",
  description: "Manage your projects",
};

export default function ProjectsPage() {
  return (
    <div>
      <ProjectsContainer />
    </div>
  );
} 
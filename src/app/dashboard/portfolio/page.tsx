import { listPortfolioProjects } from "@/lib/actions/budget-forecast";
import { PortfolioClient } from "./portfolio-client";

export default async function PortfolioPage() {
  const projects = await listPortfolioProjects();
  return <PortfolioClient initialProjects={projects} />;
}

import { listToolboxTalks } from "@/lib/actions/toolbox";
import { OdprawyClient } from "./odprawy-client";

export default async function OdprawyPage() {
  const talks = await listToolboxTalks();
  return <OdprawyClient initialTalks={talks} />;
}

import { listProjectPhotos } from "@/lib/actions/photos";
import { GaleriaClient } from "./galeria-client";

export default async function GaleriaPage({ params }: { params: { id: string } }) {
  const photos = await listProjectPhotos(params.id);
  return <GaleriaClient projectId={params.id} initialPhotos={photos} />;
}

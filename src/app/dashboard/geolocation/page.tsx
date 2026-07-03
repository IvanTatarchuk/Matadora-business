import { listWorkerLocations, listGeofences, listGeofenceEvents } from "@/lib/actions/geolocation";
import { GeolocationClient } from "./geolocation-client";

export default async function GeolocationPage() {
  const locations = await listWorkerLocations();
  const geofences = await listGeofences();
  const events = await listGeofenceEvents();
  return <GeolocationClient initialLocations={locations} initialGeofences={geofences} initialEvents={events} />;
}

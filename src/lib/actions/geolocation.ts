"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type LocationMethod = "gps" | "wifi" | "ip" | "manual";

export type WorkerLocation = {
  id: string;
  worker_id: string;
  project_id: string | null;
  org_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  altitude_accuracy: number | null;
  heading: number | null;
  speed: number | null;
  location_method: LocationMethod;
  timestamp: string;
  notes: string | null;
  created_at: string;
};

export type Geofence = {
  id: string;
  project_id: string | null;
  org_id: string;
  name: string;
  description: string | null;
  center_lat: number;
  center_lon: number;
  radius_meters: number;
  shape: "circle" | "polygon";
  polygon_coordinates: Record<string, any> | null;
  entry_notification: boolean;
  exit_notification: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type GeofenceEvent = {
  id: string;
  geofence_id: string;
  worker_id: string | null;
  project_id: string | null;
  org_id: string;
  event_type: "entry" | "exit";
  latitude: number;
  longitude: number;
  timestamp: string;
  created_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function recordWorkerLocation(input: {
  workerId: string;
  projectId?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  locationMethod?: LocationMethod;
  notes?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("worker_locations").insert({
    worker_id: input.workerId,
    project_id: input.projectId ?? null,
    org_id: member.org_id,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracy: input.accuracy ?? null,
    altitude: input.altitude ?? null,
    altitude_accuracy: input.altitudeAccuracy ?? null,
    heading: input.heading ?? null,
    speed: input.speed ?? null,
    location_method: input.locationMethod ?? "gps",
    notes: input.notes ?? null,
  }).select("id").single();

  if (error) return { ok: false, error: error.message };
  
  // Check geofences
  await checkGeofences(input.workerId, input.projectId, input.latitude, input.longitude, member.org_id);
  
  revalidatePath("/dashboard/geolocation");
  return { ok: true, id: data.id };
}

export async function listWorkerLocations(workerId?: string, projectId?: string, limit = 50): Promise<WorkerLocation[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  let query = db(supabase)
    .from("worker_locations")
    .select("*")
    .eq("org_id", member.org_id)
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (workerId) query = query.eq("worker_id", workerId);
  if (projectId) query = query.eq("project_id", projectId);

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as WorkerLocation[];
}

export async function createGeofence(input: {
  projectId?: string;
  name: string;
  description?: string;
  centerLat: number;
  centerLon: number;
  radiusMeters: number;
  shape?: "circle" | "polygon";
  polygonCoordinates?: Record<string, any>;
  entryNotification?: boolean;
  exitNotification?: boolean;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("geofences").insert({
    project_id: input.projectId ?? null,
    org_id: member.org_id,
    name: input.name,
    description: input.description ?? null,
    center_lat: input.centerLat,
    center_lon: input.centerLon,
    radius_meters: input.radiusMeters,
    shape: input.shape ?? "circle",
    polygon_coordinates: input.polygonCoordinates ?? null,
    entry_notification: input.entryNotification ?? false,
    exit_notification: input.exitNotification ?? false,
  }).select("id").single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/geolocation");
  return { ok: true, id: data.id };
}

export async function listGeofences(projectId?: string): Promise<Geofence[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  let query = db(supabase)
    .from("geofences")
    .select("*")
    .eq("org_id", member.org_id)
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (projectId) query = query.eq("project_id", projectId);

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as Geofence[];
}

export async function listGeofenceEvents(projectId?: string, workerId?: string): Promise<GeofenceEvent[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  let query = db(supabase)
    .from("geofence_events")
    .select("*")
    .eq("org_id", member.org_id)
    .order("timestamp", { ascending: false })
    .limit(100);

  if (projectId) query = query.eq("project_id", projectId);
  if (workerId) query = query.eq("worker_id", workerId);

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as GeofenceEvent[];
}

async function checkGeofences(workerId: string, projectId: string | undefined, lat: number, lon: number, orgId: string) {
  const supabase = createClient();
  const geofences = await listGeofences(projectId);
  
  for (const geofence of geofences) {
    const { data: within } = await db(supabase)
      .rpc("is_within_geofence", { lat, lon, geofence_id: geofence.id });
    
    const wasWithin = await checkPreviousLocation(workerId, geofence.id);
    const isWithin = within === true;
    
    if (isWithin && !wasWithin && geofence.entry_notification) {
      await db(supabase).from("geofence_events").insert({
        geofence_id: geofence.id,
        worker_id: workerId,
        project_id: projectId ?? null,
        org_id: orgId,
        event_type: "entry",
        latitude: lat,
        longitude: lon,
      });
    } else if (!isWithin && wasWithin && geofence.exit_notification) {
      await db(supabase).from("geofence_events").insert({
        geofence_id: geofence.id,
        worker_id: workerId,
        project_id: projectId ?? null,
        org_id: orgId,
        event_type: "exit",
        latitude: lat,
        longitude: lon,
      });
    }
  }
}

async function checkPreviousLocation(workerId: string, geofenceId: string): Promise<boolean> {
  const supabase = createClient();
  const { data: lastEvent } = await db(supabase)
    .from("geofence_events")
    .select("event_type")
    .eq("geofence_id", geofenceId)
    .eq("worker_id", workerId)
    .order("timestamp", { ascending: false })
    .limit(1)
    .single();
  
  return lastEvent?.event_type === "entry";
}

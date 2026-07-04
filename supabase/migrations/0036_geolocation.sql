-- Geolocation Module for Workers
CREATE TABLE IF NOT EXISTS worker_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  accuracy NUMERIC(10, 2), -- GPS accuracy in meters
  altitude NUMERIC(10, 2),
  altitude_accuracy NUMERIC(10, 2),
  heading NUMERIC(10, 2), -- Direction in degrees
  speed NUMERIC(10, 2), -- Speed in m/s
  
  location_method TEXT NOT NULL DEFAULT 'gps' CHECK (location_method IN ('gps', 'wifi', 'ip', 'manual')),
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worker_locations_worker ON worker_locations(worker_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_worker_locations_project ON worker_locations(project_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_worker_locations_org ON worker_locations(org_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_worker_locations_timestamp ON worker_locations(timestamp DESC);

-- Geofences (virtual boundaries for projects/sites)
CREATE TABLE IF NOT EXISTS geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  
  center_lat NUMERIC(10, 7) NOT NULL,
  center_lon NUMERIC(10, 7) NOT NULL,
  radius_meters NUMERIC(10, 2) NOT NULL,
  
  shape TEXT NOT NULL DEFAULT 'circle' CHECK (shape IN ('circle', 'polygon')),
  polygon_coordinates JSONB, -- For polygon shapes: [[lat, lon], ...]
  
  entry_notification BOOLEAN NOT NULL DEFAULT false,
  exit_notification BOOLEAN NOT NULL DEFAULT false,
  
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geofences_project ON geofences(project_id, active);
CREATE INDEX IF NOT EXISTS idx_geofences_org ON geofences(org_id, active);

-- Geofence events (entry/exit logs)
CREATE TABLE IF NOT EXISTS geofence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  geofence_id UUID NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  event_type TEXT NOT NULL CHECK (event_type IN ('entry', 'exit')),
  
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geofence_events_geofence ON geofence_events(geofence_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_geofence_events_worker ON geofence_events(worker_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_geofence_events_project ON geofence_events(project_id, timestamp DESC);

-- Function to check if point is within geofence (circle)
CREATE OR REPLACE FUNCTION is_within_geofence(lat NUMERIC, lon NUMERIC, geofence_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  center_lat NUMERIC;
  center_lon NUMERIC;
  radius NUMERIC;
  distance NUMERIC;
BEGIN
  SELECT center_lat, center_lon, radius_meters
  INTO center_lat, center_lon, radius
  FROM geofences
  WHERE id = geofence_id;
  
  -- Haversine formula for distance in meters
  distance := 6371000 * acos(
    cos(radians(lat)) * cos(radians(center_lat)) *
    cos(radians(center_lon) - radians(lon)) +
    sin(radians(lat)) * sin(radians(center_lat))
  );
  
  RETURN distance <= radius;
END;
$$ LANGUAGE plpgsql;

-- Updated at trigger for geofences
CREATE OR REPLACE FUNCTION update_geofences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_geofences_updated_at
  BEFORE UPDATE ON geofences
  FOR EACH ROW
  EXECUTE FUNCTION update_geofences_updated_at();

-- RLS
ALTER TABLE worker_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofence_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "worker_locations_org"
  ON worker_locations FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "geofences_org"
  ON geofences FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "geofence_events_org"
  ON geofence_events FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

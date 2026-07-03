-- Calendar Integration Module
CREATE TABLE IF NOT EXISTS calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook', 'ical')),
  
  email TEXT NOT NULL,
  calendar_id TEXT,
  calendar_name TEXT,
  
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  sync_direction TEXT NOT NULL DEFAULT 'bidirectional' CHECK (sync_direction IN ('bidirectional', 'to_platform', 'from_platform')),
  
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_connections_org ON calendar_connections(org_id, sync_enabled);
CREATE INDEX IF NOT EXISTS idx_calendar_connections_user ON calendar_connections(user_id, provider);

CREATE TABLE IF NOT EXISTS calendar_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES calendar_connections(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  
  events_synced INTEGER NOT NULL DEFAULT 0,
  events_created INTEGER NOT NULL DEFAULT 0,
  events_updated INTEGER NOT NULL DEFAULT 0,
  events_deleted INTEGER NOT NULL DEFAULT 0,
  
  error_message TEXT,
  
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_calendar_sync_logs_connection ON calendar_sync_logs(connection_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_logs_org ON calendar_sync_logs(org_id, started_at DESC);

CREATE TABLE IF NOT EXISTS calendar_event_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES calendar_connections(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  platform_event_id UUID NOT NULL, -- calendar_events.id
  external_event_id TEXT NOT NULL, -- Google/Outlook event ID
  
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(connection_id, external_event_id)
);

CREATE INDEX IF NOT EXISTS idx_calendar_event_mappings_platform ON calendar_event_mappings(platform_event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_mappings_external ON calendar_event_mappings(external_event_id);

-- Function to update calendar connections updated_at
CREATE OR REPLACE FUNCTION update_calendar_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_calendar_connections_updated_at
  BEFORE UPDATE ON calendar_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_connections_updated_at();

-- Function to update calendar event mappings updated_at
CREATE OR REPLACE FUNCTION update_calendar_event_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_calendar_event_mappings_updated_at
  BEFORE UPDATE ON calendar_event_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_event_mappings_updated_at();

-- RLS
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_event_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_connections_org"
  ON calendar_connections FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "calendar_sync_logs_org"
  ON calendar_sync_logs FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "calendar_event_mappings_org"
  ON calendar_event_mappings FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

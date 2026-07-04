-- CRM Integration Module
CREATE TABLE IF NOT EXISTS crm_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  provider TEXT NOT NULL CHECK (provider IN ('hubspot', 'salesforce', 'pipedrive', 'zoho', 'custom')),
  
  api_key TEXT,
  api_url TEXT,
  
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  sync_direction TEXT NOT NULL DEFAULT 'bidirectional' CHECK (sync_direction IN ('bidirectional', 'to_crm', 'from_crm')),
  
  field_mappings JSONB DEFAULT '{}', -- Map platform fields to CRM fields
  
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_connections_org ON crm_connections(org_id, sync_enabled);
CREATE INDEX IF NOT EXISTS idx_crm_connections_provider ON crm_connections(provider);

CREATE TABLE IF NOT EXISTS crm_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES crm_connections(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  entity_type TEXT NOT NULL, -- 'contacts', 'deals', 'companies', etc.
  sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'incremental')),
  
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  
  records_synced INTEGER NOT NULL DEFAULT 0,
  records_created INTEGER NOT NULL DEFAULT 0,
  records_updated INTEGER NOT NULL DEFAULT 0,
  records_deleted INTEGER NOT NULL DEFAULT 0,
  
  error_message TEXT,
  
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_crm_sync_logs_connection ON crm_sync_logs(connection_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_sync_logs_org ON crm_sync_logs(org_id, started_at DESC);

CREATE TABLE IF NOT EXISTS crm_entity_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES crm_connections(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  entity_type TEXT NOT NULL, -- 'contact', 'deal', 'company'
  platform_entity_id UUID NOT NULL, -- profiles.id, projects.id, etc.
  crm_entity_id TEXT NOT NULL, -- CRM entity ID
  
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(connection_id, entity_type, platform_entity_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_entity_mappings_platform ON crm_entity_mappings(platform_entity_id);
CREATE INDEX IF NOT EXISTS idx_crm_entity_mappings_crm ON crm_entity_mappings(crm_entity_id);

-- Function to update CRM connections updated_at
CREATE OR REPLACE FUNCTION update_crm_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_crm_connections_updated_at
  BEFORE UPDATE ON crm_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_connections_updated_at();

-- Function to update CRM entity mappings updated_at
CREATE OR REPLACE FUNCTION update_crm_entity_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_crm_entity_mappings_updated_at
  BEFORE UPDATE ON crm_entity_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_entity_mappings_updated_at();

-- RLS
ALTER TABLE crm_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_entity_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_connections_org"
  ON crm_connections FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "crm_sync_logs_org"
  ON crm_sync_logs FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "crm_entity_mappings_org"
  ON crm_entity_mappings FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

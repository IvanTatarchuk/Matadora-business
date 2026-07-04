-- API Integration Module
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL, -- Hashed API key
  key_prefix TEXT NOT NULL, -- First 8 chars for identification
  scopes TEXT[] NOT NULL DEFAULT '{}', -- e.g. ['projects:read', 'projects:write']
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(org_id, is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

CREATE TABLE IF NOT EXISTS api_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}', -- e.g. ['project.created', 'offer.accepted']
  
  secret TEXT NOT NULL, -- For webhook signature verification
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  last_triggered_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  failure_count INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_webhooks_org ON api_webhooks(org_id, is_active);

CREATE TABLE IF NOT EXISTS api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  
  ip_address TEXT,
  user_agent TEXT,
  
  request_body JSONB,
  response_body JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_logs_org ON api_logs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_key ON api_logs(api_key_id, created_at DESC);

-- Function to generate API key hash
CREATE OR REPLACE FUNCTION generate_api_key_hash(key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(sha256(key::bytea), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to update webhook stats
CREATE OR REPLACE FUNCTION update_api_webhooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_api_webhooks_updated_at
  BEFORE UPDATE ON api_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_api_webhooks_updated_at();

-- RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_keys_org"
  ON api_keys FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "api_webhooks_org"
  ON api_webhooks FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "api_logs_org"
  ON api_logs FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

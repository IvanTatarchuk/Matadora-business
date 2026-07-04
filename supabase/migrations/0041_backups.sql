-- Backups Module
CREATE TABLE IF NOT EXISTS backup_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('full', 'incremental', 'differential')),
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  
  tables TEXT[] NOT NULL DEFAULT '{}',
  include_storage BOOLEAN NOT NULL DEFAULT true,
  
  file_path TEXT,
  file_size_bytes BIGINT,
  
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backup_jobs_org ON backup_jobs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_jobs_status ON backup_jobs(status, created_at DESC);

CREATE TABLE IF NOT EXISTS backup_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('full', 'incremental', 'differential')),
  
  schedule TEXT NOT NULL, -- cron expression: '0 2 * * *' (daily at 2 AM)
  timezone TEXT NOT NULL DEFAULT 'UTC',
  
  tables TEXT[] NOT NULL DEFAULT '{}',
  include_storage BOOLEAN NOT NULL DEFAULT true,
  retention_days INTEGER NOT NULL DEFAULT 30,
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backup_schedules_org ON backup_schedules(org_id, is_active);

CREATE TABLE IF NOT EXISTS restore_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  backup_job_id UUID REFERENCES backup_jobs(id) ON DELETE SET NULL,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  
  target_tables TEXT[] NOT NULL DEFAULT '{}',
  restore_storage BOOLEAN NOT NULL DEFAULT true,
  
  preview_only BOOLEAN NOT NULL DEFAULT false,
  
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restore_jobs_org ON restore_jobs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_restore_jobs_backup ON restore_jobs(backup_job_id);

-- Function to update backup schedules updated_at
CREATE OR REPLACE FUNCTION update_backup_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_backup_schedules_updated_at
  BEFORE UPDATE ON backup_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_backup_schedules_updated_at();

-- RLS
ALTER TABLE backup_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE restore_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "backup_jobs_org"
  ON backup_jobs FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "backup_schedules_org"
  ON backup_schedules FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "restore_jobs_org"
  ON restore_jobs FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

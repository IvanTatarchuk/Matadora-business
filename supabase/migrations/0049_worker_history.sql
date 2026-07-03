-- Worker History Module
CREATE TABLE IF NOT EXISTS worker_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  crew_id UUID REFERENCES crews(id) ON DELETE SET NULL,
  
  start_date DATE NOT NULL,
  end_date DATE,
  
  role TEXT, -- worker role on the project
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worker_history_worker ON worker_history(worker_id, start_date);
CREATE INDEX IF NOT EXISTS idx_worker_history_org ON worker_history(org_id);
CREATE INDEX IF NOT EXISTS idx_worker_history_project ON worker_history(project_id);
CREATE INDEX IF NOT EXISTS idx_worker_history_crew ON worker_history(crew_id);

-- RLS
ALTER TABLE worker_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "worker_history_org"
  ON worker_history FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

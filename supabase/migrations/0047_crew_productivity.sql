-- Crew Productivity Statistics Module
CREATE TABLE IF NOT EXISTS crew_productivity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  total_hours_worked NUMERIC(10,2) DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  tasks_total INTEGER DEFAULT 0,
  
  efficiency_score NUMERIC(5,2), -- percentage
  quality_score NUMERIC(5,2), -- percentage
  
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crew_productivity_crew ON crew_productivity(crew_id, period_start);
CREATE INDEX IF NOT EXISTS idx_crew_productivity_org ON crew_productivity(org_id);
CREATE INDEX IF NOT EXISTS idx_crew_productivity_period ON crew_productivity(period_start, period_end);

-- Function to update crew_productivity updated_at
CREATE OR REPLACE FUNCTION update_crew_productivity_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_crew_productivity_updated_at
  BEFORE UPDATE ON crew_productivity
  FOR EACH ROW
  EXECUTE FUNCTION update_crew_productivity_updated_at();

-- RLS
ALTER TABLE crew_productivity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crew_productivity_org"
  ON crew_productivity FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

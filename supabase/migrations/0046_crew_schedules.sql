-- Crew Schedules Module
CREATE TABLE IF NOT EXISTS crew_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  shift_date DATE NOT NULL,
  shift_type TEXT NOT NULL CHECK (shift_type IN ('morning', 'afternoon', 'evening', 'night', 'full_day')),
  
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  break_duration INTEGER DEFAULT 0, -- minutes
  
  location TEXT,
  notes TEXT,
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crew_schedules_crew ON crew_schedules(crew_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_crew_schedules_org ON crew_schedules(org_id);
CREATE INDEX IF NOT EXISTS idx_crew_schedules_date ON crew_schedules(shift_date);

-- Function to update crew_schedules updated_at
CREATE OR REPLACE FUNCTION update_crew_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_crew_schedules_updated_at
  BEFORE UPDATE ON crew_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_crew_schedules_updated_at();

-- RLS
ALTER TABLE crew_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crew_schedules_org"
  ON crew_schedules FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

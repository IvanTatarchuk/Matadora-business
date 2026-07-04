-- Workflows Automation Module
CREATE TABLE IF NOT EXISTS workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'manual', 'scheduled', 'event_based', 'webhook', 'condition'
  )),
  trigger_config JSONB NOT NULL DEFAULT '{}',
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_definitions_org ON workflow_definitions(org_id, is_active);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_trigger ON workflow_definitions(trigger_type);

CREATE TABLE IF NOT EXISTS workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  step_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  step_type TEXT NOT NULL CHECK (step_type IN (
    'action', 'condition', 'notification', 'approval', 'delay', 'integration'
  )),
  step_config JSONB NOT NULL DEFAULT '{}',
  
  depends_on TEXT[], -- Array of step_order values this step depends on
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow ON workflow_steps(workflow_id, step_order);

CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  trigger_data JSONB DEFAULT '{}',
  
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  
  current_step INTEGER NOT NULL DEFAULT 0,
  completed_steps TEXT[] NOT NULL DEFAULT '{}',
  
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  
  result JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON workflow_executions(workflow_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_org ON workflow_executions(org_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status, started_at DESC);

CREATE TABLE IF NOT EXISTS workflow_step_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  step_id UUID REFERENCES workflow_steps(id) ON DELETE SET NULL,
  
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'skipped')),
  
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  error_message TEXT,
  
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_workflow_step_logs_execution ON workflow_step_logs(execution_id, started_at DESC);

-- Function to update workflow definitions updated_at
CREATE OR REPLACE FUNCTION update_workflow_definitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_workflow_definitions_updated_at
  BEFORE UPDATE ON workflow_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_definitions_updated_at();

-- RLS
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_step_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workflow_definitions_org"
  ON workflow_definitions FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "workflow_steps_org"
  ON workflow_steps FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "workflow_executions_org"
  ON workflow_executions FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "workflow_step_logs_org"
  ON workflow_step_logs FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

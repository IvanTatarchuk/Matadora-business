-- Business Intelligence Module
CREATE TABLE IF NOT EXISTS bi_dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  
  layout JSONB NOT NULL DEFAULT '{}', -- Dashboard layout configuration
  
  is_public BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bi_dashboards_org ON bi_dashboards(org_id, is_default);

CREATE TABLE IF NOT EXISTS bi_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID REFERENCES bi_dashboards(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  widget_type TEXT NOT NULL CHECK (widget_type IN (
    'kpi_card', 'chart', 'table', 'gauge', 'funnel', 'heatmap', 'treemap', 'pivot_table'
  )),
  
  title TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}', -- Widget-specific configuration
  query_config JSONB NOT NULL DEFAULT '{}', -- Data query configuration
  
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 4,
  height INTEGER NOT NULL DEFAULT 3,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bi_widgets_dashboard ON bi_widgets(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_bi_widgets_org ON bi_widgets(org_id);

CREATE TABLE IF NOT EXISTS bi_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  
  report_type TEXT NOT NULL CHECK (report_type IN (
    'financial', 'operational', 'sales', 'project', 'resource', 'custom'
  )),
  
  query TEXT NOT NULL,
  parameters JSONB DEFAULT '{}',
  
  schedule TEXT, -- Cron expression
  last_run_at TIMESTAMPTZ,
  
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bi_reports_org ON bi_reports(org_id, report_type);

CREATE TABLE IF NOT EXISTS bi_data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('database', 'api', 'file', 'external')),
  
  connection_config JSONB NOT NULL DEFAULT '{}',
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bi_data_sources_org ON bi_data_sources(org_id, is_active);

-- Function to update BI dashboards updated_at
CREATE OR REPLACE FUNCTION update_bi_dashboards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bi_dashboards_updated_at
  BEFORE UPDATE ON bi_dashboards
  FOR EACH ROW
  EXECUTE FUNCTION update_bi_dashboards_updated_at();

-- Function to update BI widgets updated_at
CREATE OR REPLACE FUNCTION update_bi_widgets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bi_widgets_updated_at
  BEFORE UPDATE ON bi_widgets
  FOR EACH ROW
  EXECUTE FUNCTION update_bi_widgets_updated_at();

-- Function to update BI reports updated_at
CREATE OR REPLACE FUNCTION update_bi_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bi_reports_updated_at
  BEFORE UPDATE ON bi_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_bi_reports_updated_at();

-- RLS
ALTER TABLE bi_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_data_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bi_dashboards_org"
  ON bi_dashboards FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "bi_widgets_org"
  ON bi_widgets FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "bi_reports_org"
  ON bi_reports FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "bi_data_sources_org"
  ON bi_data_sources FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

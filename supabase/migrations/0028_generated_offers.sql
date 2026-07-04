-- Generated offers from BoQ documents
CREATE TABLE IF NOT EXISTS generated_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  template TEXT NOT NULL CHECK (template IN ('investor', 'contractor', 'developer')),
  
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_address TEXT,
  
  offer_number TEXT NOT NULL,
  offer_date DATE NOT NULL,
  valid_until DATE NOT NULL,
  
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  total_net NUMERIC NOT NULL DEFAULT 0,
  total_vat NUMERIC NOT NULL DEFAULT 0,
  total_gross NUMERIC NOT NULL DEFAULT 0,
  
  notes TEXT,
  terms TEXT,
  payment_terms TEXT,
  
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_total_gross CHECK (total_gross = total_net + total_vat)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_generated_offers_project ON generated_offers(project_id);
CREATE INDEX IF NOT EXISTS idx_generated_offers_org ON generated_offers(org_id);
CREATE INDEX IF NOT EXISTS idx_generated_offers_status ON generated_offers(status);

-- RLS
ALTER TABLE generated_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org's offers"
  ON generated_offers FOR SELECT
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create offers for their org"
  ON generated_offers FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their org's offers"
  ON generated_offers FOR UPDATE
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their org's offers"
  ON generated_offers FOR DELETE
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_generated_offers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_generated_offers_updated_at
  BEFORE UPDATE ON generated_offers
  FOR EACH ROW
  EXECUTE FUNCTION update_generated_offers_updated_at();

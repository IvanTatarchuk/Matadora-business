-- Payment milestones for offer stages with escrow-like functionality
CREATE TABLE IF NOT EXISTS payment_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES offer_stages(id) ON DELETE SET NULL,
  
  name TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  due_date DATE,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'released', 'cancelled')),
  
  released_at TIMESTAMPTZ,
  released_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_amount CHECK (amount > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_milestones_offer ON payment_milestones(offer_id);
CREATE INDEX IF NOT EXISTS idx_payment_milestones_status ON payment_milestones(status);
CREATE INDEX IF NOT EXISTS idx_payment_milestones_due_date ON payment_milestones(due_date);

-- RLS
ALTER TABLE payment_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org's payment milestones"
  ON payment_milestones FOR SELECT
  USING (offer_id IN (
    SELECT id FROM offers 
    WHERE contractor_id IN (
      SELECT user_id FROM organization_members 
      WHERE org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
    )
  ));

CREATE POLICY "Users can create payment milestones for their offers"
  ON payment_milestones FOR INSERT
  WITH CHECK (offer_id IN (
    SELECT id FROM offers WHERE contractor_id = auth.uid()
  ));

CREATE POLICY "Users can update payment milestones for their offers"
  ON payment_milestones FOR UPDATE
  USING (offer_id IN (
    SELECT id FROM offers WHERE contractor_id = auth.uid()
  ));

CREATE POLICY "Users can delete payment milestones for their offers"
  ON payment_milestones FOR DELETE
  USING (offer_id IN (
    SELECT id FROM offers WHERE contractor_id = auth.uid()
  ));

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_payment_milestones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_milestones_updated_at
  BEFORE UPDATE ON payment_milestones
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_milestones_updated_at();

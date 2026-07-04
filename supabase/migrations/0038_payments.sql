-- Payment Integration Module
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL CHECK (type IN ('stripe', 'przelewy24', 'bank_transfer', 'cash')),
  provider TEXT NOT NULL, -- stripe_account_id, przelewy24_shop_id, etc.
  
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_org ON payment_methods(org_id, is_active);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
  milestone_id UUID REFERENCES payment_milestones(id) ON DELETE SET NULL,
  
  payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
  
  amount NUMERIC(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PLN',
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
  
  provider TEXT NOT NULL,
  provider_transaction_id TEXT,
  provider_status TEXT,
  
  description TEXT,
  notes TEXT,
  
  processed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_org ON payment_transactions(org_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_project ON payment_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_milestone ON payment_transactions(milestone_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider ON payment_transactions(provider, provider_transaction_id);

CREATE TABLE IF NOT EXISTS payment_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_webhooks_provider ON payment_webhooks(provider, processed);

-- Function to update payment method updated_at
CREATE OR REPLACE FUNCTION update_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_methods_updated_at();

-- Function to update payment transactions updated_at
CREATE OR REPLACE FUNCTION update_payment_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_transactions_updated_at
  BEFORE UPDATE ON payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_transactions_updated_at();

-- RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_methods_org"
  ON payment_methods FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "payment_transactions_org"
  ON payment_transactions FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "payment_webhooks_read"
  ON payment_webhooks FOR SELECT
  TO authenticated
  USING (true); -- Admin only in production

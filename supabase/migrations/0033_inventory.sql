-- Inventory/Stock Management Module
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  unit TEXT NOT NULL DEFAULT 'szt',
  
  current_stock NUMERIC(12,3) NOT NULL DEFAULT 0,
  min_stock_level NUMERIC(12,3) NOT NULL DEFAULT 0,
  max_stock_level NUMERIC(12,3),
  
  unit_cost NUMERIC(12,2),
  total_value NUMERIC(14,2) GENERATED ALWAYS AS (current_stock * COALESCE(unit_cost, 0)) STORED,
  
  location TEXT, -- warehouse shelf/location
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_org ON inventory_items(org_id);
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory_items(sku);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL CHECK (type IN ('purchase', 'sale', 'transfer', 'adjustment', 'consumption', 'return')),
  quantity NUMERIC(12,3) NOT NULL,
  unit_cost NUMERIC(12,2),
  
  reference_id UUID, -- order_id, project_id, etc.
  reference_type TEXT,
  
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item ON inventory_transactions(item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_org ON inventory_transactions(org_id, created_at DESC);

CREATE TABLE IF NOT EXISTS inventory_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
  
  quantity NUMERIC(12,3) NOT NULL,
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'allocated', 'released', 'expired')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_item ON inventory_reservations(item_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_project ON inventory_reservations(project_id, status);

-- Trigger to update inventory item stock on transaction
CREATE OR REPLACE FUNCTION update_inventory_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type IN ('purchase', 'return') THEN
    UPDATE inventory_items 
    SET current_stock = current_stock + NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.item_id;
  ELSIF NEW.type IN ('sale', 'consumption', 'adjustment') THEN
    UPDATE inventory_items 
    SET current_stock = current_stock - NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inventory_stock
  AFTER INSERT ON inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_stock();

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_inventory_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_items_updated_at();

-- RLS
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_items_org"
  ON inventory_items FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "inventory_transactions_org"
  ON inventory_transactions FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "inventory_reservations_org"
  ON inventory_reservations FOR ALL
  TO authenticated
  USING (item_id IN (SELECT id FROM inventory_items WHERE org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())));

-- Search history table for global search
CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, query)
);

CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id, updated_at DESC);

-- RLS
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "search_history_own"
  ON search_history FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

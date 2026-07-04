-- File Uploads Module
CREATE TABLE IF NOT EXISTS file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- MIME type
  file_size INTEGER NOT NULL, -- bytes
  
  storage_path TEXT NOT NULL, -- path in storage bucket
  storage_url TEXT, -- public URL if available
  
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  category TEXT CHECK (category IN ('document', 'image', 'video', 'audio', 'other')),
  
  description TEXT,
  tags TEXT[],
  
  is_public BOOLEAN NOT NULL DEFAULT false,
  
  download_count INTEGER DEFAULT 0,
  
  expires_at TIMESTAMPTZ, -- optional expiration for temporary files
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_file_uploads_org ON file_uploads(org_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_category ON file_uploads(category);
CREATE INDEX IF NOT EXISTS idx_file_uploads_uploaded_by ON file_uploads(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_file_uploads_tags ON file_uploads USING GIN(tags);

-- Function to update file_uploads updated_at
CREATE OR REPLACE FUNCTION update_file_uploads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_file_uploads_updated_at
  BEFORE UPDATE ON file_uploads
  FOR EACH ROW
  EXECUTE FUNCTION update_file_uploads_updated_at();

-- RLS
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "file_uploads_org"
  ON file_uploads FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

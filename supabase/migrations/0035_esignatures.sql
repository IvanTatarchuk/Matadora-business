-- Electronic Signatures Module
CREATE TABLE IF NOT EXISTS document_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,
  document_type TEXT NOT NULL, -- offer, contract, change_order, invoice, etc.
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  signer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  signer_name TEXT NOT NULL,
  signer_role TEXT NOT NULL, -- contractor, investor, witness, etc.
  
  signature_data TEXT NOT NULL, -- Base64 encoded signature image or hash
  signature_method TEXT NOT NULL DEFAULT 'click_to_sign' CHECK (signature_method IN ('click_to_sign', 'draw', 'type', 'upload')),
  ip_address TEXT,
  user_agent TEXT,
  
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_valid BOOLEAN NOT NULL DEFAULT true,
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_signatures_doc ON document_signatures(document_id, document_type);
CREATE INDEX IF NOT EXISTS idx_document_signatures_project ON document_signatures(project_id);
CREATE INDEX IF NOT EXISTS idx_document_signatures_org ON document_signatures(org_id);

-- Signature requests (for requesting signatures from others)
CREATE TABLE IF NOT EXISTS signature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_to_email TEXT,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'declined', 'expired', 'cancelled')),
  
  message TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  signed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signature_requests_doc ON signature_requests(document_id, status);
CREATE INDEX IF NOT EXISTS idx_signature_requests_to ON signature_requests(requested_to, status);
CREATE INDEX IF NOT EXISTS idx_signature_requests_org ON signature_requests(org_id);

-- Function to check if document is fully signed
CREATE OR REPLACE FUNCTION check_document_fully_signed(doc_id UUID, doc_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM signature_requests
    WHERE document_id = doc_id
    AND document_type = doc_type
    AND status = 'pending'
  );
END;
$$ LANGUAGE plpgsql;

-- Trigger to update signature request status when signed
CREATE OR REPLACE FUNCTION update_signature_request_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE signature_requests
  SET status = 'signed', signed_at = NEW.signed_at, updated_at = NOW()
  WHERE document_id = NEW.document_id
  AND document_type = NEW.document_type
  AND signer_id = NEW.signer_id
  AND status = 'pending';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_signature_request_status
  AFTER INSERT ON document_signatures
  FOR EACH ROW
  EXECUTE FUNCTION update_signature_request_status();

-- Updated at trigger for signature requests
CREATE OR REPLACE FUNCTION update_signature_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_signature_requests_updated_at
  BEFORE UPDATE ON signature_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_signature_requests_updated_at();

-- RLS
ALTER TABLE document_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_signatures_org"
  ON document_signatures FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "signature_requests_org"
  ON signature_requests FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

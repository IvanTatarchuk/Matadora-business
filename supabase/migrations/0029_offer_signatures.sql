-- Add signature fields to generated_offers
ALTER TABLE generated_offers 
ADD COLUMN IF NOT EXISTS signature_data TEXT,
ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS signed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for signed offers
CREATE INDEX IF NOT EXISTS idx_generated_offers_signed ON generated_offers(signed_at) WHERE signed_at IS NOT NULL;

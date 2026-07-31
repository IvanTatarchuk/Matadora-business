-- Extend offer templates to support more cost estimate types
-- This migration adds 10 new template types to support different construction projects and client types

-- Drop the old CHECK constraint on template
ALTER TABLE generated_offers DROP CONSTRAINT IF EXISTS generated_offers_template_check;

-- Add new CHECK constraint with all template types
ALTER TABLE generated_offers 
ADD CONSTRAINT generated_offers_template_check 
CHECK (template IN (
  'investor', 
  'contractor', 
  'developer',
  'renovation',
  'new_construction',
  'commercial',
  'industrial',
  'infrastructure',
  'knr_standard',
  'knr_simplified',
  'material_labor',
  'public_sector',
  'private_client'
));

-- Add comment to document the new template types
COMMENT ON COLUMN generated_offers.template IS '
Template types for cost estimates:
- investor: For private investors
- contractor: For general contractors
- developer: For real estate developers
- renovation: For renovation projects
- new_construction: For new building construction
- commercial: For commercial spaces (offices, retail)
- industrial: For industrial facilities (factories, warehouses)
- infrastructure: For infrastructure projects (roads, utilities)
- knr_standard: Official KNR standard for public tenders
- knr_simplified: Simplified KNR for small projects
- material_labor: Detailed material + labor breakdown
- public_sector: For public sector clients
- private_client: Simple estimates for private clients
';

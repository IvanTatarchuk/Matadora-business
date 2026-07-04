-- =============================================================================
-- Matadora — Phase 51: Hierarchical grouping for kosztorys line items
-- =============================================================================

alter table public.offer_stages
  add column if not exists group_label text;

comment on column public.offer_stages.group_label is
  'Optional section/room label for grouping stages in the kosztorys UI (e.g. "Łazienka"). Null = ungrouped, backward compatible with existing rows.';

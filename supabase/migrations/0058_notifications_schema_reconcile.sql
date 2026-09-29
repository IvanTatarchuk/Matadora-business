-- =============================================================================
-- Reconcile public.notifications: migration 0032 shipped a second, conflicting
-- `CREATE TABLE IF NOT EXISTS notifications` for a table already created by
-- 0020 — so 0032's intended columns (message, link, metadata) and its wider
-- `type` enum never actually existed on the live table. src/lib/actions/
-- notifications.ts and both /dashboard/notifications and /dashboard/
-- powiadomienia pages were written against 0032's (never-live) shape, so
-- every insert into this table has been failing (wrong columns + CHECK
-- violation) since it shipped.
--
-- This is additive only: keeps 0020's body/href/entity_type/entity_id/is_read
-- columns and its RFI/punch/budget-alert type values (in case anything still
-- intends to use them), and adds the message/link/metadata columns plus the
-- business-event type values the current app code actually reads/writes.
-- =============================================================================

alter table public.notifications
  add column if not exists message  text,
  add column if not exists link     text,
  add column if not exists metadata jsonb;

alter table public.notifications drop constraint if exists notifications_type_check;

alter table public.notifications add constraint notifications_type_check
  check (type in (
    -- from 0020
    'info','warning','error','success',
    'rfi_new','rfi_answered','punch_opened','punch_closed',
    'inspection_completed','risk_high','budget_alert',
    'cert_expiring','warranty_expiring','document_uploaded',
    'payment_due','daily_report_submitted',
    -- from 0032 (never actually live until now)
    'offer_sent','offer_accepted','offer_rejected',
    'message_received','payment_released','task_assigned',
    'project_update','review_received','milestone_ready',
    -- referenced by src/lib/actions/notifications.ts's NotificationType
    -- but never added to any migration's constraint
    'ad_response_received','ad_response_accepted','ad_response_rejected',
    'ad_review_received','ad_created'
  ));

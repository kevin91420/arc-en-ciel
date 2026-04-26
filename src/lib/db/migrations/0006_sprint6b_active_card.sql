-- ═══════════════════════════════════════════════════════════
-- Migration 0006 — Sprint 6b (active_card_id sur settings)
-- ═══════════════════════════════════════════════════════════
--
-- Idempotent. Adds the runtime "carte active" pointer used by the QR menu,
-- the POS catalog and the home /carte to filter categories. Falls back to
-- 'default' so the app never goes blank.
-- ═══════════════════════════════════════════════════════════

alter table restaurant_settings
  add column if not exists active_card_id text default 'default';

update restaurant_settings
  set active_card_id = 'default'
  where active_card_id is null;

-- Verification
-- select id, active_card_id from restaurant_settings;

-- ═══════════════════════════════════════════════════════════
-- Migration 0002 — Sprint 4 (service flow)
-- ═══════════════════════════════════════════════════════════
--
-- Idempotent : safe to re-run.
--
-- WHAT IT ADDS :
--   - orders.flags                              text[]      tags spéciaux ("rush" / "allergy" / "birthday" / "vip")
--   - order_items.acknowledged_at               timestamptz quand le serveur a pris le plat (entre ready et served)
--   - restaurant_settings.feature_runner_tickets   bool     auto-print runner tickets (default false, opt-in)
--   - restaurant_settings.feature_special_flags    bool     UI flags Rush/Allergie/Anniv/VIP (default true)
-- ═══════════════════════════════════════════════════════════

-- ── 1. Order flags ─────────────────────────────────────────
alter table orders
  add column if not exists flags text[] default array[]::text[];

update orders set flags = array[]::text[] where flags is null;

-- ── 2. Item acknowledged_at ────────────────────────────────
alter table order_items
  add column if not exists acknowledged_at timestamptz;

-- ── 3. Restaurant settings feature toggles ─────────────────
alter table restaurant_settings
  add column if not exists feature_runner_tickets boolean default false;

alter table restaurant_settings
  add column if not exists feature_special_flags boolean default true;

-- Coerce nulls to defaults defensively
update restaurant_settings
  set feature_runner_tickets = false
  where feature_runner_tickets is null;

update restaurant_settings
  set feature_special_flags = true
  where feature_special_flags is null;

-- ── 4. Verification ────────────────────────────────────────
-- select id, feature_runner_tickets, feature_special_flags from restaurant_settings;
-- select id, flags from orders order by created_at desc limit 5;

-- ═══════════════════════════════════════════════════════════
-- Migration 0001 — Sprints 2 & 3 (white-label tables + 86 list)
-- ═══════════════════════════════════════════════════════════
--
-- Idempotent : safe to run multiple times. Re-runs noop on existing columns
-- thanks to `if not exists`.
--
-- HOW TO APPLY (Supabase prod) :
--   1. Open https://supabase.com/dashboard/project/<your-project>/sql
--   2. Paste this entire file in a new query
--   3. Click "Run"
--   4. Confirm with: select tables, eighty_six_list from restaurant_settings;
--
-- WHAT IT ADDS :
--   - restaurant_settings.tables           jsonb     (white-label floor plan)
--   - restaurant_settings.eighty_six_list  text[]    (live stock ruptures)
-- ═══════════════════════════════════════════════════════════

-- ── 1. tables (jsonb array of TableConfig) ─────────────────
alter table restaurant_settings
  add column if not exists tables jsonb default '[
    {"number":1,"label":"T1","capacity":4,"zone":"Salle"},
    {"number":2,"label":"T2","capacity":4,"zone":"Salle"},
    {"number":3,"label":"T3","capacity":4,"zone":"Salle"},
    {"number":4,"label":"T4","capacity":4,"zone":"Salle"},
    {"number":5,"label":"T5","capacity":4,"zone":"Salle"},
    {"number":6,"label":"T6","capacity":4,"zone":"Salle"},
    {"number":7,"label":"T7","capacity":4,"zone":"Salle"},
    {"number":8,"label":"T8","capacity":4,"zone":"Salle"},
    {"number":9,"label":"T9","capacity":4,"zone":"Salle"},
    {"number":10,"label":"T10","capacity":4,"zone":"Salle"}
  ]'::jsonb;

-- Backfill any rows where tables is null/empty array
update restaurant_settings
  set tables = '[
    {"number":1,"label":"T1","capacity":4,"zone":"Salle"},
    {"number":2,"label":"T2","capacity":4,"zone":"Salle"},
    {"number":3,"label":"T3","capacity":4,"zone":"Salle"},
    {"number":4,"label":"T4","capacity":4,"zone":"Salle"},
    {"number":5,"label":"T5","capacity":4,"zone":"Salle"},
    {"number":6,"label":"T6","capacity":4,"zone":"Salle"},
    {"number":7,"label":"T7","capacity":4,"zone":"Salle"},
    {"number":8,"label":"T8","capacity":4,"zone":"Salle"},
    {"number":9,"label":"T9","capacity":4,"zone":"Salle"},
    {"number":10,"label":"T10","capacity":4,"zone":"Salle"}
  ]'::jsonb
  where id = 1
    and (tables is null or jsonb_array_length(tables) = 0);

-- ── 2. eighty_six_list (text[] of menu_item ids in rupture) ─
alter table restaurant_settings
  add column if not exists eighty_six_list text[] default array[]::text[];

-- Coerce any null values to empty array (defensive)
update restaurant_settings
  set eighty_six_list = array[]::text[]
  where eighty_six_list is null;

-- ── 3. Verification queries (uncomment to manually validate) ──
-- select id, jsonb_array_length(tables) as table_count, array_length(eighty_six_list, 1) as out_of_stock_count from restaurant_settings;
-- select unnest(eighty_six_list) from restaurant_settings;

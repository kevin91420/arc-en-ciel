# Database migrations

This directory holds **idempotent SQL migration scripts** that need to be run
against the Supabase project before the corresponding code release goes live.

Each script is numbered sequentially (`0001`, `0002`, …) and is safe to re-run
— `add column if not exists`, `update where … is null`, etc.

## Applying a migration

1. Open the Supabase SQL editor for the target project
   (https://supabase.com/dashboard/project/&lt;project&gt;/sql)
2. Paste the entire migration file
3. Click **Run**
4. Verify with the bottom-of-file query block

## Migrations log

| File | Sprint | What it does |
|------|--------|--------------|
| `0001_sprints_2_3.sql` | 2 + 3 | Adds `tables jsonb` (white-label floor plan) and `eighty_six_list text[]` (live ruptures) to `restaurant_settings`. |
| `0002_sprint4_service_flow.sql` | 4 | Adds `orders.flags text[]` (rush/allergy/birthday/vip), `order_items.acknowledged_at`, and feature toggles `feature_runner_tickets` (default OFF), `feature_special_flags` (default ON). |
| `0003_partial_payments.sql` | 4.8 | Creates `order_payments` (multi-payment per order) + auto-finalize trigger. Enables split-par-items at the addition. |
| `0004_sprint5_menu_cash_cancel.sql` | 5 | Creates `menu_categories`, `menu_items`, `menu_variants`, `menu_modifiers` (DB-backed menu — admin can edit /admin/menu), `cash_sessions` (ouverture/fermeture caisse), `order_cancellations` (annulation/remboursement avec audit). |
| `0005_sprint6_onboarding_cards_combos_floor.sql` | 6 | Adds `setup_completed` flag, `menu_cards` (multi-cartes Midi/Soir/Weekend), `menu_combos` + `menu_combo_slots` (formules), `order_items.combo_id`. Existing categories are auto-attached to a 'default' card. Plan de salle 2D coordinates store inside `restaurant_settings.tables` JSON (no extra table needed). |
| `0006_sprint6b_active_card.sql` | 6b | Adds `restaurant_settings.active_card_id` — runtime pointer pour la carte active (Midi vs Soir vs Weekend). Tous les surfaces (QR menu, POS, /carte) filtrent par ce champ. Default `'default'`. |

## After deploy

To verify the schema is in sync with prod, run from the SQL editor:

```sql
select column_name, data_type
from information_schema.columns
where table_name = 'restaurant_settings'
order by ordinal_position;
```

Expected columns include `tables` (`jsonb`) and `eighty_six_list` (`ARRAY`).

-- ═══════════════════════════════════════════════════════════
-- Migration 0015 — Sprint 7b — Stock tracking par item (Niveau 1)
-- ═══════════════════════════════════════════════════════════
--
-- Idempotent. Active le suivi de stock par menu_item :
--   - track_stock          : opt-in (par défaut OFF, le manager active item par item)
--   - stock_quantity       : compteur courant (NULL = pas de gestion)
--   - stock_threshold_low  : seuil d'alerte (par défaut 5)
--
-- + table stock_movements pour audit trail des entrées/sorties.
--
-- Logique métier :
--   - Au "fire" (envoi cuisine) : auto-décrément du stock
--   - Au "cancel" : auto-recrédit du stock
--   - Si stock <= 0 → auto-ajout à eighty_six_list (rupture)
--   - Le manager peut faire un restock manuel via /admin/stock
--
-- Demandé par retour terrain (boulangerie patronne d'Angelo) :
-- "Faire un stock plus précis avec nombre d'item (burrata, huile, etc.)
-- et que ça marche en directe. Mettre en place un message pour les
-- ruptures proches".
--
-- Note Niveau 1 : on track au niveau menu_item (pizza Margherita = 12).
-- Niveau 2 (ingrédients/recettes) viendra dans un sprint dédié.
--
-- HOW TO APPLY :
--   1. Open https://supabase.com/dashboard/project/rrvygmcpgmfqvelbpjjt/sql
--   2. Paste this entire file
--   3. Click "Run"
-- ═══════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────
-- 1. Colonnes stock sur menu_items
-- ──────────────────────────────────────────────────────────
alter table menu_items
  add column if not exists track_stock boolean not null default false;

alter table menu_items
  add column if not exists stock_quantity integer;

alter table menu_items
  add column if not exists stock_threshold_low integer default 5;

/* Index partiel pour query "items en alerte" rapide */
create index if not exists idx_menu_items_stock_alert
  on menu_items (restaurant_id, stock_quantity)
  where track_stock = true and stock_quantity is not null;

-- ──────────────────────────────────────────────────────────
-- 2. Table stock_movements (audit trail)
-- ──────────────────────────────────────────────────────────
create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  menu_item_id text not null,

  /* kind : restock, sale, loss, adjustment, return (cancel) */
  kind text not null check (kind in ('restock', 'sale', 'loss', 'adjustment', 'return')),

  /* delta : positif = entrée, négatif = sortie. Zéro interdit. */
  delta integer not null check (delta != 0),

  /* Snapshot du stock après mouvement (pour audit) */
  quantity_after integer not null,

  notes text,
  created_by_staff_id uuid,
  /* Lien optionnel vers une commande (pour les sales) */
  order_id text,

  created_at timestamptz not null default now()
);

create index if not exists idx_stock_movements_restaurant_item
  on stock_movements (restaurant_id, menu_item_id, created_at desc);
create index if not exists idx_stock_movements_kind
  on stock_movements (restaurant_id, kind, created_at desc);
create index if not exists idx_stock_movements_order
  on stock_movements (order_id) where order_id is not null;

-- ──────────────────────────────────────────────────────────
-- 3. Verification queries
-- ──────────────────────────────────────────────────────────
-- select count(*) from menu_items where track_stock = true;
-- select count(*) from stock_movements;
-- select id, name, track_stock, stock_quantity, stock_threshold_low
-- from menu_items where track_stock = true order by stock_quantity asc;

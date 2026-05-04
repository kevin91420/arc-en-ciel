-- ═══════════════════════════════════════════════════════════
-- Migration 0012 — Sprint 7b — Remises commerciales sur commandes
-- ═══════════════════════════════════════════════════════════
--
-- Idempotent. Permet d'appliquer une ou plusieurs remises au niveau de
-- la commande (geste commercial en service). Chaque remise est tracée
-- (qui, quand, raison, note) pour audit.
--
-- Demandé par retour terrain (boulangerie utilisatrice d'Angelo) :
-- "Sur la borne serveur permettre de proposer pourcentage de réduction
-- en fonction du prix total de la commande ou du prix pour certain
-- produit de la commande".
--
-- Logique métier :
--   - Une commande peut avoir 0..N remises (stack possible : -10% fidélité +
--     -5€ excuse retard, par ex)
--   - Chaque remise est snapshot (pct + amount_cents calculé) — si le total
--     change après, on garde la valeur d'origine ou on recalcule selon le mode
--   - Mode "percentage" : amount_cents recalculé à chaque recompute
--   - Mode "fixed" : amount_cents fixe quel que soit le total
--   - Les remises s'appliquent AVANT la TVA (TVA réduite proportionnellement)
--   - Audit trail complet : NF525 friendly
--
-- HOW TO APPLY :
--   1. Open https://supabase.com/dashboard/project/rrvygmcpgmfqvelbpjjt/sql
--   2. Paste this entire file
--   3. Click "Run"
--   4. Vérifier : select count(*) from order_discounts; -- doit retourner 0
-- ═══════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────
-- 1. Table `order_discounts` — chaque remise appliquée
-- ──────────────────────────────────────────────────────────
create table if not exists order_discounts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  order_id text not null,

  /* kind = 'percentage' (pourcentage du subtotal) ou 'fixed' (montant cents) */
  kind text not null check (kind in ('percentage', 'fixed')),

  /* Si kind='percentage' : value_pct ∈ [0, 100]. amount_cents recalculé. */
  /* Si kind='fixed'      : amount_cents fixe. value_pct est null. */
  value_pct numeric(5, 2) check (value_pct is null or (value_pct >= 0 and value_pct <= 100)),
  amount_cents integer not null check (amount_cents >= 0),

  /* Raison commerciale — enum souple pour stats */
  reason text not null default 'autre' check (reason in (
    'fidelite',         -- client fidèle, programme tampons
    'reclamation',      -- client mécontent (qualité, attente, etc.)
    'invitation',       -- patron offre (ami, famille, VIP)
    'happy_hour',       -- happy hour / promo périodique
    'menu',             -- menu/formule (déjà inclus mais traçable)
    'partenariat',      -- partenaire (entreprise voisine, etc.)
    'erreur',           -- erreur de la maison (mauvais plat servi)
    'autre'             -- raison libre
  )),
  notes text,           -- note libre
  applied_by_staff_id uuid,

  created_at timestamptz not null default now()
);

create index if not exists idx_order_discounts_restaurant on order_discounts (restaurant_id);
create index if not exists idx_order_discounts_order on order_discounts (order_id);
create index if not exists idx_order_discounts_reason on order_discounts (restaurant_id, reason);
create index if not exists idx_order_discounts_created on order_discounts (restaurant_id, created_at desc);

-- ──────────────────────────────────────────────────────────
-- 2. Colonne dénormalisée `discount_total_cents` sur orders
--    (cache du total des remises pour les queries rapides — recalculé
--    par le backend à chaque add/remove ou via recomputeOrderTotals)
-- ──────────────────────────────────────────────────────────
alter table orders
  add column if not exists discount_total_cents integer not null default 0
  check (discount_total_cents >= 0);

create index if not exists idx_orders_discount_nonzero
  on orders (restaurant_id, paid_at)
  where discount_total_cents > 0;

-- ──────────────────────────────────────────────────────────
-- 3. Verification queries
-- ──────────────────────────────────────────────────────────
-- select count(*) from order_discounts;
-- select id, total_cents, discount_total_cents from orders limit 5;

-- ═══════════════════════════════════════════════════════════
-- Migration 0014 — Sprint 7b — Clôtures journalière + mensuelle
-- ═══════════════════════════════════════════════════════════
--
-- Idempotent. Crée le système de clôture comptable obligatoire :
--   - daily_closures   : 1 row par jour clôturé (manager only)
--   - monthly_closures : 1 row par mois clôturé (manager only, after all
--     daily closures of the month)
--
-- Logique métier :
--   - Le manager doit clôturer chaque journée à la fin du service
--   - Tant qu'une journée n'est pas clôturée, on AVERTIT visuellement
--     mais on ne BLOQUE PAS le lendemain (réalité opérationnelle :
--     un service à 1h du mat puis ouverture le matin = pas le temps)
--   - Le mois est clôturé une fois tous les jours du mois clôturés
--   - Le snapshot Z est figé en JSONB pour audit immutable (NF525-friendly)
--   - Soft-delete impossible : une fois clôturé = clôturé. Si erreur,
--     on crée une note dans le suivant.
--
-- Demandé par retour terrain (boulangerie utilisatrice d'Angelo) :
-- "Avoir une clôture de journée pour le manager. Le manager doit
-- clôturer pour commencer une nouvelle journée. Imprimable."
--
-- HOW TO APPLY :
--   1. Open https://supabase.com/dashboard/project/rrvygmcpgmfqvelbpjjt/sql
--   2. Paste this entire file
--   3. Click "Run"
-- ═══════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────
-- 1. Table `daily_closures`
-- ──────────────────────────────────────────────────────────
create table if not exists daily_closures (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,

  /* Date concernée par la clôture (PAS la date où on a clôturé). */
  service_date date not null,

  /* Manager qui a clôturé — obligatoire pour audit */
  closed_by_staff_id uuid not null,

  /* Timestamp de la clôture (peut être plus tard que service_date) */
  closed_at timestamptz not null default now(),

  /* Snapshot Z immutable. Conserve toutes les données pour audit même
   * si les commandes/items/payments changent après. NF525-friendly. */
  z_snapshot jsonb not null default '{}'::jsonb,

  /* Métriques pré-extraites pour query rapide sans parser le JSONB */
  revenue_ttc_cents integer not null default 0,
  revenue_ht_cents integer not null default 0,
  tax_cents integer not null default 0,
  tip_cents integer not null default 0,
  discount_total_cents integer not null default 0,
  orders_count integer not null default 0,
  guests_count integer not null default 0,

  /* Note libre du manager (incident, événement, etc.) */
  notes text,

  created_at timestamptz not null default now(),

  /* Une seule clôture par jour par tenant (évite les doublons) */
  unique (restaurant_id, service_date)
);

create index if not exists idx_daily_closures_restaurant_date
  on daily_closures (restaurant_id, service_date desc);
create index if not exists idx_daily_closures_closed_by
  on daily_closures (closed_by_staff_id);

-- ──────────────────────────────────────────────────────────
-- 2. Table `monthly_closures`
-- ──────────────────────────────────────────────────────────
create table if not exists monthly_closures (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,

  /* Année + mois sous forme date au 1er du mois (cohérent pour tri) */
  service_month date not null,

  closed_by_staff_id uuid not null,
  closed_at timestamptz not null default now(),

  /* Snapshot du PeriodReport mensuel */
  period_snapshot jsonb not null default '{}'::jsonb,

  revenue_ttc_cents integer not null default 0,
  revenue_ht_cents integer not null default 0,
  tax_cents integer not null default 0,
  tip_cents integer not null default 0,
  discount_total_cents integer not null default 0,
  orders_count integer not null default 0,

  notes text,
  created_at timestamptz not null default now(),

  unique (restaurant_id, service_month)
);

create index if not exists idx_monthly_closures_restaurant_month
  on monthly_closures (restaurant_id, service_month desc);

-- ──────────────────────────────────────────────────────────
-- 3. Verification queries
-- ──────────────────────────────────────────────────────────
-- select count(*) from daily_closures;
-- select service_date, revenue_ttc_cents, orders_count from daily_closures
--   order by service_date desc limit 10;

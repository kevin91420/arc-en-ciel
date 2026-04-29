-- ═══════════════════════════════════════════════════════════
-- Migration 0007 — Sprint 7b (Multi-tenant foundation)
-- ═══════════════════════════════════════════════════════════
--
-- Idempotent : safe to run multiple times. Toute la magie passe par
-- `if not exists`, des DO blocks pour les contraintes, et des UPDATE
-- guardés pour les backfills.
--
-- ⚠️ ORDRE IMPORTANT — NE PAS RÉORDONNER :
--   1. Créer la table `restaurants` (le pivot)
--   2. Seed Arc-en-Ciel comme tenant 1 (UUID stable)
--   3. Ajouter `restaurant_id` à toutes les tables métier (nullable d'abord,
--      avec DEFAULT pointant sur Arc-en-Ciel)
--   4. Backfill : toutes les rows existantes → tenant Arc-en-Ciel
--   5. Ajouter les index sur restaurant_id (perf des queries filtrées)
--   6. Ajouter les FK contraintes (sécurise l'intégrité référentielle)
--
-- ❗ RLS : pas dans cette migration. On ajoutera les policies dans
-- 0008_sprint7b_rls.sql une fois que tout le code TS est multi-tenant ready.
-- Sinon on bricke l'admin instantanément.
--
-- HOW TO APPLY (Supabase prod) :
--   1. Backup la DB d'abord (Supabase Dashboard → Database → Backups)
--   2. Open https://supabase.com/dashboard/project/rrvygmcpgmfqvelbpjjt/sql
--   3. Paste this entire file in a new query
--   4. Click "Run"
--   5. Vérifier : select count(*) from restaurants; -- doit retourner 1
--   6. Vérifier : select count(*) from orders where restaurant_id is not null;
--      -- doit égaler total orders
-- ═══════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────
-- 1. Table restaurants — le pivot multi-tenant
-- ──────────────────────────────────────────────────────────
create table if not exists restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  /* branding : couleurs, fonts, logo URL — injecté en CSS variables au runtime */
  branding jsonb default '{}'::jsonb,
  /* settings_overrides : permet de surcharger les settings globaux par tenant */
  settings_overrides jsonb default '{}'::jsonb,
  owner_email text,
  owner_phone text,
  /* address pour facturation + plan local */
  address text,
  city text,
  postal_code text,
  country text default 'FR',
  /* timezone du resto (pour affichage horaires + reports) */
  timezone text default 'Europe/Paris',
  /* statut commercial */
  active boolean default true not null,
  /* stripe billing — rempli au sprint 8 */
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text default 'trial' check (subscription_status in ('trial', 'active', 'past_due', 'canceled', 'expired')),
  trial_ends_at timestamptz default (now() + interval '30 days'),
  /* tracking */
  onboarding_completed boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_restaurants_slug on restaurants (slug);
create index if not exists idx_restaurants_active on restaurants (active) where active = true;

-- Trigger pour updated_at
create or replace function set_updated_at_restaurants()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_restaurants_updated_at on restaurants;
create trigger trg_restaurants_updated_at
  before update on restaurants
  for each row execute function set_updated_at_restaurants();

-- ──────────────────────────────────────────────────────────
-- 2. Seed Arc-en-Ciel comme tenant 1 (UUID STABLE)
-- ──────────────────────────────────────────────────────────
-- ⚠️ Cet UUID est CONSTANT, il sert de DEFAULT partout. Ne JAMAIS le changer.
insert into restaurants (
  id, slug, name, branding, owner_email, active, subscription_status,
  trial_ends_at, onboarding_completed
) values (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'arc-en-ciel',
  'L''Arc en Ciel',
  jsonb_build_object(
    'primary_color', '#5b3a29',
    'accent_color', '#b8922f',
    'background_color', '#fdf6e3',
    'font_display', 'Playfair Display',
    'font_body', 'Inter',
    'logo_url', null
  ),
  'k.aubouin@gmail.com',
  true,
  'active',
  null,
  true
)
on conflict (slug) do nothing;

-- ──────────────────────────────────────────────────────────
-- 3. Ajouter restaurant_id à toutes les tables métier
-- ──────────────────────────────────────────────────────────
-- Pattern utilisé pour chaque table :
--   a) ALTER add column if not exists, nullable, default = arc-en-ciel UUID
--   b) UPDATE backfill toutes les rows where restaurant_id is null
--   c) Index sur restaurant_id (perf)
--   d) FK contrainte via DO block (idempotent)

-- ── 3.1 restaurant_settings ──────────────────────────────
alter table restaurant_settings
  add column if not exists restaurant_id uuid
  default '00000000-0000-0000-0000-000000000001'::uuid;

update restaurant_settings
  set restaurant_id = '00000000-0000-0000-0000-000000000001'::uuid
  where restaurant_id is null;

create index if not exists idx_restaurant_settings_restaurant_id
  on restaurant_settings (restaurant_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_restaurant_settings_restaurant_id'
  ) then
    alter table restaurant_settings
      add constraint fk_restaurant_settings_restaurant_id
      foreign key (restaurant_id) references restaurants (id) on delete cascade;
  end if;
end $$;

-- ── 3.2 orders ───────────────────────────────────────────
alter table orders
  add column if not exists restaurant_id uuid
  default '00000000-0000-0000-0000-000000000001'::uuid;

update orders
  set restaurant_id = '00000000-0000-0000-0000-000000000001'::uuid
  where restaurant_id is null;

create index if not exists idx_orders_restaurant_id on orders (restaurant_id);
create index if not exists idx_orders_restaurant_status on orders (restaurant_id, status);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_orders_restaurant_id') then
    alter table orders
      add constraint fk_orders_restaurant_id
      foreign key (restaurant_id) references restaurants (id) on delete cascade;
  end if;
end $$;

-- ── 3.3 order_items ──────────────────────────────────────
alter table order_items
  add column if not exists restaurant_id uuid
  default '00000000-0000-0000-0000-000000000001'::uuid;

update order_items
  set restaurant_id = '00000000-0000-0000-0000-000000000001'::uuid
  where restaurant_id is null;

create index if not exists idx_order_items_restaurant_id on order_items (restaurant_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_order_items_restaurant_id') then
    alter table order_items
      add constraint fk_order_items_restaurant_id
      foreign key (restaurant_id) references restaurants (id) on delete cascade;
  end if;
end $$;

-- ── 3.4 order_payments ───────────────────────────────────
alter table order_payments
  add column if not exists restaurant_id uuid
  default '00000000-0000-0000-0000-000000000001'::uuid;

update order_payments
  set restaurant_id = '00000000-0000-0000-0000-000000000001'::uuid
  where restaurant_id is null;

create index if not exists idx_order_payments_restaurant_id on order_payments (restaurant_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_order_payments_restaurant_id') then
    alter table order_payments
      add constraint fk_order_payments_restaurant_id
      foreign key (restaurant_id) references restaurants (id) on delete cascade;
  end if;
end $$;

-- ── 3.5 order_cancellations ──────────────────────────────
alter table order_cancellations
  add column if not exists restaurant_id uuid
  default '00000000-0000-0000-0000-000000000001'::uuid;

update order_cancellations
  set restaurant_id = '00000000-0000-0000-0000-000000000001'::uuid
  where restaurant_id is null;

create index if not exists idx_order_cancellations_restaurant_id on order_cancellations (restaurant_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_order_cancellations_restaurant_id') then
    alter table order_cancellations
      add constraint fk_order_cancellations_restaurant_id
      foreign key (restaurant_id) references restaurants (id) on delete cascade;
  end if;
end $$;

-- ── 3.6 customers ────────────────────────────────────────
alter table customers
  add column if not exists restaurant_id uuid
  default '00000000-0000-0000-0000-000000000001'::uuid;

update customers
  set restaurant_id = '00000000-0000-0000-0000-000000000001'::uuid
  where restaurant_id is null;

create index if not exists idx_customers_restaurant_id on customers (restaurant_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_customers_restaurant_id') then
    alter table customers
      add constraint fk_customers_restaurant_id
      foreign key (restaurant_id) references restaurants (id) on delete cascade;
  end if;
end $$;

-- ── 3.7 menu_categories ──────────────────────────────────
alter table menu_categories
  add column if not exists restaurant_id uuid
  default '00000000-0000-0000-0000-000000000001'::uuid;

update menu_categories
  set restaurant_id = '00000000-0000-0000-0000-000000000001'::uuid
  where restaurant_id is null;

create index if not exists idx_menu_categories_restaurant_id on menu_categories (restaurant_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_menu_categories_restaurant_id') then
    alter table menu_categories
      add constraint fk_menu_categories_restaurant_id
      foreign key (restaurant_id) references restaurants (id) on delete cascade;
  end if;
end $$;

-- ── 3.8 menu_items ───────────────────────────────────────
alter table menu_items
  add column if not exists restaurant_id uuid
  default '00000000-0000-0000-0000-000000000001'::uuid;

update menu_items
  set restaurant_id = '00000000-0000-0000-0000-000000000001'::uuid
  where restaurant_id is null;

create index if not exists idx_menu_items_restaurant_id on menu_items (restaurant_id);
create index if not exists idx_menu_items_restaurant_active on menu_items (restaurant_id, active);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_menu_items_restaurant_id') then
    alter table menu_items
      add constraint fk_menu_items_restaurant_id
      foreign key (restaurant_id) references restaurants (id) on delete cascade;
  end if;
end $$;

-- ── 3.9 menu_variants ────────────────────────────────────
alter table menu_variants
  add column if not exists restaurant_id uuid
  default '00000000-0000-0000-0000-000000000001'::uuid;

update menu_variants
  set restaurant_id = '00000000-0000-0000-0000-000000000001'::uuid
  where restaurant_id is null;

create index if not exists idx_menu_variants_restaurant_id on menu_variants (restaurant_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_menu_variants_restaurant_id') then
    alter table menu_variants
      add constraint fk_menu_variants_restaurant_id
      foreign key (restaurant_id) references restaurants (id) on delete cascade;
  end if;
end $$;

-- ── 3.10 menu_modifiers ──────────────────────────────────
alter table menu_modifiers
  add column if not exists restaurant_id uuid
  default '00000000-0000-0000-0000-000000000001'::uuid;

update menu_modifiers
  set restaurant_id = '00000000-0000-0000-0000-000000000001'::uuid
  where restaurant_id is null;

create index if not exists idx_menu_modifiers_restaurant_id on menu_modifiers (restaurant_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_menu_modifiers_restaurant_id') then
    alter table menu_modifiers
      add constraint fk_menu_modifiers_restaurant_id
      foreign key (restaurant_id) references restaurants (id) on delete cascade;
  end if;
end $$;

-- ── 3.11 menu_cards ──────────────────────────────────────
alter table menu_cards
  add column if not exists restaurant_id uuid
  default '00000000-0000-0000-0000-000000000001'::uuid;

update menu_cards
  set restaurant_id = '00000000-0000-0000-0000-000000000001'::uuid
  where restaurant_id is null;

create index if not exists idx_menu_cards_restaurant_id on menu_cards (restaurant_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_menu_cards_restaurant_id') then
    alter table menu_cards
      add constraint fk_menu_cards_restaurant_id
      foreign key (restaurant_id) references restaurants (id) on delete cascade;
  end if;
end $$;

-- ── 3.12 menu_combos ─────────────────────────────────────
alter table menu_combos
  add column if not exists restaurant_id uuid
  default '00000000-0000-0000-0000-000000000001'::uuid;

update menu_combos
  set restaurant_id = '00000000-0000-0000-0000-000000000001'::uuid
  where restaurant_id is null;

create index if not exists idx_menu_combos_restaurant_id on menu_combos (restaurant_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_menu_combos_restaurant_id') then
    alter table menu_combos
      add constraint fk_menu_combos_restaurant_id
      foreign key (restaurant_id) references restaurants (id) on delete cascade;
  end if;
end $$;

-- ── 3.13 menu_combo_slots ────────────────────────────────
alter table menu_combo_slots
  add column if not exists restaurant_id uuid
  default '00000000-0000-0000-0000-000000000001'::uuid;

update menu_combo_slots
  set restaurant_id = '00000000-0000-0000-0000-000000000001'::uuid
  where restaurant_id is null;

create index if not exists idx_menu_combo_slots_restaurant_id on menu_combo_slots (restaurant_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_menu_combo_slots_restaurant_id') then
    alter table menu_combo_slots
      add constraint fk_menu_combo_slots_restaurant_id
      foreign key (restaurant_id) references restaurants (id) on delete cascade;
  end if;
end $$;

-- ── 3.14 loyalty_cards ───────────────────────────────────
alter table loyalty_cards
  add column if not exists restaurant_id uuid
  default '00000000-0000-0000-0000-000000000001'::uuid;

update loyalty_cards
  set restaurant_id = '00000000-0000-0000-0000-000000000001'::uuid
  where restaurant_id is null;

create index if not exists idx_loyalty_cards_restaurant_id on loyalty_cards (restaurant_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_loyalty_cards_restaurant_id') then
    alter table loyalty_cards
      add constraint fk_loyalty_cards_restaurant_id
      foreign key (restaurant_id) references restaurants (id) on delete cascade;
  end if;
end $$;

-- ── 3.15 loyalty_config ──────────────────────────────────
alter table loyalty_config
  add column if not exists restaurant_id uuid
  default '00000000-0000-0000-0000-000000000001'::uuid;

update loyalty_config
  set restaurant_id = '00000000-0000-0000-0000-000000000001'::uuid
  where restaurant_id is null;

create index if not exists idx_loyalty_config_restaurant_id on loyalty_config (restaurant_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_loyalty_config_restaurant_id') then
    alter table loyalty_config
      add constraint fk_loyalty_config_restaurant_id
      foreign key (restaurant_id) references restaurants (id) on delete cascade;
  end if;
end $$;

-- ── 3.16 loyalty_transactions ────────────────────────────
alter table loyalty_transactions
  add column if not exists restaurant_id uuid
  default '00000000-0000-0000-0000-000000000001'::uuid;

update loyalty_transactions
  set restaurant_id = '00000000-0000-0000-0000-000000000001'::uuid
  where restaurant_id is null;

create index if not exists idx_loyalty_transactions_restaurant_id on loyalty_transactions (restaurant_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_loyalty_transactions_restaurant_id') then
    alter table loyalty_transactions
      add constraint fk_loyalty_transactions_restaurant_id
      foreign key (restaurant_id) references restaurants (id) on delete cascade;
  end if;
end $$;

-- ── 3.17 reservations ────────────────────────────────────
alter table reservations
  add column if not exists restaurant_id uuid
  default '00000000-0000-0000-0000-000000000001'::uuid;

update reservations
  set restaurant_id = '00000000-0000-0000-0000-000000000001'::uuid
  where restaurant_id is null;

create index if not exists idx_reservations_restaurant_id on reservations (restaurant_id);
create index if not exists idx_reservations_restaurant_date on reservations (restaurant_id, date);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_reservations_restaurant_id') then
    alter table reservations
      add constraint fk_reservations_restaurant_id
      foreign key (restaurant_id) references restaurants (id) on delete cascade;
  end if;
end $$;

-- ── 3.18 restaurant_tables ───────────────────────────────
alter table restaurant_tables
  add column if not exists restaurant_id uuid
  default '00000000-0000-0000-0000-000000000001'::uuid;

update restaurant_tables
  set restaurant_id = '00000000-0000-0000-0000-000000000001'::uuid
  where restaurant_id is null;

create index if not exists idx_restaurant_tables_restaurant_id on restaurant_tables (restaurant_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_restaurant_tables_restaurant_id') then
    alter table restaurant_tables
      add constraint fk_restaurant_tables_restaurant_id
      foreign key (restaurant_id) references restaurants (id) on delete cascade;
  end if;
end $$;

-- ── 3.19 cash_sessions ───────────────────────────────────
alter table cash_sessions
  add column if not exists restaurant_id uuid
  default '00000000-0000-0000-0000-000000000001'::uuid;

update cash_sessions
  set restaurant_id = '00000000-0000-0000-0000-000000000001'::uuid
  where restaurant_id is null;

create index if not exists idx_cash_sessions_restaurant_id on cash_sessions (restaurant_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_cash_sessions_restaurant_id') then
    alter table cash_sessions
      add constraint fk_cash_sessions_restaurant_id
      foreign key (restaurant_id) references restaurants (id) on delete cascade;
  end if;
end $$;

-- ── 3.20 staff_members ───────────────────────────────────
alter table staff_members
  add column if not exists restaurant_id uuid
  default '00000000-0000-0000-0000-000000000001'::uuid;

update staff_members
  set restaurant_id = '00000000-0000-0000-0000-000000000001'::uuid
  where restaurant_id is null;

create index if not exists idx_staff_members_restaurant_id on staff_members (restaurant_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_staff_members_restaurant_id') then
    alter table staff_members
      add constraint fk_staff_members_restaurant_id
      foreign key (restaurant_id) references restaurants (id) on delete cascade;
  end if;
end $$;

-- ── 3.21 events (audit log) ──────────────────────────────
alter table events
  add column if not exists restaurant_id uuid
  default '00000000-0000-0000-0000-000000000001'::uuid;

update events
  set restaurant_id = '00000000-0000-0000-0000-000000000001'::uuid
  where restaurant_id is null;

create index if not exists idx_events_restaurant_id on events (restaurant_id);
create index if not exists idx_events_restaurant_created on events (restaurant_id, created_at desc);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_events_restaurant_id') then
    alter table events
      add constraint fk_events_restaurant_id
      foreign key (restaurant_id) references restaurants (id) on delete cascade;
  end if;
end $$;

-- ── 3.22 waiter_calls ────────────────────────────────────
alter table waiter_calls
  add column if not exists restaurant_id uuid
  default '00000000-0000-0000-0000-000000000001'::uuid;

update waiter_calls
  set restaurant_id = '00000000-0000-0000-0000-000000000001'::uuid
  where restaurant_id is null;

create index if not exists idx_waiter_calls_restaurant_id on waiter_calls (restaurant_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_waiter_calls_restaurant_id') then
    alter table waiter_calls
      add constraint fk_waiter_calls_restaurant_id
      foreign key (restaurant_id) references restaurants (id) on delete cascade;
  end if;
end $$;

-- ──────────────────────────────────────────────────────────
-- 4. Tables NON-tenant (rester globales — pas de restaurant_id)
-- ──────────────────────────────────────────────────────────
-- Ces tables sont GLOBALES, pas par tenant :
--   - prospects        (CRM des prospects du SaaS lui-même)
--   - prospect_emails  (idem)
--   - pack_leads       (leads marketing du SaaS)
-- → on n'y touche PAS

-- ──────────────────────────────────────────────────────────
-- 5. Verification queries (uncomment to manually validate)
-- ──────────────────────────────────────────────────────────
-- select count(*) as nb_restaurants from restaurants;
-- select id, slug, name, subscription_status from restaurants;
-- select count(*) from orders where restaurant_id is null;  -- doit être 0
-- select count(*) from menu_items where restaurant_id is null;  -- doit être 0
-- select count(*) from order_items where restaurant_id is null;  -- doit être 0

-- ──────────────────────────────────────────────────────────
-- 6. Notes pour la prochaine migration (0008 — RLS)
-- ──────────────────────────────────────────────────────────
-- Quand tout le code TS sera tenant-aware (utilisera tenant_id dans les queries),
-- on activera les RLS policies. D'ici là, les FK contraintes assurent l'intégrité.
-- Le service role (notre backend) peut toujours tout lire/écrire.

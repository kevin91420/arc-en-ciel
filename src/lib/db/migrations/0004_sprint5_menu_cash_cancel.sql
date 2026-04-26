-- ═══════════════════════════════════════════════════════════
-- Migration 0004 — Sprint 5 (menu editor + variants/modifiers
--                            + cash sessions + cancellations)
-- ═══════════════════════════════════════════════════════════
--
-- Idempotent. Adds the tables that turn the prototype into a vendable POS :
--   - menu_categories / menu_items / menu_variants / menu_modifiers
--     → admin can edit the carte from /admin/menu, no code change needed
--   - cash_sessions
--     → ouverture/fermeture de caisse + écart
--   - order_cancellations
--     → annulation / remboursement / avoir avec audit trail
-- ═══════════════════════════════════════════════════════════

-- ── 1. Menu — categories ───────────────────────────────────
create table if not exists menu_categories (
  id text primary key,            -- "entrees", "pizzas", ... slug stable
  number text not null default '01',
  title text not null,
  subtitle text,
  intro text,
  icon text default '🍽',
  station text default 'main' check (station in ('main','pizza','grill','cold','dessert','bar')),
  position int default 0,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists menu_categories_position_idx on menu_categories(position);

drop trigger if exists update_menu_categories_updated_at on menu_categories;
create trigger update_menu_categories_updated_at before update on menu_categories
  for each row execute function update_updated_at_column();

-- ── 2. Menu — items ────────────────────────────────────────
create table if not exists menu_items (
  id text primary key,            -- slug stable, ex. "burrata"
  category_id text not null references menu_categories(id) on delete cascade,
  name text not null,
  description text default '',
  price_cents int not null check (price_cents >= 0),
  image_url text,
  signature boolean default false,
  popular boolean default false,
  chef boolean default false,
  tags text[] default array[]::text[],   -- "halal", "vegetarien", "epice", "sans-gluten", "vegan"
  position int default 0,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists menu_items_category_idx on menu_items(category_id);
create index if not exists menu_items_active_idx on menu_items(active) where active = true;

drop trigger if exists update_menu_items_updated_at on menu_items;
create trigger update_menu_items_updated_at before update on menu_items
  for each row execute function update_updated_at_column();

-- ── 3. Menu — variants (taille / déclinaison avec prix delta) ─
create table if not exists menu_variants (
  id uuid primary key default uuid_generate_v4(),
  menu_item_id text not null references menu_items(id) on delete cascade,
  label text not null,                        -- "Petite", "Moyenne", "Grande"
  price_delta_cents int default 0,            -- additif au prix de base
  is_default boolean default false,
  position int default 0,
  created_at timestamptz default now()
);
create index if not exists menu_variants_item_idx on menu_variants(menu_item_id);

-- ── 4. Menu — modifiers (suppléments / options tarifées) ──
create table if not exists menu_modifiers (
  id uuid primary key default uuid_generate_v4(),
  -- Lien soit à un item précis, soit à une catégorie entière
  menu_item_id text references menu_items(id) on delete cascade,
  category_id text references menu_categories(id) on delete cascade,
  label text not null,                        -- "Extra fromage", "Sans oignons"
  price_delta_cents int default 0,            -- 0 = gratuit (modifier non tarifé)
  is_required boolean default false,
  position int default 0,
  created_at timestamptz default now(),
  check ((menu_item_id is not null) or (category_id is not null))
);
create index if not exists menu_modifiers_item_idx on menu_modifiers(menu_item_id);
create index if not exists menu_modifiers_category_idx on menu_modifiers(category_id);

-- ── 5. RLS sur menu_* ─────────────────────────────────────
alter table menu_categories enable row level security;
alter table menu_items enable row level security;
alter table menu_variants enable row level security;
alter table menu_modifiers enable row level security;

drop policy if exists "Service role full access" on menu_categories;
create policy "Service role full access" on menu_categories for all using (auth.role() = 'service_role');
drop policy if exists "Public read" on menu_categories;
create policy "Public read" on menu_categories for select using (true);

drop policy if exists "Service role full access" on menu_items;
create policy "Service role full access" on menu_items for all using (auth.role() = 'service_role');
drop policy if exists "Public read" on menu_items;
create policy "Public read" on menu_items for select using (true);

drop policy if exists "Service role full access" on menu_variants;
create policy "Service role full access" on menu_variants for all using (auth.role() = 'service_role');
drop policy if exists "Public read" on menu_variants;
create policy "Public read" on menu_variants for select using (true);

drop policy if exists "Service role full access" on menu_modifiers;
create policy "Service role full access" on menu_modifiers for all using (auth.role() = 'service_role');
drop policy if exists "Public read" on menu_modifiers;
create policy "Public read" on menu_modifiers for select using (true);

-- ── 6. Cash sessions (ouverture / fermeture caisse) ───────
create table if not exists cash_sessions (
  id uuid primary key default uuid_generate_v4(),
  opened_at timestamptz default now() not null,
  closed_at timestamptz,
  opening_amount_cents int not null check (opening_amount_cents >= 0),
  expected_cash_cents int,           -- calculé à la fermeture (open + ventes espèces)
  actual_cash_cents int,             -- compté physiquement
  -- variance > 0 = excédent ; < 0 = manque
  variance_cents int generated always as (
    case
      when actual_cash_cents is not null and expected_cash_cents is not null
        then actual_cash_cents - expected_cash_cents
      else null
    end
  ) stored,
  opened_by uuid references staff_members(id) on delete set null,
  closed_by uuid references staff_members(id) on delete set null,
  notes text,
  created_at timestamptz default now()
);
create index if not exists cash_sessions_open_idx on cash_sessions(closed_at) where closed_at is null;
create index if not exists cash_sessions_opened_at_idx on cash_sessions(opened_at desc);

alter table cash_sessions enable row level security;
drop policy if exists "Service role full access" on cash_sessions;
create policy "Service role full access" on cash_sessions for all using (auth.role() = 'service_role');

-- ── 7. Order cancellations / refunds ──────────────────────
create table if not exists order_cancellations (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  reason text not null check (reason in ('error', 'refused', 'gesture', 'other')),
  notes text,
  cancelled_by uuid references staff_members(id) on delete set null,
  refund_method text check (refund_method in ('cash', 'card', 'voucher', 'none')),
  refund_amount_cents int default 0,
  cancelled_at timestamptz default now()
);
create index if not exists order_cancellations_order_idx on order_cancellations(order_id);

alter table order_cancellations enable row level security;
drop policy if exists "Service role full access" on order_cancellations;
create policy "Service role full access" on order_cancellations for all using (auth.role() = 'service_role');

-- ── 8. Realtime ────────────────────────────────────────────
do $$ begin
  alter publication supabase_realtime add table menu_categories;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table menu_items;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table cash_sessions;
exception when duplicate_object then null; end $$;

-- ── 9. Verification ───────────────────────────────────────
-- select count(*) as nb_categories from menu_categories;
-- select count(*) as nb_items from menu_items;
-- select count(*) as open_sessions from cash_sessions where closed_at is null;

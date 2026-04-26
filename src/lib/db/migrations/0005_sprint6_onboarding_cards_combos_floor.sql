-- ═══════════════════════════════════════════════════════════
-- Migration 0005 — Sprint 6 (onboarding + multi-cartes + combos + plan 2D)
-- ═══════════════════════════════════════════════════════════
--
-- Idempotent. Adds the foundations that turn the product from "outil
-- de gestion" into a self-service SaaS.
-- ═══════════════════════════════════════════════════════════

-- ── 1. Setup flag (first-run onboarding) ──────────────────
alter table restaurant_settings
  add column if not exists setup_completed boolean default false;

-- L'instance Arc en Ciel actuelle est déjà configurée ; on flippe le flag
-- pour ne pas afficher l'onboarding au prochain édit.
update restaurant_settings set setup_completed = true where id = 1;

-- ── 2. Menu cards (Midi / Soir / Weekend / Spéciale) ─────
create table if not exists menu_cards (
  id text primary key,
  name text not null,
  active boolean default true,
  is_default boolean default false,
  schedule_start text,        -- "12:00"
  schedule_end text,          -- "14:30"
  schedule_days text[],       -- ['mon','tue','wed','thu','fri']
  position int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists menu_cards_active_idx on menu_cards(active) where active = true;

-- Carte par défaut — on rattache toutes les catégories existantes ici.
insert into menu_cards (id, name, is_default, active, position)
values ('default', 'Carte principale', true, true, 0)
on conflict (id) do nothing;

drop trigger if exists update_menu_cards_updated_at on menu_cards;
create trigger update_menu_cards_updated_at before update on menu_cards
  for each row execute function update_updated_at_column();

alter table menu_cards enable row level security;
drop policy if exists "Service role full access" on menu_cards;
create policy "Service role full access" on menu_cards for all using (auth.role() = 'service_role');
drop policy if exists "Public read" on menu_cards;
create policy "Public read" on menu_cards for select using (true);

-- Lier les catégories à une carte (default = "default")
alter table menu_categories
  add column if not exists card_id text default 'default';

alter table menu_categories
  drop constraint if exists menu_categories_card_fk;
alter table menu_categories
  add constraint menu_categories_card_fk
  foreign key (card_id) references menu_cards(id) on delete set default;

update menu_categories set card_id = 'default' where card_id is null;

-- ── 3. Combos / Formules ─────────────────────────────────
create table if not exists menu_combos (
  id text primary key,
  card_id text default 'default' references menu_cards(id) on delete set default,
  name text not null,
  description text default '',
  price_cents int not null check (price_cents >= 0),
  image_url text,
  active boolean default true,
  position int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists menu_combos_card_idx on menu_combos(card_id);
create index if not exists menu_combos_active_idx on menu_combos(active) where active = true;

drop trigger if exists update_menu_combos_updated_at on menu_combos;
create trigger update_menu_combos_updated_at before update on menu_combos
  for each row execute function update_updated_at_column();

-- Slots = composantes (Entrée au choix parmi 3, Plat au choix parmi 5, Café)
create table if not exists menu_combo_slots (
  id uuid primary key default uuid_generate_v4(),
  combo_id text not null references menu_combos(id) on delete cascade,
  label text not null,                    -- "Entrée", "Plat", "Dessert"
  item_ids text[] default array[]::text[],-- choix possibles
  min_picks int default 1 check (min_picks >= 0),
  max_picks int default 1 check (max_picks >= 0),
  position int default 0,
  created_at timestamptz default now()
);
create index if not exists menu_combo_slots_combo_idx on menu_combo_slots(combo_id);

alter table menu_combos enable row level security;
alter table menu_combo_slots enable row level security;
drop policy if exists "Service role full access" on menu_combos;
create policy "Service role full access" on menu_combos for all using (auth.role() = 'service_role');
drop policy if exists "Public read" on menu_combos;
create policy "Public read" on menu_combos for select using (true);
drop policy if exists "Service role full access" on menu_combo_slots;
create policy "Service role full access" on menu_combo_slots for all using (auth.role() = 'service_role');
drop policy if exists "Public read" on menu_combo_slots;
create policy "Public read" on menu_combo_slots for select using (true);

-- Lien order_items ↔ combo : groupe les items qui appartiennent au même combo
alter table order_items
  add column if not exists combo_id text references menu_combos(id) on delete set null;
alter table order_items
  add column if not exists combo_label text;

-- ── 4. Realtime ─────────────────────────────────────────
do $$ begin alter publication supabase_realtime add table menu_cards;
exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table menu_combos;
exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table menu_combo_slots;
exception when duplicate_object then null; end $$;

-- ── 5. Verification ─────────────────────────────────────
-- select setup_completed from restaurant_settings;
-- select id, name, is_default, active from menu_cards;
-- select count(*) from menu_combos;

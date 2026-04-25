-- ═══════════════════════════════════════════════════════════
-- POS / KDS — Prise de commande + cuisine + paiement
-- ═══════════════════════════════════════════════════════════

-- ── STAFF MEMBERS ──────────────────────────────────────────
create table if not exists staff_members (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  pin_code text not null check (length(pin_code) = 4),
  role text not null check (role in ('server', 'chef', 'manager')),
  color text default '#B8922F',
  active boolean default true,
  created_at timestamptz default now()
);
create index if not exists staff_members_pin_idx on staff_members(pin_code);

-- ── ORDERS (commandes) ─────────────────────────────────────
create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  table_number int,
  customer_id uuid references customers(id) on delete set null,
  staff_id uuid references staff_members(id) on delete set null,
  status text not null default 'open' check (status in (
    'open',          -- En cours d'édition (pas encore envoyée en cuisine)
    'fired',         -- Envoyée en cuisine (en préparation)
    'ready',         -- Tous les items sont prêts
    'served',        -- Servie au client
    'paid',          -- Payée
    'cancelled'
  )),
  source text default 'dine_in' check (source in (
    'dine_in',       -- Sur place, prise par serveur
    'dine_in_qr',    -- Sur place, auto-commande via QR
    'takeaway',      -- À emporter
    'delivery'       -- Livraison
  )),
  guest_count int default 1,
  notes text,
  subtotal_cents int default 0,
  tax_cents int default 0,
  total_cents int default 0,
  tip_cents int default 0,
  payment_method text check (payment_method in ('cash', 'card', 'ticket_resto', 'other', null)),
  flags text[] default array[]::text[],  -- Optional tags : rush, allergy, birthday, vip
  fired_at timestamptz,         -- Moment d'envoi en cuisine
  ready_at timestamptz,         -- Moment où tout est prêt
  served_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists orders_status_idx on orders(status);
create index if not exists orders_table_idx on orders(table_number) where status in ('open', 'fired', 'ready');
create index if not exists orders_created_idx on orders(created_at desc);
create index if not exists orders_paid_at_idx on orders(paid_at desc) where paid_at is not null;

-- ── ORDER ITEMS (lignes de commande) ───────────────────────
create table if not exists order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  menu_item_id text not null,           -- correspond à CARTE[].items[].id dans src/data/carte.ts
  menu_item_name text not null,
  menu_item_category text,
  price_cents int not null,
  quantity int not null default 1 check (quantity > 0),
  modifiers text[],                      -- ex: ["sans oignons", "cuisson à point"]
  notes text,
  status text not null default 'pending' check (status in (
    'pending',   -- Tapé par serveur, pas encore fire
    'cooking',   -- Envoyé en cuisine
    'ready',     -- Prêt à servir
    'served',    -- Servi
    'cancelled'
  )),
  station text default 'main' check (station in ('main', 'pizza', 'grill', 'cold', 'dessert', 'bar')),
  fired_at timestamptz,
  ready_at timestamptz,
  acknowledged_at timestamptz,  -- Server has picked up the plate (between ready and served)
  served_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists order_items_order_idx on order_items(order_id);
create index if not exists order_items_status_idx on order_items(status) where status in ('pending', 'cooking', 'ready');
create index if not exists order_items_station_idx on order_items(station, status);

-- ── TRIGGERS updated_at ────────────────────────────────────
drop trigger if exists update_orders_updated_at on orders;
create trigger update_orders_updated_at before update on orders
  for each row execute function update_updated_at_column();

drop trigger if exists update_order_items_updated_at on order_items;
create trigger update_order_items_updated_at before update on order_items
  for each row execute function update_updated_at_column();

-- ── RLS + POLICIES ─────────────────────────────────────────
alter table staff_members enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

drop policy if exists "Service role full access" on staff_members;
create policy "Service role full access" on staff_members for all using (auth.role() = 'service_role');
drop policy if exists "Service role full access" on orders;
create policy "Service role full access" on orders for all using (auth.role() = 'service_role');
drop policy if exists "Service role full access" on order_items;
create policy "Service role full access" on order_items for all using (auth.role() = 'service_role');

-- ── SEED demo staff (3 serveurs + 1 chef + 1 manager) ──────
insert into staff_members (name, pin_code, role, color) values
  ('Kevin',     '1234', 'manager', '#C0392B'),
  ('Sophie',    '2024', 'server',  '#B8922F'),
  ('Thomas',    '3030', 'server',  '#2C1810'),
  ('Amina',     '4040', 'server',  '#5C3D2E'),
  ('Chef Luca', '9999', 'chef',    '#8B6914')
on conflict do nothing;

-- ── ENABLE REALTIME ────────────────────────────────────────
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table order_items;

-- ═══════════════════════════════════════════════════════════
-- L'ARC EN CIEL — CRM Restaurant Schema (Supabase)
-- À exécuter dans le SQL Editor Supabase une fois le projet créé
-- ═══════════════════════════════════════════════════════════

-- Enable UUID
create extension if not exists "uuid-ossp";

-- ── CUSTOMERS (fiche client) ───────────────────────────────
create table if not exists customers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text unique,
  phone text,
  first_visit timestamptz default now(),
  last_visit timestamptz,
  visits_count int default 0,
  notes text,
  tags text[] default '{}',
  vip boolean default false,
  birthday date,
  allergies text[],
  favorite_items text[],
  total_spent_cents int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists customers_email_idx on customers(email);
create index if not exists customers_phone_idx on customers(phone);
create index if not exists customers_vip_idx on customers(vip) where vip = true;

-- ── RESERVATIONS ───────────────────────────────────────────
create table if not exists reservations (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid references customers(id) on delete set null,
  customer_name text not null,
  customer_email text,
  customer_phone text not null,
  date date not null,
  time time not null,
  guests int not null check (guests > 0 and guests <= 50),
  table_number int,
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled','completed','no_show')),
  source text default 'website' check (source in ('website','phone','google','thefork','walk_in','other')),
  notes text,
  special_occasion text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists reservations_date_idx on reservations(date);
create index if not exists reservations_status_idx on reservations(status);
create index if not exists reservations_customer_idx on reservations(customer_id);

-- ── WAITER CALLS (demandes depuis le QR menu) ──────────────
create table if not exists waiter_calls (
  id uuid primary key default uuid_generate_v4(),
  table_number int not null,
  request_type text not null,
  status text default 'pending' check (status in ('pending','in_progress','resolved','cancelled')),
  created_at timestamptz default now(),
  resolved_at timestamptz,
  resolved_by text
);
create index if not exists waiter_calls_status_idx on waiter_calls(status);
create index if not exists waiter_calls_table_idx on waiter_calls(table_number);

-- ── TABLES (plan du restaurant) ────────────────────────────
create table if not exists restaurant_tables (
  number int primary key,
  capacity int not null default 4,
  location text default 'salle' check (location in ('salle','terrasse','bar','privatif')),
  is_active boolean default true
);

-- ── EVENTS (tracking pour analytics) ───────────────────────
create table if not exists events (
  id uuid primary key default uuid_generate_v4(),
  event_type text not null,
  customer_id uuid references customers(id) on delete set null,
  metadata jsonb,
  created_at timestamptz default now()
);
create index if not exists events_type_idx on events(event_type);
create index if not exists events_created_idx on events(created_at desc);

-- ── TRIGGERS: updated_at auto ──────────────────────────────
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_customers_updated_at before update on customers
  for each row execute function update_updated_at_column();

create trigger update_reservations_updated_at before update on reservations
  for each row execute function update_updated_at_column();

-- ── RLS POLICIES (important pour Supabase prod) ────────────
alter table customers enable row level security;
alter table reservations enable row level security;
alter table waiter_calls enable row level security;
alter table restaurant_tables enable row level security;
alter table events enable row level security;

-- Permet au service role (admin backend) un accès complet
-- Les clients publics ne peuvent que CREATE (insérer) via nos API routes

create policy "Service role full access" on customers
  for all using (auth.role() = 'service_role');
create policy "Service role full access" on reservations
  for all using (auth.role() = 'service_role');
create policy "Service role full access" on waiter_calls
  for all using (auth.role() = 'service_role');
create policy "Service role full access" on restaurant_tables
  for all using (auth.role() = 'service_role');
create policy "Service role full access" on events
  for all using (auth.role() = 'service_role');

-- ── SEED: Tables du restaurant ─────────────────────────────
insert into restaurant_tables (number, capacity, location) values
  (1, 2, 'salle'), (2, 2, 'salle'), (3, 4, 'salle'), (4, 4, 'salle'),
  (5, 6, 'salle'), (6, 4, 'salle'), (7, 2, 'terrasse'), (8, 4, 'terrasse'),
  (9, 4, 'terrasse'), (10, 8, 'privatif')
on conflict (number) do nothing;

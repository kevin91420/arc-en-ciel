-- ═══════════════════════════════════════════════════════════
-- LEADS MODULE — Pipeline commercial GOURMET PACK
-- (à exécuter dans Supabase SQL Editor)
-- ═══════════════════════════════════════════════════════════

create table if not exists pack_leads (
  id uuid primary key default uuid_generate_v4(),
  restaurant_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  interest text,
  status text default 'new' check (status in ('new', 'contacted', 'qualified', 'won', 'lost')),
  source text default 'landing',
  notes text,
  next_followup date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists pack_leads_status_idx on pack_leads(status);
create index if not exists pack_leads_created_idx on pack_leads(created_at desc);

-- TRIGGER (réutilise update_updated_at_column() défini dans schema.sql)
drop trigger if exists update_pack_leads_updated_at on pack_leads;
create trigger update_pack_leads_updated_at before update on pack_leads
  for each row execute function update_updated_at_column();

-- RLS
alter table pack_leads enable row level security;
drop policy if exists "Service role full access" on pack_leads;
create policy "Service role full access" on pack_leads for all using (auth.role() = 'service_role');

-- ═══════════════════════════════════════════════════════════
-- PROSPECTS MODULE — Outbound prospection GOURMET PACK
-- (à exécuter dans Supabase SQL Editor)
--
-- Distinct de pack_leads (qui est INBOUND via /pro).
-- Ici = OUTBOUND : restaurants qu'on contacte activement.
-- ═══════════════════════════════════════════════════════════

create table if not exists prospects (
  id uuid primary key default uuid_generate_v4(),
  restaurant_name text not null,
  address text,
  city text,
  postal_code text,
  country text default 'France',
  phone text,
  email text,
  website text,
  google_maps_url text,
  rating numeric(2,1),
  reviews_count int,
  cuisine_type text,
  price_range text,

  -- Outreach status
  status text default 'new' check (status in (
    'new',           -- just scraped, untouched
    'queued',        -- selected for outreach
    'contacted',     -- first email sent
    'replied',       -- they replied
    'meeting_booked',
    'negotiating',
    'won',
    'lost',
    'unreachable'
  )),
  emails_sent int default 0,
  last_email_at timestamptz,
  last_reply_at timestamptz,
  notes text,
  source text default 'google_maps',
  tags text[] default '{}',

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists prospects_status_idx on prospects(status);
create index if not exists prospects_city_idx on prospects(city);

drop trigger if exists update_prospects_updated_at on prospects;
create trigger update_prospects_updated_at before update on prospects
  for each row execute function update_updated_at_column();

alter table prospects enable row level security;
drop policy if exists "Service role full access" on prospects;
create policy "Service role full access" on prospects for all using (auth.role() = 'service_role');

-- ═══════════════════════════════════════════════════════════
-- Emails sent log
-- ═══════════════════════════════════════════════════════════
create table if not exists prospect_emails (
  id uuid primary key default uuid_generate_v4(),
  prospect_id uuid references prospects(id) on delete cascade,
  template_id text not null,  -- 'intro', 'follow_up_1', 'follow_up_2', 'last_chance'
  subject text not null,
  body text not null,
  resend_id text,
  sent_at timestamptz default now(),
  opened_at timestamptz,
  replied_at timestamptz
);
create index if not exists prospect_emails_prospect_idx on prospect_emails(prospect_id);

alter table prospect_emails enable row level security;
drop policy if exists "Service role full access" on prospect_emails;
create policy "Service role full access" on prospect_emails for all using (auth.role() = 'service_role');

-- ═══════════════════════════════════════════════════════════
-- LOYALTY MODULE — Tampons de fidélité (à exécuter dans SQL Editor)
-- ═══════════════════════════════════════════════════════════

-- CARDS
create table if not exists loyalty_cards (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid references customers(id) on delete cascade,
  card_number text unique not null,
  current_stamps int default 0 check (current_stamps >= 0),
  total_stamps_earned int default 0,
  rewards_claimed int default 0,
  last_stamp_at timestamptz,
  enrolled_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists loyalty_cards_customer_idx on loyalty_cards(customer_id);
create index if not exists loyalty_cards_number_idx on loyalty_cards(card_number);

-- TRANSACTIONS (history of stamps)
create table if not exists loyalty_transactions (
  id uuid primary key default uuid_generate_v4(),
  card_id uuid references loyalty_cards(id) on delete cascade,
  type text not null check (type in ('stamp_earned', 'reward_claimed', 'stamp_adjusted', 'enrollment')),
  amount int default 1,
  note text,
  staff_member text,
  created_at timestamptz default now()
);
create index if not exists loyalty_transactions_card_idx on loyalty_transactions(card_id);

-- CONFIG (single row)
create table if not exists loyalty_config (
  id int primary key default 1,
  stamps_required int default 5,
  reward_label text default 'Une pizza au choix offerte',
  reward_description text default 'Valable sur toute la carte des pizzas, hors spéciales.',
  welcome_message text default 'Bienvenue dans le programme fidélité de L''Arc en Ciel !',
  brand_color text default '#2C1810',
  accent_color text default '#B8922F',
  active boolean default true,
  updated_at timestamptz default now()
);
insert into loyalty_config (id) values (1) on conflict (id) do nothing;

-- TRIGGERS
drop trigger if exists update_loyalty_cards_updated_at on loyalty_cards;
create trigger update_loyalty_cards_updated_at before update on loyalty_cards
  for each row execute function update_updated_at_column();

drop trigger if exists update_loyalty_config_updated_at on loyalty_config;
create trigger update_loyalty_config_updated_at before update on loyalty_config
  for each row execute function update_updated_at_column();

-- RLS
alter table loyalty_cards enable row level security;
alter table loyalty_transactions enable row level security;
alter table loyalty_config enable row level security;

drop policy if exists "Service role full access" on loyalty_cards;
create policy "Service role full access" on loyalty_cards for all using (auth.role() = 'service_role');
drop policy if exists "Service role full access" on loyalty_transactions;
create policy "Service role full access" on loyalty_transactions for all using (auth.role() = 'service_role');
drop policy if exists "Service role full access" on loyalty_config;
create policy "Service role full access" on loyalty_config for all using (auth.role() = 'service_role');

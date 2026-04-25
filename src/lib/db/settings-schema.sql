-- ═══════════════════════════════════════════════════════════
-- RESTAURANT SETTINGS — Configuration white-label (single row)
-- ═══════════════════════════════════════════════════════════

create table if not exists restaurant_settings (
  id int primary key default 1,

  -- Brand
  name text not null default 'L''Arc en Ciel',
  tagline text default 'Pizzeria Méditerranéenne',
  description text,
  logo_url text,

  -- Contact
  phone text,
  email text,
  address text,
  postal_code text,
  city text,
  country text default 'France',
  latitude numeric(10, 7),
  longitude numeric(10, 7),

  -- Hours (JSON array of { days, time })
  hours jsonb default '[]'::jsonb,

  -- Socials
  facebook_url text,
  instagram_url text,
  google_maps_url text,
  tripadvisor_url text,

  -- Visual theme (CSS variables override)
  color_brand text default '#2C1810',
  color_accent text default '#B8922F',
  color_signature text default '#C0392B',

  -- Menu PDFs
  menu_pdf_url text,
  menu_emporter_pdf_url text,
  menu_desserts_pdf_url text,

  -- Payment methods (array)
  payment_methods text[] default array['Espèces','Carte bancaire','Ticket Restaurant'],

  -- Features toggle
  feature_reservations boolean default true,
  feature_qr_menu boolean default true,
  feature_loyalty boolean default true,
  feature_delivery boolean default true,
  feature_takeaway boolean default true,
  feature_terrace boolean default true,
  feature_pmr boolean default true,
  feature_halal boolean default true,

  -- TVA rate (percentage 0-100)
  tax_rate numeric(4, 2) default 10.00,

  -- 86 list — menu_item ids temporarily out of stock (live propagation)
  eighty_six_list text[] default array[]::text[],

  -- Tables (JSON array of TableConfig — white-label floor plan)
  tables jsonb default '[
    {"number":1,"label":"T1","capacity":4,"zone":"Salle"},
    {"number":2,"label":"T2","capacity":4,"zone":"Salle"},
    {"number":3,"label":"T3","capacity":4,"zone":"Salle"},
    {"number":4,"label":"T4","capacity":4,"zone":"Salle"},
    {"number":5,"label":"T5","capacity":4,"zone":"Salle"},
    {"number":6,"label":"T6","capacity":4,"zone":"Salle"},
    {"number":7,"label":"T7","capacity":4,"zone":"Salle"},
    {"number":8,"label":"T8","capacity":4,"zone":"Salle"},
    {"number":9,"label":"T9","capacity":4,"zone":"Salle"},
    {"number":10,"label":"T10","capacity":4,"zone":"Salle"}
  ]'::jsonb,

  -- Legal
  legal_name text,
  siret text,
  vat_number text,

  updated_at timestamptz default now()
);

-- Upsert default row if missing
insert into restaurant_settings (id) values (1) on conflict (id) do nothing;

-- Update trigger
drop trigger if exists update_restaurant_settings_updated_at on restaurant_settings;
create trigger update_restaurant_settings_updated_at before update on restaurant_settings
  for each row execute function update_updated_at_column();

-- RLS
alter table restaurant_settings enable row level security;
drop policy if exists "Service role full access" on restaurant_settings;
create policy "Service role full access" on restaurant_settings for all using (auth.role() = 'service_role');
-- Public read (so client components can fetch branding without admin auth)
drop policy if exists "Public read" on restaurant_settings;
create policy "Public read" on restaurant_settings for select using (true);

-- ═══════════════════════════════════════════════════════════
-- Migration 0010 — Sprint 7b — Système d'Avoirs (vouchers)
-- ═══════════════════════════════════════════════════════════
--
-- Idempotent. Crée le système d'avoirs client (geste commercial sans
-- décaissement). Permet au restaurateur de remettre un crédit à un
-- client mécontent, utilisable lors d'une prochaine visite.
--
-- Demandé par retour terrain (boulangerie utilisatrice d'Angelo) :
-- "Proposer un avoir pour la prochaine venue du client si pas content".
--
-- Logique métier :
--   - Un avoir = crédit nominatif, lié au tenant, code court QR-able
--   - Montant initial fixe, remaining_cents diminue à chaque utilisation
--   - Utilisable en plusieurs fois (split possible)
--   - Expiration légale : 12 mois par défaut (CGV françaises)
--   - Statut : active / redeemed / expired / cancelled
--   - NF525 friendly : audit complet, jamais de delete physique
--
-- Tables créées :
--   - vouchers              (le bon d'avoir lui-même)
--   - voucher_redemptions   (chaque utilisation partielle ou totale)
--
-- HOW TO APPLY :
--   1. Open https://supabase.com/dashboard/project/rrvygmcpgmfqvelbpjjt/sql
--   2. Paste this entire file in a new query
--   3. Click "Run"
--   4. Vérifier : select count(*) from vouchers; -- doit retourner 0
-- ═══════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────
-- 1. Table `vouchers`
-- ──────────────────────────────────────────────────────────
create table if not exists vouchers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,

  /* Code court humain — affiché au client, scannable QR. Format AVR-XXXX. */
  code text not null,

  /* Lien optionnel vers la table customers (si le client est dans la base). */
  customer_id uuid,

  /* Snapshot du nom client à la création (au cas où le customer_id soit null
   * ou que la fiche customer change dans le temps). */
  customer_name text,
  customer_email text,
  customer_phone text,

  /* Montants en cents — initial fixe, remaining diminue à chaque utilisation. */
  amount_cents integer not null check (amount_cents >= 0),
  remaining_cents integer not null check (remaining_cents >= 0),

  /* Métadonnées commerciales */
  reason text,           -- "Plat froid servi", "Geste commercial fidélité", etc.
  notes text,            -- Note interne libre

  /* Statut : 'active' | 'redeemed' | 'expired' | 'cancelled' */
  status text not null default 'active'
    check (status in ('active', 'redeemed', 'expired', 'cancelled')),

  /* Audit trail */
  created_by_staff_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  /* Expiration — par défaut 12 mois après création (CGV France) */
  expires_at timestamptz default (now() + interval '12 months'),

  /* Quand entièrement redeemed */
  redeemed_at timestamptz,

  /* Liée à la commande où l'avoir a été émis (souvent une annulation
   * ou un geste post-service). Optionnel. */
  source_order_id text,

  /* Si l'avoir a été créé via une annulation de commande, le lier à la
   * cancellation row pour audit. Optionnel. */
  source_cancellation_id uuid,

  /* Garantie unicité du code par tenant (un même code peut exister
   * chez deux tenants différents sans collision). */
  unique (restaurant_id, code)
);

create index if not exists idx_vouchers_restaurant_id on vouchers (restaurant_id);
create index if not exists idx_vouchers_code on vouchers (restaurant_id, code);
create index if not exists idx_vouchers_status on vouchers (restaurant_id, status);
create index if not exists idx_vouchers_expires_at on vouchers (expires_at) where status = 'active';
create index if not exists idx_vouchers_customer on vouchers (restaurant_id, customer_id) where customer_id is not null;

-- Trigger updated_at
create or replace function set_updated_at_vouchers()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_vouchers_updated_at on vouchers;
create trigger trg_vouchers_updated_at
  before update on vouchers
  for each row execute function set_updated_at_vouchers();

-- ──────────────────────────────────────────────────────────
-- 2. Table `voucher_redemptions`
--    Trace chaque utilisation partielle ou totale d'un avoir.
--    Une row = un événement d'utilisation sur une commande donnée.
-- ──────────────────────────────────────────────────────────
create table if not exists voucher_redemptions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  voucher_id uuid not null references vouchers(id) on delete cascade,

  /* Commande sur laquelle l'avoir a été utilisé */
  order_id text not null,

  /* Montant utilisé sur cette commande (≤ remaining_cents au moment du redeem) */
  amount_cents integer not null check (amount_cents > 0),

  /* Audit */
  redeemed_by_staff_id uuid,
  redeemed_at timestamptz not null default now()
);

create index if not exists idx_voucher_redemptions_restaurant on voucher_redemptions (restaurant_id);
create index if not exists idx_voucher_redemptions_voucher on voucher_redemptions (voucher_id);
create index if not exists idx_voucher_redemptions_order on voucher_redemptions (order_id);

-- ──────────────────────────────────────────────────────────
-- 3. Verification queries (uncomment to manually validate)
-- ──────────────────────────────────────────────────────────
-- select count(*) as nb_vouchers from vouchers;
-- select count(*) as nb_redemptions from voucher_redemptions;
-- \d vouchers;
-- \d voucher_redemptions;
